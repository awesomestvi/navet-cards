import {test} from 'node:test';
import assert from 'node:assert/strict';
import {energyHistory,normalizeForecast,normalizeHistory,weatherForecast} from '../src/providers/card-data';
import type {Hass} from '../src/providers/home-assistant';

test('forecast requests are capability checked, scoped and normalize response data',async()=>{
  const calls:unknown[]=[];
  const host:Hass={states:{'weather.home':{entity_id:'weather.home',state:'sunny',attributes:{supported_features:1}}},async callService(){},async callWS<T>(message:Record<string,unknown>){calls.push(message);return {response:{'weather.home':{forecast:[{datetime:'2026-10-07T12:00:00Z',temperature:0,templow:-2,condition:'cloudy'},{datetime:'invalid',temperature:12}]}}} as T;}};
  assert.deepEqual(await weatherForecast(host,'weather.home'),[{time:Date.parse('2026-10-07T12:00:00Z'),high:0,low:-2,condition:'cloudy'}]);
  assert.deepEqual(calls,[{type:'call_service',domain:'weather',service:'get_forecasts',service_data:{type:'daily'},target:{entity_id:'weather.home'},return_response:true}]);
  host.states['weather.home'].attributes.supported_features=2;
  assert.deepEqual(await weatherForecast(host,'weather.home'),[]);assert.equal(calls.length,1);
  assert.deepEqual(normalizeForecast([{datetime:'2026-10-07',temperature:'2'},{datetime:'2026-10-07',temperature:Infinity}]),[]);
});
test('energy history keeps zero, excludes unavailable and invalid readings, and uses host API',async()=>{
  const rows=[[{state:'0',last_changed:'2026-10-07T10:00:00Z'},{state:'unknown',last_changed:'2026-10-07T11:00:00Z'},{state:'120',last_changed:'invalid'},{state:'42',last_changed:'2026-10-07T12:00:00Z'}]];
  assert.deepEqual(normalizeHistory(rows),[{time:Date.parse('2026-10-07T10:00:00Z'),value:0},{time:Date.parse('2026-10-07T12:00:00Z'),value:42}]);
  const paths:string[]=[];const host:Hass={states:{},async callService(){},async callApi<T>(method:string,path:string){assert.equal(method,'GET');paths.push(path);return rows as T;}};
  assert.equal((await energyHistory(host,'sensor.power')).length,2);assert.match(paths[0],/^history\/period\/.+\?filter_entity_id=sensor.power&minimal_response&no_attributes$/);
  assert.deepEqual(await energyHistory({states:{},async callService(){}},'sensor.power'),[]);
  const dense=normalizeHistory([Array.from({length:100000},(_,i)=>({state:String(i),last_changed:new Date(1700000000000+i*1000).toISOString()}))]);
  assert.ok(dense.length<=257);assert.equal(dense[0].value,0);assert.equal(dense.at(-1)?.value,99999);
});
