<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# 16. Risk Assessment

> **Merged from:** V1 Section 16 + V2 Section 16 updates
> **Voice platform:** Kamailio/dSIPRouter + rtpengine + FreeSWITCH + GoACD (V2 architecture)
> **Last updated:** 2026-03-17

## Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **WebRTC + NAT traversal** — corporate firewalls may block WebRTC | Medium | High | Deploy coturn TURN server from day 1; rtpengine handles SRTP<->RTP transcoding; test in corporate firewall environments; use hosted TURN (Twilio/Xirsys) as fallback |
| R2 | **Social API changes** — Facebook/Zalo/WhatsApp APIs change frequently | Medium | Medium | Abstract behind `IChannelAdapter`; version-pin SDKs; monitor changelog feeds; adapter hot-reload capability |
| R3 | **Redis single point of failure** — all routing depends on Redis | Medium | Critical | Redis Cluster from day 1; Redis Sentinel for auto-failover; PostgreSQL as fallback for agent state recovery |
| R4 | **Kafka operational complexity** — new to team | Medium | Medium | Start with single-broker Docker; graduate to cluster only for production; use managed Kafka if available |
| R5 | **Email OAuth token refresh** — Gmail/MS365 tokens expire | Medium | High | Implement robust token refresh with retry; alert on refresh failure; store refresh tokens encrypted |
| R6 | **Flow designer state persistence** — chat flows that span hours | Low | Medium | Redis-backed state with PostgreSQL fallback; TTL-based cleanup; resume-on-reconnect |
| R7 | **Multi-tenant data isolation** — all services shared | Medium | Critical | Tenant ID on every entity; RLS in PostgreSQL; Redis key prefix per tenant; strict query scoping |
| R8 | **WebSocket scaling** — 10k+ concurrent connections | Medium | High | Socket.IO Redis adapter; horizontal gateway instances; connection load balancing |
| R9 | **Zalo API access** — requires business verification in Vietnam | Medium | Medium | Start Zalo OA verification process immediately (can take 2-4 weeks); develop against sandbox |
| R10 | **Scope creep** — 17 requirements is ambitious for 24 weeks | High | High | Strict phase gates; MVP-first for each channel (text only before rich media); voice platform in Phase 1, other adapters deferred to later phases |
| R11 | **GoACD development effort** — 25-35 weeks is significant | High | High | Phase the build (basic -> advanced); start with mod_callcenter as scaffolding during development; hire Go developer with telephony experience |
| R12 | **Kamailio + FreeSWITCH operational complexity** — 4 components vs 1 PBX | Medium | Medium | Docker Compose for dev; Ansible/Terraform for production; document all config; dSIPRouter GUI reduces Kamailio config complexity |
| R13 | **rtpengine kernel module** — requires host networking, kernel access | Medium | Medium | Test on target Linux kernel (Debian 12+); fallback to userspace mode if kernel module fails; works on Docker with `--network host` |
| R14 | **ESL reliability** — FreeSWITCH ESL connection may drop | Low | High | Auto-reconnect logic in GoACD; inbound ESL watchdog; FS process monitor; calls in progress survive brief ESL disconnects |
| R15 | **Go team expertise** — team may not have Go developers | Medium | High | GoACD is isolated service — can hire/contract Go developer; NestJS team does not need Go knowledge; GoACD communicates via gRPC (language-agnostic) |
| R16 | **FreeSWITCH ESL undocumented quirks** — edge cases in call handling | Medium | Medium | Extensive integration testing; subscribe to FreeSWITCH mailing list; maintain ESL command reference doc; Phase 1 starts simple (basic queue) |

## Risk Categorization

### Critical Impact (R3, R7)

These risks threaten system-wide availability or data integrity. Both require infrastructure-level mitigation from day 1:

- **R3 (Redis SPOF):** Redis Cluster with Sentinel is non-negotiable. Agent state recovery from PostgreSQL must be tested in DR scenarios.
- **R7 (Multi-tenant isolation):** RLS policies must be enforced at the database level. Redis key prefixing and query scoping must be validated via integration tests.

### High Impact (R1, R5, R8, R10, R11, R14, R15)

These risks can cause significant delays or feature degradation:

- **R1 (WebRTC/NAT):** The Kamailio + rtpengine stack provides proven NAT traversal. The coturn TURN server handles edge cases. Test early in target network environments.
- **R11 (GoACD effort):** The single largest project risk. Mitigation: phased delivery (basic ACD in Sprint 1.2-1.3, advanced features in later phases), use mod_callcenter as interim scaffolding.
- **R14 (ESL reliability):** Low probability but high impact. GoACD must implement robust reconnection with call state recovery. FreeSWITCH process monitoring is essential.
- **R15 (Go expertise):** GoACD is architecturally isolated behind gRPC. A dedicated Go developer (hire or contract) can work independently from the NestJS team.

### Medium Impact (R2, R4, R6, R9, R12, R13, R16)

These risks are manageable with standard engineering practices:

- **R12 (Operational complexity):** Mitigated by dSIPRouter GUI for Kamailio, Docker Compose for dev, and thorough documentation.
- **R13 (rtpengine kernel module):** Userspace fallback ensures functionality even if kernel module is unavailable, at the cost of slightly higher CPU usage.
- **R16 (ESL quirks):** Integration tests and community resources (FreeSWITCH mailing list, wiki) provide coverage.

---

## Related Files

- [15-implementation-plan.md](./15-implementation-plan.md) — the phased plan that these risks apply to
- [Voice Platform Architecture](./18-voice-platform/) — detailed design for the Kamailio/FreeSWITCH/GoACD stack
- [appendix/appendix-c-v1-v2-comparison.md](./appendix/appendix-c-v1-v2-comparison.md) — V1 vs V2 architecture comparison matrix
