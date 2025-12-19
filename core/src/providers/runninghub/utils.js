export function buildNodeInfoListFromValues(template, values, defaultValues = {}) {
    return template.map(node => {
        const key = `${node.nodeId}_${node.fieldName}`;
        let fieldValue = values[key] !== undefined
            ? values[key]
            : defaultValues[key] !== undefined
                ? defaultValues[key]
                : node.fieldValue;
        const fieldType = String(node.fieldType || '').toUpperCase();
        if (fieldType === 'IMAGE' || fieldType === 'FILE') {
            fieldValue = normalizeUploadField(fieldValue);
        }
        return { ...node, fieldValue };
    });
}
function normalizeUploadField(value) {
    if (Array.isArray(value)) {
        const first = value[0];
        return normalizeUploadEntry(first);
    }
    return normalizeUploadEntry(value);
}
function normalizeUploadEntry(entry) {
    if (!entry)
        return entry;
    if (typeof entry === 'object' && 'url' in entry) {
        return entry.url;
    }
    return entry;
}
