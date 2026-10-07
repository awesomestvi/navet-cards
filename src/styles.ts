import { css } from 'lit';

// Independent Lit adaptation of Navet's EntityCardHeader, compact controls and family surfaces.
export const cardStyles = css`
  :host { container-type:inline-size; display:block; height:100%; min-width:0; font-family:var(--navet-card-font, Inter, system-ui, sans-serif); }
  * { box-sizing:border-box; }
  .card { --accent:var(--navet-card-accent, var(--family-accent,#f97316)); --surface:#151519; --text:var(--navet-card-text,#e5e7eb); --muted:#a1a1aa; --control:rgba(255,255,255,.08); --edge:rgba(255,255,255,.09); position:relative; isolation:isolate; display:flex; flex-direction:column; height:100%; min-height:168px; padding:12px; gap:8px; border:1px solid var(--navet-card-border,var(--edge)); border-radius:var(--navet-card-radius,24px); background:var(--navet-card-background,var(--surface)); color:var(--text); overflow:hidden; }
  .card[data-theme='light'] { --surface:#fafafa; --text:var(--navet-card-text,#1e293b); --muted:#64748b; --control:rgba(15,23,42,.055); --edge:rgba(15,23,42,.12); }
  .card[data-theme='black'] { --surface:#000; }
  .card[data-theme='glass'] { --surface:rgba(40,36,48,.55); --control:rgba(255,255,255,.13); --edge:rgba(255,255,255,.3);  }
  .card[data-theme='glass'][data-effects='high'] { backdrop-filter:blur(12px); }
  .card[data-theme='glass'][data-effects='low'] { --surface:#282430; }
  .card[data-active]:where(:not(:is([data-kind='media'],[data-kind='media-stack']))):where(:not([data-kind='sensor'])):where(:not([data-kind='cover'])):where(:not([data-kind='room'])) { --text:var(--navet-card-text,color-mix(in srgb,var(--accent) 28%,#fff)); --muted:color-mix(in srgb,var(--accent) 45%,#d4d4d8); background:var(--navet-card-background,linear-gradient(135deg,color-mix(in srgb,var(--accent) 38%,#1b1414),color-mix(in srgb,var(--accent) 20%,#161016))); border-color:color-mix(in srgb,var(--accent) 25%,transparent); }
  .card[data-theme='black'][data-active]:where(:not(:is([data-kind='media'],[data-kind='media-stack']))):where(:not([data-kind='sensor'])):where(:not([data-kind='cover'])):where(:not([data-kind='room'])) { background:var(--navet-card-background,linear-gradient(155deg,color-mix(in srgb,var(--accent) 18%,#080808),color-mix(in srgb,var(--accent) 28%,#050505))); }
  .card[data-theme='glass'][data-active]:where(:not(:is([data-kind='media'],[data-kind='media-stack']))):where(:not([data-kind='sensor'])):where(:not([data-kind='cover'])):where(:not([data-kind='room'])) { background:var(--navet-card-background,linear-gradient(135deg,color-mix(in srgb,var(--accent) 55%,transparent),color-mix(in srgb,var(--accent) 28%,#201820))); }
  .card[data-theme='light'][data-active]:where(:not(:is([data-kind='media'],[data-kind='media-stack']))):where(:not([data-kind='sensor'])):where(:not([data-kind='cover'])):where(:not([data-kind='room'])) { --text:var(--navet-card-text,color-mix(in srgb,var(--accent) 20%,#1e293b)); --muted:color-mix(in srgb,var(--accent) 25%,#334155); --control:rgba(255,255,255,.3); background:var(--navet-card-background,color-mix(in srgb,var(--accent) 65%,#fff)); }
  .card[data-theme='glass'][data-effects='low'][data-active]:where(:not([data-kind='room'])) { background:color-mix(in srgb,var(--accent) 25%,#282430); }
  .card[data-kind='switch'] { min-height:64px; justify-content:center; }
  .card[data-kind='cover'] { min-height:168px; }
  .card[data-layout='comfortable'] { min-height:248px; }
  .header { display:flex; align-items:center; gap:8px; z-index:2; min-width:0; }
  button { font:inherit; color:inherit; cursor:pointer; touch-action:manipulation; }
  button:disabled { cursor:default; opacity:.5; }
  .primary { min-height:36px; display:flex; flex:1; align-items:center; min-width:0; border:0; background:none; padding:0; text-align:start; border-radius:6px; }
  .labels { display:flex; flex-direction:column; min-width:0; }
  .name { display:block; font-size:12px; font-weight:600; line-height:18px; overflow-wrap:anywhere; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  .eyebrow { display:block; font-size:11px; line-height:14px; color:var(--muted); }
  .state { font-size:12px; line-height:18px; color:var(--muted); overflow-wrap:anywhere; }
  .icon,.action { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; flex:0 0 36px; border-radius:50%; border:1px solid var(--edge); background:var(--control); padding:7px; }
  .icon { color:var(--muted); }
  [data-active] .icon { color:var(--text); }
  svg { display:block; width:100%; height:100%; }
  ha-icon { --mdc-icon-size:16px; width:16px; height:16px; }
  .actions { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:auto; z-index:2; flex-shrink:0; }
  .action { font-size:11px; }
  .action.selected { background:color-mix(in srgb,var(--accent) 70%,transparent); color:#fff; }
  .details { margin-inline-start:auto; }
  .metric { display:flex; align-items:baseline; gap:4px; margin-top:auto; font-size:30px; font-weight:500; font-variant-numeric:tabular-nums; letter-spacing:-.035em; color:color-mix(in srgb,var(--accent) 55%,var(--text)); z-index:1; }
  .metric.long { font-size:18px; letter-spacing:0; overflow-wrap:anywhere; }
  .unit { font-size:18px; font-weight:400; letter-spacing:0; }
  .sensor-details { position:absolute; right:12px; bottom:12px; }
  [data-kind='sensor'] .sensor-value { padding-right:44px; }
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
  .climate-value .metric { font-weight:650; line-height:36px; }
  .climate-state { font-size:12px; line-height:18px; color:var(--muted); }
  .card[data-kind='climate'] { min-height:168px; }
  .climate-value { margin-top:0; max-width:100%; }
  .choice { display:grid; gap:4px; z-index:2; font-size:12px; min-width:0; }
  select { width:100%; min-width:0; min-height:36px; color:var(--text); background:var(--surface); border:1px solid var(--edge); border-radius:8px; font:inherit; padding:6px; }
  select:focus-visible,summary:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  .room-control { display:grid; gap:10px; padding:16px 20px; border-bottom:1px solid var(--edge); }
  .room-control .room-row { padding:0; border:0; min-height:40px; }
  .inline-actions { display:flex; gap:8px; flex-wrap:wrap; }
  .sub-controls { display:grid; gap:8px; z-index:2; }
  .sub-control { display:flex; flex-wrap:wrap; align-items:center; gap:8px; border-top:1px solid var(--edge); padding-top:8px; }
  .sub-name { display:grid; gap:3px; text-align:start; border:0; background:none; padding:4px 0; min-height:36px; flex:1; }
  .sub-control .slider,.sub-control .choice { flex-basis:100%; }
  .advanced-controls { z-index:2; border-top:1px solid var(--edge); padding-top:8px; }
  .advanced-controls summary { min-height:36px; display:flex; align-items:center; cursor:pointer; font-size:12px; }
  .advanced-controls[open] { display:grid; gap:10px; }
  .card:has(.advanced-controls[open]),.card:has(.sub-controls) { height:auto; min-height:100%; }
  nav { display:flex; gap:8px; flex-wrap:wrap; z-index:2; }
  .nav-link { padding:8px 12px; border:1px solid var(--edge); background:var(--control); border-radius:18px; min-height:36px; }
  .card[data-kind='navigation'] { min-height:100px; }
  .card[data-layout='row'] { min-height:100px; height:auto; gap:6px; }
  .card[data-layout='row'] .room-summary { flex-direction:row; align-items:center; gap:8px; }
  .card[data-layout='row'] .room-count { font-size:20px; }
  .card[data-layout='row'] .room-members { display:none; }
  @media (prefers-reduced-motion:reduce) { .card { scroll-behavior:auto; } }
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
  .card:is([data-kind='media'],[data-kind='media-stack']) { padding-left:calc(40% + 12px); background:var(--navet-card-background,linear-gradient(135deg,#29292b,#171719)); --surface:#252529; --text:var(--navet-card-text,#eee); --muted:#b8b8bc; }
  .artwork { position:absolute; inset:0 auto 0 0; width:40%; background:radial-gradient(circle at 35% 20%,#555,#222 55%,#18181b); display:grid; place-items:center; overflow:hidden; }
  .artwork img { width:100%; height:100%; object-fit:cover; }
  .artwork svg { width:56px; height:56px; padding:8px; border:1px solid rgba(255,255,255,.3); border-radius:50%; color:#aaa; background:rgba(255,255,255,.04); }
  :is([data-kind='media'],[data-kind='media-stack']) .header .icon { display:none; }
  .card[data-theme='light'][data-active] .metric { color:var(--text); }
  .card[data-theme='light'][data-active] input { --fill:var(--text); }
  .volume-control summary { list-style:none; }
  .volume-control summary::-webkit-details-marker { display:none; }
  .volume-panel { display:grid; gap:10px; position:absolute; bottom:50px; left:12px; right:12px; padding:12px; border:1px solid var(--edge); border-radius:14px; background:#252529; color:#eee; z-index:6; }
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
  .room-members .icon { width:36px; height:36px; flex-basis:36px; padding:7px; }
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
    [data-kind='climate'] .name { -webkit-line-clamp:1; }
    .card:is([data-kind='media'],[data-kind='media-stack']) { padding-left:12px; padding-top:78px; min-height:248px; }
    .artwork { width:100%; height:66px; }
    .artwork svg { width:40px; height:40px; }
  }

  /* Lit adaptation of BaseCard, EntityCardHeader and the medium family stories.
     Compact geometry is shared; comfortable and row are explicit compositions. */
  .card:is([data-kind='switch'],[data-kind='sensor'],[data-kind='room'],:is([data-kind='media'],[data-kind='media-stack']),[data-kind='climate']) .header { align-items:flex-start; }
  .card:is([data-kind='switch'],[data-kind='sensor'],[data-kind='room'],:is([data-kind='media'],[data-kind='media-stack']),[data-kind='climate']) .icon svg,
  .card:is([data-kind='switch'],[data-kind='sensor'],[data-kind='room'],:is([data-kind='media'],[data-kind='media-stack']),[data-kind='climate']) .action svg { width:16px; height:16px; }
  .card[data-kind='switch'] { justify-content:flex-start; min-height:168px; }
  .card[data-kind='switch'][data-size='extra-small']:not([data-layout='row']) { min-height:84px; padding:8px; justify-content:center; }
  .card[data-kind='switch'][data-size='extra-small']:not([data-layout='row']) .header { align-items:center; gap:6px; padding-right:0; }
  .card[data-kind='switch'][data-size='extra-small'][data-layout='comfortable'] { min-height:248px; }
  .card[data-kind='switch'][data-layout='row'] .header { padding-right:44px; }
  .card[data-kind='switch'][data-layout='row'] { min-height:100px; }
  .switch-details { position:absolute; bottom:12px; right:12px; }
  .card[data-kind='sensor'] { --surface:linear-gradient(135deg,#18181b,#09090b); --edge:rgba(63,63,70,.7); }
  .card[data-kind='sensor'][data-theme='light'] { --surface:linear-gradient(135deg,#fff,#f8fafc); --edge:rgba(203,213,225,.8); }
  .card[data-kind='sensor'][data-theme='black'] { --surface:#000; }
  .card[data-kind='sensor'][data-theme='glass'] { --surface:rgba(30,41,59,.55); --edge:rgba(255,255,255,.2); }
  .card[data-kind='sensor'] .metric { font-weight:500; line-height:1; }
  .card[data-kind='sensor'] .unit { font-size:14px; font-weight:500; }
  .card[data-kind='sensor'] .sensor-value { padding-bottom:4px; }
  .card[data-kind='room'] { --text:var(--navet-card-text,#e5e7eb); --muted:#a1a1aa; background:var(--navet-card-background,linear-gradient(135deg,#18181b,#09090b)); border-color:var(--navet-card-border,rgba(63,63,70,.7)); }
  .card[data-kind='room'][data-theme='light'] { border-color:var(--navet-card-border,rgba(203,213,225,.8)); --text:var(--navet-card-text,#1e293b); --muted:#64748b; background:var(--navet-card-background,linear-gradient(135deg,#fff,#f8fafc)); }
  .card[data-kind='room'][data-theme='black'] { background:var(--navet-card-background,#000); }
  .card[data-kind='room'][data-theme='glass'] { border-color:var(--navet-card-border,rgba(255,255,255,.2)); background:var(--navet-card-background,rgba(30,41,59,.55)); }
  .card[data-kind='room'] .room-count { color:var(--accent); }
  .card[data-kind='room'] .room-members { position:absolute; left:12px; bottom:12px; max-width:calc(100% - 72px); }
  .card[data-kind='room'][data-layout='row'] .room-members { display:none; }
  .card[data-kind='room'] .room-members .icon { width:36px; height:36px; flex-basis:36px; }
  .card[data-kind='room'] .room-summary { margin-top:8px; }
  .card[data-kind='room'] .actions { margin-top:auto; }
  .card[data-kind='climate']:not([data-layout='row']) .climate-value { margin-top:auto; max-width:calc(100% - 84px); }
  .card[data-kind='climate'] .climate-value .metric { font-weight:700; line-height:1; }
  .card[data-kind='climate'] .climate-value .unit { font-size:30px; font-weight:700; }
  .card[data-kind='climate'] .actions { margin-top:6px; }
  .card:is([data-kind='media'],[data-kind='media-stack']) { min-height:168px; }
  .card:is([data-kind='media'],[data-kind='media-stack']) .media-info { margin-top:0; padding-right:42px; }
  .card:is([data-kind='media'],[data-kind='media-stack']) .media-playback { position:absolute; right:12px; top:54px; }
  .card:is([data-kind='media'],[data-kind='media-stack']) .timeline { margin-top:auto; }
  .card:is([data-kind='media'],[data-kind='media-stack'])[data-layout='row'] .media-playback { position:static; }
  .card:is([data-kind='media'],[data-kind='media-stack']) .actions { margin-top:auto; }
  .card:is([data-kind='media'],[data-kind='media-stack']) .artwork { background:radial-gradient(circle at 30% 20%,#333,#202020 55%,#18181b); }
  .card:is([data-kind='media'],[data-kind='media-stack']) .artwork svg { width:52px; height:52px; color:#777; border-color:rgba(255,255,255,.12); }
  .card[data-layout='comfortable']:is([data-kind='cover'],[data-kind='climate'],[data-kind='switch'],:is([data-kind='media'],[data-kind='media-stack'])) { min-height:248px; }
  @container (max-width:220px) {
    .card:is([data-kind='media'],[data-kind='media-stack']):not([data-layout='row']) { padding:12px; min-height:168px; }
    .card:is([data-kind='media'],[data-kind='media-stack']):not([data-layout='row']) .artwork { inset:0; width:100%; height:100%; opacity:.12; pointer-events:none; }
    .card:is([data-kind='media'],[data-kind='media-stack']) .header,.card:is([data-kind='media'],[data-kind='media-stack']) .media-info,.card:is([data-kind='media'],[data-kind='media-stack']) .timeline { position:relative; z-index:1; }
    .card[data-kind='climate'] .climate-value .metric { font-size:24px; }
    .card[data-kind='climate'] .climate-value .unit { font-size:20px; }
    .card[data-kind='climate'] .climate-state { line-height:16px; }
    .card[data-kind='climate']:not([data-layout='row']) .climate-value { max-width:calc(100% - 64px); }
    .card[data-kind='cover']:not([data-layout='row']) { padding:8px; gap:0; }
    .card[data-kind='cover']:not([data-layout='row']) .cover-value { margin-top:0; }
    .card[data-kind='cover']:not([data-layout='row']) .cover-value .metric { font-size:22px; line-height:24px; }
    .card[data-kind='cover']:not([data-layout='row']) .cover-value .state { font-size:11px; line-height:14px; }
    .card[data-kind='cover']:not([data-layout='row']) .actions { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:auto; }
    .card[data-kind='cover']:not([data-layout='row']) .actions .details { justify-self:end; }
    .card[data-kind='cover']:not([data-layout='row']) .cover-position { top:42px; bottom:92px; }

    .card[data-kind='room'] .room-members .icon:nth-child(n+3) { display:none; }
  }
  .card:is([data-kind='media'],[data-kind='media-stack'])[data-layout='row'] { padding:12px; min-height:100px; }
  .card:is([data-kind='media'],[data-kind='media-stack'])[data-layout='row'] .header > .icon { display:inline-flex; }
  .widget-readings { display:grid; gap:4px; max-height:100px; min-height:0; flex:1; overflow:auto; z-index:1; scrollbar-width:thin; }
  .widget-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 12px; width:100%; border:0; border-bottom:1px solid var(--edge); background:none; padding:9px 0; text-align:left; font-size:12px; min-height:38px; }
  .widget-row span { color:var(--muted); overflow-wrap:anywhere; } .widget-row strong { font-weight:500; max-width:120px; overflow-wrap:anywhere; }
  /* GroupedSensorCard / BatteryList: compact icon rows, without separators. */
  .card:is([data-kind='info'],[data-kind='battery']) .widget-readings { display:flex; flex-direction:column; max-height:none; }
  .compact-readings { margin-top:auto; display:grid; gap:6px; flex-shrink:0; }
  .card:is([data-kind='info'],[data-kind='battery']) .widget-row { border:0; padding:0; min-height:16px; line-height:16px; align-items:center; gap:8px; }
  .reading-label { display:flex; align-items:center; gap:4px; min-width:0; }
  .reading-label > svg { width:14px; height:14px; flex-shrink:0; }
  .reading-label > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .battery-row { grid-template-columns:minmax(0,1fr) 64px auto; }
  .battery-row:not(:has(progress)) { grid-template-columns:minmax(0,1fr) auto; }
  .battery-row .reading-label { gap:8px; }
  .battery-row .reading-label > svg,.battery-row strong { color:var(--battery-color); }
  .battery-row strong { min-width:40px; text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .battery-row progress { width:64px; height:6px; border:0; accent-color:var(--battery-color); border-radius:4px; overflow:hidden; }
  .battery-row progress::-webkit-progress-bar { background:var(--control); border-radius:4px; }
  .battery-row progress::-webkit-progress-value { background:var(--battery-color); border-radius:4px; }
  .battery-row progress::-moz-progress-bar { background:var(--battery-color); border-radius:4px; }
  @container (max-width:240px) { .battery-row { grid-template-columns:minmax(0,1fr) auto; } .battery-row progress { display:none; } }
  .stack-member { display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--edge); padding:8px 0; }
  .stack-title { display:grid; gap:4px; flex:1; min-width:0; text-align:left; border:0; background:none; padding:0; font-size:12px; overflow-wrap:anywhere; } .stack-title strong { font-weight:500; }
  .card[data-layout='comfortable'] .widget-readings { max-height:180px; } .card[data-kind='ups'] .widget-readings { gap:0; } .card[data-kind='ups'] .widget-row { min-height:30px; padding:6px 0; }
  .energy-reading { max-height:116px; min-height:0; overflow:auto; flex:1; display:grid; gap:8px; margin-top:auto; } .energy-reading button { border:0; padding:0; background:none; text-align:left; display:grid; gap:4px; } .energy-reading .metric { color:var(--text); } .energy-secondary .unit { font-size:12px; }
  .entity-status,.weather-body { margin-top:auto; display:grid; gap:4px; } .entity-status > svg { width:32px; height:32px; color:var(--muted); } .weather-body { grid-template-columns:minmax(0,1fr) auto; align-items:center; } .weather-body .metric { margin:0; grid-row:1 / span 2; } .weather-body > .state { grid-column:2; font-size:11px; }
  .person-body { display:flex; align-items:center; gap:12px; margin-top:auto; } .person-body img,.avatar { width:52px; height:52px; border-radius:50%; object-fit:cover; } .avatar { display:grid; place-items:center; font-size:22px; background:var(--control); }
  .card[data-kind='photo'] { padding:0; min-height:168px; } .photo-image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; } .card[data-kind='photo'] .header { position:absolute; bottom:0; left:0; right:0; padding:32px 12px 12px; background:linear-gradient(transparent,rgba(0,0,0,.75)); color:#fff; } .card[data-kind='photo'] .eyebrow { color:#ddd; } .card[data-kind='photo'] .header .icon { display:none; } .photo-placeholder { display:grid; place-items:center; gap:12px; margin:auto; padding-bottom:52px; } .photo-placeholder svg { width:36px; height:36px; color:var(--muted); }
  .card[data-kind='note'] { padding:12px 12px 12px 36px; } .card[data-kind='note'] .header { display:none; } .card[data-kind='note']::before { content:''; position:absolute; top:2px; bottom:0; left:10px; width:14px; background:radial-gradient(circle 5px at center 7px,var(--control) 0 74%,var(--edge) 75% 88%,transparent 89%) center top / 14px 30px repeat-y; }
  .note-paper { max-height:140px; min-height:0; overflow:auto; flex:1; background:repeating-linear-gradient(180deg,transparent 0 23px,var(--edge) 23px 24px); } .note-paper p { font-size:13px; line-height:24px; white-space:pre-wrap; overflow-wrap:anywhere; margin:0; } .note-paper form { height:100%; min-height:140px; } .note-paper textarea { font:inherit; font-size:13px; line-height:24px; resize:none; border:0; padding:0 0 40px; width:100%; height:100%; min-height:140px; background:transparent; color:var(--text); } .note-save { position:absolute; bottom:12px; right:12px; }
  .widget-action { border:0; background:none; display:flex; align-items:center; gap:8px; margin-top:auto; padding:0; min-height:36px; font-size:12px; } .widget-action svg { width:20px; height:20px; }
  .card:is([data-kind='info'],[data-kind='battery'],[data-kind='ups'],[data-kind='energy-now'],[data-kind='media-stack'],[data-kind='person'],[data-kind='note'],[data-kind='entity']) { --text:var(--navet-card-text,#e5e7eb); --muted:#a1a1aa; background:var(--navet-card-background,var(--surface)); border-color:var(--navet-card-border,var(--edge)); }
  .card[data-theme='light']:is([data-kind='info'],[data-kind='battery'],[data-kind='ups'],[data-kind='energy-now'],[data-kind='media-stack'],[data-kind='person'],[data-kind='note'],[data-kind='entity']) { --text:var(--navet-card-text,#1e293b); --muted:#64748b; }

  .card[data-kind='battery'] { --surface:linear-gradient(135deg,#18181b,#09090b); --edge:rgba(63,63,70,.7); }
  .card[data-kind='battery'] .header .icon { color:var(--accent); }
  .card[data-kind='battery'][data-theme='light'] { --surface:linear-gradient(135deg,#fff,#f8fafc); --edge:rgba(203,213,225,.8); }
  .card[data-kind='battery'][data-theme='black'] { --surface:#000; }
  .card[data-kind='battery'][data-theme='glass'] { --surface:rgba(30,41,59,.55); --edge:rgba(255,255,255,.2); }
  .card[data-kind='info'] { --text:var(--navet-card-text,#a7d8d2); --muted:#91c5bd; --surface:radial-gradient(circle at 16% 14%,rgba(45,212,191,.16),transparent 32%),linear-gradient(135deg,#134e4a,#042f2e); --edge:#0f766e; }
  .card[data-kind='info'][data-theme='light'] { --text:var(--navet-card-text,#134e4a); --muted:#22675f; --surface:linear-gradient(135deg,#f0fdfa,#cffafe); --edge:#d1d5db; }
  .card[data-kind='info'][data-theme='black'] { --surface:radial-gradient(circle at 14% 12%,rgba(20,184,166,.16),transparent 28%),linear-gradient(135deg,#000,#001a18); }
  .card[data-kind='info'][data-theme='glass'] { --surface:linear-gradient(135deg,rgba(255,255,255,.16),rgba(153,246,228,.10),rgba(255,255,255,.03)); --edge:rgba(255,255,255,.2); }
  .card[data-kind='lock'] { gap:0; } .card[data-kind='lock'] .header,.card[data-kind='lock'] .primary { min-height:32px; } .card[data-kind='lock'] .icon { width:32px; height:32px; flex-basis:32px; }
  .lock-symbol { position:relative; display:grid; place-items:center; flex-shrink:0; margin:auto; border:1px solid var(--edge); border-radius:50%; width:64px; height:64px; background:rgba(0,0,0,.08); color:color-mix(in srgb,var(--accent) 30%,var(--text)); } .lock-symbol::before,.lock-symbol::after { content:''; position:absolute; border-radius:50%; } .lock-symbol::before { inset:8px; border:1px solid var(--edge); } .lock-symbol::after { inset:14px; background:var(--control); } .lock-symbol svg { position:relative; z-index:1; } .lock-symbol svg { width:28px; height:28px; } .lock-state { display:none; }
  .lock-confirm { position:relative; height:40px; flex-shrink:0; border:1px solid var(--edge); border-radius:24px; background:var(--control); } .lock-confirm span { position:absolute; inset:0 8px 0 42px; display:grid; place-items:center; text-align:center; font-size:12px; line-height:14px; pointer-events:none; } .lock-confirm input { position:absolute; inset:0; height:40px; margin:0; width:100%; border-radius:24px; background:transparent; } .lock-confirm input::-webkit-slider-runnable-track { height:40px; background:transparent; } .lock-confirm input::-webkit-slider-thumb { width:34px; height:34px; margin:2px; background:var(--control); border:1px solid var(--edge); box-shadow:inset 0 0 0 8px color-mix(in srgb,var(--accent) 12%,transparent); } .lock-confirm input::-moz-range-track { background:transparent; height:40px; } .lock-confirm input::-moz-range-thumb { width:34px; height:34px; background:var(--control); border:1px solid var(--edge); }
  .card[data-layout='comfortable'] .note-paper { max-height:220px; } .card[data-kind='entity'] .sensor-value { min-height:0; max-height:80px; overflow:auto; }
  .card[data-kind='lock']:not([data-active]) { --family-accent:#ef4444; background:var(--navet-card-background,color-mix(in srgb,var(--accent) 16%,#18181b)); }

  .note-open { display:block; width:100%; height:100%; min-height:140px; border:0; padding:0; background:none; color:inherit; font-size:14px; font-weight:500; line-height:24px; text-align:left; white-space:pre-wrap; overflow-wrap:anywhere; }
  .note-dialog textarea { font:inherit; color:inherit; background:var(--control); border:1px solid var(--edge); border-radius:10px; resize:vertical; min-height:140px; width:calc(100% - 40px); margin:0 20px; padding:12px; }
  .photo-shuffle { position:absolute; z-index:2; top:12px; right:12px; background:rgba(0,0,0,.3); color:#fff; }
  .photo-shuffle[aria-pressed='true'] { background:var(--accent); }
  .photo-primary { position:absolute; inset:0; width:100%; height:100%; border:0; background:none; padding:0; }
  .photo-controls { position:absolute; z-index:2; bottom:12px; left:12px; right:12px; display:flex; align-items:center; justify-content:space-between; color:#fff; }
  .photo-controls .action { background:rgba(0,0,0,.4); }
  .photo-dots { display:flex; gap:6px; align-items:center; }
  .photo-dots button { width:20px; height:24px; padding:6px; border:0; background:none; position:relative; }
  .photo-dots button::before { content:''; display:block; width:6px; height:6px; background:rgba(255,255,255,.5); border-radius:50%; }
  .photo-dots button[aria-pressed='true']::before { background:#fff; }
  .player-select { position:absolute; bottom:12px; left:12px; width:calc(40% - 24px); z-index:3; border:1px solid var(--edge); border-radius:12px; font:inherit; font-size:10px; padding:5px; color:var(--text); background:var(--surface); }
  /* Family compositions follow their rendered Navet stories. */
  .card { --surface:linear-gradient(135deg,#18181b,#09090b); --edge:rgba(63,63,70,.7); }
  .card[data-theme='light'] { --surface:linear-gradient(135deg,#fff,#f8fafc); --edge:rgba(203,213,225,.8); }
  .card[data-theme='black'] { --surface:#000; }
  .card[data-theme='glass'] { --surface:rgba(30,41,59,.55); --edge:rgba(255,255,255,.2); }
  .icon { width:36px; height:36px; border:1px solid var(--edge); background:var(--control); padding:7px; }
  .icon svg,.action svg { width:16px; height:16px; }
  .card[data-kind='sensor'] .header .icon { color:var(--accent); }
  .card:is([data-kind='sensor'],[data-kind='entity']) .metric { font-size:36px; font-weight:500; line-height:1; }
  .card .metric.long { font-size:18px; line-height:1.3; }
  .card[data-kind='info'] { --surface:radial-gradient(circle at 16% 14%,rgba(45,212,191,.12),transparent 32%),linear-gradient(135deg,#153f3c,#082724); --edge:rgba(20,184,166,.35); }
  .card[data-kind='fan'][data-active][data-theme='dark'] { background:var(--navet-card-background,linear-gradient(135deg,#245780,#1d3b70)); --text:#dbeafe; --muted:#a8c5ee; border-color:#254776; }
  .fan-preset { position:relative; }
  .fan-preset svg { position:absolute; width:25px; height:25px; opacity:.3; }
  .fan-preset span { position:relative; font-weight:600; }
  .card[data-kind='lock'][data-active][data-theme='dark'] { background:var(--navet-card-background,linear-gradient(135deg,#12482e,#0b291d)); --text:#d1fae5; --muted:#a5d6bb; }
  .lock-confirm input::-webkit-slider-thumb { border-radius:50%; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m9 6 6 6-6 6' stroke='%23a1a1aa' fill='none' stroke-width='2'/%3E%3C/svg%3E"); background-size:20px; background-repeat:no-repeat; background-position:center; }
  .card[data-kind='lock'][data-theme='light']:not([data-active]) { background:var(--navet-card-background,color-mix(in srgb,var(--accent) 12%,#fff)); }
  .card[data-kind='person'] { background:var(--navet-card-background,linear-gradient(135deg,#184261,#0f172a 60%,#020617)); }
  .card[data-kind='person'][data-theme='light'] { background:var(--navet-card-background,linear-gradient(135deg,#e0f2fe,#f1f5f9,#fff)); }
  .card[data-kind='person'][data-theme='black'] { background:var(--navet-card-background,linear-gradient(135deg,#062036,#000)); }
  .card[data-kind='person'][data-theme='glass'] { background:var(--navet-card-background,linear-gradient(135deg,rgba(125,211,252,.14),rgba(255,255,255,.04),transparent)); }
  .person-body { position:absolute; inset:0; width:100%; height:100%; border:0; background:none; margin:0; display:grid; place-items:center; text-align:left; padding:0; }
  .person-body img { position:absolute; inset:0; width:100%; height:100%; border-radius:0; }
  .person-body:has(img)::after { content:''; position:absolute; inset:40% 0 0; background:linear-gradient(transparent,rgba(0,0,0,.85)); }
  .person-body:has(img) .person-identity { color:#fff; }
  .person-body:has(img) .eyebrow { color:#ddd; }
  .avatar { width:60px; height:60px; border:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.1); }
  .avatar svg { width:34px; height:34px; }
  .person-identity .name { font-size:14px; line-height:20px; }
  .person-identity .eyebrow { font-size:12px; line-height:16px; }
  .card[data-kind='ups'] .header .icon { color:var(--accent); }
  .person-identity { position:absolute; bottom:12px; left:12px; right:50px; z-index:1; }
  .card[data-kind='person'] .actions { position:absolute; right:12px; bottom:12px; }
  .vacuum-summary { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:auto; min-height:56px; }
  .vacuum-state { display:block; font-size:24px; font-weight:600; line-height:28px; }
  .vacuum-facts { display:flex; align-items:center; flex-wrap:wrap; gap:8px; font-size:11px; color:var(--muted); margin-top:4px; }
  .vacuum-facts span { display:flex; align-items:center; gap:3px; }
  .vacuum-facts svg { width:14px; height:14px; }
  .vacuum-robot { --surface:#202024; color:#d4d4d8; flex:0 0 76px; height:76px; position:relative; border-radius:50%; border:3px solid color-mix(in srgb,var(--text) 38%,transparent); background:radial-gradient(circle at 40% 25%,color-mix(in srgb,var(--text) 20%,var(--surface)),var(--control)); box-shadow:0 6px 12px rgba(0,0,0,.2); }
  .vacuum-robot svg { position:absolute; inset:0; width:100%; height:100%; }
  .vacuum-robot span { position:absolute; width:26px; height:3px; bottom:12px; left:22px; border-radius:4px; background:var(--muted); opacity:.45; }
  .card[data-kind='vacuum'][data-active] .vacuum-robot { background:radial-gradient(circle at 40% 25%,#29354d,#111827); border-color:#bda786; }
  .card[data-kind='vacuum'] .actions { margin-top:auto; }
  .card:is([data-kind='scene'],[data-kind='button']) .header .icon { color:var(--accent); }
  .script-trigger { color:var(--text); position:relative; z-index:3; }
  .volume-panel select,.card:is([data-kind='media'],[data-kind='media-stack']) select { background:#252529; color:#eee; }
  .room-members .icon { background:var(--control); border:1px solid var(--edge); }
  .card[data-kind='scene'] { background:var(--navet-card-background,radial-gradient(circle at 15% 10%,rgba(249,115,22,.1),transparent 45%),var(--surface)); }
  .card[data-kind='scene'] .name { color:color-mix(in srgb,var(--accent) 35%,var(--text)); }
  .action-room { margin-right:auto; min-width:0; }
  .card[data-kind='scene'] .actions { flex-wrap:nowrap; }
  .card[data-kind='scene'] .actions .accent { background:var(--accent); color:#fff; }
  .card[data-kind='button'] .primary::after,.card[data-kind='script'] .primary::after { content:''; position:absolute; inset:0; }
  .card:is([data-kind='button'],[data-kind='script']) .primary:focus-visible::after { outline:2px solid var(--accent); outline-offset:-4px; border-radius:22px; }
  .card[data-kind='button'] .header { z-index:auto; }
  .card[data-kind='script'] .actions { pointer-events:none; }
  .card[data-kind='script'] .actions button { pointer-events:auto; }
  .ups-summary { display:flex; gap:12px; align-items:center; margin-top:auto; min-height:40px; }
  .ups-battery { border:0; background:none; text-align:left; margin:0; padding:0; font-size:36px; line-height:40px; }
  .ups-status { margin-left:auto; border:1px solid var(--edge); border-radius:20px; background:var(--control); padding:5px 10px; font-size:11px; max-width:50%; overflow-wrap:anywhere; }
  .ups-status.online { color:#4ade80; background:rgba(34,197,94,.1); border-color:rgba(34,197,94,.25); }
  .ups-status.warning { color:#fb923c; }
  .card[data-theme='light'] .ups-status.online { color:#15803d; }
  .ups-metrics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; min-height:0; overflow:auto; }
  .ups-battery-label { display:block; font-size:12px; line-height:14px; font-weight:400; }
  .ups-metrics button { background:var(--control); border:1px solid var(--edge); border-radius:10px; padding:6px 8px; text-align:left; display:grid; gap:2px; }
  .ups-metrics strong { font-size:13px; font-weight:500; }
  .card[data-kind='energy-now'] .header { padding-right:140px; }
  .energy-reading { position:absolute; top:12px; right:12px; max-width:140px; display:flex; align-items:start; gap:10px; height:auto; max-height:48px; overflow:hidden; }
  .energy-reading button { min-width:0; text-align:right; display:flex; flex-direction:column; gap:0; }
  .energy-reading strong { font-size:14px; white-space:nowrap; }
  .energy-reading strong > span { font-size:11px; margin-left:3px; font-weight:400; }
  .energy-reading .state { display:none; }
  .card[data-kind='energy-now'] .header { padding-right:100px; }
  .energy-reading { flex-direction:column; align-items:end; gap:0; max-width:100px; }
  .energy-reading .energy-primary strong { font-size:22px; line-height:24px; }
  .energy-reading .energy-primary strong > span { font-size:18px; margin:0; font-weight:600; }
  .energy-secondary strong { font-size:12px; line-height:16px; color:#6ee7b7; }
  .card[data-theme='light'] .energy-secondary strong { color:#15803d; }
  .energy-chart { margin-top:auto; flex:1; min-height:0; display:flex; flex-direction:column; justify-content:end; color:var(--accent); padding-top:4px; }
  .energy-chart > svg { width:100%; height:72px; min-height:0; }
  .chart-times { display:flex; justify-content:space-between; font-size:9px; line-height:14px; color:var(--muted); }
  .card[data-kind='weather'] { background:var(--navet-card-background,linear-gradient(120deg,#25496f,#214261 52%,#1b3650)); --text:#f8fafc; --muted:#d2dae3; }
  .card[data-kind='weather'][data-condition='sunny'] { background:var(--navet-card-background,radial-gradient(circle at 85% 20%,rgba(253,186,116,.15),transparent 28%),linear-gradient(120deg,#914029,#ae572b 48%,#cb7933)); }
  .card[data-kind='weather'][data-theme='black'] { background:var(--navet-card-background,linear-gradient(140deg,#172638,#050505)); }
  .card[data-kind='weather'][data-theme='glass'] { background:var(--navet-card-background,linear-gradient(140deg,rgba(148,163,184,.3),rgba(51,65,85,.45))); }
  .card[data-kind='weather'][data-theme='light'] { --text:#172b40; --muted:#334155; background:var(--navet-card-background,linear-gradient(120deg,#4b95e4,#4288d4 52%,#3474bc)); }
  .card[data-kind='weather'][data-theme='light'][data-condition='sunny'] { background:var(--navet-card-background,linear-gradient(120deg,#ea6d61,#ef8758 48%,#f4a54d)); }
  .card[data-kind='weather'][data-condition='clear-night'] { background:var(--navet-card-background,linear-gradient(120deg,#182a57,#1c3363,#1a2b52)); }
  .card[data-kind='weather'][data-condition*='rain'] { background:var(--navet-card-background,linear-gradient(120deg,#1f2348,#1c2140,#171c36)); }
  .card[data-kind='weather'] .header { gap:4px; }
  .card[data-kind='weather'] .header .eyebrow { display:none; }
  .card[data-kind='weather'] .header .name { font-size:14px; }
  .card[data-kind='weather'] .header .icon { border:0; background:none; width:20px; height:20px; flex-basis:20px; padding:2px; }
  .card[data-kind='weather'] { gap:4px; }
  .weather-body { display:flex; flex-shrink:0; align-items:center; justify-content:space-between; gap:8px; margin-top:0; }
  .weather-body .state { font-size:11px; line-height:16px; }
  .note-open { display:flex; align-items:flex-start; }
  .ups-battery { display:block; color:var(--text); font-size:32px; line-height:34px; }
  .ups-battery .unit { display:inline; }
  .card[data-kind='ups'] { gap:4px; }
  .ups-metrics button { padding:4px 8px; border-radius:16px; }
  .ups-metrics .state { font-size:10px; line-height:12px; }
  .ups-metrics strong { font-size:12px; line-height:14px; }
  .weather-body .metric { color:var(--text); font-size:30px; line-height:32px; font-weight:600; }
  .weather-body .unit { font-size:20px; }
  .weather-condition { display:flex; flex-direction:column; align-items:center; min-width:55px; max-width:35%; text-align:center; }
  .weather-condition svg { width:38px; height:38px; }
  .weather-condition .state { font-size:11px; line-height:14px; }
  .weather-footer { display:flex; align-items:end; gap:6px; margin-top:auto; min-height:0; }
  .weather-footer .details { margin-left:auto; }
  .forecast-row { display:flex; flex:1; justify-content:space-between; gap:4px; min-width:0; overflow:hidden; }
  .forecast-row > div { display:flex; flex-direction:column; align-items:center; min-width:20px; font-size:11px; line-height:12px; }
  .forecast-row > div svg { width:16px; height:16px; margin:3px 0; }
  .forecast-row > div strong { font-size:12px; font-weight:500; }
  .card[data-kind='photo'] .header { display:none; }
  .card[data-kind='note'] .note-paper :is(p,textarea) { font-size:14px; font-weight:500; }
  @container (max-width:240px) { .forecast-row > div:nth-child(n+5) { display:none; } .card[data-kind='energy-now'] .header { padding-right:0; } .energy-reading { position:static; flex-direction:row; max-width:none; max-height:none; flex:0; margin:0; justify-content:space-between; } .vacuum-robot { --surface:#202024; color:#d4d4d8; flex-basis:52px; height:52px; } .vacuum-robot svg { inset:0; width:100%; height:100%; } .vacuum-robot span { left:12px; width:22px; bottom:8px; } .vacuum-state { font-size:18px; } }
`;
