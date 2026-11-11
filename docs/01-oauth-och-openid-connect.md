## 1. OAuth 2.0 och OpenID Connect

OAuth 2.0 är ett ramverk för delegerad åtkomst. En användare kan ge en applikation begränsad åtkomst till en tjänst utan att lämna sitt lösenord till applikationen. Ett **access token** används för att anropa tjänstens API. Det behöver inte vara ett JWT.

OpenID Connect, OIDC, lägger till standardiserad autentisering ovanpå OAuth 2.0. Ett **ID token** berättar för klienten om inloggningen och användarens identitet. Ett ID token är avsett för klienten; det ska inte användas som allmänt åtkomstbevis till ett API.

I ett Authorization Code-flöde skickas användaren till identitetsleverantören för inloggning. Klienten får tillbaka en kortlivad kod, som byts mot token. **PKCE** binder kodutbytet till den klient som startade flödet, så att en stulen kod inte ensam räcker. Biblioteket ska hantera protokollets kontroller, exempelvis `state` och, för OIDC-flöden där det används, `nonce`.

En webbläsare kan inte hålla ett client secret hemligt. Därför använder vi ett etablerat bibliotek och ett lämpligt kodflöde med PKCE. Applikationens egna roller och dataåtkomst måste fortfarande bestämmas av applikationen.

**I exemplet:** Google sköter den externa inloggningen via Supabase. Vårt API tar emot Supabase-sessionens access token, inte Googles token.

Källor: [OpenID Foundation: How OpenID Connect works](https://openid.net/developers/how-connect-works/), [RFC 9700: OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html).
