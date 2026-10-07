import { test } from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig} from '../src/config';
import {mapEntity,executeCommand,type Hass} from '../src/providers/home-assistant';

test('custom cards validate domain lists, content, actions and safe resources',()=>{
  for(const [kind,id] of [['info','sensor.a'],['battery','sensor.a'],['ups','sensor.a'],['energy-now','sensor.a'],['media-stack','media_player.a']] as const){
    assert.deepEqual(validateConfig({type:`custom:navet-${kind}-card`,entities:[id]},kind).entities,[id]);
    for(const entities of [[],['light.a'],Array(25).fill(id)]) assert.throws(()=>validateConfig({type:`custom:navet-${kind}-card`,entities},kind));
  }
  for(const image of ['javascript:alert(1)','//external.test/a','/\\external.test/a','data:image/svg+xml,test']) assert.throws(()=>validateConfig({type:'custom:navet-photo-card',image},'photo'));
  for(const image of ['/local/photo.jpg','https://example.com/photo.jpg']) assert.equal(validateConfig({type:'custom:navet-photo-card',image},'photo').image,image);
  assert.equal(validateConfig({type:'custom:navet-note-card',content:''},'note').content,'');
  assert.throws(()=>validateConfig({type:'custom:navet-button-card'},'button'));
  assert.throws(()=>validateConfig({type:'custom:navet-button-card',tap_action:{action:'more-info'}},'button'));
});
test('new entity cards validate their domains',()=>{
  for(const [kind,id] of [['fan','fan.a'],['lock','lock.a'],['vacuum','vacuum.a'],['person','person.a'],['weather','weather.a'],['scene','scene.a'],['script','script.a'],['entity','calendar.a']] as const){
    assert.equal(validateConfig({type:`custom:navet-${kind}-card`,entity:id},kind).entity,id);
    if(kind!=='entity') assert.throws(()=>validateConfig({type:`custom:navet-${kind}-card`,entity:'sensor.a'},kind));
  }
});
test('fan and vacuum use feature support and native service translation',async()=>{
  const calls:unknown[]=[];const host:Hass={states:{},async callService(...args){calls.push(args);}};
  const fan=mapEntity({entity_id:'fan.a',state:'on',attributes:{supported_features:49,percentage:30}},'fan','fan.a');
  await executeCommand(host,fan,{type:'speed',value:60});assert.deepEqual(calls.pop(),['fan','set_percentage',{percentage:60},{entity_id:'fan.a'}]);
  await assert.rejects(executeCommand(host,fan,{type:'speed',value:101}));
  assert.ok(!mapEntity({entity_id:'fan.a',state:'on',attributes:{supported_features:1}},'fan','fan.a').capabilities.includes('toggle'));
  const vacuum=mapEntity({entity_id:'vacuum.a',state:'docked',attributes:{supported_features:8220}},'vacuum','vacuum.a');
  for(const [type,service] of [['start','start'],['pause','pause'],['stop','stop'],['return_home','return_to_base']] as const){await executeCommand(host,vacuum,{type});assert.deepEqual(calls.pop(),['vacuum',service,{}, {entity_id:'vacuum.a'}]);}
  await assert.rejects(executeCommand(host,mapEntity({entity_id:'vacuum.a',state:'docked',attributes:{}},'vacuum','vacuum.a'),{type:'start'}));
});
test('lock and action cards retain their owning domains',async()=>{
  const calls:unknown[]=[];const host:Hass={states:{},async callService(...args){calls.push(args);}};
  for(const [kind,id,type,service] of [['lock','lock.a','unlock','unlock'],['scene','scene.a','activate','turn_on'],['script','script.a','activate','turn_on'],['button','button.a','activate','press'],['button','input_button.a','activate','press']] as const){
    await executeCommand(host,mapEntity({entity_id:id,state:'off',attributes:{}},kind,id),{type}); assert.deepEqual(calls.pop(),[id.split('.')[0],service,{}, {entity_id:id}]);
  }
});
test('notes enforce native length, save through text services and hide private text',async()=>{
  const calls:unknown[]=[];const host:Hass={states:{},async callService(...args){calls.push(args);}};
  const note=mapEntity({entity_id:'input_text.a',state:'hello',attributes:{min:2,max:10}},'note','input_text.a');
  await executeCommand(host,note,{type:'text',value:'new note'});assert.deepEqual(calls[0],['input_text','set_value',{value:'new note'},{entity_id:'input_text.a'}]);
  await assert.rejects(executeCommand(host,note,{type:'text',value:'x'}));
  const secret=mapEntity({entity_id:'input_text.a',state:'password',attributes:{mode:'password'}},'note','input_text.a');assert.equal(secret.value,'••••');assert.equal(secret.secret,true);assert.ok(!secret.capabilities.includes('text'));
});
test('generic and composite cards normalize capabilities by entity domain',()=>{
  assert.ok(mapEntity({entity_id:'media_player.a',state:'playing',attributes:{supported_features:16385}},'media-stack','media_player.a').capabilities.includes('pause'));
  assert.ok(mapEntity({entity_id:'fan.a',state:'on',attributes:{supported_features:49}},'entity','fan.a').capabilities.includes('speed'));
});
test('never-activated scenes and buttons remain runnable but unavailable actions are blocked',async()=>{
  const host:Hass={states:{},async callService(){}};
  for(const [kind,id] of [['scene','scene.a'],['button','button.a'],['button','input_button.a']] as const){
    const entity=mapEntity({entity_id:id,state:'unknown',attributes:{}},kind,id);assert.equal(entity.available,true);await executeCommand(host,entity,{type:'activate'});
    const offline=mapEntity({entity_id:id,state:'unavailable',attributes:{}},kind,id);assert.equal(offline.available,false);await assert.rejects(executeCommand(host,offline,{type:'activate'}));
  }
});
