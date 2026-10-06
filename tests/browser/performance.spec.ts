import { test, expect } from '@playwright/test';

test('20 rooms with 5000 registry entries skip unrelated work and release detail controls', async ({page}, info) => {
  await page.goto('/demo/index.html');
  await page.waitForFunction(()=>(window as any).cards?.length===7);
  const result = await page.evaluate(async()=>{
    const w=window as any;const host={...w.demoHass,states:{...w.demoHass.states},entities:{},devices:{}} as any;
    for(let i=0;i<5000;i++){
      const id=`sensor.bench_${i}`;host.entities[id]={area_id:`area_${i%100}`};host.states[id]={entity_id:id,state:'1',attributes:{friendly_name:`Sensor ${i}`}};
    }
    let scans=0;host.entities=new Proxy(host.entities,{ownKeys(target){scans++;return Reflect.ownKeys(target);}});
    const cards=Array.from({length:20},(_,i)=>{
      const c=document.createElement('navet-room-card') as any;c.setConfig({type:'custom:navet-room-card',area:`area_${i}`});document.querySelector('#cards')!.append(c);c.hass=host;return c;
    });
    await Promise.all(cards.map(c=>c.updateComplete));
    let renders=0;for(const c of cards){const render=c.render.bind(c);c.render=()=>{renders++;return render();};}
    const times=[];
    for(let i=0;i<100;i++){
      const next={...host,states:{...host.states,'sensor.unrelated':{entity_id:'sensor.unrelated',state:String(i),attributes:{}}}};
      const start=performance.now();for(const c of cards)c.hass=next;times.push(performance.now()-start);
    }
    await Promise.all(cards.map(c=>c.updateComplete));
    const closedRows=cards.reduce((n,c)=>n+c.shadowRoot.querySelectorAll('.room-control').length,0);
    const unrelatedRenders=renders;
    for(let i=0;i<100;i++){
      cards[0].shadowRoot.querySelector('.actions button').click();await cards[0].updateComplete;
      cards[0].shadowRoot.querySelector('.dialog-footer button').click();await cards[0].updateComplete;
    }
    const rowsAfterCycles=cards[0].shadowRoot.querySelectorAll('.room-control').length;
    const scansBeforeInvalidation=scans;
    host.entities={...host.entities,'sensor.bench_0':{area_id:'area_1'}};
    cards[0].hass=host;await cards[0].updateComplete;
    const membershipCount=cards[0].shadowRoot.querySelector('.room-summary').textContent;
    cards.forEach(c=>c.remove());times.sort((a,b)=>a-b);
    return {cards:20,registryEntities:5000,iterations:100,p50SetterMs:times[50],p95SetterMs:times[95],scansBeforeInvalidation,renders:unrelatedRenders,closedRows,rowsAfterCycles,membershipCount};
  });
  await info.attach('room-performance.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
  expect(result.scansBeforeInvalidation).toBe(1); // all 20 rooms share one registry index
  expect(result.renders).toBe(0);
  expect(result.closedRows).toBe(0);
  expect(result.rowsAfterCycles).toBe(0);
  expect(result.membershipCount).toContain('49');
  expect(result.p95SetterMs).toBeLessThan(5);
});
