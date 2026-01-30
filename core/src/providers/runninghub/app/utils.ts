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

    if (fieldType === 'SWITCH') {
      fieldValue = normalizeSwitchFieldValue(node, fieldValue);
    }
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

function parseFieldData(fieldData: any): any[] {
  if (!fieldData) return [];
  if (Array.isArray(fieldData)) return fieldData;
  if (typeof fieldData === 'string') {
    try {
      const parsed = JSON.parse(fieldData);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeSwitchFieldValue(node: any, rawValue: any): any {
  if (rawValue === undefined || rawValue === null) return rawValue;
  const candidates = parseFieldData(node?.fieldData);
  if (!Array.isArray(candidates) || candidates.length === 0) return rawValue;

  const valueStr = String(rawValue);

  const byName = candidates.find(
    item => item && typeof item === 'object' && item.name !== undefined && String(item.name) === valueStr
  );
  if (byName && byName.index !== undefined) return byName.index;

  const byFastIndex = candidates.find(
    item => item && typeof item === 'object' && item.fastIndex !== undefined && String(item.fastIndex) === valueStr
  );
  if (byFastIndex && byFastIndex.index !== undefined) return byFastIndex.index;

  const byIndex = candidates.find(
    item => item && typeof item === 'object' && item.index !== undefined && String(item.index) === valueStr
  );
  if (byIndex && byIndex.index !== undefined) return byIndex.index;

  return rawValue;
}
