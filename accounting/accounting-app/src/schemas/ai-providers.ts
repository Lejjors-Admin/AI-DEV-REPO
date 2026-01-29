/**
 * AI Provider Configuration
 * Defines available AI providers and their settings
 * Mapped from shared/ai-providers.ts
 */

export type AIProviderType = 
  | "openai" 
  | "anthropic" 
  | "perplexity" 
  | "xai" 
  | "gemini" 
  | "huggingface"
  | "accounting-ai";

export interface AIProviderModel {
  id: string;
  name: string;
  description: string;
  contextSize: number;
  capabilities: string[];
  costPer1kTokens?: number;
}

export interface AIProvider {
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
  modelsAvailable: AIProviderModel[];
  defaultModel: string;
}

export const AI_PROVIDERS: Record<AIProviderType, AIProvider> = {
  openai: {
    name: "OpenAI",
    description: "Premium AI models with high accuracy and versatility (GPT-4, GPT-3.5)",
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
        id: "gpt-4o",
        name: "GPT-4o",
        description: "Most powerful model for complex accounting tasks",
        contextSize: 128000,
        capabilities: ["Text generation", "Financial analysis", "Document understanding"],
        costPer1kTokens: 0.05
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        description: "Fast and cost-effective for routine tasks",
        contextSize: 16385,
        capabilities: ["Text generation", "Basic categorization"],
        costPer1kTokens: 0.002
      }
    ],
    defaultModel: "gpt-4o",
  },
  anthropic: {
    name: "Anthropic Claude",
    description: "High-quality AI with strong reasoning and context understanding",
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
        id: "claude-3-7-sonnet-20250219",
        name: "Claude 3.7 Sonnet",
        description: "Latest model with excellent accounting capabilities",
        contextSize: 200000,
        capabilities: ["Text generation", "Financial analysis", "Document understanding"],
        costPer1kTokens: 0.03
      },
      {
        id: "claude-3-5-sonnet-20240620",
        name: "Claude 3.5 Sonnet",
        description: "Balanced model for most accounting tasks",
        contextSize: 200000,
        capabilities: ["Text generation", "Financial analysis"],
        costPer1kTokens: 0.015
      }
    ],
    defaultModel: "claude-3-7-sonnet-20250219",
  },
  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    description: "Perplexity AI models with web search capabilities",
    models: ["llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-small-128k-online"],
    defaultModel: "llama-3.1-sonar-large-128k-online",
    requiresApiKey: true,
    isFree: false,
    maxTokens: 4096,
    supportsStreaming: true,
  },
  xai: {
    id: "xai",
    name: "xAI Grok",
    description: "xAI's Grok models",
    models: ["grok-beta", "grok-2"],
    defaultModel: "grok-beta",
    requiresApiKey: true,
    isFree: false,
    maxTokens: 4096,
    supportsStreaming: true,
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    description: "Google's Gemini models",
    models: ["gemini-pro", "gemini-pro-vision", "gemini-1.5-pro"],
    defaultModel: "gemini-1.5-pro",
    requiresApiKey: true,
    isFree: true, // Free tier available
    maxTokens: 4096,
    supportsStreaming: true,
  },
  huggingface: {
    id: "huggingface",
    name: "Hugging Face",
    description: "Open source models from Hugging Face",
    models: ["meta-llama/Llama-2-70b-chat-hf", "mistralai/Mistral-7B-Instruct-v0.1"],
    defaultModel: "meta-llama/Llama-2-70b-chat-hf",
    requiresApiKey: true,
    isFree: true, // Free tier available
    maxTokens: 2048,
    supportsStreaming: false,
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    description: "Local models via Ollama",
    models: ["llama2", "mistral", "codellama"],
    defaultModel: "llama2",
    requiresApiKey: false,
    isFree: true,
    maxTokens: 2048,
    supportsStreaming: true,
  },
};

export interface AISettings {
  provider: AIProviderType;
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  useAIForTransactions: boolean;
  useAIForBinderGeneration: boolean;
  useAIForReporting: boolean;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 2000,
  useAIForTransactions: true,
  useAIForBinderGeneration: true,
  useAIForReporting: true,
};

/**
 * Get list of free AI providers
 */
export function getFreeProviders(): AIProviderType[] {
  return Object.values(AI_PROVIDERS)
    .filter(provider => provider.isFree)
    .map(provider => provider.id);
}

/**
 * Get provider by ID
 */
export function getProvider(id: AIProviderType): AIProvider {
  return AI_PROVIDERS[id];
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(providerId: AIProviderType): string {
  return AI_PROVIDERS[providerId].defaultModel;
}

