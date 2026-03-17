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
		RESTPort:      envInt("GOACD_REST_PORT", 9092),
		RedisURL:      envStr("GOACD_REDIS_URL", "redis://localhost:6379"),
		KafkaBrokers:  strings.Split(envStr("GOACD_KAFKA_BROKERS", "localhost:9092"), ","),
		PGURL:         envStr("GOACD_PG_URL", "postgres://goacd:goacd@localhost:5432/goacd"),
		SIPDomain:     envStr("GOACD_SIP_DOMAIN", "nextgen.omicx.vn"),
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
