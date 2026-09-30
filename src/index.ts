import { NavetCard } from './card';
import { NavetCardEditor } from './editor';
import { KINDS, tagFor, domainAllowed } from './config';
import type { Hass } from './providers/home-assistant';

declare const __VERSION__: string;
type Suggestion = { config: Record<string, unknown> };
declare global {
  interface Window {
    customCards?: {
      type: string;
      name: string;
      description: string;
      documentationURL: string;
      preview: boolean;
      getEntitySuggestion?: (hass: Hass, id: string) => Suggestion | null;
    }[];
  }
}

if (!customElements.get('navet-card-editor'))
  customElements.define('navet-card-editor', NavetCardEditor);
window.customCards ??= [];
for (const kind of KINDS) {
  const tag = tagFor(kind);
  if (!customElements.get(tag)) {
    class Card extends NavetCard {
      static kind = kind;
    }
    customElements.define(tag, Card);
  }
  if (!window.customCards.some((card) => card.type === tag))
    window.customCards.push({
      type: tag,
      name: `Navet ${kind[0].toUpperCase() + kind.slice(1)}`,
      preview: true,
      description: `Configurable ${kind} controls with Navet's compact card design.`,
      documentationURL: 'https://github.com/awesomestvi/navet-cards#configuration',
      getEntitySuggestion: (_hass, id) =>
        domainAllowed(kind, id) ? { config: { type: `custom:${tag}`, entity: id } } : null,
    });
}
console.info(`Navet Cards ${__VERSION__}`);
