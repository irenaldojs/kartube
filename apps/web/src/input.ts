import type { DrivingInput } from './driving.ts';

export function createDrivingInput(host: HTMLElement, buttons: HTMLElement, reset: () => void) {
  const keys = new Set<string>(), pointers = new Map<number, string>(), touches = new Map<number, string>();
  const nativeTouch = 'ontouchstart' in window;
  const driveButtons = Array.from(buttons.querySelectorAll<HTMLButtonElement>('[data-drive]'));
  const codes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyR', 'ShiftLeft', 'ShiftRight']);
  const paint = () => {
    const actions = [...pointers.values(), ...touches.values()];
    driveButtons.forEach(button => { button.dataset.held = String(actions.includes(button.dataset.drive!)); });
  };
  const clear = () => { keys.clear(); pointers.clear(); touches.clear(); paint(); };
  // Moving focus between pedal/steering buttons must not release fingers still held down.
  const focusOut = () => { keys.clear(); };
  const down = (event: KeyboardEvent) => {
    if (!codes.has(event.code)) return;
    event.preventDefault();
    if (event.code === 'KeyR') { if (!event.repeat) reset(); return; }
    keys.add(event.code);
  };
  const up = (event: KeyboardEvent) => { keys.delete(event.code); };
  const focus = (event: PointerEvent) => { if (event.target instanceof HTMLCanvasElement) host.focus({ preventScroll: true }); };
  const buttonAt = (target: EventTarget | null) => {
    const button = target instanceof Element ? target.closest<HTMLButtonElement>('[data-drive]') : null;
    return button && buttons.contains(button) && !button.disabled ? button : null;
  };
  const press = (event: PointerEvent) => {
    // Native touch identifiers remain independent of pointer capture and mouse emulation.
    if (nativeTouch && event.pointerType === 'touch') return;
    const button = buttonAt(event.target);
    if (!button) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.drive!); paint();
  };
  const lift = (event: PointerEvent) => { pointers.delete(event.pointerId); paint(); };
  const touchStart = (event: TouchEvent) => {
    if (!nativeTouch) return;
    let handled = false;
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]!;
      const button = buttonAt(touch.target);
      if (button) { touches.set(touch.identifier, button.dataset.drive!); handled = true; }
    }
    if (handled) event.preventDefault();
    paint();
  };
  const touchEnd = (event: TouchEvent) => {
    for (let i = 0; i < event.changedTouches.length; i++) touches.delete(event.changedTouches[i]!.identifier);
    paint();
  };
  const preventGesture = (event: Event) => { event.preventDefault(); };
  const held = (action: string, ...bindings: string[]) => bindings.some(code => keys.has(code)) || [...pointers.values(), ...touches.values()].includes(action);
  host.addEventListener('keydown', down); window.addEventListener('keyup', up);
  host.addEventListener('pointerdown', focus); host.addEventListener('focusout', focusOut);
  buttons.addEventListener('pointerdown', press);
  buttons.addEventListener('pointerup', lift); buttons.addEventListener('pointercancel', lift); buttons.addEventListener('lostpointercapture', lift);
  buttons.addEventListener('touchstart', touchStart, { passive: false });
  buttons.addEventListener('touchmove', preventGesture, { passive: false });
  window.addEventListener('touchend', touchEnd); window.addEventListener('touchcancel', touchEnd);
  buttons.addEventListener('contextmenu', preventGesture);
  window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
  return {
    clear,
    read(): DrivingInput { return {
      throttle: held('reverse', 'KeyS', 'ArrowDown') ? -1 : Number(held('forward', 'KeyW', 'ArrowUp')),
      steering: Number(held('right', 'KeyD', 'ArrowRight')) - Number(held('left', 'KeyA', 'ArrowLeft')),
      brake: held('brake', 'Space'),
      drift: held('drift', 'ShiftLeft', 'ShiftRight'),
    }; },
    dispose() {
      clear(); host.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      host.removeEventListener('pointerdown', focus); host.removeEventListener('focusout', focusOut);
      buttons.removeEventListener('pointerdown', press);
      buttons.removeEventListener('pointerup', lift); buttons.removeEventListener('pointercancel', lift); buttons.removeEventListener('lostpointercapture', lift);
      buttons.removeEventListener('touchstart', touchStart); buttons.removeEventListener('touchmove', preventGesture);
      window.removeEventListener('touchend', touchEnd); window.removeEventListener('touchcancel', touchEnd);
      buttons.removeEventListener('contextmenu', preventGesture);
      window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear);
    },
  };
}
