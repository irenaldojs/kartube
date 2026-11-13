import type { DrivingInput } from './driving.ts';

export function createDrivingInput(host: HTMLElement, buttons: HTMLElement, reset: () => void) {
  const keys = new Set<string>(), pointers = new Map<number, string>();
  const codes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyR']);
  const clear = () => { keys.clear(); pointers.clear(); };
  const down = (event: KeyboardEvent) => {
    if (!codes.has(event.code)) return;
    event.preventDefault();
    if (event.code === 'KeyR') { if (!event.repeat) reset(); return; }
    keys.add(event.code);
  };
  const up = (event: KeyboardEvent) => { keys.delete(event.code); };
  const focus = (event: PointerEvent) => { if (event.target instanceof HTMLCanvasElement) host.focus({ preventScroll: true }); };
  const press = (event: PointerEvent) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-drive]');
    if (!button || button.disabled) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.drive!);
  };
  const lift = (event: PointerEvent) => { pointers.delete(event.pointerId); };
  const held = (action: string, ...bindings: string[]) => bindings.some(code => keys.has(code)) || [...pointers.values()].includes(action);
  host.addEventListener('keydown', down); window.addEventListener('keyup', up);
  host.addEventListener('pointerdown', focus); host.addEventListener('focusout', clear);
  buttons.addEventListener('pointerdown', press);
  buttons.addEventListener('pointerup', lift); buttons.addEventListener('pointercancel', lift); buttons.addEventListener('lostpointercapture', lift);
  window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
  return {
    clear,
    read(): DrivingInput { return {
      throttle: Number(held('forward', 'KeyW', 'ArrowUp')) - Number(held('reverse', 'KeyS', 'ArrowDown')),
      steering: Number(held('right', 'KeyD', 'ArrowRight')) - Number(held('left', 'KeyA', 'ArrowLeft')),
      brake: held('brake', 'Space'),
    }; },
    dispose() {
      clear(); host.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      host.removeEventListener('pointerdown', focus); host.removeEventListener('focusout', clear);
      buttons.removeEventListener('pointerdown', press);
      buttons.removeEventListener('pointerup', lift); buttons.removeEventListener('pointercancel', lift); buttons.removeEventListener('lostpointercapture', lift);
      window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear);
    },
  };
}
