/** Provider-neutral inputs consumed by card presentation. */
export class PermissionDeniedError extends Error {}

export type CardKind = 'light' | 'switch' | 'sensor' | 'room' | 'media' | 'climate' | 'cover' | 'number' | 'select' | 'navigation'
  | 'fan' | 'lock' | 'vacuum' | 'person' | 'weather' | 'scene' | 'script' | 'entity'
  | 'info' | 'note' | 'photo' | 'button' | 'battery' | 'ups' | 'energy-now' | 'media-stack';
export type Capability =
  | 'toggle'
  | 'speed' | 'lock' | 'unlock' | 'start' | 'return_home' | 'activate' | 'text'
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
  speed?: number;
  battery?: number;
  humidity?: number;
  deviceClass?: string;
  areaName?: string;
  feelsLike?: number;
  cleanedArea?: number;
  cleaningMinutes?: number;
  forecast?: ForecastDay[];
  textMax?: number;
  textMin?: number;
  secret?: boolean;
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
export interface ForecastDay { time: number; condition: string; high: number; low?: number; }
export interface HistoryPoint { time: number; value: number; }
export type CardCommand =
  | { type: 'toggle' | 'play_pause' | 'open' | 'close' | 'stop' | 'next' | 'previous' | 'mute' | 'lock' | 'unlock' | 'start' | 'return_home' | 'activate' | 'pause' }
  | { type: 'brightness' | 'volume' | 'temperature' | 'position' | 'number' | 'color_temperature' | 'speed'; value: number }
  | { type: 'select' | 'hvac_mode' | 'source' | 'text'; value: string };
