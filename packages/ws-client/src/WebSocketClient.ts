import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export class WebSocketClient {
  private client: Client;
  private subscriptions: Map<string, StompSubscription> = new Map();

  constructor(url: string) {
    this.client = new Client({
      webSocketFactory: () => new SockJS(url),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });
  }

  connect(onConnect?: () => void, onError?: (error: Error) => void): void {
    const token = localStorage.getItem('accessToken');
    
    this.client.connectHeaders = {
      Authorization: `Bearer ${token}`,
    };

    this.client.onConnect = () => {
      console.log('WebSocket connected');
      onConnect?.();
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP error:', frame);
      onError?.(new Error(frame.headers['message']));
    };

    this.client.activate();
  }

  disconnect(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    this.client.deactivate();
  }

  subscribe(
    destination: string,
    callback: (message: IMessage) => void
  ): () => void {
    const subscription = this.client.subscribe(destination, callback);
    this.subscriptions.set(destination, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    };
  }

  send(destination: string, body: unknown): void {
    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }

  get isConnected(): boolean {
    return this.client.connected;
  }
}
