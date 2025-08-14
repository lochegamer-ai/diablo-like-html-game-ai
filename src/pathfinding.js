// src/pathfinding.js
import {MAP_W, MAP_H, FLOOR} from './config.js';

export function isWalkableCell(dungeon, x, y){
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  const cell = dungeon.grid[y][x];
  return cell === FLOOR; // buracos/parede não são walkables
}

// BFS a partir do alvo (tile do jogador) gerando distâncias mínimas em 4 direções
export function computeFlowFrom(dungeon, targetX, targetY){
  const W = MAP_W, H = MAP_H;
  if (!isWalkableCell(dungeon, targetX, targetY)) return null;

  const dist = Array.from({length:H}, () => new Array(W).fill(Infinity));
  const qx = new Array(W*H), qy = new Array(W*H); let qh = 0, qt = 0;

  dist[targetY][targetX] = 0;
  qx[qt] = targetX; qy[qt] = targetY; qt++;

  const N = [[1,0],[-1,0],[0,1],[0,-1]];
  while (qh < qt){
    const x = qx[qh], y = qy[qh]; qh++;
    const d = dist[y][x] + 1;
    for (let i=0;i<4;i++){
      const nx = x + N[i][0], ny = y + N[i][1];
      if (!isWalkableCell(dungeon, nx, ny)) continue;
      if (dist[ny][nx] <= d) continue;
      dist[ny][nx] = d;
      qx[qt] = nx; qy[qt] = ny; qt++;
    }
  }
  return dist;
}
