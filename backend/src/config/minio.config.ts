import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "./env";

export const minio = new S3Client({
  region: env.minio.region,
  endpoint: env.minio.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.minio.accessKey,
    secretAccessKey: env.minio.secretKey,
  },
});

export async function ensureBucket(): Promise<void> {
  try {
    await minio.send(new HeadBucketCommand({ Bucket: env.minio.bucket }));
  } catch {
    await minio.send(new CreateBucketCommand({ Bucket: env.minio.bucket }));
  }
  try {
    await minio.send(
      new PutBucketCorsCommand({
        Bucket: env.minio.bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: env.corsOrigins,
              AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
              AllowedHeaders: ["*"],
              ExposeHeaders: ["ETag", "etag"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );
  } catch {
    /* set CORS in Supabase Storage dashboard if this fails */
  }
}

export async function pingStorage(): Promise<boolean> {
  try {
    await minio.send(new HeadBucketCommand({ Bucket: env.minio.bucket }));
    return true;
  } catch {
    return false;
  }
}
