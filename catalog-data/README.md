# PPTask catalog data

This directory holds raw remote **model list** snapshots ("目录/list") for the
providers whose full catalog can be listed via a single endpoint: RunningHub,
Replicate, and Apiframe (`/v2/models`).

Each `<provider>/` subdirectory is synced independently and atomically by
`core/scripts/sync-provider-data.mjs` (via `core/scripts/lib/sync-provider-data.mjs`):

- Every sync writes to a staging directory first, validates the fetched data,
  then mirror-replaces the provider directory as a whole (so files that no
  longer exist upstream are deleted).
- If a provider's sync fails, its previous snapshot is left untouched and the
  script continues syncing the other providers.
- Every provider directory contains a `manifest.json` recording the source
  URL(s), file count, sync timestamp, and a content checksum.

Apiframe's `/v2/models` (and `/v2/openapi.json`) endpoints require an API
key: set `APIFRAME_API_KEY` in `libs/domain/pptask/.env` (copy it from
`.env.example`), which `core/scripts/sync-provider-data.mjs` auto-loads and
sends as an `X-API-Key` header, matching the header convention used
elsewhere by the Apiframe provider. Without a valid key the endpoint
returns 403, the Apiframe sync is reported as `failed`, and its previous
local snapshot under `catalog-data/apiframe/` and `describe-data/apiframe/`
is left untouched - the script never fabricates a fallback or treats a
stale snapshot as a success.

Contents here are **raw upstream snapshots**, not derived/shaped runtime data.

## Boundary rule

Nothing under `catalog-data/` may be imported by runtime or browser source
code (no `import`/`require` from `core/src/**`, no dynamic `import()` either).
It exists purely as versioned input for the offline catalog generation step,
which reads these files at build/generate time and writes the small derived
`core/src/providers/*/model-catalog.json` files (plus, for RunningHub, the
full `core/src/providers/runninghub/api/model-registry.json`, which keeps
each model's complete `params` for runtime describe) that runtime code
actually imports.

See `../describe-data/README.md` for the equivalent boundary rule that applies
to full raw Kie/Apiframe schema documents.

## Generating the runtime catalogs from these snapshots

Run `pnpm run pptask:generate-provider-catalogs` (see
`core/scripts/generate-provider-catalogs.mjs`) to regenerate all four
providers' runtime catalogs from the local snapshots here and in
`../describe-data/` - it never touches the network. Pass
`--only=runninghub,replicate` to regenerate a subset. Each provider is
generated independently: a missing/invalid snapshot for one provider fails
loudly (and leaves that provider's previous generated output untouched)
without blocking the others. Run `pnpm run pptask:sync-provider-data` first
if a snapshot is missing or stale.

The older `pptask:generate-kie-apiframe-catalogs` script still works (it
delegates to the same unified generator, restricted to Kie+Apiframe) but is
deprecated in favor of the unified command above.
