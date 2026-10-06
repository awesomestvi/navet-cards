import { live } from 'lit/directives/live.js';
import { LitElement, html, css, nothing } from 'lit';
import {
  domainAllowed,
  type CardConfig,
  type ActionConfig,
  validateConfig,
  KINDS,
  tagFor,
} from './config';
import type { CardKind } from './core';
import type { Hass } from './providers/home-assistant';
import { roomEntityIds } from './providers/home-assistant';
import { translate } from './i18n';

export class NavetCardEditor extends LitElement {
  private currentHass?: Hass;
  private entityOptions: string[] = [];
  get hass() { return this.currentHass; }
  set hass(value: Hass | undefined) {
    const old = this.currentHass;
    this.currentHass = value;
    if (!old || old.entities !== value?.entities || old.areas !== value?.areas || old.devices !== value?.devices || old.language !== value?.language || old.locale !== value?.locale || old.themes !== value?.themes) {
      this.entityOptions = Object.keys(value?.states ?? {});
      this.requestUpdate();
    }
  }
  private config?: CardConfig;
  private error = '';
  static styles = css`
    :host { display:block; font-family:var(--paper-font-body1_-_font-family, system-ui); color:var(--primary-text-color, #222); }
    * { box-sizing:border-box; } form { display:grid; gap:16px; } label { display:grid; gap:6px; font-size:13px; }
    input, select { font:inherit; color:inherit; background:var(--card-background-color, #fff); border:1px solid var(--divider-color, #aaa); border-radius:8px; min-height:42px; padding:10px; width:100%; }
    input:focus-visible, select:focus-visible { outline:2px solid var(--primary-color, #ea8c55); outline-offset:2px; }
    .pair { display:grid; grid-template-columns:1fr 1fr; gap:12px; } .check { display:flex; align-items:center; } .check input { width:18px; min-height:18px; }
    details { padding:12px; border:1px solid var(--divider-color, #bbb); border-radius:12px; } summary { cursor:pointer; font-size:14px; } .fields { display:grid; gap:12px; margin-top:14px; }
    .item { border-top:1px solid var(--divider-color,#bbb); padding:12px 0; display:grid; gap:10px; } button { min-height:36px; border:1px solid var(--divider-color,#aaa); border-radius:8px; padding:8px; color:inherit; background:var(--card-background-color,#fff); cursor:pointer; } textarea { color:inherit; background:var(--card-background-color,#fff); font:inherit; }
    p { font-size:12px; line-height:1.5; } .error { color:var(--error-color, #b33); } @media(max-width:350px) { .pair { grid-template-columns:1fr; } }
  `;
  setConfig(config: CardConfig) {
    this.config = structuredClone(config);
    this.error = '';
    this.requestUpdate();
  }
  private get kind(): CardKind {
    return KINDS.find((kind) => this.config?.type === `custom:${tagFor(kind)}`) ?? 'switch';
  }
  private t(key: string) {
    return translate(key, this.hass?.locale?.language ?? this.hass?.language);
  }
  private changeConfig(key: string, value: unknown, parent?: string) {
    if (!this.config) return;
    const next = structuredClone(this.config);
    if (parent) {
      const nested = { ...((next[parent] as Record<string, unknown>) ?? {}) };
      if (value === '' || value === undefined) delete nested[key];
      else nested[key] = value;
      if (Object.keys(nested).length) next[parent] = nested;
      else delete next[parent];
    } else if (value === '' || value === undefined) delete next[key];
    else next[key] = value;
    this.commit(next);
  }
  private commit(next: CardConfig) {
    this.config = next;
    try {
      validateConfig(next, this.kind);
      this.error = '';
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: structuredClone(next) }, bubbles: true, composed: true }));
    } catch (error) { this.error = error instanceof Error ? error.message : 'Invalid configuration.'; }
    this.requestUpdate();
  }
  private listChange(key: 'sub_controls' | 'links', index: number, field: string, value: unknown) {
    const next = structuredClone(this.config!);
    const list = next[key] as unknown as Record<string, unknown>[];
    if (value === '') delete list[index][field]; else list[index][field] = value;
    this.commit(next);
  }
  private removeItem(key: 'sub_controls' | 'links', index: number) {
    const next = structuredClone(this.config!);
    next[key]?.splice(index,1);
    this.commit(next);
  }
  private picker(key: string, value: unknown, selector: Record<string,unknown>, change: (value: unknown)=>void) {
    if (customElements.get('ha-form')) return html`<ha-form .hass=${this.hass} .data=${{[key]: value}} .schema=${[{name:key,selector}]} .computeLabel=${()=>this.t(key)} @value-changed=${(e: CustomEvent)=>{e.stopPropagation();change(e.detail.value[key]);}}></ha-form>`;
    if ('area' in selector) return html`<label>${this.t(key)}<select .value=${String(value ?? '')} @change=${(e: Event)=>change((e.target as HTMLSelectElement).value)}><option value="" .selected=${live(!value)}>Choose an area</option>${Object.entries(this.hass?.areas ?? {}).map(([id,area])=>html`<option value=${id} .selected=${live(id === value)}>${area.name}</option>`)}</select></label>`;
    const options = this.entityOptions.filter(id => key !== 'entity' || this.kind === 'room' || domainAllowed(this.kind,id));
    return html`<label>${this.t(key)}<select .value=${String(value ?? '')} @change=${(e: Event)=>change((e.target as HTMLSelectElement).value)}><option value="" .selected=${live(!value)}>Choose an entity</option>${options.map(id=>html`<option value=${id} .selected=${live(id === value)}>${this.hass?.states[id]?.attributes.friendly_name ?? id} · ${id}</option>`)}</select></label>`;
  }
  private field(key: string, value: unknown, parent?: string, type = 'text') {
    return html`<label>${this.t(key)}<input type=${type} .value=${String(value ?? '')} @change=${(
      e: Event,
    ) => {
      const value = (e.target as HTMLInputElement).value;
      this.changeConfig(key, type === 'number' && value !== '' ? Number(value) : value, parent);
    }} /></label>`;
  }
  private action(key: 'tap_action' | 'hold_action' | 'double_tap_action') {
    const a = this.config?.[key];
    const actions: ActionConfig['action'][] = [
      'none',
      'more-info',
      'navigate',
      'perform-action',
      ...(['light', 'switch'].includes(this.kind) ? ['toggle' as const] : []),
    ];
    if (customElements.get('ha-form')) return html`<details><summary>${key.replaceAll('_',' ')}</summary><ha-form .hass=${this.hass} .data=${{[key]:a}} .schema=${[{name:key,selector:{ui_action:{actions:['none','more-info','navigate','perform-action',...(['light','switch'].includes(this.kind)?['toggle']:[])]}}}]} .computeLabel=${()=> 'Action'} @value-changed=${(e:CustomEvent)=>{e.stopPropagation();this.changeConfig(key,e.detail.value[key]);}}></ha-form></details>`;
    return html`<details><summary>${key.replaceAll('_', ' ')}</summary><div class="fields"><label>Action<select .value=${a?.action ?? ''} @change=${(
      e: Event,
    ) => {
      const value = (e.target as HTMLSelectElement).value;
      if (!value) this.changeConfig(key, undefined);
      else this.changeConfig('action', value, key);
    }}><option value="">Default</option>${actions.map((action) => html`<option value=${action} .selected=${live(action === a?.action)}>${action}</option>`)}</select></label>
    ${a?.action === 'navigate' ? this.field('navigation_path', a.navigation_path, key) : nothing}
    ${a?.action === 'perform-action' ? html`${this.field('perform_action', a.perform_action, key)}<p>Use YAML for action data, targets, and confirmation text. Those fields are preserved when editing here.</p>` : nothing}
    <label class="check"><input type="checkbox" .checked=${!!a?.confirmation} @change=${(e: Event) => this.changeConfig('confirmation', (e.target as HTMLInputElement).checked || undefined, key)} />Confirm before running</label>
    </div></details>`;
  }
  protected render() {
    const c = this.config;
    if (!c) return nothing;
    return html`<form @submit=${(e: Event) => e.preventDefault()}>
      ${this.kind === 'navigation' ? html`<div>${(c.links ?? []).map((link,i)=>html`<div class="item"><label>Name<input .value=${link.name} @change=${(e:Event)=>this.listChange('links',i,'name',(e.target as HTMLInputElement).value)}></label><label>Path or room hash<input .value=${link.path} @change=${(e:Event)=>this.listChange('links',i,'path',(e.target as HTMLInputElement).value)}></label><button type="button" @click=${()=>this.removeItem('links',i)}>Remove link</button></div>`)}<button type="button" ?disabled=${(c.links?.length ?? 0)>=20} @click=${()=>this.changeConfig('links',[...(c.links ?? []),{name:'Home',path:'/lovelace/0'}])}>Add link</button></div>` : this.kind === 'room' ? html`
        ${this.picker('area',c.area,{area:{}},value=>this.changeConfig('area',value))}
        ${customElements.get('ha-form') ? html`<ha-form .hass=${this.hass} .data=${{entities:c.entities}} .schema=${[{name:'entities',selector:{entity:{multiple:true}}}]} .computeLabel=${()=> 'Selected entities'} @value-changed=${(e:CustomEvent)=>{e.stopPropagation();this.changeConfig('entities',e.detail.value.entities?.length?e.detail.value.entities:undefined);}}></ha-form>` : html`<label>Entities (one per line)<textarea style="min-height:90px" .value=${c.entities?.join('\n') ?? ''} @change=${(e: Event) => this.changeConfig('entities', (e.target as HTMLTextAreaElement).value.trim() ? (e.target as HTMLTextAreaElement).value.trim().split(/\s+/) : undefined)}></textarea></label>`}
        ${this.field('panel_id',c.panel_id)}<p>${this.hass ? roomEntityIds(this.hass,c.area,c.entities).length : 0} entities in this room</p>` : this.picker('entity',c.entity,{entity:{filter:{domain:this.entityOptions.filter(id=>domainAllowed(this.kind,id)).map(id=>id.split('.')[0]).filter((v,i,a)=>a.indexOf(v)===i)}}},value=>this.changeConfig('entity',value))}
      <div class="pair">${this.field('name', c.name)}${this.field('icon', c.icon)}</div>
      <label>${this.t('layout')}<select .value=${c.layout ?? 'compact'} @change=${(e: Event) => this.changeConfig('layout', (e.target as HTMLSelectElement).value)}><option value="compact" .selected=${live(!c.layout || c.layout === 'compact')}>Compact</option><option value="comfortable" .selected=${live(c.layout === 'comfortable')}>Comfortable</option><option value="row" .selected=${live(c.layout === 'row')}>Row</option></select></label>
      <label class="check"><input type="checkbox" .checked=${c.show_state !== false} @change=${(e: Event) => this.changeConfig('show_state', (e.target as HTMLInputElement).checked)} />${this.t('show_state')}</label>
      ${this.kind === 'light' ? html`<label class="check"><input type="checkbox" .checked=${c.show_brightness !== false} @change=${(e: Event) => this.changeConfig('show_brightness', (e.target as HTMLInputElement).checked)} />${this.t('show_brightness')}</label>` : nothing}
      ${this.kind === 'sensor' ? html`<div class="pair">${this.field('attribute', c.attribute)}${this.field('unit', c.unit)}</div>` : nothing}
      <details><summary>Appearance</summary><div class="fields"><div class="pair">${this.field('accent', c.appearance?.accent, 'appearance')}${this.field('radius', c.appearance?.radius, 'appearance', 'number')}</div>
      <label>Preset<select .value=${c.appearance?.preset ?? 'warm'} @change=${(e:Event)=>this.changeConfig('preset',(e.target as HTMLSelectElement).value,'appearance')}>${['warm','neutral','cool'].map(v=>html`<option value=${v} .selected=${live(v === (c.appearance?.preset ?? 'warm'))}>${v}</option>`)}</select></label>
      <label>Effects<select .value=${c.appearance?.effects ?? 'low'} @change=${(e:Event)=>this.changeConfig('effects',(e.target as HTMLSelectElement).value,'appearance')}><option value="low" .selected=${live(c.appearance?.effects !== 'high')}>Low</option><option value="high" .selected=${live(c.appearance?.effects === 'high')}>High</option></select></label>
      <label>${this.t('theme')}<select .value=${c.appearance?.theme ?? 'auto'} @change=${(e: Event) => this.changeConfig('theme', (e.target as HTMLSelectElement).value, 'appearance')}>${['auto', 'light', 'dark', 'black', 'glass'].map((theme) => html`<option value=${theme} .selected=${live(theme === (c.appearance?.theme ?? 'auto'))}>${theme}</option>`)}</select></label></div></details>
      <details><summary>Sub-controls</summary><div class="fields">${(c.sub_controls ?? []).map((sub,i)=>html`<div class="item">${this.picker('subEntity',sub.entity,{entity:{}},value=>this.listChange('sub_controls',i,'entity',value))}<label>Name<input .value=${sub.name ?? ''} @change=${(e:Event)=>this.listChange('sub_controls',i,'name',(e.target as HTMLInputElement).value)}></label><label>Control<select .value=${sub.control ?? 'state'} @change=${(e:Event)=>this.listChange('sub_controls',i,'control',(e.target as HTMLSelectElement).value)}>${['state','toggle','slider','select'].map(type=>html`<option value=${type} .selected=${live(type === (sub.control ?? 'state'))}>${type}</option>`)}</select></label><button type="button" @click=${()=>this.removeItem('sub_controls',i)}>Remove sub-control</button></div>`)}<button type="button" ?disabled=${(c.sub_controls?.length ?? 0)>=8} @click=${()=>this.changeConfig('sub_controls',[...(c.sub_controls ?? []),{entity:this.entityOptions[0] ?? 'sensor.example',control:'state'}])}>Add sub-control</button><p>Conditional visibility and custom sub-control actions can be configured in YAML and are preserved here.</p></div></details>
      ${this.action('tap_action')}${this.action('hold_action')}${this.action('double_tap_action')}
      ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
    </form>`;
  }
}
