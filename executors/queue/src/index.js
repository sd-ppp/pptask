import { ServiceError } from './errors.ts';
import { executeCreateTask, executeCheckStatus, executeGetResult, executeCancelTask, executeDescribe, executeUpload, } from './service/execution.ts';
export * from './types.ts';
export { ServiceError };
export { executeDescribe, executeCreateTask, executeCheckStatus, executeGetResult, executeCancelTask, executeUpload, };
const DEFAULT_JOB_POLL_INTERVAL_MS = 1000;
const DEFAULT_STATUS_POLL_INTERVAL_MS = 2000;
function resolveConfig(source, locator) {
    const base = typeof source === 'function' ? source(locator) : source;
    return cloneConfig(base);
}
function cloneConfig(config) {
    if (!config)
        return undefined;
    return { ...config };
}
export function createQueueExecutor(hooks, options) {
    const cancelHook = hooks.cancel ?? (async () => {
        throw new ServiceError('cancelTask', 'Cancel is not supported by this queue executor', {
            status: 405,
        });
    });
    return {
        enqueue: request => {
            const normalized = normalizeQueueRequest(request);
            return hooks.enqueue(normalized);
        },
        getStatus: jobId => hooks.getStatus(jobId),
        getResult: jobId => hooks.getResult(jobId),
        cancel: cancelHook,
    };
}
export function createQueueWorker(hooks, options) {
    const jobPollInterval = options?.jobPollIntervalMs ?? DEFAULT_JOB_POLL_INTERVAL_MS;
    const statusPollInterval = options?.statusPollIntervalMs ?? DEFAULT_STATUS_POLL_INTERVAL_MS;
    const maxAttempts = options?.maxAttempts;
    const source = options?.platformConfig;
    let stopped = false;
    let running = false;
    let loopPromise;
    async function runOnce() {
        if (stopped)
            return false;
        const reserved = await hooks.reserve();
        if (!reserved)
            return false;
        await processReservedJob(reserved, hooks, statusPollInterval, maxAttempts, source);
        return true;
    }
    async function workLoop() {
        running = true;
        try {
            while (!stopped) {
                const processed = await runOnce();
                if (!processed) {
                    await delay(jobPollInterval);
                }
            }
        }
        finally {
            running = false;
        }
    }
    return {
        start: () => {
            if (running)
                return Promise.resolve();
            stopped = false;
            loopPromise = workLoop();
            return Promise.resolve();
        },
        stop: async () => {
            stopped = true;
            if (loopPromise) {
                try {
                    await loopPromise;
                }
                catch {
                    // suppress loop errors on stop
                }
            }
        },
        runOnce,
    };
}
async function processReservedJob(reserved, hooks, statusPollInterval, maxAttempts, source) {
    const { job } = reserved;
    try {
        if (maxAttempts && reserved.attempts > maxAttempts) {
            await hooks.markFailed(job, new ServiceError('createTask', `Job ${job.jobId} exceeded max attempts`, {
                locator: job.locator,
                context: job.options?.context,
            }));
            return;
        }
        const created = await executeCreateTask({
            locator: job.locator,
            payload: job.payload ?? {},
            platformConfig: resolveConfig(source, job.locator),
            options: job.options,
        });
        await maybeReportStatus(hooks, job, toStatusResultFromCreate(created.data, job.jobId));
        const createdData = created.data;
        const taskId = createdData.taskId;
        const options = job.options;
        const platformConfig = resolveConfig(source, job.locator);
        while (true) {
            await delay(statusPollInterval);
            const statusResult = await executeCheckStatus({
                locator: job.locator,
                taskId,
                platformConfig,
                options,
            });
            await maybeReportStatus(hooks, job, normalizeStatusForJob(statusResult.data, job.jobId));
            const status = statusResult.data.status;
            if (status === 'succeeded') {
                const result = await executeGetResult({
                    locator: job.locator,
                    taskId,
                    platformConfig,
                    options,
                });
                await hooks.markComplete(job, normalizeResultForJob(result.data, job.jobId));
                return;
            }
            if (status === 'failed' || status === 'cancelled') {
                throw new ServiceError(status === 'failed' ? 'checkStatus' : 'cancelTask', `Task ${taskId} ended with status=${status}`, {
                    locator: job.locator,
                    platformConfig,
                    details: statusResult.data.raw,
                });
            }
        }
    }
    catch (err) {
        await hooks.markFailed(job, err);
    }
}
async function maybeReportStatus(hooks, job, status) {
    if (!hooks.reportStatus)
        return;
    await hooks.reportStatus(job, normalizeStatusForJob(status, job.jobId));
}
function normalizeQueueRequest(request) {
    return {
        jobId: request.jobId,
        locator: request.locator,
        payload: request.payload ?? {},
        options: normalizeExecutionOptions(request.options),
    };
}
function normalizeExecutionOptions(options) {
    if (!options)
        return undefined;
    const normalized = {};
    if (options.signal)
        normalized.signal = options.signal;
    if (options.context)
        normalized.context = { ...options.context };
    return normalized;
}
function toStatusResultFromCreate(createResult, jobId) {
    return {
        provider: createResult.provider,
        taskId: jobId,
        status: createResult.status,
        raw: createResult.raw,
    };
}
function normalizeStatusForJob(status, jobId) {
    if (status.taskId === jobId)
        return status;
    return {
        ...status,
        taskId: jobId,
        raw: { ...status.raw, providerTaskId: status.taskId },
    };
}
function normalizeResultForJob(result, jobId) {
    if (result.taskId === jobId)
        return result;
    return {
        ...result,
        taskId: jobId,
        raw: { ...result.raw, providerTaskId: result.taskId },
    };
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
