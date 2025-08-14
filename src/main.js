
import {state, validateState} from './state.js';
import {TILE_W,TILE_H,MAP_W,MAP_H} from './config.js';
import {makeDungeon, sprinkleHoles} from './dungeon.js';
import {isoToScreen,screenToWorld,getCenterOriginFor} from './iso/coords.js';
import {Inventory, renderHotbar, renderEquipment, applyAllBonuses, log} from './ui.js';
import {spawnEnemies, scatterLoot, update, updateCameraFollow, resetGame} from './systems.js';
import {render} from './render.js';   // (garante render vindo do lugar certo)
import {attachInput} from './input.js';
import {Player} from './entities.js';
import {rollItem} from './items.js';

state.canvas=document.getElementById('game');
state.ctx=state.canvas.getContext('2d');
state.debugEl=document.getElementById('debug');

function centerCameraOnPlayer(){ const o=getCenterOriginFor(state.player.x,state.player.y,state.canvas); state.origin.x=o.x; state.origin.y=o.y; }
function repairState(){ state.dungeon=makeDungeon(); if(!state.player) state.player=new Player(10,10); placePlayer(); sprinkleHoles(state.dungeon,state.player); scatterLoot(); spawnEnemies(6); centerCameraOnPlayer(); }
function placePlayer(){ const r=state.dungeon.rooms[0]||{x:MAP_W/2-2,y:MAP_H/2-2,w:4,h:4}; const x=(r.x+Math.floor(r.w/2)), y=(r.y+Math.floor(r.h/2)); state.player.x=x+0.5; state.player.y=y+0.5; }

function step(ts){ const dt=(ts-state.last)/1000||0; state.last=ts;
  try{  if(!validateState()) repairState();
+    update(dt);
+    updateCameraFollow(dt);   // <-- mantém o player centralizado ao mover
    document.getElementById('hpBar').style.width=(state.player.hp/state.player.maxHp*100).toFixed(1)+'%';
    document.getElementById('manaBar').style.width=(state.player.mana/state.player.maxMana*100).toFixed(1)+'%';
    document.getElementById('lvl').textContent=state.player.level; render();
  }catch(e){ console.error(e); log('Erro no frame: '+e.message); repairState(); }
  requestAnimationFrame(step);
}

function init(){
  log('Jogo iniciado');
  state.dungeon=makeDungeon();
  state.player=new Player(10,10);
  state.inv=new Inventory();
  placePlayer(); sprinkleHoles(state.dungeon,state.player); scatterLoot(); spawnEnemies(6);
  centerCameraOnPlayer(); renderEquipment(); applyAllBonuses(); renderHotbar();
  attachInput();
  state.last=performance.now();
  requestAnimationFrame(step);
  document.getElementById('spawnLoot').addEventListener('click',()=>{
    const it=rollItem(); if(state.inv.add(it)) log(`Adicionou ${it.name}${it.kind==='potion'?' x'+(it.count??1):''} ao inventário`); else log('Inventário cheio.');
  });

  window.addEventListener('game-reset', e => {
    resetGame(e.detail || 'Reinício');
  });

  window.addEventListener('game-repair', () => {
    state.dungeon = makeDungeon();
    placePlayer();
    sprinkleHoles(state.dungeon, state.player);
    scatterLoot();
    spawnEnemies(6);
    // centraliza a câmera no player após recriar a fase
    const o = getCenterOriginFor(state.player.x, state.player.y, state.canvas);
    state.origin.x = o.x; state.origin.y = o.y;
  });
  const w=screenToWorld(state.canvas.width/2,state.canvas.height/2,state.origin);
  const rx=w.x-state.player.x, ry=w.y-state.player.y;
  const sx=(rx-ry)*(TILE_W/2), sy=(rx+ry)*(TILE_H/2);
  state.player.visualAngle=Math.atan2(sy,sx)||0;
}
init();
