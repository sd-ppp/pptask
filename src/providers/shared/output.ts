import type {
  Experimental_VideoModelV4Result,
  ImageModelV4Result,
  JSONValue,
  LanguageModelV4GenerateResult,
} from '@ai-sdk/provider';
import { base64ToBytes } from './http.ts';
import { isRecord } from './input.ts';
import { providerMetadata } from './types.ts';

export async function imageResult(
  providerId: string,
  modelId: string,
  output: unknown,
  fetchImpl: typeof globalThis.fetch,
  signal?: AbortSignal,
  metadata: Record<string, JSONValue> = {},
): Promise<ImageModelV4Result> {
  const values = extractOutputValues(output);
  const images = await Promise.all(values.map(value => imageData(value, fetchImpl, signal)));
  if (!images.length) throw new Error(`${providerId} returned no image output`);
  return {
    images,
    warnings: [],
    providerMetadata: {
      [providerId]: {
        images: values.map(value => outputMetadata(value)),
        ...metadata,
        ...(extractUsage(output) ? { usage: extractUsage(output) } : {}),
      },
    },
    response: { timestamp: new Date(), modelId, headers: undefined },
  };
}

export function videoResult(
  providerId: string,
  modelId: string,
  output: unknown,
  metadata: Record<string, JSONValue> = {},
): Experimental_VideoModelV4Result {
  const values = extractOutputValues(output);
  const videos = values.map(value => {
    if (value.kind === 'base64') {
      return { type: 'base64' as const, data: value.value, mediaType: value.mediaType ?? 'video/mp4' };
    }
    return { type: 'url' as const, url: value.value, mediaType: value.mediaType ?? videoMediaType(value.value) };
  });
  if (!videos.length) throw new Error(`${providerId} returned no video output`);
  return {
    videos,
    warnings: [],
    providerMetadata: providerMetadata(providerId, {
      ...metadata,
      ...(extractUsage(output) ? { usage: extractUsage(output) } : {}),
    }),
    response: { timestamp: new Date(), modelId, headers: undefined },
  };
}

function extractUsage(output: unknown): Record<string, JSONValue> | undefined {
  if (!isRecord(output)) return undefined;
  const usage = output.usage ?? output.usageMetadata ?? output.usage_metadata;
  if (!isRecord(usage)) return undefined;
  return usage as Record<string, JSONValue>;
}

export function languageResult(
  providerId: string,
  modelId: string,
  output: unknown,
  metadata: Record<string, JSONValue> = {},
): LanguageModelV4GenerateResult {
  const text = extractText(output);
  const usage = isRecord(output) && isRecord(output.usage) ? output.usage : {};
  const inputTokens = numberValue(usage.prompt_tokens ?? usage.input_tokens ?? usage.inputTokenCount);
  const outputTokens = numberValue(usage.completion_tokens ?? usage.output_tokens ?? usage.outputTokenCount);
  return {
    content: [{ type: 'text', text }],
    finishReason: { unified: 'stop', raw: String(first(output, ['finish_reason', 'stop_reason']) ?? 'stop') },
    usage: {
      inputTokens: { total: inputTokens, noCache: inputTokens, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: outputTokens, text: outputTokens, reasoning: undefined },
      raw: isRecord(usage) ? usage : undefined,
    },
    warnings: [],
    providerMetadata: providerMetadata(providerId, metadata),
    response: { timestamp: new Date(), modelId, body: output },
  };
}

type OutputValue = { kind: 'url' | 'base64'; value: string; mediaType?: string };

export function extractOutputValues(output: unknown): OutputValue[] {
  const results: OutputValue[] = [];
  visitOutput(output, results, new Set<object>());
  return unique(results);
}

function visitOutput(value: unknown, results: OutputValue[], seen: Set<object>): void {
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) results.push({ kind: 'url', value });
    else if (/^data:/i.test(value)) {
      const match = /^data:([^;,]+);base64,(.+)$/i.exec(value);
      if (match) results.push({ kind: 'base64', value: match[2], mediaType: match[1] });
    }
    return;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) visitOutput(item, results, seen);
    return;
  }
  const record = value as Record<string, unknown>;
  for (const key of ['url', 'uri', 'video_url', 'videoUrl', 'download_url', 'downloadUrl', 'result_url', 'resultUrl', 'audioUrl', 'firstFrameUrl', 'lastFrameUrl', 'gridUrl']) {
    visitOutput(record[key], results, seen);
  }
  for (const key of ['b64_json', 'base64', 'data']) {
    if (typeof record[key] === 'string' && !/^https?:\/\//i.test(record[key] as string)) {
      results.push({
        kind: 'base64',
        value: record[key] as string,
        mediaType: typeof record.mimeType === 'string'
          ? record.mimeType
          : typeof record.mime_type === 'string' ? record.mime_type : undefined,
      });
    }
  }
  for (const key of ['output', 'outputs', 'result', 'results', 'resultUrls', 'media_urls', 'image_urls', 'video_urls', 'images', 'videos', 'data', 'task', 'content', 'artifacts', 'files', 'tracks', 'generations']) {
    visitOutput(record[key], results, seen);
  }
  const candidates = record.candidates;
  if (Array.isArray(candidates)) visitOutput(candidates, results, seen);
  const parts = record.parts ?? (isRecord(record.content) ? record.content.parts : undefined);
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (!isRecord(part)) continue;
      const inline = part.inlineData ?? part.inline_data;
      if (isRecord(inline) && typeof inline.data === 'string') {
        results.push({
          kind: 'base64',
          value: inline.data,
          mediaType: String(inline.mimeType ?? inline.mime_type ?? 'image/png'),
        });
      }
    }
  }
}

async function imageData(
  value: OutputValue,
  fetchImpl: typeof globalThis.fetch,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (value.kind === 'base64') return base64ToBytes(value.value);
  const response = await fetchImpl(value.value, { signal });
  if (!response.ok) throw new Error(`Failed to download image output (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function extractText(output: unknown): string {
  if (typeof output === 'string') return output;
  if (!isRecord(output)) return JSON.stringify(output);
  const direct = first(output, ['text', 'output_text', 'content']);
  if (typeof direct === 'string') return direct;
  const choices = output.choices;
  if (Array.isArray(choices)) {
    const texts = choices.flatMap(choice => {
      if (!isRecord(choice)) return [];
      const message = isRecord(choice.message) ? choice.message.content : undefined;
      const text = choice.text ?? message;
      return typeof text === 'string' ? [text] : [];
    });
    if (texts.length) return texts.join('');
  }
  if (Array.isArray(output.output)) {
    const texts: string[] = [];
    for (const item of output.output) {
      if (!isRecord(item) || !Array.isArray(item.content)) continue;
      for (const content of item.content) {
        if (isRecord(content) && typeof content.text === 'string') texts.push(content.text);
      }
    }
    if (texts.length) return texts.join('');
  }
  return JSON.stringify(output);
}

function first(value: unknown, fields: string[]): unknown {
  if (!isRecord(value)) return undefined;
  for (const field of fields) if (value[field] !== undefined) return value[field];
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function outputMetadata(value: OutputValue): JSONValue {
  return value.kind === 'url'
    ? { url: value.value, mediaType: value.mediaType ?? null }
    : { mediaType: value.mediaType ?? null };
}

function unique(values: OutputValue[]): OutputValue[] {
  const seen = new Set<string>();
  return values.filter(value => {
    const key = `${value.kind}:${value.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function videoMediaType(url: string): string {
  if (/\.webm(?:$|\?)/i.test(url)) return 'video/webm';
  if (/\.mov(?:$|\?)/i.test(url)) return 'video/quicktime';
  return 'video/mp4';
}
