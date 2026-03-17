#!/bin/bash
# Comprehensive sample data seed for all active services
# TPBank CRM Platform — 2026

set -e
TENANT="00000000-0000-0000-0000-000000000000"
echo "🌱 Seeding all TPBank CRM sample data..."

# ─────────────────────────────────────────────────────────────
# 1. IDENTITY SERVICE — users & roles
# ─────────────────────────────────────────────────────────────
echo ""
echo "👤 [1/7] Seeding identity_db (users & roles)..."

ADMIN_HASH=$(node -e "const b=require('bcrypt');b.hash('Admin@123',12).then(h=>process.stdout.write(h))")
AGENT_HASH=$(node -e "const b=require('bcrypt');b.hash('Agent@123',12).then(h=>process.stdout.write(h))")

docker exec -i tpb-postgres psql -U postgres -d identity_db << EOF
-- Wipe
TRUNCATE TABLE user_roles, refresh_tokens, login_attempts, users, roles RESTART IDENTITY CASCADE;

-- Roles
INSERT INTO roles (id, name, description, permissions, tenant_id) VALUES
  ('00000000-0000-0000-0000-000000000010', 'admin',      'System Administrator', '["*:*:all"]',                                                                          '$TENANT'),
  ('00000000-0000-0000-0000-000000000011', 'supervisor', 'Supervisor',           '["interaction:*","ticket:*","customer:*","agent:read","report:read"]',                  '$TENANT'),
  ('00000000-0000-0000-0000-000000000012', 'agent',      'Customer Agent',       '["interaction:read","interaction:update","ticket:create","ticket:read","customer:read"]','$TENANT');

-- Users: admin + 3 supervisors + 8 agents
INSERT INTO users (id, username, email, password_hash, full_name, agent_id, is_active, tenant_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin',    'admin@tpbank.vn',       '$ADMIN_HASH', 'System Administrator',  'ADM001', true, '$TENANT'),
  ('00000000-0000-0000-0000-000000000002', 'sup001',   'sup001@tpbank.vn',      '$AGENT_HASH', 'Nguyễn Thị Hương',      'SUP001', true, '$TENANT'),
  ('00000000-0000-0000-0000-000000000003', 'sup002',   'sup002@tpbank.vn',      '$AGENT_HASH', 'Trần Văn Minh',         'SUP002', true, '$TENANT'),
  ('00000000-0000-0000-0000-000000000004', 'agent001', 'agent001@tpbank.vn',    '$AGENT_HASH', 'Lê Thị Lan',            'AGT001', true, '$TENANT'),
  ('00000000-0000-0000-0000-000000000005', 'agent002', 'agent002@tpbank.vn',    '$AGENT_HASH', 'Phạm Văn Đức',          'AGT002', true, '$TENANT'),
  ('00000000-0000-0000-0000-000000000006', 'agent003', 'agent003@tpbank.vn',    '$AGENT_HASH', 'Hoàng Thị Mai',         'AGT003', true, '$TENANT'),
  ('00000000-0000-0000-0000-000000000007', 'agent004', 'agent004@tpbank.vn',    '$AGENT_HASH', 'Vũ Quang Huy',          'AGT004', true, '$TENANT'),
  ('00000000-0000-0000-0000-000000000008', 'agent005', 'agent005@tpbank.vn',    '$AGENT_HASH', 'Đặng Thị Thu',          'AGT005', true, '$TENANT'),
  ('00000000-0000-0000-0000-000000000009', 'agent006', 'agent006@tpbank.vn',    '$AGENT_HASH', 'Bùi Văn Tùng',          'AGT006', true, '$TENANT'),
  ('00000000-0000-0000-0000-000000000010', 'agent007', 'agent007@tpbank.vn',    '$AGENT_HASH', 'Ngô Thị Hồng',          'AGT007', true, '$TENANT'),
  ('00000000-0000-0000-0000-000000000011', 'agent008', 'agent008@tpbank.vn',    '$AGENT_HASH', 'Đinh Văn Khoa',         'AGT008', true, '$TENANT')
ON CONFLICT (username) DO UPDATE SET password_hash=EXCLUDED.password_hash, full_name=EXCLUDED.full_name;

-- Role assignments
INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000012')
ON CONFLICT DO NOTHING;
EOF
echo "   ✅ identity_db seeded (11 users, 3 roles)"

# ─────────────────────────────────────────────────────────────
# 2. AGENT SERVICE — agent profiles & channel status
# ─────────────────────────────────────────────────────────────
echo ""
echo "🧑‍💼 [2/7] Seeding agent_db (profiles & channel status)..."

docker exec -i tpb-postgres psql -U postgres -d agent_db << EOF
TRUNCATE TABLE agent_channel_status, agent_sessions, agent_profiles RESTART IDENTITY CASCADE;

INSERT INTO agent_profiles (id, "userId", "agentId", "displayName", department, team, skills, "maxConcurrentChats", "maxConcurrentEmails", "tenantId") VALUES
  ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','SUP001','Nguyễn Thị Hương','Contact Center','Team Alpha','["voice","email","chat","escalation"]',5,10,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','SUP002','Trần Văn Minh',   'Contact Center','Team Beta', '["voice","email","escalation"]',5,10,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','AGT001','Lê Thị Lan',      'Contact Center','Team Alpha','["voice","email","chat","savings","loans"]',3,5,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','AGT002','Phạm Văn Đức',    'Contact Center','Team Alpha','["voice","email","cards","transactions"]',3,5,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006','AGT003','Hoàng Thị Mai',   'Contact Center','Team Beta', '["voice","chat","loans","investments"]',3,5,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000007','AGT004','Vũ Quang Huy',    'Contact Center','Team Beta', '["voice","email","cards","insurance"]',3,5,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000008','AGT005','Đặng Thị Thu',    'Contact Center','Team Alpha','["email","chat","general"]',3,5,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000009','AGT006','Bùi Văn Tùng',    'Contact Center','Team Beta', '["voice","email","general","complaints"]',3,5,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000010','AGT007','Ngô Thị Hồng',    'Contact Center','Team Alpha','["voice","chat","savings","cards"]',3,5,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000011','AGT008','Đinh Văn Khoa',   'Contact Center','Team Beta', '["email","chat","loans","general"]',3,5,'$TENANT');

INSERT INTO agent_channel_status ("agentId", channel, status, reason, "tenantId") VALUES
  ('a0000000-0000-0000-0000-000000000003','voice','ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000003','email','ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000003','chat', 'ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000004','voice','ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000004','email','ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000005','voice','not-ready','Break','$TENANT'),
  ('a0000000-0000-0000-0000-000000000005','chat', 'ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000006','voice','ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000007','email','ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000007','chat', 'ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000008','voice','not-ready','Training','$TENANT'),
  ('a0000000-0000-0000-0000-000000000009','voice','ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000009','chat', 'ready',   NULL,'$TENANT'),
  ('a0000000-0000-0000-0000-000000000010','email','ready',   NULL,'$TENANT')
ON CONFLICT DO NOTHING;
EOF
echo "   ✅ agent_db seeded (10 profiles, 14 channel statuses)"

# ─────────────────────────────────────────────────────────────
# 3. CUSTOMER SERVICE — customers & notes
# ─────────────────────────────────────────────────────────────
echo ""
echo "👥 [3/7] Seeding customer_db (customers & notes)..."

docker exec -i tpb-postgres psql -U postgres -d customer_db << EOF
TRUNCATE TABLE customer_notes, customers RESTART IDENTITY CASCADE;

INSERT INTO customers (id, tenant_id, cif, full_name, email, phone, segment, is_vip, satisfaction_rating, dynamic_fields) VALUES
  ('c0000000-0000-0000-0000-000000000001','$TENANT','CIF001001','Nguyễn Văn An',      'an.nguyen@gmail.com',       '0901234567','Premium',  true,  5,'{"dob":"1980-05-15","address":"123 Lê Lợi, Q1, TP.HCM","occupation":"Business Owner"}'),
  ('c0000000-0000-0000-0000-000000000002','$TENANT','CIF001002','Trần Thị Bích',      'bich.tran@yahoo.com',       '0912345678','Standard', false, 4,'{"dob":"1992-08-22","address":"456 Nguyễn Huệ, Q1, TP.HCM","occupation":"Teacher"}'),
  ('c0000000-0000-0000-0000-000000000003','$TENANT','CIF001003','Lê Văn Cường',       'cuong.le@hotmail.com',      '0923456789','Premium',  true,  5,'{"dob":"1975-11-30","address":"789 Trần Hưng Đạo, Q5, TP.HCM","occupation":"Director"}'),
  ('c0000000-0000-0000-0000-000000000004','$TENANT','CIF001004','Phạm Thị Dung',      'dung.pham@gmail.com',       '0934567890','Standard', false, 3,'{"dob":"1995-03-12","address":"321 Đinh Tiên Hoàng, Q Bình Thạnh, TP.HCM","occupation":"Student"}'),
  ('c0000000-0000-0000-0000-000000000005','$TENANT','CIF001005','Hoàng Văn Em',       'em.hoang@gmail.com',        '0945678901','Standard', false, 4,'{"dob":"1988-07-19","address":"654 Cách Mạng Tháng 8, Q10, TP.HCM","occupation":"Engineer"}'),
  ('c0000000-0000-0000-0000-000000000006','$TENANT','CIF001006','Vũ Thị Giang',       'giang.vu@corporate.vn',     '0956789012','Corporate', true,  5,'{"dob":"1970-01-25","address":"Tòa nhà Bitexco, Q1, TP.HCM","occupation":"CFO"}'),
  ('c0000000-0000-0000-0000-000000000007','$TENANT','CIF001007','Đặng Văn Hải',       'hai.dang@gmail.com',        '0967890123','Standard', false, 2,'{"dob":"1990-12-05","address":"111 Nguyễn Trãi, Q5, TP.HCM","occupation":"Driver"}'),
  ('c0000000-0000-0000-0000-000000000008','$TENANT','CIF001008','Bùi Thị Khánh',      'khanh.bui@gmail.com',       '0978901234','Premium',  false, 4,'{"dob":"1985-06-14","address":"222 Lý Tự Trọng, Q1, TP.HCM","occupation":"Doctor"}'),
  ('c0000000-0000-0000-0000-000000000009','$TENANT','CIF001009','Ngô Văn Long',       'long.ngo@business.com.vn',  '0989012345','Corporate', true,  5,'{"dob":"1968-09-03","address":"Landmark 81, Q Bình Thạnh, TP.HCM","occupation":"CEO"}'),
  ('c0000000-0000-0000-0000-000000000010','$TENANT','CIF001010','Đinh Thị Mỹ',        'my.dinh@gmail.com',         '0990123456','Standard', false, 3,'{"dob":"1998-02-28","address":"333 Hoàng Văn Thụ, Q Phú Nhuận, TP.HCM","occupation":"Accountant"}'),
  ('c0000000-0000-0000-0000-000000000011','$TENANT','CIF001011','Đỗ Văn Nam',         'nam.do@gmail.com',          '0901111222','Standard', false, 4,'{"dob":"1983-04-17","address":"444 Võ Thị Sáu, Q3, TP.HCM","occupation":"Lawyer"}'),
  ('c0000000-0000-0000-0000-000000000012','$TENANT','CIF001012','Lý Thị Oanh',        'oanh.ly@company.com',       '0912222333','Premium',  true,  5,'{"dob":"1977-10-08","address":"555 Nguyễn Đình Chiểu, Q3, TP.HCM","occupation":"Manager"}');

INSERT INTO customer_notes (customer_id, agent_id, note, is_private) VALUES
  ('c0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','VIP customer. Owns 3 business accounts. Prefers morning contact. Fluent in English.', false),
  ('c0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','Interested in expanding investment portfolio to US market.', true),
  ('c0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000005','Director at Viet Corp JSC. Has active credit line of 5B VND. Escalate all issues to supervisor.', false),
  ('c0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000005','Corporate account. Company turnover 500B VND/year. Relationship manager: Trần Văn Minh.', false),
  ('c0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000006','Filed complaint about ATM fee charged incorrectly on 2026-03-01. Refund pending.', false),
  ('c0000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000005','CEO of MegaTech Vietnam. Multi-product: savings, investments, insurance, FX. Call before any action.', false);
EOF
echo "   ✅ customer_db seeded (12 customers, 6 notes)"

# ─────────────────────────────────────────────────────────────
# 4. INTERACTION SERVICE — interactions, events, notes
# ─────────────────────────────────────────────────────────────
echo ""
echo "📞 [4/7] Seeding interaction_db (interactions, events, notes)..."

docker exec -i tpb-postgres psql -U postgres -d interaction_db << EOF
TRUNCATE TABLE interaction_events, interaction_notes, interactions RESTART IDENTITY CASCADE;

INSERT INTO interactions (id, display_id, tenant_id, type, channel, status, priority, customer_id, customer_name, assigned_agent_id, assigned_agent_name, subject, tags, is_vip, direction, source, metadata, sla_due_at, created_at, updated_at) VALUES
  ('i0000000-0000-0000-0001-000000000001','INT-2026-0001','$TENANT','inbound','voice','active',  'high',  'c0000000-0000-0000-0000-000000000001','Nguyễn Văn An',  '00000000-0000-0000-0000-000000000004','Lê Thị Lan',  'Inquiry about loan interest rate',        '{"loans","inquiry"}',true,'inbound', 'ivr',   '{"duration":120,"cli":"0901234567"}',NOW()+INTERVAL'30 min', NOW()-INTERVAL'5 min', NOW()-INTERVAL'5 min'),
  ('i0000000-0000-0000-0001-000000000002','INT-2026-0002','$TENANT','inbound','email','open',   'medium','c0000000-0000-0000-0000-000000000002','Trần Thị Bích',  '00000000-0000-0000-0000-000000000005','Phạm Văn Đức','Request for account statement',           '{"statement","account"}',false,'inbound','email','{"from":"bich.tran@yahoo.com","subject":"Account Statement Request"}',NOW()+INTERVAL'4 hour',NOW()-INTERVAL'2 hour',NOW()-INTERVAL'2 hour'),
  ('i0000000-0000-0000-0001-000000000003','INT-2026-0003','$TENANT','inbound','chat', 'active', 'medium','c0000000-0000-0000-0000-000000000003','Lê Văn Cường',   '00000000-0000-0000-0000-000000000006','Hoàng Thị Mai','Chat: Card replacement inquiry',          '{"card","replacement"}',true,'inbound','web',  '{"sessionId":"sess-abc123","browser":"Chrome"}',NOW()+INTERVAL'1 hour',NOW()-INTERVAL'15 min',NOW()-INTERVAL'15 min'),
  ('i0000000-0000-0000-0001-000000000004','INT-2026-0004','$TENANT','inbound','voice','queued',  'high',  'c0000000-0000-0000-0000-000000000006','Vũ Thị Giang',   NULL,NULL,'Corporate account issue - urgent escalation','{"corporate","escalation","urgent"}',true,'inbound','direct','{"cli":"0956789012"}',NOW()+INTERVAL'15 min',NOW()-INTERVAL'3 min', NOW()-INTERVAL'3 min'),
  ('i0000000-0000-0000-0001-000000000005','INT-2026-0005','$TENANT','inbound','email','pending', 'low',   'c0000000-0000-0000-0000-000000000004','Phạm Thị Dung',  '00000000-0000-0000-0000-000000000007','Vũ Quang Huy','PIN reset request',                       '{"pin","security"}',false,'inbound','email','{"from":"dung.pham@gmail.com"}',NOW()+INTERVAL'8 hour',NOW()-INTERVAL'1 hour',NOW()-INTERVAL'30 min'),
  ('i0000000-0000-0000-0001-000000000006','INT-2026-0006','$TENANT','inbound','voice','closed',  'low',   'c0000000-0000-0000-0000-000000000005','Hoàng Văn Em',   '00000000-0000-0000-0000-000000000004','Lê Thị Lan',  'Balance inquiry - resolved',              '{"balance","inquiry"}',false,'inbound','ivr',  '{"duration":45,"cli":"0945678901"}',NULL,NOW()-INTERVAL'2 hour',NOW()-INTERVAL'1 hour'),
  ('i0000000-0000-0000-0001-000000000007','INT-2026-0007','$TENANT','inbound','chat', 'open',   'medium','c0000000-0000-0000-0000-000000000008','Bùi Thị Khánh',  '00000000-0000-0000-0000-000000000008','Đặng Thị Thu','Online banking login issue',              '{"digital","login","technical"}',false,'inbound','mobile','{"appVersion":"3.2.1","os":"iOS"}',NOW()+INTERVAL'3 hour',NOW()-INTERVAL'45 min',NOW()-INTERVAL'45 min'),
  ('i0000000-0000-0000-0001-000000000008','INT-2026-0008','$TENANT','outbound','voice','completed','medium','c0000000-0000-0000-0000-000000000009','Ngô Văn Long',  '00000000-0000-0000-0000-000000000005','Hoàng Thị Mai','Follow-up: Investment portfolio review',   '{"investment","followup","vip"}',true,'outbound','crm', '{"duration":840,"purpose":"retention"}',NULL,NOW()-INTERVAL'3 hour',NOW()-INTERVAL'2 hour'),
  ('i0000000-0000-0000-0001-000000000009','INT-2026-0009','$TENANT','inbound','email','open',   'high',  'c0000000-0000-0000-0000-000000000007','Đặng Văn Hải',   '00000000-0000-0000-0000-000000000009','Bùi Văn Tùng','Complaint: Incorrect ATM fee charged',     '{"complaint","atm","fee"}',false,'inbound','email','{"from":"hai.dang@gmail.com"}',NOW()+INTERVAL'2 hour',NOW()-INTERVAL'1 day', NOW()-INTERVAL'4 hour'),
  ('i0000000-0000-0000-0001-000000000010','INT-2026-0010','$TENANT','inbound','voice','active',  'medium','c0000000-0000-0000-0000-000000000010','Đinh Thị Mỹ',    '00000000-0000-0000-0000-000000000004','Lê Thị Lan',  'Savings account interest calculation',    '{"savings","interest"}',false,'inbound','ivr',  '{"duration":200,"cli":"0990123456"}',NOW()+INTERVAL'45 min',NOW()-INTERVAL'8 min',NOW()-INTERVAL'8 min'),
  ('i0000000-0000-0000-0001-000000000011','INT-2026-0011','$TENANT','inbound','chat', 'open',   'low',   'c0000000-0000-0000-0000-000000000011','Đỗ Văn Nam',     '00000000-0000-0000-0000-000000000010','Ngô Thị Hồng','General inquiry: FX rates',               '{"fx","inquiry"}',false,'inbound','web',  '{"sessionId":"sess-def456"}',NOW()+INTERVAL'6 hour',NOW()-INTERVAL'20 min',NOW()-INTERVAL'20 min'),
  ('i0000000-0000-0000-0001-000000000012','INT-2026-0012','$TENANT','inbound','email','resolved','medium','c0000000-0000-0000-0000-000000000012','Lý Thị Oanh',   '00000000-0000-0000-0000-000000000006','Hoàng Thị Mai','Request: Increase credit card limit',      '{"credit","card","limit"}',true,'inbound','email','{"from":"oanh.ly@company.com"}',NULL,NOW()-INTERVAL'5 hour',NOW()-INTERVAL'1 hour');

INSERT INTO interaction_events (interaction_id, event_type, actor_id, actor_name, metadata) VALUES
  ('i0000000-0000-0000-0001-000000000001','call_started',  '00000000-0000-0000-0000-000000000004','Lê Thị Lan',   '{"cli":"0901234567"}'),
  ('i0000000-0000-0000-0001-000000000001','note_added',    '00000000-0000-0000-0000-000000000004','Lê Thị Lan',   '{"note":"Customer asking about 36-month home loan rate"}'),
  ('i0000000-0000-0000-0001-000000000002','email_received','00000000-0000-0000-0000-000000000005','Phạm Văn Đức', '{"from":"bich.tran@yahoo.com"}'),
  ('i0000000-0000-0000-0001-000000000002','assigned',      '00000000-0000-0000-0000-000000000005','Phạm Văn Đức', '{"assignedTo":"AGT002"}'),
  ('i0000000-0000-0000-0001-000000000006','call_started',  '00000000-0000-0000-0000-000000000004','Lê Thị Lan',   '{"cli":"0945678901"}'),
  ('i0000000-0000-0000-0001-000000000006','call_ended',    '00000000-0000-0000-0000-000000000004','Lê Thị Lan',   '{"duration":45,"disposition":"resolved"}'),
  ('i0000000-0000-0000-0001-000000000006','status_changed','00000000-0000-0000-0000-000000000004','Lê Thị Lan',   '{"from":"active","to":"closed"}'),
  ('i0000000-0000-0000-0001-000000000009','email_received','00000000-0000-0000-0000-000000000009','Bùi Văn Tùng', '{"subject":"Incorrect ATM fee"}'),
  ('i0000000-0000-0000-0001-000000000009','escalated',     '00000000-0000-0000-0000-000000000009','Bùi Văn Tùng', '{"reason":"Customer complaint about incorrect charge","escalatedTo":"SUP001"}'),
  ('i0000000-0000-0000-0001-000000000012','email_received','00000000-0000-0000-0000-000000000006','Hoàng Thị Mai', '{"from":"oanh.ly@company.com"}'),
  ('i0000000-0000-0000-0001-000000000012','status_changed','00000000-0000-0000-0000-000000000006','Hoàng Thị Mai', '{"from":"open","to":"resolved"}');

INSERT INTO interaction_notes (interaction_id, agent_id, agent_name, content, is_internal) VALUES
  ('i0000000-0000-0000-0001-000000000001','00000000-0000-0000-0000-000000000004','Lê Thị Lan',   'Customer asking about home loan rates. Provided current rate: 8.5%/year for 36 months. Will send product brochure via email.', false),
  ('i0000000-0000-0000-0001-000000000002','00000000-0000-0000-0000-000000000005','Phạm Văn Đức', 'Customer requested 6-month account statement. Preparing official statement document.', false),
  ('i0000000-0000-0000-0001-000000000003','00000000-0000-0000-0000-000000000006','Hoàng Thị Mai', 'VIP customer card damaged. Processing emergency card replacement. Estimated 3 business days. Temp limit increase approved.', false),
  ('i0000000-0000-0000-0001-000000000009','00000000-0000-0000-0000-000000000009','Bùi Văn Tùng', 'Customer charged 55,000 VND ATM fee incorrectly on 2026-03-01 at ATM #HA2201. Escalated to supervisor for refund approval. Internal: Check ATM transaction logs.', true);
EOF
echo "   ✅ interaction_db seeded (12 interactions, 11 events, 4 notes)"

# ─────────────────────────────────────────────────────────────
# 5. TICKET SERVICE — tickets, comments, history
# ─────────────────────────────────────────────────────────────
echo ""
echo "🎫 [5/7] Seeding ticket_db (tickets, comments, history)..."

docker exec -i tpb-postgres psql -U postgres -d ticket_db << EOF
TRUNCATE TABLE ticket_history, ticket_comments, tickets RESTART IDENTITY CASCADE;

INSERT INTO tickets (id, display_id, tenant_id, title, description, status, priority, category, department, customer_id, assigned_agent_id, interaction_id, due_at, dynamic_fields, created_at, updated_at) VALUES
  ('t0000000-0000-0000-0000-000000000001','TK-2026-001','$TENANT','Complaint: ATM fee incorrectly charged','Customer was charged 55,000 VND ATM fee on 2026-03-01 at ATM HA2201. Fee should be waived per VIP account terms.','in-progress','urgent','Complaint','Customer Relations','c0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000002','i0000000-0000-0000-0001-000000000009',NOW()+INTERVAL'24 hour','{"refundAmount":55000,"atm":"HA2201"}',NOW()-INTERVAL'1 day', NOW()-INTERVAL'4 hour'),
  ('t0000000-0000-0000-0000-000000000002','TK-2026-002','$TENANT','Card Replacement - VIP Customer Lê Văn Cường','Emergency card replacement requested by VIP customer. Physical card damaged. Temporary limit increase required.','open','high','Card Services','Retail Banking','c0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000006','i0000000-0000-0000-0001-000000000003',NOW()+INTERVAL'3 day', '{"cardType":"Platinum","tempLimitIncrease":true}',NOW()-INTERVAL'15 min',NOW()-INTERVAL'15 min'),
  ('t0000000-0000-0000-0000-000000000003','TK-2026-003','$TENANT','Account Statement Request - Trần Thị Bích','Customer requested official 6-month account statement for visa application purposes.','pending','medium','Account Services','Retail Banking','c0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','i0000000-0000-0000-0001-000000000002',NOW()+INTERVAL'2 day', '{"period":"6 months","purpose":"visa"}',NOW()-INTERVAL'2 hour',NOW()-INTERVAL'2 hour'),
  ('t0000000-0000-0000-0000-000000000004','TK-2026-004','$TENANT','Online Banking Login Issue - Bùi Thị Khánh','Customer unable to login to TPBank mobile app after iOS update. Account not locked. Requires technical investigation.','open','medium','Technical Support','Digital Banking','c0000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000008','i0000000-0000-0000-0001-000000000007',NOW()+INTERVAL'2 day', '{"appVersion":"3.2.1","os":"iOS 17.4","device":"iPhone 15"}',NOW()-INTERVAL'45 min',NOW()-INTERVAL'45 min'),
  ('t0000000-0000-0000-0000-000000000005','TK-2026-005','$TENANT','Credit Card Limit Increase - Lý Thị Oanh','VIP customer requests credit card limit increase from 50M to 150M VND. Premium segment. Good credit history.','resolved','medium','Credit Services','Retail Banking','c0000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000006','i0000000-0000-0000-0001-000000000012',NULL,'{"currentLimit":50000000,"requestedLimit":150000000,"approvedLimit":100000000}',NOW()-INTERVAL'5 hour',NOW()-INTERVAL'1 hour'),
  ('t0000000-0000-0000-0000-000000000006','TK-2026-006','$TENANT','Home Loan Application Follow-up','Customer Nguyễn Văn An submitted home loan application for 2B VND. Awaiting credit assessment.','in-progress','high','Loan Services','Corporate Banking','c0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004',NULL,NOW()+INTERVAL'5 day', '{"loanAmount":2000000000,"purpose":"home","property":"District 2 condo"}',NOW()-INTERVAL'3 day', NOW()-INTERVAL'1 day'),
  ('t0000000-0000-0000-0000-000000000007','TK-2026-007','$TENANT','Corporate Account Setup - Vũ Thị Giang','New corporate account setup for subsidiary company. Requires KYC documentation and multi-signatory configuration.','open','high','Account Services','Corporate Banking','c0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000003','i0000000-0000-0000-0001-000000000004',NOW()+INTERVAL'3 day', '{"accountType":"corporate","signatories":3,"kycStatus":"pending"}',NOW()-INTERVAL'3 min',NOW()-INTERVAL'3 min'),
  ('t0000000-0000-0000-0000-000000000008','TK-2026-008','$TENANT','FX Transaction Inquiry - Đỗ Văn Nam','Customer inquiring about USD/VND exchange rate and process for international wire transfer.','open','low','FX Services','Treasury','c0000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000010','i0000000-0000-0000-0001-000000000011',NOW()+INTERVAL'7 day', '{"currency":"USD","amount":10000,"purpose":"overseas_study"}',NOW()-INTERVAL'20 min',NOW()-INTERVAL'20 min'),
  ('t0000000-0000-0000-0000-000000000009','TK-2026-009','$TENANT','PIN Reset - Phạm Thị Dung','Customer lost PIN after multiple incorrect attempts. Account temporarily locked. Identity verification completed.','pending','medium','Security','Digital Banking','c0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000007','i0000000-0000-0000-0001-000000000005',NOW()+INTERVAL'1 day', '{"verificationMethod":"OTP+ID","lockReason":"5 incorrect attempts"}',NOW()-INTERVAL'1 hour',NOW()-INTERVAL'30 min'),
  ('t0000000-0000-0000-0000-000000000010','TK-2026-010','$TENANT','Investment Portfolio Review - Ngô Văn Long','CEO client. Annual investment portfolio review. Current portfolio: 50B VND. Discussing rebalancing strategy.','closed','medium','Investment','Private Banking','c0000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000005','i0000000-0000-0000-0001-000000000008',NULL,'{"portfolioValue":50000000000,"recommendedAction":"rebalance_15pct_equity"}',NOW()-INTERVAL'3 hour',NOW()-INTERVAL'2 hour');

INSERT INTO ticket_comments (id, ticket_id, agent_id, agent_name, content, is_internal, created_at) VALUES
  ('tc000000-0000-0000-0000-000000000001','t0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000009','Bùi Văn Tùng','Customer confirmed ATM transaction at HA2201 on 2026-03-01 09:45. Transaction ID: TXN202603010945. Requesting ATM log pull.',false,NOW()-INTERVAL'20 hour'),
  ('tc000000-0000-0000-0000-000000000002','t0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Nguyễn Thị Hương','[INTERNAL] ATM log confirms fee was charged in error. ATM technical fault at that time. Approved refund of 55,000 VND. Process via back-office portal.',true, NOW()-INTERVAL'6 hour'),
  ('tc000000-0000-0000-0000-000000000003','t0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000009','Bùi Văn Tùng','Refund of 55,000 VND has been initiated. Reference: REF-2026-03-12-001. Will reflect in account within 1 business day.',false,NOW()-INTERVAL'4 hour'),
  ('tc000000-0000-0000-0000-000000000004','t0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000006','Hoàng Thị Mai','Emergency card blocked. New Platinum card ordered (3 business days). Temp digital card issued via TPBank app for immediate use.',false,NOW()-INTERVAL'10 min'),
  ('tc000000-0000-0000-0000-000000000005','t0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006','Hoàng Thị Mai','Credit assessment passed. Approved limit increase to 100M VND (partial approval — requested 150M). Customer notified via SMS.',false,NOW()-INTERVAL'2 hour'),
  ('tc000000-0000-0000-0000-000000000006','t0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000012','Lý Thị Oanh','[via email] Thank you for the partial approval. I would like to discuss increasing to 150M in 3 months.',false,NOW()-INTERVAL'1 hour'),
  ('tc000000-0000-0000-0000-000000000007','t0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000004','Lê Thị Lan','Loan application TK-2026-006 submitted to credit dept. CIF: CIF001001. Property valuation scheduled 2026-03-20.',false,NOW()-INTERVAL'2 day'),
  ('tc000000-0000-0000-0000-000000000008','t0000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000005','Hoàng Thị Mai','Portfolio review complete. Recommended 15% equity rebalancing. New allocation: 40% equity, 40% bonds, 20% FX. Client agreed.',false,NOW()-INTERVAL'2 hour');

INSERT INTO ticket_history (ticket_id, agent_id, agent_name, field_changed, old_value, new_value) VALUES
  ('t0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000009','Bùi Văn Tùng','status','open','in-progress'),
  ('t0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Nguyễn Thị Hương','priority','high','urgent'),
  ('t0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006','Hoàng Thị Mai','status','open','resolved'),
  ('t0000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000005','Hoàng Thị Mai','status','in-progress','closed');
EOF
echo "   ✅ ticket_db seeded (10 tickets, 8 comments, 4 history records)"

# ─────────────────────────────────────────────────────────────
# 6. KNOWLEDGE SERVICE — folders & articles
# ─────────────────────────────────────────────────────────────
echo ""
echo "📚 [6/7] Seeding knowledge_db (folders & articles)..."

docker exec -i tpb-postgres psql -U postgres -d knowledge_db << EOF
TRUNCATE TABLE kb_bookmarks, kb_articles, kb_folders RESTART IDENTITY CASCADE;

-- Root folders
INSERT INTO kb_folders (id, tenant_id, name, parent_id, sort_order) VALUES
  ('f0000000-0000-0000-0000-000000000001','$TENANT','Accounts & Savings',   NULL,1),
  ('f0000000-0000-0000-0000-000000000002','$TENANT','Loans & Credit',       NULL,2),
  ('f0000000-0000-0000-0000-000000000003','$TENANT','Cards',                NULL,3),
  ('f0000000-0000-0000-0000-000000000004','$TENANT','Digital Banking',      NULL,4),
  ('f0000000-0000-0000-0000-000000000005','$TENANT','Investments & FX',     NULL,5),
  ('f0000000-0000-0000-0000-000000000006','$TENANT','Complaints & Disputes',NULL,6),
  ('f0000000-0000-0000-0000-000000000007','$TENANT','Security & Fraud',     NULL,7),
  ('f0000000-0000-0000-0000-000000000008','$TENANT','Agent Procedures',     NULL,8);

-- Sub-folders
INSERT INTO kb_folders (id, tenant_id, name, parent_id, sort_order) VALUES
  ('f0000000-0000-0000-0000-000000000011','$TENANT','Savings Products',    'f0000000-0000-0000-0000-000000000001',1),
  ('f0000000-0000-0000-0000-000000000012','$TENANT','Current Accounts',    'f0000000-0000-0000-0000-000000000001',2),
  ('f0000000-0000-0000-0000-000000000021','$TENANT','Home Loans',          'f0000000-0000-0000-0000-000000000002',1),
  ('f0000000-0000-0000-0000-000000000022','$TENANT','Personal Loans',      'f0000000-0000-0000-0000-000000000002',2),
  ('f0000000-0000-0000-0000-000000000031','$TENANT','Credit Cards',        'f0000000-0000-0000-0000-000000000003',1),
  ('f0000000-0000-0000-0000-000000000032','$TENANT','Debit Cards',         'f0000000-0000-0000-0000-000000000003',2);

-- Articles
INSERT INTO kb_articles (id, tenant_id, title, summary, content, tags, category, folder_id, view_count, rating, created_by) VALUES
  ('ar000000-0000-0000-0000-000000000001','$TENANT',
   'TPBank Savings Account Interest Rates 2026',
   'Current interest rates for all TPBank savings account products including flexible and term deposits.',
   '# TPBank Savings Interest Rates 2026\n\n## Flexible Savings\n- Balance < 100M VND: 2.5%/year\n- Balance 100M–500M VND: 3.0%/year\n- Balance > 500M VND: 3.5%/year\n\n## Term Deposits\n| Term | Rate |\n|------|------|\n| 1 month | 4.0% |\n| 3 months | 5.0% |\n| 6 months | 5.5% |\n| 12 months | 6.2% |\n| 24 months | 6.5% |\n\n## Notes\n- Rates subject to change monthly\n- Minimum deposit: 1,000,000 VND\n- Interest paid on maturity for term deposits',
   '{"savings","interest","rates","deposit"}','Savings','f0000000-0000-0000-0000-000000000011',245,4.8,'00000000-0000-0000-0000-000000000001'),

  ('ar000000-0000-0000-0000-000000000002','$TENANT',
   'Home Loan Products & Interest Rates',
   'Complete guide to TPBank home loan products, eligibility requirements, and current rates.',
   '# TPBank Home Loan Guide\n\n## Products\n1. **Standard Home Loan** — up to 70% property value\n2. **Premium Home Loan** — up to 80% (for Premium/VIP customers)\n3. **Green Home Loan** — up to 85% for energy-efficient properties\n\n## Current Rates (March 2026)\n| Term | Fixed (2yr) | Floating |\n|------|-------------|----------|\n| 10 years | 8.0% | 7.5% |\n| 20 years | 8.5% | 7.8% |\n| 30 years | 9.0% | 8.2% |\n\n## Eligibility\n- Age: 21–65\n- Minimum income: 15M VND/month\n- Credit score: >650\n- Employment: >12 months\n\n## Process\n1. Submit application + documents\n2. Credit assessment (3–5 days)\n3. Property valuation (5–7 days)\n4. Approval & disbursement',
   '{"loan","home","mortgage","property","rates"}','Loans','f0000000-0000-0000-0000-000000000021',189,4.7,'00000000-0000-0000-0000-000000000001'),

  ('ar000000-0000-0000-0000-000000000003','$TENANT',
   'Credit Card Limit Increase Process',
   'Step-by-step guide for processing customer requests for credit card limit increases.',
   '# Credit Card Limit Increase Process\n\n## Agent Steps\n1. Verify customer identity (CIF + OTP)\n2. Check current limit and utilization\n3. Run eligibility check in CRM system\n4. If eligible: submit increase request\n5. Approval within 1–3 business days\n\n## Eligibility Criteria\n- Account age: >6 months\n- Payment history: no missed payments in 12 months\n- Credit utilization: <70%\n- Income verification: may be required for >50% increase\n\n## Limits by Card Type\n| Card | Minimum | Maximum |\n|------|---------|----------|\n| Standard | 5M | 50M VND |\n| Gold | 20M | 150M VND |\n| Platinum | 50M | 500M VND |\n| Black | 100M | Unlimited |\n\n## Notes\n- VIP customers: fast-track approval available\n- Document required if increase >50% of current limit',
   '{"credit","card","limit","increase"}','Cards','f0000000-0000-0000-0000-000000000031',312,4.6,'00000000-0000-0000-0000-000000000001'),

  ('ar000000-0000-0000-0000-000000000004','$TENANT',
   'ATM Fee Dispute Resolution Procedure',
   'How to handle customer complaints about incorrect ATM fees. Includes refund process and escalation path.',
   '# ATM Fee Dispute Resolution\n\n## Common Scenarios\n1. Fee charged during ATM downtime\n2. Transaction not completed but fee deducted\n3. Incorrect fee type applied\n4. Cross-bank ATM fee disputed\n\n## Agent Procedure\n1. Collect: Date, time, ATM ID, transaction amount, fee amount\n2. Pull ATM transaction log from Operations portal\n3. If technical error confirmed: approve refund up to 200,000 VND\n4. If above 200,000 VND: escalate to Supervisor\n\n## Refund Processing\n- Log in to Back-office Portal > Refunds > ATM Disputes\n- Enter transaction details and confirm\n- Refund credited within 1 business day\n- Send SMS confirmation to customer\n\n## Escalation\n- Supervisor approval required for: amount >200K, systematic ATM issues, VIP customers',
   '{"atm","fee","dispute","refund","complaint"}','Complaints','f0000000-0000-0000-0000-000000000006',98,4.9,'00000000-0000-0000-0000-000000000001'),

  ('ar000000-0000-0000-0000-000000000005','$TENANT',
   'Mobile App Login Troubleshooting Guide',
   'Troubleshooting steps for customers unable to login to TPBank mobile app.',
   '# Mobile App Login Troubleshooting\n\n## Step 1: Identify Issue\n- Account locked? (>5 failed PIN attempts)\n- App update required?\n- Device change detected?\n- Biometric not recognized?\n\n## Step 2: Common Fixes\n### Account Locked\n- Verify identity: CIF + registered phone OTP\n- Unlock via: Customer Portal > Security > Unlock Account\n- Have customer set new PIN\n\n### App Version Issue\n- Current supported version: 3.2.x\n- iOS min: 16.0 | Android min: 11\n- Direct to App Store/Play Store\n\n### Device Change\n- New device registration requires OTP verification\n- If customer does not have OTP access: verify with ID card + face recognition\n\n## Escalation\n- If issue persists after steps above → Digital Banking Support Team (ext. 4567)',
   '{"mobile","app","login","digital","technical","troubleshoot"}','Digital Banking','f0000000-0000-0000-0000-000000000004',156,4.5,'00000000-0000-0000-0000-000000000001'),

  ('ar000000-0000-0000-0000-000000000006','$TENANT',
   'Emergency Card Replacement Procedure',
   'Process for handling emergency physical card replacement requests including temp digital card issuance.',
   '# Emergency Card Replacement\n\n## Triggers\n- Physical card damaged/demagnetized\n- Card lost or stolen\n- Card swallowed by ATM\n\n## Procedure\n1. Block current card immediately (Security > Block Card)\n2. Verify customer identity\n3. Confirm delivery address\n4. Order replacement card (3–5 business days standard)\n5. For VIP customers: expedited delivery (1–2 days) available\n\n## Temporary Digital Card\n- Issue via: TPBank App > Manage Cards > Virtual Card\n- Available immediately after block\n- Same limits as physical card\n- Valid until replacement arrives\n\n## Temporary Limit Adjustment\n- Agent can increase digital card limit by 20% without approval\n- Higher adjustments require Supervisor approval\n\n## Tracking\n- Card dispatch tracked in CRM > Cards > Shipments\n- SMS sent to customer when card dispatched',
   '{"card","replacement","emergency","lost","stolen","damage"}','Cards','f0000000-0000-0000-0000-000000000031',203,4.7,'00000000-0000-0000-0000-000000000001'),

  ('ar000000-0000-0000-0000-000000000007','$TENANT',
   'PIN Reset & Account Unlock Process',
   'Complete process for PIN reset and unlocking accounts after too many failed attempts.',
   '# PIN Reset & Account Unlock\n\n## Account Lock Triggers\n- 5 consecutive incorrect PIN entries\n- Suspected fraudulent access\n- Customer request\n\n## Verification Methods (in priority order)\n1. OTP to registered mobile + Date of Birth\n2. OTP to registered email + Mother maiden name\n3. Video call with ID verification (for no phone access cases)\n\n## Agent Steps\n1. Confirm customer identity using above methods\n2. Navigate: Customer Portal > Security > PIN Reset\n3. System sends OTP to registered phone\n4. Customer resets PIN via app or ATM\n5. Log resolution in ticket\n\n## Security Note\nNever ask customer for current PIN. Never reset PIN without full identity verification. All PIN resets are logged in audit trail.',
   '{"pin","reset","unlock","security","password"}','Security','f0000000-0000-0000-0000-000000000007',178,4.8,'00000000-0000-0000-0000-000000000001'),

  ('ar000000-0000-0000-0000-000000000008','$TENANT',
   'FX Rates & International Wire Transfer Process',
   'Current FX rates and step-by-step guide for processing international wire transfers.',
   '# FX & International Wire Transfer\n\n## Current FX Rates (indicative, March 2026)\n| Currency | Buy | Sell |\n|----------|-----|------|\n| USD | 25,100 | 25,350 |\n| EUR | 27,200 | 27,600 |\n| GBP | 31,500 | 32,000 |\n| JPY | 168 | 172 |\n| AUD | 16,200 | 16,500 |\n| SGD | 18,800 | 19,100 |\n\n*Rates updated daily at 8:00 AM. For large transactions (>50,000 USD) contact Treasury desk.*\n\n## Wire Transfer Process\n1. Verify source of funds (>10,000 USD requires documentation)\n2. Complete SWIFT transfer form\n3. Fees: 0.1% of amount (min 150,000 VND, max 2,000,000 VND) + SWIFT fee 300,000 VND\n4. Processing time: same day if before 2PM\n\n## Compliance Notes\n- Report all transfers >10,000 USD to compliance team\n- Sanctioned countries list available on intranet',
   '{"fx","foreign exchange","wire transfer","international","swift","currency"}','FX','f0000000-0000-0000-0000-000000000005',89,4.4,'00000000-0000-0000-0000-000000000001');
EOF
echo "   ✅ knowledge_db seeded (8 root+sub folders, 8 articles)"

# ─────────────────────────────────────────────────────────────
# 7. NOTIFICATION SERVICE — sample notifications
# ─────────────────────────────────────────────────────────────
echo ""
echo "🔔 [7/7] Seeding notification_db (notifications)..."

docker exec -i tpb-postgres psql -U postgres -d notification_db << EOF
TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;

INSERT INTO notifications (tenant_id, agent_id, type, priority, state, title, message, action_url, action_label, metadata, auto_hide_seconds) VALUES
  ('$TENANT','00000000-0000-0000-0000-000000000004','new_interaction','high','new','New Voice Call — Nguyễn Văn An','Incoming call from VIP customer Nguyễn Văn An (CIF001001). Loan inquiry.','/interactions/i0000000-0000-0000-0001-000000000001','Answer',  '{"interactionId":"i0000000-0000-0000-0001-000000000001","channel":"voice","customerId":"c0000000-0000-0000-0000-000000000001"}',NULL),
  ('$TENANT','00000000-0000-0000-0000-000000000005','new_interaction','medium','new','New Email — Trần Thị Bích','Customer requesting 6-month account statement for visa application.','/interactions/i0000000-0000-0000-0001-000000000002','View',    '{"interactionId":"i0000000-0000-0000-0001-000000000002","channel":"email"}',NULL),
  ('$TENANT','00000000-0000-0000-0000-000000000006','new_interaction','high','new','New Chat — Lê Văn Cường (VIP)','VIP customer inquiring about emergency card replacement.','/interactions/i0000000-0000-0000-0001-000000000003','Join Chat','{"interactionId":"i0000000-0000-0000-0001-000000000003","channel":"chat"}',NULL),
  ('$TENANT','00000000-0000-0000-0000-000000000004','ticket_assigned','medium','new','Ticket Assigned — TK-2026-006','Home loan application ticket assigned to you. Customer: Nguyễn Văn An.','/tickets/t0000000-0000-0000-0000-000000000006','View Ticket','{"ticketId":"t0000000-0000-0000-0000-000000000006"}',NULL),
  ('$TENANT','00000000-0000-0000-0000-000000000002','sla_breach','urgent','new','SLA Warning — TK-2026-001','Complaint ticket TK-2026-001 SLA breaches in 2 hours. Refund still pending.','/tickets/t0000000-0000-0000-0000-000000000001','View Ticket','{"ticketId":"t0000000-0000-0000-0000-000000000001","minutesRemaining":120}',NULL),
  ('$TENANT','00000000-0000-0000-0000-000000000006','ticket_update','low','viewed','Ticket Updated — TK-2026-002','Card replacement ticket TK-2026-002 status updated to In Progress.','/tickets/t0000000-0000-0000-0000-000000000002','View Ticket','{"ticketId":"t0000000-0000-0000-0000-000000000002"}',30),
  ('$TENANT','00000000-0000-0000-0000-000000000009','system','low','new','ATM System Maintenance Alert','ATM cluster HA22 scheduled maintenance 2026-03-14 02:00–04:00. Advise customers accordingly.',NULL,NULL,'{"maintenanceWindow":"2026-03-14T02:00:00","affectedATMs":["HA2201","HA2202","HA2203"]}',NULL),
  ('$TENANT','00000000-0000-0000-0000-000000000005','ticket_resolved','low','actioned','Ticket Resolved — TK-2026-005','Credit card limit increase ticket resolved. New limit: 100M VND.','/tickets/t0000000-0000-0000-0000-000000000005','View',NULL,60);
EOF
echo "   ✅ notification_db seeded (8 notifications)"

# ─────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ All sample data seeded successfully!"
echo ""
echo "  👤 identity_db  : 11 users (admin/Agent@123, others/Agent@123)"
echo "  🧑 agent_db     : 10 profiles, 14 channel statuses"
echo "  👥 customer_db  : 12 customers, 6 notes"
echo "  📞 interaction_db: 12 interactions, 11 events, 4 notes"
echo "  🎫 ticket_db    : 10 tickets, 8 comments, 4 history"
echo "  📚 knowledge_db : 14 folders, 8 articles"
echo "  🔔 notification_db: 8 notifications"
echo ""
echo "  🔑 Login: admin/Admin@123  |  agents: agent001/Agent@123"
echo "════════════════════════════════════════════════════════"
