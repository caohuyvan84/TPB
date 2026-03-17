import { useState, useEffect } from 'react';
import { useAgentHeartbeat } from './hooks/useAgentHeartbeat';
import { useInteractions } from './hooks/useInteractionsApi';
import { useRealtimeQueue } from './hooks/useRealtimeQueue';
import { useRealtimeNotifications } from './hooks/useNotifications';
import { useTickets, useTicket } from './hooks/useTickets';
import { Button } from './components/ui/button';
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


// Inner component that uses call context
function AppContent() {
  // Agent heartbeat
  useAgentHeartbeat();
  
  // Real-time queue updates
  useRealtimeQueue();
  
  // Real-time notification updates
  useRealtimeNotifications();
  
  // States
  const [selectedInteraction, setSelectedInteraction] = useState<any>(null);
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
  
  // Fetch interactions from API
  const { 
    data: interactions = [], 
    isLoading: interactionsLoading,
    error: interactionsError 
  } = useInteractions({
    channel: channelFilter === 'all' ? undefined : [channelFilter],
  });

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

  // Auto-select first interaction when data loads
  useEffect(() => {
    if (!selectedInteraction && interactions.length > 0) {
      setSelectedInteraction(interactions[0]);
    }
  }, [interactions, selectedInteraction]);

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
    // TODO: Call API to update interaction status
    // interactionsApi.updateStatus(interaction.id, { status: 'completed' });
    
    // Start a call with the customer
    const callData = {
      type: 'outbound' as const,
      status: 'ringing' as const,
      customerName: interaction.customerName || 'Khách hàng',
      customerPhone: interaction.customerPhone || '',
      startTime: new Date().toISOString(),
      direction: 'outbound' as const,
      source: 'callback'
    };
    
    startCall(callData);
  };

  // Handle ticket viewing from notifications
  const handleViewTicket = (ticketId: string) => {
    // Ticket will be loaded by TicketDetail component using useTicket hook
    setSelectedTicket({ id: ticketId });
    setRightPanelView('ticket');
    // Expand right panel if it was collapsed
    if (rightPanelCollapsed) {
      setRightPanelCollapsed(false);
    }
  };

  // Handle ticket updates
  const handleUpdateTicket = (ticketId: string, updates: any) => {
    console.log('Updating ticket:', ticketId, updates);
    // Ticket updates handled by TicketDetail component
  };

  // Handle ticket comments
  const handleAddTicketComment = (ticketId: string, comment: string, isInternal = false) => {
    console.log('Adding comment to ticket:', ticketId, comment, isInternal);
    // Comments handled by TicketDetail component
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
    addMissedCall({
      customerPhone: '+84 912 345 678',
      customerName: 'Demo Customer',
      missedAt: new Date(),
      reason: 'timeout' as const,
      isVIP: false,
      source: 'Hotline (1900-1234)',
      priority: 'medium' as const
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
    addTicketAssignment({
      ticketId: crypto.randomUUID(),
      ticketNumber: 'TK-DEMO-001',
      customerName: 'Demo Customer',
      subject: 'Demo ticket',
      assignedBy: 'Supervisor',
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
      category: 'Báo lỗi',
      priority: 'high' as const
    });
  };

  const simulateTicketDue = () => {
    addTicketDue({
      ticketId: crypto.randomUUID(),
      ticketNumber: 'TK-DEMO-002',
      customerName: 'Demo Customer',
      subject: 'Demo ticket due',
      dueDate: new Date(Date.now() + 30 * 60 * 1000),
      timeUntilDue: 30,
      category: 'Báo lỗi',
      priority: 'urgent' as const
    });
  };

  const simulateSystemAlert = () => {
    addSystemAlert({
      alertType: 'maintenance' as const,
      affectedSystems: ['Email System', 'CRM'],
      duration: '2 hours',
      actionRequired: true,
      priority: 'high' as const
    });
  };

  const simulateScheduleReminder = () => {
    addScheduleReminder({
      eventType: 'break' as const,
      eventTime: new Date(Date.now() + 15 * 60 * 1000),
      duration: 15,
      location: 'Break Room',
      priority: 'medium' as const
    });
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
        interactions={interactions as any}
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
          {interactionsLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-muted-foreground">Đang tải interactions...</p>
              </div>
            </div>
          ) : interactionsError ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center space-y-3">
                <div className="text-red-500 text-4xl">⚠️</div>
                <p className="text-sm font-medium">Không thể tải interactions</p>
                <p className="text-xs text-muted-foreground">
                  Backend chưa sẵn sàng. Đang thử lại...
                </p>
              </div>
            </div>
          ) : (
            <InteractionList 
              selectedId={selectedInteraction?.id}
              onSelectInteraction={handleSelectInteraction}
              interactions={interactions as any}
              channelFilter={channelFilter}
              onChannelFilterChange={setChannelFilter}
              onCallBack={handleCallBack}
            />
          )}
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
                  Ticket #{selectedTicket.displayId || selectedTicket.number || selectedTicket.id}
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
                ticketId={selectedTicket.id}
                onClose={handleCloseTicketView}
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
    <NotificationProvider>
      <EnhancedAgentStatusProvider agentId="AGT001" agentName="Agent Tung">
        <CallProvider>
          <AppContent />
        </CallProvider>
      </EnhancedAgentStatusProvider>
    </NotificationProvider>
  );
}