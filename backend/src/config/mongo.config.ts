import { Pool } from "pg";
import { env } from "./env";

export const db = new Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

export async function connectMongo(): Promise<void> {
  await db.query("select 1");
  await db.query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      created_at timestamptz default now()
    );
    create table if not exists files (
      id uuid primary key default gen_random_uuid(),
      owner uuid not null references users(id),
      original_name text not null,
      key text not null,
      upload_id text not null,
      size bigint not null,
      mime_type text default 'application/octet-stream',
      chunk_size int not null,
      part_count int not null,
      status text not null,
      parts jsonb not null default '[]',
      progress int not null default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create table if not exists shares (
      id uuid primary key default gen_random_uuid(),
      file_id uuid not null references files(id) on delete cascade,
      user_id uuid not null references users(id),
      role text not null,
      created_at timestamptz default now(),
      unique (file_id, user_id)
    );
    create table if not exists access_logs (
      id uuid primary key default gen_random_uuid(),
      file_id uuid not null references files(id) on delete cascade,
      user_id uuid not null references users(id),
      action text not null,
      allowed boolean not null,
      created_at timestamptz default now()
    );
  `);
}

export async function pingMongo(): Promise<boolean> {
  try {
    await db.query("select 1");
    return true;
  } catch {
    return false;
  }
}
