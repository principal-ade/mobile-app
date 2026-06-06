# CLAUDE.md

Guidance for working in this repo.

## Git workflow

**Commit directly to `main`.** This repo does not use feature branches or
pull requests for normal work — make changes, commit them straight to
`main`. Don't create a branch, and don't open a PR unless explicitly asked.

## Releasing to TestFlight / App Store

**Always bump the _marketing version_ (`expo.version`), not just the build number, for each new TestFlight/App Store submission.**

Once Apple approves a build under a given marketing version (`CFBundleShortVersionString`, e.g. `1.14.0`), that **version train is closed** — new uploads under the same version are rejected at processing:

- `Invalid Pre-Release Train. The train version 'X' is closed for new build submissions (90186)`
- `CFBundleShortVersionString ... must contain a higher version than that of the previously approved version (90062)`

Bumping only `expo.ios.buildNumber` does **not** fix this. You must raise `expo.version` (e.g. `1.14.0 → 1.15.0`). The build IPA bakes the version in, so a rejected build can't be resubmitted — you must rebuild after the bump.

### Version is stored in three places — keep them in sync

`eas.json` uses `appVersionSource: local` with a committed `ios/` dir, so EAS reads the version/build number from the **native `Info.plist`**, not `app.json` directly. A bump that doesn't reach `Info.plist` is silently ignored (you resubmit a duplicate).

Sources to update, in order:
1. `app.json` → `expo.version` (marketing) and `expo.ios.buildNumber`
2. `package.json` → `version` (keep it matching `app.json`)
3. `ios/PrincipalAI/Info.plist` → propagated automatically by `npm run sync-version` (reads `app.json`)

`scripts/deploy-testflight.sh` runs `sync-version` for you, but it does **not** bump the numbers — edit `app.json`/`package.json` first, then commit (the deploy script wants a clean tree).

### Procedure

```bash
# 1. Edit app.json: bump expo.version (and expo.ios.buildNumber if same train)
# 2. Edit package.json: match the new version
npm run sync-version          # propagate into ios/PrincipalAI/Info.plist
git commit -am "chore(release): bump version to X.Y.Z"
npm run deploy:testflight     # sync-version + eas build (production) + eas submit --latest
```

Build number: within one marketing version it must strictly increase; starting a new version train, any value works (it's the first build of that train).

EAS builds in the cloud on a toolchain that may differ from local Xcode — local `expo run:ios` can fail on `expo-modules-core` Swift concurrency errors under newer Xcode even when the EAS production build succeeds. Prefer EAS (`eas build --profile development` for a dev client, `deploy:testflight` for release) when a local native build is blocked.
