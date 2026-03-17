import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AgentService } from './agent.service';

@WebSocketGateway({
  namespace: '/agent',
  cors: { origin: 'http://localhost:3000', credentials: true },
})
export class AgentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(private agentService: AgentService) {}

  handleConnection(client: Socket) {
    console.log(`Agent connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Agent disconnected: ${client.id}`);
  }

  @SubscribeMessage('status:update')
  async handleStatusUpdate(
    @MessageBody() data: { agentId: string; channel: string; status: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { agentId, channel, status } = data;

    await this.agentService.setChannelStatus(agentId, channel, status);

    // Broadcast to all clients
    this.server.emit('status:changed', { agentId, channel, status });

    return { success: true };
  }

  @SubscribeMessage('presence:subscribe')
  handlePresenceSubscribe(
    @MessageBody() data: { agentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`agent:${data.agentId}`);
    return { success: true };
  }

  broadcastStatusChange(agentId: string, channel: string, status: string) {
    this.server
      .to(`agent:${agentId}`)
      .emit('status:changed', { agentId, channel, status });
  }
}
