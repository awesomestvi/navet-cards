# Contributing to Navet Cards

Use [Discussions](https://github.com/awesomestvi/navet-cards/discussions) for setup help and early ideas. Open an [issue](https://github.com/awesomestvi/navet-cards/issues/new/choose) for a reproducible bug or a focused feature request. Discuss substantial changes before implementing them.

## Develop locally

Use Node.js 22 or newer:

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open http://127.0.0.1:4178/demo/ for the simulated dashboard. Run `npm run check` before submitting behavior changes; it checks types, contracts, the bundle, and Chromium interactions. See [human verification](docs/human-verification.md) for opt-in tests against a disposable Home Assistant instance.

## Submit a pull request

1. Fork the repository and create a focused branch.
2. Make the smallest change that addresses the issue. Preserve saved card configuration and advanced YAML fields.
3. Update the README when configuration or user-visible behavior changes.
4. Use Conventional Commit titles, such as `fix: preserve card appearance when editing`.
5. Explain the outcome, link the issue, and report the checks you ran. Include phone/tablet/desktop and relevant theme screenshots for UI changes, using simulated devices.

Maintainers review the current commit and CI before merging. Browser simulations do not replace household-device, companion-app, and distribution checks in the [release checklist](docs/release-checklist.md).

## Code boundaries

This repository builds independently. Normalized models belong in `src/core.ts`; raw Home Assistant state and service translation belong in `src/providers/`. Cards own appearance and transient state. Home Assistant owns configuration, authentication, layout, and device state. Follow [AGENTS.md](AGENTS.md) for detailed implementation rules.

Keep credentials, household data, and private URLs out of issues, screenshots, and commits. Participation follows the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are covered by the repository's [AGPL-3.0-only license](LICENSE).
