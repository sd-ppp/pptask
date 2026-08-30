import { listRunningHubLocatorOptions } from './providers/runninghub/api/model-catalog.ts';
import { listReplicateLocatorOptions } from './providers/replicate/model-catalog.ts';
import { listKieLocatorOptions } from './providers/kie/model-catalog.ts';
import { listApiframeLocatorOptions } from './providers/apiframe/model-catalog.ts';

export type PPTaskLocatorProvider = {
  id: string;
  label: string;
};

export type PPTaskLocatorOption = {
  providerId: string;
  locator: string;
  label: string;
  category?: string;
  outputType?: string;
  searchText: string;
};

const providers: readonly PPTaskLocatorProvider[] = [
  { id: 'runninghub', label: 'RunningHub' },
  { id: 'replicate', label: 'Replicate' },
  { id: 'kie', label: 'Kie' },
  { id: 'apiframe', label: 'Apiframe' },
];

export function listPPTaskLocatorProviders(): readonly PPTaskLocatorProvider[] {
  return providers;
}

export function listPPTaskLocatorOptions(providerId: string): readonly PPTaskLocatorOption[] {
  if (providerId === 'runninghub') return listRunningHubLocatorOptions();
  if (providerId === 'replicate') return listReplicateLocatorOptions();
  if (providerId === 'kie') return listKieLocatorOptions();
  if (providerId === 'apiframe') return listApiframeLocatorOptions();
  return [];
}
