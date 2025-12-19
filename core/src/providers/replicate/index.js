import { parseLocator } from '../../resource.ts';
import { cancelReplicateTask, checkReplicateStatus, createReplicateTask, describeReplicate, getReplicateResult, uploadReplicateFile, } from './api.ts';
const REPLICATE_SCHEME = 'replicate';
function ensureReplicateUrl(locator) {
    const { scheme, url } = parseLocator(locator);
    if (scheme !== REPLICATE_SCHEME) {
        throw new Error(`replicate provider received unsupported locator: ${locator}`);
    }
    return url;
}
export const replicateProviderDefinition = {
    async describeResource(params) {
        const url = ensureReplicateUrl(params.locator);
        return describeReplicate(url, params.platformConfig, params.options);
    },
    async createTask(params) {
        const url = ensureReplicateUrl(params.locator);
        return createReplicateTask(url, params.payload ?? {}, params.platformConfig, params.options);
    },
    async checkStatus(params) {
        const url = ensureReplicateUrl(params.locator);
        return checkReplicateStatus(url, params.taskId, params.platformConfig, params.options);
    },
    async getResult(params) {
        const url = ensureReplicateUrl(params.locator);
        return getReplicateResult(url, params.taskId, params.platformConfig, params.options);
    },
    async cancelTask(params) {
        const url = ensureReplicateUrl(params.locator);
        await cancelReplicateTask(url, params.taskId, params.platformConfig, params.options);
    },
    async upload(params) {
        const url = ensureReplicateUrl(params.locator);
        return uploadReplicateFile(url, params.formData, params.platformConfig, params.options);
    },
};
export { cancelReplicateTask, checkReplicateStatus, createReplicateTask, describeReplicate, getReplicateResult, uploadReplicateFile, } from './api.ts';
export { createAbortError as createReplicateAbortError, ensureReplicateConfig, parseReplicateModel, } from './helpers.ts';
