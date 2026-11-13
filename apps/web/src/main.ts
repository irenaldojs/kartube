import './style.css';
import { createDrivingInput } from './input.ts';
import type { Quality } from './view.ts';
function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id); if (!node) throw new Error(`Missing ${id}`); return node as T;
}
const host = element('viewport'), status = element('status'), output = element('report');
const scene = element<HTMLSelectElement>('scene');
const camera = element<HTMLSelectElement>('camera');
const quality = element<HTMLSelectElement>('quality');
const pause = element<HTMLButtonElement>('pause'), step = element<HTMLButtonElement>('step');
const driving = element('driving'), resetKart = element<HTMLButtonElement>('reset-kart');
const speed = element('speed');
const restart = element<HTMLButtonElement>('restart'), release = element<HTMLButtonElement>('release');
let generation = 0;
type View = ReturnType<typeof import('./view.ts').createView>;
type Physics = Awaited<ReturnType<typeof import('./physics.ts').createPhysics>>;
type ReleaseReport = { graphics: ReturnType<View['dispose']> | null; physics: Physics['resources'] | null; inputReleased: boolean; animationStopped: boolean };
let cleanup: (() => ReleaseReport) | null = null;
let lastRelease: ReleaseReport | null = null;
let report: Record<string, unknown> = { status: 'loading' };
function publish(data: Record<string, unknown>) {
  report = { ...data, runtime: '__TAURI_INTERNALS__' in window ? 'tauri' : 'browser', userAgent: navigator.userAgent };
  output.textContent = JSON.stringify(report, null, 2);
  document.body.dataset.status = String(report.status);
}
function controls(active: boolean) { resetKart.disabled = !active || scene.value !== 'track'; driving.querySelectorAll('button').forEach(button => { button.disabled = !active || scene.value !== 'track'; }); camera.disabled = !active; pause.disabled = !active; step.disabled = true; release.disabled = !active; restart.disabled = false; }
function stop() { generation++; if (cleanup) lastRelease = cleanup(); cleanup = null; controls(false); }
async function boot() {
  stop(); const token = generation;
  const sceneKind = scene.value === 'track' ? 'track' : 'drop';
  const profile: Quality = quality.value === 'low' ? 'low' : 'balanced';
  status.textContent = 'Carregando o motor…'; publish({ status: 'loading', quality: profile }); restart.disabled = true;
  let view: View | null = null;
  let physics: Physics | null = null;
  let input: ReturnType<typeof createDrivingInput> | null = null;
  let destroyed = false, raf = 0;
  let releaseReport: ReleaseReport | null = null;
  const destroy = (): ReleaseReport => {
    if (releaseReport) return releaseReport;
    destroyed = true; cancelAnimationFrame(raf); pause.onclick = null; step.onclick = null; camera.onchange = null; resetKart.onclick = null;
    input?.dispose(); input = null; document.removeEventListener('visibilitychange', visibility);
    physics?.dispose();
    releaseReport = { graphics: view?.dispose() ?? null, physics: physics?.resources ?? null, inputReleased: true, animationStopped: true };
    physics = null; view = null;
    return releaseReport;
  };
  let previous = performance.now(), accumulator = 0, paused = false;
  const visibility = () => { input?.clear(); previous = performance.now(); accumulator = 0; };
  cleanup = destroy;
  try {
    const { createView } = await import('./view.ts');
    if (token !== generation) return;
    view = createView(host, profile, () => {
      stop(); status.textContent = 'O contexto gráfico foi perdido. Reinicie o teste.';
      publish({ ...report, status: 'error', error: 'webgl_context_lost' });
    }, sceneKind, camera.value === 'overview' ? 'overview' : 'chase');
    if (typeof WebAssembly === 'undefined') throw new Error('WebAssembly não está disponível. A física precisa de WASM para iniciar.');
    const { createPhysics, PHYSICS_DT } = await import('./physics.ts');
    if (token !== generation) return;
    physics = await createPhysics(sceneKind);
    if (token !== generation) { physics.dispose(); return; }
    const world = physics, display = view;
    let frames = 0, sampledFrames = 0, sampleTime = performance.now(), fps = 0;
    const update = () => publish({ status: paused ? 'paused' : 'running', quality: profile, ...display.info, wasm: true, rapierVersion: world.version,
      physicsSteps: world.steps, renderFrames: frames, bodyY: Number(world.position.y.toFixed(4)), fps: Number(fps.toFixed(1)), memory: display.memory, memorySample: 'running', physicsResources: world.resources, previousRelease: lastRelease, physicsDt: PHYSICS_DT, position: world.pose, driving: { ...world.telemetry, input: input?.read() ?? null } });
    const draw = (elapsed = 0) => { display.render(world.pose, elapsed); frames++; speed.textContent = `${(world.telemetry.speed * 3.6).toFixed(0)} km/h`; };
    const animate = (now: number) => {
      if (destroyed) return;
      const elapsed = Math.min(Math.max((now - previous) / 1000, 0), 0.1); previous = now;
      if (!paused && !document.hidden) {
        accumulator += elapsed;
        let iterations = 0;
        while (accumulator >= PHYSICS_DT && iterations < 8) { world.step(input?.read()); accumulator -= PHYSICS_DT; iterations++; }
        if (iterations === 8) accumulator = 0;
      }
      if (!document.hidden) draw(elapsed);
      if (now - sampleTime >= 250) { fps = (frames - sampledFrames) * 1000 / (now - sampleTime); sampledFrames = frames; sampleTime = now; update(); }
      raf = requestAnimationFrame(animate);
    };
    document.addEventListener('visibilitychange', visibility);
    pause.onclick = () => { paused = !paused; input?.clear(); accumulator = 0; previous = performance.now(); pause.textContent = paused ? 'Retomar' : 'Pausar'; step.disabled = !paused; status.textContent = paused ? 'Simulação pausada' : 'Renderização e física ativas'; update(); };
    step.onclick = () => { if (!paused || destroyed) return; for (let i = 0; i < 120; i++) world.step(); draw(); update(); };
    camera.onchange = () => { display.setCameraMode(camera.value === 'overview' ? 'overview' : 'chase'); draw(); update(); };
    const reset = () => { input?.clear(); world.reset(); draw(); update(); };
    if (sceneKind === 'track') input = createDrivingInput(host, driving, reset);
    resetKart.onclick = reset;
    controls(true); pause.textContent = 'Pausar'; status.textContent = 'Renderização e física ativas';
    previous = performance.now(); draw(); update(); raf = requestAnimationFrame(animate);
  } catch (error) {
    const released = destroy();
    if (token !== generation) return;
    lastRelease = released;
    controls(false);
    status.textContent = error instanceof Error ? error.message : 'Não foi possível iniciar o motor.';
    publish({ status: 'error', quality: profile, error: status.textContent, release: lastRelease });
  }
}
restart.onclick = () => { void boot(); };
scene.onchange = () => { void boot(); };
quality.onchange = () => { void boot(); };
release.onclick = () => { stop(); status.textContent = 'Recursos liberados. Reinicie quando quiser.'; publish({ ...report, status: 'disposed', resourcesReleased: lastRelease?.graphics?.assets.closed === true && (lastRelease.physics === null || lastRelease.physics.worlds === 0), memory: lastRelease?.graphics?.rendererMemory ?? null, memorySample: 'after-release', release: lastRelease }); };
element<HTMLButtonElement>('export').onclick = () => {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'kartube-prova-3d.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
};
window.addEventListener('pagehide', stop);
void boot();
