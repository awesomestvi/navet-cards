# Navet Cards

**Everyday home controls, right in your Home Assistant dashboard.**

[![Validate cards](https://github.com/navet-app/navet-cards/actions/workflows/ci.yml/badge.svg)](https://github.com/navet-app/navet-cards/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

Turn on the kitchen lights, check the temperature, adjust the heating, or pause the music from compact cards with warm state accents. Add them to the Home Assistant dashboard you already use and configure each card through the visual editor or YAML.

Navet Cards includes **light, switch, sensor, room, media, climate, cover, number, select, and navigation** cards. Choose compact, comfortable, or row layouts and automatic, light, dark, black, or glass themes. Controls follow each entity's supported capabilities.

![Navet device cards, room controls and navigation in a simulated dark dashboard](docs/images/composition.png)

*Preview with simulated devices. Home Assistant owns your dashboard layout and device state.*

[Install the beta](#install-the-beta) · [Configure a card](#configuration) · [Ask for help](https://github.com/navet-app/navet-cards/discussions) · [Report a bug](https://github.com/navet-app/navet-cards/issues/new/choose)

## Before you install

Navet Cards is an early beta for **Home Assistant 2024.6.4 or newer**. It runs inside Home Assistant's dashboard (also called Lovelace), using your existing login and device connections. Build it with Node.js 22 or newer; Node.js is only needed on the computer building the resource.

This collection is a companion to [Navet](https://github.com/navet-app/navet), the standalone smart-home dashboard. You can use Navet Cards independently in Home Assistant. The collection focuses on device controls; room dialogs open Home Assistant's entity details, and advanced controls such as light color are available there.

Automated checks cover a simulated browser host and isolated Home Assistant 2024.6.4 and 2026.9.4 instances with demo entities. Household devices, companion apps, and HACS installation still need acceptance testing. Read the [verification status](docs/verification-status.md) for the evidence and remaining checks.

## Try the cards

Use Node.js 22 or newer:

```sh
npm ci
npm run build
npm run dev
```

Open [the local preview](http://127.0.0.1:4178/demo/) or the [composition preview](http://127.0.0.1:4178/demo/composition.html). The preview uses simulated devices, with theme switching, unavailable states, command failures, and a working card editor.

## Install the beta

1. Obtain `navet-cards.js` from a tested release or verification bundle. To build the resource from source:

   ```sh
   git clone https://github.com/navet-app/navet-cards.git
   cd navet-cards
   npm ci
   npm run build
   ```

2. Copy `dist/navet-cards.js` into your Home Assistant `/config/www/` directory. If you create the `www` directory for the first time, restart Home Assistant.
3. Open your dashboard, choose **Edit dashboard**, open its menu, and select **Manage resources**. Enable Advanced mode in your Home Assistant profile if the resource menu is hidden.
4. Add `/local/navet-cards.js?v=0.1.0-beta.3` as a **JavaScript Module** resource. Update an existing Navet resource rather than registering a second copy.
5. Refresh the dashboard. Choose **Add card** and search for **Navet**.
6. Select a supported entity and configure the card in the visual editor or YAML.

For a YAML-managed resource list:

```yaml
resources:
  - url: /local/navet-cards.js?v=0.1.0-beta.3
    type: module
```

When replacing the resource, change the version in its URL and reload each browser or companion-app frontend. Keep a copy of the previous resource to roll back. Existing dashboard card configurations stay in Home Assistant.

Run `npm run package:verification` to produce a verification folder and ZIP under `dist/`, including the resource, checksum, instructions, and test status.

### HACS distribution

Use the manual installation above for this beta. HACS needs a downloadable `navet-cards.js` in the repository or a GitHub release; this repository builds the file locally and has no published release asset yet.

The [HACS Dashboard manifest](hacs.json) and prerelease workflow are included. When a tested release asset is available, add `https://github.com/navet-app/navet-cards` through HACS **Custom repositories**, with type **Dashboard**. Follow the [HACS custom-repository guide](https://www.hacs.xyz/docs/faq/custom_repositories/). Clean installation and upgrade must be verified before recommending this route. Default HACS catalog inclusion is a separate submission.

## Configuration

| Card type | Supported selection | Controls |
| --- | --- | --- |
| `custom:navet-light-card` | `light.*` | On/off, brightness presets, and color temperature when supported |
| `custom:navet-switch-card` | `switch.*`, `input_boolean.*` | On/off |
| `custom:navet-sensor-card` | `sensor.*`, `binary_sensor.*` | Value, unit, optional attribute |
| `custom:navet-room-card` | HA area ID or explicit entities | Room status, lazy direct controls, and entity details |
| `custom:navet-media-card` | `media_player.*` | Playback, volume, skip, mute, and source selection when supported |
| `custom:navet-climate-card` | `climate.*` | Current temperature, visible target slider, steps, and heating mode when supported |
| `custom:navet-cover-card` | `cover.*` | Open/stop/close and position when supported |
| `custom:navet-number-card` | `number.*`, `input_number.*` | Value slider with native limits, step and unit |
| `custom:navet-select-card` | `select.*`, `input_select.*` | Advertised options |
| `custom:navet-navigation-card` | Local paths or room hashes | Named navigation buttons |

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
| `layout` | `compact`, `comfortable`, or `row` | `compact` |
| `show_state` | Show state or sensor value | `true` |
| `show_brightness` | Show supported brightness control | `true` on light cards |
| `appearance.accent` | Six-digit hex color | Theme variable, Navet orange, or the card family accent |
| `appearance.radius` | Corner radius, 0–48 pixels | 24 pixels |
| `appearance.preset` | `warm`, `neutral`, or `cool`; accent can override it | `warm` |
| `appearance.effects` | `low` uses opaque glass and simpler decoration; `high` enables glass blur | `low` |
| `panel_id` | Unique room hash such as `#kitchen` | Optional on room cards |
| `sub_controls` | Up to eight entity controls | Empty |
| `appearance.theme` | `auto`, `light`, `dark`, `black`, or `glass` | `auto` follows HA theme |
| `grid_options` | Home Assistant Sections placement | Card-specific sizing |

`row` presents identity and state with a **Controls** disclosure for entity actions. `compact` and `comfortable` keep family controls on the card. Climate targets use a visible slider and step buttons. Comfortable climate/light layouts expose heating mode and light color temperature; row disclosures and room panels also expose supported device controls. The media controls popover contains volume, skip, mute and sources when supported. Media progress is a read-only indication when duration is supplied. Sliders send a command when a change is committed, and support keyboard input.

Home Assistant owns placement through `grid_options` on versions with Sections sizing. Use enough rows for controls and wrapped titles; `rows: auto` lets HA follow content height when disclosures expand or sub-controls are present. On Home Assistant 2024.6.4, Sections uses full-width custom cards. Cards also provide Masonry sizing.

### Sensors

```yaml
type: custom:navet-sensor-card
entity: sensor.kitchen_temperature
name: Temperature
```

To display an attribute, add `attribute: humidity` and, if needed, `unit: "%"`. Numeric zero is preserved. Missing, unknown, and unavailable entities show an explanation.

### Rooms

```yaml
type: custom:navet-room-card
area: kitchen
name: Kitchen
```

Select the area by name in the visual editor, or use its ID in YAML. Membership follows entity assignments, with device areas as a fallback. Hidden, disabled, and diagnostic entities are excluded. Registry updates are read from Home Assistant's supplied host object.

For explicit membership:

```yaml
type: custom:navet-room-card
name: Kitchen
entities:
  - light.kitchen
  - switch.coffee_machine
  - sensor.kitchen_temperature
```

An explicit entity list takes precedence over area membership and works when registry information is unavailable. **Controls** opens a keyboard-accessible room dialog with supported toggles, sliders, playback, cover actions, and option controls. Select a member's name to open native HA details. Escape and Close dismiss the dialog and release its member controls.

### Navigation and sub-controls

Give a room `panel_id: "#kitchen"` to open it from a navigation card in the same view:

```yaml
type: custom:navet-navigation-card
links:
  - name: Kitchen
    path: "#kitchen"
  - name: Home
    path: /lovelace/home
```

Use unique room hashes within a view. Navigation activates the matching room; Escape and Close clear its hash. Local paths follow Home Assistant's dashboard navigation.

Add small controls to an existing card through **Sub-controls** in the visual editor or YAML:

```yaml
type: custom:navet-light-card
entity: light.kitchen
layout: row
sub_controls:
  - entity: switch.coffee_machine
    name: Coffee
    control: toggle
  - entity: sensor.kitchen_temperature
    control: state
    visible_when:
      entity: input_boolean.show_room_readings
      state: "on"
```

`control` accepts `state`, `toggle`, `slider`, or `select`. Controls appear only for supported capabilities. The name opens entity details; an optional `tap_action` changes that behavior and defaults action targets to the sub-control's entity. `visible_when` compares one entity's state. Conditions and action data can be set in YAML and survive visual editing.

Number and select cards use the same `entity`, `layout`, and appearance fields. Number sliders preserve the entity's minimum, maximum, step, and unit; selects show the options supplied by the device.

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

The visual editor uses Home Assistant selectors for areas, entities, and actions when the host supplies them. The standalone preview provides basic fields. Use YAML for advanced values that are not exposed by a selector. Advanced fields remain intact when editing other options. Confirmation supports a boolean or a text object; user exemptions are outside this initial action contract.

### Theme variables

Set these through Home Assistant themes or supported styling tools:

```yaml
Navet:
  navet-card-accent: "#ea8c55"
  navet-card-radius: "24px"
```

The cards consume `--navet-card-accent`, `--navet-card-radius`, `--navet-card-background`, `--navet-card-text`, `--navet-card-border`, and `--navet-card-font`. Per-card appearance overrides the corresponding global variable. Glass with `effects: high` uses transparency and blur. Low effects use opaque glass and simpler decoration; all controls and information remain available. Dark and black use solid surfaces. Focus indicators and labels remain visible with reduced motion.

## Development and validation

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run build
npm run test:browser
```

`npm run check` runs all checks with Chromium installed. To use installed Chrome and a free preview port, run `NAVET_BROWSER_CHANNEL=chrome NAVET_PREVIEW_PORT=4187 npm run check`. CI runs the same checks and saves the generated resource and test screenshots. The build bundles Lit and CSS into one JavaScript file, with 100 kB raw and 35 kB gzip budgets and no runtime CDN dependencies.

The test host verifies a shared registry index, lazy room controls, a 20-room/5,000-entry update workload, 100 panel open/close cycles, state/actions, editor field preservation, instance isolation, read-only previews, hold/double-tap behavior, context cleanup, missing/unavailable entities, recoverable failures, permission messages, a 30-card dashboard, and responsive themes. For opt-in checks against an isolated real Home Assistant backend, use the [local validation setup](docs/human-verification.md#disposable-local-test-host). Use [the release checklist](docs/release-checklist.md) for household-device, companion-app, and distribution acceptance.

## Architecture

`src/core.ts` defines provider-neutral card inputs and commands. `src/providers/home-assistant.ts` maps Home Assistant state and translates commands through an injected host. `src/card.ts` renders normalized models; `src/editor.ts` edits HA-owned configuration. Each card owns its configuration and transient interaction state. State comes through HA's `hass` property and optional states context; cards create no extra connection or credential storage.

This is an independent repository with a scoped normalization implementation informed by Navet's provider mapping and command semantics. It does not depend on files outside the repository. Its smaller card model is local to this project; the main Navet provider contracts remain unchanged. [Architecture and implementation status](docs/implementation.md).

## Help and contributions

Ask setup questions and share dashboard ideas in [Discussions](https://github.com/navet-app/navet-cards/discussions). Use [Issues](https://github.com/navet-app/navet-cards/issues/new/choose) for reproducible bugs, device compatibility reports, and feature requests. Include the card version, Home Assistant version, and a minimal card configuration.

See [Contributing](CONTRIBUTING.md) for development and pull requests, the [Code of Conduct](CODE_OF_CONDUCT.md) for community participation, and the [Security policy](SECURITY.md) for private vulnerability reports.

Licensed under [AGPL-3.0-only](LICENSE).
