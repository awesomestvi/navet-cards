import { css } from 'lit';

// Navet's compact card rhythm, pill actions, and state accents adapted to HA themes.
export const cardStyles = css`
  :host { container-type:inline-size; display:block; height:100%; min-width:0; font-family:var(--navet-card-font, var(--paper-font-body1_-_font-family, Inter, system-ui, sans-serif)); color:var(--primary-text-color, #eef0f4); }
  * { box-sizing:border-box; }
  .card { --accent:var(--navet-card-accent, #ea8c55); --surface:var(--navet-card-background, var(--ha-card-background, var(--card-background-color, #20242d))); --text:var(--navet-card-text, var(--primary-text-color, #eef0f4)); --muted:var(--secondary-text-color, #a4abb8); position:relative; display:flex; flex-direction:column; height:100%; min-height:112px; padding:16px; gap:14px; border:1px solid var(--navet-card-border, var(--ha-card-border-color, rgba(128,128,128,.18))); border-radius:var(--navet-card-radius, 24px); background:var(--surface); color:var(--text); overflow:hidden; }
  .card[data-active] { border-color:color-mix(in srgb, var(--accent) 36%, transparent); }
  .card[data-theme='light'] { --surface:#fff; --text:#20242d; --muted:#647080; }
  .card[data-theme='dark'] { --surface:#20242d; --text:#eef0f4; --muted:#a4abb8; }
  .card[data-theme='black'] { --surface:#101114; --text:#eef0f4; --muted:#a4abb8; }
  .card[data-theme='glass'] { --surface:rgba(32,36,45,.78); --text:#f5f5f5; --muted:#c4c8d0; backdrop-filter:blur(16px); }
  .card[data-layout='comfortable'] { min-height:160px; padding:20px; }
  .primary { display:flex; align-items:center; gap:12px; min-width:0; width:100%; background:none; border:0; padding:0; text-align:start; font:inherit; color:inherit; cursor:pointer; border-radius:12px; touch-action:manipulation; }
  button:disabled { cursor:default; }
  .icon { display:grid; place-items:center; width:44px; height:44px; flex:0 0 44px; border-radius:16px; background:color-mix(in srgb, var(--muted) 10%, transparent); color:var(--muted); }
  [data-active] .icon { background:color-mix(in srgb, var(--accent) 16%, transparent); color:var(--accent); }
  ha-icon { --mdc-icon-size:24px; display:block; width:24px; height:24px; }
  .labels { flex:1; min-width:0; }
  .name { display:block; font-size:14px; font-weight:650; line-height:1.35; overflow-wrap:anywhere; }
  .state { display:block; margin-top:4px; font-size:12px; line-height:1.4; color:var(--muted); overflow-wrap:anywhere; }
  .metric { display:flex; align-items:baseline; gap:5px; margin-top:2px; font-size:32px; font-weight:650; font-variant-numeric:tabular-nums; letter-spacing:-.04em; }
  .metric.long { font-size:20px; letter-spacing:0; overflow-wrap:anywhere; }
  .unit { font-size:13px; font-weight:450; color:var(--muted); letter-spacing:0; }
  .status-dot { flex:0 0 7px; width:7px; height:7px; border-radius:50%; background:var(--muted); opacity:.45; }
  [data-active] .status-dot { background:var(--accent); opacity:1; }
  .slider { display:grid; gap:8px; }
  .slider-label { display:flex; justify-content:space-between; font-size:11px; color:var(--muted); gap:8px; }
  output { font-variant-numeric:tabular-nums; }
  input[type='range'] { margin:0; width:100%; min-width:0; height:30px; cursor:pointer; accent-color:var(--accent); }
  input[type='range']:disabled { cursor:default; opacity:.55; }
  .actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:auto; }
  .action { display:inline-flex; align-items:center; justify-content:center; min-height:36px; padding:8px 13px; gap:7px; border:1px solid color-mix(in srgb, var(--muted) 22%, transparent); border-radius:100px; background:color-mix(in srgb, var(--muted) 8%, transparent); color:var(--text); font:inherit; font-size:12px; cursor:pointer; }
  .action:disabled { opacity:.5; }
  .action.accent { color:var(--accent); background:color-mix(in srgb, var(--accent) 10%, transparent); border-color:color-mix(in srgb, var(--accent) 24%, transparent); }
  button:focus-visible, input:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
  .notice { font-size:12px; line-height:1.5; color:var(--muted); margin:0; }
  .error { color:var(--error-color, #dc715e); }
  .error-row { display:flex; gap:8px; align-items:center; }
  .dismiss { margin-inline-start:auto; border:0; background:none; color:inherit; cursor:pointer; padding:8px; }
  dialog { width:min(460px, calc(100vw - 24px)); max-height:calc(100dvh - 32px); padding:0; border:1px solid var(--navet-card-border, rgba(128,128,128,.2)); border-radius:24px; background:var(--surface); color:var(--text); overflow:auto; }
  dialog::backdrop { background:rgba(0,0,0,.55); }
  .dialog-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:20px; }
  h2 { margin:0; font-size:18px; overflow-wrap:anywhere; }
  .room-list { display:grid; gap:4px; padding:0 12px 12px; }
  .room-row { display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%; background:none; border:0; padding:12px; border-radius:12px; font:inherit; font-size:13px; color:var(--text); text-align:start; cursor:pointer; }
  .room-row span:last-child { color:var(--muted); font-size:12px; }
  .room-row:hover { background:color-mix(in srgb, var(--muted) 8%, transparent); }
  .dialog-footer { display:flex; justify-content:flex-end; padding:12px 20px max(12px, env(safe-area-inset-bottom)); border-top:1px solid color-mix(in srgb, var(--muted) 18%, transparent); }
  @media (prefers-reduced-motion:no-preference) { .icon, .status-dot { transition:background-color 160ms ease, color 160ms ease; } }
  @container (max-width:220px) {
    .primary { display:grid; grid-template-columns:1fr auto; gap:9px; }
    .icon { width:32px; height:32px; border-radius:12px; }
    .icon ha-icon { --mdc-icon-size:20px; width:20px; height:20px; }
    .labels { grid-column:1 / -1; }
    .status-dot { grid-column:2; grid-row:1; }
    .name { font-size:13px; word-break:normal; }
    .card { padding:14px; gap:12px; }
    .actions { gap:6px; } .action { padding:8px 10px; }
  }
  @media (max-width:360px) { .card { padding:14px; } .name { font-size:13px; } }
`;
