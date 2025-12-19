import { describeResource, createTask, checkStatus, getResult, cancelTask, upload as uploadResource, } from '../../../../core/src/index.ts';
import { ServiceError } from '../errors.ts';
function mapLibOptions(options) {
    if (!options)
        return undefined;
    const mapped = {};
    if (options.signal)
        mapped.signal = options.signal;
    return Object.keys(mapped).length > 0 ? mapped : undefined;
}
function buildExecutionResult(operation, locator, platformConfig, options, data) {
    return {
        operation,
        locator,
        platformConfig,
        context: options?.context,
        data,
    };
}
function wrapServiceError(operation, error, locator, platformConfig, options) {
    if (error instanceof ServiceError)
        return error;
    const status = typeof error?.status === 'number' ? error.status : undefined;
    const message = error?.message ? String(error.message) : `Failed to ${operation}`;
    return new ServiceError(operation, message, {
        status,
        locator,
        platformConfig,
        context: options?.context,
        cause: error,
        code: error?.code,
        details: error?.details ?? error?.payload ?? error,
    });
}
export async function executeCreateTask(params) {
    const { locator, payload, platformConfig, options } = params;
    try {
        const result = await createTask({
            locator,
            payload: payload ?? {},
            platformConfig,
            options: mapLibOptions(options),
        });
        return buildExecutionResult('createTask', locator, platformConfig, options, result);
    }
    catch (error) {
        throw wrapServiceError('createTask', error, locator, platformConfig, options);
    }
}
export async function executeDescribe(params) {
    const { locator, platformConfig, options } = params;
    try {
        const result = await describeResource({
            locator,
            platformConfig,
            options: mapLibOptions(options),
        });
        return buildExecutionResult('describe', locator, platformConfig, options, result);
    }
    catch (error) {
        throw wrapServiceError('describe', error, locator, platformConfig, options);
    }
}
export async function executeCheckStatus(params) {
    const { locator, taskId, platformConfig, options } = params;
    try {
        const result = await checkStatus({
            locator,
            taskId,
            platformConfig,
            options: mapLibOptions(options),
        });
        return buildExecutionResult('checkStatus', locator, platformConfig, options, result);
    }
    catch (error) {
        throw wrapServiceError('checkStatus', error, locator, platformConfig, options);
    }
}
export async function executeGetResult(params) {
    const { locator, taskId, platformConfig, options } = params;
    try {
        const result = await getResult({
            locator,
            taskId,
            platformConfig,
            options: mapLibOptions(options),
        });
        return buildExecutionResult('getResult', locator, platformConfig, options, result);
    }
    catch (error) {
        throw wrapServiceError('getResult', error, locator, platformConfig, options);
    }
}
export async function executeCancelTask(params) {
    const { locator, taskId, platformConfig, options } = params;
    try {
        await cancelTask({
            locator,
            taskId,
            platformConfig,
            options: mapLibOptions(options),
        });
        return buildExecutionResult('cancelTask', locator, platformConfig, options, undefined);
    }
    catch (error) {
        throw wrapServiceError('cancelTask', error, locator, platformConfig, options);
    }
}
export async function executeUpload(params) {
    const { locator, formData, platformConfig, options } = params;
    try {
        const result = await uploadResource({
            locator,
            formData,
            platformConfig,
            options: mapLibOptions(options),
        });
        return buildExecutionResult('upload', locator, platformConfig, options, result);
    }
    catch (error) {
        throw wrapServiceError('upload', error, locator, platformConfig, options);
    }
}
