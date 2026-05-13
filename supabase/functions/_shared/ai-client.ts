/**
 * AI Provider Abstraction Layer
 * 
 * Routes AI calls to the configured provider (Lovable AI, OpenAI, Anthropic, Google Gemini).
 * Provider settings are stored in system_settings with keys: ai_provider, ai_model, ai_vision_model.
 * API keys are read from environment variables.
 */

export interface AIProviderConfig {
  provider: 'lovable' | 'openai' | 'openai_compatible' | 'anthropic' | 'gemini';
  model: string;
  visionModel: string;
  apiKey: string;
  baseUrl?: string;
}

interface AICompletionOptions {
  messages: Array<{ role: string; content: any }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  tools?: any[];
  tool_choice?: any;
  stream?: boolean;
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  lovable: 'https://ai.gateway.lovable.dev/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
};

const DEFAULT_MODELS: Record<string, { chat: string; vision: string }> = {
  lovable: { chat: 'google/gemini-3-flash-preview', vision: 'google/gemini-2.5-flash' },
  openai: { chat: 'gpt-4o', vision: 'gpt-4o' },
  anthropic: { chat: 'claude-sonnet-4-20250514', vision: 'claude-sonnet-4-20250514' },
  gemini: { chat: 'gemini-2.5-flash', vision: 'gemini-2.5-flash' },
};

const ENV_KEY_MAP: Record<string, string> = {
  lovable: 'LOVABLE_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

/**
 * Load AI provider configuration from system_settings table.
 * Falls back to Lovable AI if nothing is configured.
 */
export async function getAIConfig(supabase: any): Promise<AIProviderConfig> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['ai_provider', 'ai_model', 'ai_vision_model']);

    const settings: Record<string, string> = {};
    (data || []).forEach((r: { key: string; value: string }) => {
      settings[r.key] = r.value;
    });

    const provider = (settings.ai_provider || 'lovable') as AIProviderConfig['provider'];
    const defaults = DEFAULT_MODELS[provider] || DEFAULT_MODELS.lovable;
    const envKey = ENV_KEY_MAP[provider] || 'LOVABLE_API_KEY';
    const apiKey = Deno.env.get(envKey) || '';

    if (!apiKey) {
      // Fallback to Lovable if provider key is missing
      console.warn(`${envKey} not found, falling back to Lovable AI`);
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableKey) throw new Error('No AI API key configured');
      return {
        provider: 'lovable',
        model: DEFAULT_MODELS.lovable.chat,
        visionModel: DEFAULT_MODELS.lovable.vision,
        apiKey: lovableKey,
      };
    }

    return {
      provider,
      model: settings.ai_model || defaults.chat,
      visionModel: settings.ai_vision_model || defaults.vision,
      apiKey,
    };
  } catch (error) {
    console.error('Failed to load AI config, using Lovable fallback:', error);
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) throw new Error('No AI API key configured');
    return {
      provider: 'lovable',
      model: DEFAULT_MODELS.lovable.chat,
      visionModel: DEFAULT_MODELS.lovable.vision,
      apiKey: lovableKey,
    };
  }
}

/**
 * Make a chat completion request to the configured AI provider.
 * Normalizes the response to OpenAI-compatible format.
 */
export async function aiComplete(
  config: AIProviderConfig,
  options: AICompletionOptions
): Promise<any> {
  const model = options.model || config.model;
  const endpoint = PROVIDER_ENDPOINTS[config.provider];

  if (config.provider === 'anthropic') {
    return anthropicComplete(config, options, model);
  }

  // OpenAI-compatible providers (Lovable, OpenAI, Gemini)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  const body: any = {
    model,
    messages: options.messages,
    max_tokens: options.max_tokens || 1000,
    temperature: options.temperature ?? 0.3,
  };

  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;
  if (options.stream) body.stream = true;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`AI ${config.provider} error:`, response.status, errText);
    throw new AIProviderError(response.status, config.provider, errText);
  }

  if (options.stream) {
    return response; // Return raw response for streaming
  }

  return await response.json();
}

/**
 * Anthropic uses a different API format — translate to/from OpenAI format.
 */
async function anthropicComplete(
  config: AIProviderConfig,
  options: AICompletionOptions,
  model: string
): Promise<any> {
  const systemMsg = options.messages.find(m => m.role === 'system');
  const nonSystemMessages = options.messages.filter(m => m.role !== 'system');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
  };

  const body: any = {
    model,
    max_tokens: options.max_tokens || 1000,
    messages: nonSystemMessages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  };

  if (systemMsg) body.system = systemMsg.content;

  if (options.tools) {
    body.tools = options.tools.map((t: any) => ({
      name: t.function?.name || t.name,
      description: t.function?.description || t.description,
      input_schema: t.function?.parameters || t.parameters,
    }));
  }

  const response = await fetch(PROVIDER_ENDPOINTS.anthropic, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Anthropic error:', response.status, errText);
    throw new AIProviderError(response.status, 'anthropic', errText);
  }

  const data = await response.json();

  // Normalize Anthropic response to OpenAI format
  const textBlock = data.content?.find((b: any) => b.type === 'text');
  const toolBlock = data.content?.find((b: any) => b.type === 'tool_use');

  const normalized: any = {
    choices: [{
      message: {
        role: 'assistant',
        content: textBlock?.text || null,
      },
    }],
  };

  if (toolBlock) {
    normalized.choices[0].message.tool_calls = [{
      function: {
        name: toolBlock.name,
        arguments: JSON.stringify(toolBlock.input),
      },
    }];
  }

  return normalized;
}

/**
 * Convenience: Get text content from a completion response.
 */
export function getContent(response: any): string {
  return response?.choices?.[0]?.message?.content || '';
}

/**
 * Convenience: Get tool calls from a completion response.
 */
export function getToolCalls(response: any): any[] {
  return response?.choices?.[0]?.message?.tool_calls || [];
}

export class AIProviderError extends Error {
  status: number;
  provider: string;
  
  constructor(status: number, provider: string, detail: string) {
    super(`AI provider ${provider} error (${status}): ${detail}`);
    this.status = status;
    this.provider = provider;
  }
}

/**
 * Export defaults for use in admin UI.
 */
export const AI_PROVIDERS = Object.keys(PROVIDER_ENDPOINTS);
export const AI_DEFAULT_MODELS = DEFAULT_MODELS;
export const AI_ENV_KEYS = ENV_KEY_MAP;
