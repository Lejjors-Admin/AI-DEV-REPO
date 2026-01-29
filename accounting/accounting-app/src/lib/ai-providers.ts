/**
 * AI Provider Configuration and Types
 * 
 * This file defines the available AI providers and their configuration options.
 * It allows for switching between different AI providers based on user preferences.
 */

// Available AI provider types
export type AIProviderType = 
  | 'openai' 
  | 'anthropic' 
  | 'perplexity' 
  | 'xai'
  | 'gemini'
  | 'huggingface'
  | 'accounting-ai'; // Custom fine-tuned accounting AI

// Configuration for each provider
export interface AIProviderConfig {
  name: string;
  description: string;
  apiKeyRequired: boolean;
  freeTier: boolean;
  promptTemplates: {
    binderGeneration: string;
    transactionCategorization: string;
    chartOfAccounts: string;
    financialAnalysis: string;
  };
  modelsAvailable: {
    id: string;
    name: string;
    description: string;
    contextSize: number;
    capabilities: string[];
    costPer1kTokens?: number;
  }[];
  defaultModel: string;
}

// Provider configurations
export const AI_PROVIDERS: Record<AIProviderType, AIProviderConfig> = {
  openai: {
    name: 'OpenAI',
    description: 'Premium AI models with high accuracy and versatility (GPT-4, GPT-3.5)',
    apiKeyRequired: true,
    freeTier: false,
    promptTemplates: {
      binderGeneration: `You are an expert accountant assistant helping to generate content for a client binder. 
Based on the engagement type ({{engagementType}}) and industry ({{industry}}), generate appropriate sections for a {{engagementType}} engagement.

Create content that follows accounting standards and best practices for {{industry}} businesses.
For each section, provide a descriptive title, explain its purpose, and include example content or templates.`,
      transactionCategorization: `Analyze this transaction and suggest the most appropriate accounting category.
Transaction description: {{description}}
Amount: {{amount}}
Date: {{date}}

Return the suggested category and confidence score in JSON format:
{
  "category": "string", // Suggested category
  "confidence": 0.95, // Confidence score between 0 and 1
  "explanation": "string" // Brief explanation for the categorization
}`,
      chartOfAccounts: `Generate a chart of accounts for a {{industry}} business in {{country}}.
Include typical accounts organized by:
- Assets
- Liabilities
- Equity
- Revenue
- Expenses

For each account, provide:
- Account name
- Account number (optional)
- Brief description
- Type (Asset, Liability, Equity, Revenue, Expense)`,
      financialAnalysis: `Analyze the following financial data and provide insights:
{{financialData}}

Provide analysis on:
1. Profitability
2. Liquidity
3. Key trends
4. Areas of concern
5. Recommendations`
    },
    modelsAvailable: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Most powerful model for complex accounting tasks',
        contextSize: 128000,
        capabilities: ['Text generation', 'Financial analysis', 'Document understanding'],
        costPer1kTokens: 0.05
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective for routine tasks',
        contextSize: 16385,
        capabilities: ['Text generation', 'Basic categorization'],
        costPer1kTokens: 0.002
      }
    ],
    defaultModel: 'gpt-4o'
  },
  anthropic: {
    name: 'Anthropic Claude',
    description: 'High-quality AI with strong reasoning and context understanding',
    apiKeyRequired: true,
    freeTier: false,
    promptTemplates: {
      binderGeneration: `<instructions>
You are an expert accountant assistant helping to generate content for a client binder.
Based on the engagement type ({{engagementType}}) and industry ({{industry}}), generate appropriate sections for a {{engagementType}} engagement.

Create content that follows accounting standards and best practices for {{industry}} businesses.
For each section, provide a descriptive title, explain its purpose, and include example content or templates.
</instructions>`,
      transactionCategorization: `<instructions>
Analyze this transaction and suggest the most appropriate accounting category.
Transaction description: {{description}}
Amount: {{amount}}
Date: {{date}}

Return the suggested category and confidence score in JSON format:
{
  "category": "string", // Suggested category
  "confidence": 0.95, // Confidence score between 0 and 1
  "explanation": "string" // Brief explanation for the categorization
}
</instructions>`,
      chartOfAccounts: `<instructions>
Generate a chart of accounts for a {{industry}} business in {{country}}.
Include typical accounts organized by:
- Assets
- Liabilities
- Equity
- Revenue
- Expenses

For each account, provide:
- Account name
- Account number (optional)
- Brief description
- Type (Asset, Liability, Equity, Revenue, Expense)
</instructions>`,
      financialAnalysis: `<instructions>
Analyze the following financial data and provide insights:
{{financialData}}

Provide analysis on:
1. Profitability
2. Liquidity
3. Key trends
4. Areas of concern
5. Recommendations
</instructions>`
    },
    modelsAvailable: [
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        description: 'Latest model with excellent accounting capabilities',
        contextSize: 200000,
        capabilities: ['Text generation', 'Financial analysis', 'Document understanding'],
        costPer1kTokens: 0.03
      },
      {
        id: 'claude-3-5-sonnet-20240620',
        name: 'Claude 3.5 Sonnet',
        description: 'Balanced model for most accounting tasks',
        contextSize: 200000,
        capabilities: ['Text generation', 'Financial analysis'],
        costPer1kTokens: 0.015
      }
    ],
    defaultModel: 'claude-3-7-sonnet-20250219'
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Google\'s AI with free tier access and strong analytical capabilities',
    apiKeyRequired: true,
    freeTier: true,
    promptTemplates: {
      binderGeneration: `You are an expert accountant assistant helping to generate content for a client binder.
Based on the engagement type ({{engagementType}}) and industry ({{industry}}), generate appropriate sections for a {{engagementType}} engagement.

Create content that follows accounting standards and best practices for {{industry}} businesses.
For each section, provide a descriptive title, explain its purpose, and include example content or templates.`,
      transactionCategorization: `Analyze this transaction and suggest the most appropriate accounting category.
Transaction description: {{description}}
Amount: {{amount}}
Date: {{date}}

Return the suggested category and confidence score in JSON format:
{
  "category": "string", // Suggested category
  "confidence": 0.95, // Confidence score between 0 and 1
  "explanation": "string" // Brief explanation for the categorization
}`,
      chartOfAccounts: `Generate a chart of accounts for a {{industry}} business in {{country}}.
Include typical accounts organized by:
- Assets
- Liabilities
- Equity
- Revenue
- Expenses

For each account, provide:
- Account name
- Account number (optional)
- Brief description
- Type (Asset, Liability, Equity, Revenue, Expense)`,
      financialAnalysis: `Analyze the following financial data and provide insights:
{{financialData}}

Provide analysis on:
1. Profitability
2. Liquidity
3. Key trends
4. Areas of concern
5. Recommendations`
    },
    modelsAvailable: [
      {
        id: 'gemini-2.5-pro-preview',
        name: 'Gemini 2.5 Pro Preview',
        description: 'Latest powerful model with free tier access',
        contextSize: 1000000,
        capabilities: ['Text generation', 'Financial analysis', 'Document understanding'],
        costPer1kTokens: 0.0
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Powerful model with free tier access',
        contextSize: 1000000,
        capabilities: ['Text generation', 'Financial analysis', 'Document understanding'],
        costPer1kTokens: 0.0
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient for routine tasks',
        contextSize: 1000000,
        capabilities: ['Text generation', 'Basic categorization'],
        costPer1kTokens: 0.0
      }
    ],
    defaultModel: 'gemini-1.5-pro'
  }
};

// Add other providers with minimal configuration
AI_PROVIDERS['perplexity'] = {
  name: 'Perplexity AI',
  description: 'Research-focused AI with citation capabilities',
  apiKeyRequired: true,
  freeTier: true,
  promptTemplates: {
    binderGeneration: 'Generate accounting binder content',
    transactionCategorization: 'Categorize transaction',
    chartOfAccounts: 'Generate chart of accounts',
    financialAnalysis: 'Analyze financial data'
  },
  modelsAvailable: [{
    id: 'llama-3.1-sonar-small-128k-online',
    name: 'Llama 3.1 Small',
    description: 'Fast and efficient for most accounting tasks',
    contextSize: 128000,
    capabilities: ['Text generation', 'Basic categorization', 'Citations'],
    costPer1kTokens: 0.002
  }],
  defaultModel: 'llama-3.1-sonar-small-128k-online'
};

AI_PROVIDERS['xai'] = {
  name: 'xAI (Grok)',
  description: 'Newest AI provider with strong analytical capabilities',
  apiKeyRequired: true,
  freeTier: false,
  promptTemplates: {
    binderGeneration: 'Generate accounting binder content',
    transactionCategorization: 'Categorize transaction',
    chartOfAccounts: 'Generate chart of accounts',
    financialAnalysis: 'Analyze financial data'
  },
  modelsAvailable: [{
    id: 'grok-2-1212',
    name: 'Grok 2',
    description: 'Latest model for complex financial tasks',
    contextSize: 131072,
    capabilities: ['Text generation', 'Financial analysis'],
    costPer1kTokens: 0.005
  }],
  defaultModel: 'grok-2-1212'
};

AI_PROVIDERS['huggingface'] = {
  name: 'Hugging Face',
  description: 'Access to open-source models with free tier options',
  apiKeyRequired: true,
  freeTier: true,
  promptTemplates: {
    binderGeneration: 'Generate accounting binder content',
    transactionCategorization: 'Categorize transaction',
    chartOfAccounts: 'Generate chart of accounts',
    financialAnalysis: 'Analyze financial data'
  },
  modelsAvailable: [{
    id: 'mistralai/Mistral-7B-Instruct-v0.2',
    name: 'Mistral 7B',
    description: 'Efficient open-source model for many accounting tasks',
    contextSize: 32768,
    capabilities: ['Text generation', 'Basic categorization'],
    costPer1kTokens: 0.0
  }],
  defaultModel: 'mistralai/Mistral-7B-Instruct-v0.2'
};

AI_PROVIDERS['accounting-ai'] = {
  name: 'Accounting AI (Custom)',
  description: 'Custom fine-tuned AI model specifically for accounting tasks with CPA-level expertise',
  apiKeyRequired: false,
  freeTier: true,
  promptTemplates: {
    binderGeneration: 'Generate professional accounting binder content',
    transactionCategorization: 'Categorize transaction with CPA-level accuracy',
    chartOfAccounts: 'Create comprehensive chart of accounts',
    financialAnalysis: 'Perform detailed financial analysis'
  },
  modelsAvailable: [{
    id: 'accounting-llm-v1',
    name: 'Accounting LLM v1',
    description: 'Custom fine-tuned accounting model with CPA-level expertise',
    contextSize: 131072,
    capabilities: [
      'Double-entry accounting expertise',
      'GAAP/IFRS compliance checking',
      'Transaction categorization',
      'Financial statement analysis',
      'Audit support',
      'Tax planning recommendations'
    ]
  }],
  defaultModel: 'accounting-llm-v1'
};

// Default settings
export const DEFAULT_AI_PROVIDER: AIProviderType = 'gemini';
export const DEFAULT_AI_SETTINGS = {
  provider: DEFAULT_AI_PROVIDER,
  model: AI_PROVIDERS[DEFAULT_AI_PROVIDER].defaultModel,
  temperature: 0.5,
  maxTokens: 2048
};

// Helper function to get available providers with free tiers
export function getFreeProviders(): AIProviderType[] {
  return Object.entries(AI_PROVIDERS)
    .filter(([_, config]) => config.freeTier)
    .map(([key]) => key as AIProviderType);
}
