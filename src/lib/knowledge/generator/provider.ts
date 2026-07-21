/**
 * LLM Provider Adapters — call OpenAI or Claude to generate knowledge documents.
 *
 * Supported providers:
 *   openai  — uses the openai npm package with OPENAI_API_KEY
 *   claude  — calls the Anthropic Messages API via fetch with ANTHROPIC_API_KEY
 *
 * Provider selection: config.provider.primary is tried first.
 * On failure, each entry in config.provider.fallback is tried in order.
 */

import OpenAI from 'openai';
import type { GeneratorConfig, LLMPrompt, LLMProvider, LLMResponse, ProviderCredentials } from './types';

// ─── OpenAI adapter ───────────────────────────────────────────────────────────

async function callOpenAI(
  prompt: LLMPrompt,
  config: GeneratorConfig,
  credentials: ProviderCredentials
): Promise<LLMResponse> {
  const apiKey = credentials.openai ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const client = new OpenAI({ apiKey, timeout: config.provider.timeout });
  const startedAt = Date.now();
  const model = config.provider.models.openai;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: prompt.parameters.temperature,
    max_tokens: prompt.parameters.maxTokens,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content ?? '';
  const usage = response.usage;

  return {
    content,
    raw: response,
    provider: 'openai',
    model,
    tokensUsed: {
      input: usage?.prompt_tokens ?? 0,
      output: usage?.completion_tokens ?? 0,
      total: usage?.total_tokens ?? 0,
    },
    latencyMs: Date.now() - startedAt,
  };
}

// ─── Claude adapter ───────────────────────────────────────────────────────────

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
}

async function callClaude(
  prompt: LLMPrompt,
  config: GeneratorConfig,
  credentials: ProviderCredentials
): Promise<LLMResponse> {
  const apiKey = credentials.claude ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const model = config.provider.models.claude;
  const startedAt = Date.now();

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: prompt.parameters.maxTokens,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
      temperature: prompt.parameters.temperature,
    }),
    signal: AbortSignal.timeout(config.provider.timeout),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as AnthropicResponse;
  const content = data.content.find((c) => c.type === 'text')?.text ?? '';

  return {
    content,
    raw: data,
    provider: 'claude',
    model,
    tokensUsed: {
      input: data.usage.input_tokens,
      output: data.usage.output_tokens,
      total: data.usage.input_tokens + data.usage.output_tokens,
    },
    latencyMs: Date.now() - startedAt,
  };
}

// ─── Provider dispatch ────────────────────────────────────────────────────────

async function callProvider(
  provider: LLMProvider,
  prompt: LLMPrompt,
  config: GeneratorConfig,
  credentials: ProviderCredentials
): Promise<LLMResponse> {
  switch (provider) {
    case 'openai':
      return callOpenAI(prompt, config, credentials);
    case 'claude':
      return callClaude(prompt, config, credentials);
    case 'gemini':
      throw new Error('Gemini provider is not yet implemented. Use "claude" or "openai".');
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Call the primary provider, falling back to alternatives on failure.
 * Logs provider switch to stderr for observability.
 */
export async function callProviderWithFallback(
  prompt: LLMPrompt,
  config: GeneratorConfig,
  credentials: ProviderCredentials = {}
): Promise<LLMResponse> {
  const providers: LLMProvider[] = [config.provider.primary, ...config.provider.fallback];
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      return await callProvider(provider, prompt, config, credentials);
    } catch (err) {
      const msg = `[provider:${provider}] ${(err as Error).message}`;
      errors.push(msg);
      process.stderr.write(`${msg}\n`);
    }
  }

  throw new Error(`All providers failed:\n${errors.join('\n')}`);
}
