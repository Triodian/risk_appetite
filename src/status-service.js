// The status entrypoint the practice hub binds to (development plan task 4.1; Triodian/practice-hub):
//   "services": [{ "binding": "S_<CLIENT>_RISK_APPETITE", "service": "risk-appetite-<client>", "entrypoint": "StatusService" }]
// One read-only method. It returns stage, counts, roles and dates only (lib/core/status.js).
import { WorkerEntrypoint } from 'cloudflare:workers';
import { statusForService } from './status.js';

export class StatusService extends WorkerEntrypoint {
  /** triodian.status.v1: where the engagement stands and who it waits on, by role. */
  async status() { return statusForService(this.env); }
}
