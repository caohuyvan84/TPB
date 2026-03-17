<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.10 WebRTC Integration

**Architecture:** SIP.js in browser → Kamailio WSS → rtpengine (media) → FreeSWITCH

```
┌──────────────────────────────────────────────────────┐
│ Agent Desktop (Browser)                               │
│                                                       │
│  SIP.js UserAgent                                     │
│    │ WSS (port 5066)                                  │
│    │ SIP signaling over WebSocket                     │
│    ▼                                                  │
│  Kamailio (dSIPRouter)                                │
│    │ SIP routing                                      │
│    │ websocket module: SIP-over-WSS ↔ SIP-over-UDP    │
│    ▼                                                  │
│  rtpengine                                            │
│    │ Media relay                                      │
│    │ SRTP (browser) ↔ RTP (FreeSWITCH)               │
│    │ ICE negotiation (browser side)                   │
│    │ DTLS-SRTP ↔ SDES-SRTP                           │
│    │ Opus ↔ PCMU/PCMA transcoding                    │
│    ▼                                                  │
│  FreeSWITCH                                           │
│    RTP media processing                               │
│    Recording, conferencing, etc.                      │
│                                                       │
│  coturn (TURN server)                                 │
│    NAT traversal for corporate firewalls              │
└──────────────────────────────────────────────────────┘
```

## Credential Provisioning (V2.2 — Ephemeral Tokens)

```typescript
// GET /cti/webrtc/credentials
// CTI Adapter → GoACD (gRPC) → return ephemeral SIP credentials
{
  "wsUri": "wss://nextgen.omicx.vn:5066",
  "sipUri": "sip:1007@nextgen.omicx.vn",
  "authorizationUser": "1710500300:1007",    // ephemeral: "<expiry>:<extension>"
  "password": "a3F5dWJhbmsrY...",            // HMAC-SHA1 token (5min TTL)
  "displayName": "Nguyễn Văn Agent",
  "extension": "1007",                       // bare extension for display/routing
  "tokenExpiresAt": 1710500300,              // client knows expiry for refresh scheduling
  "iceServers": [
    { "urls": "stun:stun.nextgen.omicx.vn:3478" },
    { "urls": "turn:turn.nextgen.omicx.vn:3478", "username": "<temp>", "credential": "<temp>" }
  ]
}
```

## SIP.js Configuration (Agent Desktop — V2.2 with Token Refresh)

```typescript
// Initial SIP.js setup with ephemeral credentials
let currentCredentials = await fetchSIPCredentials(); // GET /cti/webrtc/credentials

const userAgent = new UserAgent({
  uri: UserAgent.makeURI(`sip:${currentCredentials.extension}@nextgen.omicx.vn`),
  transportOptions: {
    server: currentCredentials.wsUri,
  },
  authorizationUsername: currentCredentials.authorizationUser,  // "<expiry>:<ext>"
  authorizationPassword: currentCredentials.password,           // HMAC token
  sessionDescriptionHandlerFactoryOptions: {
    peerConnectionConfiguration: {
      iceServers: currentCredentials.iceServers,
    },
  },
  register: true,
  registerExpires: 30,  // V2.1: 30s re-REGISTER interval (tightened from 60s, see §18.7.3)
});

// V2.2: Listen for token refresh events from GoACD via WebSocket
// GoACD pushes new tokens every 25s (before the 30s re-REGISTER cycle)
wsClient.on('sip_token_refresh', (data: { username: string; password: string; tokenExpiresAt: number }) => {
  // Update SIP.js registerer credentials for next re-REGISTER
  const registerer = userAgent.registerer;
  if (registerer) {
    registerer.dispose(); // stop current registration
    const newRegisterer = new Registerer(userAgent, {
      expires: 30,
      extraHeaders: [],
    });
    // Update UA auth credentials
    (userAgent as any).options.authorizationUsername = data.username;
    (userAgent as any).options.authorizationPassword = data.password;
    newRegisterer.register();
  }
  currentCredentials.authorizationUser = data.username;
  currentCredentials.password = data.password;
  currentCredentials.tokenExpiresAt = data.tokenExpiresAt;
});

// V2.1: ICE restart on network change (WiFi → LAN, VPN reconnect)
// Without this, agent loses audio when switching networks
navigator.connection?.addEventListener('change', () => {
  const activeSession = sipUserAgent.sessions[0];
  if (activeSession?.state === SessionState.Established) {
    const sdh = activeSession.sessionDescriptionHandler as Web.SessionDescriptionHandler;
    sdh.peerConnection?.restartIce();
    activeSession.invite({ requestDelegate: { onAccept: () => console.log('ICE restarted') }});
  }
});
```

## Codec Preference (Vietnam Carrier Compatibility)

**V2.1: Codec preference for Vietnam PSTN carriers:**

```xml
<!-- FreeSWITCH: /etc/freeswitch/sip_profiles/internal.xml -->
<!-- PCMA (G.711 alaw) preferred for Vietnam PSTN carriers -->
<!-- Opus for WebRTC agents, transcoding handled by rtpengine -->
<param name="codec-prefs" value="PCMA,PCMU,opus@48000h@20i@1c"/>

<!-- External (trunk) profile: force G.711a for PSTN -->
<!-- /etc/freeswitch/sip_profiles/external.xml -->
<param name="codec-prefs" value="PCMA,PCMU"/>
```

```
# rtpengine: codec negotiation
# Browser offers Opus → rtpengine transcodes to PCMA for FS/PSTN
# FS offers PCMA → rtpengine transcodes to Opus for browser
# This happens in kernel-space, low latency
```

## Security Protocols

| Protocol | Role | Details |
|---|---|---|
| **DTLS-SRTP** | Browser media encryption | Mandatory for WebRTC; rtpengine terminates DTLS and re-encrypts as SDES-SRTP toward FreeSWITCH |
| **ICE** | NAT traversal | STUN for direct connectivity testing; TURN fallback for restrictive corporate firewalls |
| **TURN** | Relay | coturn server provides relay when direct peer connection fails; ephemeral TURN credentials |
| **WSS** | SIP signaling transport | TLS-encrypted WebSocket (port 5066) between SIP.js and Kamailio |

## Connectivity Testing

- **ICE candidates gathered** by SIP.js via STUN/TURN servers
- **Network change detection** via `navigator.connection` API triggers ICE restart
- **Re-REGISTER interval** set to 30s for fast disconnect detection (§18.7.3)
- **Token refresh** every 25s ensures credentials are always valid before re-REGISTER

---

## Related Files

- [18-9-sync-architecture.md](./18-9-sync-architecture.md) — Sync Architecture (SIP credential generation, ephemeral token flow)
- [18-8-routing-failure.md](./18-8-routing-failure.md) — Call Routing Engine (call delivery to SIP.js agent)
- [18-11-event-pipeline.md](./18-11-event-pipeline.md) — Real-time Event Pipeline (call metadata pushed before SIP INVITE)
- [18-12-data-mapping.md](./18-12-data-mapping.md) — Data Mapping Tables (agent extension mapping)
