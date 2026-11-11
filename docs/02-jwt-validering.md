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
