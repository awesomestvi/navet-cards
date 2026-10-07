import { LitElement, css, html, nothing } from 'lit';

/** Independent adaptation of Navet's RotaryKnob: relative rotation, 18 degrees per step. */
export class ClimateOrb extends LitElement {
  static properties = {
    value: { type: Number }, min: { type: Number }, max: { type: Number },
    step: { type: Number }, disabled: { type: Boolean }, interactive: { type: Boolean },
    label: { type: String }, unit: { type: String },
  };
  value = 22;
  min = 7;
  max = 30;
  step = .5;
  disabled = false;
  interactive = true;
  label = '';
  unit = '°C';
  private drag?: { id: number; angle: number; turns: number; start: number; value: number };
  static styles = css`
    :host { display:block; position:absolute; top:0; right:0; width:100px; height:100%; z-index:1; overflow:hidden; }
    .orb { position:absolute; top:50%; right:-188px; width:272px; height:272px; transform:translateY(-50%); border-radius:50%; touch-action:none; user-select:none; cursor:grab; outline:none; }
    .orb[aria-disabled='true'] { cursor:default; }
    .orb:focus-visible { outline:2px solid var(--text); outline-offset:8px; }
    .face { position:absolute; inset:0; border:14px solid color-mix(in srgb,var(--accent) 70%,#fed7aa); border-radius:50%; background:radial-gradient(circle at 30% 45%,color-mix(in srgb,var(--accent) 45%,#fff),color-mix(in srgb,var(--accent) 35%,#4b3528)); box-shadow:0 0 0 7px color-mix(in srgb,var(--accent) 38%,transparent),inset 0 0 0 5px rgba(0,0,0,.12); pointer-events:none; }
    .face::after { content:''; position:absolute; inset:12px; border-radius:50%; border:2px solid color-mix(in srgb,var(--accent) 28%,transparent); }
    .ticks { position:absolute; inset:-24px; border-radius:50%; pointer-events:none; background:repeating-conic-gradient(from 2deg,var(--muted) 0deg .7deg,transparent .7deg 9deg); mask:radial-gradient(transparent 66%,#000 67% 70%,transparent 71%); }
    @media (prefers-reduced-motion:reduce) { .ticks { transition:none; } }
  `;
  cancelInteraction() {
    const drag = this.drag;
    this.drag = undefined;
    const target = this.renderRoot.querySelector<HTMLElement>('.orb');
    if (drag && target?.hasPointerCapture(drag.id)) target.releasePointerCapture(drag.id);
    if (drag) this.emit('value-cancel', drag.start);
  }
  disconnectedCallback() { this.drag = undefined; super.disconnectedCallback(); }
  private snap(value: number) {
    return Number(Math.max(this.min, Math.min(this.max, this.min + Math.round((value - this.min) / this.step) * this.step)).toFixed(3));
  }
  private emit(type: string, value: number) {
    this.dispatchEvent(new CustomEvent(type, { detail: { value }, bubbles: true, composed: true }));
  }
  private angle(event: PointerEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI;
  }
  private start(event: PointerEvent) {
    if (this.disabled || !this.interactive || event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.focus();
    target.setPointerCapture(event.pointerId);
    this.drag = { id: event.pointerId, angle: this.angle(event), turns: 0, start: this.value, value: this.value };
  }
  private move(event: PointerEvent) {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    if (this.disabled) { this.end(event, true); return; }
    const angle = this.angle(event);
    let delta = angle - drag.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    drag.turns += delta;
    drag.angle = angle;
    const value = this.snap(drag.start + drag.turns / 18 * this.step);
    if (value !== drag.value) { drag.value = value; this.emit('value-input', value); }
  }
  private end(event: PointerEvent, cancelled = false) {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const drag = this.drag;
    this.drag = undefined;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    this.emit(cancelled || this.disabled || drag.value === drag.start ? 'value-cancel' : 'value-commit', drag.value);
  }
  private key(event: KeyboardEvent) {
    if (this.disabled || !this.interactive) return;
    const values: Record<string, number> = {
      ArrowUp: this.value + this.step, ArrowRight: this.value + this.step,
      ArrowDown: this.value - this.step, ArrowLeft: this.value - this.step,
      Home: this.min, End: this.max,
    };
    if (!(event.key in values)) return;
    event.preventDefault();
    const value = this.snap(values[event.key]);
    if (value !== this.value) this.emit('value-commit', value);
  }
  protected render() {
    return html`<div class="orb" role=${this.interactive ? 'slider' : nothing}
      tabindex=${this.interactive && !this.disabled ? 0 : -1}
      aria-label=${this.interactive ? this.label : nothing} aria-disabled=${String(this.disabled)}
      aria-valuemin=${this.min} aria-valuemax=${this.max} aria-valuenow=${this.value} aria-valuetext=${`${this.value}${this.unit}`}
      @pointerdown=${this.start} @pointermove=${this.move} @pointerup=${(e: PointerEvent) => this.end(e)}
      @pointercancel=${(e: PointerEvent) => this.end(e, true)} @lostpointercapture=${(e: PointerEvent) => this.end(e, true)} @keydown=${this.key}>
      <div class="ticks" style=${`transform:rotate(${(this.value - this.min) / this.step * 14}deg)`}></div>
      <div class="face"></div>
    </div>`;
  }
}
if (!customElements.get('navet-climate-orb')) customElements.define('navet-climate-orb', ClimateOrb);
