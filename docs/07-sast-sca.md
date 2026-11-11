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
