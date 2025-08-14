
export const TILE_W=64, TILE_H=32, MAP_W=56, MAP_H=56;
export const FLOOR=1, WALL=2, HOLE=3;
export const MAX_STACK=99;

// ==== Progressão de XP ====
export const MAX_LEVEL     = 20;   // <- mude aqui o limite de níveis
export const XP_BASE_NEXT  = 50;   // XP para ir do nível 1 -> 2
export const XP_PER_KILL   = 10;   // XP por inimigo comum abatido

// threshold para subir do nível L -> L+1
export function xpThresholdForLevel(level){
  // L=1 -> 50, L=2 -> 100, L=3 -> 200, ...
  return XP_BASE_NEXT * Math.pow(2, Math.max(0, level - 1));
}
