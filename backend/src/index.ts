import cluster from "cluster";
import http from "http";
import os from "os";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { Server } from "socket.io";
import { env } from "./config/env";
import { connectMongo, pingMongo } from "./config/mongo.config";
import { ensureBucket, pingStorage } from "./config/minio.config";
import { bumpSockets } from "./controllers/metrics";
import { appEvents, EventNames, emitAppEvent, type AppEvent } from "./events/eventEmitter";
import { authOptional } from "./middleware/auth.middleware";
import fileRoutes from "./routes/files.routes";
import shareRoutes from "./routes/shares.routes";
import statusRoutes from "./routes/status.routes";

const HEALTH_MS = 5000;

function workerCount(): number {
  const cpus = os.cpus().length;
  return Math.min(env.clusterWorkers, Math.max(1, Math.min(4, cpus || 1)));
}

async function startWorker(): Promise<void> {
  await connectMongo();
  await ensureBucket();

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(authOptional);

  app.get("/health", async (_req, res) => {
    const [postgres, storage] = await Promise.all([pingMongo(), pingStorage()]);
    const ok = postgres && storage;
    res.status(ok ? 200 : 503).json({ ok, pid: process.pid, postgres, storage });
  });

  app.use("/api/files", fileRoutes);
  app.use("/api/shares", shareRoutes);
  app.use("/api/status", statusRoutes);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.join("status");
    void bumpSockets(1);
    socket.on("disconnect", () => {
      void bumpSockets(-1);
    });
  });

  const broadcast = (event: AppEvent) => {
    io.to("status").emit("event", event);
  };

  appEvents.on("*", broadcast);

  setInterval(async () => {
    const [postgres, storage] = await Promise.all([pingMongo(), pingStorage()]);
    if (!postgres || !storage) {
      await emitAppEvent(null, EventNames.ServerFailureDetected, {
        pid: process.pid,
        postgres,
        storage,
      });
    }
  }, HEALTH_MS);

  server.listen(env.port, () => {
    console.log(`worker ${process.pid} listening on :${env.port}`);
  });
}

function startPrimary(): void {
  cluster.setupPrimary({
    execArgv: process.execArgv.filter((a) => !a.includes("watch")),
  });
  const n = workerCount();
  console.log(`primary ${process.pid} forking ${n} workers`);
  for (let i = 0; i < n; i += 1) cluster.fork();

  cluster.on("exit", (worker, code, signal) => {
    console.error(`worker ${worker.process.pid} died (${signal || code}) — restarting`);
    cluster.fork();
  });
}

if (cluster.isPrimary && env.clusterWorkers > 1) {
  startPrimary();
} else {
  startWorker().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
