import modelRegistry from './model-registry.json';
import catalogEntries from './model-catalog.json';
import type { PPTaskLocatorOption } from '../../../locator-catalog.ts';

export type RunningHubCatalogModel = {
  endpoint: string;
  display_name?: string;
  name_cn?: string;
  name_en?: string;
  category?: string;
  output_type?: string;
};

type RunningHubCatalogRegistry =
  | RunningHubCatalogModel[]
  | { models: RunningHubCatalogModel[] };

// Full registry (kept with each model's complete `params`) - generated
// offline by `core/scripts/generate-provider-catalogs.mjs` from the
// RunningHub raw registry snapshot. Used only for runtime describe/schema
// building via `getRunningHubCatalogModel`, never for the picker list
// below.
const registry = modelRegistry as unknown as RunningHubCatalogRegistry;
const models = Array.isArray(registry) ? registry : registry.models;
const modelsByEndpoint = new Map(models.map(model => [model.endpoint, model]));

export function getRunningHubCatalogModel(endpoint: string): RunningHubCatalogModel | undefined {
  return modelsByEndpoint.get(endpoint);
}

// Lightweight, deduped-by-endpoint locator list - generated alongside the
// full registry above. Read directly (no runtime recomputation over the
// full `params`-bearing registry) so the picker never needs to load more
// than each model's locator/label/category/outputType/searchText.
const locatorOptions = catalogEntries as PPTaskLocatorOption[];

export function listRunningHubLocatorOptions(): readonly PPTaskLocatorOption[] {
  return locatorOptions;
}
