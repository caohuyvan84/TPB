-- Agent Service Database Schema

-- Create agent_profiles table
CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id VARCHAR UNIQUE NOT NULL,
  display_name VARCHAR NOT NULL,
  department VARCHAR,
  team VARCHAR,
  skills JSONB DEFAULT '[]',
  max_concurrent_chats INTEGER DEFAULT 3,
  max_concurrent_emails INTEGER DEFAULT 5,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent_channel_status table
CREATE TABLE IF NOT EXISTS agent_channel_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  channel VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  reason VARCHAR,
  custom_reason VARCHAR,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, channel),
  FOREIGN KEY (agent_id) REFERENCES agent_profiles(id) ON DELETE CASCADE
);

-- Create agent_sessions table
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  login_at TIMESTAMPTZ NOT NULL,
  logout_at TIMESTAMPTZ,
  connection_status VARCHAR DEFAULT 'connected',
  last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (agent_id) REFERENCES agent_profiles(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_profiles_user ON agent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_agent_id ON agent_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_status_agent ON agent_channel_status(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions(agent_id);
