package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	InstanceID string

	// FreeSWITCH ESL
	FSESLHosts    []string // comma-separated host:port pairs
	FSESLPassword string

	// ESL outbound server
	ESLListenPort int

	// gRPC
	GRPCPort int

	// REST
	RESTPort int

	// Redis
	RedisURL string

	// Kafka
	KafkaBrokers []string

	// PostgreSQL
	PGURL string

	// SIP domain
	SIPDomain string

	// TURN server
	TURNSecret string
	TURNTTL    int

	// SIP ephemeral auth (shared secret with Kamailio auth_ephemeral)
	SIPAuthSecret string
	SIPAuthTTL    int // seconds, default 300 (5 min)

	// PSTN Gateway (FreeSWITCH gateway name for outbound PSTN calls)
	PSTNGateway string

	// Extension range
	ExtRangeStart int
	ExtRangeEnd   int
}

func Load() *Config {
	return &Config{
		InstanceID:    envStr("GOACD_INSTANCE_ID", "goacd-1"),
		FSESLHosts:    strings.Split(envStr("GOACD_FS_ESL_HOSTS", "localhost:8021"), ","),
		FSESLPassword: envStr("GOACD_FS_ESL_PASSWORD", "TestVoice2026!"),
		ESLListenPort: envInt("GOACD_ESL_LISTEN_PORT", 9090),
		GRPCPort:      envInt("GOACD_GRPC_PORT", 9091),
		RESTPort:      envInt("GOACD_REST_PORT", 9093),
		RedisURL:      envStr("GOACD_REDIS_URL", "redis://localhost:6379"),
		KafkaBrokers:  strings.Split(envStr("GOACD_KAFKA_BROKERS", "localhost:9092"), ","),
		PGURL:         envStr("GOACD_PG_URL", "postgres://goacd:goacd@localhost:5432/goacd"),
		SIPDomain:     envStr("GOACD_SIP_DOMAIN", "nextgen.omicx.vn"),
		TURNSecret:    envStr("GOACD_TURN_SECRET", "466f03791a44b531c5129724e50af31a4043e69bdccc741d"),
		TURNTTL:       envInt("GOACD_TURN_TTL", 86400),
		SIPAuthSecret: envStr("GOACD_SIP_AUTH_SECRET", "tpb_sip_ephemeral_secret_2026"),
		SIPAuthTTL:    envInt("GOACD_SIP_AUTH_TTL", 300),
		PSTNGateway:   envStr("GOACD_PSTN_GATEWAY", ""),
		ExtRangeStart: envInt("GOACD_EXT_RANGE_START", 1000),
		ExtRangeEnd:   envInt("GOACD_EXT_RANGE_END", 9999),
	}
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
