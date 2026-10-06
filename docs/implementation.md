# Implementation status

The development collection uses native Lit custom elements with isolated Shadow DOM styles. Source, builds, configuration, tests, and distribution tooling live in this independent repository.

Provider-neutral card models and an injected HA adapter live locally. Light command semantics follow Navet's `homeassistant-adapter.ts`; visual geometry follows Navet's compact card family and surface tokens. Shared extraction requires a versioned package with its own API and parity checks.

## Completed development scope

- Native custom-element host, picker registration, configuration validation, visual editor, and YAML preservation.
- Light, switch, sensor, room, media, climate, cover, number, select, and navigation cards with capability-aware commands.
- Independent configuration/themes, state-reference update filtering, read-only previews, subscription cleanup, and injected service APIs.
- HA more-info and navigation actions, tap/hold/double-tap handling, optional confirmation, and recoverable command errors.
- Compact/comfortable/row composition, dark/light/black/glass appearances, CSS variables, keyboard controls, reduced motion, English and Swedish card strings.
- Shared room area/device index, explicit membership, lazy direct room controls, hash-linked panels and native HA entity details.
- Typed sub-controls, declarative visibility conditions, appearance presets and low/high effects.
- HA-owned visual selectors with standalone fallbacks; selector options are rebuilt for registry changes.
- One-file resource, dependency lockfile, build budget, CI, public repository, HACS metadata, release workflow, and manual installation documentation.

The editor's advanced action labels currently use English. English is the fallback for unsupported languages. Media exposes supported playback, volume, skip, mute and sources; climate exposes a single target and HVAC mode; covers expose movement and position. Light color temperature, number ranges and select options are normalized at the provider boundary. Native HA details provide other device settings.

## Validation boundaries

Contract tests exercise validation, normalized capability state, explicit provider ownership, area resolution, command translation, and errors. Browser tests exercise actual custom elements in a simulated host, including lifecycle, gestures, visual editing, layout, and a 30-card dashboard. TypeScript and the bundled artifact are checked separately.

Isolated Home Assistant 2024.6.4 and 2026.9.4 checks exercise real backend services, area registries, household-member access, and read-only service denial using demo entities. Rendered Home Assistant checks cover Sections/Masonry, native details, the visual editor, saved configuration, responsive sizing, and versioned resource loading. See the [verification status](verification-status.md) for the scope of evidence.

Household devices, coexistence with Bubble Card, companion-app WebViews, and public HACS installation/upgrade remain acceptance gates. The beta resource and [human verification guide](human-verification.md) are prepared for that evaluation.

## Next increments and evaluation

1. **Household beta acceptance:** follow the human verification guide with real devices and companion apps, then complete the public-distribution gates in the release checklist.
2. **Sensor history:** reuse the supplied HA API, fetch a bounded interval once per visible entity/range, share in-flight requests, cancel/ignore obsolete responses, and revalidate HA history response contracts. Add a configurable sparkline only after that service boundary is tested.
3. **Nested Lovelace composition:** evaluate a separate host contract and focus/coexistence behavior before adding third-party cards to room panels.
4. **Further device capabilities:** evaluate light color, climate range targets and cover tilt through capability-specific normalization and commands.
5. **Camera resources:** evaluate HA authentication and resource/stream lifecycles before adding video. Keep external artwork fetching out of generic card renderers.
6. **Navet-owned features:** chores require a separate durable backend API and an explicit optional integration dependency. A browser-only card cannot own authoritative chore state.
7. **Extensions and calendars:** use the declarative presets and conditions for reusable configuration. Evaluate bounded calendar fetching and a separately loaded, versioned extension contract before adding executable modules or a store.

## Source references

- [Home Assistant custom-card API](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [Home Assistant frontend state and contexts](https://developers.home-assistant.io/docs/frontend/data/)
- [Home Assistant dashboard actions](https://www.home-assistant.io/dashboards/actions/)
- [HACS Dashboard repository requirements](https://www.hacs.xyz/docs/publish/plugin/)
- [Bubble Card implementation](https://github.com/Clooos/Bubble-Card/blob/main/src/bubble-card.js)
- [Navet](https://github.com/navet-app/navet), source audited at `2c3ad628`.
