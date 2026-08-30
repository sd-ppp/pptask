import modelCatalog from './model-catalog.json';
import type { PPTaskLocatorOption } from '../../locator-catalog.ts';

export type KieCatalogModel = {
  providerId: string;
  locator: string;
  label: string;
  category?: string;
  outputType?: string;
  description?: string;
  searchText: string;
  supported?: boolean;
};

export function buildKieLocatorOptions(entries: readonly KieCatalogModel[]): PPTaskLocatorOption[] {
  return entries.map(entry => ({
    providerId: 'kie',
    locator: entry.locator,
    label: entry.label,
    category: entry.category ?? entry.outputType,
    outputType: entry.outputType,
    searchText: entry.searchText,
  }));
}

export function listKieLocatorOptions(): readonly PPTaskLocatorOption[] {
  return buildKieLocatorOptions(
    (modelCatalog as KieCatalogModel[]).filter(entry => entry.supported === true),
  );
}
