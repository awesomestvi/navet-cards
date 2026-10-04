# Navet Cards

Configurable cards for Home Assistant dashboards, using Navet's compact layout, warm state accents, and direct household controls.

This private beta contains light, switch, sensor, room, media, climate, and cover cards. Automated browser tests use a simulated host; integration checks also use isolated Home Assistant 2024.6.4 and 2026.9.4 instances with demo entities. Real household devices, companion apps, and HACS installation are acceptance gates. See [verification status](docs/verification-status.md) and [human verification](docs/human-verification.md).

## Try the cards

Use Node.js 22 or newer:

```sh
npm ci
npm run build
npm run dev
```

Open [the local preview](http://127.0.0.1:4178/demo/). The preview uses simulated devices, with theme switching, unavailable states, command failures, and a working card editor.

## Install the development build

1. Build the resource with `npm ci` and `npm run build`.
2. Copy `dist/navet-cards.js` into your Home Assistant `/config/www/` directory. If you create the `www` directory for the first time, restart Home Assistant.
3. Open your dashboard, choose **Edit dashboard**, open its menu, and select **Manage resources**. Enable Advanced mode in your Home Assistant profile if the resource menu is hidden.
4. Add `/local/navet-cards.js?v=0.1.0-beta.2` as a **JavaScript Module** resource. Update an existing Navet resource rather than registering a second copy.
5. Refresh the dashboard. Choose **Add card** and search for **Navet**.
6. Select a supported entity and configure the card in the visual editor or YAML.

For a YAML-managed resource list:

```yaml
resources:
  - url: /local/navet-cards.js?v=0.1.0-beta.2
    type: module
```

When replacing the resource, change the version in its URL and reload each browser or companion-app frontend. Keep a copy of the previous resource to roll back. Existing dashboard card configurations stay in Home Assistant.

Run `npm run package:verification` to produce a verification folder and ZIP under `dist/`, including the resource, checksum, instructions, and test status.

The repository is private, so use the manual build installation above. The HACS manifest and release workflow are prepared for a public Dashboard repository. HACS custom-repository installation and catalog submission require a publicly accessible repository and separate validation.

## Configuration

| Card type | Supported selection | Controls |
| --- | --- | --- |
| `custom:navet-light-card` | `light.*` | On/off, brightness slider and 50%/100% presets when supported |
| `custom:navet-switch-card` | `switch.*`, `input_boolean.*` | On/off |
| `custom:navet-sensor-card` | `sensor.*`, `binary_sensor.*` | Value, unit, optional attribute |
| `custom:navet-room-card` | HA area ID or explicit entities | Room status and a dialog linking to entity details |
| `custom:navet-media-card` | `media_player.*` | Play/pause and a volume popover when supported |
| `custom:navet-climate-card` | `climate.*` | Current temperature, target dial and step controls when supported |
| `custom:navet-cover-card` | `cover.*` | Open/stop/close and position when supported |

```yaml
type: custom:navet-light-card
entity: light.kitchen
name: Kitchen lights
layout: compact
show_brightness: true
appearance:
  accent: "#ea8c55"
  radius: 24
  theme: auto
tap_action:
  action: toggle
hold_action:
  action: more-info
grid_options:
  columns: 6
  rows: 3
```

Common fields:

| Field | Meaning | Default |
| --- | --- | --- |
| `entity` | Supported Home Assistant entity ID | Required on entity cards |
| `name` | Card title | Entity friendly name or area name |
| `icon` | Icon such as `mdi:lightbulb-outline` | A relevant icon for the card |
| `layout` | `compact` or `comfortable` | `compact` |
| `show_state` | Show state or sensor value | `true` |
| `show_brightness` | Show supported brightness control | `true` on light cards |
| `appearance.accent` | Six-digit hex color | Theme variable, Navet orange, or the card family accent |
| `appearance.radius` | Corner radius, 0–48 pixels | 24 pixels |
| `appearance.theme` | `auto`, `light`, `dark`, `black`, or `glass` | `auto` follows HA theme |
| `grid_options` | Home Assistant Sections placement | Card-specific sizing |

`layout` selects compact or comfortable density. Light cards use brightness presets, sensor cards emphasize the reading, climate cards show a temperature dial, media cards show available artwork with a disc fallback, and cover cards use a vertical position handle over the blind fill. Position and temperature sliders support keyboard input. The volume icon opens an in-card slider; activate the icon again to close it. Media progress is a read-only indication when duration is supplied. Home Assistant owns placement through `grid_options` on versions with Sections sizing controls. Use enough rows for the controls and wrapped titles; `rows: auto` lets Home Assistant use the card's content height. On Home Assistant 2024.6.4, Sections uses full-width custom cards. Cards also provide Masonry sizing.

### Sensors

```yaml
type: custom:navet-sensor-card
entity: sensor.kitchen_temperature
name: Temperature
```

To display an attribute, add `attribute: humidity` and, if needed, `unit: "%"`. Numeric zero is preserved. Missing, unknown, and unavailable entities show an explanation. History graphs are a planned increment requiring a bounded history query and subscription lifecycle.

### Rooms

```yaml
type: custom:navet-room-card
area: kitchen
name: Kitchen
```

Use the area's ID. Membership follows entity assignments, with device areas as a fallback. Hidden, disabled, and diagnostic entities are excluded. Registry updates are read from Home Assistant's supplied host object.

For explicit membership:

```yaml
type: custom:navet-room-card
name: Kitchen
entities:
  - light.kitchen
  - switch.coffee_machine
  - sensor.kitchen_temperature
```

An explicit entity list takes precedence over area membership and works when registry information is unavailable. **Controls** opens a keyboard-accessible room dialog. Select an entity to open Home Assistant's native details. Escape and Close dismiss the dialog.

### Actions

Light and switch titles toggle the entity by default. Other entity titles open **more-info**. The circular settings control opens Home Assistant details. Room titles open the room dialog. Buttons and sliders perform their labeled controls. Optional `tap_action`, `hold_action`, and `double_tap_action` apply to the card title. Keyboard activation performs the tap action.

Home Assistant enforces account permissions. A denied control or configured action displays a permission explanation, and **Close** dismisses it. Entity details remain available to accounts that can read the entity.

Supported actions are `none`, `more-info`, `toggle` on light/switch cards, `navigate`, and `perform-action`:

```yaml
tap_action:
  action: navigate
  navigation_path: /lovelace/kitchen
hold_action:
  action: perform-action
  perform_action: scene.turn_on
  target:
    entity_id: scene.kitchen_evening
  data:
    transition: 2
  confirmation:
    text: Activate the kitchen evening scene?
```

The visual editor configures action types, navigation paths, and action names. Use YAML for data, targets, and custom confirmation text. Advanced fields remain intact when editing other options. Confirmation supports a boolean or a text object; user exemptions are outside this initial action contract.

### Theme variables

Set these through Home Assistant themes or supported styling tools:

```yaml
Navet:
  navet-card-accent: "#ea8c55"
  navet-card-radius: "24px"
```

The cards consume `--navet-card-accent`, `--navet-card-radius`, `--navet-card-background`, `--navet-card-text`, `--navet-card-border`, and `--navet-card-font`. Per-card appearance overrides the corresponding global variable. Glass uses transparency and blur; dark and black use solid surfaces. Focus indicators and labels remain visible with reduced motion.

## Development and validation

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run build
npm run test:browser
```

`npm run check` runs all checks with Chromium installed. CI runs the same checks and saves the generated resource and test screenshots. The build bundles Lit and CSS into one JavaScript file, with a 160 kB uncompressed budget and no runtime CDN dependencies.

The test host verifies state/actions, editor field preservation, instance isolation, read-only previews, hold/double-tap behavior, context cleanup, missing/unavailable entities, recoverable failures, permission messages, a 30-card dashboard, and responsive themes. For opt-in checks against an isolated real Home Assistant backend, use the [local validation setup](docs/human-verification.md#disposable-local-test-host). Use [the release checklist](docs/release-checklist.md) for household-device, companion-app, and distribution acceptance.

## Architecture

`src/core.ts` defines provider-neutral card inputs and commands. `src/providers/home-assistant.ts` maps Home Assistant state and translates commands through an injected host. `src/card.ts` renders normalized models; `src/editor.ts` edits HA-owned configuration. Each card owns its configuration and transient interaction state. State comes through HA's `hass` property and optional states context; cards create no extra connection or credential storage.

This is an independent repository with a scoped normalization implementation informed by Navet's provider mapping and command semantics. It does not depend on files outside the repository. Its smaller card model is local to this project; the main Navet provider contracts remain unchanged. [Architecture and implementation status](docs/implementation.md).

Licensed under AGPL-3.0-only, matching Navet.
