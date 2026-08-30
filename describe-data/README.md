# PPTask describe data

This directory contains the **complete raw** Kie and Apiframe API documentation
and OpenAPI schema sources used to derive `describe` schemas. It only ever
holds full/raw provider schema documents, never remote *model list* snapshots
(see `../catalog-data/README.md` for those - RunningHub, Replicate, and
Apiframe's `/v2/models` list).

Each `<provider>/` subdirectory is synced independently and atomically by
`core/scripts/sync-provider-data.mjs`, mirroring the same staging /
mirror-replace / stale-deletion / failure-preserves-old-snapshot semantics
documented in `../catalog-data/README.md`. Every provider directory contains a
`manifest.json` recording source URL(s), file count, sync timestamp, and a
content checksum. Apiframe's `describe-data/apiframe` snapshot is synced as
part of the same all-or-nothing transaction as `catalog-data/apiframe`
(`/v2/models` and `/v2/openapi.json` either both update or neither does).

## Boundary rule

Keep this directory outside `core/src`. Runtime catalog imports must use only
the small list summaries under `core/src/providers/*/model-catalog.json` and
the whitelist-only compact describe files under
`core/src/providers/*/describe/`; do not import files from this directory
(no static `import`, no dynamic `import()`) into the browser bundle.

## Generating the runtime catalogs from these snapshots

See `../catalog-data/README.md#generating-the-runtime-catalogs-from-these-snapshots` -
`pnpm run pptask:generate-provider-catalogs` reads these snapshots (and
`../catalog-data/`) offline and writes the small Kie/Apiframe
`model-catalog.json` + whitelist-only `describe/` artifacts; it never copies
the raw documents here into `core/src`.
