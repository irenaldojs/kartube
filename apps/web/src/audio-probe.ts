// A short opt-in diagnostic tone, separate from future gameplay audio.
export function createAudioProbe(changed: () => void) {
  let context: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let generation = 0;
  let result: Record<string, unknown> & { status: string; audibleConfirmed: null } = { status: typeof AudioContext === 'undefined' ? 'unsupported' : 'untested', audibleConfirmed: null };
  const close = () => {
    try { oscillator?.stop(); } catch { /* Tone may already have ended. */ }
    oscillator?.disconnect(); oscillator = null;
    const previous = context; context = null;
    if (previous && previous.state !== 'closed') void previous.close().catch(() => {});
  };
  return {
    get report() { return { ...result, activeContexts: context ? 1 : 0 }; },
    cancel() { generation++; close(); if (result.status === 'testing' || result.status === 'scheduled') result = { ...result, status: 'cancelled' }; },
    async play() {
      if (context || typeof AudioContext === 'undefined') return;
      const token = ++generation;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const audio = new AudioContext(); context = audio;
        result = { status: 'testing', audibleConfirmed: null }; changed();
        await Promise.race([audio.resume(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('audio_resume_timeout')), 3000); })]);
        clearTimeout(timeout);
        if (token !== generation) return;
        if (audio.state !== 'running') throw new Error(`audio_${audio.state}`);
        const tone = audio.createOscillator(), gain = audio.createGain(); oscillator = tone;
        tone.frequency.value = 440; gain.gain.setValueAtTime(0, audio.currentTime);
        gain.gain.linearRampToValueAtTime(0.04, audio.currentTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, audio.currentTime + 0.25);
        tone.connect(gain); gain.connect(audio.destination);
        result = { status: 'scheduled', contextState: audio.state, sampleRate: audio.sampleRate, baseLatencySeconds: audio.baseLatency ?? null, audibleConfirmed: null };
        tone.onended = () => { gain.disconnect(); if (token === generation) { close(); result = { ...result, status: 'completed' }; changed(); } };
        tone.start(); tone.stop(audio.currentTime + 0.3); changed();
      } catch (error) {
        if (token !== generation) return;
        close(); result = { status: 'error', error: error instanceof Error ? error.message : String(error), audibleConfirmed: null }; changed();
      } finally { clearTimeout(timeout); }
    },
  };
}
