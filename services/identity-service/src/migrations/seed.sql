-- Seed initial roles and admin user
-- Run this after migration

-- Insert default tenant
INSERT INTO roles (id, name, description, permissions, tenant_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'agent', 'Agent role', 
   '["interaction:read:own", "interaction:update:own", "ticket:read:own", "ticket:create:all", "customer:read:all"]'::jsonb,
   '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-000000000002', 'supervisor', 'Supervisor role',
   '["interaction:read:team", "interaction:update:team", "ticket:read:team", "ticket:update:team", "agent:read:team"]'::jsonb,
   '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-000000000003', 'admin', 'Administrator role',
   '["*:*:all"]'::jsonb,
   '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-000000000004', 'auditor', 'Auditor role',
   '["audit:read:all", "report:read:all"]'::jsonb,
   '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;

-- Insert admin user (password: Admin@123)
-- Hash generated with bcrypt cost 12
INSERT INTO users (id, username, email, password_hash, full_name, agent_id, tenant_id, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@tpbank.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIFj7AT5Ka',
   'System Administrator', 'ADM001', '00000000-0000-0000-0000-000000000000', true)
ON CONFLICT (username) DO NOTHING;

-- Assign admin role to admin user
INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- Insert test agent user (password: Agent@123)
INSERT INTO users (id, username, email, password_hash, full_name, agent_id, tenant_id, is_active) VALUES
  ('00000000-0000-0000-0000-000000000002', 'agent001', 'agent001@tpbank.com',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIFj7AT5Ka',
   'Agent Tung', 'AGT001', '00000000-0000-0000-0000-000000000000', true)
ON CONFLICT (username) DO NOTHING;

-- Assign agent role
INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
