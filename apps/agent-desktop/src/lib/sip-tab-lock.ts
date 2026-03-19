/**
 * SIP Tab Lock — ensures only ONE browser tab holds an active SIP registration.
 * Uses BroadcastChannel API for cross-tab coordination.
 */

const CHANNEL_NAME = 'tpb-sip-lock';
const LOCK_KEY = 'tpb-sip-lock-holder';

type LockCallback = (isHolder: boolean) => void;

export class SipTabLock {
  private channel: BroadcastChannel;
  private tabId: string;
  private _isHolder = false;
  private onStatusChange: LockCallback;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(onStatusChange: LockCallback) {
    this.tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.onStatusChange = onStatusChange;
    this.channel = new BroadcastChannel(CHANNEL_NAME);

    this.channel.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'claim' && msg.tabId !== this.tabId) {
        // Another tab is claiming the lock
        if (this._isHolder) {
          // We are the current holder — check if we should yield
          // Newest tab wins (prevents stale tabs from holding)
        }
      }
      if (msg.type === 'heartbeat' && msg.tabId !== this.tabId) {
        // Another tab is alive and holding the lock
        if (!this._isHolder) return;
      }
      if (msg.type === 'release' && msg.tabId !== this.tabId) {
        // Another tab released — try to claim
        this.tryAcquire();
      }
    };
  }

  get isHolder(): boolean {
    return this._isHolder;
  }

  /** Try to acquire the SIP lock. */
  tryAcquire(): boolean {
    const current = localStorage.getItem(LOCK_KEY);
    const now = Date.now();

    if (current) {
      try {
        const holder = JSON.parse(current);
        // If the current holder's heartbeat is fresh (< 10s), don't steal
        if (holder.tabId !== this.tabId && now - holder.timestamp < 10000) {
          this._isHolder = false;
          this.onStatusChange(false);
          return false;
        }
      } catch {
        // Invalid data, take over
      }
    }

    // Claim the lock
    localStorage.setItem(LOCK_KEY, JSON.stringify({
      tabId: this.tabId,
      timestamp: now,
    }));

    this._isHolder = true;
    this.onStatusChange(true);

    this.channel.postMessage({ type: 'claim', tabId: this.tabId });

    // Start heartbeat
    if (!this.heartbeatInterval) {
      this.heartbeatInterval = setInterval(() => {
        if (this._isHolder) {
          localStorage.setItem(LOCK_KEY, JSON.stringify({
            tabId: this.tabId,
            timestamp: Date.now(),
          }));
          this.channel.postMessage({ type: 'heartbeat', tabId: this.tabId });
        }
      }, 5000);
    }

    return true;
  }

  /** Release the SIP lock (on tab close or explicit release). */
  release(): void {
    if (this._isHolder) {
      localStorage.removeItem(LOCK_KEY);
      this.channel.postMessage({ type: 'release', tabId: this.tabId });
      this._isHolder = false;
      this.onStatusChange(false);
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /** Cleanup on unmount. */
  destroy(): void {
    this.release();
    this.channel.close();
  }
}
