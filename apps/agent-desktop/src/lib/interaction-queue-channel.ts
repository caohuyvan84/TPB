import { wsClient } from './websocket-client';
import type { Interaction } from './interactions-api';

// Event types
export interface QueueEvent {
  type: 'new' | 'updated' | 'removed' | 'assigned';
  interaction: Interaction;
  timestamp: string;
}

export interface SLAWarningEvent {
  interactionId: string;
  remainingSeconds: number;
  timestamp: string;
}

export interface SLABreachedEvent {
  interactionId: string;
  thresholdMinutes: number;
  actualSeconds: number;
  timestamp: string;
}

// Event handlers type
type QueueEventHandler = (event: QueueEvent) => void;
type SLAWarningHandler = (event: SLAWarningEvent) => void;
type SLABreachedHandler = (event: SLABreachedEvent) => void;

/**
 * Interaction Queue WebSocket Channel
 * Handles real-time updates for agent's interaction queue
 */
export class InteractionQueueChannel {
  private agentId: string | null = null;
  private queueHandlers: Set<QueueEventHandler> = new Set();
  private slaWarningHandlers: Set<SLAWarningHandler> = new Set();
  private slaBreachedHandlers: Set<SLABreachedHandler> = new Set();

  /**
   * Subscribe to queue updates for specific agent
   */
  subscribe(agentId: string) {
    if (this.agentId === agentId) return; // Already subscribed

    this.agentId = agentId;
    const channel = `/ws/interactions/${agentId}/queue`;

    // Subscribe to queue events
    wsClient.on(`${channel}:new`, this.handleQueueEvent('new'));
    wsClient.on(`${channel}:updated`, this.handleQueueEvent('updated'));
    wsClient.on(`${channel}:removed`, this.handleQueueEvent('removed'));
    wsClient.on(`${channel}:assigned`, this.handleQueueEvent('assigned'));

    // Subscribe to SLA events
    wsClient.on(`${channel}:sla:warning`, this.handleSLAWarning);
    wsClient.on(`${channel}:sla:breached`, this.handleSLABreached);

    console.log(`[Queue] Subscribed to ${channel}`);
  }

  /**
   * Unsubscribe from queue updates
   */
  unsubscribe() {
    if (!this.agentId) return;

    const channel = `/ws/interactions/${this.agentId}/queue`;

    // Unsubscribe from all events
    wsClient.off(`${channel}:new`);
    wsClient.off(`${channel}:updated`);
    wsClient.off(`${channel}:removed`);
    wsClient.off(`${channel}:assigned`);
    wsClient.off(`${channel}:sla:warning`);
    wsClient.off(`${channel}:sla:breached`);

    console.log(`[Queue] Unsubscribed from ${channel}`);
    this.agentId = null;
  }

  /**
   * Add queue event handler
   */
  onQueueEvent(handler: QueueEventHandler) {
    this.queueHandlers.add(handler);
    return () => this.queueHandlers.delete(handler);
  }

  /**
   * Add SLA warning handler
   */
  onSLAWarning(handler: SLAWarningHandler) {
    this.slaWarningHandlers.add(handler);
    return () => this.slaWarningHandlers.delete(handler);
  }

  /**
   * Add SLA breached handler
   */
  onSLABreached(handler: SLABreachedHandler) {
    this.slaBreachedHandlers.add(handler);
    return () => this.slaBreachedHandlers.delete(handler);
  }

  // Private methods

  private handleQueueEvent = (type: QueueEvent['type']) => (data: any) => {
    const event: QueueEvent = {
      type,
      interaction: data.interaction,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    this.queueHandlers.forEach((handler) => handler(event));
  };

  private handleSLAWarning = (data: any) => {
    const event: SLAWarningEvent = {
      interactionId: data.interactionId,
      remainingSeconds: data.remainingSeconds,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    this.slaWarningHandlers.forEach((handler) => handler(event));
  };

  private handleSLABreached = (data: any) => {
    const event: SLABreachedEvent = {
      interactionId: data.interactionId,
      thresholdMinutes: data.thresholdMinutes,
      actualSeconds: data.actualSeconds,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    this.slaBreachedHandlers.forEach((handler) => handler(event));
  };
}

// Export singleton instance
export const queueChannel = new InteractionQueueChannel();
