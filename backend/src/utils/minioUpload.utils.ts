import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";
import { minio } from "../config/minio.config";
import type { CompletedPart } from "../types";

const bucket = env.minio.bucket;

export async function startMultipart(key: string, contentType: string): Promise<string> {
  const out = await minio.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
  );
  if (!out.UploadId) throw new Error("MinIO CreateMultipartUpload failed");
  return out.UploadId;
}

export async function presignPart(key: string, uploadId: string, partNumber: number): Promise<string> {
  return getSignedUrl(
    minio,
    new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: 3600 },
  );
}

export async function completeMultipart(
  key: string,
  uploadId: string,
  parts: CompletedPart[],
): Promise<void> {
  await minio.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: [...parts]
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => ({ ETag: p.etag, PartNumber: p.partNumber })),
      },
    }),
  );
}

export async function abortMultipart(key: string, uploadId: string): Promise<void> {
  await minio.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    }),
  );
}

export async function presignDownload(key: string, filename: string): Promise<string> {
  return getSignedUrl(
    minio,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
    { expiresIn: 300 },
  );
}
