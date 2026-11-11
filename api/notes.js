import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const reply = (status, body) => res.status(status).json(body);

  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return reply(405, { error: 'Metoden stöds inte.' });
  }

  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return reply(500, { error: 'Serverkonfiguration saknas.' });

  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
  if (!match) return reply(401, { error: 'Bearer-token saknas.' });
  const token = match[1];

  try {
    // Ny klient per anrop: ingen användarsession delas mellan besökare.
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false,
        detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // SDK verifierar signatur och tid, med JWKS eller Auth-servern
    // beroende på projektets signeringsnyckel. Ingen egen JWT-avkodning.
    const { data, error } = await db.auth.getClaims(token);
    const claims = data?.claims;
    const validAudience = claims?.aud === 'authenticated' ||
      (Array.isArray(claims?.aud) && claims.aud.includes('authenticated'));

    if (error || !claims || claims.iss !== `${url}/auth/v1` ||
        !validAudience || claims.role !== 'authenticated' ||
        typeof claims.sub !== 'string' || !claims.sub ||
        typeof claims.exp !== 'number' || claims.exp <= Date.now() / 1000) {
      return reply(401, { error: 'Ogiltig eller utgången token.' });
    }

    if (req.method === 'GET') {
      // RLS begränsar resultatet till användarens egna rader.
      const result = await db.from('notes')
        .select('id, body, created_at').order('created_at', { ascending: false })
        .limit(50);
      if (result.error) return reply(500, { error: 'Kunde inte läsa.' });
      return reply(200, result.data);
    }

    if (req.method === 'POST') {
      const body = req.body?.body;
      if (typeof body !== 'string' || !body.trim() || body.length > 500) {
        return reply(400, { error: 'Texten måste vara 1–500 tecken.' });
      }
      // Ägaren hämtas från verifierad identitet, aldrig från formuläret.
      const result = await db.from('notes')
        .insert({ owner_id: claims.sub, body: body.trim() })
        .select('id, body, created_at').single();
      if (result.error) return reply(500, { error: 'Kunde inte skapa.' });
      return reply(201, result.data);
    }

    // Ett känsligare kommando kräver verifierad andra faktor.
    if (claims.aal !== 'aal2') {
      return reply(403, { error: 'Verifiera MFA före radering.' });
    }
    const id = req.body?.id;
    if (typeof id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return reply(400, { error: 'Ogiltigt antecknings-ID.' });
    }
    const result = await db.from('notes').delete().eq('id', id).select('id');
    if (result.error) return reply(500, { error: 'Kunde inte radera.' });
    // Avslöja inte om ett annat konto äger ett visst ID.
    if (!result.data.length) return reply(404, { error: 'Anteckningen hittades inte.' });
    return reply(200, { deleted: id });
  } catch {
    // Logga inte token, lösenord, TOTP-hemligheter eller hela requesten.
    return reply(503, { error: 'Tjänsten kunde inte behandla anropet.' });
  }
}
