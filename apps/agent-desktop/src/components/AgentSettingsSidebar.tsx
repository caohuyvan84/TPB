import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEnhancedAgentStatus as useAgentStatus, ChannelType } from "@/components/EnhancedAgentStatusContext";
import { 
  Phone, 
  Mail, 
  MessageSquare,
  Settings as SettingsIcon,
  Bell,
  Monitor,
  X,
  CheckCircle,
  Info,
  MessageCircle,
  Facebook,
  AtSign
} from "lucide-react";

interface AgentSettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentSettingsSidebar({ isOpen, onClose }: AgentSettingsSidebarProps) {
  const [activeTab, setActiveTab] = useState("status");
  const { getChannelStatus, setChannelStatus, isChannelReady } = useAgentStatus();

  if (!isOpen) return null;

  const voiceStatus = getChannelStatus('voice');
  const emailStatus = getChannelStatus('email');
  const chatStatus = getChannelStatus('chat');

  // Mock resources data
  const voiceResources = [
    { id: 'hl-1900', name: 'Hotline 1900 xxxx', number: '1900xxxx', enabled: true },
    { id: 'hl-024', name: 'Hotline 024 xxxx yyyy', number: '024xxxxyyyy', enabled: true }
  ];

  const chatResources = [
    { id: 'zalo', name: 'Zalo OA - MPT', handle: 'zalo-oa-mpt', enabled: true },
    { id: 'fb', name: 'Facebook Messenger - MP Transformation', handle: 'fb-mptransformation', enabled: false }
  ];

  const emailResources = [
    { id: 'support', name: 'Support Email', handle: 'support@mpt.vn', enabled: true },
    { id: 'customer', name: 'Customer Service Email', handle: 'customerservice@mpt.vn', enabled: true }
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[600px] bg-background z-50 shadow-2xl flex flex-col transition-transform duration-300">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#155DFC]/10 p-2 rounded-lg">
                <SettingsIcon className="h-5 w-5 text-[#155DFC]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Cài đặt cá nhân</h2>
                <p className="text-sm text-muted-foreground">Quản lý cài đặt và tùy chọn của bạn</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger value="status" className="data-[state=active]:bg-background">
                <Monitor className="h-4 w-4 mr-2" />
                Trạng thái
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-background">
                <Bell className="h-4 w-4 mr-2" />
                Thông báo
              </TabsTrigger>
              <TabsTrigger value="preferences" className="data-[state=active]:bg-background">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Tùy chọn
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Status Tab */}
              <TabsContent value="status" className="mt-0 space-y-4">
                {/* Overall Status Card */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Trạng thái tổng thể</h3>
                    
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Agent: Nguyễn Văn A</p>
                            <p className="text-sm font-semibold text-green-700">Ready - Sẵn sàng nhận tương tác</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Toggle all channels
                            const allReady = isChannelReady('voice') && isChannelReady('email') && isChannelReady('chat');
                            const newStatus = allReady ? 'not-ready' : 'ready';
                            setChannelStatus('voice', newStatus);
                            setChannelStatus('email', newStatus);
                            setChannelStatus('chat', newStatus);
                          }}
                        >
                          Not Ready All
                        </Button>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800">
                          Bạn có thể quản lý trạng thái độc lập cho từng kênh hoặc chuyển đổi đồng thời cho tất cả các kênh.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Channel by Channel Status */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Trạng thái theo kênh</h3>

                  {/* Voice Channel */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <Phone className="h-5 w-5 text-green-600" />
                          </div>
                          <span className="text-sm font-medium">Voice Call</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-black text-white text-xs">Ready</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setChannelStatus('voice', isChannelReady('voice') ? 'not-ready' : 'ready')}
                          >
                            Not Ready
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Tài nguyên (2)</p>
                        {voiceResources.map((resource) => (
                          <div key={resource.id} className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs font-medium text-foreground">{resource.name}</p>
                                <p className="text-xs text-muted-foreground">{resource.number}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Đang nhận</Label>
                              <Switch 
                                checked={resource.enabled} 
                                className="data-[state=checked]:bg-black"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Chat/Social Channel */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <MessageCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <span className="text-sm font-medium">Chat/Social</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-black text-white text-xs">Ready</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setChannelStatus('chat', isChannelReady('chat') ? 'not-ready' : 'ready')}
                          >
                            Not Ready
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Tài nguyên (2)</p>
                        {chatResources.map((resource) => (
                          <div key={resource.id} className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {resource.id === 'zalo' ? (
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Facebook className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div>
                                <p className="text-xs font-medium text-foreground">{resource.name}</p>
                                <p className="text-xs text-muted-foreground">{resource.handle}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">
                                {resource.enabled ? 'Đang nhận' : 'Tạm ngưng'}
                              </Label>
                              <Switch 
                                checked={resource.enabled}
                                className={resource.enabled ? "data-[state=checked]:bg-black" : ""}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Email Channel */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <Mail className="h-5 w-5 text-green-600" />
                          </div>
                          <span className="text-sm font-medium">Email</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-black text-white text-xs">Ready</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setChannelStatus('email', isChannelReady('email') ? 'not-ready' : 'ready')}
                          >
                            Not Ready
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Tài nguyên (2)</p>
                        {emailResources.map((resource) => (
                          <div key={resource.id} className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <AtSign className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs font-medium text-foreground">{resource.name}</p>
                                <p className="text-xs text-muted-foreground">{resource.handle}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Đang nhận</Label>
                              <Switch 
                                checked={resource.enabled}
                                className="data-[state=checked]:bg-black"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="mt-0">
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p>Cài đặt thông báo</p>
                    <p className="text-sm">Chức năng đang được phát triển</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="mt-0">
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <SettingsIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p>Tùy chọn cá nhân</p>
                    <p className="text-sm">Chức năng đang được phát triển</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </>
  );
}