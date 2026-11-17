"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isClassroomPhrase, type ClassroomPhrase } from "@/lib/signbridge/classroom";

export type ChannelStatus = "connecting" | "live" | "reconnecting" | "unavailable";

const SUBPROTOCOL = "json.webpubsub.azure.v1";
const MAX_BACKOFF_MS = 10_000;

interface PubSubMessage {
  type?: string;
  from?: string;
  group?: string;
  data?: unknown;
}

/**
 * A classroom room over Azure Web PubSub (JSON subprotocol, plain WebSocket).
 * Teachers can `send`; everyone in the room receives via `onPhrase`. Reconnects with backoff,
 * fetching a fresh token each time.
 */
export function useClassroomChannel(code: string, role: "teacher" | "learner", onPhrase?: (p: ClassroomPhrase) => void) {
  const [status, setStatus] = useState<ChannelStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const groupRef = useRef<string | null>(null);
  const ackId = useRef(1);
  const onPhraseRef = useRef(onPhrase);
  useEffect(() => {
    onPhraseRef.current = onPhrase;
  }, [onPhrase]);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      try {
        const res = await fetch(`/api/classroom?code=${encodeURIComponent(code)}&role=${role}`, { cache: "no-store" });
        if (res.status === 503) {
          setStatus("unavailable");
          setError("Classroom mode is not configured on the server.");
          return;
        }
        if (!res.ok) throw new Error(`token ${res.status}`);
        const { url, group } = (await res.json()) as { url: string; group: string };
        if (cancelled) return;
        groupRef.current = group;

        const ws = new WebSocket(url, SUBPROTOCOL);
        wsRef.current = ws;
        ws.onopen = () => {
          attempt = 0;
          setStatus("live");
          setError(null);
        };
        ws.onmessage = (event) => {
          let msg: PubSubMessage;
          try {
            msg = JSON.parse(String(event.data)) as PubSubMessage;
          } catch {
            return;
          }
          if (msg.type === "message" && msg.from === "group" && isClassroomPhrase(msg.data)) onPhraseRef.current?.(msg.data);
        };
        ws.onclose = () => {
          if (wsRef.current === ws) wsRef.current = null;
          if (!cancelled) scheduleRetry();
        };
      } catch {
        if (!cancelled) scheduleRetry();
      }
    };

    const scheduleRetry = () => {
      setStatus("reconnecting");
      const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt++);
      retryTimer = setTimeout(() => void connect(), delay);
    };

    void connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [code, role]);

  /** Broadcast a phrase to the room (teacher only). Returns false if not connected. */
  const send = useCallback((phrase: ClassroomPhrase): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !groupRef.current) return false;
    ws.send(JSON.stringify({ type: "sendToGroup", group: groupRef.current, dataType: "json", data: phrase, noEcho: true, ackId: ackId.current++ }));
    return true;
  }, []);

  return { status, error, send };
}
