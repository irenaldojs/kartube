import * as THREE from 'three';
import { createKartModel, loadKartSource } from './kart-model.ts';
import { SceneAssets } from './assets.ts';
import { createCameraRig, type CameraMode, type KartPose } from './camera.ts';
import { TRACK_PARTS, TRACK_SUMMARY, type SceneKind } from './track.ts';
export type Quality = 'low' | 'balanced';
export function createView(host: HTMLElement, quality: Quality, onContextLost: () => void, sceneKind: SceneKind = 'drop', cameraMode: CameraMode = 'chase') {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', sceneKind === 'track' ? 'Pista cinza fechada com kart, rampas e caminho alternativo' : 'Kart de teste sobre uma plataforma');
  const gl = canvas.getContext('webgl2', { antialias: quality === 'balanced', alpha: false });
  if (!gl) throw new Error('WebGL2 não está disponível neste navegador. Tente outro navegador ou aparelho.');
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl });
  const assets = new SceneAssets();
  const scene = new THREE.Scene();
  const shadowSurfaces: THREE.Object3D[] = [];
  let resize: ResizeObserver | undefined, disposed = false;
  const lost = (event: Event) => { event.preventDefault(); onContextLost(); };
  const dispose = () => {
    if (!disposed) {
      disposed = true; resize?.disconnect(); canvas.removeEventListener('webglcontextlost', lost);
      assets.dispose(); scene.clear(); shadowSurfaces.length = 0;
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    }
    return { assets: assets.info, rendererMemory: { ...renderer.info.memory }, canvasRemoved: !canvas.isConnected, contextLossRequested: disposed };
  };
  try {
    const ratio = Math.min(devicePixelRatio || 1, quality === 'low' ? 1 : 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setClearColor(0x222d32);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 240);
    const cameraRig = createCameraRig(camera, sceneKind, cameraMode);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x36464c, 2.4));
    const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(4, 9, 2); scene.add(light);
    const cube = assets.geometry(new THREE.BoxGeometry(1, 1, 1));
    const palette = new Map<number, THREE.MeshStandardMaterial>();
    function box(x: number, y: number, z: number, color: number) {
      let material = palette.get(color);
      if (!material) { material = assets.material(new THREE.MeshStandardMaterial({ color, roughness: 0.85 })); palette.set(color, material); }
      const mesh = new THREE.Mesh(cube, material); mesh.scale.set(x, y, z);
      return mesh;
    }
    if (sceneKind === 'track') {
      const colors = { road: 0x707b80, rail: 0xb8c1c5, ramp: 0x9b8970, boost: 0x66d8bf, item: 0xd5a651, start: 0xf1f3e9, ground: 0x36474b };
      for (const part of TRACK_PARTS) {
        const mesh = box(...part.size, colors[part.kind]);
        mesh.position.set(...part.position); mesh.rotation.z = part.rotationZ ?? 0;
        scene.add(mesh);
        if (part.kind === 'road' || part.kind === 'ramp') shadowSurfaces.push(mesh);
      }
    } else {
      const floor = box(20, 0.5, 14, 0x536368); floor.position.y = -0.25; scene.add(floor); shadowSurfaces.push(floor);
      const grid = new THREE.GridHelper(20, 20, 0x94b5a5, 0x667c7b); grid.position.y = 0.01; scene.add(grid);
      assets.geometry(grid.geometry);
      for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) assets.material(material);
    }
    const kart = new THREE.Group();
    scene.add(kart);
    let kartModel: { source: string; dimensions: number[] } | null = null;
    // A small untextured contact shadow avoids a shadow-map render pass on mobile.
    const shadowGeometry = assets.geometry(new THREE.CircleGeometry(1, quality === 'low' ? 16 : 24));
    const shadowMaterial = assets.material(new THREE.MeshBasicMaterial({ color: 0x0a1519, transparent: true, opacity: 0.28, depthWrite: false }));
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.scale.set(1.25, 1.7, 1); scene.add(shadow);
    const ray = new THREE.Raycaster(), normal = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1);
    ray.ray.direction.set(0, -1, 0);
    host.append(canvas);
    resize = new ResizeObserver(() => {
      const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    });
    resize.observe(host);
    renderer.setSize(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1), false);
    camera.aspect = Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1); camera.updateProjectionMatrix();
    canvas.addEventListener('webglcontextlost', lost);
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      async loadKart() {
        const data = await loadKartSource();
        if (disposed) return;
        const loaded = createKartModel(data, assets); kart.add(loaded.object);
        kartModel = { source: 'Cart.fbx', dimensions: loaded.dimensions };
      },
      get info() { return { kartModel, assets: assets.info, camera: cameraRig.info, shadow: 'contact', shadowVisible: shadow.visible, scene: sceneKind, ...(sceneKind === 'track' ? { track: TRACK_SUMMARY } : {}), threeVersion: THREE.REVISION, webgl2: true, gpu: String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)), pixelRatio: ratio }; },
      setCameraMode(mode: CameraMode) { cameraRig.setMode(mode); },
      render(position: KartPose, elapsed = 0) {
        if (disposed) return;
        kart.position.copy(position); kart.rotation.y = position.yaw ?? 0;
        // Surface transforms must be current before raycasting, including the first frame.
        scene.updateMatrixWorld(true);
        ray.ray.origin.set(position.x, position.y + 0.1, position.z);
        const hit = ray.intersectObjects(shadowSurfaces, false)[0];
        shadow.visible = !!hit;
        if (hit?.face) {
          normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
          shadow.position.copy(hit.point).addScaledVector(normal, 0.015);
          shadow.quaternion.setFromUnitVectors(up, normal);
          shadowMaterial.opacity = 0.28 / (1 + Math.max(position.y - hit.point.y - 0.35, 0) * 0.5);
        }
        cameraRig.update(position, elapsed); renderer.render(scene, camera);
      },
      get memory() { return { ...renderer.info.memory }; },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
