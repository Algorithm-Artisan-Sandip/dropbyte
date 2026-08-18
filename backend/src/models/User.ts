import { db } from "../config/mongo.config";

export interface UserRow {
  _id: string;
  email: string;
  passwordHash: string;
}

export const User = {
  async findOne(filter: { email: string }): Promise<UserRow | null> {
    const r = await db.query(`select id, email, password_hash from users where email=$1`, [filter.email]);
    const row = r.rows[0];
    if (!row) return null;
    return { _id: row.id, email: row.email, passwordHash: row.password_hash };
  },

  async create(doc: { email: string; passwordHash: string }): Promise<UserRow> {
    const r = await db.query(
      `insert into users (email, password_hash) values ($1,$2) returning id, email, password_hash`,
      [doc.email, doc.passwordHash],
    );
    const row = r.rows[0];
    return { _id: row.id, email: row.email, passwordHash: row.password_hash };
  },
};
