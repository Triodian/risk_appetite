// Several roles per person and the GC role (development plan task 0.6).
import { test, expect } from '@playwright/test';
import { pageAs, api, ADMIN } from '../helpers.js';

test('the administrator gives one person two roles, and the GC role shows in the permissions', async ({ browser }) => {
  const email = 'gc-cro-' + Date.now() + '@ra.test';
  const p = await pageAs(browser, ADMIN, '/admin/#users');
  await expect(p.locator('.perm thead')).toContainText('General counsel (client)');
  await p.click('[data-act="admAdd"]');
  await p.fill('#f-email', email); await p.fill('#f-name', 'Gina Two-Roles');
  await p.locator('input[name="f-roles"][value="gc"]').check();
  await p.locator('input[name="f-roles"][value="cro"]').check();
  await p.click('#userForm button[type="submit"]');
  const row = p.locator('tr', { hasText: email });
  await expect(row).toContainText('General counsel (client)');
  await expect(row).toContainText('CRO');
  const u = (await api('GET', '/api/admin/users')).body.users.find(x => x.email === email);
  expect(u.roles).toEqual(['gc', 'cro']);
  // editing keeps both, and unticking one removes it
  await row.locator('[data-act="admEdit"]').click();
  await expect(p.locator('input[name="f-roles"][value="gc"]')).toBeChecked();
  await p.locator('input[name="f-roles"][value="cro"]').uncheck();
  await p.click('#userForm button[type="submit"]');
  await expect(p.locator('tr', { hasText: email })).not.toContainText('CRO');
  expect((await api('GET', '/api/admin/users')).body.users.find(x => x.email === email).roles).toEqual(['gc']);
  // the person signs in and the app says which roles they hold
  const me = (await api('GET', '/api/me', undefined, email)).body.user;
  expect(me.roles).toEqual(['gc']);
  expect(p._errors).toEqual([]);
  await p.context().close();
});
