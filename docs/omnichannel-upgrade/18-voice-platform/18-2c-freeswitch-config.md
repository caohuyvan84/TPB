<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

### 18.2C Detailed Configuration — FreeSWITCH

#### 18.2C.1 Module Loading (modules.conf.xml)

```xml
<!-- /etc/freeswitch/autoload_configs/modules.conf.xml -->
<configuration name="modules.conf" description="Modules">
  <modules>
    <!-- ── Core ── -->
    <load module="mod_console"/>
    <load module="mod_logfile"/>
    <load module="mod_event_socket"/>      <!-- ESL — CRITICAL for GoACD -->
    <load module="mod_commands"/>
    <load module="mod_dptools"/>           <!-- Dialplan tools: bridge, park, etc. -->
    <load module="mod_dialplan_xml"/>

    <!-- ── SIP ── -->
    <load module="mod_sofia"/>             <!-- SIP UA -->

    <!-- ── Media / Codecs ── -->
    <load module="mod_spandsp"/>           <!-- T.38, tone detect -->
    <load module="mod_sndfile"/>           <!-- WAV file playback/recording -->
    <load module="mod_native_file"/>       <!-- Native FS file format -->
    <load module="mod_tone_stream"/>       <!-- Tone generation (ringback, etc.) -->
    <load module="mod_local_stream"/>      <!-- Music on Hold streaming -->
    <load module="mod_shout"/>             <!-- MP3 playback (optional: HTTP streams) -->

    <!-- ── DTMF ── -->
    <load module="mod_dtmf"/>              <!-- DTMF detection/generation -->

    <!-- ── Recording ── -->
    <load module="mod_rec"/>               <!-- Call recording -->

    <!-- ── Conference ── -->
    <load module="mod_conference"/>         <!-- 3-way calls, supervisor barge -->

    <!-- ── TTS (Phase 2+) ── -->
    <!-- <load module="mod_tts_commandline"/> -->

    <!-- ── ASR/AI (Phase 4) ── -->
    <!-- <load module="mod_audio_fork"/>   WebSocket audio streaming to AI -->

    <!-- ── Disable unnecessary modules ── -->
    <!-- DO NOT load these (security + performance): -->
    <!-- mod_voicemail, mod_fifo, mod_callcenter (GoACD replaces this),
         mod_verto (using rtpengine instead), mod_signalwire,
         mod_httapi (GoACD handles HTTP calls directly) -->
  </modules>
</configuration>
```

#### 18.2C.2 Event Socket (ESL) Configuration

```xml
<!-- /etc/freeswitch/autoload_configs/event_socket.conf.xml -->
<configuration name="event_socket.conf" description="Socket Client">
  <settings>
    <!-- Inbound ESL: GoACD connects here for monitoring -->
    <param name="nat-map" value="false"/>
    <param name="listen-ip" value="0.0.0.0"/>       <!-- Bind all interfaces -->
    <param name="listen-port" value="8021"/>
    <param name="password" value="FS_ESL_PASSWORD"/>

    <!-- ACL: Only allow GoACD instances to connect -->
    <param name="apply-inbound-acl" value="goacd"/>

    <!-- Event flow control -->
    <param name="stop-on-bind-error" value="true"/>
  </settings>
</configuration>
```

#### 18.2C.3 SIP Profiles

```xml
<!-- /etc/freeswitch/sip_profiles/internal.xml -->
<!-- Internal profile: receives calls FROM Kamailio (agent/trunk traffic) -->
<profile name="internal">
  <settings>
    <param name="sip-ip" value="$${local_ip_v4}"/>
    <param name="sip-port" value="5080"/>
    <param name="rtp-ip" value="$${local_ip_v4}"/>

    <!-- Codec preferences (§18.10): PCMA first for Vietnam carriers -->
    <param name="codec-prefs" value="PCMA,PCMU,opus@48000h@20i@1c"/>
    <param name="inbound-codec-negotiation" value="generous"/>

    <!-- DTMF (§18.14.5) -->
    <param name="dtmf-type" value="rfc2833"/>
    <param name="liberal-dtmf" value="true"/>
    <param name="rfc2833-pt" value="101"/>
    <param name="pass-rfc2833" value="true"/>

    <!-- NAT -->
    <param name="ext-rtp-ip" value="$${local_ip_v4}"/>
    <param name="ext-sip-ip" value="$${local_ip_v4}"/>
    <param name="aggressive-nat-detection" value="false"/>  <!-- Kamailio handles NAT -->
    <param name="NDLB-received-in-nat-reg-contact" value="true"/>

    <!-- Timing -->
    <param name="rtp-timeout-sec" value="60"/>           <!-- No RTP for 60s → hangup -->
    <param name="rtp-hold-timeout-sec" value="3600"/>    <!-- Hold can last 1 hour -->

    <!-- Security -->
    <param name="apply-inbound-acl" value="kamailio"/>   <!-- Only accept from Kamailio IPs -->
    <param name="auth-calls" value="false"/>             <!-- Kamailio already authenticated -->
    <param name="log-auth-failures" value="true"/>

    <!-- Dialplan -->
    <param name="context" value="public"/>               <!-- Route to public context → GoACD -->

    <!-- Recording -->
    <param name="record-path" value="/recordings"/>
    <param name="record-template" value="${strftime(%Y-%m-%d)}/${uuid}.wav"/>

    <!-- Misc -->
    <param name="manage-presence" value="false"/>         <!-- No presence — Kamailio handles -->
    <param name="manage-shared-appearance" value="false"/>
    <param name="disable-register" value="true"/>         <!-- No registration on FS — Kamailio handles -->

    <!-- TLS (optional: for Kamailio → FS if TLS desired internally) -->
    <!-- <param name="tls" value="true"/> -->
    <!-- <param name="tls-cert-dir" value="/etc/freeswitch/tls/"/> -->
  </settings>
</profile>

<!-- /etc/freeswitch/sip_profiles/external.xml -->
<!-- External profile: for direct trunk connections (if any bypass Kamailio) -->
<profile name="external">
  <settings>
    <param name="sip-ip" value="$${local_ip_v4}"/>
    <param name="sip-port" value="5060"/>
    <param name="rtp-ip" value="$${local_ip_v4}"/>

    <!-- Force G.711a for PSTN (§18.10) -->
    <param name="codec-prefs" value="PCMA,PCMU"/>

    <param name="dtmf-type" value="rfc2833"/>
    <param name="context" value="public"/>
    <param name="auth-calls" value="false"/>
    <param name="apply-inbound-acl" value="trusted_trunks"/>
    <param name="disable-register" value="true"/>
  </settings>
</profile>
```

#### 18.2C.4 ACL Configuration

```xml
<!-- /etc/freeswitch/autoload_configs/acl.conf.xml -->
<configuration name="acl.conf" description="Network Lists">
  <network-lists>
    <!-- GoACD instances (allowed to connect via ESL) -->
    <list name="goacd" default="deny">
      <node type="allow" cidr="10.0.0.0/8"/>        <!-- Docker network -->
      <node type="allow" cidr="172.16.0.0/12"/>      <!-- Docker bridge -->
      <node type="allow" cidr="GOACD_HOST_IP/32"/>   <!-- Specific GoACD host (production) -->
    </list>

    <!-- Kamailio (allowed to send SIP) -->
    <list name="kamailio" default="deny">
      <node type="allow" cidr="10.0.0.0/8"/>
      <node type="allow" cidr="172.16.0.0/12"/>
      <node type="allow" cidr="nextgen.omicx.vn/32"/>
      <node type="allow" cidr="KAMAILIO_VIP/32"/>
    </list>

    <!-- Trusted trunks (for external profile) -->
    <list name="trusted_trunks" default="deny">
      <node type="allow" cidr="TRUNK_IP_1/32"/>
      <node type="allow" cidr="TRUNK_IP_2/32"/>
    </list>
  </network-lists>
</configuration>
```

#### 18.2C.5 Switch Configuration (Performance Tuning)

```xml
<!-- /etc/freeswitch/autoload_configs/switch.conf.xml -->
<configuration name="switch.conf" description="Core Configuration">
  <settings>
    <!-- ── Session Limits ── -->
    <param name="max-sessions" value="3000"/>             <!-- Max concurrent calls -->
    <param name="sessions-per-second" value="100"/>       <!-- Max new calls/sec -->
    <param name="rtp-start-port" value="16384"/>
    <param name="rtp-end-port" value="32768"/>

    <!-- ── DTMF (§18.14.5) ── -->
    <param name="rtp-digit-delay" value="40"/>

    <!-- ── Logging ── -->
    <param name="loglevel" value="warning"/>              <!-- Production: warning -->
    <param name="colorize-console" value="false"/>
    <param name="max-log-file-size" value="209715200"/>   <!-- 200MB log file max -->
    <param name="log-file-rotation-count" value="5"/>     <!-- Keep 5 rotated files -->

    <!-- ── Core Dumps (debugging) ── -->
    <param name="core-db-dsn" value=""/>                  <!-- Disable core DB (not needed) -->
    <param name="dump-cores" value="true"/>

    <!-- ── Timing ── -->
    <param name="rtp-timer-name" value="soft"/>
    <param name="min-idle-cpu" value="5"/>                <!-- Refuse new calls if CPU < 5% idle -->

    <!-- ── Internal Event System ── -->
    <param name="max-db-handles" value="50"/>
    <param name="db-handle-timeout" value="10"/>
  </settings>
</configuration>
```

#### 18.2C.6 Local Stream — Music on Hold

```xml
<!-- /etc/freeswitch/autoload_configs/local_stream.conf.xml -->
<configuration name="local_stream.conf" description="Music on Hold">
  <directory name="moh_default" path="/audio/moh/default">
    <param name="rate" value="8000"/>                <!-- 8kHz for G.711 compatibility -->
    <param name="channels" value="1"/>               <!-- Mono -->
    <param name="interval" value="20"/>              <!-- 20ms frames -->
    <param name="timer-name" value="soft"/>
    <param name="shuffle" value="true"/>             <!-- Random order -->
  </directory>

  <directory name="moh_premium" path="/audio/moh/premium">
    <param name="rate" value="8000"/>
    <param name="channels" value="1"/>
    <param name="shuffle" value="true"/>
  </directory>

  <!-- Usage in GoACD:
       session.SendESL("playback", "local_stream://moh_default", false)
       Queue config can specify different MOH streams per queue:
         queue.moh_stream = "moh_premium" for VIP queue
  -->
</configuration>
```

**Audio file preparation:**

```bash
# Convert audio files to FreeSWITCH-optimized format
# Input: any format (MP3, WAV, OGG)
# Output: 8kHz, 16-bit, mono, WAV (PCM alaw for PCMA)

# IVR prompts (PCMA for zero-transcode with PSTN)
sox input.wav -r 8000 -c 1 -e a-law /audio/vi/welcome.wav

# MOH (same format)
for f in /audio/moh/raw/*.mp3; do
    sox "$f" -r 8000 -c 1 -e a-law "/audio/moh/default/$(basename ${f%.mp3}.wav)"
done

# Verify format
soxi /audio/vi/welcome.wav
# Channels:      1
# Sample Rate:   8000
# Encoding:      A-law
```

#### 18.2C.7 Recording Configuration

```xml
<!-- Recording is controlled by GoACD via ESL, not FreeSWITCH config.
     But FreeSWITCH needs these settings for recording to work properly. -->

<!-- /etc/freeswitch/autoload_configs/switch.conf.xml (recording-related) -->
<!-- Already covered in §18.2C.5 -->

<!-- Recording path structure (controlled by GoACD):
     /recordings/{YYYY-MM-DD}/{interaction_id}.wav

     GoACD ESL command:
       record_session /recordings/2026-03-17/abc-123.wav

     Format: WAV, 8kHz, mono, PCM (standard for telephony compliance)
     GoACD ensures compliance recording rules:
       - Both legs recorded (caller + agent mixed)
       - Recording starts on bridge, stops on hangup
       - Recording announcement played to caller (if required by law)
-->
```

#### 18.2C.8 FreeSWITCH Directory (Agent SIP Accounts)

```xml
<!-- /etc/freeswitch/directory/default.xml -->
<!-- Agent SIP accounts are NOT manually configured in FreeSWITCH.
     V2.2: Agent auth uses ephemeral HMAC tokens (auth_ephemeral on Kamailio).
     No subscriber table entry needed per agent. Kamailio validates via shared secret.
     FreeSWITCH does NOT handle agent registration (§18.2.3: disable-register=true).

     However, FreeSWITCH needs a "catch-all" user for bridge commands:
-->
<domain name="$${domain}">
  <params>
    <param name="dial-string" value="{^^:sip_invite_domain=${dialed_domain}:presence_id=${dialed_user}@${dialed_domain}}${sofia_contact(*/${dialed_user}@${dialed_domain})}"/>
  </params>

  <!-- No individual user entries needed.
       FreeSWITCH bridges to Kamailio, which resolves agent location.

       GoACD bridge command:
         bridge sofia/internal/1007@nextgen.omicx.vn

       FreeSWITCH sends INVITE to Kamailio (via internal profile)
       → Kamailio looks up 1007 in usrloc → forwards to agent's WebSocket

       This is why FreeSWITCH doesn't need per-agent config.
  -->
</domain>
```

#### 18.2C.9 FreeSWITCH HA (Pool Behind Kamailio)

```
FreeSWITCH does NOT cluster or share state between instances.
Each FS instance is independent. HA is achieved by:

1. Multiple FS instances behind Kamailio dispatcher
2. Kamailio health-probes each FS every 5s (SIP OPTIONS)
3. If FS fails probe 3x → removed from pool → no new calls routed there
4. Active calls on failed FS → LOST (FS has no HA for active media)
   → GoACD detects ESL connection drop → marks calls as "interrupted"
   → Agents get notification, CDR preserved from GoACD snapshot
5. Recovery: FS restarts → passes health probe 5x → added back to pool

Mitigation for FS crash:
  • GoACD snapshots active calls every 2s (§18.13.1)
  • CDR data preserved in Redis + GoACD memory
  • Recording file: if FS crashes mid-recording, partial file is preserved
    → Recording sync pipeline marks it as "partial" with actual file size
  • Probability: FS crashes are rare with proper resource allocation (§18.14.4)

Architecture:
  ┌──────────────┐
  │   Kamailio   │
  │  dispatcher  │
  └──────┬───────┘
         │ SIP INVITE (round-robin)
    ┌────┼────┐
    │         │
  ┌─▼──┐  ┌──▼─┐
  │FS-1│  │FS-2│    Each: max 2,000 concurrent calls
  └─┬──┘  └──┬─┘    Total capacity: 4,000 concurrent calls
    │         │
    │  ESL    │ ESL
    │         │
  ┌─▼─────────▼─┐
  │   GoACD     │    Single leader manages both FS instances
  │  (leader)   │    via inbound ESL connections
  └─────────────┘
```

#### 18.2C.10 FreeSWITCH Logging Configuration

```xml
<!-- /etc/freeswitch/autoload_configs/logfile.conf.xml -->
<configuration name="logfile.conf" description="File Logging">
  <settings>
    <param name="rotate-on-hup" value="true"/>
  </settings>
  <profiles>
    <profile name="default">
      <settings>
        <param name="logfile" value="/var/log/freeswitch/freeswitch.log"/>
        <param name="rollover" value="209715200"/>     <!-- 200MB -->
        <param name="maximum-rotate" value="5"/>
      </settings>
      <mappings>
        <!-- Production: WARNING and above only -->
        <map name="all" value="warning,err,crit,alert"/>

        <!-- Debug ESL events (enable temporarily for troubleshooting) -->
        <!-- <map name="all" value="debug,info,notice,warning,err,crit,alert"/> -->
      </mappings>
    </profile>
  </profiles>
</configuration>
```

#### 18.2C.11 Comprehensive Dialplan

```xml
<!-- /etc/freeswitch/dialplan/public.xml -->
<!-- All traffic from Kamailio enters here -->
<context name="public">

  <!-- ── ACL: Only accept from Kamailio ── -->
  <extension name="acl_check" continue="true">
    <condition field="${network_addr}" expression="^(nextgen.omicx.vn|KAMAILIO_VIP|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+)$" break="on-false">
      <!-- Passed ACL -->
      <action application="log" data="INFO Accepted call from ${network_addr}: ${caller_id_number} → ${destination_number}"/>
    </condition>
    <anti-action application="log" data="WARNING Rejected call from unauthorized IP: ${network_addr}"/>
    <anti-action application="respond" data="403 Forbidden"/>
  </extension>

  <!-- ── Set global variables for GoACD ── -->
  <extension name="set_vars" continue="true">
    <condition>
      <action application="set" data="hangup_after_bridge=true"/>
      <action application="set" data="continue_on_fail=false"/>
      <action application="set" data="record_stereo=false"/>
    </condition>
  </extension>

  <!-- ── Route ALL calls to GoACD via outbound ESL ── -->
  <extension name="route_to_goacd">
    <condition field="destination_number" expression="^(.+)$">
      <action application="socket" data="goacd-vip:9090 async full"/>
    </condition>
  </extension>

</context>

<!-- /etc/freeswitch/dialplan/default.xml -->
<!-- Internal context (if needed for special routing) -->
<context name="default">

  <!-- Internal agent-to-agent calls also go through GoACD -->
  <extension name="internal_to_goacd">
    <condition field="destination_number" expression="^(\d{4})$">
      <action application="socket" data="goacd-vip:9090 async full"/>
    </condition>
  </extension>

  <!-- Voicemail deposit (from GoACD overflow handler) -->
  <extension name="voicemail">
    <condition field="destination_number" expression="^voicemail-(\d+)$">
      <action application="answer"/>
      <action application="playback" data="/audio/vi/voicemail_prompt.wav"/>
      <action application="set" data="record_waste_resources=true"/>
      <action application="record" data="/recordings/voicemail/${strftime(%Y-%m-%d)}/$1_${uuid}.wav 120 5"/>
      <action application="hangup"/>
    </condition>
  </extension>

  <!-- Park (used during attended transfer consultation) -->
  <extension name="park">
    <condition field="destination_number" expression="^park$">
      <action application="park"/>
    </condition>
  </extension>

</context>
```

---

### Related Files

- [18-voice-platform/README.md](README.md) — Section 18 overview and navigation
- [OMNICHANNEL-UPGRADE-PLAN-V2.md](../../../OMNICHANNEL-UPGRADE-PLAN-V2.md) — Full upgrade plan (source document)
- Section 18.2C is referenced by:
  - **18.2.4 GoACD Server** — Uses ESL configuration from 18.2C.2 and dialplan from 18.2C.11
  - **18.4 GoACD Architecture** — ESL connection management depends on 18.2C.2 settings
  - **18.10 Codec Configuration** — Codec preferences defined in 18.2C.3 SIP Profiles
  - **18.13.1 Call Snapshots** — HA strategy described in 18.2C.9
  - **18.14.4 Resource Allocation** — Performance tuning in 18.2C.5
  - **18.14.5 DTMF** — DTMF settings in 18.2C.3 and 18.2C.5
