import { useState, useEffect, useCallback } from 'react';
import { useAgentHeartbeat } from './hooks/useAgentHeartbeat';
import { useInteractions } from './hooks/useInteractionsApi';
import { useRealtimeQueue } from './hooks/useRealtimeQueue';
import { useRealtimeNotifications } from './hooks/useNotifications';
import { useTickets, useTicket } from './hooks/useTickets';
import { useVoiceInteractions } from './hooks/useVoiceInteractions';
import { useAuth } from './contexts/AuthContext';
import { CallControlProvider, useSharedCallControl } from './contexts/CallControlContext';
import { SoftphoneProvider, useSoftphone } from './contexts/SoftphoneContext';
import { ConnectionHubProvider } from './contexts/ConnectionHubContext';
import { ConnectionBanner } from './components/ConnectionBanner';
import { Button } from './components/ui/button';
// Agent Desktop Application with multi-channel support
import { EnhancedAgentHeader } from './components/EnhancedAgentHeader';
import { InteractionList } from './components/InteractionList';
import { InteractionDetail } from './components/InteractionDetail';
import { CustomerInfo } from './components/CustomerInfoScrollFixed';
import { TicketDetail } from './components/TicketDetail';
import { TransferCallDialog } from './components/TransferCallDialog';
import { FloatingCallWidget } from './components/FloatingCallWidget';
import { SoftphoneBubble } from './components/SoftphoneBubble';
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
    updateCallStatus,
    showCallWidget,
    hideCallWidget
  } = useCall();

  // Enhanced agent status context
  const { agentState } = useEnhancedAgentStatus();

  // Shared call control (single SIP.js instance for entire app)
  const { user } = useAuth();
  const callControl = useSharedCallControl();

  // Live voice interactions from WebSocket events
  const { voiceInteractions } = useVoiceInteractions();

  // Softphone bubble context
  const softphone = useSoftphone();

  // Bridge SIP.js incoming call → CallContext
  useEffect(() => {
    if (callControl.incomingCall && !currentCall) {
      startCall({
        customerName: callControl.incomingCall.callerName || callControl.incomingCall.callerNumber,
        customerPhone: callControl.incomingCall.callerNumber,
        status: 'ringing',
        source: 'Inbound Voice (SIP)',
      });
    }
  }, [callControl.incomingCall, currentCall, startCall]);

  // Bridge SIP.js call answered → update CallContext status
  useEffect(() => {
    if (callControl.activeCallId && currentCall?.status === 'ringing') {
      updateCallStatus('connected');
    }
  }, [callControl.activeCallId, currentCall?.status, updateCallStatus]);

  // Active call interaction — injected into interaction list during call
  const [activeCallInteraction, setActiveCallInteraction] = useState<any>(null);
  // Remember the last ended call info so we can find the completed interaction after refresh
  const [lastEndedCallInfo, setLastEndedCallInfo] = useState<{ phone: string; realId?: string } | null>(null);

  // Create/update active call interaction when call state changes
  useEffect(() => {
    if (callControl.incomingCall || callControl.hasActiveCall) {
      const phone = currentCall?.customerPhone || callControl.incomingCall?.callerNumber || '';
      const name = currentCall?.customerName || callControl.incomingCall?.callerName || phone;
      const isConnected = callControl.hasActiveCall;

      // Check if real interaction exists from DB
      const real = interactions.find((i: any) =>
        i.channel === 'voice' &&
        (i.status === 'in-progress' || i.status === 'new') &&
        i.metadata?.callerNumber === phone
      );

      const interaction = real || {
        id: `live-call-${phone}`,
        displayId: isConnected ? 'Cuộc gọi đang diễn ra' : 'Cuộc gọi đến',
        type: 'call',
        channel: 'voice',
        status: isConnected ? 'in-progress' : 'new',
        direction: (currentCall?.source || '').includes('Outbound') ? 'outbound' : 'inbound',
        customerName: name,
        customerPhone: phone,
        customerEmail: '',
        priority: 'high',
        isVip: false,
        isVIP: false,
        tags: [],
        source: currentCall?.source || 'Voice',
        subject: isConnected ? `Đang gọi với ${name}` : `Cuộc gọi đến từ ${name}`,
        snippet: phone,
        timestamp: new Date().toISOString(),
        time: new Date().toISOString(),
        duration: '',
        assignedAgent: isConnected ? (user?.agentId || 'agent') : null,
        metadata: { callerNumber: phone },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setActiveCallInteraction(interaction);
      setSelectedInteraction(interaction);
      setLastEndedCallInfo(null); // clear any pending ended info
    } else if (activeCallInteraction) {
      // Call ended — save info for matching after interactions refresh
      const phone = activeCallInteraction.customerPhone || activeCallInteraction.metadata?.callerNumber || '';
      const realId = activeCallInteraction.id?.startsWith('live-call-') ? undefined : activeCallInteraction.id;
      setLastEndedCallInfo({ phone, realId });
      setActiveCallInteraction(null);
    }
  }, [callControl.incomingCall, callControl.hasActiveCall, currentCall]);

  // After call ended: find the completed interaction once interactions list refreshes
  useEffect(() => {
    if (!lastEndedCallInfo || activeCallInteraction) return;

    const { phone, realId } = lastEndedCallInfo;

    // Try find by real ID first
    if (realId) {
      const byId = interactions.find((i: any) => i.id === realId);
      if (byId) {
        setSelectedInteraction(byId);
        setLastEndedCallInfo(null);
        return;
      }
    }

    // Try find by phone + completed status
    const completed = interactions.find((i: any) =>
      i.channel === 'voice' &&
      (i.status === 'completed' || i.status === 'closed' || i.status === 'resolved') &&
      i.metadata?.callerNumber === phone
    );
    if (completed) {
      setSelectedInteraction(completed);
      setLastEndedCallInfo(null);
      return;
    }

    // Try find by phone + any status (interaction might not be completed yet)
    const any = interactions.find((i: any) =>
      i.channel === 'voice' && i.metadata?.callerNumber === phone
    );
    if (any) {
      setSelectedInteraction(any);
      setLastEndedCallInfo(null);
    }
  }, [interactions, lastEndedCallInfo, activeCallInteraction]);

  // Bridge SIP.js call ended → endCall in CallContext
  useEffect(() => {
    if (!callControl.hasActiveCall && !callControl.incomingCall && currentCall && currentCall.status !== 'ended') {
      // SIP.js has no active call but CallContext thinks there's one — sync
      if (callControl.sipStatus === 'registered') {
        // Only auto-end if SIP is connected (avoids false cleanup on init)
        endCall();
      }
    }
  }, [callControl.hasActiveCall, callControl.incomingCall, callControl.sipStatus, currentCall, endCall]);

  // Notifications context
  const {
    addMissedCall,
    addTicketAssignment,
    addTicketDue,
    addSystemAlert,
    addScheduleReminder
  } = useNotifications();

  // Auto-select first interaction when data loads (only if nothing selected and no pending ended call)
  useEffect(() => {
    if (!selectedInteraction && !lastEndedCallInfo && interactions.length > 0) {
      setSelectedInteraction(interactions[0]);
    }
  }, [interactions, selectedInteraction, lastEndedCallInfo]);

  // Sync selectedInteraction with latest data from API (e.g., status changes after call end)
  useEffect(() => {
    if (selectedInteraction && interactions.length > 0 && !activeCallInteraction && !lastEndedCallInfo) {
      const updated = interactions.find((i: any) => i.id === selectedInteraction.id);
      if (updated && updated.status !== selectedInteraction.status) {
        setSelectedInteraction(updated);
      }
    }
  }, [interactions, selectedInteraction, activeCallInteraction, lastEndedCallInfo]);

  const toggleLeftPanel = () => {
    setLeftPanelCollapsed(!leftPanelCollapsed);
  };

  const toggleRightPanel = () => {
    setRightPanelCollapsed(!rightPanelCollapsed);
  };

  const handleNavigateToInteraction = (interactionId: string) => {
    const targetInteraction = interactions.find((item: any) => item.id === interactionId);
    
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

  const handleStartCall = useCallback(async (interaction: any) => {
    const phone = interaction.customerPhone || interaction.phone || '';
    const destination = phone.replace(/[\s\-\(\)]/g, '');
    if (callControl.isRegistered && destination) {
      try {
        await callControl.dial(destination);
        startCall({
          customerName: interaction.customerName,
          customerPhone: phone,
          customerEmail: interaction.customerEmail,
          status: 'ringing',
          source: 'Outbound Voice (SIP)',
          avatar: '👤',
          interactionId: interaction.id,
        });
      } catch (err) {
        console.error('Dial failed:', err);
      }
    } else {
      // Fallback: show widget with mock data if SIP not registered
      startCall({
        customerName: interaction.customerName,
        customerPhone: phone || '+84 123 456 789',
        customerEmail: interaction.customerEmail,
        status: 'connected',
        source: interaction.source || 'Unknown',
        avatar: '👤',
        interactionId: interaction.id,
      });
    }
  }, [callControl, startCall]);

  const handleCallTransfer = () => {
    setTransferDialogOpen(true);
  };

  const handleCallSurvey = () => {
    console.log('Transferring to survey...');
  };

  const handleMaximizeCall = () => {
    if (currentCall?.interactionId) {
      const callInteraction = interactions.find(
        (item: any) => item.id === currentCall.interactionId
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
        sipStatus={callControl.sipStatus}
        bgProtection={callControl.bgProtection}
      />
      <ConnectionBanner />

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
              interactions={activeCallInteraction
                ? [activeCallInteraction, ...(interactions as any).filter((i: any) => i.id !== activeCallInteraction.id)]
                : interactions as any}
              channelFilter={channelFilter}
              onChannelFilterChange={setChannelFilter}
              onCallBack={handleCallBack}
              forceTab={activeCallInteraction
                ? (callControl.hasActiveCall ? 'assigned' : 'queue')
                : undefined}
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
            callControl={callControl}
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

      {/* Softphone Bubble — global WebRTC phone UI */}
      <SoftphoneBubble />

      {/* Floating Agent Status Widget (when panels collapsed) */}
      {leftPanelCollapsed && rightPanelCollapsed && (
        <AgentStatusWidget position="floating" />
      )}

      {/* Dialogs */}
      <TransferCallDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        customerName={selectedInteraction?.customerName || ''}
        onTransferCall={async (dest, type) => { await callControl.transfer(dest, type); }}
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

      {/* Keyboard shortcuts button (moved from demo controls) */}
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const agentId = user?.agentId || 'AGT001';
  const agentName = user?.fullName || 'Agent';

  return (
    <ConnectionHubProvider>
      <NotificationProvider>
        <EnhancedAgentStatusProvider agentId={agentId} agentName={agentName}>
          <CallProvider>
            <CallControlProvider>
              <SoftphoneProvider>
                <AppContent />
              </SoftphoneProvider>
            </CallControlProvider>
          </CallProvider>
        </EnhancedAgentStatusProvider>
      </NotificationProvider>
    </ConnectionHubProvider>
  );
}