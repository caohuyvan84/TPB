/**
 * NetworkMonitor — singleton that detects online/offline/degraded network state.
 * Uses navigator.onLine + periodic server ping for reliable detection.
 */
export type NetworkState = 'online' | 'offline' | 'degraded';

type NetworkListener = (state: NetworkState) => void;

class NetworkMonitor {
  private state: NetworkState = navigator.onLine ? 'online' : 'offline';
  private listeners = new Set<NetworkListener>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pingUrl = '/'; // Nginx root — always returns 200
  private pingTimeoutMs = 5000;
  private pingIntervalMs = 60000; // 60s (less aggressive)
  private started = false;

  /** Current network state */
  getState(): NetworkState {
    return this.state;
  }

  /** Start monitoring */
  start() {
    if (this.started) return;
    this.started = true;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Periodic ping to detect degraded network (browser says online but server unreachable)
    this.pingInterval = setInterval(() => this.ping(), this.pingIntervalMs);
    // Initial ping after 3s (let app boot first)
    setTimeout(() => this.ping(), 3000);
  }

  /** Stop monitoring */
  stop() {
    this.started = false;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /** Subscribe to state changes */
  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Force a ping check now */
  async ping(): Promise<NetworkState> {
    if (!navigator.onLine) {
      this.setState('offline');
      return this.state;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.pingTimeoutMs);

      const start = Date.now();
      const resp = await fetch(this.pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);

      // Any HTTP response (even 404) means server is reachable
      const latency = Date.now() - start;
      this.setState(latency > 3000 ? 'degraded' : 'online');
    } catch {
      // Network error (no response at all) — server unreachable
      this.setState('degraded');
    }

    return this.state;
  }

  private handleOnline = () => {
    console.log('[NetworkMonitor] Browser online event');
    // Don't immediately set online — ping first to confirm server reachable
    this.ping();
    this.notify();
  };

  private handleOffline = () => {
    console.log('[NetworkMonitor] Browser offline event');
    this.setState('offline');
  };

  private setState(newState: NetworkState) {
    if (this.state === newState) return;
    const old = this.state;
    this.state = newState;
    console.log(`[NetworkMonitor] ${old} → ${newState}`);
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      try { listener(this.state); } catch { /* ignore */ }
    }
  }
}

export const networkMonitor = new NetworkMonitor();
