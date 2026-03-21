package esl

// ESLClient is the interface for ESL inbound operations.
// Implemented by both InboundClient (single connection) and InboundPool (connection pool).
type ESLClient interface {
	API(cmd string) (string, error)
	BGApi(cmd string) (string, error)
	Originate(dest, callerID, context, extension string) (string, error)
	UUIDBridge(uuid1, uuid2 string) (string, error)
	UUIDKill(uuid, cause string) (string, error)
	OriginateWithUUID(uuid, dialString, app, appArg string) (string, error)
	UUIDExists(uuid string) (bool, error)
	UUIDGetVar(uuid, varName string) (string, error)
	Subscribe(events string) (string, error)
	Host() string
	IsConnected() bool
	Close() error
}
