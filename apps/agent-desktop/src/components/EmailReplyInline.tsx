import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  Send, 
  Reply, 
  Forward, 
  ChevronDown,
  ChevronUp,
  Paperclip,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  FileText,
  X,
  Save,
  Eye,
  Smile,
  File,
  Image,
  Trash2,
  Download,
  Plus,
  Minus,
  Check
} from "lucide-react";

interface EmailReplyInlineProps {
  interaction: any;
  mode: 'reply' | 'forward';
  isVisible: boolean;
  onCancel: () => void;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

const emailTemplates = [
  {
    id: 'warranty_response',
    name: 'Phản hồi bảo hành',
    content: `Kính chào {customer_name},

Cảm ơn anh/chị đã liên hệ về chính sách bảo hành.

Sản phẩm của anh/chị được bảo hành trong thời gian 12 tháng kể từ ngày mua. Để được hỗ trợ bảo hành, anh/chị vui lòng cung cấp:

1. Hóa đơn mua hàng
2. Tem bảo hành còn nguyên vẹn
3. Mô tả chi tiết về vấn đề gặp phải

Chúng tôi sẽ hỗ trợ anh/chị trong thời gian sớm nhất có thể.

Trân trọng,
{agent_name}
Phòng Chăm sóc Khách hàng`
  },
  {
    id: 'follow_up',
    name: 'Theo dõi khách hàng',
    content: `Kính chào {customer_name},

Cảm ơn anh/chị đã liên hệ với chúng tôi.

Hiện tại chúng tôi đang xử lý yêu cầu của anh/chị và sẽ có phản hồi chi tiết trong vòng 24 giờ tới.

Nếu có thêm thông tin gì cần hỗ trợ, xin vui lòng liên hệ với chúng tôi.

Trân trọng,
{agent_name}`
  },
  {
    id: 'thank_you',
    name: 'Cảm ơn khách hàng',
    content: `Kính chào {customer_name},

Cảm ơn anh/chị đã góp ý về sản phẩm/dịch vụ của chúng tôi.

Ý kiến của anh/chị rất quý báu và sẽ giúp chúng tôi cải thiện chất lượng phục vụ tốt hơn.

Chúng tôi sẽ xem xét và có những điều chỉnh phù hợp.

Trân trọng,
{agent_name}`
  }
];

export function EmailReplyInline({ interaction, mode, isVisible, onCancel }: EmailReplyInlineProps) {
  const [emailData, setEmailData] = useState({
    to: interaction?.customerEmail || 'customer@example.com',
    cc: '',
    bcc: '',
    subject: mode === 'reply' ? `Re: ${interaction?.subject || ''}` : `Fwd: ${interaction?.subject || ''}`,
    content: ''
  });
  
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [openTemplateCombobox, setOpenTemplateCombobox] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  // CC/BCC visibility states
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);

  // Auto expand when component becomes visible
  useEffect(() => {
    if (isVisible) {
      setIsExpanded(true);
      // Set default CC/BCC visibility based on mode
      if (mode === 'forward') {
        setShowCC(true);
        setShowBCC(true);
      } else {
        setShowCC(false);
        setShowBCC(false);
      }
    }
  }, [isVisible, mode]);

  // Auto-populate fields based on mode
  useEffect(() => {
    if (isVisible && interaction) {
      let defaultTo = '';
      let defaultCC = '';
      
      if (mode === 'reply') {
        // Reply to sender only
        defaultTo = interaction.customerEmail || 'customer@example.com';
        defaultCC = '';
      } else if (mode === 'forward') {
        // Forward - empty to field, user needs to fill
        defaultTo = '';
        defaultCC = '';
      }

      setEmailData(prev => ({
        ...prev,
        to: defaultTo,
        cc: defaultCC,
        bcc: '',
        subject: mode === 'reply' ? `Re: ${interaction.subject || ''}` : `Fwd: ${interaction.subject || ''}`,
      }));
    }
  }, [isVisible, interaction, mode]);

  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setEmailData({
        ...emailData,
        content: template.content
          .replace('{customer_name}', interaction?.customerName || 'Quý khách')
          .replace('{agent_name}', 'Agent Tung')
      });
    }
    setOpenTemplateCombobox(false);
  };

  const handleSend = () => {
    console.log('Sending email:', emailData, 'with attachments:', attachments);
    // Reset form and close
    setEmailData({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      content: ''
    });
    setAttachments([]);
    setShowCC(false);
    setShowBCC(false);
    onCancel();
  };

  const insertText = (text: string) => {
    setEmailData({
      ...emailData,
      content: emailData.content + text
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newAttachments: Attachment[] = Array.from(files).map((file, index) => ({
        id: `file-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      }));
      setAttachments([...attachments, ...newAttachments]);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(attachments.filter(att => att.id !== attachmentId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-600" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const toggleCC = () => {
    setShowCC(!showCC);
    if (!showCC && !emailData.cc) {
      setEmailData(prev => ({ ...prev, cc: '' }));
    }
  };

  const toggleBCC = () => {
    setShowBCC(!showBCC);
    if (!showBCC && !emailData.bcc) {
      setEmailData(prev => ({ ...prev, bcc: '' }));
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <Card className="border-t-4 border-t-blue-500 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-2">
            {mode === 'reply' ? (
              <Reply className="h-5 w-5 text-blue-600" />
            ) : (
              <Forward className="h-5 w-5 text-blue-600" />
            )}
            <span className="font-medium text-blue-900">
              {mode === 'reply' ? 'Trả lời email' : 'Chuyển tiếp email'}
            </span>
            <Badge className="bg-blue-200 text-blue-800">
              {interaction?.customerName}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-700 hover:bg-blue-100"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-blue-700 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <CardContent className="p-6 space-y-4">
            {/* Email Headers */}
            <div className="space-y-3">
              {/* To Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium text-foreground/80">Đến</Label>
                  <div className="flex items-center space-x-2">
                    {!showCC && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleCC}
                        className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        CC
                      </Button>
                    )}
                    {!showBCC && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleBCC}
                        className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        BCC
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                  placeholder="recipient@example.com"
                />
              </div>

              {/* CC Field */}
              {showCC && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm font-medium text-foreground/80">CC</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={toggleCC}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={emailData.cc}
                    onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                    placeholder="cc@example.com"
                  />
                </div>
              )}

              {/* BCC Field */}
              {showBCC && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm font-medium text-foreground/80">BCC</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={toggleBCC}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={emailData.bcc}
                    onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                    placeholder="bcc@example.com"
                  />
                </div>
              )}

              {/* Subject Field */}
              <div>
                <Label className="text-sm font-medium text-foreground/80">Chủ đề</Label>
                <Input
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className="mt-1"
                  placeholder="Email subject..."
                />
              </div>
            </div>

            {/* Template Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">Template mẫu</Label>
              <Popover open={openTemplateCombobox} onOpenChange={setOpenTemplateCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openTemplateCombobox}
                    className="w-full justify-between text-left font-normal border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {selectedTemplate
                      ? emailTemplates.find((template) => template.id === selectedTemplate)?.name
                      : "Chọn template email..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm kiếm template..." className="h-9" />
                    <CommandEmpty>Không tìm thấy template phù hợp.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {emailTemplates.map((template) => (
                          <CommandItem
                            key={template.id}
                            value={template.name}
                            onSelect={() => handleTemplateSelect(template.id)}
                            className="flex flex-col items-start py-3 px-3 cursor-pointer"
                          >
                            <div className="flex items-center w-full">
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedTemplate === template.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-sm text-foreground">{template.name}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {template.content.substring(0, 100)}...
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Rich Text Toolbar */}
            <div className="border rounded-lg overflow-hidden bg-background">
              <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-border">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-border">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-border">
                    <Underline className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6 mx-2" />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-border">
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-border">
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-border" asChild>
                      <span>
                        <Paperclip className="h-4 w-4" />
                      </span>
                    </Button>
                  </label>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-border">
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Email Content Editor */}
              <Textarea
                value={emailData.content}
                onChange={(e) => setEmailData({ ...emailData, content: e.target.value })}
                placeholder="Nhập nội dung email..."
                className="min-h-[300px] border-0 resize-none focus-visible:ring-0 rounded-none text-sm"
                style={{ height: '300px' }}
              />
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">File đính kèm ({attachments.length})</Label>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {getFileIcon(attachment.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {attachment.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(attachment.url, '_blank')}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => removeAttachment(attachment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Insert Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertText('\n\nTrân trọng,\nAgent Tung\nPhòng Chăm sóc Khách hàng')}
                className="text-muted-foreground border-gray-300 hover:bg-muted/50"
              >
                ✍️ Chữ ký
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertText('Cảm ơn anh/chị đã liên hệ với chúng tôi. ')}
                className="text-muted-foreground border-gray-300 hover:bg-muted/50"
              >
                🙏 Cảm ơn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertText('Nếu có thêm thắc mắc, xin vui lòng liên hệ với chúng tôi. ')}
                className="text-muted-foreground border-gray-300 hover:bg-muted/50"
              >
                💬 Hỗ trợ thêm
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex space-x-3">
                <Button variant="outline" size="sm" className="text-muted-foreground">
                  <Save className="h-4 w-4 mr-2" />
                  Lưu nháp
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-muted-foreground"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Xem trước
                </Button>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={onCancel}
                  className="px-6"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!emailData.to || !emailData.subject || !emailData.content}
                  className="bg-blue-600 hover:bg-blue-700 px-6"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Gửi email
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Xem trước email</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Email Headers */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex">
                <span className="w-16 text-sm font-medium text-muted-foreground">Từ:</span>
                <span className="text-sm">support@company.com</span>
              </div>
              <div className="flex">
                <span className="w-16 text-sm font-medium text-muted-foreground">Đến:</span>
                <span className="text-sm">{emailData.to}</span>
              </div>
              {emailData.cc && (
                <div className="flex">
                  <span className="w-16 text-sm font-medium text-muted-foreground">CC:</span>
                  <span className="text-sm">{emailData.cc}</span>
                </div>
              )}
              {emailData.bcc && (
                <div className="flex">
                  <span className="w-16 text-sm font-medium text-muted-foreground">BCC:</span>
                  <span className="text-sm">{emailData.bcc}</span>
                </div>
              )}
              <div className="flex">
                <span className="w-16 text-sm font-medium text-muted-foreground">Chủ đề:</span>
                <span className="text-sm font-medium">{emailData.subject}</span>
              </div>
              {attachments.length > 0 && (
                <div className="flex">
                  <span className="w-16 text-sm font-medium text-muted-foreground">Đính kèm:</span>
                  <div className="text-sm">
                    {attachments.map((att, index) => (
                      <span key={att.id}>
                        {att.name} ({formatFileSize(att.size)})
                        {index < attachments.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Email Content */}
            <div className="border rounded-lg p-4 bg-background min-h-[300px]">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {emailData.content || 'Nội dung email sẽ hiển thị ở đây...'}
              </div>
            </div>

            {/* Preview Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Đóng xem trước
              </Button>
              <Button 
                onClick={() => {
                  setShowPreview(false);
                  handleSend();
                }}
                disabled={!emailData.to || !emailData.subject || !emailData.content}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Gửi email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}