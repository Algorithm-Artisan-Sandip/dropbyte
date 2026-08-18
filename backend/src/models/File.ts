import { db } from "../config/mongo.config";
import type { CompletedPart, FileStatus } from "../types";

export interface FileDoc {
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
  progress: number;
  createdAt?: Date;
  updatedAt?: Date;
  save(): Promise<void>;
}

function hydrate(row: Record<string, unknown>): FileDoc {
  const doc: FileDoc = {
    _id: String(row.id),
    owner: String(row.owner),
    originalName: String(row.original_name),
    key: String(row.key),
    uploadId: String(row.upload_id),
    size: Number(row.size),
    mimeType: String(row.mime_type),
    chunkSize: Number(row.chunk_size),
    partCount: Number(row.part_count),
    status: row.status as FileStatus,
    parts: (row.parts as CompletedPart[]) ?? [],
    progress: Number(row.progress),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    async save() {
      await db.query(
        `update files set status=$2, parts=$3::jsonb, progress=$4, upload_id=$5, updated_at=now() where id=$1`,
        [doc._id, doc.status, JSON.stringify(doc.parts), doc.progress, doc.uploadId],
      );
    },
  };
  return doc;
}

export const FileModel = {
  async findById(id: string): Promise<FileDoc | null> {
    const r = await db.query(`select * from files where id=$1`, [id]);
    return r.rows[0] ? hydrate(r.rows[0]) : null;
  },

  async find(filter: { _id: { $in: string[] } }): Promise<FileDoc[]> {
    const ids = filter._id.$in;
    if (!ids.length) return [];
    const r = await db.query(`select * from files where id = any($1::uuid[]) order by updated_at desc`, [ids]);
    return r.rows.map(hydrate);
  },

  async create(doc: {
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
    progress: number;
  }): Promise<FileDoc> {
    const r = await db.query(
      `insert into files (owner, original_name, key, upload_id, size, mime_type, chunk_size, part_count, status, parts, progress)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
       returning *`,
      [
        doc.owner,
        doc.originalName,
        doc.key,
        doc.uploadId,
        doc.size,
        doc.mimeType,
        doc.chunkSize,
        doc.partCount,
        doc.status,
        JSON.stringify(doc.parts),
        doc.progress,
      ],
    );
    return hydrate(r.rows[0]);
  },
};
