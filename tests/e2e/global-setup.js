// One user per role in a fresh local database.
import { api, U, ROLE } from './helpers.js';

export default async function () {
  for (const [k, email] of Object.entries(U)) {
    const r = await api('POST', '/api/admin/users', { email, name: k + ' (test)', organisation: 'Test', role: ROLE[k], isAdmin: false, active: true });
    if (r.status !== 201 && r.status !== 409) throw new Error(`Could not create ${email}: ${r.status} ${JSON.stringify(r.body)}`);
  }
}
