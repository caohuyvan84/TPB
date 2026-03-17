-- AGENT_CLAIM: Atomically claim an agent for a call
-- KEYS[1] = agent hash key (e.g. agent:state:{agentId})
-- KEYS[2] = available set key (e.g. agent:available:voice)
-- ARGV[1] = agentId
-- ARGV[2] = new status (e.g. "ringing")
-- ARGV[3] = interactionId
-- ARGV[4] = channel (e.g. "voice")
-- Returns: 1 if claimed, 0 if agent not available

local hashKey = KEYS[1]
local availableKey = KEYS[2]

local currentStatus = redis.call('HGET', hashKey, 'status')
if currentStatus ~= 'ready' then
  return 0
end

-- Check capacity for channel
local capacityKey = ARGV[4] .. '_count'
local currentCount = tonumber(redis.call('HGET', hashKey, capacityKey) or '0')
local maxCapacity = tonumber(redis.call('HGET', hashKey, ARGV[4] .. '_max') or '1')
if currentCount >= maxCapacity then
  return 0
end

-- Claim: update status, increment channel count, set interaction
redis.call('HSET', hashKey, 'status', ARGV[2])
redis.call('HSET', hashKey, 'current_interaction', ARGV[3])
redis.call('HSET', hashKey, 'status_changed_at', redis.call('TIME')[1])
redis.call('HINCRBY', hashKey, capacityKey, 1)

-- Remove from available set
redis.call('SREM', availableKey, ARGV[1])

return 1
