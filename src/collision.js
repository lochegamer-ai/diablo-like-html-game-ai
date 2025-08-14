
import {MAP_W,MAP_H,WALL,HOLE} from './config.js';
export const isWallAt=(d,x,y)=>{x=Math.floor(x);y=Math.floor(y); if(x<0||y<0||x>=MAP_W||y>=MAP_H) return true; return d.grid[y][x]===WALL};
export const isHoleAt=(d,x,y)=>{x=Math.floor(x);y=Math.floor(y); if(x<0||y<0||x>=MAP_W||y>=MAP_H) return false; return d.grid[y][x]===HOLE};
export function moveWithCollision(d,e,dx,dy){ if(!isWallAt(d,e.x+dx,e.y)) e.x+=dx; if(!isWallAt(d,e.x,e.y+dy)) e.y+=dy }
export function lineClear(d,ax,ay,bx,by){const steps=Math.ceil(Math.hypot(bx-ax,by-ay)/0.2);for(let i=1;i<=steps;i++){const t=i/steps,x=ax+(bx-ax)*t,y=ay+(by-ay)*t;if(isWallAt(d,x,y))return false}return true}
