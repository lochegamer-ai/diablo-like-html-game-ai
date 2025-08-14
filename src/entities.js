
export class Entity{constructor(x,y){this.x=x;this.y=y;this.speed=3;this.hp=100;this.baseMaxHp=100;this.maxHp=100;this.mana=60;this.maxMana=60}}
export class Player extends Entity{constructor(x,y){super(x,y);this.stats={str:10,dex:10,mag:10,vit:10};this.level=1;this.exp=0;this.dead=false;this.facingAngle=0;this.visualAngle=0;}}
export class Enemy extends Entity{constructor(x,y,t='Skeleton'){super(x,y);this.id=Math.random().toString(36).slice(2);this.type=t;this.hp=40;this.maxHp=40;this.speed=2.6;this.aggro=8;this.damage=6;this.dead=false;}}
