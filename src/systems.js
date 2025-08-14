
import {state} from './state.js';
import {lineClear, isWallAt, isHoleAt, moveWithCollision} from './collision.js';
import {screenToWorld, getCenterOriginFor} from './iso/coords.js';
import {log, renderHotbar, applyAllBonuses} from './ui.js';
import {rollItem} from './items.js';
import {clamp, angLerp} from './utils/math.js';

export function castFireboltWorld(wx,wy){
  const p=state.player;
  if(p.mana<6){log('Mana insuficiente'); return;}
  p.mana-=6;
  const dir={x:wx-p.x,y:wy-p.y}, len=Math.hypot(dir.x,dir.y)||1; dir.x/=len; dir.y/=len;
  p.facingAngle=Math.atan2(dir.y,dir.x);
  state.projectiles.push({x:p.x,y:p.y,dx:dir.x*12/60,dy:dir.y*12/60,ttl:1.2,dmg:18});
}
export function castFireboltAtScreen(sx,sy){const w=screenToWorld(sx,sy,state.origin); castFireboltWorld(w.x,w.y)}
export function meleeAttack(){ if(state.meleeCD>0||state.gameOver) return; const angle=state.player.facingAngle||0; state.slashes.push({x:state.player.x,y:state.player.y,angle,range:2.0,arc:(50*Math.PI/180),ttl:0.18,t:0,hit:new Set()}); state.meleeCD=0.35 }
state.meleeCD=0;

const deathQueue=[];
export function enqueueDeath(en){if(en.dead)return; en.dead=true; deathQueue.push(en)}
function processDeaths(){while(deathQueue.length){const en=deathQueue.pop();const idx=state.enemies.indexOf(en);if(idx>=0)state.enemies.splice(idx,1);dropLootAt(en.x,en.y,1+Math.floor(Math.random()*2));state.player.exp+=15}}
export function dropLootAt(x,y,count=1){
  count=Math.max(1,Math.min(2,count)); const tx=Math.floor(x),ty=Math.floor(y);
  const cand=[[tx,ty],[tx+1,ty],[tx-1,ty],[tx,ty+1],[tx,ty-1],[tx+1,ty+1],[tx-1,ty-1],[tx+1,ty-1],[tx-1,ty+1]];
  for(let c=0;c<count;c++){
    let placed=false;
    for(const [cx,cy] of cand){
      if(cx<0||cy<0)continue;
      if(state.dungeon.grid?.[cy]?.[cx]!==1) continue;
      state.groundLoot.push({x:cx+0.5,y:cy+0.5,item:rollItem()}); placed=true; break;
    }
    if(!placed) state.groundLoot.push({x:tx+0.5,y:ty+0.5,item:rollItem()});
  }
}
export function scatterLoot(n=12){
  state.groundLoot.length=0;
  for(let i=0;i<n;i++){
    const x=Math.floor(Math.random()*56), y=Math.floor(Math.random()*56);
    if(state.dungeon.grid[y][x]!==1) continue;
    state.groundLoot.push({x:x+0.5,y:y+0.5,item:rollItem()});
  }
}
export function spawnEnemies(n=6){
  state.enemies.length=0;
  for(let i=0;i<n;i++){
    const x=Math.floor(Math.random()*56), y=Math.floor(Math.random()*56);
    if(state.dungeon.grid[y][x]===1){
      state.enemies.push(new (class {constructor(){this.id=Math.random().toString(36).slice(2);this.x=x+0.5;this.y=y+0.5;this.hp=40;this.maxHp=40;this.speed=2.6;this.aggro=8;this.damage=6;this.dead=false;}})());
    }
  }
}

export function updateCameraFollow(dt){
  if(state.isDragging) return;
  const moving=(state.keys.w||state.keys.a||state.keys.s||state.keys.d);
  if(!moving) return;
  const tgt=getCenterOriginFor(state.player.x,state.player.y,state.canvas);
  const a=Math.min(1,dt*6);
  state.origin.x+=(tgt.x-state.origin.x)*a;
  state.origin.y+=(tgt.y-state.origin.y)*a;
}

export function resetGame(reason='Reiniciando...'){
  state.gameOver=false; state.player.dead=false;
  window.dispatchEvent(new CustomEvent('game-repair'));
  state.player.hp=state.player.maxHp; state.player.mana=state.player.maxMana;
  applyAllBonuses(); renderHotbar(); log(reason);
}
export function dieInHole(){ if(state.gameOver) return; state.gameOver=true; state.player.dead=true; log('Você caiu em um buraco!'); setTimeout(()=>resetGame('Você caiu em um buraco! Reiniciando...'),400); }

export function update(dt){
  let changed=false;
  for(let i=state.buffs.length-1;i>=0;i--){state.buffs[i].t-=dt; if(state.buffs[i].t<=0){state.buffs.splice(i,1); changed=true;}}
  if(changed) applyAllBonuses();

  const w=screenToWorld(state.mouse.x,state.mouse.y,state.origin);
  const rx=w.x-state.player.x, ry=w.y-state.player.y;
  if(Math.abs(rx)+Math.abs(ry)>1e-8) state.player.facingAngle=Math.atan2(ry,rx);
  const sx=(rx-ry)*(64/2), sy=(rx+ry)*(32/2); const scrAng=Math.atan2(sy,sx);
  if(Number.isFinite(scrAng)){ state.player.visualAngle = angLerp(state.player.visualAngle||scrAng, scrAng, Math.min(1,dt*20)); }

  if(state.meleeCD>0) state.meleeCD=Math.max(0,state.meleeCD-dt);
  for(let i=state.slashes.length-1;i>=0;i--){
    const s=state.slashes[i]; s.t+=dt;
    state.enemies.forEach(en=>{
      if(en.dead||s.hit.has(en.id)) return;
      const dx=en.x-s.x, dy=en.y-s.y, dist=Math.hypot(dx,dy);
      if(dist>s.range) return;
      const ang=Math.atan2(dy,dx);
      const arc=s.arc*0.5;
      let diff = (ang - s.angle + Math.PI*3)%(Math.PI*2)-Math.PI;
      if(Math.abs(diff) > arc) return;
      if(!lineClear(state.dungeon,s.x,s.y,en.x,en.y)) return;
      const dmg=12+Math.floor((state.player.stats.str)*0.5);
      en.hp-=dmg; s.hit.add(en.id);
      if(en.hp<=0) enqueueDeath(en);
    });
    if(s.t>=s.ttl) state.slashes.splice(i,1);
  }

  const vx=(state.keys.d?1:0)-(state.keys.a?1:0), vy=(state.keys.s?1:0)-(state.keys.w?1:0);
  const mul=1+state.buffs.reduce((a,b)=>a+(b.type==='spd'?b.amount:0),0);
  if(vx||vy){
    const L=Math.hypot(vx,vy)||1;
    moveWithCollision(state.dungeon,state.player,(vx/L)*state.player.speed*mul*dt,(vy/L)*state.player.speed*mul*dt);
  }
  if(isHoleAt(state.dungeon,state.player.x,state.player.y)) dieInHole();

  state.enemies.forEach(en=>{ if(en.dead) return; const dx=state.player.x-en.x, dy=state.player.y-en.y, d=Math.hypot(dx,dy); if(d<en.aggro){ en.x+=(dx/d)*en.speed*dt; en.y+=(dy/d)*en.speed*dt; if(d<0.9 && Math.random()<0.7*dt){ state.player.hp-=en.damage; if(state.player.hp<0) state.player.hp=0;} } });

  for(let i=state.projectiles.length-1;i>=0;i--){
    const p=state.projectiles[i]; p.x+=p.dx; p.y+=p.dy; p.ttl-=dt;
    if(p.ttl<=0){ state.projectiles.splice(i,1); continue; }
    state.enemies.forEach(en=>{
      if(en.dead) return;
      if(Math.hypot(en.x-p.x,en.y-p.y)<0.6){
        const spellDmg=p.dmg+Math.floor((state.player.stats.mag)*0.3);
        en.hp-=spellDmg; p.ttl=0;
        if(en.hp<=0) enqueueDeath(en);
      }
    });
  }

  for(let i=state.groundLoot.length-1;i>=0;i--){
    const g=state.groundLoot[i];
    if(Math.hypot(g.x-state.player.x,g.y-state.player.y)<0.6){
      if(state.inv.add(g.item)){
        state.groundLoot.splice(i,1);
        log(`Pegou ${g.item.name}${g.item.kind==='potion'?' x'+(g.item.count??1):''}`);
      }
    }
  }

  state.player.mana=Math.min(state.player.maxMana, state.player.mana+2*dt);
  processDeaths();
}
