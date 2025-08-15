// src/icons.js
// Paleta por raridade
function rareStroke(r){
  return r === 'legendary' ? '#f2c04a' :
         r === 'rare'      ? '#6aa8ff' :
                             '#cfd7e6';
}

// tentativa de inferir o "tipo" de arma pelo nome (fallback = espada)
function weaponFromName(name=''){
  const n = String(name).toLowerCase();
  if (n.includes('bow')    || n.includes('arco'))   return 'bow';
  if (n.includes('staff')  || n.includes('cajado')) return 'staff';
  if (n.includes('axe')    || n.includes('machad')) return 'axe';
  if (n.includes('mace')   || n.includes('maça'))   return 'mace';
  if (n.includes('dagger') || n.includes('adaga'))  return 'dagger';
  return 'sword';
}

// SVG helpers
const svg = (path, stroke) => `
<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  ${path}
</svg>`;

// ——— ícones primários ———
const ICONS = {
  helm: (s)=>svg(`
    <path d="M4 12v-1a8 8 0 0 1 16 0v1" />
    <path d="M4 12h16" />
    <path d="M9 12v5m6-5v5" />
    <path d="M7 17h10" />
  `, s),

  chest: (s)=>svg(`
    <path d="M7 5l-2 3v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-2-3" />
    <path d="M7 5h10M7 12h10" />
  `, s),

  legs: (s)=>svg(`
    <path d="M9 4h6l-1 6h-4L9 4z" />
    <path d="M10 10l-2 10M14 10l2 10" />
  `, s),

  shield: (s)=>svg(`
    <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" />
  `, s),

  sword: (s)=>svg(`
    <path d="M14 4l6 6" />
    <path d="M11 7l6 6" />
    <path d="M2 22l7-7" />
    <path d="M7 13l-2 2 4 4 2-2" />
  `, s),

  dagger: (s)=>svg(`
    <path d="M4 20l5-5 7-7 3 3-7 7-5 5H4z" />
    <path d="M14 6l4 4" />
  `, s),

  axe: (s)=>svg(`
    <path d="M3 21l9-9" />
    <path d="M12 12c3-3 7-3 9 0-3 3-7 3-9 0z" />
    <path d="M12 12l5-5" />
  `, s),

  mace: (s)=>svg(`
    <path d="M3 21l8-8" />
    <circle cx="16" cy="8" r="3.5" />
    <path d="M16 1v3M16 12v3M9 8H6M26 8h-3M12.5 3.5l-2 2M21.5 12.5l-2 2M21.5 3.5l-2 2M12.5 12.5l-2 2" />
  `, s),

  staff: (s)=>svg(`
    <path d="M5 22l8-8" />
    <path d="M13 14l2 2" />
    <path d="M15 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
  `, s),

  bow: (s)=>svg(`
    <path d="M4 12c4-6 12-6 16 0-4 6-12 6-16 0z" />
    <path d="M4 12h16" />
    <path d="M12 3v18" />
  `, s),

  ring: (s)=>svg(`
    <circle cx="12" cy="12" r="6" />
    <path d="M9 4l3-2 3 2" />
  `, s)
};

// mapeia item -> ícone
export function iconSVGForItem(it){
  const stroke = rareStroke(it?.rarity);
  const k = it?.kind;

  if (k === 'helm')   return ICONS.helm(stroke);
  if (k === 'chest')  return ICONS.chest(stroke);
  if (k === 'legs')   return ICONS.legs(stroke);
  if (k === 'shield') return ICONS.shield(stroke);
  if (k === 'accessory') return ICONS.ring(stroke);

  if (k === 'weapon1h' || k === 'weapon2h'){
    const w = weaponFromName(it?.name);
    const pick = ICONS[w] || ICONS.sword;
    return pick(stroke);
  }

  // fallback genérico
  return ICONS.sword(stroke);
}
