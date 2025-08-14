
import {MAP_W,MAP_H,FLOOR,WALL,HOLE} from './config.js';
import {RNG} from './utils/rng.js';
export function makeDungeon(seed=Date.now()){
  const rng=new RNG(seed), g=Array.from({length:MAP_H},()=>Array(MAP_W).fill(WALL)), rooms=[];
  const count=18+Math.floor(rng.nextFloat()*8);
  for(let i=0;i<count;i++){
    const w=4+Math.floor(Math.random()*6), h=3+Math.floor(Math.random()*6),
          x=2+Math.floor(Math.random()*(MAP_W-w-4)), y=2+Math.floor(Math.random()*(MAP_H-h-4));
    rooms.push({x,y,w,h});
    for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) g[yy][xx]=FLOOR;
  }
  rooms.sort((a,b)=>a.x+a.y-(b.x+b.y));
  for(let i=1;i<rooms.length;i++){
    const a=rooms[i-1], b=rooms[i];
    const ax=(a.x*2+a.w)>>1, ay=(a.y*2+a.h)>>1, bx=(b.x*2+b.w)>>1, by=(b.y*2+b.h)>>1;
    for(let x=Math.min(ax,bx);x<=Math.max(ax,bx);x++) g[ay][x]=FLOOR;
    for(let y=Math.min(ay,by);y<=Math.max(ay,by);y++) g[y][bx]=FLOOR;
  }
  for(let pass=0;pass<2;pass++){
    for(let y=1;y<MAP_H-1;y++) for(let x=1;x<MAP_W-1;x++){
      let n=0; for(let yy=-1;yy<=1;yy++) for(let xx=-1;xx<=1;xx++) if(g[y+yy][x+xx]===FLOOR) n++;
      if(n>=5)g[y][x]=FLOOR;
    }
  }
  return {grid:g,rooms};
}

// retorna true se a célula (x,y) for um segmento de corredor 1×N (somente 2 vizinhos ortogonais e opostos)
function isNarrowCorridor(grid, x, y){
  if (grid[y][x] !== FLOOR) return false;
  const up    = grid[y-1]?.[x] === FLOOR;
  const down  = grid[y+1]?.[x] === FLOOR;
  const left  = grid[y]?.[x-1] === FLOOR;
  const right = grid[y]?.[x+1] === FLOOR;
  const count = (up?1:0) + (down?1:0) + (left?1:0) + (right?1:0);
  // corredor 1×N: exatamente 2 vizinhos e eles são opostos (N+S) ou (W+E)
  return count === 2 && ((up && down) || (left && right));
}

export function sprinkleHoles(
  dungeon,
  player,
  minDist = 6,
  {
    chance = 0.012,      // ↓ era ~0.035 — agora bem menos
    maxDensity = 0.02,   // no máx. ~2% dos pisos viram buraco
    spacing = 2,         // evita buracos muito próximos
    avoidCorridors = true
  } = {}
){
  const g = dungeon.grid;
  const floors = [];

  // coleta pisos válidos (ignora borda pra não precisar checar bounds toda hora)
  for (let y = 1; y < MAP_H-1; y++){
    for (let x = 1; x < MAP_W-1; x++){
      if (g[y][x] === FLOOR) floors.push([x,y]);
    }
  }

  // baralha pra não favorecer áreas específicas
  for (let i = floors.length - 1; i > 0; i--){
    const j = (Math.random() * (i + 1)) | 0;
    [floors[i], floors[j]] = [floors[j], floors[i]];
  }

  const maxHoles = Math.floor(floors.length * maxDensity);
  let placed = 0;

  for (const [x, y] of floors){
    if (placed >= maxHoles) break;

    // distância mínima do jogador (não trollar spawn)
    const d = Math.hypot((x+0.5) - player.x, (y+0.5) - player.y);
    if (d < minDist) continue;

    // não bloquear corredores 1×N
    if (avoidCorridors && isNarrowCorridor(g, x, y)) continue;

    // respeitar espaçamento Manhattan entre buracos existentes
    let tooClose = false;
    for (let dy = -spacing; dy <= spacing && !tooClose; dy++){
      for (let dx = -spacing; dx <= spacing; dx++){
        if (Math.abs(dx) + Math.abs(dy) > spacing) continue;
        const yy = y + dy, xx = x + dx;
        if (g[yy]?.[xx] === HOLE){ tooClose = true; break; }
      }
    }
    if (tooClose) continue;

    // chance final
    if (Math.random() < chance){
      g[y][x] = HOLE;
      placed++;
    }
  }
}
