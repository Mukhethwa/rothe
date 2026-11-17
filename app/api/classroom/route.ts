/**
 * Classroom broadcast over Azure Web PubSub. A classroom code is a Web PubSub group,
 * so no database is needed.
 *
 *   POST /api/classroom                          -> { code }            new classroom code
 *   GET  /api/classroom?code=K7M2Q&role=teacher  -> { url, group }      WebSocket URL for that room
 *
 * Teachers may send to their room; learners may only listen.
 */
import { randomInt } from "node:crypto";
import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { CODE_ALPHABET, CODE_LENGTH, isValidCode, normaliseCode } from "@/lib/signbridge/classroom";

const HUB = "classroom";
const TOKEN_MINUTES = 120;

let service: WebPubSubServiceClient | null | undefined;
function getService(): WebPubSubServiceClient | null {
  if (service === undefined) {
    const cs = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
    service = cs ? new WebPubSubServiceClient(cs, HUB) : null;
  }
  return service;
}

const groupFor = (code: string) => `room-${code}`;

export async function POST(): Promise<Response> {
  if (!getService()) return Response.json({ error: "Classroom mode not configured" }, { status: 503 });
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return Response.json({ code }, { headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request): Promise<Response> {
  const client = getService();
  if (!client) return Response.json({ error: "Classroom mode not configured" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const code = normaliseCode(params.get("code") ?? "");
  const role = params.get("role");
  if (!isValidCode(code) || (role !== "teacher" && role !== "learner")) {
    return Response.json({ error: "Expected ?code=<5-letter code>&role=teacher|learner" }, { status: 400 });
  }

  const group = groupFor(code);
  const roles = role === "teacher" ? [`webpubsub.joinLeaveGroup.${group}`, `webpubsub.sendToGroup.${group}`] : [];
  try {
    const { url } = await client.getClientAccessToken({ roles, groups: [group], expirationTimeInMinutes: TOKEN_MINUTES });
    return Response.json({ url, group }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("Web PubSub token error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Could not open the classroom" }, { status: 502 });
  }
}
