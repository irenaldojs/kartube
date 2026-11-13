// Metres and radians. Prototype geometry only; race/checkpoint rules live elsewhere.
export type SceneKind = 'drop' | 'track';
export type TrackPart = {
  kind: 'road' | 'rail' | 'ramp' | 'boost' | 'item' | 'start' | 'ground';
  size: [number, number, number];
  position: [number, number, number];
  rotationZ?: number;
  solid: boolean;
};
const parts: TrackPart[] = [];
function add(kind: TrackPart['kind'], size: TrackPart['size'], position: TrackPart['position'], solid = false, rotationZ = 0) {
  parts.push({ kind, size, position, solid, rotationZ });
}
add('ground', [64, 0.2, 64], [0, -0.8, 0]);
// Four overlapping strips form a continuous rectangular circuit, 8 m wide.
for (const z of [-20, 20]) add('road', [48, 0.5, 8], [0, -0.25, z], true);
for (const x of [-20, 20]) add('road', [8, 0.5, 32], [x, -0.25, 0], true);
// Narrow alternative connects the two side straights at their midpoints.
add('road', [32, 0.5, 5], [0, -0.25, 0], true);
for (const z of [-24, 24]) add('rail', [49, 1, 0.5], [0, 0.5, z], true);
for (const x of [-24, 24]) add('rail', [0.5, 1, 48], [x, 0.5, 0], true);
for (const z of [-16, 16]) add('rail', [32, 1, 0.5], [0, 0.5, z], true);
// Gaps in the inner side rails let karts enter and leave the alternative.
for (const x of [-16, 16]) for (const z of [-9.5, 9.5]) add('rail', [0.5, 1, 13], [x, 0.5, z], true);
for (const z of [-2.75, 2.75]) add('rail', [31, 0.65, 0.4], [0, 0.325, z], true);
add('ramp', [7, 0.4, 6], [-7, 0.29, -20], true, 0.14);
add('ramp', [7, 0.4, 6], [10, 0.29, 20], true, -0.14);
for (const [x, z] of [[8, -20], [20, 8], [-5, 0]]) add('boost', [3, 0.04, 4], [x!, 0.03, z!]);
for (const [x, z] of [[-20, -9], [2, 20], [4, 0]]) add('item', [1.2, 1.2, 1.2], [x!, 0.85, z!]);
for (let x = -23.5; x < -16; x += 1) for (let row = 0; row < 2; row++) {
  if ((Math.round(x + 23.5) + row) % 2 === 0) add('start', [1, 0.04, 0.6], [x, 0.03, 10 + row * 0.6]);
}
export const TRACK_PARTS: readonly TrackPart[] = parts;
export const TRACK_SPAWN = { x: -20, y: 3, z: 7 };
export const TRACK_SUMMARY = {
  id: 'greybox-v1', roadWidth: 8, closedCircuit: true,
  ramps: 2, boosts: 3, itemBoxes: 3, alternativeRoutes: 1,
  gameplayTriggers: false,
};
