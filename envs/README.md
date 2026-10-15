# Environments

One file per server the app can talk to, with the same keys as the Flutter app's
`frontend/envs/` (spec `docs/spec/02-config-and-environments.md` §1). Select one before running:

```bash
npm run env:dev          # or env:test, env:beta, env:live, env:simulator
node scripts/use-env.js dev baseDomain=192.168.1.50:8000   # override single keys
```

This writes `src/config/env.generated.json` (gitignored), which the app reads at build time.
Re-run it after switching, then reload the app.

| File | Server | Committed |
|---|---|---|
| `dev.json` | your own computer, e.g. `192.168.x.x:8000`, plain http | **no** (gitignored; differs per developer) |
| `dev.copy.json` | template for `dev.json` | yes |
| `test.json` | `test.cartellap.com` | yes |
| `beta.json` | `beta.cartellap.com` | yes |
| `live.json` | `cartellap.com` (real customers) | yes |
| `simulator.json` | `localhost:8000`, hub at `127.0.0.1`, Wi-Fi hop skipped | yes |

New developer: copy `dev.copy.json` to `dev.json` and set `baseDomain` to your computer's LAN
address and port. The backend must listen on `0.0.0.0:8000`, and that address must be in the
backend's `DJANGO_ALLOWED_HOSTS`.

Keys a file leaves out take the Flutter defaults: `hubAddress` `192.168.4.1`, `hubPort` `5002`,
`hubReplyPort` `6452`, `skipWifiHandoff` `false`. The app refuses to start if `hubAddress` is not
an IPv4 address. `macAddressHashKey` differs between live and test, and is how a build is told
apart (spec 21).

These files started as copies of `frontend/envs/` on 2026-10-12. Keep them in step if a server
or key changes.
