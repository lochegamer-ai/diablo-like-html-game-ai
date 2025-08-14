
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const rand=n=>Math.floor(Math.random()*n);
export const choice=arr=>arr[rand(arr.length)];
export function angWrap(a){while(a<=-Math.PI)a+=Math.PI*2; while(a>Math.PI)a-=Math.PI*2; return a;}
export function angLerp(from,to,t){return from + angWrap(to-from)*t;}
