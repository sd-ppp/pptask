import { buildFormilySchemaFromRunninghub } from './formily.ts';
import { buildRunninghubPayload, createAbortError, createRunningHubError, ensureRunninghubConfig, extractRunninghubCost, extractRunninghubProgress, extractRunninghubStatus, fetchRunninghubTemplate, getBaseHost, isRequestAborted, mapRunninghubStatus, normalizeRunninghubOutputs, parseRunninghubWebappId, } from './helpers.ts';
export async function describeRunninghub(url, platformConfig, options) {
    const config = ensureRunninghubConfig(platformConfig);
    const webappId = parseRunninghubWebappId(url);
    const template = await fetchRunninghubTemplate(webappId, config);
    const { schema, values } = buildFormilySchemaFromRunninghub(template.nodeInfoTemplate, template.defaultValues);
    return {
        provider: 'runninghub',
        metadata: {
            scheme: 'runninghub',
            webappId,
            defaultValues: template.defaultValues,
            rawData: template.rawData,
        },
        formSchema: schema,
        formValues: values,
    };
}
export async function createRunninghubTask(url, payload = {}, platformConfig, options) {
    const config = ensureRunninghubConfig(platformConfig);
    const webappId = parseRunninghubWebappId(url);
    const signal = options?.signal;
    if (isRequestAborted(signal))
        throw createAbortError('Task creation aborted');
    const template = await fetchRunninghubTemplate(webappId, config);
    const { nodeInfoList } = buildRunninghubPayload(template, payload);
    const baseHost = getBaseHost(config.language);
    const runUrl = `https://${baseHost}/task/openapi/ai-app/run`;
    const response = await fetch(runUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            apiKey: config.apiKey,
            webappId,
            nodeInfoList,
            instanceType: 'default',
        }),
    });
    if (!response.ok) {
        throw new Error(`runninghub run HTTP ${response.status}`);
    }
    const result = await response.json();
    if (result?.code !== 0) {
        throw createRunningHubError('run', result);
    }
    const taskId = result?.data?.taskId;
    if (!taskId) {
        throw new Error('runninghub run: missing taskId in response');
    }
    return {
        provider: 'runninghub',
        taskId,
        status: 'pending',
        raw: {
            nodeInfoList,
            response: result,
        },
        metadata: {
            webappId,
        },
    };
}
export async function checkRunninghubStatus(url, taskId, platformConfig, options) {
    const config = ensureRunninghubConfig(platformConfig);
    const signal = options?.signal;
    if (isRequestAborted(signal))
        throw createAbortError('Status check aborted');
    const baseHost = getBaseHost(config.language);
    const statusUrl = `https://${baseHost}/task/openapi/status`;
    const response = await fetch(statusUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, taskId }),
    });
    if (!response.ok) {
        throw new Error(`runninghub status HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (payload?.code !== 0) {
        throw createRunningHubError('status', payload);
    }
    const statusValue = extractRunninghubStatus(payload);
    const status = mapRunninghubStatus(statusValue);
    const progress = extractRunninghubProgress(payload);
    return {
        provider: 'runninghub',
        taskId,
        status,
        progress,
        raw: payload,
    };
}
export async function getRunninghubResult(url, taskId, platformConfig, options) {
    const config = ensureRunninghubConfig(platformConfig);
    const signal = options?.signal;
    if (isRequestAborted(signal))
        throw createAbortError('Result fetch aborted');
    const status = await checkRunninghubStatus(url, taskId, platformConfig, options);
    if (status.status !== 'succeeded') {
        throw new Error(`runninghub task ${taskId} is not completed (status=${status.status})`);
    }
    const baseHost = getBaseHost(config.language);
    const outputsUrl = `https://${baseHost}/task/openapi/outputs`;
    const response = await fetch(outputsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, taskId }),
    });
    if (!response.ok)
        throw new Error(`runninghub outputs HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.code !== 0) {
        throw createRunningHubError('outputs', payload);
    }
    const outputs = normalizeRunninghubOutputs(payload?.data);
    const cost = extractRunninghubCost(payload);
    return {
        provider: 'runninghub',
        taskId,
        status: 'succeeded',
        outputs,
        costCoins: cost?.coins,
        costMoney: cost?.money,
        costMoneyCurrency: cost?.moneyCurrency,
        raw: payload,
    };
}
export async function cancelRunninghubTask(_url, taskId, platformConfig, options) {
    const config = ensureRunninghubConfig(platformConfig);
    const signal = options?.signal;
    if (isRequestAborted(signal))
        throw createAbortError('Cancellation aborted');
    const baseHost = getBaseHost(config.language);
    const cancelUrl = `https://${baseHost}/task/openapi/cancel`;
    const response = await fetch(cancelUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, taskId }),
    });
    if (!response.ok)
        throw new Error(`runninghub cancel HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.code !== 0) {
        throw createRunningHubError('cancel', payload);
    }
}
export async function uploadRunninghubFile(_url, formData, platformConfig, options) {
    const config = ensureRunninghubConfig(platformConfig);
    const signal = options?.signal;
    if (isRequestAborted(signal))
        throw createAbortError('Upload aborted');
    if (!formData.has('apiKey')) {
        formData.set('apiKey', config.apiKey);
    }
    if (!formData.has('fileType')) {
        formData.set('fileType', 'image');
    }
    const baseHost = getBaseHost(config.language);
    const uploadUrl = `https://${baseHost}/task/openapi/upload`;
    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok)
        throw new Error(`runninghub upload HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.code !== 0)
        throw createRunningHubError('upload', payload);
    return {
        provider: 'runninghub',
        url: payload?.data?.fileName,
        raw: payload,
    };
}
