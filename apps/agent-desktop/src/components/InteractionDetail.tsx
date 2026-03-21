import { useState, useEffect } from "react";
import { useAuth } from '@/contexts/AuthContext';
import { Interaction } from './useInteractionStats';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { EmailReplyInline } from './EmailReplyInline';
import { EmailThread } from './EmailThread';
import { KnowledgeBaseSearch } from './KnowledgeBaseSearch';
import { AIAssistantChat } from './AIAssistantChat';
import { CallRecordingPlayer } from './CallRecordingPlayer';
import { CallTimeline } from './CallTimeline';
import { CallNotes } from './CallNotes';
import { InformationQuery } from './InformationQuery';
import { CustomerSelection } from './CustomerSelection';
import { Separator } from './ui/separator';
import { ChatTimeline, ChatSession, ChatMessage } from './ChatTimeline';
import { ChatSessionHeader } from './ChatSessionHeader';
import { SLAStatus } from './ChatSLABadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { useCreateTicket } from '../hooks/useTickets';
import { toast } from 'sonner';
import {
  Phone,
  PhoneOff, 
  Mic, 
  MicOff, 
  PhoneForwarded, 
  Send, 
  Paperclip, 
  Reply, 
  ReplyAll,
  Forward, 
  FileText, 
  Plus,
  MessageCircle,
  Lightbulb,
  Search,
  Users,
  Maximize2,
  Minimize2,
  Mail,
  Calendar,
  User,
  Save,
  AlertTriangle,
  Download,
  Eye,
  Image,
  File,
  CheckCircle,
  Edit,
  Archive,
  Trash2,
  MoreHorizontal,
  Shield,
  AlertCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Star,
  Flag,
  X,
  ClipboardList,
  Headphones,
  BookOpen,
  PhoneMissed,
  PhoneCall,
  Crown,
  ChevronDown,
  ChevronUp,
  UserCircle,
  Banknote,
  CreditCard,
  Wallet,
  Building,
  Smartphone,
  QrCode,
  Store
} from "lucide-react";

interface InteractionDetailProps {
  interaction: Interaction;
  onTransferCall?: () => void;
  onCreateTicket?: (ticketData: any) => void;
}

// Enhanced email data with email threads
const getEmailData = (interaction: any) => {
  // Different email scenarios based on interaction ID
  switch (interaction?.id) {
    case '2': // Email thread with multiple replies - Warranty inquiry
      return {
        type: 'thread',
        isSpam: false,
        isStarred: true,
        isImportant: true,
        labels: ['Support', 'Warranty', 'In Progress'],
        threadMessages: [
          {
            id: 'msg-1',
            from: {
              name: interaction.customerName,
              email: interaction.customerEmail,
              avatar: '👤'
            },
            to: [
              { name: 'Support Team', email: 'support@company.com' }
            ],
            subject: 'Hỏi về chính sách bảo hành',
            date: '2025-07-29',
            time: '10:25',
            content: `Kính gửi bộ phận hỗ trợ,

Tôi muốn hỏi về chính sách bảo hành của sản phẩm Laptop Gaming XYZ Model 2024 (Serial: LT2024ABC123) mà tôi đã mua ngày 15/07/2025.

Hiện tại sản phẩm có vấn đề màn hình bị nhấp nháy và đôi khi không hiển thị. Tôi đã đính kèm video minh họa lỗi và hình ảnh hóa đơn mua hàng.

Mong anh/chị hướng dẫn quy trình bảo hành và thời gian xử lý.

Trân trọng,
${interaction.customerName}
SĐT: 0123 456 789`,
            attachments: [
              {
                id: 'att1',
                name: 'Hoa_don_mua_hang.pdf',
                size: 245760,
                type: 'application/pdf'
              },
              {
                id: 'att2',
                name: 'Loi_man_hinh_video.mp4',
                size: 15728640,
                type: 'video/mp4'
              }
            ],
            direction: 'received'
          },
          {
            id: 'msg-2',
            from: {
              name: 'Agent Mai',
              email: 'mai.nguyen@company.com',
              avatar: '👩‍💼'
            },
            to: [
              { name: interaction.customerName, email: interaction.customerEmail }
            ],
            cc: [
              { name: 'Technical Team', email: 'tech@company.com' }
            ],
            subject: 'Re: Hỏi về chính sách bảo hành',
            date: '2025-07-29',
            time: '14:30',
            content: `Kính chào ${interaction.customerName},

Cảm ơn anh/chị đã liên hệ với chúng tôi về vấn đề bảo hành.

Sau khi xem xét hồ sơ và video anh/chị gửi, chúng tôi xác nhận sản phẩm của anh/chị vẫn còn trong thời gian bảo hành (12 tháng kể từ ngày mua).

Để tiến hành bảo hành, anh/chị vui lòng:
1. Mang sản phẩm đến trung tâm bảo hành gần nhất
2. Xuất trình hóa đơn và tem bảo hành
3. Thời gian xử lý dự kiến: 3-5 ngày làm việc

Danh sách trung tâm bảo hành đã được đính kèm.

Trân trọng,
Agent Mai
Phòng Chăm sóc Khách hàng`,
            quotedContent: `> Kính gửi bộ phận hỗ trợ,
> 
> Tôi muốn hỏi về chính sách bảo hành của sản phẩm Laptop Gaming XYZ Model 2024 (Serial: LT2024ABC123) mà tôi đã mua ngày 15/07/2025.`,
            attachments: [
              {
                id: 'att3',
                name: 'Danh_sach_trung_tam_bao_hanh.pdf',
                size: 512000,
                type: 'application/pdf'
              }
            ],
            direction: 'sent'
          },
          {
            id: 'msg-3',
            from: {
              name: interaction.customerName,
              email: interaction.customerEmail,
              avatar: '👤'
            },
            to: [
              { name: 'Agent Mai', email: 'mai.nguyen@company.com' }
            ],
            subject: 'Re: Hỏi về chính sách bảo hành',
            date: '2025-07-30',
            time: '09:15',
            content: `Chào Agent Mai,

Cảm ơn anh/chị đã phản hồi nhanh chóng.

Tôi có thể mang sản phẩm đến trung tâm bảo hành vào cuối tuần được không? Vì trong tuần tôi bận công việc.

Ngoài ra, nếu sản phẩm không sửa được thì có thể đổi sản phẩm mới không ạ?

Trân trọng,
${interaction.customerName}`,
            quotedContent: `> Để tiến hành bảo hành, anh/chị vui lòng:
> 1. Mang sản phẩm đến trung tâm bảo hành gần nhất
> 2. Xuất trình hóa đơn và tem bảo hành
> 3. Thời gian xử lý dự kiến: 3-5 ngày làm việc`,
            direction: 'received'
          },
          {
            id: 'msg-4',
            from: {
              name: 'Agent Mai',
              email: 'mai.nguyen@company.com',
              avatar: '👩‍💼'
            },
            to: [
              { name: interaction.customerName, email: interaction.customerEmail }
            ],
            subject: 'Re: Hỏi về chính sách bảo hành',
            date: '2025-07-30',
            time: '10:25',
            content: `Kính chào ${interaction.customerName},

Anh/chị hoàn toàn có thể mang sản phẩm đến vào cuối tuần. Trung tâm bảo hành làm việc từ thứ 2 đến chủ nhật, 8:00-17:00.

Về việc đổi sản phẩm mới: Nếu sản phẩm không sửa được sau 3 lần bảo hành hoặc có lỗi nghiêm trọng, chúng tôi sẽ xem xét đổi sản phẩm tương đương theo chính sách.

Để thuận tiện cho anh/chị, tôi sẽ tạo ticket hỗ trợ và gửi mã số để anh/chị tham khảo khi đến trung tâm.

Mã ticket: #WR240730001

Trân trọng,
Agent Mai`,
            quotedContent: `> Tôi có thể mang sản phẩm đến trung tâm bảo hành vào cuối tuần được không? Vì trong tuần tôi bận công việc.
> 
> Ngoài ra, nếu sản phẩm không sửa được thì có thể đổi sản phẩm mới không ạ?`,
            direction: 'sent',
            isLatest: true
          }
        ]
      };

    case 'INT-011': // Second email thread - Return/Exchange request
      return {
        type: 'thread',
        isSpam: false,
        isStarred: false,
        isImportant: true,
        labels: ['Returns', 'Customer Service', 'High Priority'],
        threadMessages: [
          {
            id: 'msg2-1',
            from: {
              name: 'Nguyễn Thị Lan',
              email: 'nguyen.thi.lan@email.com',
              avatar: '👩'
            },
            to: [
              { name: 'Support Team', email: 'support@company.com' }
            ],
            subject: 'Yêu cầu đổi trả sản phẩm',
            date: '2025-07-28',
            time: '14:20',
            content: `Kính gửi anh/chị,

Tôi đã mua chiếc áo khoác màu đỏ size M (mã đơn hàng: #ORDER789) vào ngày 25/07/2025 nhưng khi nhận được thì size không vừa.

Tôi muốn đổi sang size L. Sản phẩm chưa sử dụng, còn nguyên tag và bao bì.

Mong anh/chị hướng dẫn thủ tục đổi size.

Trân trọng,
Nguyễn Thị Lan`,
            direction: 'received'
          },
          {
            id: 'msg2-2',
            from: {
              name: 'Agent Duc',
              email: 'duc.tran@company.com',
              avatar: '👨‍💼'
            },
            to: [
              { name: 'Nguyễn Thị Lan', email: 'nguyen.thi.lan@email.com' }
            ],
            subject: 'Re: Yêu cầu đổi trả sản phẩm',
            date: '2025-07-28',
            time: '15:45',
            content: `Kính chào chị Lan,

Cảm ơn chị đã liên hệ với chúng tôi.

Chúng tôi rất sẵn lòng hỗ trợ chị đổi size. Tuy nhiên, sau khi kiểm tra kho, size L của sản phẩm này hiện tại đã hết hàng.

Chị có thể lựa chọn:
1. Đổi sang màu khác size L (xanh navy hoặc đen)
2. Đổi sang sản phẩm tương tự khác
3. Hoàn tiền 100%

Chị vui lòng cho biết ý kiến để chúng tôi hỗ trợ tốt nhất.

Trân trọng,
Agent Duc`,
            quotedContent: `> Tôi đã mua chiếc áo khoác màu đỏ size M (mã đơn hàng: #ORDER789) vào ngày 25/07/2025 nhưng khi nhận được thì size không vừa.
> 
> Tôi muốn đổi sang size L. Sản phẩm chưa sử dụng, còn nguyên tag và bao bì.`,
            direction: 'sent'
          },
          {
            id: 'msg2-3',
            from: {
              name: 'Nguyễn Thị Lan',
              email: 'nguyen.thi.lan@email.com',
              avatar: '👩'
            },
            to: [
              { name: 'Agent Duc', email: 'duc.tran@company.com' }
            ],
            subject: 'Re: Yêu cầu đổi trả sản phẩm',
            date: '2025-08-01',
            time: '16:20',
            content: `Chào Agent Duc,

Tôi muốn đổi sang màu đen size L. Màu đen cũng đẹp không kém màu đỏ.

Khi nào có thể đổi được và tôi cần làm gì? Có phải mang sản phẩm đến cửa hàng không?

Cảm ơn anh đã tư vấn nhiệt tình.

Trân trọng,
Lan`,
            quotedContent: `> Chị có thể lựa chọn:
> 1. Đổi sang màu khác size L (xanh navy hoặc đen)
> 2. Đổi sang sản phẩm tương tự khác
> 3. Hoàn tiền 100%`,
            direction: 'received',
            isLatest: true
          }
        ]
      };

    case 'INT-001': // Outbound email - Agent reply
      return {
        type: 'outbound',
        direction: 'sent',
        isSpam: false,
        isStarred: true,
        isImportant: false,
        labels: ['Technical Support', 'Resolved'],
        from: {
          name: 'Agent Mai',
          email: 'mai.nguyen@company.com',
          avatar: '👩‍💼'
        },
        to: [
          { name: interaction.customerName, email: interaction.customerEmail }
        ],
        cc: [
          { name: 'Technical Team', email: 'tech@company.com' }
        ],
        subject: `Re: ${interaction.subject}`,
        date: '2025-07-30',
        time: '14:30',
        content: `Kính chào ${interaction.customerName},

Cảm ơn anh/chị đã liên hệ về vấn đề kỹ thuật.

Chúng tôi đã phân tích video và hình ảnh anh/chị cung cấp. Vấn đề màn hình nhấp nháy có thể do driver card đồ họa hoặc lỗi phần cứng.

Để giải quyết vấn đề này, chúng tôi đã:
1. Cập nhật driver mới nhất cho card đồ họa
2. Chạy diagnostic tool để kiểm tra phần cứng
3. Thực hiện clean installation cho hệ điều hành

Sản phẩm đã được kiểm tra và hoạt động ổn định. Anh/chị có thể đến nhận tại trung tâm hoặc chúng tôi sẽ giao tận nơi.

Trân trọng,
Agent Mai
Phòng Hỗ trợ Kỹ thuật`,
        attachments: [
          {
            id: 'att4',
            name: 'Driver_update_guide.pdf',
            size: 512000,
            type: 'application/pdf',
            downloadUrl: '#',
            previewUrl: '#'
          },
          {
            id: 'att5',
            name: 'Warranty_certificate.pdf',
            size: 128000,
            type: 'application/pdf',
            downloadUrl: '#',
            previewUrl: '#'
          }
        ],
        securityInfo: {
          encrypted: true,
          signature: true
        }
      };

    case 'INT-004': // Spam email
      return {
        type: 'inbound',
        direction: 'received',
        isSpam: true,
        isStarred: false,
        isImportant: false,
        labels: ['Complaint', 'High Priority'],
        spamReason: 'Suspicious links detected, aggressive language',
        from: {
          name: interaction.customerName,
          email: 'fake.email.spammer@suspicious-domain.xyz',
          avatar: '⚠️'
        },
        to: [
          { name: 'Support Team', email: 'support@company.com' }
        ],
        cc: [],
        subject: interaction.subject,
        date: '2025-07-20',
        time: '11:20',
        content: `[CAUTION: This email has been flagged as potentially suspicious]

URGENT!!! Your service is TERRIBLE!!!

I demand immediate refund or I will report to authorities!!! Click here for legal action: [SUSPICIOUS LINK REMOVED]

This is unacceptable and I will sue your company!!!

- Angry Customer`,
        attachments: [],
        securityInfo: {
          spfFail: true,
          dkimFail: true,
          dmarcFail: true,
          suspiciousLinks: 3,
          aggressiveLanguage: true
        }
      };

    case 'INT-005': // Yêu cầu hóa đơn VAT - Nguyễn Văn C
      return {
        type: 'inbound',
        direction: 'received',
        isSpam: false,
        isStarred: false,
        isImportant: false,
        labels: ['Billing', 'Invoice', 'VAT'],
        from: {
          name: 'Nguyễn Văn C',
          email: 'nguyen.van.c@email.com',
          avatar: '👤'
        },
        to: [
          { name: 'Billing Department', email: 'billing@company.com' }
        ],
        cc: [],
        subject: 'Yêu cầu hóa đơn VAT',
        date: '2025-08-01',
        time: '08:30',
        content: `Kính gửi Phòng Kế toán,

Tôi là Nguyễn Văn C - Khách hàng của Ngân hàng.

Tôi cần xuất hóa đơn VAT cho giao dịch chuyển tiền quốc tế với thông tin như sau:

- Mã giao dịch: TRX-2024-08-001
- Ngày thực hiện: 28/07/2024
- Số tiền: 50,000,000 VND
- Phí chuyển tiền: 500,000 VND
- Nội dung: Chuyển tiền du học

Thông tin xuất hóa đơn:
- Tên công ty: Công ty TNHH ABC
- Mã số thuế: 0123456789
- Địa chỉ: 123 Đường XYZ, Quận 1, TP.HCM
- Email nhận hóa đơn: nguyen.van.c@email.com

Vui lòng gửi hóa đơn điện tử về email này trong vòng 3 ngày làm việc.

Xin cảm ơn và trân trọng,
Nguyễn Văn C
SĐT: 0912 345 678`,
        attachments: [
          {
            id: 'att-vat-1',
            name: 'Bien_lai_giao_dich.pdf',
            size: 245760,
            type: 'application/pdf',
            downloadUrl: '#',
            previewUrl: '#'
          },
          {
            id: 'att-vat-2',
            name: 'Giay_phep_kinh_doanh.pdf',
            size: 512000,
            type: 'application/pdf',
            downloadUrl: '#',
            previewUrl: '#'
          }
        ],
        securityInfo: {
          encrypted: false,
          signature: false
        }
      };

    case 'INT-006': // Cảm ơn dịch vụ - Lê Thị D
      return {
        type: 'inbound',
        direction: 'received',
        isSpam: false,
        isStarred: true,
        isImportant: false,
        labels: ['Feedback', 'Positive', 'Customer Service'],
        from: {
          name: 'Lê Thị D',
          email: 'le.thi.d@company.com',
          avatar: '👩'
        },
        to: [
          { name: 'Support Team', email: 'support@company.com' }
        ],
        cc: [
          { name: 'Customer Service Manager', email: 'cs.manager@company.com' }
        ],
        subject: 'Cảm ơn về dịch vụ hỗ trợ tuyệt vời',
        date: '2025-07-31',
        time: '15:45',
        content: `Kính gửi Ban lãnh đạo và Phòng Chăm sóc Khách hàng,

Tôi là Lê Thị D - Khách hàng sử dụng dịch vụ thẻ tín dụng của Ngân hàng từ năm 2020.

Tôi viết email này để gửi lời cảm ơn chân thành đến Agent Mai - nhân viên đã hỗ trợ tôi vào sáng nay (31/07/2025).

Hôm nay tôi gặp sự cố thẻ tín dụng bị khóa do nhập sai mã PIN 3 lần. Tôi đã rất lo lắng vì cần dùng thẻ gấp để thanh toán viện phí cho mẹ tôi đang nằm viện.

Agent Mai đã:
✓ Tiếp nhận cuộc gọi của tôi rất nhanh chóng
✓ Xác minh thông tin một cách cẩn thận nhưng không mất nhiều thời gian
✓ Hướng dẫn tôi mở khóa thẻ qua ứng dụng Mobile Banking
✓ Đổi mã PIN mới ngay lập tức
✓ Kiểm tra lại để đảm bảo thẻ hoạt động bình thường

Toàn bộ quá trình chỉ mất khoảng 5 phút. Thái độ của Agent Mai rất chuyên nghiệp, nhiệt tình và chu đáo.

Tôi rất hài lòng với dịch vụ chăm sóc khách hàng của Ngân hàng. Hy vọng Ngân hàng sẽ có những hình thức khen thưởng xứng đáng cho nhân viên xuất sắc như Agent Mai.

Một lần nữa xin chân thành cảm ơn!

Trân trọng,
Lê Thị D
Số thẻ: **** **** **** 5678
SĐT: 0987 654 321`,
        attachments: [],
        securityInfo: {
          encrypted: true,
          signature: false
        }
      };

    default: {
      // Build email data from real API interaction metadata
      const meta = interaction?.metadata || {};
      if (!meta.from && !meta.body) return null;

      const isThread = meta.type === 'thread' && Array.isArray(meta.threadReplies) && meta.threadReplies.length > 0;

      if (isThread) {
        // Build thread messages: original email + replies
        const threadMessages = [
          {
            id: `${interaction.id}-original`,
            from: { name: meta.fromName || meta.from, email: meta.from, avatar: '👤' },
            to: [{ name: meta.toName || meta.to, email: meta.to }],
            cc: meta.cc ? [{ name: meta.cc, email: meta.cc }] : [],
            subject: meta.subject || interaction.subject,
            date: meta.date || interaction.createdAt?.substring(0, 10),
            time: meta.time || '09:00',
            content: meta.body || '',
            attachments: (meta.attachments || []).map((a: any) => ({
              id: a.id, name: a.name, size: a.size, type: a.type,
              downloadUrl: '#', previewUrl: '#'
            })),
            direction: 'received'
          },
          ...(meta.threadReplies || []).map((reply: any) => ({
            id: reply.id,
            from: { name: reply.from, email: reply.fromEmail, avatar: reply.direction === 'sent' ? '👩‍💼' : '👤' },
            to: [{ name: reply.to, email: reply.to }],
            cc: [],
            subject: reply.subject,
            date: reply.date,
            time: reply.time,
            content: reply.body,
            attachments: [],
            direction: reply.direction,
            isLatest: false
          }))
        ];
        // Mark last message as latest
        if (threadMessages.length > 0) {
          (threadMessages[threadMessages.length - 1] as any).isLatest = true;
        }

        return {
          type: 'thread',
          isSpam: meta.isSpam || false,
          isStarred: meta.isStarred || false,
          isImportant: meta.isImportant || false,
          labels: meta.labels || [],
          threadMessages
        };
      }

      // Single inbound email
      return {
        type: 'inbound',
        direction: 'received',
        isSpam: meta.isSpam || false,
        isStarred: meta.isStarred || false,
        isImportant: meta.isImportant || false,
        labels: meta.labels || [],
        from: { name: meta.fromName || meta.from, email: meta.from, avatar: '👤' },
        to: [{ name: meta.toName || meta.to, email: meta.to }],
        cc: meta.cc ? [{ name: meta.cc, email: meta.cc }] : [],
        subject: meta.subject || interaction?.subject || '',
        date: meta.date || interaction?.createdAt?.substring(0, 10),
        time: meta.time || '09:00',
        content: meta.body || '',
        attachments: (meta.attachments || []).map((a: any) => ({
          id: a.id, name: a.name, size: a.size, type: a.type,
          downloadUrl: '#', previewUrl: '#'
        })),
        securityInfo: { encrypted: false, signature: false }
      };
    }
  }
};

export function InteractionDetail({ interaction, onTransferCall, onCreateTicket, callControl }: InteractionDetailProps & { callControl?: any }) {
  const { user } = useAuth();
  const currentAgentId = user?.agentId || 'AGT001';
  const currentAgentName = user?.fullName || 'Agent';
  const [isOnHold, setIsOnHold] = useState(false);
  const isMuted = callControl?.isMuted ?? false;
  const [chatMessage, setChatMessage] = useState('');
  const [chatExpanded, setChatExpanded] = useState(false);
  
  // Email reply states
  const [showEmailReply, setShowEmailReply] = useState(false);
  const [emailReplyMode, setEmailReplyMode] = useState<'reply' | 'forward'>('reply');

  // Tab state management
  const [activeTab, setActiveTab] = useState('interaction');

  // Customer selection states for information query
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSelection, setShowCustomerSelection] = useState(false);

  // Ticket states
  const [ticketViewMode, setTicketViewMode] = useState<'create' | 'view'>('create');
  const [savedTicket, setSavedTicket] = useState<any>(null);
  const createTicket = useCreateTicket();

  // Reset customer selection when interaction changes
  useEffect(() => {
    setSelectedCustomer(null);
    setShowCustomerSelection(false);
  }, [interaction?.id]);

  // Get enhanced email data
  const emailData = getEmailData(interaction);

  // Ticket form state - auto-populate from interaction
  const [ticketData, setTicketData] = useState({
    classification: '',
    title: '',
    description: '',
    priority: 'medium',
    status: 'new',
    category: '',
    department: '',
    assignedAgent: '',
    assignedTeam: '',
    dueDate: ''
  });

  // Ticket attachments state
  const [ticketAttachments, setTicketAttachments] = useState<File[]>([]);

  // Preview sections collapsible states
  const [expandedInteraction, setExpandedInteraction] = useState(true);
  const [expandedContact, setExpandedContact] = useState(true);
  const [expandedQuery, setExpandedQuery] = useState(true);

  // Selected query object for ticket creation
  const [selectedQueryObject, setSelectedQueryObject] = useState<any>(null);

  // Callbot/IVR data removed — real call timeline data now shown via CallTimeline component

  // Mock chat data with Bot→Agent timeline
  const getChatData = (interaction: any): {
    sessions: ChatSession[];
    slaStatus: SLAStatus;
    slaRemainingSeconds?: number;
    firstResponseTime?: string;
    waitingSeconds?: number;
    sessionStatus: "open" | "closed";
  } => {
    // Bot session messages
    const botSession: ChatSession = {
      type: "bot",
      startTime: "09:00",
      endTime: "09:05",
      messages: [
        {
          id: "bot-1",
          sender: "customer",
          message: "Xin chào, tôi muốn tra cứu khoản vay của mình",
          time: "09:00",
          timestamp: new Date("2025-01-15T09:00:00"),
        },
        {
          id: "bot-2",
          sender: "bot",
          message: "Xin chào! Tôi là Bot hỗ trợ của Mcredit. Để tra cứu khoản vay, anh/chị vui lòng cung cấp số CMND/CCCD.",
          time: "09:00",
          timestamp: new Date("2025-01-15T09:00:05"),
        },
        {
          id: "bot-3",
          sender: "customer",
          message: "Số CCCD của tôi là 001234567890",
          time: "09:01",
          timestamp: new Date("2025-01-15T09:01:00"),
        },
        {
          id: "bot-4",
          sender: "bot",
          message: "Cảm ơn anh/chị. Tôi đang kiểm tra thông tin...",
          time: "09:01",
          timestamp: new Date("2025-01-15T09:01:10"),
        },
        {
          id: "bot-5",
          sender: "bot",
          message: "Tôi tìm thấy khoản vay MCL-2024-001234 của anh/chị. Tuy nhiên, để được tư vấn chi tiết hơn, tôi sẽ chuyển anh/chị đến nhân viên tư vấn. Vui lòng đợi trong giây lát.",
          time: "09:05",
          timestamp: new Date("2025-01-15T09:05:00"),
        },
      ],
    };

    // Agent session messages
    const agentSession: ChatSession = {
      type: "agent",
      agentName: "Nguyễn Lan",
      startTime: "09:05",
      messages: [
        {
          id: "agent-1",
          sender: "agent",
          senderName: "Nguyễn Lan",
          message: "Em chào anh, em là Lan từ Mcredit. Em thấy anh đang cần hỗ trợ về khoản vay MCL-2024-001234. Anh cần em hỗ trợ gì ạ?",
          time: "09:05",
          timestamp: new Date("2025-01-15T09:05:30"),
          status: "sent",
        },
        {
          id: "agent-2",
          sender: "customer",
          message: "Vâng, tôi muốn xem chi tiết lịch thanh toán và số tiền còn nợ.",
          time: "09:06",
          timestamp: new Date("2025-01-15T09:06:00"),
        },
        {
          id: "agent-3",
          sender: "agent",
          senderName: "Nguyễn Lan",
          message: "Dạ, em xin phép kiểm tra thông tin cho anh ạ.",
          time: "09:06",
          timestamp: new Date("2025-01-15T09:06:15"),
          status: "sent",
        },
        {
          id: "agent-4",
          sender: "agent",
          senderName: "Nguyễn Lan",
          message: "Khoản vay của anh có tổng số tiền là 50.000.000 VNĐ, đã thanh toán 5 kỳ, còn lại 7 kỳ. Số tiền còn nợ là 35.000.000 VNĐ. Anh có cần em gửi lịch thanh toán chi tiết không ạ?",
          time: "09:07",
          timestamp: new Date("2025-01-15T09:07:00"),
          status: "sent",
        },
        {
          id: "agent-5",
          sender: "customer",
          message: "Có, nhờ em gửi cho tôi. Và tôi cũng muốn biết về quy trình giải ngân cho khoản vay mới.",
          time: "09:08",
          timestamp: new Date("2025-01-15T09:08:00"),
        },
      ],
    };

    // Determine SLA status based on interaction
    const slaThresholdMinutes = 5;
    const firstResponseSeconds = 30; // 30 seconds from bot handover to agent first message
    const isWithinSLA = firstResponseSeconds < slaThresholdMinutes * 60;

    return {
      sessions: [botSession, agentSession],
      slaStatus: isWithinSLA ? "within-sla" : "breached",
      firstResponseTime: "30s",
      waitingSeconds: 120, // Customer waiting for 2 minutes
      sessionStatus: interaction.status === "completed" ? "closed" : "open",
    };
  };

  // Auto-populate ticket form when interaction changes
  useEffect(() => {
    if (interaction) {
      // Reset ticket states when interaction changes
      setTicketViewMode('create');
      setSavedTicket(null);
      
      let category = 'Khiếu nại dịch vụ';
      let department = 'Customer Service';
      
      if (interaction.type === 'missed-call') {
        category = 'Cuộc gọi nhỡ';
        department = 'Customer Service';
      } else if (interaction.type === 'email' && interaction.subject?.includes('bảo hành')) {
        category = 'Bảo hành sản phẩm';
        department = 'Technical Support';
      } else if (interaction.type === 'call') {
        category = 'Hỗ trợ cuộc gọi';
        department = 'Customer Service';
      }
      
      setTicketData({
        classification: '',
        title: `Ticket từ ${interaction.type}: ${interaction.subject}`,
        description: `Khách hàng: ${interaction.customerName}\\nLoại tương tác: ${interaction.type}\\nNội dung: ${interaction.subject}\\n\\nMô tả chi tiết:\\n`,
        priority: interaction.priority || 'medium',
        status: 'new',
        category: category,
        department: department,
        assignedAgent: '',
        assignedTeam: '',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow
      });
    }
  }, [interaction]);

  // Helper functions to get labels
  const getClassificationLabel = (classification: string) => {
    const labels: Record<string, string> = {
      'account': 'Tài khoản',
      'transfer': 'Chuyển tiền',
      'insurance': 'Bảo hiểm',
      'bug': 'Báo lỗi',
      'promotion': 'CTKM',
      'other': 'Khác'
    };
    return labels[classification] || classification;
  };

  const getTitleLabel = (classification: string, title: string) => {
    const titleLabels: Record<string, Record<string, string>> = {
      'account': {
        'register-cancel-update': 'Đăng ký/Hủy/Thay đổi thông tin',
        'product-info': 'Thông tin sản phẩm',
        'account-other': 'Khác'
      },
      'transfer': {
        'internal-transfer': 'Chuyển khoản nội bộ',
        'interbank-transfer': 'Chuyển khoản liên ngân hàng',
        'transaction-error': 'Lỗi giao dịch',
        'transfer-other': 'Khác'
      },
      'insurance': {
        'buy-insurance': 'Mua bảo hiểm',
        'insurance-inquiry': 'Tra cứu',
        'claim-request': 'Yêu cầu bồi thường',
        'insurance-other': 'Khác'
      },
      'bug': {
        'login-error': 'Lỗi đăng nhập',
        'transaction-bug': 'Lỗi giao dịch',
        'display-error': 'Lỗi hiển thị',
        'bug-other': 'Khác'
      },
      'promotion': {
        'program-info': 'Thông tin chương trình',
        'program-register': 'Đăng ký tham gia',
        'program-complaint': 'Khiếu nại',
        'promotion-other': 'Khác'
      },
      'other': {
        'general-other': 'Khác'
      }
    };
    return titleLabels[classification]?.[title] || title;
  };

  const departments = [
    'Customer Service',
    'Technical Support',
    'Billing',
    'Sales',
    'Product Team'
  ];

  // Mock agents and teams data
  const agents = [
    { id: 'agent-001', name: 'Agent Tung', department: 'Customer Service', status: 'available' },
    { id: 'agent-002', name: 'Agent Mai', department: 'Technical Support', status: 'available' },
    { id: 'agent-003', name: 'Agent Duc', department: 'Customer Service', status: 'busy' },
    { id: 'agent-004', name: 'Agent Linh', department: 'Billing', status: 'available' },
    { id: 'agent-005', name: 'Agent Nga', department: 'Technical Support', status: 'away' },
    { id: 'agent-006', name: 'Agent Minh', department: 'Sales', status: 'available' },
    { id: 'agent-007', name: 'Agent Lan', department: 'Product Team', status: 'busy' }
  ];

  const teams = [
    { id: 'team-cs', name: 'Customer Service Team', department: 'Customer Service', memberCount: 5 },
    { id: 'team-tech', name: 'Technical Support Team', department: 'Technical Support', memberCount: 8 },
    { id: 'team-billing', name: 'Billing Team', department: 'Billing', memberCount: 3 },
    { id: 'team-sales', name: 'Sales Team', department: 'Sales', memberCount: 6 },
    { id: 'team-product', name: 'Product Team', department: 'Product Team', memberCount: 4 }
  ];

  // Helper functions for preview sections
  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call':
      case 'missed-call':
        return Phone;
      case 'email':
        return Mail;
      case 'chat':
        return MessageCircle;
      default:
        return FileText;
    }
  };

  const getQueryObjectIcon = (type: string) => {
    switch (type) {
      case 'loan':
      case 'loans':
        return Banknote;
      case 'card':
      case 'cards':
        return CreditCard;
      case 'account':
      case 'accounts':
        return Wallet;
      case 'savings':
        return Building;
      case 'digital-banking':
        return Smartphone;
      case 'payments':
        return QrCode;
      case 'merchant':
        return Store;
      default:
        return FileText;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Mock contact data based on interaction
  const getContactData = () => {
    if (!interaction) return null;
    
    return {
      name: interaction.customerName || 'N/A',
      cif: selectedCustomer?.cif || 'CIF' + Math.random().toString().slice(2, 12),
      phone: interaction.customerPhone || '+84 901 234 567',
      email: interaction.customerEmail || interaction.customerName?.toLowerCase().replace(/\s+/g, '.') + '@email.com',
      segment: selectedCustomer?.customerType || 'Cá nhân'
    };
  };

  // Get query object data - prioritize selectedQueryObject from "Tạo ticket" action
  const getQueryObjectData = () => {
    // If a query object was selected from the Information Query tab
    if (selectedQueryObject) {
      return selectedQueryObject;
    }
    
    // Fallback to mock data for demo purposes if no object selected
    if (!selectedCustomer) return null;
    
    // Different mock data based on customer
    if (interaction?.customerName === 'Nguyễn Văn A') {
      return {
        type: 'loan',
        category: 'loans',
        productName: 'Vay mua nhà',
        productCode: 'LOAN-2024-001234',
        currentBalance: 850000000,
        monthlyPayment: 12500000,
        status: 'Đang hoạt động'
      };
    } else if (selectedCustomer?.name === 'Trần Văn C') {
      return {
        type: 'card',
        category: 'cards',
        productName: 'Thẻ Visa Platinum',
        productCode: 'CARD-5678-9012',
        creditLimit: 50000000,
        availableBalance: 35000000,
        status: 'Đang hoạt động'
      };
    }
    
    return null;
  };

  if (!interaction) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/50">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Chọn một tương tác để xem chi tiết</p>
        </div>
      </div>
    );
  }

  const handleTransferCall = () => {
    if (onTransferCall) {
      onTransferCall();
    }
  };

  const handleCreateTicket = () => {
    setActiveTab('ticket');
  };

  // Handle create ticket from query object
  const handleCreateTicketFromQuery = (product: any, category: string) => {
    // Map product data to query object format
    const queryObject: any = {
      category: category,
      productName: product.productName,
      productCode: product.productCode,
      status: product.status,
    };

    // Add specific fields based on category
    switch (category) {
      case 'loans':
        queryObject.type = 'loan';
        queryObject.loanAmount = product.loanAmount;
        queryObject.currentBalance = product.currentBalance;
        queryObject.monthlyPayment = product.monthlyPayment;
        queryObject.interestRate = product.interestRate;
        queryObject.nextPaymentDate = product.nextPaymentDate;
        break;
      case 'cards':
        queryObject.type = 'card';
        queryObject.cardType = product.cardType;
        queryObject.creditLimit = product.creditLimit;
        queryObject.availableBalance = product.availableBalance;
        queryObject.expiryDate = product.expiryDate;
        break;
      case 'accounts':
        queryObject.type = 'account';
        queryObject.accountType = product.accountType;
        queryObject.balance = product.balance;
        queryObject.availableBalance = product.availableBalance;
        queryObject.openDate = product.openDate;
        break;
      case 'savings':
        queryObject.type = 'savings';
        queryObject.principal = product.principal;
        queryObject.interestRate = product.interestRate;
        queryObject.term = product.term;
        queryObject.maturityDate = product.maturityDate;
        break;
      default:
        queryObject.type = category;
    }

    // Set the selected query object
    setSelectedQueryObject(queryObject);
    
    // Switch to ticket tab
    setActiveTab('ticket');
  };

  // Handle file attachment
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setTicketAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setTicketAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    } else if (['pdf'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else if (['doc', 'docx'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    } else if (['xls', 'xlsx'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-green-600" />;
    } else {
      return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleSaveTicket = async () => {
    if (!ticketData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề ticket');
      return;
    }

    const customerId = interaction?.customerId as string | undefined;
    if (!customerId) {
      toast.error('Không xác định được khách hàng cho ticket này');
      return;
    }

    try {
      const result = await createTicket.mutateAsync({
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category || undefined,
        customerId,
        interactionId: interaction?.id,
      });

      const savedResult = { ...result, number: result.displayId };
      setSavedTicket(savedResult);
      setTicketViewMode('view');

      if (onCreateTicket) {
        onCreateTicket(savedResult);
      }
    } catch (error) {
      // Error toast already shown by useCreateTicket onError
      console.error('Failed to save ticket:', error);
    }
  };

  const handleEmailReply = (mode: 'reply' | 'forward') => {
    setEmailReplyMode(mode);
    setShowEmailReply(true);
  };

  const handlePostCallSurvey = () => {
    console.log('Transferring call to post-call survey IVR...');
    alert('Đang chuyển cuộc gọi đến hệ thống đánh giá...');
  };

  const sendChatMessage = () => {
    if (chatMessage.trim()) {
      console.log('Sending chat message:', chatMessage);
      setChatMessage('');
    }
  };

  const updateTicketData = (field: string, value: string) => {
    setTicketData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Missed call helper functions
  const getMissedCallReasonText = (reason: string) => {
    switch (reason) {
      case 'timeout': return 'Không trả lời';
      case 'not-ready': return 'Agent không sẵn sàng';
      case 'disconnected': return 'Mất kết nối';
      case 'away': return 'Agent tạm vắng';
      default: return reason;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Không xác định';
    }
  };

  const handleCallBack = () => {
    console.log('Calling back missed call:', interaction.customerPhone);
    alert(`Đang gọi lại số ${interaction.customerPhone || interaction.customerName}...`);
    // In real implementation, this would initiate a callback
  };

  const handleIgnoreMissedCall = () => {
    console.log('Ignoring missed call:', interaction.id);
    alert('Đã đánh dấu cuộc gọi nhỡ này là đã xử lý');
    // In real implementation, this would update the missed call status
  };

  // Helper functions for email display
  const getEmailFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-600" />;
    if (type.startsWith('video/')) return <FileText className="h-4 w-4 text-purple-600" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-600" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'received' ? (
      <ArrowDown className="h-3 w-3 text-green-600" />
    ) : (
      <ArrowUp className="h-3 w-3 text-blue-600" />
    );
  };

  // Handle reply from individual messages in thread
  const handleThreadMessageReply = (message: any, mode: 'reply' | 'reply-all' | 'forward') => {
    console.log('Reply to individual message:', { message, mode });
    // This callback can be used to track individual message replies
    // In a real implementation, this would open a more specific reply dialog
  };

  // Handle knowledge base content insertion
  const handleKnowledgeContentInsert = (content: string) => {
    // In a real implementation, this would insert content into the current email/chat response
    console.log('Inserting knowledge content:', content);
    
    // For email replies, we could insert into EmailReplyInline component
    // For chat, we could pre-populate the chat input
    // This is a placeholder for the actual implementation
    if (interaction.type === 'email') {
      // Insert into email reply draft
      alert(`Nội dung đã được chèn vào email phản hồi`);
    } else if (interaction.type === 'chat') {
      // Insert into chat message
      setChatMessage(prev => prev + '\\n\\n' + content);
    } else {
      // Copy to clipboard for call scenarios
      navigator.clipboard.writeText(content);
      alert('Nội dung đã được sao chép vào clipboard');
    }
  };

  // Handle AI knowledge search integration
  const handleAIKnowledgeSearch = (query: string) => {
    // Switch to knowledge tab and perform search
    setActiveTab('knowledge');
    // In a real implementation, this would trigger search in KnowledgeBaseSearch
    console.log('AI triggered knowledge search:', query);
  };

  // Render missed call action buttons for header
  const renderMissedCallActionButtons = () => {
    if (interaction.type !== 'missed-call') return null;

    return (
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={handleCallBack}
          className="text-green-700 border-green-300 hover:bg-green-50"
        >
          <PhoneCall className="h-4 w-4 mr-1" />
          Gọi lại
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateTicket}
          className="text-blue-700 border-blue-300 hover:bg-blue-50"
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          Tạo ticket
        </Button>
        <Button 
          variant="outline"
          size="sm"
          onClick={handleIgnoreMissedCall}
          className="text-foreground/80 border-gray-300 hover:bg-muted/50"
        >
          <X className="h-4 w-4 mr-1" />
          Bỏ qua
        </Button>
      </div>
    );
  };

  // Render email action buttons for header
  const renderEmailActionButtons = () => {
    if (interaction.type !== 'email' || !emailData || emailData.isSpam) return null;

    return (
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => handleEmailReply('reply')}
          className="text-blue-700 border-blue-300 hover:bg-blue-50"
        >
          <Reply className="h-4 w-4 mr-1" />
          Reply
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEmailReply('forward')}
          className="text-purple-700 border-purple-300 hover:bg-purple-50"
        >
          <Forward className="h-4 w-4 mr-1" />
          Forward
        </Button>
        <Button 
          variant="outline"
          size="sm"
          onClick={handleCreateTicket}
          className="text-foreground/80 border-gray-300 hover:bg-muted/50"
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          Tạo ticket
        </Button>
      </div>
    );
  };

  // Render call action buttons for header
  const renderCallActionButtons = () => {
    if (interaction.type !== 'call') return null;

    return (
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={handleCreateTicket}
          className="text-foreground/80 border-gray-300 hover:bg-muted/50"
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          Tạo ticket
        </Button>
      </div>
    );
  };

  // Render chat action buttons for header
  const renderChatActionButtons = () => {
    if (interaction.type !== 'chat') return null;

    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setChatExpanded(!chatExpanded)}
          className="text-blue-700 border-blue-300 hover:bg-blue-50"
        >
          {chatExpanded ? <Minimize2 className="h-4 w-4 mr-1" /> : <Maximize2 className="h-4 w-4 mr-1" />}
          {chatExpanded ? 'Thu gọn' : 'Mở rộng'}
        </Button>
        <Button 
          variant="outline"
          size="sm"
          onClick={handleCreateTicket}
          className="text-foreground/80 border-gray-300 hover:bg-muted/50"
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          Tạo ticket
        </Button>
      </div>
    );
  };

  // Enhanced Call Controls - Support both active and completed calls
  const renderCallControls = (): React.ReactElement => {
    const isCallCompleted = interaction.status === 'completed' || interaction.status === 'resolved';
    
    if (isCallCompleted) {
      // Show recording player and timeline for completed calls
      const recording = interaction.recording;
      const hasRecording = recording && typeof recording === 'object' && 'url' in recording;
      
      return (
        <div className="space-y-4">
          <div className="text-center">
            <Badge className="bg-muted text-foreground mb-2">
              Cuộc gọi đã kết thúc
            </Badge>
            <p className="text-sm text-muted-foreground">Tổng thời gian: {interaction.duration}</p>
          </div>

          {hasRecording ? (
            <CallRecordingPlayer
              recordingUrl={(recording as any).url as string}
              recordingDuration={(recording as any).duration}
              callDuration={interaction.duration || ''}
              quality={(recording as any).quality}
            />
          ) : null}

          <CallTimeline
            interactionId={interaction.id}
            callId={(interaction as any).metadata?.callId}
            totalDuration={interaction.duration || undefined}
          />

          <CallNotes
            callId={interaction.id}
            isCallActive={false}
            currentAgentId={currentAgentId}
            currentAgentName={currentAgentName}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Real-time call controls — only when there's a LIVE SIP call */}
        {callControl?.hasActiveCall && (
        <div className="sticky top-0 z-10 bg-background pb-4 -mt-4 pt-4">
          <div className="flex items-center justify-center space-x-4 p-4 bg-gradient-to-r from-[#155DFC]/5 to-blue-50 border-2 border-[#155DFC]/20 rounded-lg shadow-sm">
            <Button
              variant={isMuted ? "default" : "outline"}
              size="sm"
              onClick={() => { if (callControl) callControl.toggleMute(); }}
              className={isMuted ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              title={isMuted ? "Bật mic" : "Tắt mic"}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">{isMuted ? "Muted" : "Mute"}</span>
            </Button>

            <Button
              variant={isOnHold ? "default" : "outline"}
              size="sm"
              onClick={() => { if (callControl) callControl.toggleHold(); setIsOnHold(!isOnHold); }}
              className={isOnHold ? "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}
              title={isOnHold ? "Tiếp tục cuộc gọi" : "Giữ máy"}
            >
              {isOnHold ? <Phone className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              <span className="ml-1">{isOnHold ? "On Hold" : "Hold"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTransferCall}
              title="Chuyển cuộc gọi"
            >
              <PhoneForwarded className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Transfer</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => { if (callControl) callControl.hangup(); }}
              title="Kết thúc cuộc gọi"
            >
              <PhoneOff className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">End</span>
            </Button>
          </div>
        </div>
        )}

        {/* Live Call Timeline — shows real IVR/queue/routing events in real-time */}
        <CallTimeline
          interactionId={interaction.id}
          callId={(interaction as any).metadata?.callId}
          isLive={true}
        />

        {/* Live Call Notes */}
        <CallNotes
          callId={interaction.id}
          isCallActive={true}
          currentAgentId={currentAgentId}
          currentAgentName={currentAgentName}
        />
      </div>
    );
  };

  // Render missed call detail content
  const renderMissedCallDetail = () => {
    if (interaction.type !== 'missed-call') return null;

    return (
      <div className="space-y-6">
        {/* Missed Call Alert */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <PhoneMissed className="h-8 w-8 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-medium text-red-900">Cuộc gọi nhỡ</h3>
                  {interaction.isVIP && (
                    <Crown className="h-4 w-4 text-yellow-600" />
                  )}
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    {getMissedCallReasonText(interaction.missedReason as string)}
                  </Badge>
                </div>
                <p className="text-red-700 mb-3">
                  Cuộc gọi từ <strong>{interaction.customerName || interaction.customerPhone}</strong> vào lúc <strong>{formatTimestamp(interaction.timestamp || '')}</strong>
                </p>
                <div className="flex items-center space-x-4 text-sm text-red-600">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Thời gian nhỡ: {formatTimestamp(interaction.timestamp || '')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="h-4 w-4" />
                    <span>Nguồn: {interaction.source}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Thông tin khách hàng</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground/80">Tên khách hàng</label>
                <p className="text-sm text-foreground mt-1">
                  {interaction.customerName || 'Chưa xác định'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/80">Số điện thoại</label>
                <p className="text-sm text-foreground mt-1">
                  {interaction.customerPhone || 'Số ẩn'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/80">Email</label>
                <p className="text-sm text-foreground mt-1">
                  {interaction.customerEmail || 'Chưa có thông tin'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/80">Loại khách hàng</label>
                <p className="text-sm text-foreground mt-1">
                  {interaction.isVIP ? (
                    <span className="inline-flex items-center space-x-1 text-yellow-700">
                      <Crown className="h-3 w-3" />
                      <span>VIP</span>
                    </span>
                  ) : (
                    'Thường'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PhoneMissed className="h-5 w-5 text-red-600" />
              <span>Chi tiết cuộc gọi nhỡ</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm font-medium text-foreground/80">Lý do nhỡ cuộc gọi:</span>
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  {getMissedCallReasonText(interaction.missedReason as string)}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm font-medium text-foreground/80">Thời gian gọi:</span>
                <span className="text-sm text-foreground">{formatTimestamp(interaction.timestamp || '')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm font-medium text-foreground/80">Nguồn cuộc gọi:</span>
                <span className="text-sm text-foreground">{interaction.source}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm font-medium text-foreground/80">Độ ưu tiên:</span>
                <Badge className={`${
                  interaction.priority === 'urgent' ? 'bg-red-100 text-red-800 border-red-200' :
                  interaction.priority === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                  interaction.priority === 'medium' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  'bg-muted text-foreground border-border'
                }`}>
                  {interaction.priority === 'urgent' ? 'Khẩn cấp' :
                   interaction.priority === 'high' ? 'Cao' :
                   interaction.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                </Badge>
              </div>
              {interaction.tags && interaction.tags.length > 0 && (
                <div className="flex justify-between items-start py-2">
                  <span className="text-sm font-medium text-foreground/80">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {interaction.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <span>Gợi ý hành động</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Gọi lại ngay</h4>
                <p className="text-xs text-blue-700">
                  Liên hệ lại với khách hàng để tìm hiểu nhu cầu và hỗ trợ kịp thời.
                </p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-medium text-green-900 mb-1">Tạo ticket hỗ trợ</h4>
                <p className="text-xs text-green-700">
                  Tạo ticket để theo dõi và đảm bảo khách hàng được hỗ trợ đầy đủ.
                </p>
              </div>
              {interaction.isVIP && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-900 mb-1">Khách hàng VIP</h4>
                  <p className="text-xs text-yellow-700">
                    Ưu tiên xử lý và liên hệ lại trong thời gian ngắn nhất.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-foreground">
              {interaction.type === 'missed-call' ? 'Chi tiết cuộc gọi nhỡ' : 
               interaction.type === 'email' ? 'Email' :
               interaction.type === 'call' ? 'Cuộc gọi' : 'Chat'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {interaction.customerName || 'Khách hàng'}
            </p>
          </div>
          
          {/* Action buttons based on interaction type */}
          {renderMissedCallActionButtons()}
          {renderEmailActionButtons()}
          {renderCallActionButtons()}
          {renderChatActionButtons()}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-shrink-0 px-4 pt-3 bg-muted/30">
            <TabsList className="grid w-full grid-cols-5 h-10">
              <TabsTrigger value="interaction" className="text-sm">
                Tương tác
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-sm">
                AI Hỗ trợ
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="text-sm">
                Kiến thức
              </TabsTrigger>
              <TabsTrigger value="ticket" className="text-sm">
                Tạo Ticket
              </TabsTrigger>
              <TabsTrigger value="query" className="text-sm">
                Truy vấn TT
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="interaction" className="mt-3 h-full overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full overflow-y-auto p-4" data-scroll-container="interaction">
                {/* Missed Call Detail */}
                {interaction.type === 'missed-call' && renderMissedCallDetail()}
                
                {/* Email Content */}
                {interaction.type === 'email' && (
                  <div className="space-y-4">
                    {emailData?.isSpam ? (
                      // Spam Email Warning
                      <Card className="border-red-300 bg-red-50">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0 mt-1" />
                            <div>
                              <h3 className="text-lg font-medium text-red-900 mb-2">
                                ⚠️ Email này có thể là SPAM
                              </h3>
                              <p className="text-red-700 mb-3">
                                <strong>Lý do:</strong> {emailData.spamReason}
                              </p>
                              
                              {emailData.securityInfo && (
                                <div className="space-y-2 text-sm">
                                  <div className="p-3 bg-red-100 border border-red-200 rounded">
                                    <h4 className="font-medium text-red-900 mb-2">Chi tiết bảo mật:</h4>
                                    <ul className="space-y-1 text-red-700">
                                      {emailData.securityInfo.spfFail && <li>• SPF verification failed</li>}
                                      {emailData.securityInfo.dkimFail && <li>• DKIM verification failed</li>}
                                      {emailData.securityInfo.dmarcFail && <li>• DMARC verification failed</li>}
                                      {emailData.securityInfo.suspiciousLinks && <li>• Phát hiện {emailData.securityInfo.suspiciousLinks} liên kết đáng nghi</li>}
                                      {emailData.securityInfo.aggressiveLanguage && <li>• Ngôn từ mang tính chất hung hăng</li>}
                                    </ul>
                                  </div>
                                </div>
                              )}
                              
                              <div className="mt-4 p-3 bg-background border border-red-200 rounded">
                                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{emailData.content}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : emailData?.type === 'thread' ? (
                      // Email Thread
                      <div>
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Mail className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-medium">Email Thread</h3>
                            {emailData.isStarred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                            {emailData.isImportant && <Flag className="h-4 w-4 text-red-500" />}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {emailData.labels?.map((label: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <EmailThread
                          messages={(emailData.threadMessages || []) as any}
                          onReply={handleThreadMessageReply}
                        />
                      </div>
                    ) : (
                      // Single Email
                      <div>
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="flex items-center space-x-1">
                              {getDirectionIcon(emailData?.direction || 'received')}
                              <Mail className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-medium">
                              {emailData?.direction === 'sent' ? 'Email đã gửi' : 'Email nhận'}
                            </h3>
                            {emailData?.isStarred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                            {emailData?.isImportant && <Flag className="h-4 w-4 text-red-500" />}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {emailData?.labels?.map((label: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Card>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="text-2xl">{emailData?.from?.avatar || '👤'}</div>
                                <div>
                                  <div className="font-medium">{emailData?.from?.name}</div>
                                  <div className="text-sm text-muted-foreground">{emailData?.from?.email}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {emailData?.date} at {emailData?.time}
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEmailReply('reply')}
                                  title="Reply"
                                >
                                  <Reply className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEmailReply('forward')}
                                  title="Forward"
                                >
                                  <Forward className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>To: {emailData?.to?.map((t: any) => t.name || t.email).join(', ')}</div>
                              {emailData?.cc && emailData.cc.length > 0 && (
                                <div>CC: {emailData.cc.map((c: any) => c.name || c.email).join(', ')}</div>
                              )}
                            </div>
                            <h4 className="text-lg font-medium mt-2">{emailData?.subject}</h4>
                          </CardHeader>
                          <CardContent>
                            <div className="prose max-w-none">
                              <p className="whitespace-pre-wrap">{emailData?.content}</p>
                            </div>
                            
                            {emailData?.attachments && emailData.attachments.length > 0 && (
                              <div className="mt-4 pt-4 border-t">
                                <h5 className="text-sm font-medium text-foreground/80 mb-2">
                                  Attachments ({emailData.attachments.length})
                                </h5>
                                <div className="space-y-2">
                                  {emailData.attachments.map((attachment: any) => (
                                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                      <div className="flex items-center space-x-2">
                                        {getEmailFileIcon(attachment.type)}
                                        <div>
                                          <div className="text-sm font-medium">{attachment.name}</div>
                                          <div className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</div>
                                        </div>
                                      </div>
                                      <div className="flex space-x-1">
                                        <Button variant="ghost" size="sm">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm">
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {emailData?.securityInfo && (
                              <div className="mt-4 pt-4 border-t">
                                <div className="flex items-center space-x-2 text-sm text-green-600">
                                  <Shield className="h-4 w-4" />
                                  <span>
                                    Email đã được xác thực
                                    {emailData.securityInfo.encrypted && ' và mã hóa'}
                                    {emailData.securityInfo.signature && ' với chữ ký số'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Email Reply Inline */}
                    {!emailData?.isSpam && (
                      <div className="mt-6">
                        <EmailReplyInline
                          interaction={interaction}
                          mode={emailReplyMode}
                          isVisible={showEmailReply}
                          onCancel={() => setShowEmailReply(false)}
                        />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Call Content */}
                {interaction.type === 'call' && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Phone className={`h-5 w-5 ${interaction.status === 'in-progress' || interaction.status === 'ringing' ? 'text-green-600' : 'text-muted-foreground'}`} />
                      <h3 className="text-lg font-medium">
                        {interaction.status === 'in-progress' || interaction.status === 'ringing' ? 'Cuộc gọi đang diễn ra' :
                         interaction.status === 'completed' ? 'Cuộc gọi đã hoàn thành' :
                         interaction.status === 'closed' ? 'Cuộc gọi đã đóng' :
                         interaction.status === 'resolved' ? 'Cuộc gọi đã xử lý' :
                         interaction.status === 'new' ? 'Cuộc gọi mới' :
                         'Chi tiết cuộc gọi'}
                      </h3>
                      <Badge className={`${
                        interaction.status === 'completed' || interaction.status === 'resolved' ? 'bg-green-100 text-green-800 border-green-200' :
                        interaction.status === 'in-progress' || interaction.status === 'ringing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        interaction.status === 'closed' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        'bg-muted text-foreground border-border'
                      }`}>
                        {interaction.status === 'completed' ? 'Hoàn thành' :
                         interaction.status === 'in-progress' ? 'Đang diễn ra' :
                         interaction.status === 'closed' ? 'Đã đóng' :
                         interaction.status === 'resolved' ? 'Đã xử lý' :
                         interaction.status === 'ringing' ? 'Đang đổ chuông' :
                         interaction.status}
                      </Badge>
                    </div>

                    {renderCallControls()}
                  </div>
                )}
                
                {/* Chat Content */}
                {interaction.type === 'chat' && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-medium">Hội thoại Chat</h3>
                      <Badge className={`${
                        interaction.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                        interaction.status === 'in-progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-muted text-foreground border-border'
                      }`}>
                        {interaction.status === 'completed' ? 'Hoàn thành' :
                         interaction.status === 'in-progress' ? 'Đang diễn ra' : interaction.status}
                      </Badge>
                    </div>

                    {/* Enhanced Chat Timeline with Bot→Agent and SLA */}
                    <div className="border rounded-lg overflow-hidden bg-background" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
                      {(() => {
                        const chatData = getChatData(interaction);
                        return (
                          <div className="h-full flex flex-col">
                            {/* Chat Session Header with SLA */}
                            <div className="flex-shrink-0">
                              <ChatSessionHeader
                                customerName={interaction.customerName}
                                customerAvatar="👤"
                                channel={
                                  interaction.source === "Facebook Messenger"
                                    ? "facebook"
                                    : interaction.source === "Zalo OA" || interaction.source === "Zalo Official Account"
                                    ? "zalo"
                                    : "livechat"
                                }
                                channelName={interaction.source}
                                startTime="09:00"
                                sessionStatus={chatData.sessionStatus}
                                slaStatus={chatData.slaStatus}
                                slaRemainingSeconds={chatData.slaRemainingSeconds}
                                slaThresholdMinutes={5}
                                firstResponseTime={chatData.firstResponseTime}
                                waitingSeconds={chatData.waitingSeconds}
                                onCloseSession={() => {
                                  console.log("Closing chat session");
                                }}
                              />
                            </div>

                            {/* Chat Timeline with Bot→Agent Sessions */}
                            <div className="flex-1 overflow-hidden">
                              <ChatTimeline
                                sessions={chatData.sessions}
                                onSendMessage={async (message, files) => {
                                  console.log("Sending message:", message, files);
                                  // In real implementation, this would send to backend
                                }}
                                isDisabled={chatData.sessionStatus === "closed"}
                                isAgentSession={true}
                                maxFileSize={5}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="ai" className="mt-3 h-full overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
              <AIAssistantChat
                interaction={interaction}
                onKnowledgeSearch={handleAIKnowledgeSearch}
              />
            </TabsContent>
            
            <TabsContent value="knowledge" className="mt-3 h-full overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
              <KnowledgeBaseSearch
                onContentInsert={handleKnowledgeContentInsert}
              />
            </TabsContent>
            
            <TabsContent value="ticket" className="mt-3 h-full overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full overflow-y-auto p-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tạo Ticket</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      
                      {/* === Preview Sections: Đối tượng liên quan === */}
                      <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 space-y-3">
                        <h3 className="text-sm font-medium text-blue-900 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Đối tượng liên quan
                        </h3>

                        {/* Interaction Preview */}
                        {interaction && (
                          <Card className="border-[#155DFC]/30">
                            <CardContent className="p-3">
                              <button
                                onClick={() => setExpandedInteraction(!expandedInteraction)}
                                className="w-full flex items-center justify-between text-sm hover:bg-muted/50 rounded p-1"
                                type="button"
                              >
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const Icon = getInteractionIcon(interaction.type);
                                    return <Icon className="h-4 w-4 text-[#155DFC]" />;
                                  })()}
                                  <span className="font-medium text-[#155DFC]">Tương tác gốc</span>
                                  <Badge className={`text-xs ${
                                    interaction.type === 'call' || interaction.type === 'missed-call' ? 'bg-blue-100 text-blue-800' :
                                    interaction.type === 'email' ? 'bg-orange-100 text-orange-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {interaction.type === 'call' ? 'Cuộc gọi' :
                                     interaction.type === 'missed-call' ? 'Cuộc gọi nhỡ' :
                                     interaction.type === 'email' ? 'Email' : 'Chat'}
                                  </Badge>
                                </div>
                                {expandedInteraction ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                              
                              {expandedInteraction && (
                                <div className="mt-2 pt-2 border-t space-y-1.5">
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Chủ đề:</span>
                                    <p className="font-medium mt-0.5">{interaction.subject || 'Không có tiêu đề'}</p>
                                  </div>
                                  {(interaction.type === 'call' || interaction.type === 'missed-call') && (
                                    <>
                                      {interaction.duration && (
                                        <div className="text-xs">
                                          <span className="text-muted-foreground">Thời lượng:</span>
                                          <p className="font-medium mt-0.5">{interaction.duration}</p>
                                        </div>
                                      )}
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Trạng thái:</span>
                                        <p className="font-medium mt-0.5">{interaction.status || 'completed'}</p>
                                      </div>
                                    </>
                                  )}
                                  {interaction.type === 'email' && (
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">From:</span>
                                      <p className="font-medium mt-0.5">{interaction.customerEmail || interaction.customerName}</p>
                                    </div>
                                  )}
                                  {interaction.type === 'chat' && (
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Kênh:</span>
                                      <p className="font-medium mt-0.5">{interaction.source || 'Web Chat'}</p>
                                    </div>
                                  )}
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Thời gian:</span>
                                    <p className="font-medium mt-0.5">{interaction.time}</p>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Contact Preview */}
                        {(() => {
                          const contactData = getContactData();
                          if (!contactData) return null;
                          
                          return (
                            <Card className="border-purple-300">
                              <CardContent className="p-3">
                                <button
                                  onClick={() => setExpandedContact(!expandedContact)}
                                  className="w-full flex items-center justify-between text-sm hover:bg-muted/50 rounded p-1"
                                  type="button"
                                >
                                  <div className="flex items-center gap-2">
                                    <UserCircle className="h-4 w-4 text-purple-600" />
                                    <span className="font-medium text-purple-600">Liên hệ</span>
                                  </div>
                                  {expandedContact ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                
                                {expandedContact && (
                                  <div className="mt-2 pt-2 border-t space-y-1.5">
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Tên:</span>
                                      <p className="font-medium mt-0.5">{contactData.name}</p>
                                    </div>
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">CIF:</span>
                                      <p className="font-medium mt-0.5 font-mono">{contactData.cif}</p>
                                    </div>
                                    {contactData.phone && (
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">SĐT:</span>
                                        <p className="font-medium mt-0.5 font-mono">{contactData.phone}</p>
                                      </div>
                                    )}
                                    {contactData.email && (
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Email:</span>
                                        <p className="font-medium mt-0.5">{contactData.email}</p>
                                      </div>
                                    )}
                                    {contactData.segment && (
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Phân khúc:</span>
                                        <p className="font-medium mt-0.5">{contactData.segment}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })()}

                        {/* Query Object Preview */}
                        {(() => {
                          const queryObject = getQueryObjectData();
                          if (!queryObject) return null;
                          
                          return (
                            <Card className="border-amber-300">
                              <CardContent className="p-3">
                                <button
                                  onClick={() => setExpandedQuery(!expandedQuery)}
                                  className="w-full flex items-center justify-between text-sm hover:bg-muted/50 rounded p-1"
                                  type="button"
                                >
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const Icon = getQueryObjectIcon(queryObject.type);
                                      return <Icon className="h-4 w-4 text-amber-600" />;
                                    })()}
                                    <span className="font-medium text-amber-600">Thông tin truy vấn</span>
                                    <Badge className="text-xs bg-amber-100 text-amber-800">
                                      {queryObject.type === 'loan' || queryObject.type === 'loans' ? 'Khoản vay' :
                                       queryObject.type === 'card' || queryObject.type === 'cards' ? 'Thẻ' :
                                       queryObject.type === 'account' || queryObject.type === 'accounts' ? 'Tài khoản' :
                                       queryObject.type === 'savings' ? 'Tiết kiệm' :
                                       queryObject.type === 'digital-banking' ? 'Ngân hàng số' :
                                       queryObject.type === 'payments' ? 'Thanh toán' :
                                       queryObject.type === 'merchant' ? 'Merchant' : 'Khác'}
                                    </Badge>
                                  </div>
                                  {expandedQuery ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                
                                {expandedQuery && (
                                  <div className="mt-2 pt-2 border-t space-y-1.5">
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Tên sản phẩm:</span>
                                      <p className="font-medium mt-0.5">{queryObject.productName}</p>
                                    </div>
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Mã sản phẩm:</span>
                                      <p className="font-medium mt-0.5 font-mono">{queryObject.productCode}</p>
                                    </div>
                                    
                                    {/* Loan specific fields */}
                                    {(queryObject.type === 'loan' || queryObject.type === 'loans') && (
                                      <>
                                        {queryObject.loanAmount && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Số tiền vay:</span>
                                            <p className="font-medium mt-0.5">
                                              {formatCurrency(queryObject.loanAmount)}
                                            </p>
                                          </div>
                                        )}
                                        {queryObject.currentBalance && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Dư nợ:</span>
                                            <p className="font-medium mt-0.5 text-red-600">
                                              {formatCurrency(queryObject.currentBalance)}
                                            </p>
                                          </div>
                                        )}
                                        {queryObject.monthlyPayment && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Trả hàng tháng:</span>
                                            <p className="font-medium mt-0.5">
                                              {formatCurrency(queryObject.monthlyPayment)}
                                            </p>
                                          </div>
                                        )}
                                        {queryObject.interestRate && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Lãi suất:</span>
                                            <p className="font-medium mt-0.5 text-blue-600">
                                              {queryObject.interestRate}%/năm
                                            </p>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    
                                    {/* Card specific fields */}
                                    {(queryObject.type === 'card' || queryObject.type === 'cards') && (
                                      <>
                                        {queryObject.cardType && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Loại thẻ:</span>
                                            <p className="font-medium mt-0.5">{queryObject.cardType}</p>
                                          </div>
                                        )}
                                        {queryObject.creditLimit && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Hạn mức:</span>
                                            <p className="font-medium mt-0.5">
                                              {formatCurrency(queryObject.creditLimit)}
                                            </p>
                                          </div>
                                        )}
                                        {queryObject.availableBalance && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Khả dụng:</span>
                                            <p className="font-medium mt-0.5 text-green-600">
                                              {formatCurrency(queryObject.availableBalance)}
                                            </p>
                                          </div>
                                        )}
                                        {queryObject.expiryDate && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Hết hạn:</span>
                                            <p className="font-medium mt-0.5">{queryObject.expiryDate}</p>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* Account specific fields */}
                                    {(queryObject.type === 'account' || queryObject.type === 'accounts') && (
                                      <>
                                        {queryObject.accountType && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Loại TK:</span>
                                            <p className="font-medium mt-0.5">{queryObject.accountType}</p>
                                          </div>
                                        )}
                                        {queryObject.balance && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Số dư:</span>
                                            <p className="font-medium mt-0.5 text-green-600">
                                              {formatCurrency(queryObject.balance)}
                                            </p>
                                          </div>
                                        )}
                                        {queryObject.availableBalance && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Khả dụng:</span>
                                            <p className="font-medium mt-0.5 text-green-600">
                                              {formatCurrency(queryObject.availableBalance)}
                                            </p>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* Savings specific fields */}
                                    {queryObject.type === 'savings' && (
                                      <>
                                        {queryObject.principal && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Số tiền gốc:</span>
                                            <p className="font-medium mt-0.5 text-blue-600">
                                              {formatCurrency(queryObject.principal)}
                                            </p>
                                          </div>
                                        )}
                                        {queryObject.interestRate && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Lãi suất:</span>
                                            <p className="font-medium mt-0.5 text-green-600">
                                              {queryObject.interestRate}%/năm
                                            </p>
                                          </div>
                                        )}
                                        {queryObject.term && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Kỳ hạn:</span>
                                            <p className="font-medium mt-0.5">{queryObject.term}</p>
                                          </div>
                                        )}
                                        {queryObject.maturityDate && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">Ngày đáo hạn:</span>
                                            <p className="font-medium mt-0.5">{queryObject.maturityDate}</p>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    
                                    {queryObject.status && (
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Trạng thái:</span>
                                        <p className="font-medium mt-0.5">{queryObject.status}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })()}
                      </div>

                      <Separator />

                      {/* === Form Tạo Ticket === */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground/80 flex items-center">
                          <Edit className="h-4 w-4 mr-2 text-[#155DFC]" />
                          Thông tin ticket
                        </h3>

                      <div className="space-y-2">
                        <Label htmlFor="ticket-classification">Phân loại</Label>
                        <Select
                          value={ticketData.classification}
                          onValueChange={(value: string) => {
                            updateTicketData('classification', value);
                            // Reset title when classification changes
                            updateTicketData('title', '');
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn phân loại ticket" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="account">Tài khoản</SelectItem>
                            <SelectItem value="transfer">Chuyển tiền</SelectItem>
                            <SelectItem value="insurance">Bảo hiểm</SelectItem>
                            <SelectItem value="bug">Báo lỗi</SelectItem>
                            <SelectItem value="promotion">CTKM</SelectItem>
                            <SelectItem value="other">Khác</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ticket-title">Tiêu đề</Label>
                        <Select
                          value={ticketData.title}
                          onValueChange={(value: string) => updateTicketData('title', value)}
                          disabled={!ticketData.classification}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={
                              ticketData.classification 
                                ? "Chọn tiêu đề" 
                                : "Vui lòng chọn phân loại trước"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {ticketData.classification === 'account' && (
                              <>
                                <SelectItem value="register-cancel-update">Đăng ký/Hủy/Thay đổi thông tin</SelectItem>
                                <SelectItem value="product-info">Thông tin sản phẩm</SelectItem>
                                <SelectItem value="account-other">Khác</SelectItem>
                              </>
                            )}
                            {ticketData.classification === 'transfer' && (
                              <>
                                <SelectItem value="internal-transfer">Chuyển khoản nội bộ</SelectItem>
                                <SelectItem value="interbank-transfer">Chuyển khoản liên ngân hàng</SelectItem>
                                <SelectItem value="transaction-error">Lỗi giao dịch</SelectItem>
                                <SelectItem value="transfer-other">Khác</SelectItem>
                              </>
                            )}
                            {ticketData.classification === 'insurance' && (
                              <>
                                <SelectItem value="buy-insurance">Mua bảo hiểm</SelectItem>
                                <SelectItem value="insurance-inquiry">Tra cứu</SelectItem>
                                <SelectItem value="claim-request">Yêu cầu bồi thường</SelectItem>
                                <SelectItem value="insurance-other">Khác</SelectItem>
                              </>
                            )}
                            {ticketData.classification === 'bug' && (
                              <>
                                <SelectItem value="login-error">Lỗi đăng nhập</SelectItem>
                                <SelectItem value="transaction-bug">Lỗi giao dịch</SelectItem>
                                <SelectItem value="display-error">Lỗi hiển thị</SelectItem>
                                <SelectItem value="bug-other">Khác</SelectItem>
                              </>
                            )}
                            {ticketData.classification === 'promotion' && (
                              <>
                                <SelectItem value="program-info">Thông tin chương trình</SelectItem>
                                <SelectItem value="program-register">Đăng ký tham gia</SelectItem>
                                <SelectItem value="program-complaint">Khiếu nại</SelectItem>
                                <SelectItem value="promotion-other">Khác</SelectItem>
                              </>
                            )}
                            {ticketData.classification === 'other' && (
                              <>
                                <SelectItem value="general-other">Khác</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="ticket-description">Mô tả</Label>
                        <Textarea
                          id="ticket-description"
                          rows={4}
                          value={ticketData.description}
                          onChange={(e) => updateTicketData('description', e.target.value)}
                          placeholder="Mô tả chi tiết vấn đề..."
                          className="resize-none"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ticket-priority">Độ ưu tiên</Label>
                          <Select
                            value={ticketData.priority}
                            onValueChange={(value: string) => updateTicketData('priority', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Chọn độ ưu tiên" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Thấp</SelectItem>
                              <SelectItem value="medium">Trung bình</SelectItem>
                              <SelectItem value="high">Cao</SelectItem>
                              <SelectItem value="urgent">Khẩn cấp</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="ticket-status">Trạng thái xử lý</Label>
                          <Select
                            value={ticketData.status}
                            onValueChange={(value: string) => updateTicketData('status', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Mới</SelectItem>
                              <SelectItem value="in-progress">Đang xử lý</SelectItem>
                              <SelectItem value="resolved">Đã xử lý</SelectItem>
                              <SelectItem value="closed">Đóng</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ticket-department">Phòng ban</Label>
                          <Select
                            value={ticketData.department}
                            onValueChange={(value: string) => updateTicketData('department', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Chọn phòng ban" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((department) => (
                                <SelectItem key={department} value={department}>
                                  {department}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="ticket-due">Hạn xử lý</Label>
                          <Input
                            id="ticket-due"
                            type="date"
                            value={ticketData.dueDate}
                            onChange={(e) => updateTicketData('dueDate', e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Agent Assignment Section */}
                      <div className="space-y-4 border-t pt-4">
                        <h4 className="flex items-center text-sm font-medium text-foreground">
                          <Users className="h-4 w-4 mr-2" />
                          Phân công xử lý
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="ticket-agent">Chọn Agent</Label>
                            <Select
                              value={ticketData.assignedAgent}
                              onValueChange={(value: string) => {
                                updateTicketData('assignedAgent', value);
                                // Clear team selection when agent is selected
                                if (value) updateTicketData('assignedTeam', '');
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Chọn agent xử lý" />
                              </SelectTrigger>
                              <SelectContent>
                                {agents.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{agent.name}</span>
                                      <div className="flex items-center space-x-2 ml-2">
                                        <Badge 
                                          variant="outline" 
                                          className={`text-xs ${
                                            agent.status === 'available' 
                                              ? 'text-green-600 border-green-300' 
                                              : agent.status === 'busy'
                                              ? 'text-yellow-600 border-yellow-300'
                                              : 'text-muted-foreground border-gray-300'
                                          }`}
                                        >
                                          {agent.status === 'available' ? 'Rảnh' : 
                                           agent.status === 'busy' ? 'Bận' : 'Vắng'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {agent.department}
                                        </span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="ticket-team">Hoặc chọn Team</Label>
                            <Select
                              value={ticketData.assignedTeam}
                              onValueChange={(value: string) => {
                                updateTicketData('assignedTeam', value);
                                // Clear agent selection when team is selected
                                if (value) updateTicketData('assignedAgent', '');
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Chọn team xử lý" />
                              </SelectTrigger>
                              <SelectContent>
                                {teams.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{team.name}</span>
                                      <div className="flex items-center space-x-2 ml-2">
                                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                                          {team.memberCount} người
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {team.department}
                                        </span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Assignment Info */}
                        {(ticketData.assignedAgent || ticketData.assignedTeam) && (
                          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">
                                Đã chọn: {
                                  ticketData.assignedAgent 
                                    ? agents.find(a => a.id === ticketData.assignedAgent)?.name
                                    : teams.find(t => t.id === ticketData.assignedTeam)?.name
                                }
                              </span>
                            </div>
                            {ticketData.assignedAgent && (
                              <p className="mt-1 text-xs text-blue-600">
                                Ticket sẽ được gán trực tiếp cho agent này
                              </p>
                            )}
                            {ticketData.assignedTeam && (
                              <p className="mt-1 text-xs text-blue-600">
                                Ticket sẽ được gán cho team và có thể được phân bổ tự động
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* File Attachments */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center space-x-2">
                            <Paperclip className="h-4 w-4" />
                            <span>Đính kèm file</span>
                          </Label>
                          <input
                            type="file"
                            id="ticket-file-upload"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('ticket-file-upload')?.click()}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Chọn file
                          </Button>
                        </div>

                        {/* Attachment Preview List */}
                        {ticketAttachments.length > 0 && (
                          <div className="space-y-2">
                            {ticketAttachments.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 border border-border rounded-md bg-muted/50 hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  {getFileIcon(file.name)}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveAttachment(index)}
                                  className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {ticketAttachments.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-md">
                            Chưa có file đính kèm
                          </p>
                        )}
                      </div>
                      
                      <Button onClick={handleSaveTicket} className="w-full" size="default" disabled={createTicket.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {createTicket.isPending ? 'Đang lưu...' : 'Lưu Ticket'}
                      </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="query" className="mt-3 h-full overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
              {(() => {
                // Check if this is Trần Thị B interaction (multiple customers with same phone)
                const isMultipleCustomers = interaction?.customerName === 'Trần Thị B';
                
                if (isMultipleCustomers && !selectedCustomer) {
                  // Show customer selection for Trần Thị B
                  return (
                    <div className="h-full overflow-y-auto">
                      <CustomerSelection 
                        phoneNumber={interaction?.customerPhone || '+84 912 345 678'}
                        onSelectCustomer={(customer) => {
                          setSelectedCustomer(customer);
                        }}
                      />
                    </div>
                  );
                } else if (selectedCustomer) {
                  // Show information query with selected customer and back button
                  return (
                    <InformationQuery 
                      customerInfo={{
                        cif: selectedCustomer.cif,
                        name: selectedCustomer.name,
                        status: selectedCustomer.status,
                        customerType: selectedCustomer.customerType,
                        phone: selectedCustomer.phone,
                        email: selectedCustomer.email,
                      }}
                      onBack={() => setSelectedCustomer(null)}
                      onCreateTicket={handleCreateTicketFromQuery}
                    />
                  );
                } else {
                  // Default: Show information query for regular customers (like Nguyễn Văn A)
                  return <InformationQuery onCreateTicket={handleCreateTicketFromQuery} />;
                }
              })()}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}