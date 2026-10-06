import { LitElement, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { CardEntity, CardKind, CardCommand } from './core';
import { PermissionDeniedError } from './core';
import {
  tagFor,
  type CardConfig,
  type ActionConfig,
  domainAllowed,
  validateConfig,
} from './config';
import {
  executeCommand,
  prepareHostEditor,
  callHostService,
  mapEntity,
  roomEntityIds,
  kindForEntity,
  type Hass,
} from './providers/home-assistant';
import { translate } from './i18n';
import { cardStyles } from './styles';
import { icon } from './icons';

type ContextRequest = Event & {
  context: string;
  subscribe: boolean;
  callback: (states: Hass['states'], unsubscribe?: () => void) => void;
};

export class NavetCard extends LitElement {
  static styles = cardStyles;
  static kind: CardKind = 'switch';
  static async getConfigElement() {
    await prepareHostEditor();
    return document.createElement('navet-card-editor');
  }
  static getStubConfig(hass?: Hass) {
    const kind = this.kind;
    if (kind === 'navigation') return { links: [{ name: 'Home', path: '/lovelace/0' }] };
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
  private roomOpen = false;
  private roomOpener?: HTMLElement;
  private syncPanel = () => {
    if (this.kind !== 'room' || !this.config?.panel_id || this.isPreview || this.disposed) return;
    if (location.hash === this.config.panel_id) void this.openRoom();
    else if (this.roomOpen) this.closeRoom(false);
  };
  private failedArtwork?: string;
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
    if (this.isConnected) this.syncPanel();
  }
  set preview(value: boolean) {
    this.isPreview = !!value;
    if (this.isPreview && this.roomOpen) this.closeRoom(false);
    this.requestUpdate();
    if (!this.isPreview && this.isConnected) this.syncPanel();
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
    this.failedArtwork = undefined;
    this.operation++;
    this.busy = false;
    this.error = '';
    this.cancelGesture();
    this.roomOpen = false;
    this.renderRoot?.querySelector<HTMLDialogElement>('dialog')?.close();
    this.requestUpdate();
    if (this.isConnected) this.syncPanel();
  }
  private get defaultRows() {
    if (this.kind === 'navigation' || this.config?.layout === 'row') return 2;
    if (this.kind === 'climate' || this.kind === 'media') return 5;
    if (this.config?.layout === 'comfortable' || this.kind === 'cover')
      return 4;
    return this.kind === 'switch' ? 2 : 3;
  }
  getCardSize() {
    return Math.ceil((this.defaultRows * 56 + (this.defaultRows - 1) * 8) / 50);
  }
  getGridOptions() {
    return {
      columns: 6,
      min_columns: 6,
      rows: this.config?.sub_controls?.length || this.config?.layout === 'row' ? 'auto' : this.defaultRows,
      min_rows: this.defaultRows,
      ...this.config?.grid_options,
    };
  }
  connectedCallback() {
    super.connectedCallback();
    this.disposed = false;
    if (this.kind === 'room') {
      for (const type of ['hashchange', 'popstate', 'location-changed']) window.addEventListener(type, this.syncPanel);
      this.syncPanel();
    }
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
    for (const type of ['hashchange', 'popstate', 'location-changed']) window.removeEventListener(type, this.syncPanel);
    this.roomOpen = false;
    this.sliderDrafts.clear();
    this.operation++;
    this.busy = false;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.cancelGesture();
    this.renderRoot.querySelector<HTMLDialogElement>('dialog')?.close();
    super.disconnectedCallback();
  }
  private memberIds(hass?: Hass) {
    return this.kind === 'room' && hass
      ? roomEntityIds(hass, this.config?.area, this.config?.entities)
      : this.config?.entity
        ? [this.config.entity]
        : [];
  }
  private ids(hass?: Hass) {
    return [...new Set([
      ...this.memberIds(hass),
      ...(this.config?.sub_controls ?? []).flatMap(sub => [sub.entity, ...(sub.visible_when ? [sub.visible_when.entity] : [])]),
    ])];
  }
  private entity(id = this.config?.entity ?? '', kind = this.kind, primary = id === this.config?.entity): CardEntity {
    return mapEntity(
      this.host?.states[id],
      kind,
      id,
      this.host,
      primary ? this.config?.attribute : undefined,
      primary ? this.config?.unit : undefined,
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
        this.error =
          error instanceof PermissionDeniedError
            ? this.t('permissionDenied')
            : error instanceof Error
              ? error.message
              : this.t('error');
    } finally {
      if (!this.disposed && operation === this.operation) {
        this.busy = false;
        this.requestUpdate();
      }
    }
  }
  private async command(command: CardCommand, entity = this.entity()) {
    if (this.host) await this.run(() => executeCommand(this.host!, this.entity(entity.externalId, kindForEntity(entity.externalId)), command));
  }
  private async perform(action?: ActionConfig, target = this.config?.entity) {
    if (this.disabled) return;
    if (!action) {
      if (this.kind === 'room') await this.openRoom();
      else if (this.entity().capabilities.includes('toggle') && this.entity().available)
        await this.command({ type: 'toggle' });
      else this.moreInfo();
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
        await this.command({ type: 'toggle' }, this.entity(target, kindForEntity(target ?? '')));
        break;
      case 'more-info':
        this.moreInfo(target);
        break;
      case 'navigate':
        history.pushState(null, '', action.navigation_path!);
        window.dispatchEvent(new Event('location-changed'));
        break;
      case 'perform-action': {
        const [domain, service] = action.perform_action!.split('.');
        await this.run(() =>
          callHostService(
            this.host!,
            domain,
            service,
            action.data ?? {},
            action.target ?? (target ? { entity_id: target } : {}),
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
    if (this.disposed || this.isPreview || !this.host || this.roomOpen) return;
    const operation = this.operation;
    this.roomOpener = (this.renderRoot as ShadowRoot).activeElement as HTMLElement | undefined;
    this.roomOpen = true;
    this.requestUpdate();
    await this.updateComplete;
    if (this.disposed || this.isPreview || !this.roomOpen || operation !== this.operation) return;
    this.renderRoot.querySelector<HTMLDialogElement>('dialog')?.showModal();
    if (this.config?.panel_id && location.hash !== this.config.panel_id) {
      history.pushState(null, '', this.config.panel_id);
      window.dispatchEvent(new Event('location-changed'));
    }
  }
  private closeRoom(clearHash = true) {
    this.roomOpen = false;
    this.sliderDrafts.clear();
    this.renderRoot.querySelector<HTMLDialogElement>('dialog')?.close();
    if (clearHash && this.config?.panel_id && location.hash === this.config.panel_id) {
      history.replaceState(null, '', location.pathname + location.search);
      window.dispatchEvent(new Event('location-changed'));
    }
    this.requestUpdate();
    this.roomOpener?.focus();
  }
  private choice(entity: CardEntity, type: 'select' | 'hvac_mode' | 'source') {
    if (!entity.capabilities.includes(type)) return nothing;
    const options = type === 'select' ? entity.options : type === 'hvac_mode' ? entity.hvacModes : entity.sources;
    const value = type === 'source' ? entity.source : entity.state;
    return html`<label class="choice"><span>${this.t(type)}</span><select aria-label=${this.t(type)} .value=${value ?? ''} ?disabled=${this.disabled || !entity.available}
      @change=${(e: Event) => this.command({type, value: (e.target as HTMLSelectElement).value}, entity)}>
      ${!options?.includes(value ?? '') ? html`<option value="" .selected=${live(true)}>${this.t(entity.available ? 'selectOption' : entity.state)}</option>` : nothing}
      ${options?.map(option => html`<option value=${option} .selected=${live(option === value)}>${this.t(option)}</option>`)}
    </select></label>`;
  }
  private inlineControls(entity: CardEntity) {
    const unavailable = this.disabled || !entity.available;
    return html`<div class="inline-actions">
      ${entity.capabilities.includes('toggle') ? this.action(this.t(entity.active ? 'off' : 'on'), 'switch', () => this.command({type:'toggle'}, entity), unavailable) : nothing}
      ${entity.capabilities.includes(entity.state === 'playing' ? 'pause' : 'play') ? this.action(this.t(entity.state === 'playing' ? 'pause' : 'play'), entity.state === 'playing' ? 'pause' : 'play', () => this.command({type:'play_pause'}, entity), unavailable) : nothing}
      ${(['open','stop','close'] as const).filter(type=>entity.capabilities.includes(type)).map(type=>this.action(this.t(type),type,()=>this.command({type},entity),unavailable))}
    </div>${(['brightness','volume','temperature','position','number','color_temperature'] as const).filter(type=>entity.capabilities.includes(type)).map(type=>this.slider(entity,type,true))}
    ${this.choice(entity,'select')}${this.choice(entity,'hvac_mode')}${this.choice(entity,'source')}`;
  }
  private subControls() {
    return html`<div class="sub-controls">${(this.config?.sub_controls ?? []).filter(sub => !sub.visible_when || this.host?.states[sub.visible_when.entity]?.state === sub.visible_when.state).map(sub => {
      const entity = this.entity(sub.entity, kindForEntity(sub.entity), false);
      const control = sub.control ?? 'state';
      return html`<div class="sub-control"><button class="sub-name" ?disabled=${this.disabled} @click=${() => sub.tap_action ? this.perform(sub.tap_action, sub.entity) : this.moreInfo(sub.entity)}>${sub.name ?? entity.name}<span class="state">${entity.available ? entity.value : this.t(entity.state)} ${entity.unit}</span></button>
        ${control === 'toggle' && entity.capabilities.includes('toggle') ? this.action(this.t(entity.active ? 'off' : 'on'),'switch',()=>this.command({type:'toggle'},entity),this.disabled || !entity.available) : nothing}
        ${control === 'slider' ? (['brightness','volume','temperature','position','number','color_temperature'] as const).filter(type=>entity.capabilities.includes(type)).map(type=>this.slider(entity,type,true)) : nothing}
        ${control === 'select' ? this.choice(entity,'select') : nothing}</div>`;
    })}</div>`;
  }
  private slider(entity: CardEntity, type: 'brightness' | 'volume' | 'temperature' | 'position' | 'number' | 'color_temperature', inline = false) {
    if (
      !entity.capabilities.includes(type) ||
      (type === 'brightness' && this.config?.show_brightness === false)
    )
      return nothing;
    const draftKey = `${entity.externalId}:${type}`;
    const min = type === 'temperature' ? entity.minTemperature! : type === 'number' ? entity.minNumber! : type === 'color_temperature' ? entity.minKelvin! : 0;
    const max = type === 'temperature' ? entity.maxTemperature! : type === 'number' ? entity.maxNumber! : type === 'color_temperature' ? entity.maxKelvin! : 100;
    const step = type === 'temperature' ? entity.stepTemperature! : type === 'number' ? entity.stepNumber! : 1;
    const value = this.sliderDrafts.get(draftKey) ?? entity[type] ?? min;
    const progress = Math.min(100, Math.max(0, (value - min) / (max - min) * 100));
    const unit =
      type === 'temperature' ? (this.host?.config?.unit_system?.temperature ?? '°C') : type === 'number' ? entity.unit : type === 'color_temperature' ? 'K' : '%';
    return html`<label class=${`slider ${!inline && type === 'position' ? 'cover-position' : !inline && type === 'temperature' ? 'temperature-slider' : ''}`}><span class="slider-label"><span>${this.t(type)}</span><output>${value}${unit}</output></span>
      <input type="range" style=${styleMap({ '--progress': `${progress}%` })} aria-label=${this.t(type)} min=${min} max=${max} step=${step} .value=${String(value)} ?disabled=${this.disabled || !entity.available}
        @input=${(e: Event) => {
          this.sliderDrafts.set(draftKey, Number((e.target as HTMLInputElement).value));
          this.requestUpdate();
        }}
        @change=${(e: Event) => {
          void this.command(
            { type, value: Number((e.target as HTMLInputElement).value) },
            entity,
          ).finally(() => {
            this.sliderDrafts.delete(draftKey);
            this.requestUpdate();
          });
        }} />
    </label>`;
  }
  private action(
    label: string,
    glyph: string,
    work: () => unknown,
    disabled = this.disabled,
    extra = '',
  ) {
    return html`<button class=${`action ${extra}`} aria-label=${label} title=${label} ?disabled=${disabled} @click=${work}>${icon(glyph)}</button>`;
  }
  private details() {
    return this.action(
      this.t('details'),
      'details',
      () => this.moreInfo(),
      this.disabled,
      'details',
    );
  }
  private temperatureStep(entity: CardEntity, direction: number) {
    const value = Math.max(
      entity.minTemperature!,
      Math.min(
        entity.maxTemperature!,
        (entity.temperature ?? entity.minTemperature!) + direction * entity.stepTemperature!,
      ),
    );
    void this.command({ type: 'temperature', value: Number(value.toFixed(3)) }, entity);
  }
  private familyContent(entity: CardEntity, value: string, members: CardEntity[]) {
    const unavailable = this.disabled || !entity.available;
    if (this.config?.layout === 'row' && !['room','navigation','number','select'].includes(this.kind)) {
      return html`<div class="row-value">${this.config?.show_state === false ? nothing : html`<span class="state">${entity.available ? (entity.subtitle || this.t(entity.value)) : value} ${entity.unit}</span>`}</div>
        <details class="advanced-controls"><summary>${this.t('controls')}</summary>${this.inlineControls(entity)}${this.details()}</details>`;
    }
    switch (this.kind) {
      case 'light':
        return html`${this.config?.show_state !== false && !entity.available ? html`<span class="state">${value}</span>` : nothing}
          ${this.slider(entity, 'brightness')}${entity.capabilities.includes('color_temperature') && this.config?.layout === 'comfortable' ? html`<details class="advanced-controls"><summary>${this.t('color_temperature')}</summary>${this.slider(entity,'color_temperature')}</details>` : nothing}
          <div class="actions">${entity.capabilities.includes('brightness') && this.config?.show_brightness !== false ? [100, 50].map((preset) => html`<button class=${`action ${entity.active && entity.brightness === preset ? 'selected' : ''}`} aria-label=${`${this.t('brightness')} ${preset}%`} aria-pressed=${entity.active && entity.brightness === preset} ?disabled=${unavailable} @click=${() => this.command({ type: 'brightness', value: preset }, entity)}>${preset}</button>`) : nothing}${this.details()}</div>`;
      case 'switch':
        return !entity.available && this.config?.show_state !== false
          ? html`<span class="state">${value}</span>`
          : nothing;
      case 'sensor':
        return this.config?.show_state === false
          ? nothing
          : html`<div class="sensor-value"><div class=${`metric ${value.length > 10 ? 'long' : ''}`}><span>${value}</span>${entity.available ? html`<span class="unit">${entity.unit}</span>` : nothing}</div></div>`;
      case 'climate': {
        const unit = this.host?.config?.unit_system?.temperature ?? '°C';
        const operating =
          entity.climateAction === 'heating'
            ? this.t('heating')
            : entity.climateAction === 'cooling'
              ? this.t('cooling')
              : this.t(entity.state);
        return html`<div class="climate-visual" aria-hidden="true"><div class="dial"></div></div>${this.slider(entity, 'temperature')}
          <div class="climate-value">${
            this.config?.show_state !== false
              ? html`<div class="metric">${entity.available ? (entity.currentTemperature ?? entity.temperature ?? '—') : '—'}<span class="unit">${unit}</span></div>
          <div class="state climate-state">${entity.available ? `${operating}${entity.temperature !== undefined ? ` · ${this.t('target')} ${entity.temperature}${unit}` : ''}` : value}</div>`
              : nothing
          }</div>
          ${this.config?.layout === 'comfortable' ? this.choice(entity,'hvac_mode') : nothing}<div class="actions">${entity.capabilities.includes('temperature') ? html`${this.action(this.t('decreaseTemperature'), 'minus', () => this.temperatureStep(entity, -1), unavailable || entity.temperature! <= entity.minTemperature!)}${this.action(this.t('increaseTemperature'), 'plus', () => this.temperatureStep(entity, 1), unavailable || entity.temperature! >= entity.maxTemperature!)}` : nothing}${this.details()}</div>`;
      }
      case 'cover':
        return html`<div class="cover-fill" style=${styleMap({ '--closure': String((100 - (this.sliderDrafts.get(`${entity.externalId}:position`) ?? entity.position ?? (entity.active ? 100 : 0))) / 100) })}></div>${this.slider(entity, 'position')}
          <div class="cover-value">${this.config?.show_state !== false ? html`<div class="metric">${entity.available && entity.position !== undefined ? `${this.sliderDrafts.get(`${entity.externalId}:position`) ?? entity.position}%` : '—'}</div><div class="state">${value}</div>` : nothing}</div>
          <div class="actions">${(['open', 'stop', 'close'] as const).filter((type) => entity.capabilities.includes(type)).map((type) => this.action(this.t(type), type, () => this.command({ type }, entity), unavailable))}${this.details()}</div>`;
      case 'media': {
        const time = (seconds: number) =>
          `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
        return html`<div class="artwork">${
          entity.available && entity.artwork && this.failedArtwork !== entity.artwork
            ? html`<img src=${entity.artwork} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" @error=${() => {
                this.failedArtwork = entity.artwork;
                this.requestUpdate();
              }} />`
            : icon('disc')
        }</div>
          ${this.config?.show_state !== false ? html`<div class="media-info"><div class="state track">${entity.available ? entity.subtitle || value : value}</div>${entity.available && entity.artist ? html`<div class="artist">${entity.artist}</div>` : nothing}</div>` : nothing}
          ${entity.available && entity.duration ? html`<div class="timeline"><span>${time(Math.min(entity.elapsed ?? 0, entity.duration))}</span><progress aria-label=${this.t('position')} max=${entity.duration} value=${entity.elapsed ?? 0}></progress><span>${time(entity.duration)}</span></div>` : nothing}
          <div class="actions">${entity.capabilities.some(cap=>['volume','next','previous','mute','source'].includes(cap)) ? html`<details class="volume-control"><summary class="action" role="button" aria-label=${this.t(entity.capabilities.some(cap=>['next','previous','mute','source'].includes(cap)) ? 'controls' : 'volume')} title=${this.t('controls')}>${icon('volume')}</summary><div class="volume-panel">${this.slider(entity, 'volume')}<div class="inline-actions">${(['previous','next','mute'] as const).filter(type=>entity.capabilities.includes(type)).map(type=>this.action(this.t(type === 'mute' && entity.muted ? 'unmute' : type),type,()=>this.command({type},entity),unavailable))}</div>${this.choice(entity,'source')}</div></details>` : nothing}${entity.capabilities.includes(entity.state === 'playing' ? 'pause' : 'play') ? this.action(this.t(entity.state === 'playing' ? 'pause' : 'play'), entity.state === 'playing' ? 'pause' : 'play', () => this.command({ type: 'play_pause' }, entity), unavailable) : nothing}${this.details()}</div>`;
      }
      case 'number':
        return html`${!entity.available && this.config?.show_state !== false ? html`<span class="state">${value}</span>` : nothing}${this.slider(entity,'number')}<div class="actions">${this.details()}</div>`;
      case 'select':
        return html`${this.choice(entity,'select')}<div class="actions">${this.details()}</div>`;
      case 'navigation':
        return html`<nav aria-label=${this.config?.name ?? this.t('navigation')}>${this.config?.links?.map(link=>html`<button class="nav-link" ?disabled=${this.disabled} @click=${()=>this.perform({action:'navigate',navigation_path:link.path})}>${link.name}</button>`)}</nav>`;
      case 'room': {
        const count = members.filter((member) => member.available && member.active).length;
        return html`<div class="room-summary"><span class="room-count">${count}</span><span class="state">${this.t('active')} · ${members.length} ${this.t('entities')}</span></div>
          <div class="room-members">${members.slice(0, 4).map((member) => html`<button class="icon" aria-label=${member.name} title=${member.name} ?disabled=${this.disabled} @click=${() => this.moreInfo(member.externalId)}>${icon(kindForEntity(member.externalId))}</button>`)}</div>
          ${!members.length ? html`<p class="notice">${this.t(this.config?.area && !this.host?.entities ? 'roomUnavailable' : 'roomEmpty')}</p>` : nothing}
          <div class="actions">${this.action(this.t('controls'), 'details', () => this.openRoom(), this.disabled || !members.length, 'details')}</div>`;
      }
    }
  }
  protected render() {
    if (!this.config) return nothing;
    const config = this.config;
    const entity = this.entity();
    const host = this.host;
    const ids = this.memberIds(host);
    const members = this.kind === 'room' ? ids.map((id) => this.entity(id, kindForEntity(id), false)) : [];
    const active =
      this.kind === 'room'
        ? members.some((e) => e.active && e.available)
        : entity.active && entity.available;
    const name =
      config.name ??
      (this.kind === 'room' ? (host?.areas?.[config.area ?? '']?.name ?? this.t('room')) : this.kind === 'navigation' ? this.t('navigation') : entity.name);
    const value = !host
      ? this.t('loading')
      : !entity.available
        ? this.t(entity.state)
        : this.kind === 'sensor'
          ? entity.value
          : this.t(entity.state);
    const appearance = config.appearance;
    const theme =
      appearance?.theme && appearance.theme !== 'auto'
        ? appearance.theme
        : host?.themes?.darkMode === false
          ? 'light'
          : 'dark';
    const accent =
      appearance?.accent ?? (appearance?.preset === 'neutral' ? '#94a3b8' : appearance?.preset === 'cool' ? '#38bdf8' : undefined) ??
      (this.kind === 'sensor'
        ? '#fda4af'
        : this.kind === 'climate' && (entity.state === 'cool' || entity.climateAction === 'cooling')
          ? '#38bdf8'
          : '#f97316');
    const styles = {
      '--navet-card-accent': appearance?.accent,
      '--family-accent': accent,
      '--navet-card-radius':
        appearance?.radius !== undefined ? `${appearance.radius}px` : undefined,
    };
    const glyph =
      this.kind === 'climate' && (entity.state === 'cool' || entity.climateAction === 'cooling')
        ? 'cool'
        : this.kind;
    const toggles = entity.capabilities.includes('toggle');
    return html`<div class="card" style=${styleMap(styles)} data-kind=${this.kind} data-theme=${theme} data-layout=${config.layout ?? 'compact'} data-effects=${appearance?.effects ?? 'low'} ?data-active=${active} aria-busy=${this.busy}>
      <div class="header">
        ${toggles ? html`<button class="icon" aria-label=${this.t(entity.active ? 'off' : 'on')} title=${this.t(entity.active ? 'off' : 'on')} aria-pressed=${entity.active} ?disabled=${this.disabled || !entity.available} @click=${() => this.command({ type: 'toggle' }, entity)}>${config.icon ? html`<ha-icon .icon=${config.icon}></ha-icon>` : icon(glyph)}</button>` : html`<span class="icon" aria-hidden="true">${config.icon ? html`<ha-icon .icon=${config.icon}></ha-icon>` : icon(glyph)}</span>`}
        ${this.kind === 'navigation' && !config.tap_action ? html`<span class="primary"><span class="labels"><span class="eyebrow">${this.t(this.kind)}</span><span class="name">${name}</span></span></span>` : html`<button class="primary" ?disabled=${this.disabled} aria-label=${name}
          @click=${this.primaryClick} @pointerdown=${this.pointerDown} @pointermove=${this.pointerMove} @pointerup=${this.cancelHold} @pointerleave=${this.cancelHold} @pointercancel=${() => {
            this.cancelHold();
            this.held = true;
          }} @contextmenu=${(e: Event) => {
            if (config.hold_action) e.preventDefault();
          }}>
          <span class="labels"><span class="eyebrow">${this.t(this.kind)}</span><span class="name">${name}</span></span>
        </button>`}
        ${this.kind === 'switch' || this.kind === 'sensor' ? this.action(this.t('details'), 'details', () => this.moreInfo(), this.disabled, this.kind === 'sensor' ? 'sensor-details' : 'details') : nothing}
      </div>
      ${this.familyContent(entity, value, members)}${config.sub_controls?.length ? this.subControls() : nothing}
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
          ? html`<dialog aria-labelledby="room-title" @close=${(e: Event)=> { if (this.roomOpen && !(e.currentTarget as HTMLDialogElement).open) this.closeRoom(); }} @cancel=${()=>this.closeRoom()} @click=${(e: Event) => {
              if (e.target === e.currentTarget) this.closeRoom();
            }}>
        <div class="dialog-header"><h2 id="room-title">${name}</h2><button class="action" aria-label=${this.t('close')} @click=${this.closeRoom}>×</button></div>
        <div class="room-list">${this.roomOpen ? repeat(members, member=>member.id,
          (member) =>
            html`<div class="room-control"><button class="room-row" @click=${() => {
              this.closeRoom();
              this.moreInfo(member.externalId);
            }}><span>${member.name}</span><span>${member.available ? this.t(member.state) : this.t(member.state)}${member.unit ? ` ${member.unit}` : ''}</span></button>${this.inlineControls(member)}</div>`,
        ) : nothing}</div>
        <div class="dialog-footer"><button class="action accent" @click=${this.closeRoom}>${this.t('close')}</button></div>
      </dialog>`
          : nothing
      }
    </div>`;
  }
}
