"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaTopics = void 0;
/** Well-known Kafka topics for the voice channel. */
exports.KafkaTopics = {
    // Agent events
    AGENT_LOGIN: 'agent.login',
    AGENT_LOGOUT: 'agent.logout',
    AGENT_STATUS_CHANGED: 'agent.status_changed',
    AGENT_CREATED: 'agent.created',
    AGENT_STATUS_CHANGED_GOACD: 'agent.status_changed', // From GoACD (claim/release/transition)
    // Interaction events
    INTERACTION_CREATED: 'interaction.created',
    INTERACTION_ASSIGNED: 'interaction.assigned',
    INTERACTION_TRANSFERRED: 'interaction.transferred',
    INTERACTION_CLOSED: 'interaction.closed',
    // Channel events
    CHANNEL_INBOUND: 'channel.inbound',
    CHANNEL_OUTBOUND: 'channel.outbound',
    // CDR events
    CDR_CREATED: 'cdr.created',
    // Call routing/state events (GoACD → CTI Adapter → Frontend)
    CALL_ROUTING: 'call.routing',
    CALL_ANSWERED: 'call.answered',
    CALL_TRANSFERRED: 'call.transferred',
    CALL_ENDED: 'call.ended',
    CALL_AGENT_MISSED: 'call.agent_missed',
    CALL_OUTBOUND_INITIATED: 'call.outbound.initiated',
    CALL_OUTBOUND_RINGING: 'call.outbound.ringing',
    CALL_OUTBOUND_AGENT_ANSWER: 'call.outbound.agent_answer',
    CALL_OUTBOUND_FAILED: 'call.outbound.failed',
    // Notification events
    NOTIFICATION_CREATED: 'notification.created',
};
