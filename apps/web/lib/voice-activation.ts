export function voiceConfig(env: Record<string, string | undefined> = process.env) {
  const { LIVEKIT_URL: url, LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret, LIVEKIT_AGENT_NAME: agent, KITCHEN_VOICE_DISCLOSURE: disclosure, KITCHEN_VOICE_ACCESS_SHA256: digest } = env;
  if (env.NODE_ENV !== 'production' || env.VERCEL !== '1' || !env.VERCEL_URL || env.KITCHEN_VOICE_ENABLED !== 'true' || !url || !/^wss:\/\/[a-z0-9-]+\.livekit\.cloud\/?$/.test(url) || !key || !secret || !agent || !disclosure?.trim() || !digest || !/^[a-f0-9]{64}$/.test(digest)) return null;
  return { url, key, secret, agent, disclosure, digest };
}
