import { ChatMessage } from './types';
import { mockAIKnowledge } from './constants';

export const getContextualSuggestions = (interaction: any): string[] => {
  if (!interaction) return [];

  const suggestions = [];
  
  if (interaction.type === 'email' && interaction.subject?.includes('bảo hành')) {
    suggestions.push('Thông tin chính sách bảo hành', 'Địa chỉ trung tâm bảo hành');
  }
  
  if (interaction.type === 'email' && interaction.subject?.includes('đổi trả')) {
    suggestions.push('Quy trình đổi trả sản phẩm', 'Điều kiện đổi trả');
  }
  
  if (interaction.priority === 'high' || interaction.priority === 'urgent') {
    suggestions.push('Cách xử lý tương tác ưu tiên cao', 'Template email khẩn cấp');
  }

  suggestions.push('Phân tích tâm trạng khách hàng', 'Gợi ý cách phản hồi');
  
  return suggestions.slice(0, 4);
};

export const generateAIResponse = async (userMessage: string, interaction: any): Promise<ChatMessage> => {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check if asking about current interaction
  if (lowerMessage.includes('phân tích tương tác') || lowerMessage.includes('analyze interaction')) {
    return {
      id: Date.now().toString(),
      type: 'ai',
      content: `**Phân tích tương tác hiện tại:**

**Thông tin cơ bản:**
- Khách hàng: ${interaction?.customerName || 'N/A'}
- Loại: ${interaction?.type === 'email' ? 'Email' : interaction?.type === 'call' ? 'Cuộc gọi' : 'Chat'}
- Độ ưu tiên: ${interaction?.priority === 'high' ? 'Cao' : interaction?.priority === 'urgent' ? 'Khẩn cấp' : 'Bình thường'}
- Trạng thái: ${interaction?.status || 'N/A'}

**Phân tích nội dung:**
- Chủ đề chính: ${interaction?.subject || 'Không xác định'}
- Tâm trạng khách hàng: ${interaction?.priority === 'urgent' ? 'Cấp bách, có thể bực tức' : 'Bình thường'}

**Gợi ý xử lý:**
${interaction?.type === 'email' ? '• Phản hồi trong vòng 2 giờ\n• Sử dụng tone formal và thân thiện' : ''}
${interaction?.priority === 'urgent' ? '• Xử lý ngay lập tức\n• Có thể cần escalate' : '• Xử lý theo quy trình bình thường'}`,
      timestamp: new Date(),
      context: {
        confidence: 0.92,
        category: 'analysis'
      },
      actions: [
        {
          type: 'email',
          label: 'Tạo email phản hồi',
        },
        {
          type: 'ticket',
          label: 'Tạo ticket ưu tiên cao'
        }
      ]
    };
  }

  // Knowledge base search
  for (const [keyword, data] of Object.entries(mockAIKnowledge)) {
    if (lowerMessage.includes(keyword)) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        context: {
          confidence: data.confidence,
          sources: data.sources,
          category: data.category
        },
        actions: [
          {
            type: 'knowledge',
            label: 'Xem chi tiết trong KB',
            data: keyword
          },
          {
            type: 'email',
            label: 'Chèn vào email'
          }
        ]
      };
    }
  }

  // Default response for unrecognized queries
  return {
    id: Date.now().toString(),
    type: 'ai',
    content: `Tôi đang tìm kiếm thông tin về "${userMessage}" trong hệ thống...

Trong khi chờ, bạn có thể:
• Sử dụng các gợi ý bên dưới
• Tìm kiếm trong Knowledge Base
• Hỏi tôi về tương tác hiện tại

Tôi sẽ học hỏi từ câu hỏi này để cải thiện khả năng hỗ trợ.`,
    timestamp: new Date(),
    suggestions: getContextualSuggestions(interaction),
    context: {
      confidence: 0.3,
      category: 'general'
    },
    actions: [
      {
        type: 'search',
        label: 'Tìm trong Knowledge Base',
        data: userMessage
      }
    ]
  };
};