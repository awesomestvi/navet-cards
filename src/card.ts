import { LitElement, html, nothing } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import type { CardEntity, CardKind, CardCommand } from './core';
import {
  tagFor,
  type CardConfig,
  type ActionConfig,
  domainAllowed,
  validateConfig,
} from './config';
import {
  executeCommand,
  mapEntity,
  roomEntityIds,
  kindForEntity,
  type Hass,
} from './providers/home-assistant';
import { translate } from './i18n';
import { cardStyles } from './styles';

type ContextRequest = Event & {
  context: string;
  subscribe: boolean;
  callback: (states: Hass['states'], unsubscribe?: () => void) => void;
};
const ICONS: Record<CardKind, string> = {
  light: 'mdi:lightbulb-outline',
  switch: 'mdi:power-plug-outline',
  sensor: 'mdi:gauge',
  room: 'mdi:sofa-outline',
  media: 'mdi:speaker',
  climate: 'mdi:thermostat',
  cover: 'mdi:blinds-horizontal',
};

export class NavetCard extends LitElement {
  static styles = cardStyles;
  static kind: CardKind = 'switch';
  static getConfigElement() {
    return document.createElement('navet-card-editor');
  }
  static getStubConfig(hass?: Hass) {
    const kind = this.kind;
    if (kind === 'room')
      return {
        entities: Object.keys(hass?.states ?? {})
          .filter((id) => id.startsWith('light.'))
          .slice(0, 3),
      };
    const entity = Object.keys(hass?.states ?? {}).find((id) => domainAllowed(kind, id));
    return entity ? { entity } : {};
  }
  private config?: CardConfig;
  private currentHass?: Hass;
  private states?: Hass['states'];
  private unsubscribe?: () => void;
  private error = '';
  private sliderDrafts = new Map<string, number>();
  private busy = false;
  private isPreview = false;
  private holdTimer?: ReturnType<typeof setTimeout>;
  private tapTimer?: ReturnType<typeof setTimeout>;
  private held = false;
  private pointer?: { x: number; y: number };
  private disposed = false;
  private operation = 0;
  private get kind() {
    return (this.constructor as typeof NavetCard).kind;
  }
  private get language() {
    return this.currentHass?.locale?.language ?? this.currentHass?.language ?? 'en';
  }
  private t(key: string) {
    return translate(key, this.language);
  }
  private get host(): Hass | undefined {
    return (
      this.currentHass && { ...this.currentHass, states: this.states ?? this.currentHass.states }
    );
  }
  get hass() {
    return this.currentHass;
  }
  set hass(hass: Hass | undefined) {
    const previous = this.host;
    const previousIds = this.ids(previous);
    this.currentHass = hass;
    this.states = hass?.states;
    const nextIds = this.ids(hass);
    if (
      !previous ||
      previousIds.join('|') !== nextIds.join('|') ||
      nextIds.some((id) => previous.states[id] !== hass?.states[id]) ||
      previous.language !== hass?.language ||
      previous.locale !== hass?.locale ||
      previous.themes !== hass?.themes ||
      previous.config !== hass?.config ||
      (this.kind === 'room' && previous.areas !== hass?.areas)
    )
      this.requestUpdate();
  }
  set preview(value: boolean) {
    this.isPreview = !!value;
    this.requestUpdate();
  }
  get preview() {
    return this.isPreview;
  }
  set editMode(value: boolean) {
    this.preview = value;
  }
  setConfig(input: unknown) {
    this.config = validateConfig(input, this.kind);
    this.sliderDrafts.clear();
    this.operation++;
    this.busy = false;
    this.error = '';
    this.cancelGesture();
    this.renderRoot?.querySelector<HTMLDialogElement>('dialog')?.close();
    this.requestUpdate();
  }
  private get defaultRows() {
    return this.kind === 'cover'
      ? 5
      : this.config?.layout === 'comfortable' ||
          ['light', 'sensor', 'climate', 'media'].includes(this.kind)
        ? 4
        : 3;
  }
  getCardSize() {
    return Math.ceil((this.defaultRows * 56 + (this.defaultRows - 1) * 8) / 50);
  }
  getGridOptions() {
    return {
      columns: 6,
      min_columns: 3,
      rows: this.defaultRows,
      min_rows: this.defaultRows,
      ...this.config?.grid_options,
    };
  }
  connectedCallback() {
    super.connectedCallback();
    this.disposed = false;
    const event = new Event('context-request', {
      bubbles: true,
      composed: true,
      cancelable: true,
    }) as ContextRequest;
    event.context = 'states';
    event.subscribe = true;
    event.callback = (states, unsubscribe) => {
      if (this.disposed) {
        unsubscribe?.();
        return;
      }
      if (unsubscribe && unsubscribe !== this.unsubscribe) {
        this.unsubscribe?.();
        this.unsubscribe = unsubscribe;
      }
      const previous = this.states;
      this.states = states;
      if (!previous || this.ids(this.host).some((id) => previous[id] !== states[id]))
        this.requestUpdate();
    };
    this.dispatchEvent(event);
  }
  disconnectedCallback() {
    this.disposed = true;
    this.operation++;
    this.busy = false;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.cancelGesture();
    this.renderRoot.querySelector<HTMLDialogElement>('dialog')?.close();
    super.disconnectedCallback();
  }
  private ids(hass?: Hass) {
    return this.kind === 'room' && hass
      ? roomEntityIds(hass, this.config?.area, this.config?.entities)
      : this.config?.entity
        ? [this.config.entity]
        : [];
  }
  private entity(id = this.config?.entity ?? '', kind = this.kind): CardEntity {
    return mapEntity(
      this.host?.states[id],
      kind,
      id,
      this.host,
      this.config?.attribute,
      this.config?.unit,
    );
  }
  private get disabled() {
    return this.isPreview || this.busy || !this.host;
  }
  private moreInfo(id = this.config?.entity) {
    if (!id || this.isPreview) return;
    this.dispatchEvent(
      new CustomEvent('hass-more-info', {
        detail: { entityId: id },
        bubbles: true,
        composed: true,
      }),
    );
  }
  private async run(work: () => Promise<unknown>) {
    if (this.disabled) return;
    const operation = ++this.operation;
    this.busy = true;
    this.error = '';
    this.requestUpdate();
    try {
      await work();
    } catch (error) {
      if (!this.disposed && operation === this.operation)
        this.error = error instanceof Error ? error.message : this.t('error');
    } finally {
      if (!this.disposed && operation === this.operation) {
        this.busy = false;
        this.requestUpdate();
      }
    }
  }
  private async command(command: CardCommand, entity = this.entity()) {
    if (this.host) await this.run(() => executeCommand(this.host!, entity, command));
  }
  private async perform(action?: ActionConfig) {
    if (this.disabled) return;
    if (!action) {
      this.kind === 'room' ? await this.openRoom() : this.moreInfo();
      return;
    }
    if (
      action.confirmation &&
      !window.confirm(
        typeof action.confirmation === 'object'
          ? (action.confirmation.text ?? 'Run this action?')
          : 'Run this action?',
      )
    )
      return;
    switch (action.action) {
      case 'toggle':
        this.command({ type: 'toggle' });
        break;
      case 'more-info':
        this.moreInfo();
        break;
      case 'navigate':
        history.pushState(null, '', action.navigation_path!);
        window.dispatchEvent(new Event('location-changed'));
        break;
      case 'perform-action': {
        const [domain, service] = action.perform_action!.split('.');
        await this.run(() =>
          this.host!.callService(
            domain,
            service,
            action.data ?? {},
            action.target ?? (this.config?.entity ? { entity_id: this.config.entity } : {}),
          ),
        );
        break;
      }
    }
  }
  private primaryClick(event: MouseEvent) {
    if (this.held) {
      this.held = false;
      return;
    }
    if (event.detail === 0 || !this.config?.double_tap_action) {
      void this.perform(this.config?.tap_action);
      return;
    }
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
      this.tapTimer = undefined;
      void this.perform(this.config.double_tap_action);
    } else
      this.tapTimer = setTimeout(() => {
        this.tapTimer = undefined;
        void this.perform(this.config?.tap_action);
      }, 280);
  }
  private pointerDown(event: PointerEvent) {
    this.held = false;
    if (event.button !== 0 || !this.config?.hold_action || this.disabled) return;
    this.pointer = { x: event.clientX, y: event.clientY };
    this.holdTimer = setTimeout(() => {
      this.held = true;
      this.holdTimer = undefined;
      if (this.tapTimer) clearTimeout(this.tapTimer);
      this.tapTimer = undefined;
      void this.perform(this.config?.hold_action);
    }, 500);
  }
  private pointerMove(event: PointerEvent) {
    if (
      this.pointer &&
      Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y) > 10
    ) {
      this.cancelHold();
      this.held = true;
    }
  }
  private cancelHold() {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTimer = undefined;
    this.pointer = undefined;
  }
  private cancelGesture() {
    this.cancelHold();
    if (this.tapTimer) clearTimeout(this.tapTimer);
    this.tapTimer = undefined;
    this.held = false;
  }
  private async openRoom() {
    await this.updateComplete;
    if (!this.disposed && !this.isPreview)
      this.renderRoot.querySelector<HTMLDialogElement>('dialog')?.showModal();
  }
  private closeRoom() {
    this.renderRoot.querySelector<HTMLDialogElement>('dialog')?.close();
  }
  private slider(entity: CardEntity, type: 'brightness' | 'volume' | 'temperature' | 'position') {
    if (
      !entity.capabilities.includes(type) ||
      (type === 'brightness' && this.config?.show_brightness === false)
    )
      return nothing;
    const value = this.sliderDrafts.get(type) ?? entity[type] ?? 0;
    const unit =
      type === 'temperature' ? (this.host?.config?.unit_system?.temperature ?? '°C') : '%';
    return html`<label class="slider"><span class="slider-label"><span>${this.t(type)}</span><output>${value}${unit}</output></span>
      <input type="range" aria-label=${this.t(type)} min=${type === 'temperature' ? entity.minTemperature! : 0} max=${type === 'temperature' ? entity.maxTemperature! : 100} step=${type === 'temperature' ? entity.stepTemperature! : 1} .value=${String(value)} ?disabled=${this.disabled || !entity.available}
        @input=${(e: Event) => {
          this.sliderDrafts.set(type, Number((e.target as HTMLInputElement).value));
          this.requestUpdate();
        }}
        @change=${(e: Event) => {
          void this.command(
            { type, value: Number((e.target as HTMLInputElement).value) },
            entity,
          ).finally(() => {
            this.sliderDrafts.delete(type);
            this.requestUpdate();
          });
        }} />
    </label>`;
  }
  protected render() {
    if (!this.config) return nothing;
    const config = this.config;
    const entity = this.entity();
    const host = this.host;
    const ids = this.ids(host);
    const members = this.kind === 'room' ? ids.map((id) => this.entity(id, kindForEntity(id))) : [];
    const active =
      this.kind === 'room'
        ? members.some((e) => e.active && e.available)
        : entity.active && entity.available;
    const name =
      config.name ??
      (this.kind === 'room' ? (host?.areas?.[config.area ?? '']?.name ?? 'Room') : entity.name);
    const value = !host
      ? this.t('loading')
      : !entity.available
        ? this.t(entity.state)
        : this.kind === 'sensor'
          ? entity.value
          : this.t(entity.state);
    const appearance = config.appearance;
    const styles = {
      '--navet-card-accent': appearance?.accent,
      '--navet-card-radius':
        appearance?.radius !== undefined ? `${appearance.radius}px` : undefined,
    };
    return html`<div class="card" style=${styleMap(styles)} data-theme=${appearance?.theme ?? 'auto'} data-layout=${config.layout ?? 'compact'} ?data-active=${active} aria-busy=${this.busy}>
      <button class="primary" ?disabled=${this.disabled} aria-label=${name}
        @click=${this.primaryClick} @pointerdown=${this.pointerDown} @pointermove=${this.pointerMove} @pointerup=${this.cancelHold} @pointerleave=${this.cancelHold} @pointercancel=${() => {
          this.cancelHold();
          this.held = true;
        }} @contextmenu=${(e: Event) => {
          if (config.hold_action) e.preventDefault();
        }}>
        <span class="icon"><ha-icon .icon=${config.icon ?? ICONS[this.kind]}></ha-icon></span>
        <span class="labels"><span class="name">${name}</span>
          ${config.show_state === false ? nothing : html`<span class="state">${this.kind === 'room' ? `${members.filter((e) => e.active && e.available).length} ${this.t('active')} · ${ids.length} ${this.t('entities')}` : !host || !entity.available ? value : (entity.subtitle ?? (this.kind === 'sensor' ? nothing : value))}</span>`}
        </span><span class="status-dot" aria-hidden="true"></span>
      </button>
      ${this.kind === 'sensor' && config.show_state !== false ? html`<div class=${`metric ${value.length > 10 ? 'long' : ''}`}><span>${value}</span>${entity.available ? html`<span class="unit">${entity.unit}</span>` : nothing}</div>` : nothing}
      ${this.kind === 'light' ? this.slider(entity, 'brightness') : nothing}
      ${this.kind === 'media' ? this.slider(entity, 'volume') : nothing}
      ${this.kind === 'climate' ? this.slider(entity, 'temperature') : nothing}
      ${this.kind === 'cover' ? this.slider(entity, 'position') : nothing}
      ${this.kind === 'room' && !ids.length ? html`<p class="notice">${this.t(config.area && !host?.entities ? 'roomUnavailable' : 'roomEmpty')}</p>` : nothing}
      <div class="actions">
        ${entity.capabilities.includes('toggle') ? html`<button class="action accent" ?disabled=${this.disabled || !entity.available} @click=${() => this.command({ type: 'toggle' })}>${this.t(entity.active ? 'off' : 'on')}</button>` : nothing}
        ${this.kind === 'media' && entity.capabilities.includes(entity.state === 'playing' ? 'pause' : 'play') ? html`<button class="action accent" ?disabled=${this.disabled || !entity.available} @click=${() => this.command({ type: 'play_pause' })}>${this.t(entity.state === 'playing' ? 'pause' : 'play')}</button>` : nothing}
        ${this.kind === 'cover' ? (['open', 'stop', 'close'] as const).filter((type) => entity.capabilities.includes(type)).map((type) => html`<button class="action" ?disabled=${this.disabled || !entity.available} @click=${() => this.command({ type })}>${this.t(type)}</button>`) : nothing}
        ${this.kind === 'room' ? html`<button class="action" ?disabled=${this.disabled || !ids.length} @click=${this.openRoom}>${this.t('controls')}</button>` : html`<button class="action" ?disabled=${this.disabled} @click=${() => this.moreInfo()}>${this.t('details')}</button>`}
      </div>
      ${
        this.error
          ? html`<div class="error-row"><p class="notice error" role="alert">${this.error}</p><button class="dismiss" aria-label=${this.t('close')} @click=${() => {
              this.error = '';
              this.requestUpdate();
            }}>×</button></div>`
          : nothing
      }
      ${
        this.kind === 'room'
          ? html`<dialog aria-labelledby="room-title" @click=${(e: Event) => {
              if (e.target === e.currentTarget) this.closeRoom();
            }}>
        <div class="dialog-header"><h2 id="room-title">${name}</h2><button class="action" aria-label=${this.t('close')} @click=${this.closeRoom}>×</button></div>
        <div class="room-list">${members.map(
          (member) =>
            html`<button class="room-row" @click=${() => {
              this.closeRoom();
              this.moreInfo(member.externalId);
            }}><span>${member.name}</span><span>${member.available ? this.t(member.state) : this.t(member.state)}${member.unit ? ` ${member.unit}` : ''}</span></button>`,
        )}</div>
        <div class="dialog-footer"><button class="action accent" @click=${this.closeRoom}>${this.t('close')}</button></div>
      </dialog>`
          : nothing
      }
    </div>`;
  }
}
