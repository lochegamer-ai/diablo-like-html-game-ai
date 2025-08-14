
import {state} from './state.js';
import {TILE_W,TILE_H,FLOOR,WALL,HOLE,MAP_W,MAP_H} from './config.js';
import {clamp,lerp} from './utils/math.js';
import {isoToScreen,screenToWorld} from './iso/coords.js';

// ALTURA visual da parede (em px na tela)
const WALL_H = Math.round(TILE_H * 1.2);

// desenha um bloco elevando o "top" e criando faces
function drawWall(x, y, shade) {
  const s = isoToScreen(x, y, state.origin);

  // cantos do losango na base (chão)
  const T = {x:s.x,               y:s.y};
  const R = {x:s.x + TILE_W/2,    y:s.y + TILE_H/2};
  const B = {x:s.x,               y:s.y + TILE_H};
  const L = {x:s.x - TILE_W/2,    y:s.y + TILE_H/2};

  // cantos do losango no topo (elevado)
  const T2 = {x:T.x, y:T.y - WALL_H};
  const R2 = {x:R.x, y:R.y - WALL_H};
  const B2 = {x:B.x, y:B.y - WALL_H};
  const L2 = {x:L.x, y:L.y - WALL_H};

  // paleta simples baseada no "shade" da iluminação
  const topC    = `rgb(${90+shade*120|0}, ${98+shade*120|0}, ${110+shade*120|0})`;
  const frontC  = `rgb(${70+shade*90|0},  ${78+shade*90|0},  ${92+shade*90|0})`;   // face sul (frente)
  const rightC  = `rgb(${60+shade*80|0},  ${66+shade*80|0},  ${80+shade*80|0})`;   // face leste
  const leftC   = `rgb(${55+shade*70|0},  ${60+shade*70|0},  ${74+shade*70|0})`;   // (opcional) face oeste
  const strokeC = 'rgba(0,0,0,.35)';

  // vizinhos — para ocultar faces internas
  const grid = state.dungeon.grid;
  const nRight = (grid?.[y]?.[x+1] === WALL);
  const nFront = (grid?.[y+1]?.[x] === WALL);
  const nLeft  = (grid?.[y]?.[x-1] === WALL);

  state.ctx.save();

  // sombra simples no chão
  state.ctx.beginPath();
  state.ctx.ellipse(s.x, s.y + TILE_H*0.75, TILE_W*0.22, TILE_H*0.22, 0, 0, Math.PI*2);
  state.ctx.fillStyle = 'rgba(0,0,0,.20)';
  state.ctx.fill();

  // face direita (R2-T2-T-R)
  if (!nRight) {
    state.ctx.beginPath();
    state.ctx.moveTo(R2.x, R2.y); state.ctx.lineTo(T2.x, T2.y);
    state.ctx.lineTo(T.x,  T.y ); state.ctx.lineTo(R.x,  R.y ); state.ctx.closePath();
    state.ctx.fillStyle = rightC; state.ctx.fill(); state.ctx.strokeStyle = strokeC; state.ctx.stroke();
  }

  // face dianteira (L2-R2-R-L)
  if (!nFront) {
    state.ctx.beginPath();
    state.ctx.moveTo(L2.x, L2.y); state.ctx.lineTo(R2.x, R2.y);
    state.ctx.lineTo(R.x,  R.y ); state.ctx.lineTo(L.x,  L.y ); state.ctx.closePath();
    state.ctx.fillStyle = frontC; state.ctx.fill(); state.ctx.strokeStyle = strokeC; state.ctx.stroke();
  }

  // (opcional) face esquerda (T2-L2-L-T) — aparece nas “bordas” do mapa/corretores
  if (!nLeft) {
    state.ctx.beginPath();
    state.ctx.moveTo(T2.x, T2.y); state.ctx.lineTo(L2.x, L2.y);
    state.ctx.lineTo(L.x,  L.y ); state.ctx.lineTo(T.x,  T.y ); state.ctx.closePath();
    state.ctx.fillStyle = leftC; state.ctx.fill(); state.ctx.strokeStyle = strokeC; state.ctx.stroke();
  }

  // topo do bloco (losango elevado)
  state.ctx.beginPath();
  state.ctx.moveTo(T2.x, T2.y);
  state.ctx.lineTo(R2.x, R2.y);
  state.ctx.lineTo(B2.x, B2.y);
  state.ctx.lineTo(L2.x, L2.y);
  state.ctx.closePath();
  state.ctx.fillStyle = topC;
  state.ctx.fill();
  state.ctx.strokeStyle = strokeC;
  state.ctx.stroke();

  state.ctx.restore();
}

export function computeLight(){
  const l=Array.from({length:MAP_H},()=>Array(MAP_W).fill(0));
  const r=9,px=state.player.x,py=state.player.y;
  for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++){
    const d=Math.hypot(x+0.5-px,y+0.5-py),v=clamp(1-d/r,0,1);
    l[y][x]=v*v;
  }
  return l;
}

export function drawTile(x,y,shade){
  const s=isoToScreen(x,y,state.origin);
  const base=40,m=Math.floor(lerp(base,160,shade));
  state.ctx.beginPath();
  state.ctx.moveTo(s.x,s.y);
  state.ctx.lineTo(s.x+TILE_W/2,s.y+TILE_H/2);
  state.ctx.lineTo(s.x,s.y+TILE_H);
  state.ctx.lineTo(s.x-TILE_W/2,s.y+TILE_H/2);
  state.ctx.closePath();
  state.ctx.fillStyle=`rgb(${m-8},${m},${m+6})`;
  state.ctx.fill();
  if(state.dungeon.grid[y][x]===HOLE){
    state.ctx.save();
    state.ctx.beginPath(); state.ctx.ellipse(s.x, s.y+TILE_H/2, TILE_W*0.24, TILE_H*0.24, 0,0,Math.PI*2);
    state.ctx.fillStyle='#080a0e'; state.ctx.fill();
    state.ctx.beginPath(); state.ctx.ellipse(s.x, s.y+TILE_H/2+2, TILE_W*0.20, TILE_H*0.18, 0,0,Math.PI*2);
    state.ctx.fillStyle='rgba(0,0,0,0.55)'; state.ctx.fill();
    state.ctx.restore();
  }
}

export function drawCrosshair(sx,sy){
  state.ctx.save();
  state.ctx.globalAlpha=0.95; state.ctx.lineWidth=1;
  state.ctx.beginPath();
  state.ctx.moveTo(sx-14,sy); state.ctx.lineTo(sx-4,sy);
  state.ctx.moveTo(sx+4,sy); state.ctx.lineTo(sx+14,sy);
  state.ctx.moveTo(sx,sy-14); state.ctx.lineTo(sx,sy-4);
  state.ctx.moveTo(sx,sy+4); state.ctx.lineTo(sx,sy+14);
  state.ctx.strokeStyle='#9bd1ff'; state.ctx.stroke();
  state.ctx.beginPath(); state.ctx.arc(sx,sy,6,0,Math.PI*2); state.ctx.strokeStyle='#9bd1ff'; state.ctx.stroke();
  state.ctx.beginPath(); state.ctx.arc(sx,sy,1.5,0,Math.PI*2); state.ctx.fillStyle='#9bd1ff'; state.ctx.fill();
  state.ctx.restore();
}


function drawProjectile(p){
  const s = isoToScreen(p.x, p.y, state.origin);
  state.ctx.save();
  state.ctx.beginPath();
  state.ctx.arc(s.x, s.y + 8, 3, 0, Math.PI * 2);
  state.ctx.fillStyle = '#ffb267';
  state.ctx.shadowColor = '#ffb267';
  state.ctx.shadowBlur = 6;
  state.ctx.fill();
  state.ctx.restore();
}

function drawSlash(s){
  const base = isoToScreen(s.x, s.y, state.origin);
  const steps = 10;
  const start = s.angle - s.arc * 0.5;
  const end   = s.angle + s.arc * 0.5;
  const life  = 1 - (s.t / s.ttl);

  state.ctx.save();
  state.ctx.globalAlpha = 0.25 + life * 0.25;

  state.ctx.beginPath();
  state.ctx.moveTo(base.x, base.y + 8);
  for (let i = 0; i <= steps; i++){
    const a = start + (end - start) * (i / steps);
    const wx = s.x + Math.cos(a) * s.range;
    const wy = s.y + Math.sin(a) * s.range;
    const q = isoToScreen(wx, wy, state.origin);
    state.ctx.lineTo(q.x, q.y + 8);
  }
  state.ctx.closePath();

  state.ctx.fillStyle = 'rgba(255,220,120,0.35)';
  state.ctx.fill();
  state.ctx.strokeStyle = 'rgba(255,200,100,0.65)';
  state.ctx.lineWidth = 1.5;
  state.ctx.stroke();
  state.ctx.restore();
}

function lootColor(it){
  if (it.kind === 'potion') {
    return it.potion === 'hp'  ? '#c95a5a' :
           it.potion === 'mana'? '#3c6fd4' :
           it.potion === 'str' ? '#f49a3a' :
           /* spd */             '#29c979';
  }
  // equipamento por raridade
  return it.rarity === 'legendary' ? '#f2c04a' :
         it.rarity === 'rare'      ? '#6aa8ff' :
                                     '#d3dae6';
}

function drawGroundLoot(g){
  const s = isoToScreen(g.x, g.y, state.origin);
  const it = g.item;
  const fill = lootColor(it);

  // “diamante” no chão
  state.ctx.save();
  state.ctx.translate(s.x, s.y + 8);
  state.ctx.rotate(Math.PI / 4);
  state.ctx.fillStyle = fill;
  state.ctx.strokeStyle = 'rgba(0,0,0,.5)';
  state.ctx.shadowColor = fill;
  state.ctx.shadowBlur = 6;
  state.ctx.fillRect(-6, -6, 12, 12);
  state.ctx.strokeRect(-6, -6, 12, 12);
  state.ctx.restore();

  // nome opcional (toggle com I)
  if (state.showNames) {
    state.ctx.save();
    state.ctx.font = '12px ui-monospace, Menlo, Consolas, monospace';
    state.ctx.textAlign = 'center';
    state.ctx.fillStyle = '#cfd7e6';
    let label = it.name || 'Item';
    if (it.kind === 'potion' && (it.count ?? 1) > 1) label += ' x' + (it.count ?? 1);
    state.ctx.fillText(label, s.x, s.y - 6);
    state.ctx.restore();
  }
}

function drawEnemy(en){
  const s = isoToScreen(en.x, en.y, state.origin);

  // sombra
  state.ctx.save();
  state.ctx.beginPath();
  state.ctx.ellipse(s.x, s.y + 10, 12, 6, 0, 0, Math.PI * 2);
  state.ctx.fillStyle = 'rgba(0,0,0,.25)';
  state.ctx.fill();

  // corpo (triângulo virado para o player)
  const ang = Math.atan2(state.player.y - en.y, state.player.x - en.x);
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const fw = 16, back = 8, side = 12;
  const nose = { x: s.x + ux * fw, y: s.y + uy * fw };
  const tail = { x: s.x - ux * back, y: s.y - uy * back };
  const rot = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
  const lV = rot(ux, uy, 2.20), rV = rot(ux, uy, -2.20);
  const left  = { x: s.x + lV.x * side, y: s.y + lV.y * side };
  const right = { x: s.x + rV.x * side, y: s.y + rV.y * side };

  state.ctx.beginPath();
  state.ctx.moveTo(tail.x, tail.y);
  state.ctx.lineTo(left.x, left.y);
  state.ctx.lineTo(nose.x, nose.y);
  state.ctx.lineTo(right.x, right.y);
  state.ctx.closePath();
  state.ctx.fillStyle = '#ffb85c';
  state.ctx.strokeStyle = '#7a4a17';
  state.ctx.lineWidth = 2;
  state.ctx.fill();
  state.ctx.stroke();

  // barra de HP
  const w = 28, h = 4, padY = -14;
  const pct = Math.max(0, Math.min(1, en.hp / en.maxHp));
  state.ctx.fillStyle = '#1b2027';
  state.ctx.fillRect(s.x - w/2, s.y + padY, w, h);
  state.ctx.fillStyle = '#b33a3a';
  state.ctx.fillRect(s.x - w/2, s.y + padY, w * pct, h);
  state.ctx.strokeStyle = 'rgba(0,0,0,.5)';
  state.ctx.strokeRect(s.x - w/2, s.y + padY, w, h);

  state.ctx.restore();
}


export function render(){
  state.ctx.clearRect(0,0,state.canvas.width,state.canvas.height);
  const light=computeLight();
  for (let y=0; y<MAP_H; y++) for (let x=0; x<MAP_W; x++) {   
    const cell = state.dungeon.grid[y][x];
    // quando oculto, renderiza parede como piso (mantendo buracos e luz)
    if (cell === WALL && !state.showWalls) {
      const shade = light[y][x];
      drawTile(x, y, shade);
      continue;
    }
    const shade = (cell !== WALL) ? light[y][x] : 0.6;
    if (cell === WALL) drawWall(x, y, shade);
    else               drawTile(x, y, shade);
  }
  // enemies & loot minimal (drawn in systems if needed). This module focuses on world & player visuals.
  // loot no chão
  state.groundLoot.forEach(drawGroundLoot);
  
  // inimigos
  state.enemies.forEach(drawEnemy);

  // Player
  const p=state.player;
  const base=isoToScreen(p.x,p.y,state.origin);
  const ang=p.visualAngle;
  const ux=Math.cos(ang), uy=Math.sin(ang);
  const fw=22, back=10, side=14;
  const nose={x:base.x+ux*fw,y:base.y+uy*fw}, tail={x:base.x-ux*back,y:base.y-uy*back};
  const rot=(x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});
  const lV=rot(ux,uy,2.20), rV=rot(ux,uy,-2.20);
  const left={x:base.x+lV.x*side,y:base.y+lV.y*side}, right={x:base.x+rV.x*side,y:base.y+rV.y*side};
  state.ctx.save();
  state.ctx.fillStyle='rgba(0,0,0,.30)'; state.ctx.beginPath(); state.ctx.ellipse(base.x,base.y+10,12,6,0,0,Math.PI*2); state.ctx.fill();
  state.ctx.beginPath(); state.ctx.moveTo(tail.x,tail.y); state.ctx.lineTo(left.x,left.y); state.ctx.lineTo(nose.x,nose.y); state.ctx.lineTo(right.x,right.y); state.ctx.closePath();
  state.ctx.fillStyle='#ffd66b'; state.ctx.strokeStyle='#7b5d1a'; state.ctx.lineWidth=2; state.ctx.fill(); state.ctx.stroke();
  state.ctx.beginPath(); state.ctx.moveTo((tail.x+nose.x)/2,(tail.y+nose.y)/2); state.ctx.lineTo(nose.x,nose.y); state.ctx.strokeStyle='#b78b2a'; state.ctx.lineWidth=2; state.ctx.stroke();
  state.ctx.restore();
  // slashes (ataque melee)
  state.slashes.forEach(drawSlash);
  // projéteis (magia)
  state.projectiles.forEach(drawProjectile);
  drawCrosshair(state.mouse.x,state.mouse.y);
}
