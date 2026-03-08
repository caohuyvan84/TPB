import { ChatMessage, AIKnowledgeEntry } from './types';

export const mockAIKnowledge: Record<string, AIKnowledgeEntry> = {
  'bảo hành': {
    confidence: 0.95,
    response: `Dựa trên thông tin trong hệ thống, tôi tìm thấy các chính sách bảo hành sau:

**Chính sách bảo hành chung:**
- Thời gian: 12 tháng kể từ ngày mua
- Điều kiện: Sản phẩm còn tem bảo hành, có hóa đơn
- Quy trình: Mang sản phẩm + hóa đơn đến trung tâm bảo hành

**Trung tâm bảo hành:**
- Hà Nội: 123 Đường ABC, Ba Đình (8:00-17:00)
- TP.HCM: 321 Đường GHI, Quận 1 (8:00-17:00)
- Đà Nẵng: 789 Đường DEF, Hải Châu (8:00-17:00)

**Thời gian xử lý:**
- Lỗi nhỏ: 1-2 ngày làm việc
- Lỗi phức tạp: 3-5 ngày làm việc`,
    sources: ['KB-001', 'KB-015', 'KB-033'],
    category: 'warranty'
  },
  'đổi trả': {
    confidence: 0.92,
    response: `Chính sách đổi trả 30 ngày:

**Điều kiện đổi trả:**
- Trong vòng 30 ngày kể từ ngày mua
- Sản phẩm chưa sử dụng, còn nguyên tag
- Có hóa đơn mua hàng

**Quy trình:**
1. Liên hệ hotline để được cấp mã RMA
2. Đóng gói sản phẩm kèm hóa đơn
3. Gửi về địa chỉ hoặc mang đến cửa hàng
4. Xử lý đổi trả trong 3-5 ngày

**Phí đổi trả:**
- Lỗi nhà sản xuất: Miễn phí
- Đổi ý cá nhân: Khách hàng chịu phí vận chuyển`,
    sources: ['KB-045', 'KB-067'],
    category: 'returns'
  },
  'laptop gaming': {
    confidence: 0.88,
    response: `Thông tin về laptop gaming:

**Các model phổ biến:**
- XYZ Gaming Pro: i7, RTX 4060, 16GB RAM
- XYZ Gaming Elite: i9, RTX 4070, 32GB RAM

**Vấn đề thường gặp:**
- Màn hình nhấp nháy: Thường do driver card đồ họa
- Quá nhiệt: Cần vệ sinh tản nhiệt định kỳ
- Pin yếu: Thay pin sau 2-3 năm sử dụng

**Hỗ trợ kỹ thuật:**
- Hotline: 1900-9999
- Email: tech@company.com
- Remote support: Có hỗ trợ`,
    sources: ['KB-gaming-01', 'KB-tech-15'],
    category: 'products'
  }
};

export const initialMessages: ChatMessage[] = [
  {
    id: '1',
    type: 'ai',
    content: 'Xin chào! Tôi là AI Assistant của hệ thống. Tôi có thể giúp bạn:\n\n• Tìm kiếm thông tin trong Knowledge Base\n• Phân tích tương tác hiện tại\n• Đưa ra gợi ý phản hồi khách hàng\n• Tạo nội dung email/chat template\n\nBạn cần hỗ trợ gì?',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    suggestions: [
      'Phân tích tương tác này',
      'Tìm thông tin bảo hành',
      'Gợi ý phản hồi khách hàng',
      'Tạo email template'
    ]
  }
];