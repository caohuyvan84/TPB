import { UserAgent, Registerer, Inviter, Invitation, SessionState, RegistererState } from 'sip.js';

export type WebRtcStatus = 'disconnected' | 'connecting' | 'registered' | 'error';
export type CallDirection = 'inbound' | 'outbound';

export interface WebRtcCredentials {
  wsUri: string;
  sipUri: string;
  domain: string;
  iceServers: { urls: string }[];
}

export interface WebRtcCallbacks {
  onStatusChange: (status: WebRtcStatus) => void;
  onIncomingCall: (callId: string, callerNumber: string, callerName: string) => void;
  onCallAnswered: (callId: string) => void;
  onCallEnded: (callId: string) => void;
  onCallFailed: (callId: string, reason: string) => void;
}

/**
 * WebRtcService — manages SIP.js UserAgent lifecycle and call control.
 * Registers to Kamailio WSS and handles incoming/outgoing WebRTC calls.
 */
export class WebRtcService {
  private ua: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private currentSession: Inviter | Invitation | null = null;
  private callbacks: WebRtcCallbacks;
  private _status: WebRtcStatus = 'disconnected';
  private audioElement: HTMLAudioElement | null = null;
  private selectedMicrophone: string | null = null;
  private selectedSpeaker: string | null = null;

  constructor(callbacks: WebRtcCallbacks) {
    this.callbacks = callbacks;
  }

  get status(): WebRtcStatus {
    return this._status;
  }

  get isRegistered(): boolean {
    return this._status === 'registered';
  }

  get hasActiveCall(): boolean {
    return this.currentSession !== null &&
      this.currentSession.state !== SessionState.Terminated;
  }

  /** Register to SIP proxy via WebSocket. */
  async register(credentials: WebRtcCredentials, agentId: string): Promise<void> {
    if (this.ua) {
      await this.unregister();
    }

    this.setStatus('connecting');

    try {
      const uri = UserAgent.makeURI(credentials.sipUri);
      if (!uri) throw new Error(`Invalid SIP URI: ${credentials.sipUri}`);

      this.ua = new UserAgent({
        uri,
        transportOptions: {
          server: credentials.wsUri,
        },
        authorizationUsername: agentId,
        authorizationPassword: '', // Kamailio no-auth for internal profile
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: credentials.iceServers.map(s => ({ urls: s.urls })),
          },
        },
        delegate: {
          onInvite: (invitation: Invitation) => {
            this.handleIncomingCall(invitation);
          },
        },
      });

      await this.ua.start();

      this.registerer = new Registerer(this.ua, {
        expires: 300,
      });

      this.registerer.stateChange.addListener((state: RegistererState) => {
        if (state === RegistererState.Registered) {
          this.setStatus('registered');
        } else if (state === RegistererState.Unregistered) {
          this.setStatus('disconnected');
        }
      });

      await this.registerer.register();
    } catch (err) {
      console.error('WebRTC register failed:', err);
      this.setStatus('error');
      throw err;
    }
  }

  /** Unregister and cleanup. */
  async unregister(): Promise<void> {
    try {
      if (this.registerer) {
        await this.registerer.unregister();
      }
      if (this.ua) {
        await this.ua.stop();
      }
    } catch (err) {
      console.error('WebRTC unregister error:', err);
    }
    this.ua = null;
    this.registerer = null;
    this.currentSession = null;
    this.setStatus('disconnected');
  }

  /** Make an outbound call. */
  async makeCall(destination: string, domain: string): Promise<string> {
    if (!this.ua) throw new Error('Not registered');

    const targetUri = UserAgent.makeURI(`sip:${destination}@${domain}`);
    if (!targetUri) throw new Error(`Invalid destination: ${destination}`);

    const inviter = new Inviter(this.ua, targetUri, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });

    this.currentSession = inviter;
    this.setupSessionListeners(inviter, destination);

    await inviter.invite();
    return inviter.id;
  }

  /** Answer an incoming call. */
  async answerCall(): Promise<void> {
    if (!this.currentSession || !(this.currentSession instanceof Invitation)) {
      throw new Error('No incoming call to answer');
    }

    await (this.currentSession as Invitation).accept({
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });
  }

  /** Hang up current call. */
  async hangupCall(): Promise<void> {
    if (!this.currentSession) return;

    const session = this.currentSession;
    switch (session.state) {
      case SessionState.Initial:
      case SessionState.Establishing:
        if (session instanceof Inviter) {
          await session.cancel();
        } else if (session instanceof Invitation) {
          await session.reject();
        }
        break;
      case SessionState.Established:
        await session.bye();
        break;
      default:
        break;
    }
  }

  /** Toggle mute on current call. */
  toggleMute(): boolean {
    if (!this.currentSession) return false;
    const sdh = this.currentSession.sessionDescriptionHandler as any;
    if (!sdh?.peerConnection) return false;

    const senders = sdh.peerConnection.getSenders();
    const audioSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'audio');
    if (audioSender?.track) {
      audioSender.track.enabled = !audioSender.track.enabled;
      return !audioSender.track.enabled; // true = muted
    }
    return false;
  }

  /** Toggle hold (re-INVITE with sendonly/recvonly). */
  async toggleHold(): Promise<boolean> {
    // Simplified hold: mute + pause sending
    return this.toggleMute();
  }

  /* ── Audio device management ─────────────────────── */

  async getAudioDevices(): Promise<{ microphones: MediaDeviceInfo[]; speakers: MediaDeviceInfo[] }> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      microphones: devices.filter(d => d.kind === 'audioinput'),
      speakers: devices.filter(d => d.kind === 'audiooutput'),
    };
  }

  setMicrophone(deviceId: string): void {
    this.selectedMicrophone = deviceId;
  }

  setSpeaker(deviceId: string): void {
    this.selectedSpeaker = deviceId;
    if (this.audioElement && 'setSinkId' in this.audioElement) {
      (this.audioElement as any).setSinkId(deviceId);
    }
  }

  /* ── Private ─────────────────────────────────────── */

  private handleIncomingCall(invitation: Invitation): void {
    this.currentSession = invitation;

    const callerNumber = invitation.remoteIdentity.uri.user || 'Unknown';
    const callerName = invitation.remoteIdentity.displayName || callerNumber;

    this.callbacks.onIncomingCall(invitation.id, callerNumber, callerName);
    this.setupSessionListeners(invitation, callerNumber);
  }

  private setupSessionListeners(session: Inviter | Invitation, remoteId: string): void {
    session.stateChange.addListener((state: SessionState) => {
      switch (state) {
        case SessionState.Established:
          this.attachRemoteAudio(session);
          this.callbacks.onCallAnswered(session.id);
          break;
        case SessionState.Terminated:
          this.cleanupAudio();
          this.callbacks.onCallEnded(session.id);
          this.currentSession = null;
          break;
      }
    });
  }

  private attachRemoteAudio(session: Inviter | Invitation): void {
    const sdh = session.sessionDescriptionHandler as any;
    if (!sdh?.peerConnection) return;

    const remoteStream = new MediaStream();
    sdh.peerConnection.getReceivers().forEach((receiver: RTCRtpReceiver) => {
      if (receiver.track) {
        remoteStream.addTrack(receiver.track);
      }
    });

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.autoplay = true;
    }
    this.audioElement.srcObject = remoteStream;

    if (this.selectedSpeaker && 'setSinkId' in this.audioElement) {
      (this.audioElement as any).setSinkId(this.selectedSpeaker);
    }
  }

  private cleanupAudio(): void {
    if (this.audioElement) {
      this.audioElement.srcObject = null;
    }
  }

  private setStatus(status: WebRtcStatus): void {
    this._status = status;
    this.callbacks.onStatusChange(status);
  }
}
