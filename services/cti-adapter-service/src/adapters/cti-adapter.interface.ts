export interface ICtiAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  answerCall(callId: string): Promise<void>;
  hangupCall(callId: string): Promise<void>;
  holdCall(callId: string): Promise<void>;
  resumeCall(callId: string): Promise<void>;
  transferCall(callId: string, destination: string): Promise<void>;
  muteCall(callId: string): Promise<void>;
  unmuteCall(callId: string): Promise<void>;
}

export class MockCtiAdapter implements ICtiAdapter {
  private connected = false;

  async connect() {
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
  }

  async answerCall(callId: string) {
    if (!this.connected) throw new Error('Not connected');
    console.log(`Answered call: ${callId}`);
  }

  async hangupCall(callId: string) {
    if (!this.connected) throw new Error('Not connected');
    console.log(`Hung up call: ${callId}`);
  }

  async holdCall(callId: string) {
    if (!this.connected) throw new Error('Not connected');
    console.log(`Held call: ${callId}`);
  }

  async resumeCall(callId: string) {
    if (!this.connected) throw new Error('Not connected');
    console.log(`Resumed call: ${callId}`);
  }

  async transferCall(callId: string, destination: string) {
    if (!this.connected) throw new Error('Not connected');
    console.log(`Transferred call ${callId} to ${destination}`);
  }

  async muteCall(callId: string) {
    if (!this.connected) throw new Error('Not connected');
    console.log(`Muted call: ${callId}`);
  }

  async unmuteCall(callId: string) {
    if (!this.connected) throw new Error('Not connected');
    console.log(`Unmuted call: ${callId}`);
  }
}
