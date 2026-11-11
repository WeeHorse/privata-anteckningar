# Privata anteckningar

Pedagogisk fullstack-demo för DSOVT26: Supabase Auth, JWT-validering, privata PostgreSQL-rader med RLS och MFA vid radering. Frontend är vanilla JavaScript med Vite, backend är en Vercel Function.

## Starta

Kräver Node.js 22.12 eller senare, ett Supabase-demoprojekt och Vercel-konto för Vercels lokala utvecklingsmiljö.

```bash
git clone https://github.com/WeeHorse/privata-anteckningar.git
cd privata-anteckningar
npm install
cp .env.example .env.local
npx vercel@latest dev --listen 3000
```

Fyll i de fyra värdena i `.env.local` före start. Använd projektets URL och **publishable key**, aldrig secret/service-role key. `npm run dev` startar enbart frontend; använd `vercel dev` för att även köra API:et.

Den första `npm install` skapar `package-lock.json`. Checka in den för reproducerbara installationer. CI använder `npm ci` om låsfilen finns och annars `npm install` för första körningen. Ingen låsfil har fabricerats.

## Supabase

1. Kör [schema.sql](schema.sql) en gång i SQL Editor i ett nytt demoprojekt.
2. Aktivera email/password och skapa två testanvändare med bekräftad e-post.
3. För Google-inloggning: aktivera Google-provider. Registrera Supabases callback-URL hos Google; lägg appens återkomstadresser `http://localhost:3000/` och den exakta Vercel-URL:en i Supabases redirect-lista.
4. Aktivera TOTP/MFA om det inte är aktiverat.

API:et kräver token från detta Supabase-projekt. RLS begränsar läsning och skapande till egna anteckningar; radering kräver både ägarskap och `aal2`.

## Prova flödet

Logga in, skapa och läs anteckningar. Försök radera före MFA (403). Registrera TOTP en gång, skanna QR-koden och verifiera en kod. Radera sedan din egen anteckning. Vid nästa inloggning använder du den befintliga faktorn och knappen **Verifiera MFA**.

Använd olika webbläsarprofiler för A och B. A ska inte kunna läsa eller radera B:s anteckningar, inte heller efter MFA. Prova även direkt åtkomst via Supabases Data API. Efter avbruten MFA-registrering kan en overifierad faktor behöva tas bort innan nytt försök.

## Deploya till Vercel

Importera detta repo. [vercel.json](vercel.json) väljer Vite, `npm run build` och `dist`. API-routen ligger i `api/notes.js`.

Sätt samtliga fyra värden från `.env.example` i relevanta Vercel-miljöer och deploya på nytt. Uppdatera Supabases tillåtna redirect-URL:er. Inga riktiga nycklar eller kontouppgifter finns i repot.

## Kontroller

```bash
npm test
npm run build
npm audit --audit-level=high
```

API-testerna simulerar Supabase SDK och verifierar API:ets säkerhetsbeslut. De verifierar inte JWT-kryptografi, OAuth, refresh eller verkliga RLS-policyer. Följ även den manuella testplanen i det samlade underlaget.

GitHub Actions kör tester, syntaxkontroll, SCA och bygg. Byggkontrollen använder ofarliga platshållare om publika GitHub-variabler saknas; en driftsatt app behöver riktiga projektvärden.

För SAST: aktivera CodeQL default setup i repots säkerhetsinställningar. Dependabot-konfigurationen föreslår versionsuppdateringar; aktivera även alerts/security updates. Konfigurera merge-/deployment-gates separat. Vercels automatiska Git-deployment väntar inte automatiskt på CI.

## Artiklar

- [1. OAuth 2.0 och OpenID Connect](docs/01-oauth-och-openid-connect.md)
- [2. JWT och validering](docs/02-jwt-validering.md)
- [3. SSR/CSR och skydd av API-routes](docs/03-ssr-csr-api-routes.md)
- [4. Publika och privilegierade nycklar](docs/04-publika-och-privilegierade-nycklar.md)
- [5. Sessioner med refresh tokens](docs/05-sessioner-refresh-tokens.md)
- [6. Social login och MFA](docs/06-social-login-mfa.md)
- [7. SAST och SCA](docs/07-sast-sca.md)

[Samlat lektionsunderlag med kodgenomgång och testplan](docs/autentisering-och-sakerhet-dsovt26.md).

Det samlade underlaget visar den ursprungliga stegvisa uppbyggnaden. Repots package.json och CI är kompletterade med färdiga beroenden och API-tester.

## Avgränsning

Undervisningsexempel med CSR och browserlagrade token. En produkt behöver bland annat integrationstester, rate limiting, säkerhetsheaders, fullständiga konto-/MFA-återställningsflöden och ett medvetet val av sessionsarkitektur. Utloggning återkallar inte automatiskt redan utfärdade access tokens före deras utgångstid.
