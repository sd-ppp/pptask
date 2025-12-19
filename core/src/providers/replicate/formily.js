import { buildEnum, mapComponent, mapComponentProps, mapJsonType, normalizeValue, resolveComponentName, } from '../../common/formily.ts';
export function buildFormilySchemaFromReplicate(modelInfo, defaults = {}) {
    const properties = {};
    const values = {};
    const inputSchema = modelInfo?.latest_version?.openapi_schema?.components?.schemas?.Input;
    if (!inputSchema?.properties) {
        return { schema: { type: 'object', properties }, values };
    }
    const entries = Object.entries(inputSchema.properties);
    entries.sort((a, b) => (a[1]['x-order'] ?? 0) - (b[1]['x-order'] ?? 0));
    const requiredSet = Array.isArray(inputSchema.required) ? new Set(inputSchema.required) : new Set();
    entries.forEach(([name, prop], index) => {
        const outputType = inferReplicateOutputType(prop);
        const options = buildReplicateOptions(prop);
        options.required = requiredSet.has(name);
        const enumeration = buildEnum(options);
        const recommendedComponent = mapComponent(outputType, options);
        const componentProps = mapComponentProps(outputType, options);
        const componentName = resolveComponentName(outputType, recommendedComponent);
        const fieldSchema = {
            type: mapJsonType(outputType),
            title: prop?.title || name,
            'x-index': index,
            'x-decorator': 'FormItem',
            'x-component': componentName,
            'x-replicate': {
                outputType,
                options,
                recommendedComponent,
                componentProps,
                schema: prop,
            },
        };
        if (Object.keys(componentProps).length > 0) {
            fieldSchema['x-component-props'] = componentProps;
        }
        if (prop?.description)
            fieldSchema.description = prop.description;
        if (options.required)
            fieldSchema.required = true;
        if (enumeration)
            fieldSchema.enum = enumeration;
        if (fieldSchema.type === 'number') {
            if (typeof prop?.minimum === 'number')
                fieldSchema.minimum = prop.minimum;
            if (typeof prop?.maximum === 'number')
                fieldSchema.maximum = prop.maximum;
        }
        properties[name] = fieldSchema;
        const defaultValue = defaults.hasOwnProperty(name) && defaults[name] !== undefined
            ? defaults[name]
            : prop?.default;
        values[name] = normalizeValue(outputType, defaultValue, options, enumeration);
    });
    return { schema: { type: 'object', properties }, values };
}
function inferReplicateOutputType(prop) {
    if (!prop)
        return 'string';
    if (prop.enum || prop.oneOf || prop.allOf)
        return 'combo';
    const type = prop.type;
    if (type === 'number' || type === 'integer')
        return 'number';
    if (type === 'boolean')
        return 'boolean';
    if (type === 'array') {
        const items = prop.items || {};
        if (items.type === 'string' && items.format === 'uri')
            return 'images';
        return 'array';
    }
    if (type === 'string') {
        if (prop.format === 'uri')
            return 'images';
        return 'string';
    }
    return 'string';
}
function buildReplicateOptions(prop) {
    const options = {};
    if (!prop)
        return options;
    const enumOptions = extractEnumOptions(prop);
    if (enumOptions) {
        options.values = enumOptions.map(item => (typeof item === 'object' && item !== null ? item.value : item));
        options.labels = enumOptions.map(item => (typeof item === 'object' && item !== null ? item.label : item));
    }
    if (typeof prop.minimum === 'number')
        options.min = prop.minimum;
    if (typeof prop.maximum === 'number')
        options.max = prop.maximum;
    if (typeof prop.multipleOf === 'number')
        options.step = prop.multipleOf;
    if (prop.maxItems !== undefined)
        options.maxItems = prop.maxItems;
    if (prop.minItems !== undefined)
        options.minItems = prop.minItems;
    if (prop.maxLength !== undefined)
        options.maxLength = prop.maxLength;
    if (prop.minLength !== undefined)
        options.minLength = prop.minLength;
    return options;
}
function extractEnumOptions(prop) {
    if (Array.isArray(prop?.enum)) {
        return prop.enum;
    }
    if (Array.isArray(prop?.oneOf)) {
        return prop.oneOf.map((item) => ({
            label: item?.title ?? item?.const ?? item,
            value: item?.const ?? item?.value ?? item,
        }));
    }
    if (Array.isArray(prop?.allOf)) {
        return prop.allOf.map((item) => ({
            label: item?.title ?? item?.const ?? item,
            value: item?.const ?? item?.value ?? item,
        }));
    }
    return undefined;
}
