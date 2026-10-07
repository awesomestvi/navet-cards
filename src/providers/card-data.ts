import type { ForecastDay, HistoryPoint } from '../core';
import type { Hass } from './home-assistant';

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function normalizeForecast(value: unknown): ForecastDay[] {
  return (Array.isArray(value) ? value : []).flatMap(v => {
    if (!record(v) || !number(v.temperature) || typeof v.datetime !== 'string') return [];
    const time = Date.parse(v.datetime);
    return Number.isFinite(time) ? [{time, high:v.temperature, low:number(v.templow) ? v.templow : undefined, condition:typeof v.condition === 'string' ? v.condition : 'unknown'}] : [];
  }).sort((a,b)=>a.time-b.time).slice(0,7);
}
export async function weatherForecast(hass: Hass, id: string): Promise<ForecastDay[]> {
  if (!hass.callWS || !(Number(hass.states[id]?.attributes.supported_features) & 1)) return [];
  const result = await hass.callWS<unknown>({type:'call_service',domain:'weather',service:'get_forecasts',service_data:{type:'daily'},target:{entity_id:id},return_response:true});
  const response = record(result) && record(result.response) ? result.response[id] : undefined;
  return normalizeForecast(record(response) ? response.forecast : undefined);
}
export function normalizeHistory(value: unknown): HistoryPoint[] {
  const rows = Array.isArray(value) && Array.isArray(value[0]) ? value[0] : [];
  const points = rows.flatMap(v=>{
    if (!record(v) || typeof v.state !== 'string' || !v.state.trim() || typeof v.last_changed !== 'string') return [];
    const time=Date.parse(v.last_changed), reading=Number(v.state);
    return Number.isFinite(time) && Number.isFinite(reading) ? [{time,value:reading}] : [];
  }).sort((a,b)=>a.time-b.time);
  const stride=Math.max(1,Math.ceil(points.length/256));
  return points.filter((_,i)=>i%stride===0 || i===points.length-1);
}
export async function energyHistory(hass: Hass, id: string): Promise<HistoryPoint[]> {
  if (!hass.callApi) return [];
  return normalizeHistory(await hass.callApi('GET',`history/period/${encodeURIComponent(new Date(Date.now()-86400000).toISOString())}?filter_entity_id=${encodeURIComponent(id)}&minimal_response&no_attributes`));
}
