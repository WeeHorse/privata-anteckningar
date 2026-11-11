import { createClient } from '@supabase/supabase-js';

const $ = (id) => document.getElementById(id);
const show = (value) => {
  // Databasinnehåll får inte tolkas som HTML.
  $('output').textContent = JSON.stringify(value, null, 2);
};
const checked = ({ data, error }) => {
  if (error) throw error;
  return data;
};
const auth = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: 'pkce', detectSessionInUrl: false,
    persistSession: true, autoRefreshToken: true } }
);
let pendingFactorId;

function on(id, action) {
  $(id).onclick = async () => {
    $(id).disabled = true;
    try { await action(); }
    catch (error) { show({ error: error.message }); }
    finally { $(id).disabled = false; }
  };
}

async function api(method = 'GET', body) {
  // Hämta den aktuella token som SDK:t hanterar. API:et verifierar den.
  const { session } = checked(await auth.auth.getSession());
  if (!session) throw new Error('Logga in först.');
  const response = await fetch('/api/notes', {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${result.error}`);
  show(result);
}

on('login', async () => {
  checked(await auth.auth.signInWithPassword({
    email: $('email').value, password: $('password').value
  }));
  $('password').value = '';
  show({ message: 'Inloggad. Prova att läsa och skapa anteckningar.' });
});
on('google', async () => {
  checked(await auth.auth.signInWithOAuth({ provider: 'google',
    options: { redirectTo: `${location.origin}/` } }));
});
on('logout', async () => {
  checked(await auth.auth.signOut({ scope: 'local' }));
  pendingFactorId = undefined;
  $('qr').hidden = true;
  $('qr').removeAttribute('src');
  show({ message: 'Den lokala sessionen är utloggad.' });
});
on('load', () => api());
on('create', () => api('POST', { body: $('body').value }));
on('remove', () => api('DELETE', { id: $('noteId').value.trim() }));

on('enroll', async () => {
  const factors = checked(await auth.auth.mfa.listFactors());
  if (factors.totp.some((factor) => factor.status === 'verified')) {
    throw new Error('TOTP är redan registrerat. Använd Verifiera MFA.');
  }
  if (pendingFactorId) throw new Error('Verifiera den pågående registreringen.');
  const factor = checked(await auth.auth.mfa.enroll({ factorType: 'totp' }));
  pendingFactorId = factor.id;
  $('qr').src = factor.totp.qr_code;
  $('qr').hidden = false;
  show({ message: 'Skanna QR-koden och verifiera en kod för att slutföra.' });
});
on('verify', async () => {
  const factors = checked(await auth.auth.mfa.listFactors());
  const factorId = pendingFactorId ?? factors.totp
    .find((factor) => factor.status === 'verified')?.id;
  if (!factorId) throw new Error('Registrera TOTP först.');
  checked(await auth.auth.mfa.challengeAndVerify({
    factorId, code: $('code').value.trim()
  }));
  pendingFactorId = undefined;
  $('code').value = '';
  $('qr').hidden = true;
  $('qr').removeAttribute('src');
  const level = checked(await auth.auth.mfa.getAuthenticatorAssuranceLevel());
  show({ currentLevel: level.currentLevel, message: 'Prova att radera nu.' });
});

// Återkomst från social login: koden byts mot Supabase-sessionen.
// PKCE-verifieraren finns i samma webbläsare som startade flödet.
const params = new URLSearchParams(location.search);
if (params.has('error_description')) {
  show({ error: params.get('error_description') });
  history.replaceState({}, '', '/');
} else if (params.has('code')) {
  try {
    checked(await auth.auth.exchangeCodeForSession(params.get('code')));
    show({ message: 'Inloggad via extern leverantör.' });
  } catch (error) { show({ error: error.message }); }
  finally { history.replaceState({}, '', '/'); }
}
