// Worker entry: the app (src/worker.js) and the service the other Triodian apps bind to (src/service.js).
// Kept apart so the unit tests can load src/worker.js without the Cloudflare runtime.
export { default } from './worker.js';
export { AppetiteService } from './service.js';
