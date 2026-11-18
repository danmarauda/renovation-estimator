import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { checkRateLimit } from '@vercel/firewall';
import { RoomAgentDispatch, RoomConfiguration, TrackSource } from '@livekit/protocol';
import { AccessToken } from 'livekit-server-sdk';
import { approvedContext } from '../../../../lib/voice-context';
import { voiceConfig } from '../../../../lib/voice-activation';

const reply = (status: number, data: object) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const unavailable = () => reply(503, { error: 'Live calls are unavailable.' });
const tooMany = () => reply(429, { error: 'The call limit has been reached. Try again later.' });
const maxBytes = 8192;

export async function POST(request: Request) {
  const config = voiceConfig();
  if (!config) return unavailable();
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply(403, { error: 'Start a call from the studio.' });
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return reply(415, { error: 'JSON required.' });
  try {
    const headers = new Headers({ host: process.env.VERCEL_URL!, 'x-real-ip': request.headers.get('x-real-ip') ?? '' });
    const attempt = await checkRateLimit('kitchen-voice-attempt', { headers, timeout: 1500 });
    if (attempt.error) return unavailable();
    if (attempt.rateLimited) return tooMany();
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: 'Missing design.' });
    const chunks: Uint8Array[] = []; let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); return reply(413, { error: 'Design is too large.' }); }
      chunks.push(value);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400, { error: 'Invalid design.' }); }
    if (typeof body?.access !== 'string' || !timingSafeEqual(createHash('sha256').update(body.access).digest(), Buffer.from(config.digest, 'hex'))) return reply(403, { error: 'A valid studio access code is required.' });
    const context = approvedContext(body.choices, body.step);
    if (!context || body.consent !== true || body.disclosure !== config.disclosure) return reply(400, { error: 'Review the call disclosure and current design before starting.' });
    const quota = await checkRateLimit('kitchen-voice-start', { headers, rateLimitKey: 'kitchen-pilot', timeout: 1500 });
    if (quota.error) return unavailable();
    if (quota.rateLimited) return tooMany();
    const identity = randomUUID();
    const token = new AccessToken(config.key, config.secret, { identity, ttl: '2m' });
    token.addGrant({ room: `kitchen-${randomUUID()}`, roomJoin: true, canPublish: true, canPublishSources: [TrackSource.MICROPHONE], canPublishData: true, canSubscribe: true, canUpdateOwnMetadata: false });
    token.roomConfig = new RoomConfiguration({ maxParticipants: 2, emptyTimeout: 60, departureTimeout: 10, agents: [new RoomAgentDispatch({ agentName: config.agent, metadata: JSON.stringify({ participantIdentity: identity, design: context }) })] });
    return reply(201, { server_url: config.url, participant_token: await token.toJwt() });
  } catch { return unavailable(); }
}
