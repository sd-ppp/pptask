export class ServiceError extends Error {
    constructor(operation, message, options) {
        super(message);
        this.operation = operation;
        this.status = options?.status && options.status >= 400 && options.status < 600 ? options.status : 500;
        this.locator = options?.locator;
        this.platformConfig = options?.platformConfig;
        this.context = options?.context;
        this.cause = options?.cause;
        this.code = options?.code;
        this.details = options?.details;
    }
}
