import * as THREE from 'three';
import { TRACK_PARTS, TRACK_SUMMARY, type SceneKind } from './track.ts';
export type Quality = 'low' | 'balanced';
export function createView(host: HTMLElement, quality: Quality, onContextLost: () => void, sceneKind: SceneKind = 'drop') {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', sceneKind === 'track' ? 'Pista cinza fechada com kart, rampas e caminho alternativo' : 'Kart de teste sobre uma plataforma');
  const gl = canvas.getContext('webgl2', { antialias: quality === 'balanced', alpha: false });
  if (!gl) throw new Error('WebGL2 não está disponível neste navegador. Tente outro navegador ou aparelho.');
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl });
  const ratio = Math.min(devicePixelRatio || 1, quality === 'low' ? 1 : 1.5);
  renderer.setPixelRatio(ratio);
  renderer.setClearColor(0x222d32);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 240);
  camera.position.set(13, 10, 14); camera.lookAt(0, 0.8, 0);
  if (sceneKind === 'track') { camera.position.set(48, 58, 62); camera.lookAt(0, 0, 0); }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x36464c, 2.4));
  const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(4, 9, 2); scene.add(light);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  function box(x: number, y: number, z: number, color: number) {
    const geometry = new THREE.BoxGeometry(x, y, z); geometries.push(geometry);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 }); materials.push(material);
    return new THREE.Mesh(geometry, material);
  }
  if (sceneKind === 'track') {
    const geometry = new THREE.BoxGeometry(1, 1, 1); geometries.push(geometry);
    const colors = { road: 0x707b80, rail: 0xb8c1c5, ramp: 0x9b8970, boost: 0x66d8bf, item: 0xd5a651, start: 0xf1f3e9, ground: 0x36474b };
    const palette = new Map<string, THREE.MeshStandardMaterial>();
    for (const part of TRACK_PARTS) {
      let material = palette.get(part.kind);
      if (!material) { material = new THREE.MeshStandardMaterial({ color: colors[part.kind], roughness: 0.9 }); palette.set(part.kind, material); materials.push(material); }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(...part.size); mesh.position.set(...part.position); mesh.rotation.z = part.rotationZ ?? 0;
      scene.add(mesh);
    }
  } else {
  const floor = box(20, 0.5, 14, 0x536368); floor.position.y = -0.25; scene.add(floor);
  const grid = new THREE.GridHelper(20, 20, 0x94b5a5, 0x667c7b); grid.position.y = 0.01; scene.add(grid);
  geometries.push(grid.geometry); materials.push(...(Array.isArray(grid.material) ? grid.material : [grid.material]));
  }
  const kart = new THREE.Group();
  const chassis = box(1.8, 0.45, 2.8, 0xe8a64e); kart.add(chassis);
  const seat = box(0.9, 0.6, 1, 0x233137); seat.position.set(0, 0.45, -0.3); kart.add(seat);
  for (const x of [-0.9, 0.9]) for (const z of [-0.9, 0.9]) {
    const wheel = box(0.45, 0.55, 0.65, 0x182126); wheel.position.set(x, -0.08, z); kart.add(wheel);
  }
  scene.add(kart); host.append(canvas);
  let disposed = false;
  const resize = new ResizeObserver(() => {
    const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  });
  resize.observe(host);
  renderer.setSize(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1), false);
  camera.aspect = Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1); camera.updateProjectionMatrix();
  const lost = (event: Event) => { event.preventDefault(); onContextLost(); };
  canvas.addEventListener('webglcontextlost', lost);
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    info: { scene: sceneKind, ...(sceneKind === 'track' ? { track: TRACK_SUMMARY } : {}), threeVersion: THREE.REVISION, webgl2: true, gpu: String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)), pixelRatio: ratio },
    render(position: { x: number; y: number; z: number }) {
      if (disposed) return;
      kart.position.copy(position); renderer.render(scene, camera);
    },
    get memory() { return { ...renderer.info.memory }; },
    dispose() {
      if (disposed) return;
      disposed = true; resize.disconnect(); canvas.removeEventListener('webglcontextlost', lost);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      scene.clear(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
