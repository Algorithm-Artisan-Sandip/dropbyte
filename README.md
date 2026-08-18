# Dropbyte — Supabase + Render + Vercel

No Mongo/Valkey/MinIO installs. Node is only for local `npm run dev`.

## Hosting

| Piece | Where |
|---|---|
| Postgres + file storage | Supabase |
| API + Socket.io | Render (always-on Node) |
| UI | Vercel |

Vercel cannot run this API (Socket.io needs a long-lived server).

## What to create / copy (paste into chat or `.env`)

**Supabase** (Project Settings)

1. `DATABASE_URL` — Database → URI (include password)
2. `STORAGE_ENDPOINT` — `https://<project-ref>.storage.supabase.co/storage/v1/s3`
3. `STORAGE_REGION` — project region, often `us-east-1`
4. `STORAGE_ACCESS_KEY` + `STORAGE_SECRET_KEY` — Storage → S3 access keys
5. `STORAGE_BUCKET` — create bucket named `dropbyte`
6. Storage CORS: origins `http://localhost:5173` and later `https://<your-app>.vercel.app`; methods GET, PUT, POST, HEAD; expose header `ETag`

**You invent**

7. `JWT_SECRET` — any long random string

**After first Render deploy** (you send me these URLs)

8. Render API URL — `https://<service>.onrender.com`
9. Vercel UI URL — `https://<app>.vercel.app`

Then set on **Render**: `CORS_ORIGIN=http://localhost:5173,https://<app>.vercel.app`  
On **Vercel**: `VITE_API_URL=https://<service>.onrender.com`

## Local

Fill `.env` from `.env.example`, then:

```bat
npm install
npm run dev
```

- UI http://localhost:5173
- API http://localhost:4000/health

## Render

New Web Service from this Git repo. `render.yaml` is in the repo. Add the Supabase + JWT env vars in the Render dashboard. Free tier sleeps after idle.

## Vercel

Import the same repo. Root stays project root (`vercel.json` builds the frontend). Add `VITE_API_URL` to the Render URL **before** the production build.
