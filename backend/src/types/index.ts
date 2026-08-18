export type FileStatus = "pending" | "uploading" | "available" | "failed" | "interrupted";

export type ShareRole = "owner" | "viewer" | "editor" | "collaborator";

export type Permission = "read" | "write" | "modify" | "download";

export interface JwtPayload {
  id: string;
  email: string;
}

export interface CompletedPart {
  partNumber: number;
  etag: string;
  size: number;
}

export interface AccessPolicy {
  role: ShareRole;
  permissions: Permission[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      fileDoc?: {
        _id: string;
        owner: string;
        originalName: string;
        key: string;
        uploadId: string;
        size: number;
        mimeType: string;
        chunkSize: number;
        partCount: number;
        status: FileStatus;
        parts: CompletedPart[];
      };
      accessPolicy?: AccessPolicy;
    }
  }
}

export {};
