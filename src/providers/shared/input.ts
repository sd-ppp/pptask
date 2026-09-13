import type {
  Experimental_VideoModelV4CallOptions,
  ImageModelV4CallOptions,
  LanguageModelV4CallOptions,
  LanguageModelV4Prompt,
} from '@ai-sdk/provider';
import { bytesToBase64 } from './http.ts';

export function imageInput(
  providerId: string,
  options: ImageModelV4CallOptions,
): Record<string, unknown> {
  return compact({
    ...extraInput(options, ['prompt', 'n', 'size', 'aspectRatio', 'seed', 'files', 'mask']),
    ...customInput(providerId, options.providerOptions),
    ...compact({
      prompt: options.prompt,
      n: options.n,
      size: options.size,
      aspect_ratio: options.aspectRatio,
      seed: options.seed,
    }),
    ...(options.files?.length ? { images: options.files.map(fileInput) } : {}),
    ...(options.mask ? { mask: fileInput(options.mask) } : {}),
  });
}

export function videoInput(
  providerId: string,
  options: Experimental_VideoModelV4CallOptions,
): Record<string, unknown> {
  return compact({
    ...extraInput(options, ['prompt', 'n', 'aspectRatio', 'resolution', 'duration', 'fps', 'seed', 'generateAudio', 'image', 'inputReferences']),
    ...customInput(providerId, options.providerOptions),
    ...compact({
      prompt: options.prompt,
      n: options.n,
      aspect_ratio: options.aspectRatio,
      resolution: options.resolution,
      duration: options.duration,
      fps: options.fps,
      seed: options.seed,
      generate_audio: options.generateAudio,
    }),
    ...(options.image ? { image: fileInput(options.image) } : {}),
    ...(options.inputReferences?.length
      ? { input_references: options.inputReferences.map(fileInput) }
      : {}),
  });
}

export function languageInput(
  providerId: string,
  options: LanguageModelV4CallOptions,
): Record<string, unknown> {
  return compact({
    ...extraInput(options, ['prompt', 'maxOutputTokens', 'temperature', 'topP', 'stopSequences', 'presencePenalty', 'frequencyPenalty']),
    ...customInput(providerId, options.providerOptions),
    ...compact({
      messages: options.prompt,
      max_tokens: options.maxOutputTokens,
      temperature: options.temperature,
      top_p: options.topP,
      stop: options.stopSequences,
      presence_penalty: options.presencePenalty,
      frequency_penalty: options.frequencyPenalty,
    }),
  });
}

/** Convert the AI SDK's internal prompt shape to the OpenAI-shaped payloads
 * used by providers that expose both Responses and Chat Completions APIs. */
export function normalizeLanguagePrompt(input: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(input.messages)) return input;

  const prompt = input.messages as LanguageModelV4Prompt;
  const responsesInput = prompt.map(message => normalizeResponsesMessage(message));
  return {
    ...input,
    messages: prompt.map(message => normalizeChatMessage(message)),
    input: input.input ?? simpleResponsesInput(prompt, responsesInput),
  };
}

function normalizeChatMessage(message: LanguageModelV4Prompt[number]): Record<string, unknown> {
  if (message.role === 'system') return { role: 'system', content: message.content };
  const content = normalizeMessageContent(message.content);
  return { role: message.role, content: content.length === 1 && content[0].type === 'text' ? content[0].text : content };
}

function normalizeResponsesMessage(message: LanguageModelV4Prompt[number]): Record<string, unknown> {
  if (message.role === 'system') return { role: 'system', content: [{ type: 'input_text', text: message.content }] };
  const parts = normalizeMessageContent(message.content);
  return {
    role: message.role,
    content: parts.map(part => part.type === 'text'
      ? { type: 'input_text', text: part.text }
      : { type: 'input_image', image_url: part.url }),
  };
}

function normalizeMessageContent(content: unknown): Array<{ type: 'text'; text: string } | { type: 'image'; url: string }> {
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  if (!Array.isArray(content)) return [];
  return content.flatMap((part): Array<{ type: 'text'; text: string } | { type: 'image'; url: string }> => {
    if (!part || typeof part !== 'object') return [];
    const value = part as Record<string, unknown>;
    if (value.type === 'text' && typeof value.text === 'string') {
      return [{ type: 'text' as const, text: value.text }];
    }
    if (value.type === 'file') {
      const data = value.data;
      if (typeof data === 'string') {
        return [{ type: 'image' as const, url: data.startsWith('data:') ? data : `data:${value.mediaType ?? 'application/octet-stream'};base64,${data}` }];
      }
      if (data instanceof Uint8Array) {
        return [{ type: 'image' as const, url: `data:${value.mediaType ?? 'application/octet-stream'};base64,${bytesToBase64(data)}` }];
      }
    }
    return [];
  });
}

function simpleResponsesInput(
  prompt: LanguageModelV4Prompt,
  messages: Array<Record<string, unknown>>,
): string | Array<Record<string, unknown>> {
  if (prompt.length === 1 && prompt[0]?.role === 'user') {
    const content = messages[0]?.content;
    if (Array.isArray(content) && content.length === 1) {
      const part = content[0] as Record<string, unknown>;
      if (part.type === 'input_text' && typeof part.text === 'string') return part.text;
    }
  }
  return messages;
}

export function customInput(
  providerId: string,
  providerOptions: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const value = providerOptions?.[providerId];
  if (!isRecord(value)) return {};
  return isRecord(value.input) ? value.input : value;
}

export function fileInput(file: {
  type: 'url';
  url: string;
} | {
  type: 'file';
  data: string | Uint8Array;
  mediaType: string;
}): string {
  if (file.type === 'url') return file.url;
  const data = typeof file.data === 'string' ? file.data : bytesToBase64(file.data);
  return data.startsWith('data:') ? data : `data:${file.mediaType};base64,${data}`;
}

export function compact(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

export function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extraInput(value: object, standardFields: string[]): Record<string, unknown> {
  const excluded = new Set([...standardFields, 'providerOptions', 'abortSignal', 'headers']);
  return Object.fromEntries(
    Object.entries(value).filter(([key, item]) => !excluded.has(key) && item !== undefined),
  );
}
