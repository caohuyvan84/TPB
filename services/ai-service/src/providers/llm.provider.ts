// Mock LLM provider interface
export interface LLMProvider {
  suggest(context: string): Promise<string>;
  summarize(text: string): Promise<string>;
  analyzeSentiment(text: string): Promise<{ sentiment: string; confidence: number }>;
  classify(text: string): Promise<{ category: string; priority: string }>;
}

export class MockLLMProvider implements LLMProvider {
  async suggest(context: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simple mock suggestions based on keywords
    if (context.toLowerCase().includes('loan')) {
      return 'Our current loan rates start at 8.5% per annum for personal loans. Would you like to know more about our loan products?';
    }
    if (context.toLowerCase().includes('account')) {
      return 'We offer various account types including savings and checking accounts. Which type interests you?';
    }
    return 'Thank you for contacting us. How can I assist you today?';
  }

  async summarize(text: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const words = text.split(' ');
    if (words.length <= 20) {
      return text;
    }
    
    // Simple summarization: first 15 words + last 5 words
    return words.slice(0, 15).join(' ') + '...' + words.slice(-5).join(' ');
  }

  async analyzeSentiment(text: string): Promise<{ sentiment: string; confidence: number }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const positive = ['good', 'great', 'excellent', 'happy', 'satisfied', 'thank'];
    const negative = ['bad', 'poor', 'terrible', 'angry', 'disappointed', 'complaint'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positive.filter(word => lowerText.includes(word)).length;
    const negativeCount = negative.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return { sentiment: 'positive', confidence: 0.85 };
    } else if (negativeCount > positiveCount) {
      return { sentiment: 'negative', confidence: 0.80 };
    }
    return { sentiment: 'neutral', confidence: 0.70 };
  }

  async classify(text: string): Promise<{ category: string; priority: string }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const lowerText = text.toLowerCase();
    
    let category = 'general';
    if (lowerText.includes('loan') || lowerText.includes('credit')) {
      category = 'lending';
    } else if (lowerText.includes('account') || lowerText.includes('balance')) {
      category = 'accounts';
    } else if (lowerText.includes('card')) {
      category = 'cards';
    }
    
    let priority = 'medium';
    if (lowerText.includes('urgent') || lowerText.includes('asap')) {
      priority = 'high';
    } else if (lowerText.includes('question') || lowerText.includes('inquiry')) {
      priority = 'low';
    }
    
    return { category, priority };
  }
}
