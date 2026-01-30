import type { FormilyFieldSchema, FormilySchema } from '../../../types.ts';
import {
  buildEnum,
  mapComponent,
  mapComponentProps,
  mapJsonType,
  normalizeValue,
  resolveComponentName,
} from '../../../common/formily.ts';

export function buildFormilySchemaFromRunninghub(
  nodeInfoList: any[],
  defaults: Record<string, any> = {}
): { schema: FormilySchema; values: Record<string, any> } {
  const properties: Record<string, FormilyFieldSchema> = {};
  const values: Record<string, any> = {};

  nodeInfoList.forEach((node: any, index: number) => {
    if (!node?.nodeId || !node?.fieldName) return;
    const key = `${node.nodeId}_${node.fieldName}`;
    const outputType = mapRunninghubFieldType(node.fieldType);
    const options = createRunninghubOptions(node);
    const enumeration = buildEnum(options);
    let recommendedComponent = mapComponent(outputType, options);
    const componentProps = mapComponentProps(outputType, options);

    if (outputType === 'string') {
      recommendedComponent = 'Input.TextArea';
      if (componentProps.rows === undefined) {
        componentProps.rows = options.rows ?? 4;
      }
    }

    const componentName = resolveComponentName(outputType, recommendedComponent);

    const fieldSchema: FormilyFieldSchema = {
      type: mapJsonType(outputType),
      title: node.description || node.fieldName || key,
      'x-index': index,
      'x-decorator': 'FormItem',
      'x-component': componentName,
      'x-runninghub': {
        outputType,
        options,
        recommendedComponent,
        componentProps,
        nodeInfo: {
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          fieldName: node.fieldName,
          fieldType: node.fieldType,
          fieldData: node.fieldData,
          description: node.description,
          descriptionCn: node.descriptionCn,
          descriptionEn: node.descriptionEn,
          maxCount: node.maxCount,
        },
      },
    };

    if (Object.keys(componentProps).length > 0) {
      fieldSchema['x-component-props'] = componentProps;
    }

    if (node.description) fieldSchema.description = node.description;
    if (options.required) fieldSchema.required = true;
    if (enumeration) fieldSchema.enum = enumeration;
    if (fieldSchema.type === 'number') {
      if (typeof options.min === 'number') (fieldSchema as any).minimum = options.min;
      if (typeof options.max === 'number') (fieldSchema as any).maximum = options.max;
    }

    properties[key] = fieldSchema;

    const defaultValue =
      defaults.hasOwnProperty(key) && defaults[key] !== undefined
        ? defaults[key]
        : node.fieldValue;

    values[key] = normalizeValue(outputType, defaultValue, options, enumeration);
  });

  return { schema: { type: 'object', properties }, values };
}

function mapRunninghubFieldType(fieldType: string): string {
  switch ((fieldType || '').toLowerCase()) {
    case 'text':
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
    case 'int':
    case 'float':
      return 'number';
    case 'list':
    case 'select':
    case 'dropdown':
    case 'switch':
      return 'combo';
    case 'image':
    case 'file':
      return 'images';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
}

function createRunninghubOptions(node: any): Record<string, any> {
  const options: Record<string, any> = { required: node.required || false };
  let fieldData: any = [];
  try {
    fieldData = JSON.parse(node.fieldData || '[]');
  } catch {
    // ignore parse errors
  }
  const upperType = String(node.fieldType || '').toUpperCase();
  if (upperType === 'FLOAT' || upperType === 'INT') {
    const config = fieldData[1] ?? {};
    options.min = config.min;
    options.max = config.max;
    options.step = upperType === 'INT' ? 1 : 0.01;
    options.slider =
      typeof config.min === 'number' && typeof config.max === 'number' ? config.max - config.min < 1000 : false;
  }
  if (upperType === 'LIST' || upperType === 'SELECT' || upperType === 'DROPDOWN' || upperType === 'SWITCH') {
    if (Array.isArray(fieldData[0])) options.values = fieldData[0];
    else if (Array.isArray(fieldData)) {
      const candidates = fieldData.filter((i: any) => i && (i.name !== undefined || i.value !== undefined));
      options.values = candidates.map((i: any) => (i.index !== undefined ? i.index : i.value ?? i.name));
      options.labels = candidates.map((i: any) => i.description || i.label || i.name || i.value);
    } else {
      options.values = [];
    }
  }
  if (upperType === 'IMAGE' || upperType === 'FILE') {
    options.maxCount = node.maxCount || 1;
  }
  return options;
}
