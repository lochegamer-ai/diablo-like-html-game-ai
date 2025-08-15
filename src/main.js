
import {state, validateState} from './state.js';
import {TILE_W,TILE_H,MAP_W,MAP_H} from './config.js';
import {makeDungeon, sprinkleHoles} from './dungeon.js';
import {isoToScreen,screenToWorld,getCenterOriginFor} from './iso/coords.js';
import {Inventory, renderHotbar, renderEquipment, applyAllBonuses, log, ensureObjectiveHUD, updateObjectiveHUD, wireWallsButton, ensureStartScreen, showStartScreen, hideStartScreen} from './ui.js';
import {spawnEnemies, scatterLoot, update, updateCameraFollow, resetGame, spawnChests, ensurePlayerXP} from './systems.js';
import {render} from './render.js';   // (garante render vindo do lugar certo)
import {attachInput} from './input.js';
import {Player} from './entities.js';
import {rollItem} from './items.js';
import {ensureXPUI, updateXPUI} from './ui.js'; // se optar pela barra

state.canvas=document.getElementById('game');
state.ctx=state.canvas.getContext('2d');
state.debugEl=document.getElementById('debug');

 function startGame(){
   if (state.started) return;
   state.started = true;
   hideStartScreen();
   init();                 // sua função existente que constrói dungeon, player etc.
   requestAnimationFrame(step);
 }

function centerCameraOnPlayer(){ const o=getCenterOriginFor(state.player.x,state.player.y,state.canvas); state.origin.x=o.x; state.origin.y=o.y; }
function repairState(){ state.dungeon=makeDungeon(); if(!state.player) state.player=new Player(10,10); placePlayer(); sprinkleHoles(state.dungeon,state.player); scatterLoot(); spawnEnemies(6); centerCameraOnPlayer(); }
function placePlayer(){ const r=state.dungeon.rooms[0]||{x:MAP_W/2-2,y:MAP_H/2-2,w:4,h:4}; const x=(r.x+Math.floor(r.w/2)), y=(r.y+Math.floor(r.h/2)); state.player.x=x+0.5; state.player.y=y+0.5; }
function repairWorld() {
  // zera tudo que é transiente da fase anterior
  state.projectiles && (state.projectiles.length = 0);
  state.slashes     && (state.slashes.length     = 0);
  state.groundLoot  && (state.groundLoot.length  = 0);
  state.chests      && (state.chests.length      = 0);
  state.dungeon = makeDungeon();
  placePlayer();
  ensurePlayerXP();
  sprinkleHoles(state.dungeon, state.player);
  spawnChests(1,3);
  // usa seu helper do objetivo — garante (0/N) consistente
  setupObjectiveAndSpawn();
  centerCameraOnPlayer();
}

function setupObjectiveAndSpawn(){
  const total = 3 + Math.floor(Math.random()*3); // 3..5
  state.objective = {active:true,total,kills:0};
  spawnEnemies(total);
  ensureObjectiveHUD();
  updateObjectiveHUD();
}

function step(ts){ const dt=(ts-state.last)/1000||0; state.last=ts;
  try{  if(!validateState()) repairState();
+    update(dt);
+    updateCameraFollow(dt);   // <-- mantém o player centralizado ao mover
    document.getElementById('hpBar').style.width=(state.player.hp/state.player.maxHp*100).toFixed(1)+'%';
    document.getElementById('manaBar').style.width=(state.player.mana/state.player.maxMana*100).toFixed(1)+'%';
    document.getElementById('lvl').textContent = state.player.level; 
    updateXPUI(); // opcional
    render();
  }catch(e){ console.error(e); log('Erro no frame: '+e.message); repairState(); }
  requestAnimationFrame(step);
}

function init(){
  log('Jogo iniciado');
  state.dungeon=makeDungeon();
  spawnChests(1,3);
  wireWallsButton();
  state.player=new Player(10,10);
  state.inv=new Inventory();
  placePlayer(); 
  ensurePlayerXP(); // inicia level/xp/xpToNext corretamente
  ensureXPUI();
  sprinkleHoles(state.dungeon,state.player); 
  spawnChests(1,3); 
  setupObjectiveAndSpawn();
  centerCameraOnPlayer(); 
  renderEquipment(); 
  applyAllBonuses(); 
  renderHotbar();
  attachInput();
  state.last=performance.now();
 // requestAnimationFrame(step);
  document.getElementById('spawnLoot').addEventListener('click',()=>{
    const it=rollItem(); if(state.inv.add(it)) log(`Adicionou ${it.name}${it.kind==='potion'?' x'+(it.count??1):''} ao inventário`); else log('Inventário cheio.');
  });

  window.addEventListener('game-reset', e => {
    resetGame(e.detail || 'Reinício');
  });

  window.addEventListener('game-repair', () => {
    flow = null;
    state.dungeon = makeDungeon();
    placePlayer();
    ensurePlayerXP();
    sprinkleHoles(state.dungeon, state.player);
    spawnChests(1,3);
    setupObjectiveAndSpawn();
    // centraliza a câmera no player após recriar a fase
    const o = getCenterOriginFor(state.player.x, state.player.y, state.canvas);
    state.origin.x = o.x; state.origin.y = o.y;
  });
  const w=screenToWorld(state.canvas.width/2,state.canvas.height/2,state.origin);
  const rx=w.x-state.player.x, ry=w.y-state.player.y;
  const sx=(rx-ry)*(TILE_W/2), sy=(rx+ry)*(TILE_H/2);
  state.player.visualAngle=Math.atan2(sy,sx)||0;
}
//init();
// tecla R → resetGame (reaproveita o pipeline padrão)
window.addEventListener('game-reset', e => {
  resetGame(e?.detail || 'Reinício');
});

// systems.resetGame() → dispara 'game-repair' → reconstrução aqui
window.addEventListener('game-repair', () => {
  repairWorld();
  spawnChests(1,3);
});


 document.addEventListener('DOMContentLoaded', ()=>{
   const scr = ensureStartScreen();
   showStartScreen();
   const btn = scr.querySelector('#btnStart');
   if (btn) btn.addEventListener('click', startGame);
   // opcional: Enter também começa
   window.addEventListener('keydown', (e)=>{
     if (!state.started && (e.key === 'Enter' || e.key === ' ')) startGame();
   });
 });