import { LitElement, html, nothing, svg } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { CardEntity, CardKind, CardCommand, ForecastDay, HistoryPoint } from './core';
import { PermissionDeniedError } from './core';
import {
  tagFor, MULTI_KINDS, CONTENT_KINDS,
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
import { readingGlyph, customContent } from './custom-content';
import { icon } from './icons';
import { energyHistory, weatherForecast } from './providers/card-data';
import type { ClimateOrb } from './climate-orb';
import './climate-orb';

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
    if (kind === 'note') return {content: 'Write your note here'};
    if (kind === 'photo') return {image: '/local/photo.jpg', name: 'Photo'};
    if (kind === 'button') return {name: 'Action', tap_action: {action: 'navigate', navigation_path: '/lovelace/0'}};
    if (MULTI_KINDS.includes(kind)) return {entities: Object.keys(hass?.states ?? {}).filter(id => domainAllowed(kind,id)).slice(0,3)};
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
  private supplementary: ForecastDay[] | HistoryPoint[] = [];
  private dataKey = '';
  private dataGeneration = 0;
  private dataFetched = 0;
  private dataLoading = false;
  private async refreshData() {
    const host = this.host;
    const id = this.kind === 'weather' ? this.config?.entity : this.kind === 'energy-now' ? this.config?.entities?.[0] : undefined;
    if (!host || !id || !this.isConnected || this.isPreview) return;
    const key = `${this.kind}:${id}`;
    if (key !== this.dataKey) { this.dataKey = key; this.dataFetched = 0; this.supplementary = []; }
    if (this.dataLoading || Date.now() - this.dataFetched < 300000) return;
    const generation = this.dataGeneration;
    this.dataFetched = Date.now(); this.dataLoading = true;
    try {
      const result = this.kind === 'weather' ? await weatherForecast(host, id) : await energyHistory(host, id);
      if (!this.disposed && generation === this.dataGeneration) { this.supplementary = result; this.requestUpdate(); }
    } catch {
      if (!this.disposed && generation === this.dataGeneration) { this.supplementary = []; this.requestUpdate(); }
    } finally { if (generation === this.dataGeneration) this.dataLoading = false; }
  }
  private sliderDrafts = new Map<string, number>();
  private busy = false;
  private roomOpen = false;
  private photoIndex = 0;
  private photoShuffle = false;
  private noteOpener?: HTMLElement;
  private noteDraft = '';
  private selectedPlayer = '';
  private async editNote() {
    if (this.disabled || !this.entity().available) return;
    this.noteDraft = this.entity().value; this.requestUpdate();
    this.noteOpener = (this.renderRoot as ShadowRoot).activeElement as HTMLElement;
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLDialogElement>('.note-dialog')?.showModal();
  }
  private closeNote() { this.renderRoot.querySelector<HTMLDialogElement>('.note-dialog')?.close(); this.noteOpener?.focus(); }
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
    if (this.isConnected) { this.syncPanel(); void this.refreshData(); }
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
    const config = validateConfig(input, this.kind);
    this.renderRoot?.querySelector<ClimateOrb>('navet-climate-orb')?.cancelInteraction();
    this.dataGeneration++; this.dataKey = ''; this.dataLoading = false; this.supplementary = [];
    this.photoIndex = 0; this.photoShuffle = false; this.selectedPlayer = '';
    this.config = config;
    this.dataset.kind = this.kind;
    this.dataset.size = this.compactFamily ? config.size ?? 'small' : 'medium';
    this.sliderDrafts.clear();
    this.failedArtwork = undefined;
    this.operation++;
    this.busy = false;
    this.error = '';
    this.cancelGesture();
    this.roomOpen = false;
    this.renderRoot?.querySelector<HTMLDialogElement>('dialog')?.close();
    this.requestUpdate();
    if (this.isConnected) { this.syncPanel(); void this.refreshData(); }
  }
  private get compactFamily() { return ['switch', 'button', 'scene', 'script', 'person', 'lock'].includes(this.kind); }
  private get defaultRows() {
    if (this.kind === 'navigation' || this.config?.layout === 'row') return 2;
    if (this.config?.layout === 'comfortable') return 4;
    if (this.kind === 'switch' && this.config?.size === 'extra-small') return 2;
    return 3;
  }
  getCardSize() {
    return Math.ceil((this.defaultRows * 56 + (this.defaultRows - 1) * 8) / 50);
  }
  getGridOptions() {
    const columns = this.config?.layout === 'row' || !this.compactFamily ? 12 : 6;
    return {
      columns,
      min_columns: columns,
      rows: this.config?.sub_controls?.length || this.config?.layout === 'row' ? 'auto' : this.defaultRows,
      min_rows: this.defaultRows,
      ...this.config?.grid_options,
    };
  }
  connectedCallback() {
    super.connectedCallback();
    this.disposed = false;
    void this.refreshData();
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
    this.dataGeneration++; this.dataLoading = false; this.dataFetched = 0;
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
    if (MULTI_KINDS.includes(this.kind)) return [...new Set(this.config?.entities ?? [])];
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
      else if (this.entity().capabilities.includes('activate') && this.entity().available) await this.command({type:'activate'});
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
    </div>${(['brightness','volume','temperature','position','number','color_temperature','speed'] as const).filter(type=>entity.capabilities.includes(type)).map(type=>this.slider(entity,type,true))}
    ${this.choice(entity,'select')}${this.choice(entity,'hvac_mode')}${this.choice(entity,'source')}`;
  }
  private subControls() {
    return html`<div class="sub-controls">${(this.config?.sub_controls ?? []).filter(sub => !sub.visible_when || this.host?.states[sub.visible_when.entity]?.state === sub.visible_when.state).map(sub => {
      const entity = this.entity(sub.entity, kindForEntity(sub.entity), false);
      const control = sub.control ?? 'state';
      return html`<div class="sub-control"><button class="sub-name" ?disabled=${this.disabled} @click=${() => sub.tap_action ? this.perform(sub.tap_action, sub.entity) : this.moreInfo(sub.entity)}>${sub.name ?? entity.name}<span class="state">${entity.available ? entity.value : this.t(entity.state)} ${entity.unit}</span></button>
        ${control === 'toggle' && entity.capabilities.includes('toggle') ? this.action(this.t(entity.active ? 'off' : 'on'),'switch',()=>this.command({type:'toggle'},entity),this.disabled || !entity.available) : nothing}
        ${control === 'slider' ? (['brightness','volume','temperature','position','number','color_temperature','speed'] as const).filter(type=>entity.capabilities.includes(type)).map(type=>this.slider(entity,type,true)) : nothing}
        ${control === 'select' ? this.choice(entity,'select') : nothing}</div>`;
    })}</div>`;
  }
  private slider(entity: CardEntity, type: 'brightness' | 'volume' | 'temperature' | 'position' | 'number' | 'color_temperature' | 'speed', inline = false) {
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
      () => this.moreInfo(this.kind === 'media-stack' ? this.selectedPlayer || this.config?.entities?.[0] : undefined),
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
    if (this.kind === 'media-stack') entity = members.find(e=>e.externalId === this.selectedPlayer) ?? members[0] ?? entity;
    const unavailable = this.disabled || !entity.available;
    if (this.config?.layout === 'row' && !['room','navigation','number','select','lock',...MULTI_KINDS,...CONTENT_KINDS].includes(this.kind)) {
      return html`<div class="row-value">${this.config?.show_state === false ? nothing : html`<span class="state">${entity.available ? (entity.subtitle || this.t(entity.value)) : value} ${entity.unit}</span>`}</div>
        <details class="advanced-controls"><summary>${this.t('controls')}</summary>${this.inlineControls(entity)}${this.details()}</details>`;
    }
    const custom = customContent({kind:this.kind, config:this.config!, entity, members, disabled:this.disabled, t:key=>this.t(key), details:id=>this.moreInfo(id), command:(command,e)=>this.command(command,e), perform:()=>this.perform(this.config?.tap_action), history:this.kind === 'energy-now' ? this.supplementary as HistoryPoint[] : [], editNote:()=>this.editNote(), photoIndex:this.photoIndex, photoShuffle:this.photoShuffle, togglePhotoShuffle:()=>{this.photoShuffle=!this.photoShuffle;this.requestUpdate();}, changePhoto:(index)=>{this.photoIndex=index;this.failedArtwork=undefined;this.requestUpdate();}, imageFailed:this.failedArtwork === (this.config?.images?.[this.photoIndex] ?? this.config?.image ?? entity.artwork), onImageError:()=>{ this.failedArtwork=this.config?.images?.[this.photoIndex] ?? this.config?.image ?? entity.artwork; this.requestUpdate(); }});
    if (custom !== undefined) return custom;
    switch (this.kind) {
      case 'fan':
        return html`${entity.available ? this.slider(entity,'speed') : html`<span class="state">${value}</span>`}<div class="actions">${entity.capabilities.includes('speed') ? [33,66,100].map(value=>html`<button class=${`action fan-preset ${entity.active && entity.speed === value ? 'selected' : ''}`} aria-pressed=${entity.active && entity.speed === value} aria-label=${`${this.t('speed')} ${value}%`} ?disabled=${unavailable} @click=${()=>this.command({type:'speed',value},entity)}>${icon('fan')}<span>${value}</span></button>`) : nothing}${this.details()}</div>`;
      case 'lock':
        { const type = entity.state === 'locked' ? 'unlock' : 'lock';
        return html`<div class="lock-symbol">${icon(entity.state === 'locked' ? 'lock' : 'unlock')}</div><span class="state lock-state">${value}</span>${entity.capabilities.includes(type) ? html`<label class="lock-confirm"><span>${this.t(type === 'unlock' ? 'slideUnlock' : 'slideLock')}</span><input type="range" min="0" max="100" .value=${'0'} aria-label=${this.t(type === 'unlock' ? 'slideUnlock' : 'slideLock')} @pointercancel=${(event:PointerEvent)=>{(event.target as HTMLInputElement).value='0';}} ?disabled=${unavailable || !['locked','unlocked'].includes(entity.state)} @change=${(event:Event)=>{const input=event.target as HTMLInputElement;if(Number(input.value)>=95)void this.command({type},entity);input.value='0';}}></label>` : nothing}`;
      }
      case 'vacuum': {
        const running=['cleaning','mopping'].includes(entity.state);
        const control=running ? entity.capabilities.includes('stop') ? 'stop' : 'pause' : 'start';
        return html`<div class="vacuum-summary"><div><strong class="vacuum-state">${value}</strong><div class="vacuum-facts">${entity.battery !== undefined && entity.available ? html`<span>${icon('battery')}${entity.battery}%</span>` : nothing}${entity.cleanedArea !== undefined && entity.available ? html`<span>${entity.cleanedArea} m²</span>` : nothing}${entity.cleaningMinutes !== undefined && entity.available ? html`<span>${entity.cleaningMinutes} min</span>` : nothing}</div></div><div class="vacuum-robot" aria-hidden="true">${svg`<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="36" stroke="currentColor" opacity=".3"/><path d="M7 41A33 33 0 0 1 73 41" stroke="currentColor" opacity=".55" stroke-width="2.5" stroke-linecap="round"/><rect x="32" y="5" width="16" height="4" rx="2" fill="currentColor" opacity=".65"/><path d="M12 49H68" stroke="currentColor" opacity=".2"/><circle cx="40" cy="31" r="13" fill="currentColor" opacity=".1"/><circle cx="40" cy="29" r="12" stroke="currentColor" opacity=".6"/><circle cx="40" cy="29" r="8.5" fill="currentColor" opacity=".14"/><circle cx="40" cy="29" r="2" fill="currentColor" opacity=".8"/><circle cx="40" cy="58" r="7" fill="#f97316"/><path d="M40 53v10m-5-5h10m-8.5-3.5 7 7m0-7-7 7" stroke="white" stroke-width="1"/><path d="M27 69H53" stroke="currentColor" opacity=".45" stroke-width="2" stroke-linecap="round"/></svg>`}</div></div><div class="actions">${entity.capabilities.includes(control) ? this.action(this.t(control),control === 'start' ? 'play' : control === 'stop' ? 'square' : 'pause',()=>this.command({type:control},entity),unavailable) : nothing}${entity.capabilities.includes('return_home') ? this.action(this.t('return_home'),'return_home',()=>this.command({type:'return_home'},entity),unavailable) : nothing}${this.details()}</div>`;
      }
      case 'person':
        return html`<button class="person-body" aria-label=${entity.name} ?disabled=${this.disabled} @click=${this.primaryClick} @pointerdown=${this.pointerDown} @pointermove=${this.pointerMove} @pointerup=${this.cancelHold} @pointerleave=${this.cancelHold} @pointercancel=${()=>{this.cancelHold();this.held=true;}} @contextmenu=${(event:Event)=>{if(this.config?.hold_action)event.preventDefault();}}>${entity.available && entity.artwork && this.failedArtwork !== entity.artwork ? html`<img src=${entity.artwork} alt="" referrerpolicy="no-referrer" @error=${()=>{this.failedArtwork=entity.artwork;this.requestUpdate();}}>` : html`<span class="avatar">${icon('person')}</span>`}<span class="person-identity"><span class="eyebrow">${value}</span><span class="name">${this.config?.name ?? entity.name}</span></span></button><div class="actions">${this.details()}</div>`;
      case 'weather': {
        const forecast = entity.available ? this.supplementary as ForecastDay[] : [];
        const today=forecast[0];
        return html`<div class="weather-body"><div><div class="metric">${entity.available ? entity.temperature ?? '—' : '—'}<span class="unit">${entity.available ? entity.unit : ''}</span></div><div class="state">${today ? html`↑ ${today.high}° ${today.low !== undefined ? html`↓ ${today.low}°` : nothing}` : nothing}${entity.available && entity.feelsLike !== undefined ? html` · ${this.t('feelsLike')} ${entity.feelsLike}°` : nothing}</div></div><div class="weather-condition">${icon(entity.state === 'sunny' ? 'weather' : entity.state.includes('rain') ? 'rain' : entity.state === 'clear-night' ? 'moon' : 'cloud')}<span class="state">${value}</span></div></div><div class="weather-footer"><div class="forecast-row">${forecast.map(day=>html`<div><span>${new Intl.DateTimeFormat(this.language,{weekday:'short'}).format(day.time)}</span>${icon(day.condition === 'sunny' ? 'weather' : day.condition.includes('rain') ? 'rain' : 'cloud')}<strong>${Math.round(day.high)}°</strong></div>`)}</div>${this.details()}</div>`;
      }
      case 'scene':
        return html`<div class="actions"><span class="state action-room">${entity.areaName ?? ''}</span>${this.action(this.t('runAction'),'play',()=>this.command({type:'activate'},entity),unavailable,'accent')}${this.details()}</div>`;
      case 'script':
        return html`<div class="actions">${this.details()}</div>`;
      case 'entity':
        return html`<div class="sensor-value"><div class=${`metric ${value.length > 10 ? 'long' : ''}`}>${entity.available ? entity.value : value}<span class="unit">${entity.available ? entity.unit : ''}</span></div></div><div class="actions">${this.details()}</div>`;
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
        return html`<navet-climate-orb .value=${this.sliderDrafts.get(`${entity.externalId}:temperature`) ?? entity.temperature ?? entity.minTemperature ?? 7}
          .min=${entity.minTemperature ?? 7} .max=${entity.maxTemperature ?? 30} .step=${entity.stepTemperature ?? .5}
          .disabled=${unavailable} .interactive=${entity.capabilities.includes('temperature')}
          .label=${this.t('temperature')} .unit=${unit}
          @value-input=${(e: CustomEvent<{value: number}>) => { this.sliderDrafts.set(`${entity.externalId}:temperature`, e.detail.value); this.requestUpdate(); }}
          @value-cancel=${() => { this.sliderDrafts.delete(`${entity.externalId}:temperature`); this.requestUpdate(); }}
          @value-commit=${(e: CustomEvent<{value: number}>) => {
            void this.command({type:'temperature',value:e.detail.value},entity).finally(() => { this.sliderDrafts.delete(`${entity.externalId}:temperature`); this.requestUpdate(); });
          }}></navet-climate-orb>
          <div class="climate-value">${
            this.config?.show_state !== false
              ? html`<div class="metric">${entity.available ? (entity.currentTemperature ?? entity.temperature ?? '—') : '—'}<span class="unit">${unit}</span></div>
          <div class="state climate-state">${entity.available ? `${entity.state === 'heat' ? this.t('heatTo') : entity.state === 'cool' ? this.t('coolTo') : operating}${entity.temperature !== undefined ? ` ${(this.sliderDrafts.get(`${entity.externalId}:temperature`) ?? entity.temperature)}${unit}` : ''}` : value}</div>`
              : nothing
          }</div>
          ${this.config?.layout === 'comfortable' ? this.choice(entity,'hvac_mode') : nothing}<div class="actions">${entity.capabilities.includes('temperature') ? html`${this.action(this.t('decreaseTemperature'), 'minus', () => this.temperatureStep(entity, -1), unavailable || entity.temperature! <= entity.minTemperature!)}${this.action(this.t('increaseTemperature'), 'plus', () => this.temperatureStep(entity, 1), unavailable || entity.temperature! >= entity.maxTemperature!)}` : nothing}${this.details()}</div>`;
      }
      case 'cover':
        return html`<div class="cover-fill" style=${styleMap({ '--closure': String((100 - (this.sliderDrafts.get(`${entity.externalId}:position`) ?? entity.position ?? (entity.active ? 100 : 0))) / 100) })}></div>${this.slider(entity, 'position')}
          <div class="cover-value">${this.config?.show_state !== false ? html`<div class="metric">${entity.available && entity.position !== undefined ? `${this.sliderDrafts.get(`${entity.externalId}:position`) ?? entity.position}%` : '—'}</div><div class="state">${value}</div>` : nothing}</div>
          <div class="actions">${(['open', 'stop', 'close'] as const).filter((type) => entity.capabilities.includes(type)).map((type) => this.action(this.t(type), type, () => this.command({ type }, entity), unavailable))}${this.details()}</div>`;
      case 'media-stack':
      case 'media': {
        const time = (seconds: number) =>
          `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
        return html`${this.kind === 'media-stack' && members.length > 1 ? html`<select class="player-select" aria-label=${this.t('media')} @change=${(event:Event)=>{this.selectedPlayer=(event.target as HTMLSelectElement).value;this.requestUpdate();}}>${members.map(e=>html`<option value=${e.externalId} ?selected=${e.externalId===entity.externalId}>${e.name}</option>`)}</select>` : nothing}<div class="artwork">${
          entity.available && entity.artwork && this.failedArtwork !== entity.artwork
            ? html`<img src=${entity.artwork} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" @error=${() => {
                this.failedArtwork = entity.artwork;
                this.requestUpdate();
              }} />`
            : icon('disc')
        }</div>
          ${this.config?.show_state !== false ? html`<div class="media-info"><div class="state track">${entity.available ? entity.subtitle || value : value}</div>${entity.available && entity.artist ? html`<div class="artist">${entity.artist}</div>` : nothing}</div>` : nothing}
          ${entity.available && entity.duration ? html`<div class="timeline"><span>${time(Math.min(entity.elapsed ?? 0, entity.duration))}</span><progress aria-label=${this.t('position')} max=${entity.duration} value=${entity.elapsed ?? 0}></progress><span>${time(entity.duration)}</span></div>` : nothing}
          <div class="actions">${entity.capabilities.some(cap=>['volume','next','previous','mute','source'].includes(cap)) ? html`<details class="volume-control"><summary class="action" role="button" aria-label=${this.t(entity.capabilities.some(cap=>['next','previous','mute','source'].includes(cap)) ? 'controls' : 'volume')} title=${this.t('controls')}>${icon('volume')}</summary><div class="volume-panel">${this.slider(entity, 'volume')}<div class="inline-actions">${(['previous','next','mute'] as const).filter(type=>entity.capabilities.includes(type)).map(type=>this.action(this.t(type === 'mute' && entity.muted ? 'unmute' : type),type,()=>this.command({type},entity),unavailable))}</div>${this.choice(entity,'source')}</div></details>` : nothing}${entity.capabilities.includes(entity.state === 'playing' ? 'pause' : 'play') ? this.action(this.t(entity.state === 'playing' ? 'pause' : 'play'), entity.state === 'playing' ? 'pause' : 'play', () => this.command({ type: 'play_pause' }, entity), unavailable, 'media-playback') : nothing}${this.details()}</div>`;
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
    let entity = this.entity();
    const host = this.host;
    const ids = this.memberIds(host);
    const members = (this.kind === 'room' || MULTI_KINDS.includes(this.kind)) ? ids.map((id) => this.entity(id, kindForEntity(id), false)) : [];
    if (this.kind === 'media-stack') entity = members.find(e=>e.externalId === this.selectedPlayer) ?? members[0] ?? entity;
    const active =
      (this.kind === 'room' || MULTI_KINDS.includes(this.kind))
        ? members.some((e) => e.active && e.available)
        : entity.active && entity.available;
    const name =
      config.name ??
      (this.kind === 'media-stack' ? entity.name : this.kind === 'room' ? (host?.areas?.[config.area ?? '']?.name ?? this.t('room')) : this.kind === 'navigation' || MULTI_KINDS.includes(this.kind) || CONTENT_KINDS.includes(this.kind) && !config.entity ? this.t(this.kind) : entity.name);
    const value = !host
      ? this.t('loading')
      : !entity.available
        ? this.t(entity.state)
        : ['sensor','entity'].includes(this.kind)
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
      (this.kind === 'info' ? '#14b8a6' : this.kind === 'fan' ? '#3b82f6' : this.kind === 'lock' ? (entity.state === 'locked' ? '#22c55e' : '#ef4444') : this.kind === 'sensor'
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
        : this.kind === 'info' && members[0] ? readingGlyph(members[0]) : this.kind === 'script' ? 'play' : this.kind === 'button' ? 'film' : this.kind;
    const toggles = entity.capabilities.includes('toggle');
    const eyebrow = this.kind === 'ups' && members[0]?.areaName ? members[0].areaName : ['info','battery','ups','energy-now'].includes(this.kind) ? this.t('widget') : this.kind === 'lock' ? value : this.kind === 'sensor' && ['°C','°F'].includes(entity.unit) ? this.t('temperatureReading') : this.t(this.kind);
    return html`<div class="card" style=${styleMap(styles)} data-kind=${this.kind} data-size=${this.compactFamily ? config.size ?? 'small' : 'medium'} data-theme=${theme} data-layout=${config.layout ?? 'compact'} data-effects=${appearance?.effects ?? 'low'} data-condition=${this.kind === 'weather' ? entity.state : ''} ?data-active=${active && !['info','battery','ups','energy-now','media-stack','person','note','entity','photo'].includes(this.kind)} aria-busy=${this.busy}>
      ${this.kind !== 'person' ? html`<div class="header">
        ${this.kind === 'script' ? this.action(this.t('runAction'),'play',()=>this.command({type:'activate'},entity),this.disabled || !entity.available,'script-trigger') : toggles ? html`<button class="icon" aria-label=${this.t(entity.active ? 'off' : 'on')} title=${this.t(entity.active ? 'off' : 'on')} aria-pressed=${entity.active} ?disabled=${this.disabled || !entity.available} @click=${() => this.command({ type: 'toggle' }, entity)}>${config.icon ? html`<ha-icon .icon=${config.icon}></ha-icon>` : icon(glyph)}</button>` : html`<span class="icon" aria-hidden="true">${config.icon ? html`<ha-icon .icon=${config.icon}></ha-icon>` : icon(glyph)}</span>`}
        ${!config.entity && this.kind !== 'room' && !config.tap_action ? html`<span class="primary"><span class="labels"><span class="eyebrow">${eyebrow}</span><span class="name">${name}</span></span></span>` : html`<button class="primary" ?disabled=${this.disabled} aria-label=${name}
          @click=${this.primaryClick} @pointerdown=${this.pointerDown} @pointermove=${this.pointerMove} @pointerup=${this.cancelHold} @pointerleave=${this.cancelHold} @pointercancel=${() => {
            this.cancelHold();
            this.held = true;
          }} @contextmenu=${(e: Event) => {
            if (config.hold_action) e.preventDefault();
          }}>
          <span class="labels"><span class="eyebrow">${eyebrow}</span><span class="name">${name}</span></span>
        </button>`}
        ${(this.kind === 'switch' && config.size !== 'extra-small') || this.kind === 'sensor' ? this.action(this.t('details'), 'details', () => this.moreInfo(), this.disabled, this.kind === 'sensor' ? 'sensor-details' : 'switch-details') : nothing}
      </div>` : nothing}
      ${this.familyContent(entity, value, members)}${config.sub_controls?.length ? this.subControls() : nothing}
      ${this.kind === 'photo' && (config.tap_action || config.hold_action || config.double_tap_action) ? html`<button class="photo-primary" aria-label=${name} ?disabled=${this.disabled} @click=${this.primaryClick} @pointerdown=${this.pointerDown} @pointermove=${this.pointerMove} @pointerup=${this.cancelHold} @pointerleave=${this.cancelHold} @pointercancel=${()=>{this.cancelHold();this.held=true;}} @contextmenu=${(event:Event)=>{if(config.hold_action)event.preventDefault();}}></button>` : nothing}
      ${
        this.error
          ? html`<div class="error-row"><p class="notice error" role="alert">${this.error}</p><button class="dismiss" aria-label=${this.t('close')} @click=${() => {
              this.error = '';
              this.requestUpdate();
            }}>×</button></div>`
          : nothing
      }
      ${this.kind === 'note' && entity.capabilities.includes('text') && !entity.secret ? html`<dialog class="note-dialog" aria-labelledby="note-title" @close=${()=>this.noteOpener?.focus()} @cancel=${()=>this.closeNote()}><form @submit=${async (event:Event)=>{event.preventDefault();const input=(event.currentTarget as HTMLFormElement).querySelector('textarea')!;await this.command({type:'text',value:input.value},entity);if(!this.error)this.closeNote();}}><div class="dialog-header"><h2 id="note-title">${name}</h2><button type="button" class="action" aria-label=${this.t('close')} @click=${()=>this.closeNote()}>×</button></div><textarea aria-label=${this.t('note')} .value=${live(this.noteDraft)} @input=${(event:Event)=>{this.noteDraft=(event.target as HTMLTextAreaElement).value;}} minlength=${entity.textMin ?? 0} maxlength=${entity.textMax ?? 255} ?disabled=${this.disabled || !entity.available}></textarea><div class="dialog-footer"><button class="action" aria-label=${this.t('save')} ?disabled=${this.disabled || !entity.available}>${icon('check')}</button></div>${this.error ? html`<p class="notice error" role="alert">${this.error}</p>` : nothing}</form></dialog>` : nothing}
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
