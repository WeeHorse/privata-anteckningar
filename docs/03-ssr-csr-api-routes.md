## 3. SSR, CSR och skydd av API-routes

Vid **Client-Side Rendering, CSR**, bygger JavaScript gränssnittet i webbläsaren. Koden och nätverksanropen kan undersökas och ändras av användaren. Att dölja en knapp är därför en presentationsregel, inte åtkomstkontroll.

Vid **Server-Side Rendering, SSR**, skapas HTML på servern. Servern kan behålla hemligheter och kontrollera åtkomst före rendering. Men HTML, serialiserade data och egenskaper som skickas till klienten blir fortfarande synliga. Personliga svar får inte hamna i en gemensam cache.

API:et måste kontrollera varje skyddat anrop, oavsett hur sidan renderas. En skyddad sida skyddar inte automatiskt `/api/notes`. API:et behöver autentisering, kontroll av handling och resurs samt inputvalidering. CORS styr webbläsares åtkomst till svar; det stoppar inte någon från att anropa API:et med exempelvis curl.

Cookiebaserad autentisering kräver skydd mot CSRF. `HttpOnly` hindrar JavaScript från att läsa en cookie, men eliminerar inte XSS. En SSR-lösning med Supabase behöver dessutom korrekt cookiehantering och tokenförnyelse, exempelvis med `@supabase/ssr`; paketet innebär inte automatiskt en lösning där alla token kan hållas borta från JavaScript.

**I exemplet:** CSR och Bearer-token gör gränsen tydlig. Vercel-routen kontrollerar anropet och skickar inte personliga svar till cache.

Källor: [Supabase: Server-side client](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase: SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide).
