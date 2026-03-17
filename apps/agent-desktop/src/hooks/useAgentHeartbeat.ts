import { useEffect } from 'react';
import { agentsApi } from '../lib/api/agents';

export function useAgentHeartbeat() {
  useEffect(() => {
    const interval = setInterval(() => {
      agentsApi.sendHeartbeat().catch(console.error);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);
}
