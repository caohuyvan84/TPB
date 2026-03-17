-- AGENT_RELEASE: Atomically release an agent after a call
-- KEYS[1] = agent hash key (e.g. agent:state:{agentId})
-- KEYS[2] = available set key (e.g. agent:available:voice)
-- ARGV[1] = agentId
-- ARGV[2] = new status (e.g. "ready" or "acw")
-- ARGV[3] = channel (e.g. "voice")
-- Returns: 1 if released

local hashKey = KEYS[1]
local availableKey = KEYS[2]

-- Decrement channel count
local capacityKey = ARGV[3] .. '_count'
local currentCount = tonumber(redis.call('HGET', hashKey, capacityKey) or '0')
if currentCount > 0 then
  redis.call('HINCRBY', hashKey, capacityKey, -1)
end

-- Clear current interaction
redis.call('HDEL', hashKey, 'current_interaction')

-- Update status
redis.call('HSET', hashKey, 'status', ARGV[2])
redis.call('HSET', hashKey, 'status_changed_at', redis.call('TIME')[1])

-- If status is ready, add back to available set
if ARGV[2] == 'ready' then
  redis.call('SADD', availableKey, ARGV[1])
end

return 1
