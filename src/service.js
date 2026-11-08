// The AI Risk Appetite app's service for the other Triodian apps (development plan task 1B.4).
// The AI Use Assessment app binds to this entrypoint with a Cloudflare service binding:
//   "services": [{ "binding": "APPETITE", "service": "risk-appetite", "entrypoint": "AppetiteService" }]
// A binding reaches the Worker directly inside the Cloudflare account. It has no public URL and needs no secret, so it
// replaces the Access service token. It offers two things only: the issued calibration set (to AI Use Assessment) and the board view (to AI Board Direction).
import { WorkerEntrypoint } from 'cloudflare:workers';
import { calibrationForService, boardViewForService } from './worker.js';

export class AppetiteService extends WorkerEntrypoint {
  /** The issued calibration set: { status, body }, as GET /api/calibration-set answers it. */
  async calibrationSet() { return calibrationForService(this.env); }
  /** The board view, for the AI Board Direction app (task 3.6): { status, body }, as GET /api/board-view answers it. */
  async boardView() { return boardViewForService(this.env); }
}
