import modelRegistry from './model-catalog.json';
import type { PPTaskLocatorOption } from '../../locator-catalog.ts';

export type ReplicateCatalogModel = {
  owner: string;
  name: string;
  description?: string | null;
  url?: string | null;
  latest_version_id?: string | null;
  latest_version_created_at?: string | null;
};

const models = modelRegistry as ReplicateCatalogModel[];

export function buildReplicateLocatorOptions(
  entries: readonly ReplicateCatalogModel[],
): PPTaskLocatorOption[] {
  return entries
    .filter(model => Boolean(model.owner && model.name))
    .map(model => {
      const label = `${model.owner}/${model.name}`;
      return {
        providerId: 'replicate',
        locator: `replicate:///${label}`,
        label,
        category: 'Replicate',
        searchText: [model.owner, model.name, model.description]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase(),
      };
    });
}

export function listReplicateLocatorOptions(): readonly PPTaskLocatorOption[] {
  return buildReplicateLocatorOptions(models);
}
