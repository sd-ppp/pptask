export function mapJsonType(outputType) {
    switch (outputType) {
        case 'array':
            return 'array';
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'images':
            return 'array';
        default:
            return 'string';
    }
}
export function mapComponent(outputType, options) {
    switch (outputType) {
        case 'number':
            return 'NumberPicker';
        case 'boolean':
            return 'Switch';
        case 'combo':
            return 'Select';
        case 'images':
            return options.maxCount && options.maxCount > 1 ? 'Upload.Dragger' : 'Upload';
        default:
            return options.multiline ? 'Input.TextArea' : 'Input';
    }
}
export function resolveComponentName(outputType, recommended) {
    if (recommended && typeof recommended === 'string')
        return recommended;
    switch (outputType) {
        case 'number':
            return 'NumberPicker';
        case 'boolean':
            return 'Switch';
        case 'combo':
            return 'Select';
        case 'images':
            return 'Upload';
        case 'array':
            return 'ArrayItems';
        default:
            return 'Input';
    }
}
export function mapComponentProps(outputType, options) {
    const props = {};
    switch (outputType) {
        case 'number':
            if (typeof options.min === 'number')
                props.min = options.min;
            if (typeof options.max === 'number')
                props.max = options.max;
            if (typeof options.step === 'number')
                props.step = options.step;
            if (options.slider === true)
                props.slider = true;
            break;
        case 'combo':
            if (options.placeholder)
                props.placeholder = options.placeholder;
            break;
        case 'images':
            if (options.maxCount)
                props.maxCount = options.maxCount;
            props.listType = options.listType || 'picture-card';
            props.accept = options.accept || 'image/*';
            break;
        default:
            if (options.placeholder)
                props.placeholder = options.placeholder;
            if (options.multiline && !props.rows)
                props.rows = options.rows ?? 4;
            break;
    }
    return props;
}
export function buildEnum(options) {
    if (!options)
        return undefined;
    const values = options.values;
    if (!Array.isArray(values) || values.length === 0)
        return undefined;
    const labels = Array.isArray(options.labels) ? options.labels : undefined;
    return values.map((value, idx) => {
        const label = labels && labels[idx] !== undefined ? labels[idx] : value;
        if (typeof label === 'object' && label && 'label' in label && 'value' in label) {
            return label;
        }
        return { label, value };
    });
}
export function normalizeValue(outputType, value, options, enumeration) {
    switch (outputType) {
        case 'number': {
            if (value === undefined || value === null || value === '')
                return undefined;
            const num = Number(value);
            return Number.isFinite(num) ? num : undefined;
        }
        case 'boolean':
            return Boolean(value);
        case 'combo': {
            if (value !== undefined && value !== null && value !== '')
                return value;
            const first = enumeration?.[0];
            if (first === undefined)
                return undefined;
            return typeof first === 'object' && first !== null ? first.value : first;
        }
        case 'images':
            if (Array.isArray(value))
                return value;
            if (!value)
                return [];
            return [value];
        default:
            return value ?? '';
    }
}
