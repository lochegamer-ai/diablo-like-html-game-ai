
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
export function sprinkleHoles(dungeon,player,minDist=6,ch=0.035){
  for(let y=1;y<MAP_H-1;y++) for(let x=1;x<MAP_W-1;x++){
    if(dungeon.grid[y][x]!==FLOOR) continue;
    const d=Math.hypot((x+0.5)-player.x,(y+0.5)-player.y);
    if(d<minDist) continue;
    if(Math.random()<ch) dungeon.grid[y][x]=HOLE;
  }
}
