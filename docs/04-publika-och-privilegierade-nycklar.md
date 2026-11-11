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
