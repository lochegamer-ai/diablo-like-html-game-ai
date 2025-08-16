import { state, validateState } from './state.js';
import { TILE_W, TILE_H, MAP_W, MAP_H } from './config.js';
import { makeDungeon, sprinkleHoles } from './dungeon.js';
import { isoToScreen, screenToWorld, getCenterOriginFor } from './iso/coords.js';

import {
  Inventory, renderHotbar, renderEquipment, applyAllBonuses, log,
  ensureObjectiveHUD, updateObjectiveHUD, wireWallsButton,
  ensureStartScreen, showStartScreen, hideStartScreen,
  ensureXPUI, updateXPUI,
  ensureSkillBar, updateSkillBar
} from './ui.js';

import {
  spawnEnemies, /* scatterLoot, */ update, updateCameraFollow, resetGame,
  spawnChests, ensurePlayerXP
} from './systems.js';

import { render } from './render.js';
import { attachInput } from './input.js';
import { Player } from './entities.js';
import { rollItem } from './items.js';
import { warriorWhirl, warriorBerserk } from './systems.js';

state.canvas = document.getElementById('game');
state.ctx     = state.canvas.getContext('2d');
state.debugEl = document.getElementById('debug');

function startGame(){
  if (state.started) return;
  state.started = true;
  hideStartScreen();
  init();                 // constrói dungeon, player etc.
  ensureSkillBar();       // <-- cria HUD das skills
  requestAnimationFrame(step);
}

// RMB (Whirl) e bloqueio do menu de contexto
state.canvas.addEventListener('contextmenu', e => e.preventDefault());
state.canvas.addEventListener('mousedown', (e)=>{
  if (state.gameOver) return;
  if (e.button === 2) warriorWhirl();
});

// Tecla E = Berserk
window.addEventListener('keydown', (e)=>{
  if (state.gameOver) return;
  if (e.key.toLowerCase() === 'e') warriorBerserk();
});

function centerCameraOnPlayer(){
  const o = getCenterOriginFor(state.player.x, state.player.y, state.canvas);
  state.origin.x = o.x; state.origin.y = o.y;
}

function placePlayer(){
  const r = state.dungeon.rooms[0] || {x:MAP_W/2-2, y:MAP_H/2-2, w:4, h:4};
  const x = (r.x + Math.floor(r.w/2)), y = (r.y + Math.floor(r.h/2));
  state.player.x = x + 0.5; state.player.y = y + 0.5;
}

function repairState(){
  state.dungeon = makeDungeon();
  if (!state.player) state.player = new Player(10,10);
  placePlayer();
  sprinkleHoles(state.dungeon, state.player);
  spawnChests(1,3);          // substitui o loot solto inicial
  spawnEnemies(6);
  centerCameraOnPlayer();
}

function repairWorld(){
  // limpa transientes
  state.projectiles && (state.projectiles.length = 0);
  state.slashes     && (state.slashes.length     = 0);
  state.groundLoot  && (state.groundLoot.length  = 0);
  state.chests      && (state.chests.length      = 0);

  state.dungeon = makeDungeon();
  placePlayer();
  ensurePlayerXP();
  sprinkleHoles(state.dungeon, state.player);
  spawnChests(1,3);
  setupObjectiveAndSpawn();
  centerCameraOnPlayer();
}

function setupObjectiveAndSpawn(){
  const total = 3 + Math.floor(Math.random()*3); // 3..5
  state.objective = { active:true, total, kills:0 };
  spawnEnemies(total);
  ensureObjectiveHUD();
  updateObjectiveHUD();
}

function step(ts){
  const dt = (ts - state.last) / 1000 || 0;
  state.last = ts;
  try {
    if (!validateState()) repairState();
    update(dt);
    updateCameraFollow(dt);

    // HUD bars
    document.getElementById('hpBar').style.width   =
      (state.player.hp/state.player.maxHp*100).toFixed(1)+'%';
    document.getElementById('manaBar').style.width =
      (state.player.mana/state.player.maxMana*100).toFixed(1)+'%';
    document.getElementById('lvl').textContent = state.player.level;
    updateXPUI();
    updateSkillBar();

    render();
  } catch(e){
    console.error(e);
    log('Erro no frame: '+e.message);
    repairState();
  }
  requestAnimationFrame(step);
}

function init(){
  log('Jogo iniciado');
  state.dungeon = makeDungeon();
  wireWallsButton();

  state.player = new Player(10,10);
  state.inv    = new Inventory();
  placePlayer();
  ensurePlayerXP();        // nivel/xp
  ensureXPUI();

  sprinkleHoles(state.dungeon, state.player);
  spawnChests(1,3);        // << só aqui (removido o duplicado)
  setupObjectiveAndSpawn();

  centerCameraOnPlayer();
  renderEquipment();
  applyAllBonuses();
  renderHotbar();
  attachInput();

  state.last = performance.now();

  // botão de spawnar item de teste
  document.getElementById('spawnLoot').addEventListener('click',()=>{
    const it = rollItem();
    if (state.inv.add(it)) log(`Adicionou ${it.name}${it.kind==='potion'?' x'+(it.count??1):''} ao inventário`);
    else log('Inventário cheio.');
  });
}

// tecla R → resetGame
window.addEventListener('game-reset', e=>{
  resetGame(e?.detail || 'Reinício');
});

// systems.resetGame() → dispara 'game-repair' → reconstrução aqui
window.addEventListener('game-repair', ()=>{
  repairWorld();  // já chama spawnChests dentro
});

// Tela inicial
document.addEventListener('DOMContentLoaded', ()=>{
  const scr = ensureStartScreen();
  showStartScreen();
  const btn = scr.querySelector('#btnStart');
  if (btn) btn.addEventListener('click', startGame);
  // Enter/Espaço também começam
  window.addEventListener('keydown', (e)=>{
    if (!state.started && (e.key === 'Enter' || e.key === ' ')) startGame();
  });
});

// mira inicial coerente com a câmera
const w = screenToWorld(state.canvas.width/2, state.canvas.height/2, state.origin);
const rx = w.x - (state.player?.x ?? 0), ry = w.y - (state.player?.y ?? 0);
const sx = (rx-ry)*(TILE_W/2), sy = (rx+ry)*(TILE_H/2);
state.player && (state.player.visualAngle = Math.atan2(sy, sx) || 0);
