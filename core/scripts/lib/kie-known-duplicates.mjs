export const KNOWN_KIE_LOCATOR_CONFLICTS = [
  {
    locator: 'kie://market/kling/v2-1-master-image-to-video',
    resolvedSourceSuffix: 'market/kling/v2-1-master-image-to-video.md',
  },
  {
    locator: 'kie://market/qwen2/image-edit',
    resolvedSourceSuffix: 'market/qwen2/image-edit.md',
  },
];

export function findKnownKieLocatorConflict(locator) {
  return KNOWN_KIE_LOCATOR_CONFLICTS.find(entry => entry.locator === locator) ?? null;
}
