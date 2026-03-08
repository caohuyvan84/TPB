import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// Base notification interface
export interface BaseNotification {
  id: string;
  type: 'missed-call' | 'ticket-assignment' | 'ticket-due' | 'system-alert' | 'schedule-reminder';
  createdAt: Date;
  status: 'new' | 'viewed' | 'actioned' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
}

// Specific notification types
export interface MissedCallNotification extends BaseNotification {
  type: 'missed-call';
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  missedAt: Date;
  reason: 'timeout' | 'not-ready' | 'disconnected' | 'away';
  isVIP?: boolean;
  source: string;
  callbackAttempted?: boolean;
}

export interface TicketAssignmentNotification extends BaseNotification {
  type: 'ticket-assignment';
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  subject: string;
  assignedBy: string;
  dueDate?: Date;
  category: string;
}

export interface TicketDueNotification extends BaseNotification {
  type: 'ticket-due';
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  subject: string;
  dueDate: Date;
  timeUntilDue: number; // minutes
  category: string;
}

export interface SystemAlertNotification extends BaseNotification {
  type: 'system-alert';
  alertType: 'maintenance' | 'outage' | 'update' | 'security';
  affectedSystems: string[];
  duration?: string;
  actionRequired?: boolean;
}

export interface ScheduleReminderNotification extends BaseNotification {
  type: 'schedule-reminder';
  eventType: 'break' | 'meeting' | 'training' | 'shift-end';
  eventTime: Date;
  duration?: number; // minutes
  location?: string;
}

// Union type for all notifications
export type AppNotification = 
  | MissedCallNotification 
  | TicketAssignmentNotification 
  | TicketDueNotification 
  | SystemAlertNotification 
  | ScheduleReminderNotification;

export interface NotificationSettings {
  // Global settings
  enableNotifications: boolean;
  enableSound: boolean;
  autoHideAfter: number; // seconds
  maxActiveNotifications: number;
  
  // Per-type settings
  missedCalls: {
    enabled: boolean;
    vipOnly: boolean;
    showOnlyWhenOnline: boolean;
  };
  
  ticketAssignments: {
    enabled: boolean;
    highPriorityOnly: boolean;
  };
  
  ticketDueDates: {
    enabled: boolean;
    reminderMinutes: number[];
  };
  
  systemAlerts: {
    enabled: boolean;
    criticalOnly: boolean;
  };
  
  scheduleReminders: {
    enabled: boolean;
    reminderMinutes: number[];
  };
}

interface NotificationContextType {
  // All notifications
  notifications: AppNotification[];
  activeNotifications: AppNotification[];
  
  // CRUD operations
  addNotification: (notification: Omit<AppNotification, 'id' | 'status' | 'createdAt'>) => string;
  updateNotification: (id: string, updates: Partial<AppNotification>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  clearOldNotifications: (olderThanHours?: number) => void;
  
  // Status management
  markAsViewed: (id: string) => void;
  markAsActioned: (id: string) => void;
  markAsDismissed: (id: string) => void;
  
  // Type-specific helpers
  addMissedCall: (data: Omit<MissedCallNotification, 'id' | 'status' | 'createdAt' | 'type' | 'title' | 'message'>) => string;
  addTicketAssignment: (data: Omit<TicketAssignmentNotification, 'id' | 'status' | 'createdAt' | 'type' | 'title' | 'message'>) => string;
  addTicketDue: (data: Omit<TicketDueNotification, 'id' | 'status' | 'createdAt' | 'type' | 'title' | 'message'>) => string;
  addSystemAlert: (data: Omit<SystemAlertNotification, 'id' | 'status' | 'createdAt' | 'type' | 'title' | 'message'>) => string;
  addScheduleReminder: (data: Omit<ScheduleReminderNotification, 'id' | 'status' | 'createdAt' | 'type' | 'title' | 'message'>) => string;
  
  // Filtering and counts
  getNotificationsByType: (type: AppNotification['type']) => AppNotification[];
  getUnreadCount: () => number;
  getUnreadCountByType: (type: AppNotification['type']) => number;
  
  // Settings
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  
  // Statistics
  getNotificationStats: () => {
    total: number;
    byType: Record<AppNotification['type'], number>;
    byPriority: Record<AppNotification['priority'], number>;
    byStatus: Record<AppNotification['status'], number>;
    todayCount: number;
  };
  
  // Agent status integration
  getNotReadyMissedCallsWarning: () => {
    count: number;
    timeWindow: number;
    shouldShowWarning: boolean;
  };
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeNotifications, setActiveNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    enableNotifications: true,
    enableSound: true,
    autoHideAfter: 8,
    maxActiveNotifications: 3,
    missedCalls: {
      enabled: true,
      vipOnly: false,
      showOnlyWhenOnline: true,
    },
    ticketAssignments: {
      enabled: true,
      highPriorityOnly: false,
    },
    ticketDueDates: {
      enabled: true,
      reminderMinutes: [60, 30, 15],
    },
    systemAlerts: {
      enabled: true,
      criticalOnly: false,
    },
    scheduleReminders: {
      enabled: true,
      reminderMinutes: [15, 5],
    },
  });

  // Auto-hide notifications
  useEffect(() => {
    if (activeNotifications.length === 0) return;

    const timeouts = activeNotifications.map(notification => {
      return setTimeout(() => {
        removeFromActiveNotifications(notification.id);
      }, settings.autoHideAfter * 1000);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [activeNotifications, settings.autoHideAfter]);

  // Generate unique ID
  const generateId = () => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Helper to create notification title and message
  const createNotificationContent = (type: AppNotification['type'], data: any) => {
    switch (type) {
      case 'missed-call':
        return {
          title: 'Cuộc gọi nhỡ',
          message: `Bạn vừa bỏ lỡ cuộc gọi từ ${data.customerPhone}${data.customerName ? ` (${data.customerName})` : ''}`
        };
      case 'ticket-assignment':
        return {
          title: 'Ticket được phân công',
          message: `Bạn được phân công ticket #${data.ticketNumber} từ ${data.customerName}`
        };
      case 'ticket-due':
        return {
          title: 'Ticket sắp đến hạn',
          message: `Ticket #${data.ticketNumber} sẽ đến hạn trong ${data.timeUntilDue} phút`
        };
      case 'system-alert':
        return {
          title: 'Cảnh báo hệ thống',
          message: `${data.alertType}: ${data.affectedSystems.join(', ')}`
        };
      case 'schedule-reminder':
        return {
          title: 'Nhắc nhở lịch trình',
          message: `${data.eventType} sắp bắt đầu lúc ${data.eventTime.toLocaleTimeString()}`
        };
      default:
        return { title: 'Thông báo', message: 'Có thông báo mới' };
    }
  };

  // Add notification
  const addNotification = useCallback((notificationData: Omit<AppNotification, 'id' | 'status' | 'createdAt'>) => {
    const id = generateId();
    const { title, message } = createNotificationContent(notificationData.type, notificationData);
    
    const notification: AppNotification = {
      ...notificationData,
      id,
      status: 'new',
      createdAt: new Date(),
      title,
      message,
    } as AppNotification;

    // Add to notifications list
    setNotifications(prev => [notification, ...prev]);

    // Show as active notification if settings allow
    const shouldShow = shouldShowNotification(notification);
    if (shouldShow) {
      setActiveNotifications(prev => {
        const updated = [notification, ...prev];
        return updated.slice(0, settings.maxActiveNotifications);
      });

      // Play sound if enabled
      if (settings.enableSound) {
        playNotificationSound();
      }
    }

    return id;
  }, [settings]);

  // Type-specific add functions
  const addMissedCall = useCallback((data: Omit<MissedCallNotification, 'id' | 'status' | 'createdAt' | 'type' | 'title' | 'message'>) => {
    return addNotification({
      ...data,
      type: 'missed-call',
      priority: data.isVIP ? 'urgent' : data.priority,
    });
  }, [addNotification]);

  const addTicketAssignment = useCallback((data: Omit<TicketAssignmentNotification, 'id' | 'status' | 'createdAt' | 'type' | 'title' | 'message'>) => {
    return addNotification({
      ...data,
      type: 'ticket-assignment',
    });
  }, [addNotification]);

  const addTicketDue = useCallback((data: Omit<TicketDueNotification, 'id' | 'status' | 'createdAt' | 'type' | 'title' | 'message'>) => {
    return addNotification({
      ...data,
      type: 'ticket-due',
    });
  }, [addNotification]);

  const addSystemAlert = useCallback((data: Omit<SystemAlertNotification, 'id' | 'status' | 'createdAt' | 'type' | 'title' | 'message'>) => {
    return addNotification({
      ...data,
      type: 'system-alert',
    });
  }, [addNotification]);

  const addScheduleReminder = useCallback((data: Omit<ScheduleReminderNotification, 'id' | 'status' | 'createdAt' | 'type' | 'title' | 'message'>) => {
    return addNotification({
      ...data,
      type: 'schedule-reminder',
    });
  }, [addNotification]);

  // Check if notification should be shown
  const shouldShowNotification = (notification: AppNotification): boolean => {
    if (!settings.enableNotifications) return false;

    switch (notification.type) {
      case 'missed-call':
        const missedCall = notification as MissedCallNotification;
        return settings.missedCalls.enabled && 
               (!settings.missedCalls.vipOnly || missedCall.isVIP);
      
      case 'ticket-assignment':
        return settings.ticketAssignments.enabled &&
               (!settings.ticketAssignments.highPriorityOnly || ['high', 'urgent'].includes(notification.priority));
      
      case 'ticket-due':
        return settings.ticketDueDates.enabled;
      
      case 'system-alert':
        return settings.systemAlerts.enabled &&
               (!settings.systemAlerts.criticalOnly || notification.priority === 'urgent');
      
      case 'schedule-reminder':
        return settings.scheduleReminders.enabled;
      
      default:
        return true;
    }
  };

  // Status management
  const updateNotification = useCallback((id: string, updates: Partial<AppNotification>) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, ...updates } : notification
      )
    );
  }, []);

  const markAsViewed = useCallback((id: string) => {
    updateNotification(id, { status: 'viewed' });
  }, [updateNotification]);

  const markAsActioned = useCallback((id: string) => {
    updateNotification(id, { status: 'actioned' });
  }, [updateNotification]);

  const markAsDismissed = useCallback((id: string) => {
    updateNotification(id, { status: 'dismissed' });
  }, [updateNotification]);

  // Remove from active notifications
  const removeFromActiveNotifications = useCallback((id: string) => {
    setActiveNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const removeNotification = useCallback((id: string) => {
    removeFromActiveNotifications(id);
  }, [removeFromActiveNotifications]);

  const clearAllNotifications = useCallback(() => {
    setActiveNotifications([]);
  }, []);

  const clearOldNotifications = useCallback((olderThanHours: number = 24) => {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    setNotifications(prev => prev.filter(notification => notification.createdAt > cutoffTime));
  }, []);

  // Filtering and counts
  const getNotificationsByType = useCallback((type: AppNotification['type']) => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(notification => notification.status === 'new').length;
  }, [notifications]);

  const getUnreadCountByType = useCallback((type: AppNotification['type']) => {
    return notifications.filter(notification => 
      notification.type === type && notification.status === 'new'
    ).length;
  }, [notifications]);

  // Settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Statistics
  const getNotificationStats = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = notifications.filter(
      notification => notification.createdAt >= today
    ).length;

    const byType = notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<AppNotification['type'], number>);

    const byPriority = notifications.reduce((acc, notification) => {
      acc[notification.priority] = (acc[notification.priority] || 0) + 1;
      return acc;
    }, {} as Record<AppNotification['priority'], number>);

    const byStatus = notifications.reduce((acc, notification) => {
      acc[notification.status] = (acc[notification.status] || 0) + 1;
      return acc;
    }, {} as Record<AppNotification['status'], number>);

    return {
      total: notifications.length,
      byType,
      byPriority,
      byStatus,
      todayCount,
    };
  }, [notifications]);

  // Agent status integration (for missed calls)
  const getNotReadyMissedCallsWarning = useCallback(() => {
    const timeWindow = 15; // minutes
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000);
    
    const recentMissedCalls = notifications.filter(
      notification => 
        notification.type === 'missed-call' &&
        notification.createdAt >= cutoffTime &&
        (notification as MissedCallNotification).reason === 'not-ready'
    );

    return {
      count: recentMissedCalls.length,
      timeWindow,
      shouldShowWarning: recentMissedCalls.length >= 3,
    };
  }, [notifications]);

  // Sound effect
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  const value: NotificationContextType = {
    notifications,
    activeNotifications,
    addNotification,
    updateNotification,
    removeNotification,
    clearAllNotifications,
    clearOldNotifications,
    markAsViewed,
    markAsActioned,
    markAsDismissed,
    addMissedCall,
    addTicketAssignment,
    addTicketDue,
    addSystemAlert,
    addScheduleReminder,
    getNotificationsByType,
    getUnreadCount,
    getUnreadCountByType,
    settings,
    updateSettings,
    getNotificationStats,
    getNotReadyMissedCallsWarning,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}