# Search Demand Radar — Russia

Yandex-first search demand radar for the Russian market.

## Current phase

- Market: Russia only.
- Primary data source: Yandex Search API / Wordstat.
- Google integration: intentionally deferred.
- Public dashboard: GitHub Pages.
- Data policy: official/observed/derived/unavailable only; no invented values.

## Architecture

- `collectors/yandex_wordstat.py` — official Wordstat API collector.
- `config/yandex_seeds.json` — small validation seed set. It is a discovery starting point, not market data.
- `data/raw/YYYY-MM-DD/yandex_wordstat.json` — immutable raw snapshots after successful runs.
- `data/source_status.json` — connection/freshness status.
- `.github/workflows/collect-yandex.yml` — manual validation workflow.
- `.github/workflows/pages.yml` — dashboard deployment.

## Yandex API setup

Current Wordstat capabilities are provided through Yandex Search API / AI Studio.

Required GitHub Actions secrets:

- `YANDEX_SEARCH_API_KEY`
- `YANDEX_FOLDER_ID` — optional when the service-account key already resolves the folder, but recommended for explicit configuration.

Never commit keys to the repository.

## Validation protocol

1. Create Yandex Cloud / AI Studio access and billing.
2. Create an API key/service account with access to Yandex Search API.
3. Add the secrets to GitHub.
4. Manually run `Validate Yandex Wordstat`.
5. Check `data/source_status.json` = `ok`.
6. Inspect the raw JSON snapshot.
7. Manually compare 5 validation phrases with the Wordstat UI.
8. Only after reconciliation, enable wider collection, normalization, scoring and schedules.

## Important limitation

Wordstat is phrase-driven, not a complete seedless feed of all Russian search demand. The production discovery loop will therefore use:

`seed registry → GetTop → associations → new candidates → dynamics/regions validation → history → classification`.

This limitation must remain explicit in the dashboard and methodology.
