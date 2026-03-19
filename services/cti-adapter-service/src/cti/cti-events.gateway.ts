import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket gateway that broadcasts call events to Agent Desktop.
 * Events: call:incoming, call:answered, call:ended, call:transferred, agent:state_changed
 */
@WebSocketGateway({
  namespace: '/cti',
  cors: { origin: '*' },
})
export class CtiEventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(CtiEventsGateway.name);

  afterInit() {
    this.logger.log('CTI WebSocket gateway initialized (/cti namespace)');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** Broadcast a call event to all connected clients. */
  broadcastCallEvent(eventType: string, data: Record<string, unknown>) {
    this.server.emit(eventType, data);
    this.logger.debug(`Broadcast ${eventType}`, data);
  }

  /** Send event to a specific agent's room. */
  sendToAgent(agentId: string, eventType: string, data: Record<string, unknown>) {
    this.server.to(`agent:${agentId}`).emit(eventType, data);
  }
}
