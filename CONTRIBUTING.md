# Jak přispět

Díky, že chcete přispět!

## Co projekt dělá

V reálném čase ukazuje, kolik tramvají aktuálně jezdí po Praze bez klimatizace. Polohy tramvají tahá z Golemio API a páruje je s aktuální teplotou z Open-Meteo. Barvy a emoji na stránce se pak podle teploty a podílu klimatizovaných tramvají mění od klidných po dost naštvané.

## Tech stack

- **Next.js 16** (app router) + **React 19** + **TypeScript**
- **Tailwind CSS** pro styly
- deployment na **Cloudflare Workers** přes **OpenNext**
- **node --test** pro unit testy, **Playwright** pro E2E
- **Biome** pro formátování a lint
- **pnpm** jako package manager
- data z **[Golemio API](https://api.golemio.cz)** (tramvaje) a **[Open-Meteo](https://open-meteo.com/en/docs)** (počasí)

## Jak rozjet projekt lokálně

```bash
pnpm install
cp .env.example .env
# do .env vyplňte GOLEMIO_API_KEY (registrace zdarma na https://api.golemio.cz)
pnpm dev
```

## Dostupné příkazy

| Příkaz | Popis |
|---|---|
| `pnpm dev` | Spustí vývojový server |
| `pnpm build` | Sestaví produkční build |
| `pnpm check-types` | Kontrola typů přes TypeScript |
| `pnpm lint` | Formátování + lint přes Biome (kontrola) |
| `pnpm lint:fix` | Totéž, ale s automatickými opravami |
| `pnpm test` | Spustí unit testy přes `node --test` |
| `pnpm test:e2e` | Spustí Playwright e2e testy |
| `pnpm worker:dev` | Lokální náhled běhu na Cloudflare Workeru |
| `pnpm worker:deploy` | Deploy na Cloudflare |

## Debug stránka

Na adrese [`/debug`](http://localhost:3000/debug) je ladicí náhled, kde si můžete ručně nastavit vstupní data a vidět, jak se stránka vyrendruje.

## Deploy

Každý push do `main` spustí [deploy workflow](.github/workflows/deploy.yml) a publikuje build na Cloudflare Workers. Je potřeba mít v repozitáři nastavené tyto GitHub secrets:

| Secret | Kde získat |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → *Edit Cloudflare Workers* template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → pravý sidebar účtu |

`GOLEMIO_API_KEY` se drží jako Worker secret přímo v Cloudflare (jednorázově `pnpm exec wrangler secret put GOLEMIO_API_KEY`), přetrvává napříč deploys a runtime ho Cloudflare injektuje do `process.env`.
