#!/bin/bash
# Seed sample data for Phase 1 testing

echo "🌱 Seeding Phase 1 sample data..."

# Seed Identity Service
echo ""
echo "📊 Seeding Identity Service..."
docker exec -i tpb-postgres psql -U postgres -d identity_db << 'EOF'
-- Insert tenant
INSERT INTO users (id, username, email, password_hash, full_name, agent_id, is_active, tenant_id)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'agent1', 'agent1@tpbank.com', '$2b$10$rZ5qH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ', 'Nguyễn Văn A', 'AGT001', true, '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000002', 'agent2', 'agent2@tpbank.com', '$2b$10$rZ5qH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ', 'Trần Thị B', 'AGT002', true, '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000003', 'supervisor', 'supervisor@tpbank.com', '$2b$10$rZ5qH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ5xJ5xJOqH8qF9YvN5xJ', 'Lê Văn C', 'SUP001', true, '00000000-0000-0000-0000-000000000010');

-- Insert roles
INSERT INTO roles (id, name, description, permissions, tenant_id)
VALUES 
  ('00000000-0000-0000-0000-000000000020', 'agent', 'Agent role', '["interaction:read", "interaction:update", "ticket:create", "customer:read"]', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000021', 'supervisor', 'Supervisor role', '["interaction:*", "ticket:*", "customer:*", "agent:read"]', '00000000-0000-0000-0000-000000000010');

-- Assign roles
INSERT INTO user_roles (user_id, role_id)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000021');

EOF

# Seed Agent Service
echo ""
echo "📊 Seeding Agent Service..."
docker exec -i tpb-postgres psql -U postgres -d agent_db << 'EOF'
-- Insert agent profiles
INSERT INTO agent_profiles (id, user_id, agent_id, display_name, department, team, skills, max_concurrent_chats, max_concurrent_emails, tenant_id)
VALUES 
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'AGT001', 'Nguyễn Văn A', 'Customer Service', 'Team 1', '["banking", "loans", "cards"]', 3, 5, '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 'AGT002', 'Trần Thị B', 'Customer Service', 'Team 1', '["banking", "deposits"]', 3, 5, '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000003', 'SUP001', 'Lê Văn C', 'Customer Service', 'Team 1', '["supervision", "escalation"]', 5, 10, '00000000-0000-0000-0000-000000000010');

-- Insert agent channel status
INSERT INTO agent_channel_status (agent_id, channel, status, reason)
VALUES 
  ('00000000-0000-0000-0000-000000000101', 'voice', 'ready', NULL),
  ('00000000-0000-0000-0000-000000000101', 'email', 'ready', NULL),
  ('00000000-0000-0000-0000-000000000101', 'chat', 'ready', NULL),
  ('00000000-0000-0000-0000-000000000102', 'voice', 'not-ready', 'break'),
  ('00000000-0000-0000-0000-000000000102', 'email', 'ready', NULL),
  ('00000000-0000-0000-0000-000000000102', 'chat', 'ready', NULL);

EOF

# Seed Customer Service
echo ""
echo "📊 Seeding Customer Service..."
docker exec -i tpb-postgres psql -U postgres -d customer_db << 'EOF'
-- Insert customers
INSERT INTO customers (id, tenant_id, cif, full_name, email, phone, segment, is_vip)
VALUES 
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000010', 'CIF001234567', 'Phạm Văn D', 'phamvand@email.com', '0901234567', 'individual', false),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000010', 'CIF002345678', 'Hoàng Thị E', 'hoangthie@email.com', '0902345678', 'individual', true),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000010', 'CIF003456789', 'Công ty ABC', 'contact@abc.com', '0903456789', 'corporate', true);

-- Insert customer notes
INSERT INTO customer_notes (customer_id, agent_id, agent_name, content)
VALUES 
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Nguyễn Văn A', 'Khách hàng quan tâm đến sản phẩm thẻ tín dụng'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000002', 'Trần Thị B', 'VIP customer - ưu tiên xử lý');

EOF

# Seed Interaction Service
echo ""
echo "📊 Seeding Interaction Service..."
docker exec -i tpb-postgres psql -U postgres -d interaction_db << 'EOF'
-- Insert interactions
INSERT INTO interactions (id, display_id, tenant_id, type, channel, status, priority, customer_id, customer_name, assigned_agent_id, assigned_agent_name, subject, is_vip, direction, source)
VALUES 
  ('00000000-0000-0000-0000-000000000301', 'INT-2026-000001', '00000000-0000-0000-0000-000000000010', 'call', 'voice', 'in-progress', 'high', '00000000-0000-0000-0000-000000000202', 'Hoàng Thị E', '00000000-0000-0000-0000-000000000001', 'Nguyễn Văn A', 'Hỏi về lãi suất tiết kiệm', true, 'inbound', 'phone'),
  ('00000000-0000-0000-0000-000000000302', 'INT-2026-000002', '00000000-0000-0000-0000-000000000010', 'email', 'email', 'new', 'medium', '00000000-0000-0000-0000-000000000201', 'Phạm Văn D', NULL, NULL, 'Yêu cầu mở thẻ tín dụng', false, 'inbound', 'email'),
  ('00000000-0000-0000-0000-000000000303', 'INT-2026-000003', '00000000-0000-0000-0000-000000000010', 'chat', 'chat', 'new', 'medium', '00000000-0000-0000-0000-000000000203', 'Công ty ABC', NULL, NULL, 'Hỏi về dịch vụ doanh nghiệp', true, 'inbound', 'webchat');

-- Insert interaction notes
INSERT INTO interaction_notes (interaction_id, agent_id, agent_name, content)
VALUES 
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'Nguyễn Văn A', 'Khách hàng đã được tư vấn về gói tiết kiệm 12 tháng');

EOF

# Seed Ticket Service
echo ""
echo "📊 Seeding Ticket Service..."
docker exec -i tpb-postgres psql -U postgres -d ticket_db << 'EOF'
-- Insert tickets
INSERT INTO tickets (id, display_id, tenant_id, title, description, status, priority, category, assigned_agent_id, customer_id, interaction_id)
VALUES 
  ('00000000-0000-0000-0000-000000000401', 'TK-2026-000001', '00000000-0000-0000-0000-000000000010', 'Yêu cầu mở thẻ tín dụng', 'Khách hàng yêu cầu mở thẻ tín dụng Platinum', 'open', 'high', 'card', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000302'),
  ('00000000-0000-0000-0000-000000000402', 'TK-2026-000002', '00000000-0000-0000-0000-000000000010', 'Khiếu nại về phí', 'Khách hàng khiếu nại về phí chuyển khoản', 'in-progress', 'high', 'complaint', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000202', NULL);

-- Insert ticket comments
INSERT INTO ticket_comments (ticket_id, agent_id, agent_name, content, is_internal)
VALUES 
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', 'Nguyễn Văn A', 'Đã gửi form đăng ký cho khách hàng', false),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000002', 'Trần Thị B', 'Cần escalate lên supervisor', true);

EOF

# Seed Notification Service
echo ""
echo "📊 Seeding Notification Service..."
docker exec -i tpb-postgres psql -U postgres -d notification_db << 'EOF'
-- Insert notifications
INSERT INTO notifications (tenant_id, agent_id, type, priority, state, title, message, action_url)
VALUES 
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'call', 'high', 'new', 'Cuộc gọi mới', 'Cuộc gọi từ Hoàng Thị E (VIP)', '/interactions/00000000-0000-0000-0000-000000000301'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'ticket', 'medium', 'new', 'Ticket được gán', 'Ticket TK-2026-000001 đã được gán cho bạn', '/tickets/00000000-0000-0000-0000-000000000401'),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'ticket', 'high', 'viewed', 'Ticket cần xử lý', 'Ticket TK-2026-000002 cần escalate', '/tickets/00000000-0000-0000-0000-000000000402');

EOF

echo ""
echo "✅ Sample data seeded successfully!"
echo ""
echo "📊 Summary:"
echo "  • 3 users (agent1, agent2, supervisor)"
echo "  • 3 agent profiles"
echo "  • 3 customers (1 VIP individual, 1 VIP corporate)"
echo "  • 3 interactions (1 call, 1 email, 1 chat)"
echo "  • 2 tickets"
echo "  • 3 notifications"
echo ""
echo "🔑 Login credentials:"
echo "  Username: agent1"
echo "  Password: password123"
echo "  (All users have same password for testing)"
