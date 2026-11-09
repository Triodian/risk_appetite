// The engagement's status for the practice hub (development plan task 4.1), read from this app's own database.
// src/status-service.js wraps it in the StatusService entrypoint; kept apart so the tests can load it in Node.
import { d1Store } from '../lib/store/d1.js';
import { engagementStatus } from '../lib/core/status.js';

/** A deployment nobody has opened yet has no tables: the apps create them on first use. That is "not started". */
const unopened = err => { if (/no such table/i.test(String((err && err.message) || err))) return null; throw err; };

/** triodian.status.v1 for this deployment's engagement. Throws when the database is not connected, so the hub shows
 *  the app as unreachable rather than as an engagement not started. */
export async function statusForService(env, now = new Date()) {
  if (!env.DB) throw new Error('The database is not connected to the Risk Appetite app.');
  const e = await d1Store(env.DB).getEngagement().catch(unopened);
  return engagementStatus(e, { today: now.toISOString().slice(0, 10), now: now.toISOString() });
}
