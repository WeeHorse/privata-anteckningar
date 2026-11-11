# Autentisering och säkerhet i distribuerade webbapplikationer

DSOVT26 · 11 november 2026

Sju korta artiklar och ett gemensamt kodexempel med Supabase Auth, PostgreSQL/RLS och ett API på Vercel. Artiklarna kan läsas var för sig. Exemplet visar privata anteckningar: användaren får läsa och skapa egna anteckningar, men måste också verifiera MFA för att radera dem.

## 1. OAuth 2.0 och OpenID Connect

OAuth 2.0 är ett ramverk för delegerad åtkomst. En användare kan ge en applikation begränsad åtkomst till en tjänst utan att lämna sitt lösenord till applikationen. Ett **access token** används för att anropa tjänstens API. Det behöver inte vara ett JWT.

OpenID Connect, OIDC, lägger till standardiserad autentisering ovanpå OAuth 2.0. Ett **ID token** berättar för klienten om inloggningen och användarens identitet. Ett ID token är avsett för klienten; det ska inte användas som allmänt åtkomstbevis till ett API.

I ett Authorization Code-flöde skickas användaren till identitetsleverantören för inloggning. Klienten får tillbaka en kortlivad kod, som byts mot token. **PKCE** binder kodutbytet till den klient som startade flödet, så att en stulen kod inte ensam räcker. Biblioteket ska hantera protokollets kontroller, exempelvis `state` och, för OIDC-flöden där det används, `nonce`.

En webbläsare kan inte hålla ett client secret hemligt. Därför använder vi ett etablerat bibliotek och ett lämpligt kodflöde med PKCE. Applikationens egna roller och dataåtkomst måste fortfarande bestämmas av applikationen.

**I exemplet:** Google sköter den externa inloggningen via Supabase. Vårt API tar emot Supabase-sessionens access token, inte Googles token.

Källor: [OpenID Foundation: How OpenID Connect works](https://openid.net/developers/how-connect-works/), [RFC 9700: OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html).

## 2. JWT: struktur, validering och vanliga misstag

Ett vanligt signerat JWT består av tre Base64url-kodade delar: **header.payload.signature**. Headern beskriver bland annat signeringsalgoritmen. Payloaden innehåller claims, exempelvis `sub` för användarens ID och `exp` för sista giltighetstid. Signaturen gör ändringar upptäckbara. Den krypterar inte innehållet.

Att avkoda ett JWT visar bara vad avsändaren påstår. Validering måste kontrollera signaturen med en betrodd nyckel, tillåten algoritm, utgångstid och eventuell `nbf`, samt rätt utgivare (`iss`) och mottagare (`aud`). Vilken tokentyp API:et accepterar måste också vara bestämt. Använd ett underhållet bibliotek och betrodda nyckelkällor.

Vanliga misstag är att:

- använda avkodade claims utan signaturkontroll;
- acceptera token från fel projekt eller för fel mottagare;
- behandla en giltig inloggning som rätt till alla resurser;
- lägga hemligheter i payloaden eller skriva token i loggar;
- tro att en tidigare utfärdad token omedelbart blir ogiltig vid utloggning.

**I exemplet:** `getClaims(token)` verifierar token genom Supabase SDK. API:et kontrollerar dessutom projekt, mottagare och användarclaim. Databasen prövar sedan ägarskapet. Giltig token betyder inte att användaren äger anteckningen.

Källor: [RFC 8725: JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html), [Supabase: JWT](https://supabase.com/docs/guides/auth/jwts), [Supabase: getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims).

## 3. SSR, CSR och skydd av API-routes

Vid **Client-Side Rendering, CSR**, bygger JavaScript gränssnittet i webbläsaren. Koden och nätverksanropen kan undersökas och ändras av användaren. Att dölja en knapp är därför en presentationsregel, inte åtkomstkontroll.

Vid **Server-Side Rendering, SSR**, skapas HTML på servern. Servern kan behålla hemligheter och kontrollera åtkomst före rendering. Men HTML, serialiserade data och egenskaper som skickas till klienten blir fortfarande synliga. Personliga svar får inte hamna i en gemensam cache.

API:et måste kontrollera varje skyddat anrop, oavsett hur sidan renderas. En skyddad sida skyddar inte automatiskt `/api/notes`. API:et behöver autentisering, kontroll av handling och resurs samt inputvalidering. CORS styr webbläsares åtkomst till svar; det stoppar inte någon från att anropa API:et med exempelvis curl.

Cookiebaserad autentisering kräver skydd mot CSRF. `HttpOnly` hindrar JavaScript från att läsa en cookie, men eliminerar inte XSS. En SSR-lösning med Supabase behöver dessutom korrekt cookiehantering och tokenförnyelse, exempelvis med `@supabase/ssr`; paketet innebär inte automatiskt en lösning där alla token kan hållas borta från JavaScript.

**I exemplet:** CSR och Bearer-token gör gränsen tydlig. Vercel-routen kontrollerar anropet och skickar inte personliga svar till cache.

Källor: [Supabase: Server-side client](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase: SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

## 4. Publika och privilegierade nycklar

En API-nyckel kan identifiera applikationen utan att identifiera användaren. I Supabase är en **publishable key** avsedd att finnas i exempelvis webbläsaren. Användarens separata access token visar vem som är inloggad. Utan användartoken sker åtkomsten som `anon`, och med användartoken normalt som `authenticated`.

En **secret key** ger privilegierad åtkomst och kringgår RLS. Den ska bara användas i betrodd serverkod för motiverade administrativa uppgifter. Serverkod som arbetar åt en vanlig användare kan i stället använda publishable key och användarens token, så att RLS fortsätter gälla.

| Nyckel | Får finnas i frontend? | Användning |
|---|---|---|
| `sb_publishable_...` | Ja | Vanlig klientåtkomst med grants och RLS |
| `sb_secret_...` | Nej | Privilegierade serveruppgifter |
| Äldre `anon` | Ja | Föregångare till publishable key |
| Äldre `service_role` | Nej | Föregångare till secret key |

Publik betyder inte riskfri: felaktiga grants eller RLS-policyer kan exponera data. RLS måste testas. Dessa nyckeltyper ska inte blandas ihop med det publika/privata nyckelpar som används för att verifiera och signera JWT.

**I exemplet:** samma publishable key används i frontend och API. Ingen privilegierad nyckel behövs.

Källa: [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## 5. Sessioner med refresh tokens

En session kan bestå av ett kortlivat access token och ett refresh token. Access token skickas till API:et. Refresh token skickas till autentiseringstjänsten för att få ett nytt tokenpar när sessionen ska förnyas.

Vid **rotation** ersätts refresh token när det används. Återanvändning kan indikera stöld och leda till att sessionen avslutas. Supabase har vissa toleransregler för legitima samtidiga anrop. Låt SDK:t samordna förnyelsen i stället för att bygga egna timers i varje komponent.

Utloggning tar bort den lokala sessionen och återkallar berörda refresh tokens. Ett redan utfärdat access token kan däremot fortsätta fungera fram till `exp`. Omedelbart stopp kräver en ytterligare kontroll av exempelvis sessionens existens för särskilt känsliga handlingar. Signaturvalidering ensam kontrollerar inte detta.

Tokenlagring är ett arkitekturval. Browserlagring är åtkomlig för JavaScript och därmed utsatt vid XSS. En BFF-lösning kan behålla token på servern och ge webbläsaren en sessionscookie, men kräver bland annat CSRF-skydd.

**I exemplet:** Supabase SDK sköter lagring och automatisk refresh i webbläsaren. `getSession()` används för att hämta token till anropet; API:et litar inte på klientens användarobjekt.

Källor: [Supabase: Sessions](https://supabase.com/docs/guides/auth/sessions), [Supabase: Signing out](https://supabase.com/docs/guides/auth/signout).

## 6. Social login och MFA

**Social login** låter användaren logga in genom exempelvis Google. Leverantören hanterar sin inloggning, medan vår applikation ansvarar för sin session och sina behörigheter. Social login kan använda OAuth och, beroende på leverantören, OIDC. Alla OAuth-leverantörer erbjuder inte OIDC.

Providerkonfigurationen behöver rätt client ID, eventuellt client secret och tillåtna callback-adresser. Hemligheten hör hemma hos den betrodda tjänsten, inte i frontend. Med Supabase är leverantörens callback till Supabase och applikationens egen återkomstadress två olika inställningar.

**Multi-Factor Authentication, MFA**, använder flera faktorer. Lösenord och en TOTP-kod från en autentiseringsapp är ett exempel. Att en användare har registrerat MFA betyder inte att den aktuella sessionen har genomfört MFA. I Supabase visar `aal1` grundläggande inloggning och `aal2` verifierad andra faktor. Anta inte att MFA hos en social leverantör automatiskt ger Supabase-sessionen `aal2`.

MFA måste krävas där den känsliga handlingen utförs. En dialogruta i frontend räcker inte. Registrering, återinloggning och återställning av förlorad faktor är också skilda flöden.

**I exemplet:** användaren registrerar TOTP en gång och verifierar en kod. Radering kräver sedan `aal2` i både API och RLS.

Källor: [Supabase: Social login](https://supabase.com/docs/guides/auth/social-login), [Supabase: MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Supabase: TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp).

## 7. SAST och SCA

**Static Application Security Testing, SAST**, analyserar kod utan att köra applikationen. Verktyg som CodeQL och Semgrep kan hitta riskabla kodmönster och dataflöden, exempelvis osäker hantering av indata.

**Software Composition Analysis, SCA**, undersöker beroenden och deras kända sårbarheter. `npm audit` och Dependabots sårbarhetsfunktioner är exempel. En låsfil gör de installerade versionerna reproducerbara, men gör dem inte automatiskt säkra. Nya sårbarheter kan upptäckas efter att koden senast ändrades.

En varning är inte samma sak som en **security gate**. Bestäm vilka fynd som ska stoppa merge eller deployment, vem som bedömer undantag och hur rättningen verifieras. Dependabot kan föreslå uppdateringar genom pull requests; tester och granskning behövs fortfarande.

| Kontroll | Fråga den kan hjälpa oss besvara |
|---|---|
| SAST | Har vår kod kända riskmönster? |
| SCA | Använder vi beroenden med kända sårbarheter? |
| Åtkomsttest | Kan användare A läsa eller radera B:s anteckning? |

Varken SAST eller SCA bevisar att vår affärsregel om ägarskap är korrekt. Därför behövs också negativa tester av API och RLS.

**I exemplet:** CI kör SCA med en uttrycklig felgräns. CodeQL aktiveras separat som SAST och behöver egna regler för blockering.

Källor: [GitHub: Code scanning](https://docs.github.com/en/code-security/concepts/code-scanning/code-scanning), [GitHub: CodeQL default setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning), [GitHub: Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).

## 8. Gemensamt kodexempel: privata anteckningar

### Vad exemplet visar

Webbläsaren loggar in via Supabase och skickar ett access token till `/api/notes`. API:et validerar token och utför databasoperationen med användarens identitet. RLS avgör vilka rader användaren får komma åt. Radering kräver dessutom MFA.

Detta är ett avgränsat undervisningsexempel, inte en färdig produkt. SSR diskuteras som jämförelse, men själva appen använder CSR. Token lagras av browser-SDK:t. Vi implementerar inte egen OAuth, JWT-kryptografi eller refresh-rotation.

### Förberedelser

Skapa ett separat Supabase-projekt för demonstrationen. Aktivera email/password och skapa två testanvändare med bekräftad e-post. Använd olika webbläsarprofiler för användare A och B.

För social login: aktivera Google-provider, registrera Supabases callback-URL hos Google och lägg `http://localhost:3000/` samt den exakta Vercel-adressen i Supabases tillåtna redirect-URL:er. Aktivera TOTP om det inte redan är tillgängligt. Använd aldrig riktiga personuppgifter i demon.

Skapa filerna nedan i ett nytt projekt. Node.js 22 eller senare används. Installera beroenden, och checka in den skapade `package-lock.json` innan CI körs:

```bash
npm install @supabase/supabase-js@2
npm install --save-dev vite vercel
npx vercel dev --listen 3000
```

Välj Vite som framework i Vercel, build command `npm run build` och output directory `dist`. API-filerna ligger i projektrotens `api/`, utanför `dist`. För lokal körning används `vercel dev`, så att både Vite och API-routen körs. Enbart `vite` startar inte Vercel-routen.

### package.json

Utgå från denna fil före installationen; npm lägger till dependencies och devDependencies:

```json
{
  "name": "privata-anteckningar",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

### .gitignore

```gitignore
node_modules/
dist/
.vercel/
.env*
!.env.example
```

### .env.example

Kopiera till `.env.local` och fyll i projektets URL och publishable key. Lägg samma fyra variabler i relevanta Vercel-miljöer och gör en ny deployment efter ändringar.

```dotenv
VITE_SUPABASE_URL=https://DITT-PROJEKT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_BYT_MIG
SUPABASE_URL=https://DITT-PROJEKT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_BYT_MIG
```

`VITE_` innebär att värdet kan byggas in i frontend. Det är avsiktligt för dessa två värden. Lägg aldrig secret key eller äldre service-role key där. Servervariablerna använder också publishable key: backend behöver inte automatiskt administratörsrättigheter.

### schema.sql

Kör en gång i Supabases SQL Editor i det nya demoprojektet:

```sql
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

-- Börja med uttryckliga tabellrättigheter.
revoke all on public.notes from anon, authenticated;
grant select, insert, delete on public.notes to authenticated;

create policy "read own notes"
on public.notes for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "create own notes"
on public.notes for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "delete own notes with MFA"
on public.notes for delete to authenticated
using (
  (select auth.uid()) = owner_id
  and (select auth.jwt()->>'aal') = 'aal2'
);
```

API-kontrollen ensam räcker inte: Supabases Data API kan anropas direkt med publishable key och användartoken. Därför ligger kravet på ägarskap och MFA även i databasen. Här finns bara en delete-policy. Om fler permissiva policyer läggs till kan de kombineras med OR och ändra skyddet; granska helheten.

Källa: [Supabase: Row Level Security, inklusive MFA-policyer](https://supabase.com/docs/guides/database/postgres/row-level-security).

### api/notes.js

```javascript
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
```

`getClaims()` är här valideringsgränsen, inte ett centralt register över om sessionen fortfarande finns. För en produkt som kräver omedelbar återkallelse måste även sessionens aktuella status kontrolleras. Exemplet använder Supabases vanliga projektutgivare och audience; en egen Auth-domän eller andra tokenkonventioner kräver motsvarande betrodd konfiguration.

### index.html

```html
<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Privata anteckningar</title>
  </head>
  <body>
    <h1>Privata anteckningar</h1>
    <p>Demo: inloggning → API → RLS. Radering kräver MFA.</p>
    <label>E-post <input id="email" type="email" autocomplete="username"></label>
    <label>Lösenord <input id="password" type="password" autocomplete="current-password"></label>
    <button id="login">Logga in</button>
    <button id="google">Logga in med Google</button>
    <button id="logout">Logga ut här</button>
    <hr>
    <label>Anteckning <input id="body" maxlength="500"></label>
    <button id="create">Skapa</button>
    <button id="load">Läs mina anteckningar</button>
    <label>ID att radera <input id="noteId"></label>
    <button id="remove">Radera</button>
    <h2>MFA</h2>
    <button id="enroll">Registrera TOTP en gång</button>
    <p>Skanna QR-koden i din autentiseringsapp. Dela den inte.</p>
    <img id="qr" alt="QR-kod för registrering av MFA" hidden>
    <label>Aktuell TOTP-kod <input id="code" inputmode="numeric" autocomplete="one-time-code"></label>
    <button id="verify">Verifiera MFA</button>
    <h2>Resultat</h2>
    <pre id="output" aria-live="polite"></pre>
    <script type="module" src="/main.js"></script>
  </body>
</html>
```

### main.js

```javascript
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
```

MFA-registreringen är avsiktligt liten. Om en registrering avbryts genom omladdning kan en overifierad faktor finnas kvar. Ta bort den i testanvändarens faktorhantering innan ett nytt försök. En produkt behöver ett fullständigt flöde för att avbryta, återuppta och återställa MFA.

Källor: [signInWithOAuth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth), [exchangeCodeForSession](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession), [enroll](https://supabase.com/docs/reference/javascript/auth-mfa-enroll), [challengeAndVerify](https://supabase.com/docs/reference/javascript/auth-mfa-challengeandverify).

### .github/workflows/ci.yml

```yaml
name: Build and SCA
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * 1'

permissions:
  contents: read

jobs:
  build-and-sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      # Omfattar även devDependencies som används i byggkedjan.
      - run: npm audit --audit-level=high
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}
```

Sätt de två publika värdena som GitHub repository variables. Workflowet behöver inga användartoken eller privilegierade databasnycklar. `npm audit --audit-level=high` gör att hög eller kritisk allvarlighetsgrad ger felstatus; även ett verktygs- eller nätverksfel ska utredas, inte döljas med `|| true`.

För SAST: aktivera **CodeQL default setup** i repots säkerhetsinställningar om repotyp och abonnemang stöder det. Det analyserar JavaScript utan att ett eget CodeQL-workflow behöver skrivas här. Använd rulesets/branch protection och tillgängliga code-scanning-regler för önskad blockering. En genererad rapport innebär inte automatiskt att fynd stoppar merge. Använd Semgrep om det passar er befintliga pipeline bättre.

Taggar som `@v4` gör utbildningsexemplet lättläst. I en härdad pipeline låses actions till granskade fullständiga commit-SHA och uppdateras kontrollerat.

### .github/dependabot.yml

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

Detta konfigurerar versionsuppdateringar. Aktivera också Dependabot alerts och security updates i repots inställningar. Uppdateringsförslag är pull requests, inte ett bevis för att koden fungerar eller ett krav på automatisk merge.

CI-filen ovan bygger och skannar; den deployar inte. Om Vercel deployar direkt från Git väntar deploymenten inte automatiskt på dessa jobb. För produktion måste ni uttryckligen koppla ihop godkända kontroller med leveransen, exempelvis genom en deploy-jobb som beror på kontrollerna och ersätter den parallella automatiska deploymenten. Branch protection kan stoppa merge till produktionsgrenen, men skyddar inte i sig varje preview-deployment.

Källor: [Vercel: GitHub integration](https://vercel.com/docs/git/vercel-for-github), [GitHub: CodeQL default setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning), [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).

### Demonstrera och diskutera

| Försök | Förväntat resultat | Vad det visar |
|---|---|---|
| Anropa API utan Bearer-token | 401 | API:et skyddar sig självt |
| Ändra payloaden i ett token utan ny signatur | 401 | Avkodning och validering är olika saker |
| Använd utgången token eller token från ett annat projekt | 401 | Tid och utgivare spelar roll |
| A och B skapar varsin anteckning | Var och en läser bara sina egna | RLS skyddar raderna |
| Skicka B:s `owner_id` vid A:s POST | API:et använder ändå A:s verifierade `sub` | Klienten bestämmer inte ägarskap |
| Radera egen anteckning före MFA | 403 | Inloggning är inte samma sak som MFA |
| Verifiera MFA och radera egen anteckning | 200 | Den aktuella sessionens nivå används |
| A försöker efter MFA radera B:s anteckning | 404; B:s rad finns kvar | MFA ger inte rätt till andras data |
| Anropa Supabases Data API direkt som A | Samma ägarskaps- och MFA-regler | API:et får inte vara det enda skyddet |
| Lägg HTML i en anteckning | Text visas, ingen exekvering | Säker rendering i frontend |

Detta är en testplan, inte påstådda genomförda tester mot ditt projekt. För automatisering: använd separata testkonton, seedade rader och kontrollera även direkt åtkomst via Data API. Testa särskilt att B:s rad finns kvar efter A:s misslyckade radering; en statuskod ensam räcker inte.

### Koppla tillbaka till de sju artiklarna

- **OAuth/OIDC:** leverantörsinloggning delegeras till Supabase och Google. Vårt API använder Supabases token.
- **JWT:** API:et verifierar token innan claims används. RLS prövar rätt till data.
- **CSR/SSR:** renderingssättet ändrar inte API:ets skyldighet att kontrollera åtkomst. SSR kräver en annan sessionsintegration än denna CSR-demo.
- **Nycklar:** publishable key är synlig, men den kan inte på egen hand öppna privata anteckningar med dessa grants och policyer.
- **Refresh:** SDK:t förnyar sessionen; ingen egen refresh-loop behövs.
- **Social login/MFA:** först grundinloggning, sedan verifierad andra faktor för radering.
- **SAST/SCA:** verktygen kompletteras av tester av de åtkomstregler vi faktiskt lovar användaren.

### Före användning som produkt

Lägg till automatiserade integrationstester, genomtänkt CSP och övriga säkerhetsheaders, rate limiting, säker felövervakning, tillgänglig UI och fullständig MFA-/kontoåterställning. Välj medvetet mellan browserlagring och en BFF-/cookiebaserad session. Lägg till omedelbar sessionskontroll om verksamhetens krav kräver det. Behåll token och autentiseringshemligheter utanför loggarna.