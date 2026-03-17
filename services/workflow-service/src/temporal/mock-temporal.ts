// Mock Temporal workflow interface
export interface WorkflowContext {
  workflowId: string;
  runId: string;
  variables: Record<string, any>;
}

export interface WorkflowStep {
  name: string;
  type: string;
  config: Record<string, any>;
}

export class MockTemporalClient {
  async startWorkflow(workflowId: string, steps: WorkflowStep[], variables: Record<string, any>): Promise<string> {
    // Mock: Return a run ID
    return `run-${Date.now()}`;
  }

  async getWorkflowStatus(workflowId: string): Promise<string> {
    // Mock: Always return completed
    return 'completed';
  }

  async cancelWorkflow(workflowId: string): Promise<void> {
    // Mock: No-op
  }
}

export class MockActivityExecutor {
  async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    // Mock execution based on step type
    switch (step.type) {
      case 'send_notification':
        return { notificationId: 'mock-notif-id' };
      case 'send_email':
        return { emailId: 'mock-email-id' };
      case 'update_object':
        return { updated: true };
      case 'assign_agent':
        return { agentId: 'mock-agent-id' };
      case 'wait':
        return { waited: step.config.duration };
      case 'condition':
        return { result: true };
      default:
        return { executed: true };
    }
  }
}
