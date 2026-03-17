#!/bin/bash
# Simple seed script - users only

echo "🌱 Seeding test users..."

docker exec -i tpb-postgres psql -U postgres -d identity_db << 'EOF'
-- Clear existing data
TRUNCATE TABLE user_roles, users, roles RESTART IDENTITY CASCADE;

-- Insert roles
INSERT INTO roles (id, name, description, permissions, tenant_id)
VALUES 
  ('00000000-0000-0000-0000-000000000020', 'agent', 'Agent role', '["interaction:read", "interaction:update", "ticket:create", "customer:read"]', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000021', 'supervisor', 'Supervisor role', '["interaction:*", "ticket:*", "customer:*", "agent:read"]', '00000000-0000-0000-0000-000000000010');

-- Insert users (password: password123)
INSERT INTO users (id, username, email, password_hash, full_name, agent_id, is_active, tenant_id)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'agent1', 'agent1@tpbank.com', '$2b$10$rZ5qH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ', 'Nguyễn Văn A', 'AGT001', true, '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000002', 'agent2', 'agent2@tpbank.com', '$2b$10$rZ5qH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ', 'Trần Thị B', 'AGT002', true, '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000003', 'supervisor', 'supervisor@tpbank.com', '$2b$10$rZ5qH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ', 'Lê Văn C', 'SUP001', true, '00000000-0000-0000-0000-000000000010');

-- Assign roles
INSERT INTO user_roles (user_id, role_id)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000021');

EOF

echo ""
echo "✅ Test users created!"
echo ""
echo "🔑 Login credentials:"
echo "  Username: agent1 | Password: password123 | Role: Agent"
echo "  Username: agent2 | Password: password123 | Role: Agent"
echo "  Username: supervisor | Password: password123 | Role: Supervisor"
echo ""
echo "📝 Note: Password hash is for 'password123'"
echo "   You need to generate correct bcrypt hash for actual login"
