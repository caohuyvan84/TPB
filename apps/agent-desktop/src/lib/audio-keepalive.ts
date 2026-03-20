/**
 * AudioKeepAlive — plays near-silent audio to prevent Chrome from throttling the tab.
 *
 * Chrome does NOT throttle tabs that are playing audio ("audible" tabs).
 * We exploit this by running a ~inaudible OscillatorNode (1Hz, gain 0.0001).
 * This keeps SIP.js WebSocket alive and able to receive INVITE in background.
 *
 * IMPORTANT: AudioContext can only be created after a user gesture (Chrome autoplay policy).
 * We defer creation until the first click/keypress after start() is called.
 */

type KeepAliveState = 'stopped' | 'running' | 'suspended';
type StateCallback = (state: KeepAliveState) => void;

class AudioKeepAlive {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private _state: KeepAliveState = 'stopped';
  private listeners = new Set<StateCallback>();
  private wantStart = false;
  private gestureHandler: (() => void) | null = null;

  get state(): KeepAliveState {
    return this._state;
  }

  /**
   * Request start. If user has already interacted, starts immediately.
   * Otherwise waits for the next click/keypress to create AudioContext.
   */
  start() {
    if (this.ctx) return; // already running
    this.wantStart = true;

    // Try to create immediately — works if user already clicked something
    if (this.tryCreate()) return;

    // Otherwise wait for user gesture
    this.setState('suspended');
    if (!this.gestureHandler) {
      this.gestureHandler = () => {
        if (this.wantStart && !this.ctx) {
          this.tryCreate();
        }
        this.removeGestureListeners();
      };
      document.addEventListener('click', this.gestureHandler, { once: true, capture: true });
      document.addEventListener('keydown', this.gestureHandler, { once: true, capture: true });
      console.log('[AudioKeepAlive] Waiting for user gesture to start');
    }
  }

  /** Stop silent audio. */
  stop() {
    this.wantStart = false;
    this.removeGestureListeners();
    this.destroyAudio();
    this.setState('stopped');
  }

  /** Subscribe to state changes */
  subscribe(cb: StateCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Try to create and start AudioContext.
   * Returns true if successful (running), false if suspended/blocked.
   */
  private tryCreate(): boolean {
    if (this.ctx) return (this.ctx.state as string) === 'running';

    try {
      this.ctx = new AudioContext();

      // If immediately suspended, don't set up oscillator yet — try resume
      if ((this.ctx.state as string) === 'suspended') {
        this.ctx.resume().then(() => {
          if ((this.ctx?.state as string) === 'running') {
            this.setupOscillator();
            this.setState('running');
            console.log('[AudioKeepAlive] Running (resumed after create)');
          }
        }).catch(() => {
          // Still suspended — will be picked up by gesture handler
        });
        return false;
      }

      // Already running — set up oscillator
      this.setupOscillator();
      this.setState('running');
      console.log('[AudioKeepAlive] Running');
      return true;
    } catch (err) {
      console.warn('[AudioKeepAlive] Create failed:', err);
      this.ctx = null;
      return false;
    }
  }

  private setupOscillator() {
    if (!this.ctx || this.oscillator) return;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.0001; // near-silent
    this.gainNode.connect(this.ctx.destination);

    this.oscillator = this.ctx.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 1; // 1Hz — below human hearing
    this.oscillator.connect(this.gainNode);
    this.oscillator.start();

    // Track AudioContext state changes
    this.ctx.onstatechange = () => {
      if ((this.ctx?.state as string) === 'running') {
        this.setState('running');
      } else if ((this.ctx?.state as string) === 'suspended') {
        this.setState('suspended');
      }
    };
  }

  private destroyAudio() {
    try { this.oscillator?.stop(); } catch { /* */ }
    try { this.oscillator?.disconnect(); } catch { /* */ }
    try { this.gainNode?.disconnect(); } catch { /* */ }
    try { this.ctx?.close(); } catch { /* */ }
    this.oscillator = null;
    this.gainNode = null;
    this.ctx = null;
  }

  private removeGestureListeners() {
    if (this.gestureHandler) {
      document.removeEventListener('click', this.gestureHandler, { capture: true });
      document.removeEventListener('keydown', this.gestureHandler, { capture: true });
      this.gestureHandler = null;
    }
  }

  private setState(state: KeepAliveState) {
    if (this._state === state) return;
    this._state = state;
    for (const cb of this.listeners) {
      try { cb(state); } catch { /* ignore */ }
    }
  }
}

export const audioKeepAlive = new AudioKeepAlive();
