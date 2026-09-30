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
import { translate } from './i18n';

export class NavetCardEditor extends LitElement {
  static properties = { hass: { attribute: false } };
  hass?: Hass;
  private config?: CardConfig;
  private error = '';
  static styles = css`
    :host { display:block; font-family:var(--paper-font-body1_-_font-family, system-ui); color:var(--primary-text-color, #222); }
    * { box-sizing:border-box; } form { display:grid; gap:16px; } label { display:grid; gap:6px; font-size:13px; }
    input, select { font:inherit; color:inherit; background:var(--card-background-color, #fff); border:1px solid var(--divider-color, #aaa); border-radius:8px; min-height:42px; padding:10px; width:100%; }
    input:focus-visible, select:focus-visible { outline:2px solid var(--primary-color, #ea8c55); outline-offset:2px; }
    .pair { display:grid; grid-template-columns:1fr 1fr; gap:12px; } .check { display:flex; align-items:center; } .check input { width:18px; min-height:18px; }
    details { padding:12px; border:1px solid var(--divider-color, #bbb); border-radius:12px; } summary { cursor:pointer; font-size:14px; } .fields { display:grid; gap:12px; margin-top:14px; }
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
    this.config = next;
    try {
      validateConfig(next, this.kind);
      this.error = '';
      this.dispatchEvent(
        new CustomEvent('config-changed', {
          detail: { config: structuredClone(next) },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Invalid configuration.';
    }
    this.requestUpdate();
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
    return html`<details><summary>${key.replaceAll('_', ' ')}</summary><div class="fields"><label>Action<select .value=${a?.action ?? ''} @change=${(
      e: Event,
    ) => {
      const value = (e.target as HTMLSelectElement).value;
      if (!value) this.changeConfig(key, undefined);
      else this.changeConfig('action', value, key);
    }}><option value="">Default</option>${actions.map((action) => html`<option value=${action}>${action}</option>`)}</select></label>
    ${a?.action === 'navigate' ? this.field('navigation_path', a.navigation_path, key) : nothing}
    ${a?.action === 'perform-action' ? html`${this.field('perform_action', a.perform_action, key)}<p>Use YAML for action data, targets, and confirmation text. Those fields are preserved when editing here.</p>` : nothing}
    <label class="check"><input type="checkbox" .checked=${!!a?.confirmation} @change=${(e: Event) => this.changeConfig('confirmation', (e.target as HTMLInputElement).checked || undefined, key)} />Confirm before running</label>
    </div></details>`;
  }
  protected render() {
    const c = this.config;
    if (!c) return nothing;
    const entities = Object.keys(this.hass?.states ?? {}).filter(
      (id) => this.kind === 'room' || domainAllowed(this.kind, id),
    );
    return html`<form @submit=${(e: Event) => e.preventDefault()}>
      ${this.kind === 'room' ? html`${this.field('area', c.area)}<label>Entities (one per line)<textarea style="min-height:90px" .value=${c.entities?.join('\n') ?? ''} @change=${(e: Event) => this.changeConfig('entities', (e.target as HTMLTextAreaElement).value.trim() ? (e.target as HTMLTextAreaElement).value.trim().split(/\s+/) : undefined)}></textarea></label>` : html`<label>${this.t('entity')}<input list="entities" .value=${c.entity ?? ''} @change=${(e: Event) => this.changeConfig('entity', (e.target as HTMLInputElement).value)} /><datalist id="entities">${entities.map((id) => html`<option value=${id}>${this.hass!.states[id].attributes.friendly_name ?? id}</option>`)}</datalist></label>`}
      <div class="pair">${this.field('name', c.name)}${this.field('icon', c.icon)}</div>
      <label>${this.t('layout')}<select .value=${c.layout ?? 'compact'} @change=${(e: Event) => this.changeConfig('layout', (e.target as HTMLSelectElement).value)}><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select></label>
      <label class="check"><input type="checkbox" .checked=${c.show_state !== false} @change=${(e: Event) => this.changeConfig('show_state', (e.target as HTMLInputElement).checked)} />${this.t('show_state')}</label>
      ${this.kind === 'light' ? html`<label class="check"><input type="checkbox" .checked=${c.show_brightness !== false} @change=${(e: Event) => this.changeConfig('show_brightness', (e.target as HTMLInputElement).checked)} />${this.t('show_brightness')}</label>` : nothing}
      ${this.kind === 'sensor' ? html`<div class="pair">${this.field('attribute', c.attribute)}${this.field('unit', c.unit)}</div>` : nothing}
      <details><summary>Appearance</summary><div class="fields"><div class="pair">${this.field('accent', c.appearance?.accent, 'appearance')}${this.field('radius', c.appearance?.radius, 'appearance', 'number')}</div>
      <label>${this.t('theme')}<select .value=${c.appearance?.theme ?? 'auto'} @change=${(e: Event) => this.changeConfig('theme', (e.target as HTMLSelectElement).value, 'appearance')}>${['auto', 'light', 'dark', 'black', 'glass'].map((theme) => html`<option value=${theme}>${theme}</option>`)}</select></label></div></details>
      ${this.action('tap_action')}${this.action('hold_action')}${this.action('double_tap_action')}
      ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
    </form>`;
  }
}
