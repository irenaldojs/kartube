import './style.css';
import { createCheckpointRace } from '../../../packages/game-core/src/checkpoint-race.ts';
import { RACE_GATES, RACE_FINISH_ID, RACE_SPAWN, recoveryPointFor } from './race-track.ts';
import { NEUTRAL_INPUT } from './driving.ts';
import { createFrameSample, readHeap } from './diagnostics.ts';
import { createAudioProbe } from './audio-probe.ts';
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
const recoveryNote = element('recovery-note');
const speed = element('speed'), raceHud = element('race-hud'), countdown = element('race-countdown');
const startRace = element<HTMLButtonElement>('start-race'), practice = element<HTMLButtonElement>('practice'), laps = element<HTMLSelectElement>('laps');
const restart = element<HTMLButtonElement>('restart'), release = element<HTMLButtonElement>('release');
let generation = 0;
type View = ReturnType<typeof import('./view.ts').createView>;
type Physics = Awaited<ReturnType<typeof import('./physics.ts').createPhysics>>;
type ReleaseReport = { graphics: ReturnType<View['dispose']> | null; physics: Physics['resources'] | null; inputReleased: boolean; animationStopped: boolean };
let cleanup: (() => ReleaseReport) | null = null;
let lastRelease: ReleaseReport | null = null;
let report: Record<string, unknown> = { status: 'loading' };
const audioProbe = createAudioProbe(() => publish(report));
const audioButton = element<HTMLButtonElement>('test-audio');
audioButton.onclick = () => { void audioProbe.play(); };
function publish(data: Record<string, unknown>) {
  report = { ...data, runtime: '__TAURI_INTERNALS__' in window ? 'tauri' : 'browser', userAgent: navigator.userAgent, buildId: import.meta.env.VITE_BUILD_ID ?? 'development-unversioned', heap: readHeap(), audio: audioProbe.report };
  audioButton.disabled = audioProbe.report.activeContexts === 1 || audioProbe.report.status === 'unsupported';
  const audioMessages: Record<string, string> = { untested: 'Áudio ainda não testado.', testing: 'Iniciando áudio…', scheduled: 'Reproduzindo tom…', completed: 'Tom enviado. Confirme se ouviu ao registrar o teste.', cancelled: 'Teste de áudio interrompido. Você pode repetir.', unsupported: 'Web Audio não está disponível neste ambiente.', error: 'Não foi possível tocar o tom. Consulte o relatório e tente novamente.' };
  element('audio-status').textContent = audioMessages[String(audioProbe.report.status)] ?? '';
  output.textContent = JSON.stringify(report, null, 2);
  document.body.dataset.status = String(report.status);
}
function controls(active: boolean) { startRace.disabled = !active || scene.value !== 'track'; practice.disabled = !active || scene.value !== 'track'; laps.disabled = !active || scene.value !== 'track'; resetKart.disabled = !active || scene.value !== 'track'; driving.querySelectorAll('button').forEach(button => { button.disabled = !active || scene.value !== 'track'; }); camera.disabled = !active; pause.disabled = !active; step.disabled = true; release.disabled = !active; restart.disabled = false; }
function stop() { audioProbe.cancel(); generation++; if (cleanup) lastRelease = cleanup(); cleanup = null; controls(false); }
async function boot() {
  stop(); const token = generation; const bootStarted = performance.now();
  const frameSample = createFrameSample(); let sampleNextFrame = false;
  const sceneKind = scene.value === 'track' ? 'track' : 'drop';
  const profile: Quality = quality.value === 'low' ? 'low' : 'balanced';
  status.textContent = 'Carregando o motor…'; publish({ status: 'loading', quality: profile }); restart.disabled = true;
  let view: View | null = null;
  let physics: Physics | null = null;
  let race: ReturnType<typeof createCheckpointRace> | null = null;
  raceHud.textContent = 'Treino livre'; countdown.textContent = ''; recoveryNote.textContent = '';
  let recoveryNoticeTicks = 0;
  let input: ReturnType<typeof createDrivingInput> | null = null;
  let destroyed = false, raf = 0;
  let releaseReport: ReleaseReport | null = null;
  const destroy = (): ReleaseReport => {
    if (releaseReport) return releaseReport;
    destroyed = true; cancelAnimationFrame(raf); pause.onclick = null; step.onclick = null; camera.onchange = null; resetKart.onclick = null; startRace.onclick = null; practice.onclick = null;
    input?.dispose(); input = null; document.removeEventListener('visibilitychange', visibility);
    physics?.dispose();
    releaseReport = { graphics: view?.dispose() ?? null, physics: physics?.resources ?? null, inputReleased: true, animationStopped: true };
    physics = null; view = null;
    return releaseReport;
  };
  let previous = performance.now(), accumulator = 0, paused = false;
  const visibility = () => { audioProbe.cancel(); sampleNextFrame = false; input?.clear(); previous = performance.now(); accumulator = 0; };
  cleanup = destroy;
  try {
    const { createView } = await import('./view.ts');
    if (token !== generation) return;
    view = createView(host, profile, () => {
      stop(); status.textContent = 'O contexto gráfico foi perdido. Reinicie o teste.';
      publish({ ...report, status: 'error', error: 'webgl_context_lost' });
    }, sceneKind, camera.value === 'overview' ? 'overview' : 'chase');
    await view.loadKart();
    if (token !== generation) return;
    if (typeof WebAssembly === 'undefined') throw new Error('WebAssembly não está disponível. A física precisa de WASM para iniciar.');
    const { createPhysics, PHYSICS_DT } = await import('./physics.ts');
    if (token !== generation) return;
    physics = await createPhysics(sceneKind);
    if (token !== generation) { physics.dispose(); return; }
    const world = physics, display = view;
    const bootMs = Number((performance.now() - bootStarted).toFixed(2));
    let frames = 0, sampledFrames = 0, sampleTime = performance.now(), fps = 0;
    const raceVisuals = () => {
      const state = race?.snapshot;
      display.setRaceTargets(state?.expected ?? []);
      raceHud.textContent = state ? `Volta ${state.currentLap}/${state.laps} · ${state.elapsedSeconds.toFixed(2)} s · ${state.phase === 'finished' ? 'Concluída!' : state.nextLabels.join(' ou ')}` : 'Treino livre';
      const message = state?.phase === 'countdown' ? String(state.countdown) : state?.phase === 'finished' ? 'Chegada!' : state && state.elapsedSeconds < 1 ? 'VAI!' : '';
      if (countdown.textContent !== message) countdown.textContent = message;
    };
    const beginRace = () => {
      input?.clear(); world.reset(RACE_SPAWN); world.setRecoveryPoint(recoveryPointFor(null));
      recoveryNoticeTicks = 0; recoveryNote.textContent = '';
      race = createCheckpointRace({ gates: RACE_GATES, finishId: RACE_FINISH_ID, laps: Number(laps.value), tickRate: 60, countdownTicks: 180 }, world.position);
      paused = false; sampleNextFrame = false; pause.textContent = 'Pausar'; step.disabled = true; accumulator = 0; previous = performance.now();
      status.textContent = 'Preparando a largada'; raceVisuals(); draw(); update();
    };
    const recovered = () => {
      input?.clear(); race?.rebaseAfterRespawn(world.position);
      display.setCameraMode(camera.value === 'overview' ? 'overview' : 'chase');
      recoveryNoticeTicks = 120;
      recoveryNote.textContent = world.telemetry.lastRecoveryReason === 'stuck' ? 'Kart destravado' : world.telemetry.lastRecoveryReason === 'fall' ? 'De volta à pista' : 'Kart reposicionado';
    };
    const simulate = (command = input?.read() ?? NEUTRAL_INPUT) => {
      const recoveries = world.telemetry.recoveries, checkpoint = race?.snapshot.lastCheckpointId;
      const allowed = !race || race.phase === 'racing';
      world.step(allowed ? command : race?.phase === 'finished' ? { ...NEUTRAL_INPUT, brake: true } : NEUTRAL_INPUT);
      if (world.telemetry.recoveries !== recoveries) recovered();
      race?.step(world.position);
      if (race && race.snapshot.lastCheckpointId !== checkpoint) world.setRecoveryPoint(recoveryPointFor(race.snapshot.lastCheckpointId));
      if (recoveryNoticeTicks > 0 && --recoveryNoticeTicks === 0) recoveryNote.textContent = '';
    };
    const update = () => { raceVisuals(); if (!paused) status.textContent = race?.phase === 'countdown' ? 'Preparando a largada' : race?.phase === 'racing' ? 'Corrida em andamento' : race?.phase === 'finished' ? 'Corrida concluída' : 'Renderização e física ativas'; publish({ status: paused ? 'paused' : 'running', quality: profile, ...display.info, wasm: true, rapierVersion: world.version,
      race: race?.snapshot ?? null, bootMs, frameTiming: frameSample.report, physicsSteps: world.steps, renderFrames: frames, bodyY: Number(world.position.y.toFixed(4)), fps: Number(fps.toFixed(1)), memory: display.memory, memorySample: 'running', physicsResources: world.resources, previousRelease: lastRelease, physicsDt: PHYSICS_DT, position: world.pose, driving: { ...world.telemetry, input: input?.read() ?? null } }); };
    const draw = (elapsed = 0) => { raceVisuals(); display.render(world.pose, elapsed); frames++; speed.textContent = `${(world.telemetry.speed * 3.6).toFixed(0)} km/h${world.telemetry.boostRemaining > 0 ? ' · TURBO' : world.telemetry.drifting ? world.telemetry.driftCharge >= 1 ? ' · TURBO PRONTO' : ' · DRIFT' : sceneKind === 'track' && !world.telemetry.grounded ? ' · NO AR' : ''}`; };
    const animate = (now: number) => {
      if (destroyed) return;
      if (sampleNextFrame && !paused && !document.hidden) frameSample.add(now - previous);
      sampleNextFrame = !paused && !document.hidden;
      const elapsed = Math.min(Math.max((now - previous) / 1000, 0), 0.1); previous = now;
      if (!paused && !document.hidden) {
        accumulator += elapsed;
        let iterations = 0;
        while (accumulator >= PHYSICS_DT && iterations < 8) { simulate(); accumulator -= PHYSICS_DT; iterations++; }
        if (iterations === 8) accumulator = 0;
      }
      if (!document.hidden) draw(elapsed);
      if (now - sampleTime >= 250) { fps = (frames - sampledFrames) * 1000 / (now - sampleTime); sampledFrames = frames; sampleTime = now; update(); }
      raf = requestAnimationFrame(animate);
    };
    document.addEventListener('visibilitychange', visibility);
    pause.onclick = () => { paused = !paused; sampleNextFrame = false; audioProbe.cancel(); input?.clear(); accumulator = 0; previous = performance.now(); pause.textContent = paused ? 'Retomar' : 'Pausar'; step.disabled = !paused || race !== null; status.textContent = paused ? 'Simulação pausada' : 'Renderização e física ativas'; update(); };
    step.onclick = () => { if (!paused || destroyed || race) return; for (let i = 0; i < 120; i++) simulate(NEUTRAL_INPUT); draw(); update(); };
    camera.onchange = () => { display.setCameraMode(camera.value === 'overview' ? 'overview' : 'chase'); draw(); update(); };
    const reset = () => { if (world.recover('manual')) recovered(); draw(); update(); };
    startRace.onclick = beginRace;
    practice.onclick = () => { race = null; recoveryNoticeTicks = 0; recoveryNote.textContent = ''; input?.clear(); world.reset(); world.setRecoveryPoint({ ...world.position, y: 0.4, yaw: 0 }); step.disabled = !paused; draw(); update(); };
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
