import { db } from "../config/mongo.config";

export const AccessLog = {
  async create(doc: { file: string; user: string; action: string; allowed: boolean }): Promise<void> {
    await db.query(
      `insert into access_logs (file_id, user_id, action, allowed) values ($1,$2,$3,$4)`,
      [doc.file, doc.user, doc.action, doc.allowed],
    );
  },
};
