// Bun preload for `bun test` (wired in bunfig.toml).
//
// `bun test` runs with NODE_ENV=test, under which Bun does NOT load
// `.env.local`, so `NEXT_PUBLIC_API_URL` is unset. Any test that transitively
// imports `@/api/client` (e.g. onboarding/registry.test.ts, which pulls the
// wizard step components) would then throw at module load. Provide a harmless
// default so pure-logic tests can import real modules without a live env.
process.env.NEXT_PUBLIC_API_URL ||= 'http://localhost:8000';
