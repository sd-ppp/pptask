import { buildFormilySchemaFromReplicate } from './formily.ts';
import { createAbortError, createReplicateClient, ensureReplicateConfig, extractReplicateCost, extractReplicateProgress, getModelMetadata, isRequestAborted, mapReplicateStatus, normalizeReplicateOutputs, parseReplicateModel, resolveModelVersion, } from './helpers.ts';
export async function describeReplicate(url, platformConfig, options) {
    const { apiKey } = ensureReplicateConfig(platformConfig);
    const model = parseReplicateModel(url);
    const client = createReplicateClient(apiKey);
    const { modelInfo, defaultValues } = await getModelMetadata(client, model, apiKey);
    const { schema, values } = buildFormilySchemaFromReplicate(modelInfo, defaultValues);
    return {
        provider: 'replicate',
        metadata: {
            scheme: 'replicate',
            model,
            defaultValues,
            rawData: modelInfo,
        },
        formSchema: schema,
        formValues: values,
    };
}
export async function createReplicateTask(url, payload = {}, platformConfig, options) {
    const { apiKey, version } = ensureReplicateConfig(platformConfig);
    const model = parseReplicateModel(url);
    const signal = options?.signal;
    if (isRequestAborted(signal)) {
        throw createAbortError('Task creation aborted');
    }
    const client = createReplicateClient(apiKey);
    const resolvedVersion = await resolveModelVersion(client, model, apiKey, version);
    const [owner, name] = model.split('/');
    const created = await client.predictions.create({
        model: `${owner}/${name}`,
        input: payload,
        version: resolvedVersion,
    });
    return {
        provider: 'replicate',
        taskId: created.id,
        status: mapReplicateStatus(created.status),
        raw: created,
        metadata: {
            version: created.version,
        },
    };
}
export async function checkReplicateStatus(_url, taskId, platformConfig, options) {
    const { apiKey } = ensureReplicateConfig(platformConfig);
    const signal = options?.signal;
    if (isRequestAborted(signal)) {
        throw createAbortError('Status check aborted');
    }
    const client = createReplicateClient(apiKey);
    const prediction = await client.predictions.get(taskId);
    const status = mapReplicateStatus(prediction.status);
    const progress = extractReplicateProgress(prediction);
    return {
        provider: 'replicate',
        taskId,
        status,
        progress,
        raw: prediction,
    };
}
export async function getReplicateResult(_url, taskId, platformConfig, options) {
    const { apiKey } = ensureReplicateConfig(platformConfig);
    const signal = options?.signal;
    if (isRequestAborted(signal)) {
        throw createAbortError('Result fetch aborted');
    }
    const client = createReplicateClient(apiKey);
    const prediction = await client.predictions.get(taskId);
    const status = mapReplicateStatus(prediction.status);
    if (status !== 'succeeded') {
        throw new Error(`Replicate task ${taskId} is not completed (status=${prediction.status ?? 'unknown'})`);
    }
    const outputs = normalizeReplicateOutputs(prediction);
    const cost = extractReplicateCost(prediction);
    return {
        provider: 'replicate',
        taskId,
        status: 'succeeded',
        outputs,
        costCoins: cost?.coins,
        costMoney: cost?.money,
        costMoneyCurrency: cost?.moneyCurrency,
        raw: prediction,
    };
}
export async function cancelReplicateTask(_url, taskId, platformConfig, options) {
    const { apiKey } = ensureReplicateConfig(platformConfig);
    const signal = options?.signal;
    if (isRequestAborted(signal)) {
        throw createAbortError('Cancellation aborted');
    }
    const client = createReplicateClient(apiKey);
    try {
        await client.predictions.cancel(taskId);
    }
    catch (err) {
        if (err?.status === 404)
            return;
        throw err;
    }
}
export async function uploadReplicateFile(_url, formData, platformConfig, options) {
    const { apiKey } = ensureReplicateConfig(platformConfig);
    const signal = options?.signal;
    if (isRequestAborted(signal)) {
        throw createAbortError('Upload aborted');
    }
    const fileEntry = formData.get('file');
    if (!fileEntry)
        throw new Error('replicate upload requires formData field "file"');
    const blob = await toBlob(fileEntry);
    const client = createReplicateClient(apiKey);
    const uploaded = await client.files.create(blob);
    return {
        provider: 'replicate',
        url: uploaded?.urls?.get ?? '',
        raw: uploaded,
    };
}
async function toBlob(entry) {
    if (entry instanceof Blob) {
        return entry;
    }
    if (typeof entry === 'string') {
        return new Blob([entry], { type: 'text/plain' });
    }
    if (entry?.arrayBuffer instanceof Function) {
        const fileLike = entry;
        const data = await fileLike.arrayBuffer();
        return new Blob([data], { type: fileLike.type ?? 'application/octet-stream' });
    }
    throw new Error('Unsupported file entry for replicate upload');
}
