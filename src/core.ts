/** Provider-neutral inputs consumed by card presentation. */
export class PermissionDeniedError extends Error {}

export type CardKind = 'light' | 'switch' | 'sensor' | 'room' | 'media' | 'climate' | 'cover';
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
  | 'stop';
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
}
export type CardCommand =
  | { type: 'toggle' | 'play_pause' | 'open' | 'close' | 'stop' }
  | { type: 'brightness' | 'volume' | 'temperature' | 'position'; value: number };
