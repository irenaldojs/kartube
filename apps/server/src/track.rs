use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};

type Vector = [f64; 3];
#[derive(Debug)]
pub struct Checkpoint {
    pub id: String,
    pub center: Vector,
    pub half_extents: Vector,
    pub next: Vec<String>,
}
#[derive(Debug)]
pub struct Spawn {
    pub slot_id: u32,
    pub position: Vector,
    pub yaw: f64,
}
#[derive(Debug)]
pub struct Track {
    pub id: String,
    pub version: u64,
    pub checksum: String,
    pub start: String,
    pub checkpoints: Vec<Checkpoint>,
    pub spawns: Vec<Spawn>,
}
fn id(value: &Value) -> Result<String, &'static str> {
    if !super::identifier(value) {
        return Err("invalid identifier");
    }
    Ok(value.as_str().unwrap().to_owned())
}
fn number(value: &Value) -> Result<f64, &'static str> {
    value
        .as_f64()
        .filter(|v| v.is_finite())
        .ok_or("expected finite number")
}
fn vector(value: &Value, positive: bool) -> Result<Vector, &'static str> {
    let result = [
        number(&value["x"])?,
        number(&value["y"])?,
        number(&value["z"])?,
    ];
    if positive && result.iter().any(|v| *v <= 0.0) {
        return Err("extents must be positive");
    }
    Ok(result)
}
pub fn parse_track(value: &Value) -> Result<Track, &'static str> {
    if value["schemaVersion"].as_f64() != Some(1.0) {
        return Err("unsupported schema");
    }
    if !super::integer(&value["version"]) || number(&value["version"])? < 1.0 {
        return Err("invalid version");
    }
    let checksum = value["checksum"].as_str().ok_or("invalid checksum")?;
    if checksum.len() != 64
        || !checksum
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err("invalid checksum");
    }
    let start = id(&value["startCheckpointId"])?;
    let mut checkpoints = Vec::new();
    for c in value["checkpoints"]
        .as_array()
        .ok_or("expected checkpoints")?
    {
        let next: Vec<String> = c["next"]
            .as_array()
            .ok_or("expected next")?
            .iter()
            .map(id)
            .collect::<Result<_, _>>()?;
        if next.is_empty() || next.iter().collect::<HashSet<_>>().len() != next.len() {
            return Err("invalid successors");
        }
        checkpoints.push(Checkpoint {
            id: id(&c["id"])?,
            center: vector(&c["center"], false)?,
            half_extents: vector(&c["halfExtents"], true)?,
            next,
        });
    }
    let by_id: HashMap<&str, &Checkpoint> =
        checkpoints.iter().map(|c| (c.id.as_str(), c)).collect();
    if checkpoints.len() < 2 || by_id.len() != checkpoints.len() {
        return Err("expected unique checkpoints");
    }
    if !by_id.contains_key(start.as_str()) {
        return Err("missing finish gate");
    }
    for c in &checkpoints {
        if c.next
            .iter()
            .any(|n| n == &c.id || !by_id.contains_key(n.as_str()))
        {
            return Err("invalid reference");
        }
    }
    let mut visited = HashSet::new();
    let mut pending = vec![start.as_str()];
    while let Some(current) = pending.pop() {
        if !visited.insert(current) {
            continue;
        }
        pending.extend(by_id[current].next.iter().map(String::as_str));
    }
    if visited.len() != by_id.len() {
        return Err("unreachable checkpoint");
    }
    let mut indegree: HashMap<&str, usize> = checkpoints
        .iter()
        .filter(|c| c.id != start)
        .map(|c| (c.id.as_str(), 0))
        .collect();
    for c in &checkpoints {
        if c.id == start {
            continue;
        }
        for n in &c.next {
            if n != &start {
                *indegree.get_mut(n.as_str()).unwrap() += 1;
            }
        }
    }
    let mut ready: Vec<&str> = indegree
        .iter()
        .filter(|(_, degree)| **degree == 0)
        .map(|(key, _)| *key)
        .collect();
    let mut processed = 0;
    while let Some(current) = ready.pop() {
        processed += 1;
        for n in &by_id[current].next {
            if n == &start {
                continue;
            }
            let degree = indegree.get_mut(n.as_str()).unwrap();
            *degree -= 1;
            if *degree == 0 {
                ready.push(n);
            }
        }
    }
    if processed != indegree.len() {
        return Err("cycle bypasses finish gate");
    }
    let mut spawns = Vec::new();
    for s in value["spawnSlots"].as_array().ok_or("expected spawns")? {
        if !super::integer(&s["slotId"]) || number(&s["slotId"])? > 7.0 {
            return Err("invalid slot");
        }
        spawns.push(Spawn {
            slot_id: number(&s["slotId"])? as u32,
            position: vector(&s["position"], false)?,
            yaw: number(&s["yaw"])?,
        });
    }
    if spawns.len() != 8
        || spawns
            .iter()
            .map(|s| s.slot_id)
            .collect::<HashSet<_>>()
            .len()
            != 8
    {
        return Err("expected eight unique slots");
    }
    Ok(Track {
        id: id(&value["id"])?,
        version: number(&value["version"])? as u64,
        checksum: checksum.to_owned(),
        start,
        checkpoints,
        spawns,
    })
}
fn text(bytes: &mut Vec<u8>, value: &str) {
    bytes.extend((value.len() as u32).to_le_bytes());
    bytes.extend(value.bytes());
}
fn float(bytes: &mut Vec<u8>, n: f64) {
    bytes.extend((if n == 0.0 { 0.0 } else { n }).to_le_bytes());
}
fn vector_bytes(bytes: &mut Vec<u8>, v: &Vector) {
    for n in v {
        float(bytes, *n);
    }
}
/// Takes a Track produced by parse_track. Excludes checksum and unknown JSON fields.
pub fn canonical_bytes(track: &Track) -> Vec<u8> {
    let mut bytes = b"kartube-track-v1\n".to_vec();
    text(&mut bytes, &track.id);
    bytes.extend(track.version.to_le_bytes());
    text(&mut bytes, &track.start);
    bytes.extend((track.checkpoints.len() as u32).to_le_bytes());
    let mut checkpoints: Vec<_> = track.checkpoints.iter().collect();
    checkpoints.sort_by(|a, b| a.id.cmp(&b.id));
    for c in checkpoints {
        text(&mut bytes, &c.id);
        vector_bytes(&mut bytes, &c.center);
        vector_bytes(&mut bytes, &c.half_extents);
        bytes.extend((c.next.len() as u32).to_le_bytes());
        let mut next: Vec<_> = c.next.iter().collect();
        next.sort();
        for n in next {
            text(&mut bytes, n);
        }
    }
    bytes.extend((track.spawns.len() as u32).to_le_bytes());
    let mut spawns: Vec<_> = track.spawns.iter().collect();
    spawns.sort_by_key(|s| s.slot_id);
    for s in spawns {
        bytes.extend(s.slot_id.to_le_bytes());
        vector_bytes(&mut bytes, &s.position);
        float(&mut bytes, s.yaw);
    }
    bytes
}
pub fn checksum(track: &Track) -> String {
    format!("{:x}", Sha256::digest(canonical_bytes(track)))
}
pub fn parse_verified_track(value: &Value) -> Result<Track, &'static str> {
    let track = parse_track(value)?;
    if checksum(&track) != track.checksum {
        return Err("checksum mismatch");
    }
    Ok(track)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Value {
        serde_json::from_str(include_str!("../../../fixtures/track-definition.json")).unwrap()
    }
    #[test]
    fn golden_bytes_and_hash() {
        let track = parse_verified_track(&fixture()).unwrap();
        let hex: String = canonical_bytes(&track)
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect();
        assert_eq!(
            hex,
            include_str!("../../../fixtures/track-canonical.hex").trim()
        );
    }
    #[test]
    fn shared_cases() {
        let cases: Value =
            serde_json::from_str(include_str!("../../../fixtures/track-cases.json")).unwrap();
        for case in cases.as_array().unwrap() {
            let mut value = fixture();
            for patch in case["patches"].as_array().unwrap() {
                *value.pointer_mut(patch["path"].as_str().unwrap()).unwrap() =
                    patch["value"].clone();
            }
            assert_eq!(
                parse_track(&value).is_ok(),
                case["structural"].as_bool().unwrap(),
                "{}",
                case["name"]
            );
            assert_eq!(
                parse_verified_track(&value).is_ok(),
                case["verified"].as_bool().unwrap(),
                "{}",
                case["name"]
            );
        }
    }
    #[test]
    fn order_and_negative_zero_do_not_change_hash() {
        let mut value = fixture();
        value["checkpoints"].as_array_mut().unwrap().reverse();
        value["spawnSlots"].as_array_mut().unwrap().reverse();
        for c in value["checkpoints"].as_array_mut().unwrap() {
            c["next"].as_array_mut().unwrap().reverse();
        }
        value["spawnSlots"][0]["position"]["y"] = serde_json::json!(-0.0);
        parse_verified_track(&value).unwrap();
    }
}
