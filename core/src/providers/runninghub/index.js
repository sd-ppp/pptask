import { parseLocator } from '../../resource.ts';
import { cancelRunninghubTask, checkRunninghubStatus, createRunninghubTask, describeRunninghub, getRunninghubResult, uploadRunninghubFile, } from './api.ts';
const RUNNINGHUB_SCHEME = 'runninghub';
function ensureRunninghubUrl(locator) {
    const { scheme, url } = parseLocator(locator);
    if (scheme !== RUNNINGHUB_SCHEME) {
        throw new Error(`runninghub provider received unsupported locator: ${locator}`);
    }
    return url;
}
export const runninghubProviderDefinition = {
    async describeResource(params) {
        const url = ensureRunninghubUrl(params.locator);
        return describeRunninghub(url, params.platformConfig, params.options);
    },
    async createTask(params) {
        const url = ensureRunninghubUrl(params.locator);
        return createRunninghubTask(url, params.payload ?? {}, params.platformConfig, params.options);
    },
    async checkStatus(params) {
        const url = ensureRunninghubUrl(params.locator);
        return checkRunninghubStatus(url, params.taskId, params.platformConfig, params.options);
    },
    async getResult(params) {
        const url = ensureRunninghubUrl(params.locator);
        return getRunninghubResult(url, params.taskId, params.platformConfig, params.options);
    },
    async cancelTask(params) {
        const url = ensureRunninghubUrl(params.locator);
        await cancelRunninghubTask(url, params.taskId, params.platformConfig, params.options);
    },
    async upload(params) {
        const url = ensureRunninghubUrl(params.locator);
        return uploadRunninghubFile(url, params.formData, params.platformConfig, params.options);
    },
};
export { cancelRunninghubTask, checkRunninghubStatus, createRunninghubTask, describeRunninghub, getRunninghubResult, uploadRunninghubFile, } from './api.ts';
export { parseRunninghubWebappId, ensureRunninghubConfig, fetchRunninghubTemplate, buildRunninghubPayload, createRunningHubError, } from './helpers.ts';
