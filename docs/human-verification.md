# Human verification

Use `dist/verification-0.1.0-beta.2/navet-cards.js` for this verification build. The folder also contains installation instructions, release notes, test status, build metadata, and `SHA256SUMS`.

## Install on your Home Assistant

1. Keep a copy of your existing dashboard configuration and any previous Navet Cards resource.
2. Copy `navet-cards.js` into `/config/www/`.
3. Add `/local/navet-cards.js?v=0.1.0-beta.2` as a JavaScript Module in dashboard resources. If a Navet Cards resource already exists, update its URL so only one resource is registered.
4. Reload the frontend, add a Navet card through the card picker, and select a device you can safely operate.
5. Check the flows below in desktop browsers and the Home Assistant companion app you use.

Verify the copy with `shasum -a 256 -c SHA256SUMS` from the verification folder. For rollback, restore the previous file and resource URL, then reload the frontend.

## Household checks

- Light: on/off, brightness, a binary light, an unavailable device, and a real command failure.
- Switch: on/off for a switch and an input boolean.
- Sensor: a numeric value, zero, a binary sensor, an attribute, missing entity, and unavailable entity.
- Room: an area and an explicit entity list; open Controls, open native Details, press Escape, and check focus returns.
- Media: playback and volume on devices with different supported controls.
- Climate: a target temperature in your installation's units, allowed limits, and a device without a single target temperature.
- Cover: open, stop, close, and position where supported.
- Editing: change appearance/actions, save, close, reopen, save again, and reload. Confirm advanced YAML fields stay intact.
- Layout: Sections and Masonry, long titles, your smallest phone/tablet, dark/light themes, and mixed built-in/custom cards.
- Input: keyboard focus, tap, hold, double tap, scrolling across sliders, reduced motion, and dialogs in the companion app.
- Accounts: a household member and any restricted accounts used at home.
- Upgrade: replace a resource with the versioned build URL, reload all frontends, then verify rollback.

Record the Home Assistant version, browser or companion-app version, card configuration, expected behavior, actual behavior, and a screenshot for any issue.

## Disposable local test host

Docker and Node.js 22 or newer are required. From this repository:

```sh
npm ci
npm run build
npm run ha:validation -- 2026.9.4 18124
NAVET_HA_SESSION=.ha-validation/2026.9.4/session.json npm run test:live
```

The setup binds to `127.0.0.1`, uses demo devices, and creates a dedicated dashboard with Masonry, Sections, 30 cards across five themes, and missing entities. It creates administrator, household-member, and read-only test users. Generated credentials are in the ignored `.ha-validation/<version>/session.json`; keep that file private. Open the URL printed by the setup and sign in with a test user. Existing containers and saved sessions are preserved; setup refuses to reset them.

Use `2024.6.4 18125` to check the compatibility target separately. Stop containers with `docker stop navet-cards-ha-2026-9-4 navet-cards-ha-2024-6-4` after verification. Resume them with `docker start` using the same names.

## Acceptance

Accept the private beta after household device and companion-app checks pass. Public HACS installation requires a publicly accessible repository, a release resource, and a separate clean-install/upgrade check. Keep distribution private until the maintainer approves publication.
