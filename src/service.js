// The AI Risk Appetite app's service for the other Triodian apps (development plan task 1B.4).
// The AI Use Assessment app binds to this entrypoint with a Cloudflare service binding:
//   "services": [{ "binding": "APPETITE", "service": "risk-appetite", "entrypoint": "AppetiteService" }]
// A binding reaches the Worker directly inside the Cloudflare account. It has no public URL and needs no secret, so it
// replaces the Access service token. It offers one thing only: the issued calibration set.
import { WorkerEntrypoint } from 'cloudflare:workers';
import { calibrationForService } from './worker.js';

export class AppetiteService extends WorkerEntrypoint {
  /** The issued calibration set: { status, body }, as GET /api/calibration-set answers it. */
  async calibrationSet() { return calibrationForService(this.env); }
}
