import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SoftphoneState {
  isOpen: boolean;
  isExpanded: boolean;
  dialNumber: string;
  showDialpad: boolean;
  /** Metadata from call.routing event (inbound) */
  callMetadata: CallMetadata | null;
}

export interface CallMetadata {
  callId?: string;
  callerNumber?: string;
  callerName?: string;
  customerName?: string;
  queue?: string;
  ivrSelection?: string;
  waitTimeMs?: number;
  direction?: 'inbound' | 'outbound';
  destination?: string;
}

interface SoftphoneContextType extends SoftphoneState {
  open: (number?: string) => void;
  close: () => void;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  setDialNumber: (n: string) => void;
  setShowDialpad: (v: boolean) => void;
  setCallMetadata: (m: CallMetadata | null) => void;
}

const SoftphoneContext = createContext<SoftphoneContextType | undefined>(undefined);

export function SoftphoneProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [showDialpad, setShowDialpad] = useState(false);
  const [callMetadata, setCallMetadata] = useState<CallMetadata | null>(null);

  const open = useCallback((number?: string) => {
    setIsOpen(true);
    setIsExpanded(true);
    if (number) setDialNumber(number);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsExpanded(false);
    setDialNumber('');
    setCallMetadata(null);
  }, []);

  const expand = useCallback(() => { setIsExpanded(true); }, []);
  const collapse = useCallback(() => { setIsExpanded(false); }, []);
  const toggle = useCallback(() => { setIsExpanded(p => !p); }, []);

  return (
    <SoftphoneContext.Provider value={{
      isOpen, isExpanded, dialNumber, showDialpad, callMetadata,
      open, close, expand, collapse, toggle,
      setDialNumber, setShowDialpad, setCallMetadata,
    }}>
      {children}
    </SoftphoneContext.Provider>
  );
}

export function useSoftphone() {
  const ctx = useContext(SoftphoneContext);
  if (!ctx) throw new Error('useSoftphone must be used within SoftphoneProvider');
  return ctx;
}
