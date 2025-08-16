
import {MAP_W,MAP_H} from './config.js';
export const state={
  canvas:null, ctx:null, origin:{x:0,y:0},
  dungeon:null, player:null, enemies:[], groundLoot:[], chests:[],
  inv:null, hotbar:new Array(9).fill(null),
  projectiles:[], slashes:[], buffs:[],
  keys:{w:false,a:false,s:false,d:false},
  mouse:{x:0,y:0}, isDragging:false, didPan:false, panMode:false,
  dragStart:{x:0,y:0}, originStart:{x:0,y:0},
  last:0, gameOver:false,
  showNames:true,
  showWalls:true,
  started:false, 
  class: 'warrior',
  skill: { cds: { skill: 0, ult: 0 } }, // cooldowns em segundos
  vfx:   { spins: [] },                  // VFX do ataque giratório
  victory:{active:false, bannerT:0, nextT:0},
  objective:{active:false,total:0,kills:0}
};
export function validateState(){
  const d=state.dungeon;
  return !!(d && Array.isArray(d.grid) && d.grid.length===MAP_H && d.grid[0]?.length===MAP_W);
}
