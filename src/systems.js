
import {state} from './state.js';
import {lineClear, isWallAt, isHoleAt, moveWithCollision} from './collision.js';
import {MAP_W, MAP_H, FLOOR} from './config.js';
import {rollItem} from './items.js';
import {computeFlowFrom, isWalkableCell} from './pathfinding.js';
import {screenToWorld, getCenterOriginFor} from './iso/coords.js';
import {log, renderHotbar, applyAllBonuses, updateObjectiveHUD  } from './ui.js';
import {clamp, angLerp} from './utils/math.js';
import {MAX_LEVEL, XP_PER_KILL, xpThresholdForLevel} from './config.js';

// tempo corrido da fase (reiniciado quando inimigos são gerados)
let phaseTime = 0;
// flow-field (campo de distâncias até o jogador)
let flow = null;
let flowTimer = 0;
let objectiveResetTimer = -1;
const FLOW_INTERVAL = 0.35; // recálculo a cada ~350ms
let lastPlayerCell = {x:-1, y:-1};

// --- Melee (slash) ----------------------------------------------------------
function angleDelta(a, b) {
  // menor diferença angular (rad)
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function meleeDamage(){
  // dano simples baseado em STR (ajuste se quiser)
  const str = state.player?.stats?.str ?? 0;
  return 8 + Math.floor(str * 1.2);
}

// Aplica um empurrão temporário ao inimigo (processado no update)
function applyKnockback(en, fromX, fromY, strength = 2.2, dur = 0.12){
  const dx = en.x - fromX, dy = en.y - fromY;
  const d  = Math.hypot(dx, dy) || 1;
  en.kx = (dx / d) * strength;   // vel "instantânea" (tiles/s)
  en.ky = (dy / d) * strength;
  en.kb = dur;                   // tempo restante do empurrão
}


function updateSlashes(dt){
  if (!state.slashes || state.slashes.length === 0) return;

  for (const s of state.slashes){
    s.t += dt;

    // checa impacto 1x por inimigo (usa s.hit para não bater múltiplas vezes)
    for (const en of state.enemies){
      if (!en || en.dead) continue;
      if (s.hit && s.hit.has(en.id)) continue;

      const dx = en.x - s.x, dy = en.y - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist > s.range) continue;

      const a = Math.atan2(dy, dx);
      if (angleDelta(s.angle, a) > (s.arc * 0.5)) continue;

      // opcional: não atravessar paredes com a lâmina
      // if (!lineClear(state.dungeon, s.x, s.y, en.x, en.y)) continue;

      // aplica dano e marca como já atingido por este slash
      en.hp -= meleeDamage();
      if (s.hit) s.hit.add(en.id);
      applyKnockback(en, s.x, s.y);
      if (en.hp <= 0) enqueueDeath(en);
    }
  }

  // remove slashes expirados
  state.slashes = state.slashes.filter(s => s.t < s.ttl);
}

// ==== XP / LEVEL ====
export function ensurePlayerXP(){
  const p = state.player;
  if (!p) return;
  if (!Number.isFinite(p.level))    p.level    = 1;
  if (!Number.isFinite(p.xp))       p.xp       = 0;
  if (!Number.isFinite(p.xpToNext)) p.xpToNext = xpThresholdForLevel(p.level);
}

export function awardXP(amount){
  const p = state.player;
  if (!p) return;
  ensurePlayerXP();

  if (p.level >= MAX_LEVEL){
    // já no cap; opcional: acumular XP “extra” sem subir
    p.xp = 0; p.xpToNext = 0;
    return;
  }

  p.xp += amount;
  log(`Ganhou ${amount} XP.`);

  // pode subir múltiplos níveis se XP “sobrar”
  while (p.level < MAX_LEVEL && p.xp >= p.xpToNext){
    p.xp -= p.xpToNext;
    p.level += 1;
    p.xpToNext = (p.level < MAX_LEVEL) ? xpThresholdForLevel(p.level) : 0;

    log(`↑ Subiu para o nível ${p.level}!`);
    // (Etapa 2: aqui vamos conceder pontos de atributo / efeitos de level up)
  }

  // se bateu no cap, normaliza a barra
  if (p.level >= MAX_LEVEL){ p.xp = 0; p.xpToNext = 0; }
}


export function castFireboltWorld(wx,wy){
  const p=state.player;
  if(p.mana<6){log('Mana insuficiente'); return;}
  p.mana-=6;
  const dir={x:wx-p.x,y:wy-p.y}, len=Math.hypot(dir.x,dir.y)||1; dir.x/=len; dir.y/=len;
  p.facingAngle=Math.atan2(dir.y,dir.x);
  state.projectiles.push({x:p.x,y:p.y,dx:dir.x*12/60,dy:dir.y*12/60,ttl:1.2,dmg:18});
}
export function castFireboltAtScreen(sx,sy){const w=screenToWorld(sx,sy,state.origin); castFireboltWorld(w.x,w.y)}
 export function meleeAttack(){
   if(state.meleeCD>0||state.gameOver) return;
   const angle=state.player.facingAngle||0;
   state.slashes.push({x:state.player.x,y:state.player.y,angle,range:2.0,arc:(50*Math.PI/180),ttl:0.18,t:0,hit:new Set()});
   state.meleeCD=0.35;
  // abrir baús se bem perto (e linha limpa)
  for (const ch of state.chests){
    if (ch.opened) continue;
    const dx = ch.x - state.player.x, dy = ch.y - state.player.y;
    const d = Math.hypot(dx,dy);
    if (d <= 1.2 && lineClear(state.dungeon, state.player.x, state.player.y, ch.x, ch.y)){
      openChest(ch);
    }
  }
 }
state.meleeCD=0;

const deathQueue=[];
export function enqueueDeath(en){
    if(en.dead)return; en.dead=true; deathQueue.push(en)

    // XP por inimigo comum
    awardXP(XP_PER_KILL);

    // objetivo: contar mortes e atualizar HUD
    if (state.objective?.active) {
      state.objective.kills++;
      updateObjectiveHUD();
    if (state.objective.kills >= state.objective.total) {
      state.objective.active = false;
      objectiveResetTimer = 0.6; // daqui a 0.6s o update dispara o reset
      log('Objetivo concluído!');
    }
    }
  }
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
export function spawnEnemies(n = 6){
  // reinicia timers auxiliares
  phaseTime = 0;
  flow = null; flowTimer = 0;
  lastPlayerCell = {x:-1, y:-1};

  state.enemies.length = 0;
  const grid = state.dungeon.grid;
  const used = new Set();

  const px = Math.floor(state.player.x), py = Math.floor(state.player.y);

  // tenta bastante, mas com limite para não travar (mapa 56x56 → 3k células)
  const maxAttempts = Math.min(5000, n * 400);
  let attempts = 0;

  while (state.enemies.length < n && attempts < maxAttempts){
    attempts++;

    const x = Math.floor(Math.random() * MAP_W);
    const y = Math.floor(Math.random() * MAP_H);
    const key = y * 1024 + x;

    if (used.has(key)) continue;
    if (grid?.[y]?.[x] !== FLOOR) continue;               // só piso (sem parede/buraco)
    if (Math.abs(x - px) + Math.abs(y - py) < 2) continue; // evita colar no player

    used.add(key);

    // mesmo “modelo” de inimigo que você já usava
    state.enemies.push(new (class {
      constructor(){
        this.id = Math.random().toString(36).slice(2);
        this.x = x + 0.5; this.y = y + 0.5;
        this.hp = 40; this.maxHp = 40;
        this.speed = 2.6; this.aggro = 8; this.damage = 6;
        this.dead = false;
        this.kb = 0; this.kx = 0; this.ky = 0;
      }
    })());
  }

  // fallback: se por alguma razão não bateu N, sincroniza o objetivo para não ficar impossível
  if (state.objective?.active && state.enemies.length !== state.objective.total){
    state.objective.total = state.enemies.length;
    try { updateObjectiveHUD(); } catch(_) {}
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
  // limpeza extra (opcional)
  state.projectiles && (state.projectiles.length = 0);
  state.slashes     && (state.slashes.length     = 0);
  state.groundLoot  && (state.groundLoot.length  = 0);
  state.chests      && (state.chests.length      = 0);
  state.gameOver=false; state.player.dead=false;
  window.dispatchEvent(new CustomEvent('game-repair'));
  state.player.hp=state.player.maxHp; state.player.mana=state.player.maxMana;
  applyAllBonuses(); renderHotbar(); log(reason);
}
export function dieInHole(){ if(state.gameOver) return; state.gameOver=true; state.player.dead=true; log('Você caiu em um buraco!'); setTimeout(()=>resetGame('Você caiu em um buraco! Reiniciando...'),400); }

// ---- BAÚS ----
function chestOffsets() {
  // posições a 1–2 tiles de distância (inclui diagonais), sem (0,0)
  const ring = [];
  for (let dy=-2; dy<=2; dy++) for (let dx=-2; dx<=2; dx++){
    if (dx===0 && dy===0) continue;
    const md = Math.max(Math.abs(dx), Math.abs(dy));
    if (md>=1 && md<=2) ring.push([dx,dy]);
  }
  // embaralha
  for (let i=ring.length-1; i>0; i--){
    const j=(Math.random()*(i+1))|0; [ring[i],ring[j]]=[ring[j],ring[i]];
  }
  return ring;
}

export function spawnChests(min=1,max=3){
  if (!state.chests) state.chests = []; else state.chests.length = 0;
  const grid = state.dungeon?.grid;
  if (!grid) return; // dungeon ainda não criada

  const want = min + Math.floor(Math.random()*(max-min+1)); // 1..3
  const used = new Set();
  // player pode não existir ainda — use fallback seguro
  const p = state.player;
  const px = Number.isFinite(p?.x) ? Math.floor(p.x) : -9999;
  const py = Number.isFinite(p?.y) ? Math.floor(p.y) : -9999;

  let attempts = 0, placed = 0, maxAttempts = 4000;
  while (placed < want && attempts < maxAttempts){
    attempts++;
    const x = Math.floor(Math.random()*MAP_W);
    const y = Math.floor(Math.random()*MAP_H);
    const k = y*1024 + x;
    if (used.has(k)) continue;
    if (grid?.[y]?.[x] !== FLOOR) continue;
    // não colar no player
    if (Math.abs(x-px)+Math.abs(y-py) < 4) continue;

    used.add(k);
    state.chests.push({id:Math.random().toString(36).slice(2), x:x+0.5, y:y+0.5, opened:false});
    placed++;
  }
}

function scatterFromChest(cx, cy, count){
  const cand = chestOffsets();
  let dropped = 0;
  for (const [dx,dy] of cand){
    const x = Math.floor(cx + dx), y = Math.floor(cy + dy);
    if (x<0||y<0||x>=MAP_W||y>=MAP_H) continue;
    if (state.dungeon.grid[y][x] !== FLOOR) continue;
    state.groundLoot.push({x:x+0.5, y:y+0.5, item:rollItem()});
    dropped++;
    if (dropped>=count) break;
  }
}

function openChest(ch){
  if (!ch || ch.opened) return;
  ch.opened = true;
  // 95% = 1 item, 5% = 2 itens
  const count = (Math.random() < 0.05) ? 2 : 1;
  scatterFromChest(Math.floor(ch.x), Math.floor(ch.y), count);
  log(`Baú aberto — dropou ${count} item(ns).`);
}

export function update(dt){
  phaseTime += dt;
  state.meleeCD = Math.max(0, (state.meleeCD || 0) - dt);
  let changed=false;
  // --- Flow-field pathfinding: rebuild quando muda o tile do player ou pelo tempo ---
  flowTimer -= dt;
  const px = Math.floor(state.player.x), py = Math.floor(state.player.y);
  const movedTile = (px !== lastPlayerCell.x || py !== lastPlayerCell.y);
  if (flowTimer <= 0 || movedTile) {
    flow = computeFlowFrom(state.dungeon, px, py);
    lastPlayerCell = {x:px, y:py};
    flowTimer = FLOW_INTERVAL;
  }
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
    if (en.dead) return;

    // Se está em knockback, aplica e reduz o timer, sem IA neste frame
    if ((en.kb || 0) > 0){
      moveWithCollision(state.dungeon, en, (en.kx || 0) * dt, (en.ky || 0) * dt);
      en.kb -= dt;
      return; // <- não executa perseguição neste frame
    }

    // 1) Tente seguir o gradiente do flow-field
    let usedFlow = false;
    if (flow) {
      const ex = Math.floor(en.x), ey = Math.floor(en.y);
      const ed = flow?.[ey]?.[ex];
      if (Number.isFinite(ed)) {
        // escolha vizinho com distância menor (descendo o gradiente)
        const C = [[1,0],[-1,0],[0,1],[0,-1]];
        let best = null, bestD = ed;
        for (let i=0;i<4;i++){
          const nx = ex + C[i][0], ny = ey + C[i][1];
          const nd = flow?.[ny]?.[nx];
          if (!Number.isFinite(nd)) continue;
          if (nd < bestD) { bestD = nd; best = {x:nx,y:ny}; }
        }
        if (best) {
          const gx = best.x + 0.5, gy = best.y + 0.5; // centro do próximo tile
          const dx = gx - en.x, dy = gy - en.y, d = Math.hypot(dx,dy) || 1;
          const vx = (dx/d) * en.speed * dt, vy = (dy/d) * en.speed * dt;
          moveWithCollision(state.dungeon, en, vx, vy);
          usedFlow = true;
        }
      }
    }

    // 2) Se não deu pra usar flow (tile inválido, corredor etc), caia pro comportamento anterior
    if (!usedFlow) {
      const dx = state.player.x - en.x, dy = state.player.y - en.y, d = Math.hypot(dx,dy) || 1;
      const lureAggro = Math.min(10, phaseTime * 0.5);
      const currentAggro = (en.aggro || 8) + lureAggro;

      if (d < currentAggro && lineClear(state.dungeon, en.x, en.y, state.player.x, state.player.y)) {
        const vx = (dx/d) * en.speed * dt;
        const vy = (dy/d) * en.speed * dt;
        moveWithCollision(state.dungeon, en, vx, vy);
      } else {
        const lureSpeed = en.speed * 0.45;
        const vx = (dx/d) * lureSpeed * dt;
        const vy = (dy/d) * lureSpeed * dt;
        moveWithCollision(state.dungeon, en, vx, vy);
      }
    }

    // 3) Dano de contato
    const touch = Math.hypot(state.player.x - en.x, state.player.y - en.y);
    if (touch < 0.9 && Math.random() < 0.7 * dt) {
      state.player.hp -= en.damage;
      if (state.player.hp < 0) state.player.hp = 0;
    }
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

  state.enemies.forEach(en=>{
    if (en.dead) return;
    const dx = state.player.x - en.x;
    const dy = state.player.y - en.y;
    const d  = Math.hypot(dx, dy) || 1;

    // aggro cresce ao longo do tempo, facilitando o encontro
    const lureAggro = Math.min(10, phaseTime * 0.5); // +0.5 tile/s, até +10
    const currentAggro = (en.aggro || 8) + lureAggro;

    if (d < currentAggro && lineClear(state.dungeon, en.x, en.y, state.player.x, state.player.y)) {
      // perseguição plena quando dentro do aggro e com linha "limpa"
      const vx = (dx / d) * en.speed * dt;
      const vy = (dy / d) * en.speed * dt;
      moveWithCollision(state.dungeon, en, vx, vy);

      // dano de contato
      if (d < 0.9 && Math.random() < 0.7 * dt) {
        state.player.hp -= en.damage;
        if (state.player.hp < 0) state.player.hp = 0;
      }
    } else {
      // fora do aggro: deriva suave em direção ao jogador (ajuda a aproximar)
      const lureSpeed = en.speed * 0.45; // bem mais lento que perseguição
      const vx = (dx / d) * lureSpeed * dt;
      const vy = (dy / d) * lureSpeed * dt;
      moveWithCollision(state.dungeon, en, vx, vy);
    }
  });

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

  updateSlashes(dt);

  processDeaths();

  if (objectiveResetTimer >= 0) {
    objectiveResetTimer -= dt;
    if (objectiveResetTimer <= 0) {
      objectiveResetTimer = -1;
      resetGame('Objetivo concluído! Reiniciando...');
    }
  }
}
