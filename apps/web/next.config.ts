import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@repo/engine'],
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
      { key: 'Permissions-Policy', value: `camera=(), microphone=${process.env.KITCHEN_VOICE_ENABLED === 'true' ? '(self)' : '()'}, geolocation=()` },
    ] }];
  },
};

export default config;
