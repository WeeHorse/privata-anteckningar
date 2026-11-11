import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Injicera ett simulerat SDK enbart i testet; produktionskoden är oförändrad.
const source = await readFile(new URL('../api/notes.js', import.meta.url), 'utf8');
const testSource = source.replace(
  "import { createClient } from '@supabase/supabase-js';",
  'const createClient = (...args) => globalThis.__notesTestClient(...args);'
);
const { default: handler } = await import(
  'data:text/javascript;base64,' + Buffer.from(testSource).toString('base64')
);
process.env.SUPABASE_URL = 'https://demo.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'public-demo';
const good = { iss: 'https://demo.supabase.co/auth/v1', aud: 'authenticated',
  sub: 'user-a', role: 'authenticated', exp: Date.now() / 1000 + 3600, aal: 'aal1' };
let claims, validationError, inserted, deletedRows;
globalThis.__notesTestClient = () => ({
  auth: { getClaims: async () => ({ data: { claims }, error: validationError }) },
  from: () => ({
    select: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }),
    insert: (row) => { inserted = row; return { select: () => ({
      single: async () => ({ data: row, error: null })
    }) }; },
    delete: () => ({ eq: () => ({ select: async () => ({ data: deletedRows, error: null }) }) })
  })
});
async function call({ method = 'GET', body, authorization = 'Bearer demo', patch = {}, invalid = false } = {}) {
  claims = { ...good, ...patch };
  validationError = invalid ? { message: 'invalid signature' } : null;
  const res = {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(s) { this.code = s; return this; },
    json(b) { this.body = b; return this; }
  };
  await handler({ method, body, headers: { authorization } }, res);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  return res;
}
test('API-kontroller med simulerat SDK (inte integrationstest)', async (t) => {
  for (const [name, options] of [
    ['token saknas', { authorization: '' }],
    ['fel utgivare', { patch: { iss: 'https://other.supabase.co/auth/v1' } }],
    ['fel mottagare', { patch: { aud: 'wrong' } }],
    ['utgången token', { patch: { exp: 1 } }],
    ['fel roll', { patch: { role: 'service_role' } }],
    ['användare saknas', { patch: { sub: '' } }],
    ['SDK underkänner signatur', { invalid: true }]
  ]) {
    await t.test(name, async () => assert.equal((await call(options)).code, 401));
  }
  await t.test('giltig identitet kan läsa', async () => assert.equal((await call()).code, 200));
  await t.test('ägaren kommer från verifierad identitet', async () => {
    const res = await call({ method: 'POST', body: { body: ' Hej ', owner_id: 'user-b' } });
    assert.equal(res.code, 201);
    assert.deepEqual(inserted, { body: 'Hej', owner_id: 'user-a' });
  });
  await t.test('tom text avvisas', async () => {
    assert.equal((await call({ method: 'POST', body: { body: ' ' } })).code, 400);
  });
  await t.test('radering kräver MFA', async () => {
    assert.equal((await call({ method: 'DELETE', body: { id: '11111111-1111-1111-1111-111111111111' } })).code, 403);
  });
  await t.test('radering validerar ID', async () => {
    assert.equal((await call({ method: 'DELETE', patch: { aal: 'aal2' }, body: { id: 'bad' } })).code, 400);
  });
  await t.test('tomt RLS-resultat avslöjar inte en annan ägare', async () => {
    deletedRows = [];
    assert.equal((await call({ method: 'DELETE', patch: { aal: 'aal2' },
      body: { id: '11111111-1111-1111-1111-111111111111' } })).code, 404);
  });
  await t.test('tillåten radering ger framgång', async () => {
    deletedRows = [{ id: '11111111-1111-1111-1111-111111111111' }];
    assert.equal((await call({ method: 'DELETE', patch: { aal: 'aal2' },
      body: { id: deletedRows[0].id } })).code, 200);
  });
});
