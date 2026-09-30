# Release checklist

## Automated evidence

- Install from the lockfile with `npm ci`.
- Run `npm run check` with Chromium available.
- Verify `dist/navet-cards.js` stays under the bundle budget and embeds the package version.
- Review phone/tablet/desktop and light/dark/black/glass screenshots, long titles, missing entities, and command errors.

## Isolated Home Assistant validation

- Install the resource on the compatibility-target version and current stable Home Assistant.
- Add each card through the picker and through YAML in Sections and Masonry views.
- Resize cards, edit/save/reload repeatedly, and verify wrapped titles and all controls remain visible.
- Mix cards with built-in cards and Bubble Card; check styles, events, dialogs, and URL navigation.
- Confirm no extra login/socket is created and non-admin users see clear capability/registry behavior.
- Exercise service success, permission denial, unavailable state, reconnection, entity removal, and registry changes.
- Verify light brightness, input_boolean switching, media feature combinations, Celsius/Fahrenheit climate ranges, and cover position against real HA service calls in the test instance.
- Verify keyboard activation, hold/double-tap, touch scrolling, focus return, Escape, reduced motion, and companion-app WebViews.
- Verify a 30-card dashboard stays responsive during unrelated state updates.

## Distribution validation

- Verify a clean manual install, versioned resource refresh, upgrade, and rollback.
- Keep the repository private during development. To offer HACS installation to users, publish the repository and validate it as a Dashboard custom repository.
- Verify HACS installs the single `navet-cards.js` resource from the release, registers it, and upgrades it correctly.
- Set the supported Home Assistant minimum from live evidence, then align `hacs.json` and README.
- Record tested HA/browser/app versions and unresolved issues in release notes.
- Publish a prerelease only after these gates pass; default HACS catalog inclusion is a separate submission.
