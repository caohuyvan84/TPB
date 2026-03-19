import { Logger } from '@nestjs/common';
import { ICtiAdapter } from './cti-adapter.interface';

/**
 * FreeSwitchAdapter — delegates call control to GoACD via its HTTP/gRPC API.
 * GoACD controls FreeSWITCH via ESL; this adapter is the NestJS-side client.
 */
export class FreeSwitchAdapter implements ICtiAdapter {
  private readonly logger = new Logger(FreeSwitchAdapter.name);
  private connected = false;
  private goacdBaseUrl: string;

  constructor(config: { goacdUrl?: string } = {}) {
    this.goacdBaseUrl = config.goacdUrl || 'http://localhost:9091';
  }

  async connect(): Promise<void> {
    this.logger.log(`Connecting to GoACD at ${this.goacdBaseUrl}`);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  private async rpc(endpoint: string, body?: Record<string, unknown>): Promise<any> {
    if (!this.connected) throw new Error('FreeSwitchAdapter not connected');

    const url = `${this.goacdBaseUrl}/rpc/${endpoint}`;
    const resp = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`GoACD RPC ${endpoint} failed: ${resp.status} ${text}`);
    }

    return resp.json();
  }

  async answerCall(callId: string): Promise<void> {
    this.logger.log(`Answer call ${callId}`);
    // Answer is handled by agent's SIP client, not by GoACD API
  }

  async hangupCall(callId: string): Promise<void> {
    this.logger.log(`Hangup call ${callId}`);
    await this.rpc('HangupCall', { uuid: callId });
  }

  async holdCall(callId: string): Promise<void> {
    this.logger.log(`Hold call ${callId}`);
    // Hold is handled by agent's SIP client (re-INVITE with sendonly SDP)
  }

  async resumeCall(callId: string): Promise<void> {
    this.logger.log(`Resume call ${callId}`);
  }

  async transferCall(callId: string, destination: string): Promise<void> {
    this.logger.log(`Transfer call ${callId} to ${destination}`);
    // TODO: implement via GoACD TransferCall RPC in Sprint 6
  }

  async muteCall(callId: string): Promise<void> {
    this.logger.log(`Mute call ${callId}`);
  }

  async unmuteCall(callId: string): Promise<void> {
    this.logger.log(`Unmute call ${callId}`);
  }

  async makeCall(agentId: string, destination: string): Promise<any> {
    this.logger.log(`Make call: agent=${agentId} → ${destination}`);
    return this.rpc('MakeCall', { agentId, destination });
  }

  async setAgentState(agentId: string, status: string): Promise<any> {
    return this.rpc('SetAgentState', { agentId, status });
  }

  async getAgentState(agentId: string): Promise<any> {
    const url = `${this.goacdBaseUrl}/rpc/GetAgentState?agentId=${agentId}`;
    const resp = await fetch(url);
    return resp.json();
  }

  async getSIPCredentials(agentId: string): Promise<any> {
    const url = `${this.goacdBaseUrl}/rpc/GetSIPCredentials?agentId=${agentId}`;
    const resp = await fetch(url);
    return resp.json();
  }
}
