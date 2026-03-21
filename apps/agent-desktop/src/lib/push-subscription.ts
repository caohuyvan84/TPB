import { apiClient } from './api-client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * PushSubscriptionManager — registers Service Worker and subscribes to Web Push.
 * Sends subscription to CTI Adapter for server-side push delivery.
 */
class PushSubscriptionManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private agentId: string | null = null;
  private initialized = false;

  /** Initialize: register Service Worker + subscribe to push. Skips if already initialized for same agent. */
  async init(agentId: string): Promise<boolean> {
    if (this.initialized && this.agentId === agentId) return true;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[PushSub] Service Worker or Push API not supported');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.warn('[PushSub] VAPID public key not configured (VITE_VAPID_PUBLIC_KEY)');
      return false;
    }

    this.agentId = agentId;

    try {
      // Register Service Worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PushSub] Service Worker registered');

      // Wait for SW to be ready
      await navigator.serviceWorker.ready;

      // Check existing subscription
      this.subscription = await this.swRegistration.pushManager.getSubscription();

      if (!this.subscription) {
        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('[PushSub] Notification permission denied');
          return false;
        }

        // Subscribe to push
        this.subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
        console.log('[PushSub] Push subscription created');
      }

      // Send subscription to CTI Adapter
      await this.sendToServer();
      this.initialized = true;
      return true;
    } catch (err) {
      console.error('[PushSub] Init failed:', err);
      return false;
    }
  }

  /** Unsubscribe and cleanup. */
  async destroy(): Promise<void> {
    try {
      // Unsubscribe from push
      if (this.subscription) {
        await this.subscription.unsubscribe();
      }

      // Notify server
      if (this.agentId) {
        await apiClient.delete(`/api/v1/cti/push-subscription?agentId=${this.agentId}`).catch(() => {});
      }

      // Unregister SW
      if (this.swRegistration) {
        await this.swRegistration.unregister();
      }
    } catch (err) {
      console.error('[PushSub] Destroy error:', err);
    }
    this.subscription = null;
    this.swRegistration = null;
    this.agentId = null;
    this.initialized = false;
  }

  /** Report tab status to server (used for Layer 1/2 coordination). */
  async reportTabStatus(audioActive: boolean, sipRegistered: boolean): Promise<void> {
    if (!this.agentId) return;
    try {
      await apiClient.post('/api/v1/cti/agent-tab-status', {
        agentId: this.agentId,
        tabVisible: !document.hidden,
        audioActive,
        sipRegistered,
      });
    } catch { /* non-critical */ }
  }

  private async sendToServer(): Promise<void> {
    if (!this.subscription || !this.agentId) return;
    await apiClient.post('/api/v1/cti/push-subscription', {
      agentId: this.agentId,
      subscription: this.subscription.toJSON(),
    });
    console.log('[PushSub] Subscription sent to server');
  }
}

/** Convert VAPID base64 key to Uint8Array (required by subscribe()). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushSubscription = new PushSubscriptionManager();
