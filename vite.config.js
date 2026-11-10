import { mkdirSync, writeFileSync } from 'node:fs';

// TEMPORARY (removed before commit): lets the dev page hand a rendered poster to the file system.
const capture = {
  name: 'capture',
  configureServer(server) {
    server.middlewares.use('/__capture', (req, res) => {
      const name = new URL(req.url, 'http://x').searchParams.get('name').replace(/[^a-z0-9.-]/gi, '');
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => { mkdirSync('public', { recursive: true }); writeFileSync(`public/${name}`, Buffer.concat(chunks)); res.end(String(Buffer.concat(chunks).length)); });
    });
  },
};

export default { build: { chunkSizeWarningLimit: 1200 }, plugins: [capture] };
