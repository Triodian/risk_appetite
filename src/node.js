// Node entry point for the AI Risk Appetite app (development plan ID.3): the same handler as the Cloudflare Worker,
// run by node:http with SQLite (lib/platform/node.js). Run: node src/node.js  (PORT, DATA_DIR, SITE_URL and the
// Worker's variables from the environment). Links to the other apps are HTTPS with LINK_SECRET (lib/platform/links.js).
import worker from './worker.js';
import { nodeEnv, serve, daily } from '../lib/platform/node.js';

const env = await nodeEnv(process.env, { appId: 'risk-appetite', publicDir: new URL('../public', import.meta.url).pathname });
const server = await serve(worker, env);
daily(worker, env);
const a = server.address();
console.log(`AI Risk Appetite listening on http://${a.address}:${a.port} (data in ${env.DATA_DIR || '.data'})`);
