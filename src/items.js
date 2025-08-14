
import {MAX_STACK} from './config.js';
import {choice,rand} from './utils/math.js';

export const PREFIX=["Sturdy","Fine","Cruel","Holy","Cursed","Fiery","Icy"];
export const SUFFIX=["of the Fox","of Might","of Precision","of Magic","of the Bear"];
export const CATALOG=[
  {kind:'helm',names:['Helm','Cap','Hood'],slot:'head'},
  {kind:'chest',names:['Armor','Breastplate','Robe'],slot:'chest'},
  {kind:'legs',names:['Pants','Leggings','Greaves'],slot:'legs'},
  {kind:'weapon1h',names:['Sword','Dagger','Mace','Wand'],slot:'hand',hands:1},
  {kind:'weapon2h',names:['Greatsword','Bow','Staff'],slot:'hand',hands:2},
  {kind:'shield',names:['Shield','Kite Shield'],slot:'off'},
  {kind:'accessory',names:['Ring','Amulet','Charm'],slot:'acc'}
];

function makeBonus(kind,name){
  const b={str:0,dex:0,mag:0,vit:0,hp:0};
  const plus=(a,b)=>a+rand(b-a+1);
  if(kind==='helm'||kind==='chest'||kind==='legs'){b.hp=plus(12,30); if(rand(100)<35)b.vit+=plus(1,3);}
  if(kind==='shield'){b.hp=plus(8,20); if(rand(100)<40)b.vit+=plus(1,2);}
  if(kind==='weapon1h'){
    if(name.includes('Sword')||name.includes('Mace'))b.str=plus(3,8);
    if(name.includes('Dagger'))b.dex=plus(3,8);
    if(name.includes('Wand'))b.mag=plus(3,8);
  }
  if(kind==='weapon2h'){
    if(name.includes('Greatsword'))b.str=plus(5,10);
    if(name.includes('Bow'))b.dex=plus(5,10);
    if(name.includes('Staff'))b.mag=plus(5,10);
  }
  if(kind==='accessory'){ b[choice(['str','dex','mag','vit'])]=plus(1,3); }
  return b;
}
export function rollEquip(){
  const cat=choice(CATALOG), t=choice(cat.names);
  const name=(rand(100)<65? choice(PREFIX)+" ":"")+t+(rand(100)<65? " "+choice(SUFFIX):"");
  const rarity=rand(100)<5?'legendary':rand(100)<20?'rare':'normal';
  const stats={dmg:cat.kind.startsWith('weapon')?(3+rand(7)):0,ac:(['helm','chest','legs','shield'].includes(cat.kind))?(1+rand(6)):0};
  const bonus=makeBonus(cat.kind,t);
  return {id:Math.random().toString(36).slice(2),name,rarity,stats,size:1,kind:cat.kind,bonus,equip:{slot:cat.slot,hands:cat.hands||0}};
}
export function rollPotion(){
  const type=choice(['hp','mana','str','spd']);
  const map={hp:['Health Potion','hp'],mana:['Mana Potion','mana'],str:['Might Potion','str'],spd:['Haste Potion','spd']};
  const [nm,cls]=map[type];
  return {id:Math.random().toString(36).slice(2),name:nm,rarity:'consumable',size:1,kind:'potion',potion:type,cls,count:1};
}
export const isUsable=(it)=>it&&it.kind==='potion';
export function rollItem(){return Math.random()<0.65?rollEquip():rollPotion()}
export const itemLabel=it=>it?.name||'Item';
export const canStack=(a,b)=>a&&b&&a.kind==='potion'&&b.kind==='potion'&&a.potion===b.potion;
export function stackInto(dst,src){const dc=(dst.count??1), sc=(src.count??1), free=MAX_STACK-dc; if(free<=0)return 0; const mv=Math.min(sc,free); dst.count=dc+mv; src.count=sc-mv; return mv;}
export function potionHint(it){const m={hp:'Cura 15% HP',mana:'Restaura 15% Mana',str:'+5 STR por 10s',spd:'+5% Velocidade por 10s'};return m[it.potion]||''}
// ——— Lore/descrição simples por tipo/raridade ———
export function itemLore(it){
  if (!it) return '';
  const rare = it.rarity || 'normal';
  const pick = (arr)=>arr[Math.floor(Math.random()*arr.length)];

  if (it.kind === 'potion') {
    const base = {
      hp:   ['Um aroma ferroso paira no ar.', 'Destilada por monges curandeiros.'],
      mana: ['Cintila como o azul do Éter.', 'Sussurra segredos antigos.'],
      str:  ['Forjada em brasas de guerra.', 'Aquece a alma e endurece os punhos.'],
      spd:  ['Leve como o vento da madrugada.', 'Apressa o passo dos caçadores.']
    }[it.potion] || ['Um tônico de origem duvidosa.'];
    return pick(base);
  }

  const common = [
    'Fiel companheira de aventureiros esquecidos.',
    'Cheira a poeira de masmorras antigas.',
    'Tem marcas de batalha por toda parte.'
  ];
  const rareL = [
    'Sussurra o nome de seus antigos donos.',
    'Imbuída com um brilho discreto.'
  ];
  const leg = [
    'Dizem que escolhe seu portador.',
    'Forjada sob um céu sem estrelas.'
  ];

  if (rare === 'legendary') return pick(leg);
  if (rare === 'rare') return pick(rareL);
  return pick(common);
}