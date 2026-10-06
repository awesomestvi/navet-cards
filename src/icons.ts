import { svg } from 'lit';

// Small stroke icons follow Navet's card controls without a runtime icon dependency.
const paths: Record<string, string> = {
  number: 'M5 8h14 M5 16h14 M10 3 8 21 M16 3 14 21',
  select: 'm6 9 6 6 6-6',
  navigation: 'M3 12 12 3l9 9 M5 10v11h14V10',
  next: 'm5 4 10 8-10 8Z M19 4v16',
  previous: 'm19 4-10 8 10 8Z M5 4v16',
  mute: 'M3 9h4l5-5v16l-5-5H3Z M16 9l6 6 M22 9l-6 6',
  light: 'M13 2 4 14h7l-1 8 10-12h-7l1-8Z',
  switch: 'M12 2v10 M5.6 5.6a9 9 0 1 0 12.8 0',
  sensor: 'M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0 M12 9v9',
  climate: 'M12 3c2 4 6 6 6 11a6 6 0 0 1-12 0c0-2 1-4 3-6 0 4 2 4 3 5 2-3 2-6 0-10Z',
  cool: 'M12 2v20 M3.3 7l17.4 10 M3.3 17 20.7 7 M9 4l3 3 3-3 M9 20l3-3 3 3',
  cover: 'M4 3h16v18H4Z M4 7h16 M4 11h16 M4 15h16 M8 21v-2 M16 21v-2',
  room: 'M5 11V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4 M3 11h3v5h12v-5h3v9H3Z M5 20v2 M19 20v2',
  media: 'M4 10v4 M8 6v12 M12 3v18 M16 6v12 M20 10v4',
  details: 'M4 6h8 M16 6h4 M4 12h2 M10 12h10 M4 18h10 M18 18h2 M12 3v6 M6 9v6 M14 15v6',
  open: 'm6 14 6-6 6 6',
  close: 'm6 10 6 6 6-6',
  stop: 'M9 5v14 M15 5v14',
  pause: 'M9 5v14 M15 5v14',
  play: 'm8 4 12 8-12 8Z',
  minus: 'M5 12h14',
  plus: 'M5 12h14 M12 5v14',
  volume: 'M3 9h4l5-5v16l-5-5H3Z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14',
  disc: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
};
export function icon(name: string) {
  return svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${paths[name] ?? paths.details}/></svg>`;
}
