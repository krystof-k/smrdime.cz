import { DurableObject } from "cloudflare:workers";
import { TRAM_POLL_INTERVAL_MS } from "../lib/constants.ts";
import { snapshotsEqual } from "../lib/snapshot-equal.ts";
import { analyzeTramACStatus, type TramAnalysisResult } from "../lib/tram-analysis.ts";

type StoredSnapshot = Omit<TramAnalysisResult, "lastUpdated"> & { lastUpdated: string };

const SNAPSHOT_KEY = "snapshot";

function serialize(result: TramAnalysisResult): StoredSnapshot {
  return { ...result, lastUpdated: result.lastUpdated.toISOString() };
}

function deserialize(stored: StoredSnapshot): TramAnalysisResult {
  return { ...stored, lastUpdated: new Date(stored.lastUpdated) };
}

/**
 * Single globally-named Durable Object (see `getTramHub`) that owns the
 * current tram snapshot, polls Golemio on an alarm while at least one client
 * is connected, and broadcasts over hibernatable WebSockets when the snapshot
 * actually changes. Scales to zero: alarm stops when the last socket closes,
 * the DO hibernates, and requests stop being billed.
 */
export class TramStatusHub extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/snapshot") {
      const snapshot = await this.getOrRefreshSnapshot();
      return Response.json(snapshot);
    }

    const upgrade = request.headers.get("Upgrade");
    if (upgrade !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);

    const snapshot = await this.readSnapshot();
    if (snapshot) server.send(JSON.stringify(snapshot));

    // Kick the alarm on first connect (or when stale). Fires immediately so we
    // refresh on page load after a cold start.
    const current = await this.ctx.storage.getAlarm();
    const shouldPollNow =
      !snapshot || Date.now() - snapshot.lastUpdated.getTime() >= TRAM_POLL_INTERVAL_MS;
    if (current === null || shouldPollNow) {
      await this.ctx.storage.setAlarm(Date.now());
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Only message we care about is an app-level ping; respond so clients can
    // detect dead connections. Anything else is ignored.
    if (typeof message === "string" && message === "ping") {
      ws.send("pong");
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close(1000, "closing");
    } catch {
      // Already closed, nothing to do.
    }
    if (this.ctx.getWebSockets().length === 0) {
      await this.ctx.storage.deleteAlarm();
    }
  }

  async webSocketError(_ws: WebSocket): Promise<void> {
    if (this.ctx.getWebSockets().length === 0) {
      await this.ctx.storage.deleteAlarm();
    }
  }

  async alarm(): Promise<void> {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) return;

    try {
      const fresh = await analyzeTramACStatus();
      const previous = await this.readSnapshot();
      await this.ctx.storage.put(SNAPSHOT_KEY, serialize(fresh));
      if (!snapshotsEqual(previous, fresh)) {
        const payload = JSON.stringify(fresh);
        for (const ws of sockets) {
          try {
            ws.send(payload);
          } catch {
            // Socket gone mid-broadcast; the close handler will clean up.
          }
        }
      }
    } catch (error) {
      console.error("TramStatusHub poll failed", error);
    }

    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + TRAM_POLL_INTERVAL_MS);
    }
  }

  private async readSnapshot(): Promise<TramAnalysisResult | null> {
    const stored = await this.ctx.storage.get<StoredSnapshot>(SNAPSHOT_KEY);
    return stored ? deserialize(stored) : null;
  }

  private async getOrRefreshSnapshot(): Promise<TramAnalysisResult> {
    const existing = await this.readSnapshot();
    if (existing && Date.now() - existing.lastUpdated.getTime() < TRAM_POLL_INTERVAL_MS) {
      return existing;
    }
    const fresh = await analyzeTramACStatus();
    await this.ctx.storage.put(SNAPSHOT_KEY, serialize(fresh));
    return fresh;
  }
}
