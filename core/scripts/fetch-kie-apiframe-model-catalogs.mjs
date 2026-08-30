console.warn(
  'fetch-kie-apiframe-model-catalogs.mjs is deprecated; use sync-kie-apiframe-describe-data.mjs and generate-kie-apiframe-catalogs.mjs instead.',
);
await import('./sync-kie-apiframe-describe-data.mjs');
await import('./generate-kie-apiframe-catalogs.mjs');
