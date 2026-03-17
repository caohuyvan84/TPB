<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.3 ACD/Queue Server — Evaluation & Decision

## 18.3.1 Options Evaluated

| Option | Description | Effort (1 senior dev) |
|---|---|---|
| **A. Custom Go + ESL** | Build ACD from scratch in Go, full ESL control | 25-35 weeks |
| **B. Jambonz + Custom routing** | Use Jambonz (drachtio+FS) as CPaaS layer, build routing as webhook service | 10-15 weeks |
| **C. mod_callcenter + External brain** | Use FreeSWITCH built-in ACD, add external routing intelligence via ESL | 12-18 weeks |
| **D. Kazoo (2600hz)** | Full Erlang/OTP platform with built-in ACD | 4-8 weeks deploy |
| **E. Wazo Platform** | API-first UC platform with agentd | 2-4 weeks deploy |
| **F. CGRateS** | Go-based rating/routing engine | N/A (not an ACD) |

## 18.3.2 Detailed Comparison

| Criterion | A. Custom Go | B. Jambonz | C. mod_callcenter | D. Kazoo | E. Wazo |
|---|---|---|---|---|---|
| **Full routing control** | Yes | Yes (webhook) | Partial (tier-only) | Basic | Basic |
| **Skill-based weighted scoring** | Yes | Yes | No | No | No |
| **Customer affinity routing** | Yes | Yes | No | No | No |
| **IVR media control** | Full (ESL) | Full (verbs) | Dialplan only | Yes | Yes |
| **FS compatible** | Yes | Yes | Native | Yes | **No (Asterisk)** |
| **Kamailio compatible** | Yes | No (drachtio) | Yes | Yes | No |
| **Multi-node clustering** | You design | Redis-based | **No** | Yes (Erlang) | Limited |
| **Team skills required** | Go + telephony | Node.js | FS admin | **Erlang** | Python |
| **Vendor dependency** | None | drachtio project | None | 2600hz (declining) | Wazo Inc |
| **Community** | N/A | Small | Large | **Declining** | Medium |
| **License** | Custom | MIT | MPL | MPL | GPL |

## 18.3.3 Decision: Option A — Custom Go ACD (GoACD)

**Ly do chon Option A thay vi Option B (Jambonz):**

1. **Kamailio compatibility** — User requirement specifies dSIPRouter/Kamailio as SIP proxy. Jambonz uses drachtio (different SIP server), creating architectural conflict. Replacing drachtio with Kamailio in Jambonz is not straightforward.

2. **Full ESL control** — Direct ESL gives lower latency than webhook round-trips. For time-critical operations (no-answer detection, re-routing), ESL's TCP socket is faster than HTTP webhooks.

3. **Single binary deployment** — Go compiles to a single binary. No Node.js runtime, no drachtio, no jambonz-feature-server — fewer moving parts.

4. **Go advantages for ACD** — Goroutines map perfectly to per-call concurrency (1 goroutine per call, thousands concurrent). Low memory footprint. Excellent for real-time systems.

5. **No abstraction tax** — With direct ESL, GoACD has access to ALL FreeSWITCH capabilities without waiting for a middleware layer to add support.

**Ly do khong chon cac options khac:**

- **Option C (mod_callcenter):** No true skill-based routing. Single-node only. Would need so much external logic that the "external brain" becomes a de facto ACD anyway.
- **Option D (Kazoo):** Erlang expertise not available. Community declining. Extreme deployment complexity. ACD module is basic.
- **Option E (Wazo):** Asterisk-only. Incompatible with FreeSWITCH requirement.
- **Option F (CGRateS):** Not an ACD — it's a billing/rating engine. Useful later for CDR rating, but not for call routing.

**Mitigation for high effort (25-35 weeks):**

1. **Phase the build** — Sprint 1.1-1.2: Core ESL + basic queue + round-robin routing. Sprint 1.3-1.4: Skill-based routing + IVR + no-answer handling. Phase 2: Customer affinity, predictive routing.
2. **Use `percipia/eslgo`** — Most mature Go ESL library. Handles connection management, event parsing, command execution.
3. **Reuse Omnichannel components** — Agent state (§8), scoring algorithm (§7.2), queue data structures (§7.3) are already designed. GoACD implements them, not redesigns.
4. **Start with mod_callcenter as scaffolding** — During development, use mod_callcenter for basic queueing while building GoACD. Cut over when GoACD is production-ready.

---

## Related Files

- [18-4-goacd-architecture.md](./18-4-goacd-architecture.md) — GoACD Architecture (module structure, gRPC, protobuf, Redis, concurrency, build)
