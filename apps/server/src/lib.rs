pub mod server_codec;
pub mod track;
use serde_json::Value;

pub const MAX_MESSAGE_BYTES: usize = 4096;
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

fn integer(value: &Value) -> bool {
    value
        .as_f64()
        .is_some_and(|n| n >= 0.0 && n <= MAX_SAFE_INTEGER as f64 && n.fract() == 0.0)
}
fn identifier(value: &Value) -> bool {
    value.as_str().is_some_and(|s| {
        !s.is_empty()
            && s.len() <= 64
            && s.bytes()
                .all(|c| c.is_ascii_alphanumeric() || b"._-".contains(&c))
    })
}
fn range(value: &Value, min: f64, max: f64) -> bool {
    value
        .as_f64()
        .is_some_and(|n| n.is_finite() && n >= min && n <= max)
}
pub fn decode(raw: &str) -> Result<Value, &'static str> {
    if raw.len() > MAX_MESSAGE_BYTES {
        return Err("too_large");
    }
    let value: Value = serde_json::from_str(raw).map_err(|_| "invalid_json")?;
    if !value.is_object() {
        return Err("invalid_message");
    }
    if value["protocolVersion"].as_f64() != Some(1.0) {
        return Err("incompatible_version");
    }
    if !identifier(&value["eventId"]) || !integer(&value["seq"]) || !value["payload"].is_object() {
        return Err("invalid_message");
    }
    let p = &value["payload"];
    let valid = match p["type"].as_str() {
        Some("hello") => identifier(&p["build"]),
        Some("input") => {
            let i = &p["input"];
            identifier(&p["raceId"])
                && i.is_object()
                && integer(&i["seq"])
                && integer(&i["clientTick"])
                && range(&i["steer"], -1.0, 1.0)
                && range(&i["throttle"], 0.0, 1.0)
                && range(&i["brake"], 0.0, 1.0)
                && ["drift", "jump", "useItem"]
                    .iter()
                    .all(|key| i[key].is_boolean())
        }
        _ => false,
    };
    if valid {
        Ok(value)
    } else {
        Err("invalid_message")
    }
}

#[derive(Default)]
pub struct ConnectionGate {
    last_seq: Option<u64>,
    welcomed: bool,
}
impl ConnectionGate {
    // Call only with successfully decoded messages.
    pub fn accept(&mut self, message: &Value) -> Result<(), &'static str> {
        let seq = message["seq"].as_f64().ok_or("invalid_message")? as u64;
        if self.last_seq.is_some_and(|last| seq <= last) {
            return Err("stale");
        }
        let hello = message["payload"]["type"] == "hello";
        if !self.welcomed && !hello {
            return Err("hello_required");
        }
        if self.welcomed && hello {
            return Err("already_initialized");
        }
        self.last_seq = Some(seq);
        self.welcomed = true;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn canonical_messages() {
        let fixtures: Value =
            serde_json::from_str(include_str!("../../../fixtures/client-messages.json")).unwrap();
        for fixture in fixtures.as_array().unwrap() {
            let result = decode(fixture["raw"].as_str().unwrap());
            assert_eq!(
                result.is_ok(),
                fixture["ok"].as_bool().unwrap(),
                "{}",
                fixture["name"]
            );
            if let Err(code) = result {
                assert_eq!(code, fixture["code"].as_str().unwrap());
            }
        }
    }
    #[test]
    fn canonical_inputs() {
        let fixtures: Value =
            serde_json::from_str(include_str!("../../../fixtures/input-frames.json")).unwrap();
        for fixture in fixtures.as_array().unwrap() {
            let message = serde_json::json!({"protocolVersion": 1, "eventId": "fixture", "seq": 0,
                "payload": {"type": "input", "raceId": "fixture", "input": fixture["input"]}});
            assert_eq!(
                decode(&message.to_string()).is_ok(),
                fixture["valid"].as_bool().unwrap()
            );
        }
    }
    #[test]
    fn handshake_and_replay() {
        let mut gate = ConnectionGate::default();
        let hello = serde_json::json!({"seq": 0, "payload": {"type": "hello"}});
        let input = serde_json::json!({"seq": 1, "payload": {"type": "input"}});
        assert_eq!(gate.accept(&input), Err("hello_required"));
        assert_eq!(gate.accept(&hello), Ok(()));
        assert_eq!(gate.accept(&hello), Err("stale"));
        assert_eq!(
            gate.accept(&serde_json::json!({"seq": 5, "payload": {"type":"hello"}})),
            Err("already_initialized")
        );
        assert_eq!(gate.accept(&input), Ok(()));
        assert_eq!(gate.accept(&input), Err("stale"));
    }
    #[test]
    fn multibyte_limit() {
        assert_eq!(decode(&"🚗".repeat(1025)), Err("too_large"));
    }
}
