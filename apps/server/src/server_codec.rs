use super::{identifier as id, integer as tick};
use serde_json::Value;
use std::collections::HashSet;
pub const MAX_SERVER_MESSAGE_BYTES: usize = 16_384;
fn slot(v: &Value) -> bool {
    tick(v) && v.as_f64().unwrap() < 8.0
}
fn nullable_tick(v: &Value) -> bool {
    v.is_null() || tick(v)
}
fn finite(v: &Value) -> bool {
    v.as_f64().is_some_and(f64::is_finite)
}
fn field(v: &Value, key: &str) -> bool {
    v.get(key).is_some()
}
fn snapshot(v: &Value) -> bool {
    let c = &v["config"];
    let t = &c["track"];
    if !id(&c["raceId"])
        || !id(&t["id"])
        || !tick(&t["version"])
        || t["version"].as_f64().unwrap() < 1.0
        || !t["checksum"].as_str().is_some_and(|s| {
            s.len() == 64
                && s.bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        })
        || !tick(&c["laps"])
        || c["laps"].as_f64().unwrap() < 1.0
        || !tick(&c["tickRate"])
        || c["tickRate"].as_f64().unwrap() < 1.0
        || !tick(&v["serverTick"])
        || !field(v, "startTick")
        || !nullable_tick(&v["startTick"])
    {
        return false;
    }
    let now = v["serverTick"].as_f64().unwrap();
    let start = v["startTick"].as_f64();
    let phase = v["phase"].as_str().unwrap_or("");
    let phase_valid = match phase {
        "waiting" => start.is_none(),
        "countdown" => start.is_some_and(|s| s > now),
        "racing" | "finished" => start.is_some_and(|s| s <= now),
        "aborted" => true,
        _ => false,
    };
    if !phase_valid {
        return false;
    }
    let Some(participants) = v["participants"].as_array() else {
        return false;
    };
    if participants.len() != 8 {
        return false;
    }
    let mut slots = HashSet::new();
    let mut drivers = HashSet::new();
    for p in participants {
        if !slot(&p["slotId"])
            || !slots.insert(p["slotId"].as_f64().unwrap() as u8)
            || !id(&p["driverId"])
            || !drivers.insert(p["driverId"].as_str().unwrap())
            || !matches!(p["controller"].as_str(), Some("human" | "bot"))
            || !tick(&p["completedLaps"])
            || !field(p, "checkpointId")
            || !(p["checkpointId"].is_null() || id(&p["checkpointId"]))
            || !field(p, "finishTick")
            || !nullable_tick(&p["finishTick"])
            || ![
                &p["position"]["x"],
                &p["position"]["y"],
                &p["position"]["z"],
                &p["yaw"],
                &p["speed"],
            ]
            .iter()
            .all(|n| finite(n))
        {
            return false;
        }
        let laps = p["completedLaps"].as_f64().unwrap();
        let total = c["laps"].as_f64().unwrap();
        let finish = p["finishTick"].as_f64();
        if laps > total || (laps == total && finish.is_none()) {
            return false;
        }
        if let Some(f) = finish
            && (laps != total || !start.is_some_and(|s| f >= s && f <= now))
        {
            return false;
        }
        if matches!(phase, "waiting" | "countdown") && (laps != 0.0 || finish.is_some()) {
            return false;
        }
    }
    true
}
fn result(v: &Value) -> bool {
    if !id(&v["raceId"]) || !id(&v["resultId"]) || !tick(&v["startTick"]) || !tick(&v["endTick"]) {
        return false;
    }
    let start = v["startTick"].as_f64().unwrap();
    let end = v["endTick"].as_f64().unwrap();
    if end < start {
        return false;
    }
    let Some(positions) = v["positions"].as_array() else {
        return false;
    };
    if positions.len() != 8 {
        return false;
    }
    let points = [15.0, 12.0, 10.0, 8.0, 6.0, 4.0, 2.0, 1.0];
    let mut slots = HashSet::new();
    let mut previous = -1.0;
    let mut previous_slot = -1.0;
    let mut dnf = false;
    for (i, p) in positions.iter().enumerate() {
        if !slot(&p["slotId"])
            || !slots.insert(p["slotId"].as_f64().unwrap() as u8)
            || p["position"].as_f64() != Some((i + 1) as f64)
            || p["points"].as_f64() != Some(points[i])
            || !field(p, "finishTick")
            || !nullable_tick(&p["finishTick"])
        {
            return false;
        }
        match p["status"].as_str() {
            Some("finished") => {
                let Some(f) = p["finishTick"].as_f64() else {
                    return false;
                };
                let slot_id = p["slotId"].as_f64().unwrap();
                if dnf
                    || f < start
                    || f > end
                    || f < previous
                    || (f == previous && slot_id <= previous_slot)
                {
                    return false;
                }
                previous = f;
                previous_slot = slot_id;
            }
            Some("dnf") => {
                dnf = true;
                if !p["finishTick"].is_null() {
                    return false;
                }
            }
            _ => return false,
        }
    }
    true
}
fn payload(v: &Value) -> bool {
    match v["type"].as_str() {
        Some("welcome") => id(&v["connectionId"]),
        Some("input_ack") => tick(&v["inputSeq"]),
        Some("error") => id(&v["code"]),
        Some("snapshot") => snapshot(&v["snapshot"]),
        Some("race_result") => result(&v["result"]),
        Some("checkpoint_ack") => {
            id(&v["raceId"])
                && slot(&v["slotId"])
                && id(&v["checkpointId"])
                && tick(&v["serverTick"])
                && match v["accepted"].as_bool() {
                    Some(true) => field(v, "reason") && v["reason"].is_null(),
                    Some(false) => id(&v["reason"]),
                    None => false,
                }
        }
        Some("item_granted") => {
            id(&v["raceId"])
                && slot(&v["slotId"])
                && id(&v["instanceId"])
                && id(&v["itemType"])
                && tick(&v["serverTick"])
        }
        Some("item_used") => {
            id(&v["raceId"])
                && slot(&v["slotId"])
                && id(&v["instanceId"])
                && tick(&v["serverTick"])
                && field(v, "targetSlotId")
                && (v["targetSlotId"].is_null() || slot(&v["targetSlotId"]))
        }
        _ => false,
    }
}
/// Validated wire wrapper. Construction is checked; serialization preserves the envelope.
#[derive(Debug)]
pub struct ServerMessage(String);
impl ServerMessage {
    pub fn new(value: Value) -> Result<Self, &'static str> {
        Self::decode(&value.to_string())
    }
    pub fn decode(raw: &str) -> Result<Self, &'static str> {
        if raw.len() > MAX_SERVER_MESSAGE_BYTES {
            return Err("too_large");
        }
        let value: Value = serde_json::from_str(raw).map_err(|_| "invalid_json")?;
        if !value.is_object() {
            return Err("invalid_message");
        }
        if value["protocolVersion"].as_f64() != Some(1.0) {
            return Err("incompatible_version");
        }
        if !id(&value["eventId"]) || !tick(&value["seq"]) || !payload(&value["payload"]) {
            return Err("invalid_message");
        }
        Ok(Self(raw.to_owned()))
    }
    pub fn encode(&self) -> String {
        self.0.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shared_wire_cases_and_roundtrip() {
        let cases: Value =
            serde_json::from_str(include_str!("../../../fixtures/server-messages.json")).unwrap();
        for case in cases.as_array().unwrap() {
            let raw = case["raw"].as_str().unwrap();
            let decoded = ServerMessage::decode(raw);
            assert_eq!(
                decoded.is_ok(),
                case["ok"].as_bool().unwrap(),
                "{}",
                case["name"]
            );
            match decoded {
                Ok(message) => {
                    ServerMessage::decode(&message.encode()).unwrap();
                    let encoded = ServerMessage::new(serde_json::from_str(raw).unwrap())
                        .unwrap()
                        .encode();
                    ServerMessage::decode(&encoded).unwrap();
                }
                Err(code) => assert_eq!(code, case["code"].as_str().unwrap(), "{}", case["name"]),
            }
        }
    }
}
