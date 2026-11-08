import { createHash } from 'node:crypto';
import COS from 'cos-nodejs-sdk-v5';

export type MediaUpload = {
  bytes: Uint8Array;
  mediaType: string;
  signal?: AbortSignal;
};

/** Runtime-only dependency; never store upload credentials in a task record. */
export type MediaUploader = (input: MediaUpload) => Promise<string>;

export type CosMediaStorageConfig = {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  sessionToken?: string;
  keyPrefix?: string;
  publicBaseUrl?: string;
};

export function cosMediaStorageConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): CosMediaStorageConfig {
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Sixi media storage requires ${name}`);
    return value;
  };
  return {
    secretId: required('SIXI_MEDIA_COS_SECRET_ID'),
    secretKey: required('SIXI_MEDIA_COS_SECRET_KEY'),
    bucket: required('SIXI_MEDIA_COS_BUCKET'),
    region: required('SIXI_MEDIA_COS_REGION'),
    sessionToken: env.SIXI_MEDIA_COS_SESSION_TOKEN?.trim() || undefined,
    keyPrefix: env.SIXI_MEDIA_COS_KEY_PREFIX?.trim() || undefined,
    publicBaseUrl: env.SIXI_MEDIA_COS_PUBLIC_BASE_URL?.trim() || undefined,
  };
}

export function createCosMediaUploader(config: CosMediaStorageConfig): MediaUploader {
  for (const key of ['secretId', 'secretKey', 'bucket', 'region'] as const) {
    if (!config[key]?.trim()) throw new Error(`Sixi COS media storage requires ${key}`);
  }
  const prefix = (config.keyPrefix ?? 'sixi/generated').replace(/^\/+|\/+$/g, '');
  if (prefix.split('/').some(part => part === '.' || part === '..') || /[?#\\]/.test(prefix)) {
    throw new Error('Invalid Sixi COS media key prefix');
  }
  const base = new URL(config.publicBaseUrl ?? `https://${config.bucket}.cos.${config.region}.myqcloud.com`);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
    throw new Error('Sixi COS public base URL must be an HTTPS URL without credentials, query or fragment');
  }
  const publicBase = base.href.replace(/\/+$/, '');
  const cos = new COS({
    SecretId: config.secretId,
    SecretKey: config.secretKey,
    ...(config.sessionToken ? { SecurityToken: config.sessionToken } : {}),
  });
  return async ({ bytes, mediaType, signal }) => {
    signal?.throwIfAborted();
    validateMediaType(mediaType);
    if (!bytes.byteLength) throw new Error('Generated media is empty');
    const hash = createHash('sha256').update(mediaType).update('\0').update(bytes).digest('hex');
    const key = [prefix, `${hash}.${extensionFor(mediaType)}`].filter(Boolean).join('/');
    await cos.putObject({
      Bucket: config.bucket,
      Region: config.region,
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: mediaType,
      ContentLength: bytes.byteLength,
      ACL: 'public-read',
    });
    signal?.throwIfAborted();
    return `${publicBase}/${key.split('/').map(encodeURIComponent).join('/')}`;
  };
}

function validateMediaType(value: string): void {
  if (!/^(image|video)\/[a-z0-9.+-]+$/.test(value)) {
    throw new Error('Generated media requires an image/video media type');
  }
}

function extensionFor(mediaType: string): string {
  if (mediaType === 'image/jpeg') return 'jpg';
  if (mediaType === 'image/svg+xml') return 'svg';
  if (mediaType === 'video/quicktime') return 'mov';
  return mediaType.split('/')[1]!.replace(/[^a-z0-9]/g, '') || 'bin';
}
