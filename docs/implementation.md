# Implementation status

The development collection uses native Lit custom elements with isolated Shadow DOM styles. Source, builds, configuration, tests, and distribution tooling live in this independent repository.

The standalone-repository requirement changes the audit's proposed monorepo layout. Provider-neutral card models and an injected HA adapter live locally. Their initial light command semantics follow Navet's `homeassistant-adapter.ts`; visual geometry follows Navet's compact card family and surface tokens. There is no automatic shared-package synchronization. Future shared extraction should be a versioned package with its own API and parity checks, rather than relative imports into another checkout.

## Completed development scope

- Native custom-element host, picker registration, configuration validation, visual editor, and YAML preservation.
- Light, switch, sensor, room, media, climate, and cover cards with capability-aware commands.
- Independent configuration/themes, state-reference update filtering, read-only previews, subscription cleanup, and injected service APIs.
- HA more-info and navigation actions, tap/hold/double-tap handling, optional confirmation, and recoverable command errors.
- Compact/comfortable composition, dark/light/black/glass appearances, CSS variables, keyboard controls, reduced motion, English and Swedish card strings.
- Room area/device resolution, explicit membership, and a native dialog linking to HA entity details.
- One-file resource, dependency lockfile, build budget, CI, private repository, HACS metadata, release workflow, and manual installation documentation.

The editor's advanced action labels currently use English. English is the fallback for unsupported languages. Media controls currently cover playback and volume; climate covers a single target temperature; covers expose movement and position. Their native HA details provide the richer device interface.

## Validation boundaries

Contract tests exercise validation, normalized capability state, explicit provider ownership, area resolution, command translation, and errors. Browser tests exercise actual custom elements in a simulated host, including lifecycle, gestures, visual editing, layout, and a 30-card dashboard. TypeScript and the bundled artifact are checked separately.

Live Sections/Masonry rendering, coexistence with Bubble Card, companion-app WebViews, non-admin registry availability, real service errors, fresh HA resource loading, and upgrade/rollback remain release gates. Test those before declaring stable compatibility. The current HA minimum is a target, not an empirical compatibility result.

## Next increments and evaluation

1. **Live installation beta:** follow the release checklist in an isolated Home Assistant test instance; verify the compatibility target and the current stable version.
2. **Sensor history:** reuse the supplied HA API, fetch a bounded interval once per visible entity/range, share in-flight requests, cancel/ignore obsolete responses, and revalidate HA history response contracts. Add a configurable sparkline only after that service boundary is tested.
3. **Richer room controls:** add normalized inline member controls and explicit composition. The current room dialog delegates detailed control to HA; custom nested Lovelace-card composition needs a separate host contract and focus/coexistence testing.
4. **Richer entity controls:** add light color/temperature, climate modes/range targets, media source selection/artwork, and cover tilt through capability-specific normalization and commands.
5. **Camera resources:** evaluate HA authentication and resource/stream lifecycles before adding video. Keep external artwork fetching out of generic card renderers.
6. **Navet-owned features:** chores require a separate durable backend API and an explicit optional integration dependency. A browser-only card cannot own authoritative chore state.
7. **Reusable customization:** share YAML presets first. Templates, executable modules, and a store need a versioned extension contract and local storage/update ownership. They are not needed for the initial collection and Bubble Card modules are not a supported format.

## Source references

- [Home Assistant custom-card API](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [Home Assistant frontend state and contexts](https://developers.home-assistant.io/docs/frontend/data/)
- [Home Assistant dashboard actions](https://www.home-assistant.io/dashboards/actions/)
- [HACS Dashboard repository requirements](https://www.hacs.xyz/docs/publish/plugin/)
- [Bubble Card implementation](https://github.com/Clooos/Bubble-Card/blob/main/src/bubble-card.js)
- [Navet](https://github.com/awesomestvi/navet), source audited at `2c3ad628`.
