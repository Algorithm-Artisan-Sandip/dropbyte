import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clusterWorkers: Math.min(4, Math.max(1, Number(process.env.CLUSTER_WORKERS ?? 1))),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  cookieName: process.env.COOKIE_NAME ?? "dropbyte_token",
  corsOrigins,
  corsOrigin: corsOrigins[0],
  minio: {
    endpoint: required("STORAGE_ENDPOINT"),
    region: process.env.STORAGE_REGION ?? "us-east-1",
    accessKey: required("STORAGE_ACCESS_KEY"),
    secretKey: required("STORAGE_SECRET_KEY"),
    bucket: required("STORAGE_BUCKET"),
  },
};
