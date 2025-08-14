
import {TILE_W,TILE_H} from '../config.js';
export function isoToScreen(x,y,origin){return {x:(x-y)*TILE_W/2 + origin.x, y:(x+y)*TILE_H/2 + origin.y}}
export function screenToWorld(sx,sy,origin){
  const x=((sx-origin.x)/(TILE_W/2)+(sy-origin.y)/(TILE_H/2))/2;
  const y=((sy-origin.y)/(TILE_H/2)-(sx-origin.x)/(TILE_W/2))/2;
  return {x,y};
}
export function getCenterOriginFor(x,y,canvas){
  const sx=(x-y)*TILE_W/2, sy=(x+y)*TILE_H/2;
  return {x:canvas.width/2-sx,y:canvas.height/2-sy};
}
