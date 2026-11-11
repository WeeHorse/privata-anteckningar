## 6. Social login och MFA

**Social login** låter användaren logga in genom exempelvis Google. Leverantören hanterar sin inloggning, medan vår applikation ansvarar för sin session och sina behörigheter. Social login kan använda OAuth och, beroende på leverantören, OIDC. Alla OAuth-leverantörer erbjuder inte OIDC.

Providerkonfigurationen behöver rätt client ID, eventuellt client secret och tillåtna callback-adresser. Hemligheten hör hemma hos den betrodda tjänsten, inte i frontend. Med Supabase är leverantörens callback till Supabase och applikationens egen återkomstadress två olika inställningar.

**Multi-Factor Authentication, MFA**, använder flera faktorer. Lösenord och en TOTP-kod från en autentiseringsapp är ett exempel. Att en användare har registrerat MFA betyder inte att den aktuella sessionen har genomfört MFA. I Supabase visar `aal1` grundläggande inloggning och `aal2` verifierad andra faktor. Anta inte att MFA hos en social leverantör automatiskt ger Supabase-sessionen `aal2`.

MFA måste krävas där den känsliga handlingen utförs. En dialogruta i frontend räcker inte. Registrering, återinloggning och återställning av förlorad faktor är också skilda flöden.

**I exemplet:** användaren registrerar TOTP en gång och verifierar en kod. Radering kräver sedan `aal2` i både API och RLS.

Källor: [Supabase: Social login](https://supabase.com/docs/guides/auth/social-login), [Supabase: MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Supabase: TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp).
