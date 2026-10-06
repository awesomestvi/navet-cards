# Beta verification status

Build: **0.1.0-beta.3**. Verification date: **2026-10-06**.

The beta is prepared for maintainer verification by manual installation. Disposable Home Assistant containers and simulated browser fixtures establish the checks below; physical devices and companion apps need the [human verification checks](human-verification.md).

| Gate | Evidence |
| --- | --- |
| Source checks | TypeScript, 16 contract tests and 26 Chrome browser tests pass; resource 82.7 kB raw / 25.3 kB gzip, below 100 kB / 35 kB budgets |
| Backend compatibility | Service round trips pass on official Home Assistant Container 2024.6.4 and 2026.9.4 |
| Device commands | Light brightness, switches, climate target and supported HVAC mode, media volume/playback, cover position, number values and select options |
| Provider ownership | Capability-checked commands target the owning entity through the injected Home Assistant host |
| Room performance | Synthetic 20-room / 5,000-entry workload builds one shared registry index, renders zero unrelated updates, and mounts zero closed-room member controls; 100 open/close cycles release member controls |
| Rendering | Simulated composition at 390, 768 and 1280 px across four low-effects themes and high-effects glass has no measured overflow or browser errors |
| Interaction | Browser checks cover keyboard sliders, Escape, focus return, hash routing, conditional sub-controls, failed dropdown commands, unavailable state and legacy explicit card heights |
| Configuration | Native area, multiple-entity and action selectors render on both Home Assistant versions; area edits preserve the panel identifier. Advanced YAML survives editor changes |
| Distribution | Manual resource, verification ZIP, checksum and build metadata; automated release packaging prepared, publication and HACS installation pending |

Existing tests are **Keep**. Added tests cover registry reuse and invalidation, lazy room controls, declarative composition, owning service targets, capability and range validation, dropdown state, responsive containment and lifecycle cleanup. The live test uses disposable validation sessions and removes temporary helpers after checking their service round trips.

The matching historical synthetic workload measured area assignments at 0.1 ms median / 0.2 ms P95 after indexing, versus 69.6 ms / 75.5 ms before. These desktop measurements indicate reduced work, not a guarantee of latency, frame rate, GPU use or battery life on low-power devices. Browser checks use installed Chrome and viewport emulation; physical touch and WebViews remain unverified.

## Maintainer acceptance gates

- Household-device capabilities, transport failures, reconnection and registry changes.
- Low-power client frame times, responsiveness, memory, GPU cost and long-running stability.
- Companion-app WebViews, physical touch, household browsers and visual acceptance.
- Advanced YAML editing, chosen dashboard dimensions, Fahrenheit ranges and coexistence with Bubble Card.
- Household installation, cache refresh, upgrade and rollback.
- Published release resource and HACS clean install/upgrade; catalog submission is separate.

Calendars, arbitrary nested third-party cards and an executable module ecosystem remain future scope. The current composition features and ten card families do not establish complete Bubble Card feature parity. Publication requires maintainer release authorization.
