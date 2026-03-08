import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/query-client';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
// Agent Desktop Application with multi-channel support
import { EnhancedAgentHeader } from './components/EnhancedAgentHeader';
import { InteractionList } from './components/InteractionList';
import { InteractionDetail } from './components/InteractionDetail';
import { CustomerInfo } from './components/CustomerInfoScrollFixed';
import { TicketDetail } from './components/TicketDetail';
import { TransferCallDialog } from './components/TransferCallDialog';
import { FloatingCallWidget } from './components/FloatingCallWidget';
import { AgentStatusWidget } from './components/AgentStatusWidget';
import { CallProvider, useCall } from './components/CallContext';
import { EnhancedAgentStatusProvider, useEnhancedAgentStatus } from './components/EnhancedAgentStatusContext';
import { NotificationProvider, useNotifications } from './components/NotificationContext';
import { ChannelFilter, Interaction } from './components/useInteractionStats';
import { 
  ChevronLeft, 
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Keyboard,
  Phone,
  PhoneMissed,
  Crown,
  Ticket,
  Calendar,
  Shield,
  Settings,
  Mail,
  Reply,
  User,
  X,
  Plus
} from 'lucide-react';
import { EmailReplyDialog } from './components/EmailReplyDialog';

// Mock ticket data
const mockTickets = {
  'TKT-001': {
    id: 'TKT-001',
    number: 'TKT-001',
    classification: 'bug',
    classificationLabel: 'Báo lỗi',
    title: 'login-error',
    titleLabel: 'Lỗi đăng nhập',
    description: 'Khách hàng không thể đăng nhập vào hệ thống CRM của công ty. Xuất hiện lỗi "Invalid credentials" mặc dù đã nhập đúng thông tin. Khách hàng đã thử reset password nhưng vẫn không thể truy cập.',
    status: 'in-progress' as const,
    priority: 'high' as const,
    customer: {
      name: 'Trần Thị B',
      email: 'tran.thi.b@email.com',
      phone: '+84 912 345 678',
      isVIP: false,
      avatar: undefined
    },
    assignedAgent: 'Agent Tung',
    assignedBy: 'Supervisor Minh',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    tags: ['login-issue', 'crm', 'urgent'],
    comments: [
      {
        id: 'comment-1',
        author: 'Trần Thị B',
        content: 'Tôi không thể đăng nhập vào hệ thống từ sáng nay. Đã thử nhiều lần nhưng vẫn báo lỗi "Invalid credentials".',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        type: 'comment' as const,
        isInternal: false
      },
      {
        id: 'comment-2',
        author: 'Agent Tung',
        content: 'Đã nhận ticket. Đang kiểm tra log hệ thống để xác định nguyên nhân.',
        timestamp: new Date(Date.now() - 90 * 60 * 1000),
        type: 'comment' as const,
        isInternal: true
      },
      {
        id: 'comment-3',
        author: 'Agent Tung',
        content: 'Xin chào chị, tôi đã kiểm tra và thấy tài khoản của chị đang bị lock do thử đăng nhập sai quá nhiều lần. Tôi sẽ unlock tài khoản và gửi password mới cho chị.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        type: 'comment' as const,
        isInternal: false
      }
    ]
  },
  'TKT-002': {
    id: 'TKT-002',
    number: 'TKT-002',
    classification: 'bug',
    classificationLabel: 'Báo lỗi',
    title: 'display-error',
    titleLabel: 'Lỗi hiển thị',
    description: 'Chức năng tạo báo cáo trong module Analytics không hoạt động. Khi click "Generate Report" thì spinner quay mãi không ra kết quả. Vấn đề ảnh hưởng đến công việc hàng ngày.',
    status: 'in-progress' as const,
    priority: 'urgent' as const,
    customer: {
      name: 'Trần Thị B',
      email: 'tran.thi.b@email.com',
      phone: '+84 987 654 321',
      isVIP: true,
      avatar: undefined
    },
    assignedAgent: 'Agent Duc',
    assignedBy: 'Supervisor Linh',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    updatedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    dueDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    tags: ['bug', 'analytics', 'vip-customer'],
    attachments: ['screenshot-error.png', 'error-log.txt'],
    comments: [
      {
        id: 'comment-4',
        author: 'Trần Thị B',
        content: 'Chức năng báo cáo bị lỗi từ hôm qua. Tôi cần báo cáo gấp cho meeting chiều nay.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        type: 'comment' as const,
        isInternal: false
      },
      {
        id: 'comment-5',
        author: 'Agent Duc',
        content: 'Technical team đang kiểm tra server. Có vẻ như database connection bị issue.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        type: 'comment' as const,
        isInternal: true
      },
      {
        id: 'comment-6',
        author: 'Agent Duc',
        content: 'Chào chị, team kỹ thuật đang khắc phục lỗi này. Dự kiến sẽ fix xong trong 30 phút tới. Tôi sẽ update ngay khi có kết quả.',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        type: 'comment' as const,
        isInternal: false
      }
    ]
  }
};

// Mock default interaction - Call với recording để test
const defaultInteraction = {
  id: 'INT-DEFAULT',
  type: 'call',
  customerName: 'Nguyễn Văn A',
  customerEmail: 'nguyen.van.a@email.com',
  subject: 'Tư vấn nâng cấp gói dịch vụ',
  time: '09:15',
  timestamp: '2025-08-01T09:15:00Z',
  status: 'completed',
  priority: 'medium',
  agent: 'Agent Duc',
  assignedAgent: 'Agent Duc',
  tags: ['consultation', 'upgrade'],
  channel: 'voice',
  source: 'Hotline Chăm sóc KH (1900-1234)',
  duration: '00:12:45',
  // Call recording data
  recording: {
    url: '/recordings/call-INT-002.wav',
    duration: 765, // 12:45 in seconds
    quality: 'high',
    fileSize: '15.2 MB'
  }
};

// Enhanced mock interactions list with detailed channel sources and agents
const mockInteractionsList = [
  defaultInteraction, // Call with recording data
  // Missed Calls
  {
    id: 'INT-MISSED-001',
    type: 'missed-call',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyen.van.a@email.com',
    customerPhone: '+84 912 345 678',
    subject: 'Cuộc gọi nhỡ',
    time: '09:05 AM',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    status: 'missed',
    priority: 'medium',
    agent: null,
    assignedAgent: null,
    tags: ['missed-call', 'timeout'],
    channel: 'voice',
    source: 'Hotline Chăm sóc KH (1900-1234)',
    duration: null,
    missedReason: 'timeout',
    isVIP: false
  },
  {
    id: 'INT-MISSED-002',
    type: 'missed-call',
    customerName: 'Trần Thị B',
    customerEmail: 'tran.thi.b@email.com',
    customerPhone: '+84 987 654 321',
    subject: 'Cuộc gọi nhỡ VIP',
    time: '08:50 AM',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 minutes ago
    status: 'missed',
    priority: 'urgent',
    agent: null,
    assignedAgent: null,
    tags: ['missed-call', 'not-ready', 'vip'],
    channel: 'voice',
    source: 'Hotline VIP (1900-5555)',
    duration: null,
    missedReason: 'not-ready',
    isVIP: true
  },
  {
    id: 'INT-MISSED-003',
    type: 'missed-call',
    customerName: 'Lê Văn C',
    customerEmail: 'le.van.c@email.com',
    customerPhone: '+84 901 234 567',
    subject: 'Cuộc gọi nhỡ',
    time: '08:35 AM',
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(), // 40 minutes ago
    status: 'missed',
    priority: 'high',
    agent: null,
    assignedAgent: null,
    tags: ['missed-call', 'disconnected'],
    channel: 'voice',
    source: 'Hotline Tổng đài (1900-9999)',
    duration: null,
    missedReason: 'disconnected',
    isVIP: false
  },
  {
    id: 'INT-002',
    type: 'email',
    customerName: 'Trần Thị B',
    customerEmail: 'tran.thi.b@email.com',
    subject: 'Re: Re: Re: Hỏi về chính sách bảo hành sản phẩm',
    time: '10:25 AM',
    timestamp: '2025-08-01T10:25:00Z',
    status: 'in-progress',
    priority: 'medium',
    agent: 'Agent Mai',
    assignedAgent: 'Agent Mai',
    tags: ['warranty', 'policy', 'escalated'],
    channel: 'email',
    source: 'Email Support (support@company.com)',
    duration: null,
    emailType: 'thread', // Indicates this is an email thread
    snippet: 'Cảm ơn Quý Khách đã liên hệ. Chúng tôi xin phản hồi về chính sách bảo hiểm thẻ tín dụng. Theo quy định hiện tại, chương trình bảo hiểm tự động áp dụng cho thẻ Platinum và cao hơn...'
  },
  {
    id: 'INT-001',
    type: 'email',
    customerName: 'Trần Thị B',
    customerEmail: 'tran.thi.b@email.com',
    subject: 'Yêu cầu hỗ trợ kỹ thuật',
    time: '14:30',
    timestamp: '2025-08-01T14:30:00Z',
    status: 'resolved',
    priority: 'high',
    agent: 'Agent Mai',
    assignedAgent: 'Agent Mai',
    tags: ['technical', 'support'],
    emailType: 'outbound',
    channel: 'email',
    source: 'Email VIP Support (vip@company.com)',
    duration: '00:45:30',
    snippet: 'Kính gửi Quý Khách, chúng tôi đã khắc phục xong sự cố không thể đăng nhập Mobile Banking. Nguyên nhân do phiên bản ứng dụng cũ. Vui lòng cập nhật lên phiên bản mới nhất từ App Store/CH Play...'
  },
  {
    id: 'INT-003',
    type: 'call',
    customerName: 'Lê Văn C', 
    customerEmail: 'le.van.c@email.com',
    subject: 'Khiếu nại về chất lượng dịch vụ',
    time: '16:45',
    timestamp: '2025-08-01T16:45:00Z',
    status: 'completed',
    priority: 'high',
    agent: 'Agent Linh',
    assignedAgent: 'Agent Linh',
    tags: ['complaint', 'quality'],
    channel: 'voice',
    source: 'Hotline Khiếu nại (1900-5678)', 
    duration: '00:08:22',
    // Call recording data
    recording: {
      url: '/recordings/call-INT-003.wav',
      duration: 502, // 08:22 in seconds
      quality: 'high',
      fileSize: '8.5 MB'
    }
  },
  {
    id: 'INT-004',
    type: 'email',
    customerName: 'Suspicious Sender',
    customerEmail: 'fake.email@suspicious-domain.xyz',
    subject: 'Khiếu nại về chất lượng dịch vụ',
    time: '11:20',
    timestamp: '2025-08-01T11:20:00Z',
    status: 'escalated',
    priority: 'urgent',
    agent: 'Agent Nga',
    assignedAgent: 'Agent Nga',
    tags: ['complaint', 'spam'],
    emailType: 'spam',
    channel: 'email',
    source: 'Email Support (support@company.com)',
    duration: null,
    snippet: 'CẢNH BÁO: Email này có dấu hiệu spam. Nội dung yêu cầu cung cấp thông tin tài khoản và mật khẩu. Đã chuyển cho bộ phận bảo mật xử lý...'
  },
  {
    id: 'INT-005',
    type: 'email',
    customerName: 'Nguyễn Văn C',
    customerEmail: 'nguyen.van.c@email.com',
    subject: 'Yêu cầu hóa đơn VAT',
    time: '08:30',
    timestamp: '2025-08-01T08:30:00Z',
    status: 'new',
    priority: 'medium',
    agent: null,
    assignedAgent: null, // Chưa được phân bổ
    tags: ['billing', 'invoice'],
    emailType: 'inbound',
    channel: 'email',
    source: 'Email Billing (billing@company.com)',
    duration: null,
    snippet: 'Kính gửi Phòng kế toán, tôi cần xuất hóa đơn VAT cho giao dịch chuyển tiền quốc tế mã số TRX-2024-08-001 thực hiện ngày 28/07/2024. Vui lòng gửi hóa đơn về email này trong vòng 3 ngày làm việc...'
  },
  {
    id: 'INT-006',
    type: 'email',
    customerName: 'Lê Thị D',
    customerEmail: 'le.thi.d@company.com',
    subject: 'Cảm ơn về dịch vụ hỗ trợ tuyt vời',
    time: '15:45',
    timestamp: '2025-07-31T15:45:00Z',
    status: 'completed',
    priority: 'low',
    agent: 'Agent Mai',
    assignedAgent: 'Agent Mai',
    tags: ['feedback', 'positive'],
    emailType: 'inbound',
    channel: 'email',
    source: 'Email Support (support@company.com)',
    duration: '00:05:12',
    snippet: 'Kính gửi Ngân hàng, tôi xin gửi lời cảm ơn chân thành đến Agent Mai đã hỗ trợ tôi kịp thời trong việc mở khóa thẻ tín dụng bị khóa do nhập sai PIN. Thái độ phục vụ chuyên nghiệp, nhiệt tình. Xin chúc Ngân hàng ngày càng phát triển!'
  },
  {
    id: 'INT-007',
    type: 'call',
    customerName: 'Phạm Thị E',
    customerEmail: 'pham.thi.e@email.com',
    subject: 'Khiếu nại về chất lượng sản phẩm',
    time: '13:20',
    timestamp: '2025-08-01T13:20:00Z',
    status: 'in-progress',
    priority: 'urgent',
    agent: 'Agent Tung',
    assignedAgent: 'Agent Tung',
    tags: ['complaint', 'product'],
    channel: 'voice',
    source: 'Hotline Khiếu nại (1900-5678)',
    duration: null,
    isVIP: true,
    direction: 'inbound'
  },
  {
    id: 'INT-008',
    type: 'chat',
    customerName: 'Hoàng Văn F',
    customerEmail: 'hoang.van.f@email.com',
    subject: 'Hỏi giá sản phẩm mới',
    time: '11:30',
    timestamp: '2025-08-01T11:30:00Z',
    status: 'in-progress',
    priority: 'medium',
    agent: 'Agent Duc',
    assignedAgent: 'Agent Duc',
    tags: ['inquiry', 'pricing'],
    channel: 'chat',
    source: 'Zalo Official Account',
    duration: '00:15:30',
    chatSLA: {
      status: 'within-sla',
      firstResponseTime: '45s',
      waitingSeconds: 30,
      slaThresholdMinutes: 5
    }
  },
  {
    id: 'INT-009',
    type: 'chat',
    customerName: 'Võ Thị G',
    customerEmail: 'vo.thi.g@email.com',
    subject: 'Hướng dẫn sử dụng dịch vụ',
    time: '14:15',
    timestamp: '2025-07-31T14:15:00Z',
    status: 'completed',
    priority: 'low',
    agent: 'Agent Linh',
    assignedAgent: 'Agent Linh',
    tags: ['support', 'tutorial'],
    channel: 'chat',
    source: 'Website Livechat',
    duration: '00:20:45',
    chatSLA: {
      status: 'within-sla',
      firstResponseTime: '1m 20s',
      slaThresholdMinutes: 5
    }
  },
  // More chat interactions with varying SLA statuses
  {
    id: 'INT-CHAT-001',
    type: 'chat',
    customerName: 'Nguyễn Minh Tú',
    customerEmail: 'nguyen.minh.tu@email.com',
    subject: 'Tra cứu khoản vay',
    time: '09:15',
    timestamp: '2025-08-01T09:15:00Z',
    status: 'in-progress',
    priority: 'high',
    agent: 'Agent Lan',
    assignedAgent: 'Agent Lan',
    tags: ['loan', 'inquiry'],
    channel: 'chat',
    source: 'Facebook Messenger',
    duration: '00:08:30',
    chatSLA: {
      status: 'not-responded',
      waitingSeconds: 245,
      slaRemainingSeconds: 55,
      slaThresholdMinutes: 5
    }
  },
  {
    id: 'INT-CHAT-002',
    type: 'chat',
    customerName: 'Trần Văn Phúc',
    customerEmail: 'tran.van.phuc@email.com',
    subject: 'Yêu cầu giải ngân',
    time: '10:20',
    timestamp: '2025-08-01T10:20:00Z',
    status: 'in-progress',
    priority: 'urgent',
    agent: 'Agent Mai',
    assignedAgent: 'Agent Mai',
    tags: ['loan', 'disbursement', 'urgent'],
    channel: 'chat',
    source: 'Zalo Official Account',
    duration: '00:12:15',
    chatSLA: {
      status: 'breached',
      firstResponseTime: '6m 30s',
      waitingSeconds: 180,
      slaThresholdMinutes: 5
    }
  },
  {
    id: 'INT-CHAT-003',
    type: 'chat',
    customerName: 'Lê Thị Hương',
    customerEmail: 'le.thi.huong@email.com',
    subject: 'Khóa thẻ tạm thời',
    time: '08:45',
    timestamp: '2025-08-01T08:45:00Z',
    status: 'in-progress',
    priority: 'high',
    agent: 'Agent Duc',
    assignedAgent: 'Agent Duc',
    tags: ['card', 'security'],
    channel: 'chat',
    source: 'Website Livechat',
    duration: '00:05:20',
    chatSLA: {
      status: 'near-breach',
      waitingSeconds: 210,
      slaRemainingSeconds: 90,
      slaThresholdMinutes: 5
    }
  },
  {
    id: 'INT-CHAT-004',
    type: 'chat',
    customerName: 'Phạm Quốc Anh',
    customerEmail: 'pham.quoc.anh@email.com',
    subject: 'Hỏi về lãi suất',
    time: '09:30',
    timestamp: '2025-08-01T09:30:00Z',
    status: 'in-progress',
    priority: 'medium',
    agent: 'Agent Linh',
    assignedAgent: 'Agent Linh',
    tags: ['inquiry', 'interest-rate'],
    channel: 'chat',
    source: 'Facebook Messenger',
    duration: '00:10:15',
    chatSLA: {
      status: 'within-sla',
      firstResponseTime: '25s',
      waitingSeconds: 15,
      slaThresholdMinutes: 5
    }
  },
  {
    id: 'INT-CHAT-005',
    type: 'chat',
    customerName: 'Võ Minh Khoa',
    customerEmail: 'vo.minh.khoa@email.com',
    subject: 'Khiếu nại phí dịch vụ',
    time: '11:05',
    timestamp: '2025-08-01T11:05:00Z',
    status: 'in-progress',
    priority: 'urgent',
    agent: 'Agent Nga',
    assignedAgent: 'Agent Nga',
    tags: ['complaint', 'fee'],
    channel: 'chat',
    source: 'Zalo Official Account',
    duration: '00:07:40',
    chatSLA: {
      status: 'waiting',
      waitingSeconds: 320,
      slaRemainingSeconds: -20,
      slaThresholdMinutes: 5
    }
  },
  {
    id: 'INT-CHAT-006',
    type: 'chat',
    customerName: 'Đỗ Thị Lan Anh',
    customerEmail: 'do.thi.lan.anh@email.com',
    subject: 'Kích hoạt thẻ mới',
    time: '07:50',
    timestamp: '2025-08-01T07:50:00Z',
    status: 'completed',
    priority: 'medium',
    agent: 'Agent Tung',
    assignedAgent: 'Agent Tung',
    tags: ['card', 'activation'],
    channel: 'chat',
    source: 'Website Livechat',
    duration: '00:04:30',
    chatSLA: {
      status: 'within-sla',
      firstResponseTime: '18s',
      slaThresholdMinutes: 5
    }
  },
  {
    id: 'INT-010',
    type: 'call',
    customerName: 'Đặng Văn H',
    customerEmail: 'dang.van.h@email.com',
    subject: 'Báo lỗi hệ thống',
    time: '10:05',
    timestamp: '2025-08-01T10:05:00Z',
    status: 'resolved',
    priority: 'high',
    agent: 'Agent Nga',
    assignedAgent: 'Agent Nga',
    tags: ['technical', 'bug'],
    channel: 'voice',
    source: 'Hotline Kỹ thuật (1900-9999)',
    duration: '00:35:20',
    // Call recording data
    recording: {
      url: '/recordings/call-INT-010.wav',
      duration: 2120, // 35:20 in seconds
      quality: 'medium',
      fileSize: '28.4 MB'
    }
  },
  {
    id: 'INT-011',
    type: 'email',
    customerName: 'Nguyễn Thị Lan',
    customerEmail: 'nguyen.thi.lan@email.com',
    subject: 'Re: Re: Yêu cầu đổi trả sản phẩm',
    time: '16:20',
    timestamp: '2025-08-01T16:20:00Z',
    status: 'in-progress',
    priority: 'high',
    agent: 'Agent Duc',
    assignedAgent: 'Agent Duc',
    tags: ['return', 'exchange'],
    emailType: 'thread',
    channel: 'email',
    source: 'Email Support (support@company.com)',
    duration: null,
    snippet: 'Kính gửi Quý Khách, về yêu cầu đổi thẻ ATM do hỏng chip. Chúng tôi đã tiếp nhận yêu cầu của Quý Khách. Thẻ mới sẽ được làm trong 5-7 ngày làm việc. Quý Khách có thể nhận tại Chi nhánh hoặc gửi qua đường bưu điện...'
  }
];

// Sample missed calls for demo
const sampleMissedCalls = [
  {
    customerPhone: '+84 912 345 678',
    customerName: 'Nguyễn Văn A',
    customerEmail: 'nguyen.van.a@email.com',
    missedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    reason: 'timeout' as const,
    isVIP: false,
    source: 'Hotline Chăm sóc KH (1900-1234)',
    priority: 'medium' as const
  },
  {
    customerPhone: '+84 987 654 321',
    customerName: 'Trần Thị B',
    customerEmail: 'tran.thi.b@email.com',
    missedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    reason: 'not-ready' as const,
    isVIP: true,
    source: 'Hotline VIP (1900-5555)',
    priority: 'urgent' as const
  },
  {
    customerPhone: '+84 901 234 567',
    customerName: 'Lê Văn C',
    missedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    reason: 'not-ready' as const,
    isVIP: false,
    source: 'Hotline Tổng đài (1900-9999)',
    priority: 'high' as const
  }
];

// Sample notifications for demo
const sampleNotifications = {
  ticketAssignment: {
    ticketId: 'TKT-001',
    ticketNumber: 'TKT-001',
    customerName: 'Nguyễn Văn Test',
    subject: 'Lỗi đăng nhập',
    assignedBy: 'Supervisor Minh',
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    classification: 'bug',
    classificationLabel: 'Báo lỗi',
    category: 'Báo lỗi', // Fix: add required category property
    priority: 'high' as const
  },
  ticketDue: {
    ticketId: 'TKT-002',
    ticketNumber: 'TKT-002',
    customerName: 'Trần Thị Test',
    subject: 'Lỗi hiển thị',
    dueDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    timeUntilDue: 30,
    classification: 'bug',
    classificationLabel: 'Báo lỗi',
    category: 'Báo lỗi', // Fix: add required category property
    priority: 'urgent' as const
  },
  systemAlert: {
    alertType: 'maintenance' as const,
    affectedSystems: ['Email System', 'CRM'],
    duration: '2 hours',
    actionRequired: true,
    priority: 'high' as const
  },
  scheduleReminder: {
    eventType: 'break' as const,
    eventTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    duration: 15,
    location: 'Break Room',
    priority: 'medium' as const
  }
};

// Inner component that uses call context
function AppContent() {
  // States
  const [selectedInteraction, setSelectedInteraction] = useState<any>(defaultInteraction);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [rightPanelView, setRightPanelView] = useState<'customer' | 'ticket'>('customer');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [demoControlsCollapsed, setDemoControlsCollapsed] = useState(true);
  const [emailReplyDialogOpen, setEmailReplyDialogOpen] = useState(false);
  const [customerDefaultTab, setCustomerDefaultTab] = useState('tickets');
  const [interactions, setInteractions] = useState(mockInteractionsList);

  // Call context
  const { 
    currentCall, 
    isCallWidgetVisible, 
    startCall, 
    endCall,
    showCallWidget,
    hideCallWidget 
  } = useCall();

  // Enhanced agent status context
  const { agentState } = useEnhancedAgentStatus();

  // Notifications context
  const { 
    addMissedCall, 
    addTicketAssignment, 
    addTicketDue, 
    addSystemAlert, 
    addScheduleReminder 
  } = useNotifications();

  // Add some initial demo data on mount
  useEffect(() => {
    // Add some historical missed calls
    setTimeout(() => {
      sampleMissedCalls.forEach((call, index) => {
        setTimeout(() => {
          addMissedCall({
            ...call,
            missedAt: new Date(Date.now() - (index + 1) * 10 * 60 * 1000) // Stagger by 10 minutes
          });
        }, index * 500); // Stagger creation by 500ms
      });
    }, 1000); // Wait 1 second after mount
  }, [addMissedCall]);

  const toggleLeftPanel = () => {
    setLeftPanelCollapsed(!leftPanelCollapsed);
  };

  const toggleRightPanel = () => {
    setRightPanelCollapsed(!rightPanelCollapsed);
  };

  const toggleDemoControls = () => {
    setDemoControlsCollapsed(!demoControlsCollapsed);
  };

  const handleNavigateToInteraction = (interactionId: string) => {
    const targetInteraction = interactions.find(item => item.id === interactionId);
    
    if (targetInteraction) {
      setSelectedInteraction(targetInteraction);
      
      if (leftPanelCollapsed) {
        setLeftPanelCollapsed(false);
      }
      
      setTimeout(() => {
        const element = document.querySelector(`[data-interaction-id="${interactionId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  };

  const handleStartCall = (interaction: any) => {
    startCall({
      customerName: interaction.customerName,
      customerPhone: '+84 123 456 789',
      customerEmail: interaction.customerEmail,
      status: 'connected',
      source: interaction.source || 'Unknown',
      avatar: '👤',
      interactionId: interaction.id
    });
  };

  const handleCallTransfer = () => {
    setTransferDialogOpen(true);
  };

  const handleCallSurvey = () => {
    console.log('Transferring to survey...');
  };

  const handleMaximizeCall = () => {
    if (currentCall?.interactionId) {
      const callInteraction = interactions.find(
        item => item.id === currentCall.interactionId
      );
      if (callInteraction) {
        setSelectedInteraction(callInteraction);
      }
    }
  };

  const handleChannelFilter = (channel: ChannelFilter) => {
    setChannelFilter(channel);
  };

  // Handle missed call details view
  const handleViewCallDetails = (callId: string) => {
    console.log('Viewing missed call details:', callId);
    // You can implement navigation to a specific missed call detail view
  };

  // Handle callback from missed call
  const handleCallBack = (interaction: any) => {
    console.log('Calling back missed call:', interaction);
    
    // Mark as called back and move to closed status
    setInteractions(prev => 
      prev.map(item => 
        item.id === interaction.id 
          ? { 
              ...item,
              direction: 'outbound',
              calledBack: true, 
              calledBackTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              status: 'completed', // Move to closed tab
              assignedAgent: agentState.agentName, // Assign to current agent
              agent: agentState.agentName // Fix: ensure agent property is set
            } as any
          : item
      )
    );

    // Start a call with the customer
    const callData = {
      type: 'outbound' as const,
      status: 'ringing' as const, // Fix: use 'ringing' instead of 'connecting'
      customerName: interaction.customerName || 'Khách hàng',
      customerPhone: interaction.customerPhone || '',
      startTime: new Date().toISOString(),
      direction: 'outbound' as const,
      source: 'callback' // Fix: add required source property
    };
    
    startCall(callData);
  };

  // Handle ticket viewing from notifications
  const handleViewTicket = (ticketId: string) => {
    const ticket = mockTickets[ticketId as keyof typeof mockTickets];
    if (ticket) {
      setSelectedTicket(ticket);
      setRightPanelView('ticket');
      // Expand right panel if it was collapsed
      if (rightPanelCollapsed) {
        setRightPanelCollapsed(false);
      }
    }
  };

  // Handle ticket updates
  const handleUpdateTicket = (ticketId: string, updates: any) => {
    console.log('Updating ticket:', ticketId, updates);
    // In a real app, this would make an API call
    // For demo, we can update the local state
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, ...updates });
    }
  };

  // Handle ticket comments
  const handleAddTicketComment = (ticketId: string, comment: string, isInternal = false) => {
    console.log('Adding comment to ticket:', ticketId, comment, isInternal);
    // In a real app, this would make an API call
    const newComment = {
      id: `comment-${Date.now()}`,
      author: 'Agent Tung',
      content: comment,
      timestamp: new Date(),
      type: 'comment' as const,
      isInternal
    };
    
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({
        ...selectedTicket,
        comments: [...selectedTicket.comments, newComment],
        updatedAt: new Date()
      });
    }
  };

  // Handle closing ticket view
  const handleCloseTicketView = () => {
    setSelectedTicket(null);
    setRightPanelView('customer');
  };

  // Handle creating new ticket from interaction
  const handleCreateTicket = (ticketData: any) => {
    console.log('New ticket created:', ticketData);
    // In a real app, this would save the ticket to backend
    // For demo purposes, we can add it to local ticket list or show it in CustomerInfo
    
    // Switch to ticket view to show the newly created ticket
    setSelectedTicket(ticketData);
    setRightPanelView('ticket');
    
    // Expand right panel if it was collapsed
    if (rightPanelCollapsed) {
      setRightPanelCollapsed(false);
    }
  };

  // Handle creating ticket from CustomerInfo
  const handleCreateTicketFromCustomerInfo = (ticketData: any) => {
    console.log('New ticket created from CustomerInfo:', ticketData);
    // Set the ticket as selected and switch to ticket view
    setSelectedTicket(ticketData);
    setRightPanelView('ticket');
    
    // Expand right panel if it was collapsed
    if (rightPanelCollapsed) {
      setRightPanelCollapsed(false);
    }
  };

  // Auto-switch to tickets tab when new interaction is selected
  const handleSelectInteraction = (interaction: any) => {
    setSelectedInteraction(interaction);
    // Set default tab to tickets when a new interaction is selected
    setCustomerDefaultTab('tickets');
    
    // Ensure customer info view is shown (not ticket detail view)
    setRightPanelView('customer');
    
    // Clear any selected ticket when switching to new interaction
    setSelectedTicket(null);
  };

  // Demo: Simulate missed call
  const simulateMissedCall = () => {
    const randomCall = sampleMissedCalls[Math.floor(Math.random() * sampleMissedCalls.length)];
    addMissedCall({
      ...randomCall,
      missedAt: new Date() // Use current time for demo
    });
  };

  // Demo: Simulate VIP missed call
  const simulateVIPMissedCall = () => {
    addMissedCall({
      customerPhone: '+84 999 888 777',
      customerName: 'Bà Nguyễn Thị VIP',
      customerEmail: 'vip.customer@email.com',
      missedAt: new Date(),
      reason: 'timeout',
      isVIP: true,
      source: 'Hotline VIP (1900-5555)',
      priority: 'urgent'
    });
  };

  // Demo: Simulate multiple missed calls for Not Ready warning
  const simulateMultipleMissedCalls = () => {
    const calls = [
      {
        customerPhone: '+84 111 222 333',
        customerName: 'Khách hàng 1',
        missedAt: new Date(Date.now() - 2 * 60 * 1000),
        reason: 'not-ready' as const,
        source: 'Hotline (1900-1234)',
        priority: 'medium' as const
      },
      {
        customerPhone: '+84 444 555 666',
        customerName: 'Khách hàng 2',
        missedAt: new Date(Date.now() - 5 * 60 * 1000),
        reason: 'not-ready' as const,
        source: 'Hotline (1900-1234)',
        priority: 'high' as const
      },
      {
        customerPhone: '+84 777 888 999',
        customerName: 'Khách hàng 3',
        missedAt: new Date(Date.now() - 8 * 60 * 1000),
        reason: 'not-ready' as const,
        source: 'Hotline (1900-1234)',
        priority: 'medium' as const
      }
    ];

    calls.forEach(call => addMissedCall(call));
  };

  // Demo: Other notification types
  const simulateTicketAssignment = () => {
    addTicketAssignment(sampleNotifications.ticketAssignment);
  };

  const simulateTicketDue = () => {
    addTicketDue(sampleNotifications.ticketDue);
  };

  const simulateSystemAlert = () => {
    addSystemAlert(sampleNotifications.systemAlert);
  };

  const simulateScheduleReminder = () => {
    addScheduleReminder(sampleNotifications.scheduleReminder);
  };

  // Keyboard shortcuts
  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
          break;
        case '1':
          e.preventDefault();
          setChannelFilter('voice');
          break;
        case '2':
          e.preventDefault();
          setChannelFilter('email');
          break;
        case '3':
          e.preventDefault();
          setChannelFilter('chat');
          break;
        case '0':
          e.preventDefault();
          setChannelFilter('all');
          break;
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-muted">
      <EnhancedAgentHeader 
        interactions={interactions as Interaction[]}
        onChannelFilter={handleChannelFilter}
        activeChannelFilter={channelFilter}
        onViewCallDetails={handleViewCallDetails}
        onCallBack={handleCallBack}
        onViewTicket={handleViewTicket}
      />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Interaction List */}
        <div className={`${
          leftPanelCollapsed ? 'w-0' : 'w-80'
        } transition-all duration-300 overflow-hidden`}>
          <InteractionList 
            selectedId={selectedInteraction?.id}
            onSelectInteraction={handleSelectInteraction}
            interactions={interactions}
            channelFilter={channelFilter}
            onChannelFilterChange={setChannelFilter}
            onCallBack={handleCallBack}
          />
        </div>

        {/* Left Panel Toggle */}
        <div className="flex flex-col justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLeftPanel}
            className="h-12 w-6 rounded-none border-r border-border bg-background hover:bg-muted/50"
          >
            {leftPanelCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Center Panel - Interaction Detail */}
        <div className="flex-1 flex flex-col">
          <InteractionDetail 
            interaction={selectedInteraction}
            onTransferCall={() => setTransferDialogOpen(true)}
            onCreateTicket={handleCreateTicket}
          />
        </div>

        {/* Right Panel Toggle */}
        <div className="flex flex-col justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleRightPanel}
            className="h-12 w-6 rounded-none border-l border-border bg-background hover:bg-muted/50"
          >
            {rightPanelCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Right Panel - Customer Info with integrated Ticket tab */}
        <div className={`${
          rightPanelCollapsed ? 'w-0' : 'w-[400px]'
        } transition-all duration-300 overflow-hidden flex flex-col`}>
          {/* Right Panel Header with Toggle (only show when ticket detail is opened separately) */}
          {selectedTicket && rightPanelView === 'ticket' && (
            <div className="flex-shrink-0 bg-muted border-l border-b border-border p-2">
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRightPanelView('customer')}
                  className="h-7 text-xs"
                >
                  <User className="h-3 w-3 mr-1" />
                  Khách hàng
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setRightPanelView('ticket')}
                  className="h-7 text-xs"
                >
                  <Ticket className="h-3 w-3 mr-1" />
                  Ticket #{selectedTicket.number}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseTicketView}
                  className="h-7 w-7 p-0 ml-auto"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Right Panel Content */}
          <div className="flex-1 overflow-hidden">
            {rightPanelView === 'ticket' && selectedTicket ? (
              <TicketDetail 
                ticket={selectedTicket}
                onClose={handleCloseTicketView}
                onUpdateTicket={handleUpdateTicket}
                onAddComment={handleAddTicketComment}
              />
            ) : (
              <CustomerInfo 
                interaction={selectedInteraction} 
                onNavigateToInteraction={handleNavigateToInteraction}
                onViewTicket={handleViewTicket}
                defaultTab={customerDefaultTab}
                onCreateTicket={handleCreateTicketFromCustomerInfo}
              />
            )}
          </div>
        </div>
      </div>

      {/* Floating Widgets */}
      <FloatingCallWidget
        callData={currentCall}
        isVisible={isCallWidgetVisible}
        onHangup={endCall}
        onTransfer={handleCallTransfer}
        onSurvey={handleCallSurvey}
        onMaximize={handleMaximizeCall}
        onHide={hideCallWidget}
      />

      {/* Floating Agent Status Widget (when panels collapsed) */}
      {leftPanelCollapsed && rightPanelCollapsed && (
        <AgentStatusWidget position="floating" />
      )}

      {/* Dialogs */}
      <TransferCallDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        customerName={selectedInteraction?.customerName || ''}
      />

      {/* Keyboard Shortcuts Help */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Keyboard className="h-5 w-5" />
                <h3 className="text-lg font-medium">Phím tắt</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKeyboardShortcuts(false)}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Agent Status</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Ready All</span>
                      <kbd className="px-1 bg-muted rounded">Ctrl+R</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Not Ready</span>
                      <kbd className="px-1 bg-muted rounded">Ctrl+N</kbd>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Channel Filter</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Calls</span>
                      <kbd className="px-1 bg-muted rounded">Ctrl+1</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Emails</span>
                      <kbd className="px-1 bg-muted rounded">Ctrl+2</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Chats</span>
                      <kbd className="px-1 bg-muted rounded">Ctrl+3</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>All</span>
                      <kbd className="px-1 bg-muted rounded">Ctrl+0</kbd>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Show shortcuts</span>
                  <kbd className="px-1 bg-muted rounded">Ctrl+?</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Controls - Collapsible */}
      <div className="fixed bottom-6 left-6 z-40 max-w-xs">
        <div className="bg-background rounded-lg shadow-lg border transition-all duration-300 ease-in-out">
          {/* Header with Toggle Button */}
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <h4 className="text-sm font-medium text-foreground">Demo Controls</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDemoControls}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              {demoControlsCollapsed ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            demoControlsCollapsed ? 'max-h-0' : 'max-h-[600px]'
          }`}>
            <div className="p-3 space-y-2">
              {/* Call Demo */}
              <Button
                onClick={() => handleStartCall(selectedInteraction)}
                className="bg-green-600 hover:bg-green-700 text-white shadow-sm w-full"
                size="sm"
              >
                <Phone className="h-4 w-4 mr-2" />
                Start Call
              </Button>

              {/* Missed Call Demos */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={simulateMissedCall}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                  size="sm"
                >
                  <PhoneMissed className="h-3 w-3 mr-1" />
                  Missed Call
                </Button>
                <Button
                  onClick={simulateVIPMissedCall}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                  size="sm"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  VIP Call
                </Button>
              </div>

              <Button
                onClick={simulateMultipleMissedCalls}
                variant="outline"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 w-full text-xs"
                size="sm"
              >
                3 Missed Calls
              </Button>

              {/* Other Notification Types */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={simulateTicketAssignment}
                  variant="outline"
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 text-xs"
                  size="sm"
                >
                  <Ticket className="h-3 w-3 mr-1" />
                  Ticket
                </Button>
                <Button
                  onClick={simulateScheduleReminder}
                  variant="outline"
                  className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 text-xs"
                  size="sm"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Schedule
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={simulateTicketDue}
                  variant="outline"
                  className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 text-xs"
                  size="sm"
                >
                  Due Soon
                </Button>
                <Button
                  onClick={simulateSystemAlert}
                  variant="outline"
                  className="bg-muted/50 border-border text-foreground/80 hover:bg-muted text-xs"
                  size="sm"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  System
                </Button>
              </div>

              <Button
                onClick={() => setShowKeyboardShortcuts(true)}
                variant="outline"
                className="bg-background border-border w-full text-xs"
                size="sm"
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Shortcuts
              </Button>

              {/* Core BFSI Demo */}
              <div className="border-t pt-2 mt-2">
                <p className="text-xs text-muted-foreground mb-2">Core BFSI Demo:</p>
                <Button
                  onClick={() => {
                    // Switch to Core BFSI tab
                    const tabElement = document.querySelector('[value="bfsi"]');
                    if (tabElement) {
                      (tabElement as HTMLElement).click();
                    }
                  }}
                  variant="outline"
                  className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 w-full text-xs"
                  size="sm"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  View BFSI
                </Button>
              </div>

              {/* Ticket Demo Controls */}
              <div className="border-t pt-2 mt-2">
                <p className="text-xs text-muted-foreground mb-2">Ticket Demo:</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button
                    onClick={() => handleViewTicket('TKT-001')}
                    variant="outline"
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 text-xs"
                    size="sm"
                  >
                    <Ticket className="h-3 w-3 mr-1" />
                    TKT-001
                  </Button>
                  <Button
                    onClick={() => handleViewTicket('TKT-002')}
                    variant="outline"
                    className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 text-xs"
                    size="sm"
                  >
                    <Ticket className="h-3 w-3 mr-1" />
                    TKT-002
                  </Button>
                </div>
                <Button
                  onClick={() => setCustomerDefaultTab('tickets')}
                  variant="outline"
                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 w-full text-xs"
                  size="sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Focus Tickets Tab
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <EnhancedAgentStatusProvider agentId="AGT001" agentName="Agent Tung">
          <CallProvider>
            <AppContent />
            <Toaster position="top-right" />
          </CallProvider>
        </EnhancedAgentStatusProvider>
      </NotificationProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}