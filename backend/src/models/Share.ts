import { db } from "../config/mongo.config";
import type { ShareRole } from "../types";

export interface ShareDoc {
  _id: string;
  file: string;
  user: string;
  role: ShareRole;
  save(): Promise<void>;
  deleteOne(): Promise<void>;
}

function hydrate(row: Record<string, unknown>, email?: string): ShareDoc & { user: string | { email: string } } {
  const doc: ShareDoc & { user: string | { email: string } } = {
    _id: String(row.id),
    file: String(row.file_id),
    user: email ? { email } : String(row.user_id),
    role: row.role as ShareRole,
    async save() {
      await db.query(`update shares set role=$2 where id=$1`, [doc._id, doc.role]);
    },
    async deleteOne() {
      await db.query(`delete from shares where id=$1`, [doc._id]);
    },
  };
  return doc;
}

export const Share = {
  async create(doc: { file: string; user: string; role: ShareRole }): Promise<ShareDoc> {
    const r = await db.query(
      `insert into shares (file_id, user_id, role) values ($1,$2,$3) returning *`,
      [doc.file, doc.user, doc.role],
    );
    return hydrate(r.rows[0]);
  },

  async find(filter: { user?: string; file?: string }): Promise<ShareDoc[]> {
    if (filter.user) {
      const r = await db.query(`select * from shares where user_id=$1`, [filter.user]);
      return r.rows.map((row) => hydrate(row));
    }
    if (filter.file) {
      const r = await db.query(
        `select s.*, u.email from shares s join users u on u.id = s.user_id where s.file_id=$1`,
        [filter.file],
      );
      return r.rows.map((row) => hydrate(row, row.email as string));
    }
    return [];
  },

  async findOne(filter: { file: string; user: string; role?: ShareRole }): Promise<ShareDoc | null> {
    const r = filter.role
      ? await db.query(`select * from shares where file_id=$1 and user_id=$2 and role=$3`, [
          filter.file,
          filter.user,
          filter.role,
        ])
      : await db.query(`select * from shares where file_id=$1 and user_id=$2`, [filter.file, filter.user]);
    return r.rows[0] ? hydrate(r.rows[0]) : null;
  },

  async findById(id: string): Promise<ShareDoc | null> {
    const r = await db.query(`select * from shares where id=$1`, [id]);
    return r.rows[0] ? hydrate(r.rows[0]) : null;
  },

  async findOneAndUpdate(
    filter: { file: string; user: string },
    update: { role: ShareRole },
    _opts: { new: boolean; upsert: boolean },
  ): Promise<ShareDoc> {
    const r = await db.query(
      `insert into shares (file_id, user_id, role) values ($1,$2,$3)
       on conflict (file_id, user_id) do update set role=excluded.role
       returning *`,
      [filter.file, filter.user, update.role],
    );
    return hydrate(r.rows[0]);
  },
};
