# Deployment

## Build and run

```
npm ci
npm run lint && npx tsc --noEmit && npm test     # safety tests (Vitest)
npm run build && npm run start                    # production server on :3000
npx playwright test                               # browser tests (serves the build on :3300 — build first)
npm run review:export                             # regenerate docs/CLINICAL_REVIEW.md
```

Node 20+ (developed on Node 22; `.github/workflows/ci.yml` runs every check on each push). The site is static apart from `/search`, so any host
that runs Next.js 16 works; it is currently deployed on Vercel from `main`.

## Environment variables (all optional)

| Variable | Default | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_LIVE_CONSULT_DOMAIN` | unset → live consultations off | Domain of the Health Department's own Jitsi server (never `meet.jit.si`). Enables `/ai-hospital/consult` and adds the domain to the CSP for those pages. See `LIVE_CONSULTATION.md` |
| `NEXT_PUBLIC_VOICE_INPUT` | `consent` | `consent`, `on-device` (only on-device recognition) or `off` |
| `NEXT_PUBLIC_TELEMETRY_URL` | unset → no counts sent | HTTPS endpoint that accepts a JSON array of events (see `DATA_PRIVACY.md`). Added to the CSP `connect-src` |

The `NEXT_PUBLIC_` values are public build-time values — none is a secret.
Never put a secret in a `NEXT_PUBLIC_` variable.

### Online help understanding words (server-only, optional)

| Variable | Default | Effect |
| --- | --- | --- |
| `AI_UNDERSTANDING` | unset → off | `on` offers patients "online help with my words" (`/api/understand`). Read at request time |
| `OPENAI_API_KEY` | unset → off | **Secret.** The OpenAI project key used only by the server route. Set it in the host's environment settings; never in the repository, a `NEXT_PUBLIC_` variable or a chat |
| `OPENAI_MODEL` | `gpt-5.4-mini` | Any OpenAI chat model that supports Structured Outputs |
| `OPENAI_REASONING_EFFORT` | `low` | `none`, `minimal`, `low`, `medium`, `high`, or `default` (leave it to the model) |

Both `AI_UNDERSTANDING=on` and a key are needed; otherwise the feature is not
offered and nothing is sent. On Vercel: Project → Settings → Environment
Variables, then redeploy. Before switching it on for real patients: privacy
and legal approval (it sends a patient's words to OpenAI — see
`DATA_PRIVACY.md`), a spending limit on the OpenAI project, and a run of
`npx tsx scripts/understand-eval.ts` with the chosen model.

## Security headers

Set in `next.config.ts`: Content-Security-Policy (self only, plus configured
video / telemetry origins), HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, `Cross-Origin-Opener-Policy`, `Permissions-Policy`
(camera and location off everywhere except the live-consultation pages).

## Release checklist

1. All four checks above pass; `npm audit --omit=dev` shows 0.
2. `docs/CLINICAL_REVIEW.md` regenerated and committed (a test enforces it).
3. If helplines, facilities or sources changed: verification status updated.
4. Update `PROJECT_STATUS.md`.
5. Bump `VERSION` in `public/sw.js` when the list of offline pages changes.

## Operating a pilot (not yet in place)

- A collector for `NEXT_PUBLIC_TELEMETRY_URL` that stores only what
  `lib/metrics.ts` `sanitize()` accepts and reports via `aggregate()`.
- Uptime monitoring of the site and (if used) the video server.
- A named clinical owner for rule changes and a named data owner for
  helplines and facilities.
