import modelCatalog from './model-catalog.json';
import type { PPTaskLocatorOption } from '../../locator-catalog.ts';

export type ApiframeCatalogModel = {
  providerId: string;
  locator: string;
  label: string;
  category?: string;
  outputType?: string;
  description?: string;
  searchText: string;
  supported?: boolean;
};

export function buildApiframeLocatorOptions(entries: readonly ApiframeCatalogModel[]): PPTaskLocatorOption[] {
  return entries.map(entry => ({
    providerId: 'apiframe',
    locator: entry.locator,
    label: entry.label,
    category: entry.category ?? entry.outputType,
    outputType: entry.outputType,
    searchText: entry.searchText,
  }));
}

export function listApiframeLocatorOptions(): readonly PPTaskLocatorOption[] {
  return buildApiframeLocatorOptions(
    (modelCatalog as ApiframeCatalogModel[]).filter(entry => entry.supported === true),
  );
}
