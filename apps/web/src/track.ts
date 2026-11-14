// Metres and radians. Prototype geometry only; race/checkpoint rules live elsewhere.
export type SceneKind = 'drop' | 'track';
export type TrackPart = {
  kind: 'road' | 'rail' | 'ramp' | 'boost' | 'item' | 'start' | 'ground' | 'warning';
  size: [number, number, number];
  position: [number, number, number];
  rotationZ?: number;
  rotationY?: number;
  solid: boolean;
};
const parts: TrackPart[] = [];
function add(kind: TrackPart['kind'], size: TrackPart['size'], position: TrackPart['position'], solid = false, rotationZ = 0) {
  parts.push({ kind, size, position, solid, rotationZ });
}
add('ground', [88, 0.2, 88], [0, -0.8, 0]);
// Rounded circuit: 60 x 60 m centreline, 10 m corner radii, sampled every ~1.3 m.
const loop: [number, number][] = [];
const line = (x: number, z: number, tx: number, tz: number) => {
  const count = Math.ceil(Math.hypot(tx - x, tz - z) / 1.5);
  for (let i = 0; i < count; i++) loop.push([x + (tx - x) * i / count, z + (tz - z) * i / count]);
};
const arc = (cx: number, cz: number, angle: number) => {
  for (let i = 0; i < 12; i++) { const t = angle + i / 12 * Math.PI / 2; loop.push([cx + Math.cos(t) * 10, cz + Math.sin(t) * 10]); }
};
line(-30, 20, -30, -20); arc(-20, -20, Math.PI);
line(-20, -30, 20, -30); arc(20, -20, Math.PI * 1.5);
line(30, -20, 30, 20); arc(20, 20, 0);
line(20, 30, -20, 30); arc(-20, 20, Math.PI / 2);
export const TRACK_CENTERLINE: readonly [number, number][] = loop;
// Route starts just north of the spawn and includes all four arcs.
export const TRACK_MAIN_ROUTE: readonly [number, number][] = [
  [-30, -20], ...Array.from({ length: 12 }, (_, i): [number, number] => { const t = Math.PI + (i + 1) / 12 * Math.PI / 2; return [-20 + Math.cos(t) * 10, -20 + Math.sin(t) * 10]; }),
  [20, -30], ...Array.from({ length: 12 }, (_, i): [number, number] => { const t = Math.PI * 1.5 + (i + 1) / 12 * Math.PI / 2; return [20 + Math.cos(t) * 10, -20 + Math.sin(t) * 10]; }),
  [30, 20], ...Array.from({ length: 12 }, (_, i): [number, number] => { const t = (i + 1) / 12 * Math.PI / 2; return [20 + Math.cos(t) * 10, 20 + Math.sin(t) * 10]; }),
  [-20, 30], ...Array.from({ length: 12 }, (_, i): [number, number] => { const t = Math.PI / 2 + (i + 1) / 12 * Math.PI / 2; return [-20 + Math.cos(t) * 10, 20 + Math.sin(t) * 10]; }), [-30, 7],
];
export const TRACK_ALTERNATIVE_ROUTE: readonly [number, number][] = [[-30, 0], [30, 0], ...TRACK_MAIN_ROUTE.slice(26)];
for (let i = 0; i < loop.length; i++) {
  const [x, z] = loop[i]!, [nx, nz] = loop[(i + 1) % loop.length]!;
  const dx = nx - x, dz = nz - z, length = Math.hypot(dx, dz), mx = (x + nx) / 2, mz = (z + nz) / 2;
  const yaw = Math.atan2(dx, dz), outwardX = dz / length, outwardZ = -dx / length;
  parts.push({ kind: 'road', size: [8, 0.5, length + 1], position: [mx, -0.25, mz], rotationY: yaw, solid: true });
  for (const side of [-1, 1]) {
    // Inner openings join the alternate lane. Outer opening is the deliberate fall-test zone.
    if (side === -1 && Math.abs(mx) > 29.9 && Math.abs(mz) < 4) continue;
    if (side === 1 && mx < -29.9 && mz > -10 && mz < -4) continue;
    parts.push({ kind: 'rail', size: [0.4, 0.8, length + 1], position: [mx + outwardX * 4.2 * side, 0.4, mz + outwardZ * 4.2 * side], rotationY: yaw, solid: true });
  }
}
add('road', [60, 0.5, 5], [0, -0.25, 0], true);
for (const z of [-2.75, 2.75]) add('rail', [51, 0.65, 0.4], [0, 0.325, z], true);
// Amber edge markers indicate the unprotected exit; there is no collider below the grass.
for (const z of [-9, -7, -5]) add('warning', [0.4, 0.05, 0.8], [-33.5, 0.04, z]);
add('ramp', [7, 0.4, 6], [-7, 0.29, -30], true, 0.14);
add('ramp', [7, 0.4, 6], [10, 0.29, 30], true, -0.14);
for (const [x, z] of [[8, -30], [30, 8], [-5, 0]]) add('boost', [3, 0.04, 4], [x!, 0.03, z!]);
for (const [x, z] of [[-30, -14], [2, 30], [4, 0]]) add('item', [1.2, 1.2, 1.2], [x!, 0.85, z!]);
for (let x = -33.5; x < -26; x += 1) for (let row = 0; row < 2; row++) {
  if ((Math.round(x + 33.5) + row) % 2 === 0) add('start', [1, 0.04, 0.6], [x, 0.03, 10 + row * 0.6]);
}
export const TRACK_PARTS: readonly TrackPart[] = parts;
export const TRACK_SPAWN = { x: -30, y: 3, z: 7 };
export const TRACK_SUMMARY = {
  id: 'greybox-v2-rounded', roadWidth: 8, closedCircuit: true,
  curved: true, cornerRadius: 10, fallZone: { x: -34, z: -7 },
  ramps: 2, boosts: 3, itemBoxes: 3, alternativeRoutes: 1,
  gameplayTriggers: false,
};
