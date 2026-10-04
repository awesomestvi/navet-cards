import { css } from 'lit';

// Independent Lit adaptation of Navet's EntityCardHeader, compact controls and family surfaces.
export const cardStyles = css`
  :host { container-type:inline-size; display:block; height:100%; min-width:0; font-family:var(--navet-card-font, Inter, system-ui, sans-serif); }
  * { box-sizing:border-box; }
  .card { --accent:var(--navet-card-accent, var(--family-accent,#f97316)); --surface:#151519; --text:var(--navet-card-text,#e5e7eb); --muted:#a1a1aa; --control:rgba(255,255,255,.08); --edge:rgba(255,255,255,.09); position:relative; isolation:isolate; display:flex; flex-direction:column; height:100%; min-height:168px; padding:12px; gap:8px; border:1px solid var(--navet-card-border,var(--edge)); border-radius:var(--navet-card-radius,24px); background:var(--navet-card-background,var(--surface)); color:var(--text); overflow:hidden; }
  .card[data-theme='light'] { --surface:#fafafa; --text:var(--navet-card-text,#1e293b); --muted:#64748b; --control:rgba(15,23,42,.055); --edge:rgba(15,23,42,.12); }
  .card[data-theme='black'] { --surface:#000; }
  .card[data-theme='glass'] { --surface:rgba(40,36,48,.55); --control:rgba(255,255,255,.13); --edge:rgba(255,255,255,.3); backdrop-filter:blur(12px); }
  .card[data-active]:not([data-kind='media']):not([data-kind='sensor']):not([data-kind='cover']) { --text:var(--navet-card-text,color-mix(in srgb,var(--accent) 28%,#fff)); --muted:color-mix(in srgb,var(--accent) 45%,#d4d4d8); background:var(--navet-card-background,linear-gradient(135deg,color-mix(in srgb,var(--accent) 38%,#1b1414),color-mix(in srgb,var(--accent) 20%,#161016))); border-color:color-mix(in srgb,var(--accent) 25%,transparent); }
  .card[data-theme='black'][data-active]:not([data-kind='media']):not([data-kind='sensor']):not([data-kind='cover']) { background:var(--navet-card-background,linear-gradient(155deg,color-mix(in srgb,var(--accent) 18%,#080808),color-mix(in srgb,var(--accent) 28%,#050505))); }
  .card[data-theme='glass'][data-active]:not([data-kind='media']):not([data-kind='sensor']):not([data-kind='cover']) { background:var(--navet-card-background,linear-gradient(135deg,color-mix(in srgb,var(--accent) 55%,transparent),color-mix(in srgb,var(--accent) 28%,#201820))); }
  .card[data-theme='light'][data-active]:not([data-kind='media']):not([data-kind='sensor']):not([data-kind='cover']) { --text:var(--navet-card-text,color-mix(in srgb,var(--accent) 20%,#1e293b)); --muted:color-mix(in srgb,var(--accent) 25%,#334155); --control:rgba(255,255,255,.3); background:var(--navet-card-background,color-mix(in srgb,var(--accent) 65%,#fff)); }
  .card[data-kind='switch'] { min-height:64px; justify-content:center; }
  .card[data-kind='cover'] { min-height:248px; }
  .card[data-layout='comfortable'] { min-height:248px; }
  .header { display:flex; align-items:center; gap:8px; z-index:2; min-width:0; }
  button { font:inherit; color:inherit; cursor:pointer; touch-action:manipulation; }
  button:disabled { cursor:default; opacity:.5; }
  .primary { display:flex; flex:1; align-items:center; min-width:0; border:0; background:none; padding:0; text-align:start; border-radius:6px; }
  .labels { display:flex; flex-direction:column; min-width:0; }
  .name { display:block; font-size:12px; font-weight:600; line-height:18px; overflow-wrap:anywhere; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  .eyebrow { display:block; font-size:11px; line-height:14px; color:var(--muted); }
  .state { font-size:12px; line-height:18px; color:var(--muted); overflow-wrap:anywhere; }
  .icon,.action { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; flex:0 0 32px; border-radius:50%; border:1px solid var(--edge); background:var(--control); padding:7px; }
  .icon { color:var(--muted); }
  [data-active] .icon { color:var(--text); }
  svg { display:block; width:100%; height:100%; }
  ha-icon { --mdc-icon-size:16px; width:16px; height:16px; }
  .actions { display:flex; align-items:center; gap:6px; margin-top:auto; z-index:2; }
  .action { font-size:11px; }
  .action.selected { background:color-mix(in srgb,var(--accent) 70%,transparent); color:#fff; }
  .details { margin-inline-start:auto; }
  .metric { display:flex; align-items:baseline; gap:4px; margin-top:auto; font-size:30px; font-weight:500; font-variant-numeric:tabular-nums; letter-spacing:-.035em; color:color-mix(in srgb,var(--accent) 55%,var(--text)); z-index:1; }
  .metric.long { font-size:18px; letter-spacing:0; overflow-wrap:anywhere; }
  .unit { font-size:18px; font-weight:400; letter-spacing:0; }
  .sensor-details { position:absolute; right:12px; top:12px; }
  [data-kind='sensor'] .header { padding-right:34px; }
  .sensor-value { margin-top:auto; }
  .slider { display:grid; gap:8px; min-width:0; z-index:2; margin-top:auto; }
  .slider-label { display:flex; justify-content:space-between; gap:8px; font-size:12px; color:var(--muted); }
  output { font-weight:600; font-variant-numeric:tabular-nums; }
  input[type='range'] { appearance:none; width:100%; min-width:0; height:22px; margin:0; background:transparent; cursor:pointer; --fill:var(--accent); }
  input[type='range']::-webkit-slider-runnable-track { height:3px; border-radius:4px; background:linear-gradient(to right,var(--fill) 0 var(--progress,50%),var(--control) var(--progress,50%) 100%); }
  input[type='range']::-webkit-slider-thumb { appearance:none; width:16px; height:16px; border-radius:50%; margin-top:-6.5px; background:var(--fill); box-shadow:0 0 0 3px color-mix(in srgb,var(--fill) 20%,transparent); }
  input[type='range']::-moz-range-track { height:3px; background:var(--control); }
  input[type='range']::-moz-range-progress { height:3px; background:var(--fill); }
  input[type='range']::-moz-range-thumb { width:16px; height:16px; border:0; border-radius:50%; background:var(--fill); }
  input:disabled { opacity:.45; cursor:default; }
  button:focus-visible,input:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
  .notice { margin:0; font-size:12px; line-height:1.5; color:var(--muted); z-index:3; }
  .error-row { display:flex; align-items:center; gap:6px; z-index:4; flex-shrink:0; }
  .error { color:var(--error-color,#fca5a5); }
  .dismiss { margin-inline-start:auto; padding:6px; background:none; border:0; }
  .climate-value { margin-top:auto; z-index:1; max-width:70%; }
  .climate-value .metric { font-weight:650; }
  .climate-state { font-size:12px; line-height:18px; color:var(--muted); }
  .climate-visual { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
  .dial { position:absolute; width:190px; height:190px; right:-106px; top:50%; transform:translateY(-50%); border-radius:50%; border:13px solid color-mix(in srgb,var(--accent) 55%,#4b5563); box-shadow:0 0 0 7px color-mix(in srgb,var(--accent) 20%,transparent),inset 0 0 0 5px rgba(0,0,0,.15),inset 0 0 26px rgba(255,255,255,.12); background:radial-gradient(circle at 25% 40%,rgba(255,255,255,.12),transparent 70%); }
  .dial::after { content:''; position:absolute; inset:-28px; border-radius:50%; background:repeating-conic-gradient(from 2deg,rgba(255,255,255,.18) 0deg 1deg,transparent 1deg 14deg); mask:radial-gradient(transparent 68%,#000 69% 73%,transparent 74%); }
  .temperature-slider { position:absolute; inset:12px; z-index:1; }
  .temperature-slider .slider-label { position:absolute; top:0; left:0; width:1px; height:1px; overflow:hidden; white-space:nowrap; clip-path:inset(50%); }
  .temperature-slider output,.cover-position output { max-width:1px; max-height:1px; overflow:hidden; }
  .temperature-slider input { position:absolute; width:76px; height:100%; right:0; top:0; writing-mode:vertical-lr; direction:rtl; opacity:0; }
  .temperature-slider input:focus-visible { opacity:1; }
  .cover-fill { position:absolute; inset:0 0 auto; height:calc(52px + (100% - 118px) * var(--closure,.25)); background:repeating-linear-gradient(0deg,transparent 0 6px,rgba(0,0,0,.06) 6px 8px),linear-gradient(135deg,color-mix(in srgb,var(--accent) 55%,transparent),color-mix(in srgb,var(--accent) 25%,transparent)); border-bottom:1px solid color-mix(in srgb,var(--accent) 45%,transparent); pointer-events:none; }
  .cover-position { position:absolute; inset:40px 10px 54px auto; width:32px; z-index:3; }
  .cover-position .slider-label { position:absolute; top:0; left:0; width:1px; height:1px; overflow:hidden; white-space:nowrap; clip-path:inset(50%); }
  .cover-position input { writing-mode:vertical-lr; direction:rtl; width:32px; height:100%; }
  .cover-position input::-webkit-slider-runnable-track { width:2px; height:100%; background:transparent; }
  .cover-position input::-webkit-slider-thumb { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m9 10 3-3 3 3m-6 4 3 3 3-3' stroke='%23666' fill='none' stroke-width='1.5'/%3E%3C/svg%3E"); width:24px; height:24px; margin:0 0 0 -11px; background-color:var(--text); box-shadow:0 1px 5px rgba(0,0,0,.2); }
  .cover-position input::-moz-range-track { width:2px; height:100%; background:transparent; }
  .cover-position input::-moz-range-thumb { width:24px; height:24px; background:var(--text); }
  .cover-value { margin-top:auto; z-index:2; pointer-events:none; }
  .cover-value .metric { font-size:26px; font-weight:650; }
  .card[data-kind='cover'] .actions { margin-top:0; }
  .card[data-kind='media'] { padding-left:calc(40% + 12px); background:var(--navet-card-background,linear-gradient(135deg,#29292b,#171719)); --text:var(--navet-card-text,#eee); --muted:#b8b8bc; }
  .artwork { position:absolute; inset:0 auto 0 0; width:40%; background:radial-gradient(circle at 35% 20%,#555,#222 55%,#18181b); display:grid; place-items:center; overflow:hidden; }
  .artwork img { width:100%; height:100%; object-fit:cover; }
  .artwork svg { width:56px; height:56px; padding:8px; border:1px solid rgba(255,255,255,.3); border-radius:50%; color:#aaa; background:rgba(255,255,255,.04); }
  [data-kind='media'] .header .icon { display:none; }
  .card[data-theme='light'][data-active] .metric { color:var(--text); }
  .card[data-theme='light'][data-active] input { --fill:var(--text); }
  .volume-control summary { list-style:none; }
  .volume-control summary::-webkit-details-marker { display:none; }
  .volume-panel { position:absolute; bottom:50px; left:12px; right:12px; padding:12px; border:1px solid var(--edge); border-radius:14px; background:#252529; color:#eee; z-index:6; }
  .volume-control:not([open]) .volume-panel { display:none; }
  .volume-panel .slider-label { color:#ccc; }
  .track { font-size:14px; font-weight:600; line-height:18px; overflow-wrap:anywhere; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  .artist { font-size:12px; line-height:16px; color:var(--muted); }
  .media-info { min-width:0; }
  .timeline { display:flex; align-items:center; gap:5px; font-size:10px; color:var(--muted); }
  .timeline progress { width:100%; min-width:0; height:3px; accent-color:#ccc; }
  .room-summary { display:flex; gap:6px; align-items:baseline; margin-top:auto; }
  .room-count { font-size:30px; font-weight:600; }
  .room-members { display:flex; gap:6px; flex-wrap:wrap; }
  .room-members .icon { width:28px; height:28px; flex-basis:28px; padding:6px; }
  dialog { width:min(460px, calc(100vw - 24px)); max-height:calc(100dvh - 32px); padding:0; border:1px solid var(--navet-card-border, rgba(128,128,128,.2)); border-radius:24px; background:var(--surface); color:var(--text); overflow:auto; }
  dialog::backdrop { background:rgba(0,0,0,.55); }
  .dialog-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:20px; }
  h2 { margin:0; font-size:18px; overflow-wrap:anywhere; }
  .room-list { display:grid; gap:4px; padding:0 12px 12px; }
  .room-row { display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%; background:none; border:0; padding:12px; border-radius:12px; font:inherit; font-size:13px; color:var(--text); text-align:start; cursor:pointer; }
  .room-row span:last-child { color:var(--muted); font-size:12px; }
  .room-row:hover { background:color-mix(in srgb, var(--muted) 8%, transparent); }
  .dialog-footer { display:flex; justify-content:flex-end; padding:12px 20px max(12px, env(safe-area-inset-bottom)); border-top:1px solid color-mix(in srgb, var(--muted) 18%, transparent); }

  @container (max-width:220px) {
    .card { gap:7px; }
    .name { font-size:12px; }
    .card[data-kind='media'] { padding-left:12px; padding-top:78px; min-height:248px; }
    .artwork { width:100%; height:66px; }
    .artwork svg { width:40px; height:40px; }
    .climate-visual { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
  .dial { width:164px; height:164px; right:-112px; }
  }
`;
