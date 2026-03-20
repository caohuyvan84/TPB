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
   '$2b$12$qmo6kt1a5bB9U8urEf4bH.JOVQPvqj10hELiljOkSDG8FDgy0W8Pm',
   'System Administrator', 'ADM001', '00000000-0000-0000-0000-000000000000', true)
ON CONFLICT (username) DO NOTHING;

-- Assign admin role to admin user
INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- Insert test agent users (password: Agent@123)
INSERT INTO users (id, username, email, password_hash, full_name, agent_id, tenant_id, is_active) VALUES
  ('00000000-0000-0000-0000-000000000002', 'agent001', 'agent001@tpbank.com',
   '$2b$12$wX3uW0ctviPv/EjzZFMvyuz6Gy5gl/EIFbQrMYgHZmvd6cumv65/K',
   'Agent Tung', 'AGT001', '00000000-0000-0000-0000-000000000000', true),
  ('00000000-0000-0000-0000-000000000004', 'agent002', 'agent002@tpbank.com',
   '$2b$12$wX3uW0ctviPv/EjzZFMvyuz6Gy5gl/EIFbQrMYgHZmvd6cumv65/K',
   'Phạm Văn Đức', 'AGT002', '00000000-0000-0000-0000-000000000000', true),
  ('00000000-0000-0000-0000-000000000005', 'agent003', 'agent003@tpbank.com',
   '$2b$12$wX3uW0ctviPv/EjzZFMvyuz6Gy5gl/EIFbQrMYgHZmvd6cumv65/K',
   'Hoàng Thị Mai', 'AGT003', '00000000-0000-0000-0000-000000000000', true),
  ('00000000-0000-0000-0000-000000000006', 'agent004', 'agent004@tpbank.com',
   '$2b$12$wX3uW0ctviPv/EjzZFMvyuz6Gy5gl/EIFbQrMYgHZmvd6cumv65/K',
   'Trần Minh Tuấn', 'AGT004', '00000000-0000-0000-0000-000000000000', true),
  ('00000000-0000-0000-0000-000000000007', 'agent005', 'agent005@tpbank.com',
   '$2b$12$wX3uW0ctviPv/EjzZFMvyuz6Gy5gl/EIFbQrMYgHZmvd6cumv65/K',
   'Nguyễn Thanh Hà', 'AGT005', '00000000-0000-0000-0000-000000000000', true)
ON CONFLICT (username) DO NOTHING;

-- Insert supervisor (password: Sup@1234)
INSERT INTO users (id, username, email, password_hash, full_name, agent_id, tenant_id, is_active) VALUES
  ('00000000-0000-0000-0000-000000000008', 'sup001', 'sup001@tpbank.com',
   '$2b$12$T785C4RW3SXKgXUrdRoNjORYcQg0jaod0XS79yFmiQM7Z7up/xJJS',
   'Lê Văn Hùng', 'SUP001', '00000000-0000-0000-0000-000000000000', true)
ON CONFLICT (username) DO NOTHING;

-- Assign agent role to all agents
INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Assign supervisor role
INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;
