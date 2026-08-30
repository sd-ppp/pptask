import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'yaml';
import { buildSearchText } from './catalog-utils.mjs';
import { assertSchemaHasNoRefs, compactJsonSchema } from './schema-compact.mjs';
import { findKnownKieLocatorConflict } from './kie-known-duplicates.mjs';

const CREATE_TASK_PATH = '/api/v1/jobs/createTask';

export async function listKieMarkdownFiles(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  await walk(root);
  return files.sort((left, right) => left.localeCompare(right));
}

export function extractYamlBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^```yaml\s*$/.test(lines[index])) continue;
    const content = [];
    index += 1;
    while (index < lines.length) {
      if (/^```\s*$/.test(lines[index])) break;
      content.push(lines[index]);
      index += 1;
    }
    blocks.push(content.join('\n'));
  }
  return blocks;
}

/**
 * Last-resort fallback for YAML documents that fail to parse as-is. This
 * blanks out folded/literal `description:` block scalars, which is lossy,
 * but only kicks in when the raw document is genuinely unparseable (e.g. an
 * embedded markdown fence inside a description that survived extraction and
 * confuses the YAML parser). Documents that parse cleanly on their own never
 * go through this path, so real help text (like model/prompt descriptions)
 * is preserved.
 */
function sanitizeFoldedDescriptions(yamlText) {
  const lines = yamlText.split('\n');
  const result = [];
  const foldedPattern = /^(\s*)description:\s*(?:>-\s*|>\s*|\|-\s*|\|\s*)$/;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(foldedPattern);
    if (!match) {
      result.push(line);
      continue;
    }
    const indent = match[1].length;
    result.push(`${match[1]}description: ""`);
    index += 1;
    while (index < lines.length) {
      const current = lines[index];
      if (current.trim() === '') {
        let lookahead = index + 1;
        while (lookahead < lines.length && lines[lookahead].trim() === '') lookahead += 1;
        if (lookahead < lines.length) {
          const nextIndent = lines[lookahead].match(/^(\s*)/)[1].length;
          if (nextIndent > indent) {
            index = lookahead;
            continue;
          }
        }
        break;
      }
      const currentIndent = current.match(/^(\s*)/)[1].length;
      if (currentIndent <= indent) {
        index -= 1;
        break;
      }
      index += 1;
    }
  }
  return result.join('\n');
}

export function parseKieCreateTaskFromYaml(yamlText) {
  let document;
  try {
    // Preferred path: parse the document exactly as authored. YAML folded
    // (>) and literal (|) block scalars are valid even when their content
    // includes blank lines, Markdown headings, or inline HTML-like tags, so
    // this succeeds for the vast majority of real Kie docs and keeps their
    // full description text intact.
    document = yaml.parse(yamlText);
  } catch {
    try {
      document = yaml.parse(sanitizeFoldedDescriptions(yamlText));
    } catch {
      return null;
    }
  }
  const operation = document?.paths?.[CREATE_TASK_PATH]?.post;
  if (!operation) return null;

  const requestSchema = operation?.requestBody?.content?.['application/json']?.schema;
  const modelProperty = requestSchema?.properties?.model;
  const enumValues = Array.isArray(modelProperty?.enum) ? modelProperty.enum.map(String) : [];
  if (enumValues.length !== 1) return null;

  return {
    modelId: enumValues[0],
    summary: typeof operation.summary === 'string' ? operation.summary : undefined,
    operationId: typeof operation.operationId === 'string' ? operation.operationId : undefined,
    tags: Array.isArray(operation.tags) ? operation.tags.map(String) : [],
    inputSchema: requestSchema?.properties?.input ?? null,
    requestSchema: requestSchema ?? null,
    document,
  };
}

export function parseKieCreateTaskFromMarkdown(markdown) {
  for (const yamlBlock of extractYamlBlocks(markdown)) {
    const parsed = parseKieCreateTaskFromYaml(yamlBlock);
    if (parsed) return parsed;
  }
  return null;
}

export function inferKieCategory(filePath, parsed, markdown) {
  const path = filePath.toLocaleLowerCase();
  if (/suno|audio|music|elevenlabs/.test(path)) return 'audio';
  if (/video|kling|veo|runway|seedance|wan|hailuo|pixverse/.test(path)) return 'video';
  if (/chat|claude|gpt|gemini|codex/.test(path)) return 'text';
  if (/image|seedream|flux|imagen|ideogram|grok/.test(path)) return 'image';

  const tag = parsed.tags.join(' ').toLocaleLowerCase();
  if (/video/.test(tag)) return 'video';
  if (/audio|music/.test(tag)) return 'audio';
  if (/chat|text/.test(tag)) return 'text';

  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.toLocaleLowerCase() ?? '';
  if (/video/.test(title)) return 'video';
  if (/audio|speech|dialogue|music/.test(title)) return 'audio';
  if (/chat|text/.test(title)) return 'text';
  return 'image';
}

export function extractMarkdownTitle(markdown) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

export function buildKieCatalogEntry(filePath, markdown, parsed) {
  const label = extractMarkdownTitle(markdown) ?? parsed.summary ?? parsed.modelId;
  const category = inferKieCategory(filePath, parsed, markdown);
  const description = typeof parsed.summary === 'string' ? parsed.summary : '';
  return {
    providerId: 'kie',
    locator: `kie://market/${parsed.modelId}`,
    label,
    category,
    outputType: category,
    description,
    sourcePath: filePath,
    modelId: parsed.modelId,
    searchText: buildSearchText([label, parsed.modelId, category, description]),
  };
}

export function buildKieDescribeEntry(parsed, outputType) {
  const requestSchema = compactJsonSchema(parsed.inputSchema, {
    document: parsed.document,
    root: parsed.document,
  });
  assertSchemaHasNoRefs(requestSchema);
  return {
    locator: `kie://market/${parsed.modelId}`,
    modelId: parsed.modelId,
    providerId: 'kie',
    outputType,
    endpoint: {
      method: 'POST',
      path: CREATE_TASK_PATH,
    },
    requestSchema,
    wireMetadata: {
      modelField: 'model',
      inputField: 'input',
      callbackField: 'callBackUrl',
    },
  };
}

export function buildKieSchemaSignature(parsed) {
  return JSON.stringify({
    modelId: parsed.modelId,
    operationId: parsed.operationId ?? null,
    inputSchema: parsed.inputSchema ?? null,
    requestSchema: parsed.requestSchema ?? null,
  });
}

export async function buildKieCatalogEntries(kieDescribeRoot, options = {}) {
  const { collectDiagnostics = false } = options;
  const entries = [];
  for (const filePath of await listKieMarkdownFiles(kieDescribeRoot)) {
    const markdown = await readFile(filePath, 'utf8');
    const parsed = parseKieCreateTaskFromMarkdown(markdown);
    if (!parsed) continue;
    entries.push({
      ...buildKieCatalogEntry(filePath, markdown, parsed),
      schemaSignature: buildKieSchemaSignature(parsed),
    });
  }
  const resolved = resolveKieCatalogDuplicates(entries);
  const catalogEntries = resolved.entries.map(stripKieInternalFields);
  if (collectDiagnostics) {
    return {
      entries: catalogEntries,
      diagnostics: resolved.diagnostics,
    };
  }
  return catalogEntries;
}

function stripKieInternalFields(entry) {
  const { schemaSignature: _schemaSignature, ...publicEntry } = entry;
  return publicEntry;
}

function resolveKieCatalogDuplicates(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    if (!grouped.has(entry.locator)) {
      grouped.set(entry.locator, []);
    }
    grouped.get(entry.locator).push(entry);
  }

  const resolvedEntries = [];
  const diagnostics = [];

  for (const [locator, group] of [...grouped.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    const sortedGroup = [...group].sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
    if (sortedGroup.length === 1) {
      resolvedEntries.push(sortedGroup[0]);
      continue;
    }

    const signatures = [...new Set(sortedGroup.map(entry => entry.schemaSignature))];
    if (signatures.length === 1) {
      diagnostics.push({
        type: 'kie-locator-duplicate',
        locator,
        message: `Duplicate Kie locator resolved deterministically to ${sortedGroup[0].sourcePath}`,
        sources: sortedGroup.map(entry => entry.sourcePath),
        resolvedSource: sortedGroup[0].sourcePath,
      });
      resolvedEntries.push(sortedGroup[0]);
      continue;
    }

    const knownConflict = findKnownKieLocatorConflict(locator);
    if (knownConflict) {
      const resolved = sortedGroup.find(entry => entry.sourcePath.endsWith(knownConflict.resolvedSourceSuffix));
      if (!resolved) {
        throw new Error(
          `Known Kie locator conflict ${locator} is missing resolved source ${knownConflict.resolvedSourceSuffix}`,
        );
      }
      diagnostics.push({
        type: 'kie-locator-conflict',
        locator,
        message: `Known Kie locator conflict resolved deterministically to ${resolved.sourcePath}`,
        sources: sortedGroup.map(entry => entry.sourcePath),
        resolvedSource: resolved.sourcePath,
      });
      resolvedEntries.push(resolved);
      continue;
    }

    const sources = sortedGroup.map(entry => entry.sourcePath);
    throw new Error(
      `Conflicting Kie locator ${locator} found in sources: ${sources.join(', ')}`,
    );
  }

  return {
    entries: resolvedEntries.sort((left, right) => left.locator.localeCompare(right.locator)),
    diagnostics: diagnostics.sort((left, right) => left.locator.localeCompare(right.locator)),
  };
}

export async function buildKieDescribeEntries(kieDescribeRoot, whitelistEntries) {
  const catalogResult = await buildKieCatalogEntries(kieDescribeRoot, { collectDiagnostics: true });
  const catalogByLocator = new Map(catalogResult.entries.map(entry => [entry.locator, entry]));
  const describeEntries = [];
  for (const whitelistEntry of whitelistEntries) {
    const catalogEntry = catalogByLocator.get(whitelistEntry.locator);
    if (!catalogEntry) continue;
    const markdown = await readFile(catalogEntry.sourcePath, 'utf8');
    const parsed = parseKieCreateTaskFromMarkdown(markdown);
    if (!parsed) continue;
    describeEntries.push({
      ...buildKieDescribeEntry(parsed, catalogEntry.outputType),
      label: whitelistEntry.label,
    });
  }
  return describeEntries.sort((left, right) => left.locator.localeCompare(right.locator));
}
