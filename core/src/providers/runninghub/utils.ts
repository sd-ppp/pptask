type NodeInfo = {
  nodeId: string;
  fieldName: string;
  fieldType?: string;
  fieldValue?: any;
  [key: string]: any;
};

export function buildNodeInfoListFromValues(
  template: NodeInfo[],
  values: Record<string, any>,
  defaultValues: Record<string, any> = {}
): NodeInfo[] {
  return template.map(node => {
    const key = `${node.nodeId}_${node.fieldName}`;
    let fieldValue =
      values[key] !== undefined
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

function normalizeUploadField(value: any): any {
  if (Array.isArray(value)) {
    const first = value[0];
    return normalizeUploadEntry(first);
  }
  return normalizeUploadEntry(value);
}

function normalizeUploadEntry(entry: any): any {
  if (!entry) return entry;
  if (typeof entry === 'object' && 'url' in entry) {
    return (entry as any).url;
  }
  return entry;
}

