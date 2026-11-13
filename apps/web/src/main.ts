import './style.css';
import type { Quality } from './view.ts';
function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id); if (!node) throw new Error(`Missing ${id}`); return node as T;
}
const host = element('viewport'), status = element('status'), output = element('report');
const scene = element<HTMLSelectElement>('scene');
const camera = element<HTMLSelectElement>('camera');
const quality = element<HTMLSelectElement>('quality');
const pause = element<HTMLButtonElement>('pause'), step = element<HTMLButtonElement>('step');
const restart = element<HTMLButtonElement>('restart'), release = element<HTMLButtonElement>('release');
let generation = 0;
let cleanup: (() => void) | null = null;
let report: Record<string, unknown> = { status: 'loading' };
function publish(data: Record<string, unknown>) {
  report = { ...data, userAgent: navigator.userAgent };
  output.textContent = JSON.stringify(report, null, 2);
  document.body.dataset.status = String(report.status);
}
function controls(active: boolean) { camera.disabled = !active; pause.disabled = !active; step.disabled = true; release.disabled = !active; restart.disabled = false; }
function stop() { generation++; cleanup?.(); cleanup = null; controls(false); }
async function boot() {
  stop(); const token = generation;
  const sceneKind = scene.value === 'track' ? 'track' : 'drop';
  const profile: Quality = quality.value === 'low' ? 'low' : 'balanced';
  status.textContent = 'Carregando o motor…'; publish({ status: 'loading', quality: profile }); restart.disabled = true;
  let view: ReturnType<typeof import('./view.ts').createView> | null = null;
  let physics: Awaited<ReturnType<typeof import('./physics.ts').createPhysics>> | null = null;
  let destroyed = false, raf = 0;
  const destroy = () => { if (destroyed) return; destroyed = true; cancelAnimationFrame(raf); pause.onclick = null; step.onclick = null; camera.onchange = null; document.removeEventListener('visibilitychange', visibility); physics?.dispose(); view?.dispose(); physics = null; view = null; };
  let previous = performance.now(), accumulator = 0, paused = false;
  const visibility = () => { previous = performance.now(); accumulator = 0; };
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
      physicsSteps: world.steps, renderFrames: frames, bodyY: Number(world.position.y.toFixed(4)), fps: Number(fps.toFixed(1)), memory: display.memory });
    const draw = (elapsed = 0) => { display.render(world.position, elapsed); frames++; };
    const animate = (now: number) => {
      if (destroyed) return;
      const elapsed = Math.min(Math.max((now - previous) / 1000, 0), 0.1); previous = now;
      if (!paused && !document.hidden) {
        accumulator += elapsed;
        let iterations = 0;
        while (accumulator >= PHYSICS_DT && iterations < 8) { world.step(); accumulator -= PHYSICS_DT; iterations++; }
        if (iterations === 8) accumulator = 0;
      }
      if (!document.hidden) draw(elapsed);
      if (now - sampleTime >= 250) { fps = (frames - sampledFrames) * 1000 / (now - sampleTime); sampledFrames = frames; sampleTime = now; update(); }
      raf = requestAnimationFrame(animate);
    };
    document.addEventListener('visibilitychange', visibility);
    pause.onclick = () => { paused = !paused; accumulator = 0; previous = performance.now(); pause.textContent = paused ? 'Retomar' : 'Pausar'; step.disabled = !paused; status.textContent = paused ? 'Simulação pausada' : 'Renderização e física ativas'; update(); };
    step.onclick = () => { if (!paused || destroyed) return; for (let i = 0; i < 120; i++) world.step(); draw(); update(); };
    camera.onchange = () => { display.setCameraMode(camera.value === 'overview' ? 'overview' : 'chase'); draw(); update(); };
    controls(true); pause.textContent = 'Pausar'; status.textContent = 'Renderização e física ativas';
    previous = performance.now(); draw(); update(); raf = requestAnimationFrame(animate);
  } catch (error) {
    destroy();
    if (token !== generation) return;
    controls(false);
    status.textContent = error instanceof Error ? error.message : 'Não foi possível iniciar o motor.';
    publish({ status: 'error', quality: profile, error: status.textContent });
  }
}
restart.onclick = () => { void boot(); };
scene.onchange = () => { void boot(); };
quality.onchange = () => { void boot(); };
release.onclick = () => { stop(); status.textContent = 'Recursos liberados. Reinicie quando quiser.'; publish({ ...report, status: 'disposed', resourcesReleased: true }); };
element<HTMLButtonElement>('export').onclick = () => {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'kartube-prova-3d.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
};
window.addEventListener('pagehide', stop);
void boot();
