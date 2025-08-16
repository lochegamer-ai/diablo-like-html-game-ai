
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

// ==== Inimigos ====
export const ENEMY_TEMPLATES = {
  melee:  { maxHp: 70,  speed: 2.7, damage: 10, meleeCD: 0.60, color: '#f4a261' },
  ranged: { maxHp: 38,  speed: 2.5, damage: 8,  shootCD: 1.20, preferRange: 5.5, projSpeed: 6.0, color: '#64d2ff' },
  tank:   { maxHp: 140, speed: 1.8, damage: 14, touchRate: 0.65, color: '#c77dff' }
};

// proporção aproximada (soma 1.0)
export const ENEMY_SPAWN_WEIGHTS = { melee: 0.5, ranged: 0.3, tank: 0.2 };

// ==== Skills: Warrior ====
export const SKILLS = {
  warrior: {
    basic:   { key: 'LMB', name: 'Ataque' },
    skill:   { key: 'RMB', name: 'Whirl', cooldown: 1 },
    ultimate:{ key: 'E',   name: 'Berserk', cooldown: 120, duration: 20,
               speedBonus: 1.5,  // +150% velocidade (somado ao sistema de buffs)
               dmgBonus:   1.0   // +100% dano (multiplicador)
    }
  }
};