/** Base envelope for all Kafka events. */
export interface KafkaEvent<T = unknown> {
    /** Unique event ID (UUID v4). */
    eventId: string;
    /** ISO-8601 timestamp. */
    timestamp: string;
    /** Dot-separated topic (e.g. 'agent.status_changed'). */
    type: string;
    /** Service that produced the event. */
    source: string;
    /** Payload. */
    data: T;
}
/** Well-known Kafka topics for the voice channel. */
export declare const KafkaTopics: {
    readonly AGENT_LOGIN: "agent.login";
    readonly AGENT_LOGOUT: "agent.logout";
    readonly AGENT_STATUS_CHANGED: "agent.status_changed";
    readonly AGENT_CREATED: "agent.created";
    readonly AGENT_STATUS_CHANGED_GOACD: "agent.status_changed";
    readonly INTERACTION_CREATED: "interaction.created";
    readonly INTERACTION_ASSIGNED: "interaction.assigned";
    readonly INTERACTION_TRANSFERRED: "interaction.transferred";
    readonly INTERACTION_CLOSED: "interaction.closed";
    readonly CHANNEL_INBOUND: "channel.inbound";
    readonly CHANNEL_OUTBOUND: "channel.outbound";
    readonly CDR_CREATED: "cdr.created";
    readonly CALL_ROUTING: "call.routing";
    readonly CALL_ANSWERED: "call.answered";
    readonly CALL_TRANSFERRED: "call.transferred";
    readonly CALL_ENDED: "call.ended";
    readonly CALL_AGENT_MISSED: "call.agent_missed";
    readonly CALL_OUTBOUND_INITIATED: "call.outbound.initiated";
    readonly CALL_OUTBOUND_RINGING: "call.outbound.ringing";
    readonly CALL_OUTBOUND_AGENT_ANSWER: "call.outbound.agent_answer";
    readonly CALL_OUTBOUND_FAILED: "call.outbound.failed";
    readonly NOTIFICATION_CREATED: "notification.created";
};
export type KafkaTopic = (typeof KafkaTopics)[keyof typeof KafkaTopics];
