import {
  defaultProviderRegistry,
  type ProviderRegistry,
} from './provider-registry.ts';
import {
  comfyProviderDefinition,
  comfyUploadProviderDefinition,
} from './providers/comfy/index.ts';
import { geminiProviderDefinition } from './providers/gemini/index.ts';
import { grsaiProviderDefinition } from './providers/grsai/index.ts';
import { grsaiUploadProviderDefinition } from './upload-providers/grsai/index.ts';
import { openaiProviderDefinition } from './providers/openai/index.ts';
import { replicateProviderDefinition } from './providers/replicate/index.ts';
import { replicateUploadProviderDefinition } from './upload-providers/replicate/index.ts';
import { runninghubProviderDefinition, runninghubUploadProviderDefinition } from './providers/runninghub/index.ts';

/** Explicitly registers the built-in Providers into the supplied registry. */
export function registerBuiltinProviders(registry: ProviderRegistry = defaultProviderRegistry): void {
  registerIfMissing(registry, 'replicate', replicateProviderDefinition);
  registerUploadIfMissing(registry, 'replicate', replicateUploadProviderDefinition);
  registerIfMissing(registry, 'runninghub', runninghubProviderDefinition);
  registerUploadIfMissing(registry, 'runninghub', runninghubUploadProviderDefinition);
  registerIfMissing(registry, 'grsai', grsaiProviderDefinition);
  registerUploadIfMissing(registry, 'grsai', grsaiUploadProviderDefinition);
  registerIfMissing(registry, 'gemini', geminiProviderDefinition);
  registerIfMissing(registry, 'openai', openaiProviderDefinition);
  registerIfMissing(registry, 'comfy-http', comfyProviderDefinition);
  registerIfMissing(registry, 'comfy-https', comfyProviderDefinition);
  registerUploadIfMissing(registry, 'comfy-http', comfyUploadProviderDefinition);
  registerUploadIfMissing(registry, 'comfy-https', comfyUploadProviderDefinition);
}

function registerIfMissing(
  registry: ProviderRegistry,
  scheme: string,
  definition: Parameters<ProviderRegistry['registerProvider']>[1],
): void {
  if (!registry.getProvider(scheme)) registry.registerProvider(scheme, definition);
}

function registerUploadIfMissing(
  registry: ProviderRegistry,
  scheme: string,
  definition: Parameters<ProviderRegistry['registerUploadProvider']>[1],
): void {
  if (!registry.getUploadProvider(scheme)) registry.registerUploadProvider(scheme, definition);
}
