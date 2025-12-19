export function parseLocator(locator) {
    const url = createUrl(locator);
    const scheme = normalizeScheme(url.protocol);
    return { scheme, url };
}
export function normalizeScheme(scheme) {
    return scheme.replace(/:\s*$/, '').toLowerCase();
}
function createUrl(locator) {
    try {
        return new URL(locator);
    }
    catch {
        throw new Error(`Invalid locator: ${locator}`);
    }
}
