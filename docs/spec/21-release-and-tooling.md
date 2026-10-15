# 21 — Release Engineering, Tooling and CI

Plan steps: 3.6, 18.1–18.5, 19.5. Sources: `frontend/tool/release.py`, `store_versions.py`,
`verify_artifact.py`, `frontend/tests/tool/*`, `frontend/android/fastlane/*`,
`frontend/ios/fastlane/*`, `frontend/ios/ExportOptions.plist`, `frontend/docs/fastlane.md`,
`app_store.md`, `frontend/changelog.txt`, `flutter-release-notes.txt`,
`.github/workflows/flutter_code_quality.yml`, `.pre-commit-config.yaml`, `frontend/CLAUDE.md`
(release-day gotchas).

## 1. How Flutter releases work today (to be mirrored)

- `pipenv run python -m tool.release --env {test|live}` builds **one environment per run**.
  1. Reads `X.Y.Z+BUILD` from pubspec.
  2. Asserts a clean tree (scoped to `frontend/`).
  3. Asserts the build number is greater than the highest used on **both** stores
     (`store_versions.py`).
  4. Asserts App Store Connect auth (`ASC_KEY_ID`, `ASC_ISSUER_ID`, an absolute `ASC_KEY_PATH`)
     and the Play key are present.
  5. Deletes the previous outputs, builds the aab (`--obfuscate --split-debug-info`) and the ipa
     (`--export-options-plist ios/ExportOptions.plist`).
  6. **Verifies the artifacts** (`verify_artifact.py`): the baked `macAddressHashKey` fingerprint
     matches the environment (test vs live), the aab signer certificate SHA-256 is
     `7ae8d223756c284bdcf3f46c9f14bf62b711fdb2a8b2bb26da449405a42666d4`, the ipa
     `CFBundleVersion` is the expected one, and `MinimumOSVersion` is 15.0.
  7. Archives to `versions/<version>/<env>/app.{aab,ipa}` with the changelog.
  8. Uploads with fastlane, then tags `v<version>+<build>` (monorepo tags now use the
     `frontend/vX.Y.Z` prefix; the RN app needs its own prefix, decided at 18.4).
- Recovery: `--skip-build --only {android|ios}` re-verifies and re-uploads without rebuilding.
- **Bump `+BUILD` between the test cut and the live cut.**
- Fastlane lanes:
  - Android `internal`: track internal, completed, `version_name "<v> (TEST SERVER)"`, no
    metadata, images or screenshots.
  - Android `production`: track production, completed.
  - iOS `testflight_test`: changelog + "\n(TEST SERVER)", internal only, no explicit groups.
  - iOS `appstore_live`: skip submission, skip waiting for processing.
- Sentry symbols: `dart run sentry_dart_plugin` after the release build. The RN equivalent is
  the Sentry source-map and dSYM upload.
- Release notes: `changelog.txt` ("What's new in X:" sections) is the Play "What's new" text
  (≤ 500 characters) and the TestFlight changelog.

## 2. RN requirements

- [ ] Same `applicationId` and bundle id, the same Play upload key (verify the cert SHA-256
      above) and the same Apple team. The Play App Signing key is managed by Google and does not
      change.
- [ ] Version continuity: start at a version and build **above** the last Flutter release
      (≥ 194, or higher if the Flutter app ships again meanwhile). One source of truth for
      `X.Y.Z+BUILD`.
- [ ] Environment builds: test and live (plus beta and dev locally). EnvBanner visible on
      non-LIVE builds.
- [ ] Artifact verifier for RN: confirm the JS bundle or native config contains the expected
      environment fingerprint (`macAddressHashKey`, or an env id baked at build time), the signer
      certificate, `MinimumOSVersion`, and the version and build. Port the intent of
      `verify_artifact.py` and its tests.
- [ ] Release tool: port `release.py`'s guarantees (one environment, fail fast, verify before
      upload, recoverable, tag after upload) into `react_native_app/tool/` with its tests.
- [ ] Fastlane lanes equivalent to §1, pointing at the RN build outputs.
- [ ] iOS `ExportOptions.plist` with `manageAppVersionAndBuildNumber=false`.
- [ ] Sentry: same DSN and environments; upload source maps and native symbols per release.
- [ ] Never commit secrets: keystores, `key.properties`, `key.json`, `.p8`, `.p12`, env JSON with
      keys. Extend `react_native_app/.gitignore` and confirm the root `.gitignore` covers them.

## 3. CI and hooks

- Add `.github/workflows/react_native_quality.yml`, triggered on `react_native_app/**` and the
  workflow file itself (mirroring the path filter of `flutter_code_quality.yml`). Jobs: install,
  typecheck, lint, Prettier check, Jest, and the Python tool tests if the release tool is
  Python.
- Root `.pre-commit-config.yaml`: add hooks for `^react_native_app/` (Prettier and ESLint). Do
  not alter the backend or frontend hooks.
- `main` requires no status checks (root `CLAUDE.md`), so read the CI results yourself.

## 4. Rollout and rollback (Phase 19.5)

- Staged rollout on Play (production track percentages) and phased release on the App Store.
- Rollback: rebuild the Flutter app at a **higher** build number and release it. Store build
  numbers cannot go backwards. Keep the Flutter pipeline working until the RN release is fully
  rolled out.
- Watch Sentry crash-free sessions and the notification-delivery metrics in the backend
  (`DeviceActivation.did_send`) during rollout.
