import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { AppEvent } from "../types";

const URL = import.meta.env.VITE_API_URL || undefined;

export function useSocket(enabled: boolean, onEvent: (event: AppEvent) => void) {
  const [connected, setConnected] = useState(false);
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    const opts = { withCredentials: true, transports: ["websocket", "polling"] as const };
    const socket: Socket = URL ? io(URL, opts) : io(opts);
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("event", (event: AppEvent) => cb.current(event));
    return () => {
      socket.disconnect();
    };
  }, [enabled]);

  return connected;
}
