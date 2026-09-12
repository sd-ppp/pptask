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
import { ppioProviderDefinition } from './providers/ppio/index.ts';
import { arkProviderDefinition } from './providers/ark/index.ts';
import { novitaProviderDefinition } from './providers/novita/index.ts';
import { kieProviderDefinition } from './providers/kie/index.ts';
import { kieUploadProviderDefinition } from './upload-providers/kie/index.ts';
import { apiframeProviderDefinition } from './providers/apiframe/index.ts';
import { apiframeUploadProviderDefinition } from './upload-providers/apiframe/index.ts';
import {
  fishProviderDefinition,
  deepinfraProviderDefinition,
  openrouterProviderDefinition,
  tavusProviderDefinition,
  scenarioProviderDefinition,
  xaiProviderDefinition,
  cloudflareProviderDefinition,
  vertexProviderDefinition,
  bedrockProviderDefinition,
  azureProviderDefinition,
  nvidiaProviderDefinition,
  leonardoProviderDefinition,
  heygenProviderDefinition,
  didProviderDefinition,
  cartesiaProviderDefinition,
  deepgramProviderDefinition,
  fireworksProviderDefinition,
} from './providers/modern/index.ts';
import { crunProviderDefinition } from './providers/crun/index.ts';
import { crunUploadProviderDefinition } from './upload-providers/crun/index.ts';

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
  registerIfMissing(registry, 'ppio', ppioProviderDefinition);
  registerIfMissing(registry, 'ark', arkProviderDefinition);
  registerIfMissing(registry, 'novita', novitaProviderDefinition);
  registerIfMissing(registry, 'comfy-http', comfyProviderDefinition);
  registerIfMissing(registry, 'comfy-https', comfyProviderDefinition);
  registerUploadIfMissing(registry, 'comfy-http', comfyUploadProviderDefinition);
  registerUploadIfMissing(registry, 'comfy-https', comfyUploadProviderDefinition);
  registerIfMissing(registry, 'kie', kieProviderDefinition);
  registerUploadIfMissing(registry, 'kie', kieUploadProviderDefinition);
  registerIfMissing(registry, 'apiframe', apiframeProviderDefinition);
  registerUploadIfMissing(registry, 'apiframe', apiframeUploadProviderDefinition);
  registerIfMissing(registry, 'fish', fishProviderDefinition);
  registerIfMissing(registry, 'deepinfra', deepinfraProviderDefinition);
  registerIfMissing(registry, 'openrouter', openrouterProviderDefinition);
  registerIfMissing(registry, 'tavus', tavusProviderDefinition);
  registerIfMissing(registry, 'scenario', scenarioProviderDefinition);
  registerIfMissing(registry, 'xai', xaiProviderDefinition);
  registerIfMissing(registry, 'cloudflare', cloudflareProviderDefinition);
  registerIfMissing(registry, 'vertex', vertexProviderDefinition);
  registerIfMissing(registry, 'bedrock', bedrockProviderDefinition);
  registerIfMissing(registry, 'azure', azureProviderDefinition);
  registerIfMissing(registry, 'nvidia', nvidiaProviderDefinition);
  registerIfMissing(registry, 'leonardo', leonardoProviderDefinition);
  registerIfMissing(registry, 'heygen', heygenProviderDefinition);
  registerIfMissing(registry, 'did', didProviderDefinition);
  registerIfMissing(registry, 'cartesia', cartesiaProviderDefinition);
  registerIfMissing(registry, 'deepgram', deepgramProviderDefinition);
  registerIfMissing(registry, 'fireworks', fireworksProviderDefinition);
  registerIfMissing(registry, 'crun', crunProviderDefinition);
  registerUploadIfMissing(registry, 'crun', crunUploadProviderDefinition);
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
