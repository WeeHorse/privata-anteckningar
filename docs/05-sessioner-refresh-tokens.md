## 5. Sessioner med refresh tokens

En session kan bestå av ett kortlivat access token och ett refresh token. Access token skickas till API:et. Refresh token skickas till autentiseringstjänsten för att få ett nytt tokenpar när sessionen ska förnyas.

Vid **rotation** ersätts refresh token när det används. Återanvändning kan indikera stöld och leda till att sessionen avslutas. Supabase har vissa toleransregler för legitima samtidiga anrop. Låt SDK:t samordna förnyelsen i stället för att bygga egna timers i varje komponent.

Utloggning tar bort den lokala sessionen och återkallar berörda refresh tokens. Ett redan utfärdat access token kan däremot fortsätta fungera fram till `exp`. Omedelbart stopp kräver en ytterligare kontroll av exempelvis sessionens existens för särskilt känsliga handlingar. Signaturvalidering ensam kontrollerar inte detta.

Tokenlagring är ett arkitekturval. Browserlagring är åtkomlig för JavaScript och därmed utsatt vid XSS. En BFF-lösning kan behålla token på servern och ge webbläsaren en sessionscookie, men kräver bland annat CSRF-skydd.

**I exemplet:** Supabase SDK sköter lagring och automatisk refresh i webbläsaren. `getSession()` används för att hämta token till anropet; API:et litar inte på klientens användarobjekt.

Källor: [Supabase: Sessions](https://supabase.com/docs/guides/auth/sessions), [Supabase: Signing out](https://supabase.com/docs/guides/auth/signout).
