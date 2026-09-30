# Navet Cards working guide

This is an independent Home Assistant custom-card repository. Source must build from this repository and its lockfile. Do not add relative dependencies on a neighboring Navet checkout.

- `src/core.ts`: normalized provider-neutral card models and commands.
- `src/providers/`: raw provider state, capability mapping, and command translation.
- `src/card.ts` and `src/styles.ts`: presentation and lifecycle.
- `src/editor.ts` and `src/config.ts`: HA-owned configuration and validation.
- `demo/`: explicitly simulated host, not a live integration claim.

Keep raw HA payloads and service translation in the provider/host boundary. Keep appearance and transient state per card. Never mutate user configuration, global theme styles, or app settings. Dispose listeners/subscriptions on disconnect. Preserve advanced YAML fields in visual editing. Use capability checks before showing controls or sending commands.

Use Conventional Commits. Run `npm run check` for behavior changes. Inspect relevant screenshots for UI work. Browser simulation does not replace the live release checklist. Update README for lasting user-visible configuration or behavior changes. Keep public distribution private until the maintainer authorizes publication. Never bypass commit/push hooks.
