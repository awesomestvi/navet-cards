/** Provider-neutral inputs consumed by card presentation. */
export class PermissionDeniedError extends Error {}

export type CardKind = 'light' | 'switch' | 'sensor' | 'room' | 'media' | 'climate' | 'cover' | 'number' | 'select' | 'navigation';
export type Capability =
  | 'toggle'
  | 'brightness'
  | 'play'
  | 'pause'
  | 'volume'
  | 'temperature'
  | 'position'
  | 'open'
  | 'close'
  | 'stop' | 'number' | 'select' | 'hvac_mode' | 'source' | 'next' | 'previous' | 'mute' | 'color_temperature';
export interface CardEntity {
  id: string;
  externalId: string;
  name: string;
  state: string;
  value: string;
  unit: string;
  available: boolean;
  active: boolean;
  capabilities: Capability[];
  brightness?: number;
  volume?: number;
  temperature?: number;
  minTemperature?: number;
  maxTemperature?: number;
  stepTemperature?: number;
  position?: number;
  subtitle?: string;
  currentTemperature?: number;
  climateAction?: string;
  artist?: string;
  artwork?: string;
  duration?: number;
  elapsed?: number;
  number?: number;
  minNumber?: number;
  maxNumber?: number;
  stepNumber?: number;
  options?: string[];
  hvacModes?: string[];
  sources?: string[];
  source?: string;
  muted?: boolean;
  color_temperature?: number;
  minKelvin?: number;
  maxKelvin?: number;
}
export type CardCommand =
  | { type: 'toggle' | 'play_pause' | 'open' | 'close' | 'stop' | 'next' | 'previous' | 'mute' }
  | { type: 'brightness' | 'volume' | 'temperature' | 'position' | 'number' | 'color_temperature'; value: number }
  | { type: 'select' | 'hvac_mode' | 'source'; value: string };
