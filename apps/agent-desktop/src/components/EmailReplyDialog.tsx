import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Send, 
  Reply, 
  Forward, 
  FileText, 
  Edit3, 
  Save, 
  Eye,
  Paperclip,
  Type,
  Image,
  Link,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
  Search,
  ChevronDown
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './ui/command';

interface EmailReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interaction: any;
  mode: 'reply' | 'reply-all' | 'forward';
  originalMessage?: any; // For individual message replies
}

const emailTemplates = [
  {
    id: 'welcome',
    name: 'Chào mừng khách hàng',
    category: 'General',
    subject: 'Chào mừng bạn đến với dịch vụ của chúng tôi',
    content: `Kính chào {customer_name},

Chúng tôi rất vui mừng được chào đón bạn đến với dịch vụ của chúng tôi.

Nếu có bất kỳ thắc mắc nào, xin vui lòng liên hệ với chúng tôi.

Trân trọng,
{agent_name}
{company_name}`,
    variables: ['customer_name', 'agent_name', 'company_name']
  },
  {
    id: 'warranty_info',
    name: 'Thông tin bảo hành',
    category: 'Support',
    subject: 'Thông tin bảo hành sản phẩm',
    content: `Kính chào {customer_name},

Cảm ơn bạn đã liên hệ về chính sách bảo hành.

Sản phẩm của chúng tôi được bảo hành trong thời gian {warranty_period} kể từ ngày mua. Để được hỗ trợ bảo hành, bạn vui lòng cung cấp:

1. Hóa đơn mua hàng
2. Tem bảo hành
3. Mô tả chi tiết về vấn đề

Chúng tôi sẽ hỗ trợ bạn trong thời gian sớm nhất.

Trân trọng,
{agent_name}`,
    variables: ['customer_name', 'warranty_period', 'agent_name']
  },
  {
    id: 'follow_up',
    name: 'Theo dõi khách hàng',
    category: 'Follow-up',
    subject: 'Cảm ơn bạn đã liên hệ - Theo dõi vấn đề',
    content: `Kính chào {customer_name},

Cảm ơn bạn đã liên hệ với chúng tôi về {issue_topic}.

Hiện tại chúng tôi đang xử lý yêu cầu của bạn và sẽ phản hồi trong vòng {response_time}.

Nếu có thêm thông tin gì, xin vui lòng liên hệ với chúng tôi.

Trân trọng,
{agent_name}
Ticket: {ticket_id}`,
    variables: ['customer_name', 'issue_topic', 'response_time', 'agent_name', 'ticket_id']
  }
];

export function EmailReplyDialog({ open, onOpenChange, interaction, mode, originalMessage }: EmailReplyDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false);
  
  // Enhanced logic for determining recipients based on mode
  const getDefaultRecipients = () => {
    if (!interaction) return { to: '', cc: '', bcc: '' };
    
    if (mode === 'forward') {
      return {
        to: '',
        cc: '',
        bcc: ''
      };
    } else if (mode === 'reply-all') {
      // For reply-all, include original sender in TO and other recipients in CC
      const originalFrom = originalMessage?.from?.email || interaction.customerEmail;
      const originalTo = originalMessage?.to || [];
      const originalCc = originalMessage?.cc || [];
      
      // Combine all recipients except the current agent
      const allRecipients = [...originalTo, ...originalCc].filter(
        recipient => recipient.email !== 'agent@company.com' // Filter out current agent
      );
      
      return {
        to: originalFrom,
        cc: allRecipients.map(r => r.email).join(', '),
        bcc: ''
      };
    } else {
      // Regular reply - only to original sender
      return {
        to: originalMessage?.from?.email || interaction.customerEmail || 'customer@example.com',
        cc: '',
        bcc: ''
      };
    }
  };
  
  const [emailData, setEmailData] = useState(() => {
    const recipients = getDefaultRecipients();
    return {
      ...recipients,
      subject: mode === 'forward' ? `Fwd: ${interaction?.subject || ''}` : `Re: ${interaction?.subject || ''}`,
      content: ''
    };
  });
  const [customTemplate, setCustomTemplate] = useState('');
  const [activeTab, setActiveTab] = useState('compose');

  const currentTemplate = emailTemplates.find(t => t.id === selectedTemplate);

  // Filter templates based on search
  const filteredTemplates = emailTemplates.filter(template =>
    template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
    template.category.toLowerCase().includes(templateSearch.toLowerCase()) ||
    template.content.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setEmailData({
        ...emailData,
        subject: template.subject,
        content: template.content
      });
      setCustomTemplate(template.content);
      setTemplatePopoverOpen(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Reset states when dialog opens
  useEffect(() => {
    if (open) {
      const recipients = getDefaultRecipients();
      setEmailData({
        ...recipients,
        subject: mode === 'forward' ? `Fwd: ${interaction?.subject || ''}` : `Re: ${interaction?.subject || ''}`,
        content: ''
      });
      setSelectedTemplate('');
      setCustomTemplate('');
      setIsFullscreen(false);
      setTemplateSearch('');
      setTemplatePopoverOpen(false);
      setActiveTab('compose');
    }
  }, [open, mode, interaction]);

  const handleSend = () => {
    console.log('Sending email:', {
      ...emailData,
      mode,
      templateUsed: selectedTemplate,
      originalInteraction: interaction?.id
    });
    
    // Reset form
    setEmailData({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      content: ''
    });
    setSelectedTemplate('');
    setCustomTemplate('');
    setIsFullscreen(false);
    setTemplateSearch('');
    setTemplatePopoverOpen(false);
    onOpenChange(false);
  };

  const insertVariable = (variable: string) => {
    const newContent = emailData.content + `{${variable}}`;
    setEmailData({ ...emailData, content: newContent });
  };

  const applyFormatting = (format: string) => {
    // Simple formatting - in real app would use a proper rich text editor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      document.execCommand(format, false, '');
    }
  };

  // Fullscreen overlay component
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-background">
          <div className="flex items-center space-x-3">
            {mode === 'reply' ? (
              <Reply className="h-5 w-5 text-blue-600" />
            ) : (
              <Forward className="h-5 w-5 text-blue-600" />
            )}
            <div>
              <h2 className="text-lg font-medium">
                {mode === 'reply' ? 'Trả lời Email' : 
                 mode === 'reply-all' ? 'Trả lời tất cả' : 'Chuyển tiếp Email'}
              </h2>
              {interaction && (
                <p className="text-sm text-muted-foreground">
                  {mode === 'reply' ? 'Trả lời cho' : 
                   mode === 'reply-all' ? 'Trả lời tất cả cho' : 'Chuyển tiếp từ'}: {interaction.customerName} - {interaction.subject}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-9 w-9 p-0"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 p-0"
            >
              ×
            </Button>
          </div>
        </div>

        {/* Fullscreen Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-border/50">
              <TabsList className="grid w-60 grid-cols-2">
                <TabsTrigger value="compose">Soạn Email</TabsTrigger>
                <TabsTrigger value="preview">Xem trước</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="compose" className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Email Headers - Fullscreen Layout */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8">
                      <Label className="text-sm font-medium text-foreground/80">Đến *</Label>
                      <Input
                        value={emailData.to}
                        onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                        placeholder="recipient@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm font-medium text-foreground/80">CC</Label>
                      <Input
                        value={emailData.cc}
                        onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                        placeholder="cc@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm font-medium text-foreground/80">BCC</Label>
                      <Input
                        value={emailData.bcc}
                        onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                        placeholder="bcc@example.com"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8">
                      <Label className="text-sm font-medium text-foreground/80">Chủ đề *</Label>
                      <Input
                        value={emailData.subject}
                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                        placeholder="Email subject..."
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-sm font-medium text-foreground/80">Template nhanh</Label>
                      <Popover open={templatePopoverOpen} onOpenChange={setTemplatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={templatePopoverOpen}
                            className="w-full justify-between mt-1"
                          >
                            {selectedTemplate ? 
                              emailTemplates.find(t => t.id === selectedTemplate)?.name : 
                              "Chọn template..."
                            }
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Tìm kiếm template..." 
                              value={templateSearch}
                              onValueChange={setTemplateSearch}
                            />
                            <CommandEmpty>Không tìm thấy template nào.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {filteredTemplates.map((template) => (
                                <CommandItem
                                  key={template.id}
                                  value={template.id}
                                  onSelect={() => handleTemplateSelect(template.id)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">{template.name}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {template.category}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {template.subject}
                                    </p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Rich Text Toolbar - Fullscreen */}
                <div className="border rounded-lg">
                  <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                    <div className="flex items-center space-x-1">
                      <div className="flex items-center space-x-1 border-r pr-3 mr-3">
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('bold')}>
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('italic')}>
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('underline')}>
                          <Underline className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-1 border-r pr-3 mr-3">
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('justifyLeft')}>
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('justifyCenter')}>
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('justifyRight')}>
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Image className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Link className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {selectedTemplate && (
                        <Badge variant="secondary" className="text-xs">
                          {emailTemplates.find(t => t.id === selectedTemplate)?.name}
                        </Badge>
                      )}
                      <Button onClick={() => setActiveTab('preview')} variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Xem trước
                      </Button>
                      <Button 
                        onClick={handleSend}
                        disabled={!emailData.to || !emailData.subject || !emailData.content}
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Gửi Email
                      </Button>
                    </div>
                  </div>

                  {/* Email Content - Fullscreen */}
                  <Textarea
                    value={emailData.content}
                    onChange={(e) => setEmailData({ ...emailData, content: e.target.value })}
                    placeholder="Nhập nội dung email..."
                    rows={25}
                    className="w-full border-0 resize-none focus-visible:ring-0 p-4 text-base"
                  />
                </div>

                {/* Variables Helper - Fullscreen */}
                {currentTemplate && currentTemplate.variables.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Biến có sẵn</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {currentTemplate.variables.map((variable) => (
                          <Button
                            key={variable}
                            variant="outline"
                            size="sm"
                            onClick={() => insertVariable(variable)}
                          >
                            {`{${variable}}`}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            {/* Preview Tab - Fullscreen */}
            <TabsContent value="preview" className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <Card className="h-[calc(100vh-200px)]">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Xem trước Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-full overflow-y-auto">
                    <div className="space-y-4 p-6 bg-muted/50 rounded-lg h-full">
                      <div className="text-sm space-y-1">
                        <div><strong>Đến:</strong> {emailData.to}</div>
                        {emailData.cc && <div><strong>CC:</strong> {emailData.cc}</div>}
                        {emailData.bcc && <div><strong>BCC:</strong> {emailData.bcc}</div>}
                      </div>
                      <div className="text-sm">
                        <strong>Chủ đề:</strong> {emailData.subject}
                      </div>
                      <div className="border-t pt-4 flex-1">
                        <div className="whitespace-pre-wrap text-sm">
                          {emailData.content}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Regular dialog mode
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              {mode === 'reply' ? (
                <Reply className="h-5 w-5" />
              ) : (
                <Forward className="h-5 w-5" />
              )}
              <span>
                {mode === 'reply' ? 'Trả lời Email' : 
                 mode === 'reply-all' ? 'Trả lời tất cả' : 'Chuyển tiếp Email'}
              </span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          {interaction && (
            <p className="text-sm text-muted-foreground">
              {mode === 'reply' ? 'Trả lời cho' : 
               mode === 'reply-all' ? 'Trả lời tất cả cho' : 'Chuyển tiếp từ'}: {interaction.customerName} - {interaction.subject}
            </p>
          )}
        </DialogHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="flex-shrink-0 px-6 py-3 border-b border-border/50">
              <TabsList className="grid w-60 grid-cols-2">
                <TabsTrigger value="compose">Soạn Email</TabsTrigger>
                <TabsTrigger value="preview">Xem trước</TabsTrigger>
              </TabsList>
            </div>
            
            {/* Compose Email Tab */}
            <TabsContent value="compose" className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Email Headers - Better Layout */}
                <div className="space-y-4">
                  <div className="grid grid-cols-8 gap-4">
                    <div className="col-span-5">
                      <Label className="text-sm font-medium text-foreground/80">Đến *</Label>
                      <Input
                        value={emailData.to}
                        onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                        placeholder="recipient@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-1.5">
                      <Label className="text-sm font-medium text-foreground/80">CC</Label>
                      <Input
                        value={emailData.cc}
                        onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                        placeholder="cc@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-1.5">
                      <Label className="text-sm font-medium text-foreground/80">BCC</Label>
                      <Input
                        value={emailData.bcc}
                        onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                        placeholder="bcc@example.com"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-3">
                      <Label className="text-sm font-medium text-foreground/80">Chủ đề *</Label>
                      <Input
                        value={emailData.subject}
                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                        placeholder="Email subject..."
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm font-medium text-foreground/80">Template nhanh</Label>
                      <Popover open={templatePopoverOpen} onOpenChange={setTemplatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={templatePopoverOpen}
                            className="w-full justify-between mt-1"
                          >
                            {selectedTemplate ? 
                              emailTemplates.find(t => t.id === selectedTemplate)?.name : 
                              "Chọn template..."
                            }
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Tìm kiếm template..." 
                              value={templateSearch}
                              onValueChange={setTemplateSearch}
                            />
                            <CommandEmpty>Không tìm thấy template nào.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {filteredTemplates.map((template) => (
                                <CommandItem
                                  key={template.id}
                                  value={template.id}
                                  onSelect={() => handleTemplateSelect(template.id)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">{template.name}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {template.category}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {template.subject}
                                    </p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Rich Text Toolbar - Improved */}
                <div className="border rounded-lg">
                  <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                    <div className="flex items-center space-x-1">
                      <div className="flex items-center space-x-1 border-r pr-3 mr-3">
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('bold')}>
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('italic')}>
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('underline')}>
                          <Underline className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-1 border-r pr-3 mr-3">
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('justifyLeft')}>
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('justifyCenter')}>
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => applyFormatting('justifyRight')}>
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Image className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Link className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {selectedTemplate && (
                      <Badge variant="secondary" className="text-xs">
                        {emailTemplates.find(t => t.id === selectedTemplate)?.name}
                      </Badge>
                    )}
                  </div>

                  {/* Email Content */}
                  <Textarea
                    value={emailData.content}
                    onChange={(e) => setEmailData({ ...emailData, content: e.target.value })}
                    placeholder="Nhập nội dung email..."
                    rows={18}
                    className="w-full border-0 resize-none focus-visible:ring-0 p-4"
                  />
                </div>

                {/* Variables Helper */}
                {currentTemplate && currentTemplate.variables.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Biến có sẵn</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {currentTemplate.variables.map((variable) => (
                          <Button
                            key={variable}
                            variant="outline"
                            size="sm"
                            onClick={() => insertVariable(variable)}
                          >
                            {`{${variable}}`}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            {/* Preview Tab */}
            <TabsContent value="preview" className="flex-1 p-6 overflow-y-auto">
              <Card className="h-[600px]">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Xem trước Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-y-auto">
                  <div className="space-y-4 p-6 bg-muted/50 rounded-lg h-full">
                    <div className="text-sm space-y-1">
                      <div><strong>Đến:</strong> {emailData.to}</div>
                      {emailData.cc && <div><strong>CC:</strong> {emailData.cc}</div>}
                      {emailData.bcc && <div><strong>BCC:</strong> {emailData.bcc}</div>}
                    </div>
                    <div className="text-sm">
                      <strong>Chủ đề:</strong> {emailData.subject}
                    </div>
                    <div className="border-t pt-4 flex-1">
                      <div className="whitespace-pre-wrap text-sm">
                        {emailData.content}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 flex justify-between p-6 border-t border-border/50">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={() => setActiveTab('preview')} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Xem trước
            </Button>
          </div>
          <Button 
            onClick={handleSend}
            disabled={!emailData.to || !emailData.subject || !emailData.content}
          >
            <Send className="h-4 w-4 mr-2" />
            Gửi Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}