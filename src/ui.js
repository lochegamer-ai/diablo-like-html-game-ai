import {state} from './state.js';
import {MAX_STACK} from './config.js';
import {canStack,stackInto,isUsable,itemLabel,potionHint, itemLore} from './items.js';

export const logEl = document.getElementById('log'); // pode ficar, mas não vamos depender dele

// cria (se preciso) a seção "Console" e retorna o #log
export function ensureLogHost(){
  let host = document.getElementById('log');
  if (host) return host;

  // cria fallback na lateral (ou no body se não existir)
  const side = document.querySelector('.panel.side') || document.body;
  const section = document.createElement('div');
  section.className = 'section';

  const title = document.createElement('b');
  title.textContent = 'Console';

  host = document.createElement('div');
  host.className = 'log';
  host.id = 'log';

  section.appendChild(title);
  section.appendChild(host);
  side.appendChild(section);

  return host;
}

export function log(t){
  const host = ensureLogHost();                       // <- garante elemento
  const msg = `[${new Date().toLocaleTimeString()}] ${t}`;
  const el = document.createElement('div');
  el.textContent = msg;
  host.appendChild(el);
  host.scrollTop = host.scrollHeight;
}

// ——— Tooltip host ———
let tipEl = null;
function ensureTooltip(){
  if (tipEl && document.body.contains(tipEl)) return tipEl;
  tipEl = document.createElement('div');
  tipEl.className = 'tooltip';
  tipEl.style.display = 'none';
  document.body.appendChild(tipEl);
  return tipEl;
}
function rarityClass(r){ return r==='legendary' ? 't-legendary' : (r==='rare' ? 't-rare' : ''); }
function slotLabel(it){
  if (!it || !it.equip) return '';
  const map = {head:'Capacete', chest:'Torso', legs:'Pernas', acc:'Acessório', hand:'Mão'};
  const base = map[it.equip.slot] || it.equip.slot;
  const hands = it.equip.hands===2 ? ' (2M)' : '';
  if (it.kind==='shield') return 'Mão Secundária';
  if (it.equip.slot==='hand') return `Mão Principal${hands}`;
  return base;
}
function bonusLines(it){
  const out = [];
  if (!it) return out;
  const b = it.bonus || {};
  if (b.str) out.push(`+${b.str} Força`);
  if (b.dex) out.push(`+${b.dex} Destreza`);
  if (b.mag) out.push(`+${b.mag} Magia`);
  if (b.vit) out.push(`+${b.vit} Vitalidade`);
  if (b.hp)  out.push(`+${b.hp} Vida`);
  // stats base
  if (it.stats?.dmg) out.push(`Dano: ${it.stats.dmg}`);
  if (it.stats?.ac)  out.push(`Defesa: ${it.stats.ac}`);
  return out;
}
function itemTooltipHTML(it){
  if (!it) return '';
  const name = it.name || 'Item';
  const rcls = rarityClass(it.rarity);
  const slot = it.kind==='potion' ? 'Consumível' : slotLabel(it);
  const bonuses = it.kind==='potion' ? [] : bonusLines(it);
  const effect = it.kind==='potion' ? (potionHint(it) || '') : '';
  const lore = itemLore(it);

  const bList = bonuses.map(s=>`<li>${s}</li>`).join('');
  const eff = effect ? `<div class="t-slot" style="margin-top:4px">${effect}</div>` : '';
  return `
    <div class="t-name ${rcls}">${name}</div>
    ${slot ? `<div class="t-slot">${slot}</div>` : ''}
    ${bonuses.length? `<ul>${bList}</ul>` : ''}
    ${eff}
    <div class="t-lore">${lore}</div>
  `;
}
function positionTooltip(ev){
  const el = ensureTooltip();
  const pad = 14;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  const vw = window.innerWidth, vh = window.innerHeight;
  const rect = el.getBoundingClientRect();
  if (x + rect.width > vw - 8)  x = vw - rect.width - 8;
  if (y + rect.height > vh - 8) y = vh - rect.height - 8;
  el.style.left = x+'px'; el.style.top = y+'px';
}
function showItemTooltip(it, ev){
  const el = ensureTooltip();
  el.innerHTML = itemTooltipHTML(it);
  el.style.display = 'block';
  positionTooltip(ev);
}
function hideTooltip(){
  if (!tipEl) return;
  tipEl.style.display = 'none';
}

// HUD (contador do objetivo) — cria se não existir
export function ensureObjectiveHUD(){
  let el = document.getElementById('objHUD');
  if (el) return el;
  const host = document.getElementById('gamewrap') || document.body;
  el = document.createElement('div');
  el.id = 'objHUD';
  el.style.position = 'absolute';
  el.style.top = '60px';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';
  el.style.padding = '4px 10px';
  el.style.borderRadius = '999px';
  el.style.border = '1px solid #1e2229';
  el.style.background = 'rgba(13,17,22,.85)';
  el.style.font = '700 12px ui-monospace, Menlo, Consolas, monospace';
  el.style.color = '#e9eef6';
  host.appendChild(el);
  return el;
}

export function updateObjectiveHUD(){
  const el = ensureObjectiveHUD();
  const o = state.objective;
  el.textContent = o.active ? `( ${o.kills} / ${o.total} )` : '';
}

export function ensureWallsButton(){
  let btn = document.getElementById('wallsBtn');
  if (btn) return btn;
  const host = document.getElementById('gamewrap') || document.body;
  btn = document.createElement('button');
  btn.id = 'wallsBtn';
  btn.className = 'btn';
  Object.assign(btn.style, {
    position:'absolute', top:'6px', right:'10px', zIndex:10,
    padding:'6px 10px', opacity:'0.9'
  });
  host.appendChild(btn);
  return btn;
}
export function updateWallsButton(){
  const btn = ensureWallsButton();
  btn.textContent = state.showWalls ? 'Esconder paredes' : 'Mostrar paredes';
}
export function wireWallsButton(){
  const btn = ensureWallsButton();
  btn.onclick = () => {
    state.showWalls = !state.showWalls;
    updateWallsButton();
    log(state.showWalls ? 'Paredes visíveis' : 'Paredes ocultas');
  };
  updateWallsButton();
}

export class Inventory{
  constructor(cols=8,rows=4){this.cols=cols;this.rows=rows;this.slots=Array(cols*rows).fill(null);this.el=document.getElementById('inv');this.render()}
  firstEmpty(){return this.slots.findIndex(x=>!x)}
  add(it){
    if(isUsable(it)){
      const idx=this.slots.findIndex(x=>canStack(x,it)&&(x.count??1)<MAX_STACK);
      if(idx>=0){const m=stackInto(this.slots[idx],it); if(m>0){this.render(); return true;}}
    }
    const i=this.firstEmpty(); if(i>=0){this.slots[i]=it; this.render(); return true}
    return false;
  }
  render(){
    this.el.innerHTML='';
    this.el.style.gridTemplateColumns=`repeat(${this.cols},1fr)`;
    this.slots.forEach((it,idx)=>{
      const s=document.createElement('div'); s.className='slot'; s.dataset.idx=idx;
      if(it){
        const d=document.createElement('div'); d.className='item';
        if(isUsable(it)){ d.classList.add('potion',it.potion); d.textContent=' '; }
        else { d.textContent=itemLabel(it); }
        d.draggable=true; d.title=isUsable(it)?potionHint(it):'';

        // tooltips
        d.addEventListener('mouseenter', e=>showItemTooltip(it, e));
        d.addEventListener('mousemove',  e=>positionTooltip(e));
        d.addEventListener('mouseleave', hideTooltip);
        d.addEventListener('dragstart',  hideTooltip);

        d.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',JSON.stringify({type:'inv',index:idx}))});
        s.appendChild(d);
        if(isUsable(it)){ const q=document.createElement('span'); q.className='qty'; q.textContent=String(it.count??1); s.appendChild(q); }
      }
      s.addEventListener('dragover',e=>e.preventDefault());
      s.addEventListener('drop',e=>{
        e.preventDefault();
        let payload; try{payload=JSON.parse(e.dataTransfer.getData('text/plain'))}catch{payload=null}
        if(!payload) return;
        if(payload.type==='inv'){
          const from=payload.index, src=this.slots[from], dst=this.slots[idx]; if(!src) return;
          if(dst&&canStack(dst,src)){
            const moved=stackInto(dst,src); if(moved>0){ if((src.count??1)<=0) this.slots[from]=null; this.render(); renderHotbar(); log(`Somou ${moved}x ${itemLabel(dst)} no slot ${idx}`); return; }
          }
          [this.slots[from],this.slots[idx]]=[this.slots[idx],this.slots[from]];
          this.render(); renderEquipment(); applyAllBonuses(); renderHotbar(); log(`Moveu item para slot ${idx}`);
        }else if(payload.type==='equip'){
          if(this.slots[idx]){ log('Slot de inventário ocupado.'); return; }
          const it=unequipFrom(payload.slot); if(it){ this.slots[idx]=it; this.render(); renderEquipment(); applyAllBonuses(); log(`Removeu ${it.name} do ${payload.slot} para o inventário`); }
        }else if(payload.type==='hb'){
          const hIdx=payload.index, src=state.hotbar[hIdx]; if(!src) return;
          const dst=this.slots[idx];
          if(!dst){ this.slots[idx]=src; state.hotbar[hIdx]=null; this.render(); renderHotbar(); log(`Moveu ${itemLabel(src)} da barra para o inventário`); return; }
          if(canStack(dst,src)){ const moved=stackInto(dst,src); if((src.count??1)<=0) state.hotbar[hIdx]=null; this.render(); renderHotbar(); log(`Somou ${moved}x ${itemLabel(dst)} da barra no slot ${idx}`); }
          else { log('Slot de inventário ocupado.'); }
        }
      });
      this.el.appendChild(s);
    });
  }
}

export const equip={head:null,chest:null,legs:null,main:null,off:null,acc:null,twoHand:false};
export function canEquip(item,slot){
  if(!item||!item.equip)return false;
  const k=item.kind;
  if(slot==='head')return k==='helm';
  if(slot==='chest')return k==='chest';
  if(slot==='legs')return k==='legs';
  if(slot==='acc')return k==='accessory';
  if(slot==='main')return(k==='weapon2h'||k==='weapon1h');
  if(slot==='off'){ if(equip.twoHand)return false; return(k==='shield'||k==='weapon1h'); }
  return false;
}
// --- Renderização dos slots de equipamento (UI) ---
export function renderEquipment() {
  const slots = ['main','off','head','chest','legs','acc'];

  for (const s of slots) {
    const el = document.getElementById('eq_' + s);
    if (!el) continue;

    // preserva o rótulo "Mão Principal", "Torso" etc.
    const labelText = (el.querySelector('.label')?.textContent) || el.dataset?.slot || s;
    el.innerHTML = `<span class="label">${labelText}</span>`;

    // trava visual da mão secundária quando arma 2M está equipada
    el.classList.toggle('lock', s === 'off' && equip.twoHand);

    const it = equip[s];
    if (it) {
      const d = document.createElement('div');

      // tooltips no item equipado
      d.addEventListener('mouseenter', e=>showItemTooltip(it, e));
      d.addEventListener('mousemove',  e=>positionTooltip(e));
      d.addEventListener('mouseleave', hideTooltip);
      d.addEventListener('dragstart',  hideTooltip);

      d.className = 'item';
      d.textContent = it.name;
      d.draggable = true;
      d.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'equip', slot: s }));
      });
      el.appendChild(d);
    }

    // DnD: aceitar item do inventário ou troca entre slots de equip
    el.addEventListener('dragover', e => e.preventDefault());
    el.addEventListener('drop', e => {
      e.preventDefault();
      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { payload = null; }
      if (!payload) return;

      if (payload.type === 'inv') {
        // mover do inventário para o slot
        equipFromInventory(payload.index, s);
      } else if (payload.type === 'equip') {
        // troca direta entre slots de equipamento
        const from = payload.slot;
        if (from === s) return;
        const a = equip[from], b = equip[s];
        if (!a) return;
        if (!canEquip(a, s)) { log('Esse item não cabe nesse slot.'); return; }
        if (b && !canEquip(b, from)) { log('Troca inválida.'); return; }
        equip[from] = b || null;
        equip[s] = a;
        renderEquipment();
        applyAllBonuses();
        log(`Trocou ${it?.name ?? 'item'} (${from}→${s})`);
      }
    });
  }
}


export function tryMoveToInventory(it){const i=state.inv.firstEmpty(); if(i<0)return false; state.inv.slots[i]=it; state.inv.render(); return true;}
export function unequipFrom(slot){ let it=null; if(slot==='main'){ it=equip.main; equip.main=null; if(equip.twoHand)equip.twoHand=false; } else { it=equip[slot]; equip[slot]=null; } renderEquipment(); applyAllBonuses(); return it; }
export function equipFromInventory(index,slot){
  const it=state.inv.slots[index]; if(!it)return false;
  if(!canEquip(it,slot)){ log('Item não é compatível com esse slot.'); return false; }
  if(slot==='main'){ if(it.kind==='weapon2h'){ if(equip.off){ if(!tryMoveToInventory(equip.off)){ log('Inventário cheio para mover item da mão secundária.'); return false;} equip.off=null;} equip.twoHand=true;
  } else { if(equip.twoHand){ if(equip.main && !tryMoveToInventory(equip.main)){ log('Inventário cheio para remover arma 2M.'); return false;} equip.main=null; equip.twoHand=false; } } }
  else if(slot==='off'){ if(equip.twoHand){ log('Arma de 2 mãos equipada — mão secundária bloqueada.'); return false;} if(!(it.kind==='shield'||it.kind==='weapon1h')){ log('A mão secundária aceita escudo ou arma 1M.'); return false;} }
  const prev=equip[slot]; equip[slot]=it; state.inv.slots[index]=prev||null; state.inv.render(); renderEquipment(); applyAllBonuses(); log(`Equipou ${it.name} em ${slot}${prev?` (trocou com ${prev.name})`:''}`); return true;
}
function sumBonuses(a,b){return {str:(a.str||0)+(b.str||0),dex:(a.dex||0)+(b.dex||0),mag:(a.mag||0)+(b.mag||0),vit:(a.vit||0)+(b.vit||0),hp:(a.hp||0)+(b.hp||0)}}
function zeroBonus(){return {str:0,dex:0,mag:0,vit:0,hp:0}}
export function getEquipBonuses(){let acc=zeroBonus();for(const k of ['head','chest','legs','main','off','acc']){const it=equip[k];if(it&&it.bonus)acc=sumBonuses(acc,it.bonus)}return acc}
export function getBuffBonuses(){let b=zeroBonus();for(const bf of state.buffs){if(bf.type==='str')b.str+=Math.round(bf.amount)}return b}
export function getTotalBonuses(){return sumBonuses(getEquipBonuses(),getBuffBonuses())}
export function setStatText(id,base,bonus){document.getElementById(id).textContent=String(base);document.getElementById(id+'B').textContent=bonus?`( +${bonus} )`:''}
export function applyAllBonuses(){const b=getTotalBonuses();state.player.maxHp=state.player.baseMaxHp+(b.hp||0)+(b.vit||0)*5; if(state.player.hp>state.player.maxHp)state.player.hp=state.player.maxHp; setStatText('str',state.player.stats.str,(b.str||0)); setStatText('dex',state.player.stats.dex,(b.dex||0)); setStatText('mag',state.player.stats.mag,(b.mag||0)); setStatText('vit',state.player.stats.vit,(b.vit||0))}
export const hotbarEl=document.getElementById('hotbar');

export function renderHotbar(){
  hotbarEl.innerHTML = '';

  for (let i = 0; i < 9; i++){
    const s = document.createElement('div');
    s.className = 'hb-slot';
    s.dataset.idx = i;

    const k = document.createElement('div');
    k.className = 'key';
    k.textContent = String(i + 1);
    s.appendChild(k);

    const it = state.hotbar[i];
    if (it){
      const d = document.createElement('div');
      d.className = 'hb-item ' + (it.potion || '');
      d.draggable = true;
      d.textContent = ' ';

      // tooltips
      d.addEventListener('mouseenter', e => showItemTooltip(it, e));
      d.addEventListener('mousemove',  e => positionTooltip(e));
      d.addEventListener('mouseleave', hideTooltip);

      // DnD
      d.addEventListener('dragstart', e => {
        hideTooltip();
        e.dataTransfer.setData('text/plain', JSON.stringify({ type:'hb', index:i }));
      });

      s.appendChild(d);

      // quantidade (stack)
      const q = document.createElement('span');
      q.className = 'qty';
      q.textContent = String(it.count ?? 1);
      s.appendChild(q);
    }

    // aceitar drops
    s.addEventListener('dragover', e => e.preventDefault());
    s.addEventListener('drop', e => {
      e.preventDefault();
      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); }
      catch { payload = null; }
      if (!payload) return;

      // do inventário → hotbar
      if (payload.type === 'inv'){
        const idx = payload.index;
        const src = state.inv.slots[idx];
        if (!src) return;

        if (src.kind !== 'potion'){ log('A hotbar aceita apenas poções.'); return; }

        if (!state.hotbar[i]){
          state.hotbar[i] = src;
          state.inv.slots[idx] = null;
          state.inv.render(); renderHotbar();
          return;
        }

        // empilhar
        if (canStack(state.hotbar[i], src)){
          const moved = stackInto(state.hotbar[i], src);
          if ((src.count ?? 1) <= 0) state.inv.slots[idx] = null;
          state.inv.render(); renderHotbar();
          return;
        }

        // trocar
        [state.hotbar[i], state.inv.slots[idx]] = [src, state.hotbar[i]];
        state.inv.render(); renderHotbar();
        return;
      }

      // hotbar ↔ hotbar
      if (payload.type === 'hb'){
        const from = payload.index;
        if (from === i) return;

        const A = state.hotbar[from];
        const B = state.hotbar[i];

        if (A && B && canStack(B, A)){
          const moved = stackInto(B, A);
          if ((A.count ?? 1) <= 0) state.hotbar[from] = null;
          renderHotbar();
          return;
        }

        [state.hotbar[from], state.hotbar[i]] = [state.hotbar[i], state.hotbar[from]];
        renderHotbar();
        return;
      }

      // equip → hotbar (não permitido)
      if (payload.type === 'equip'){
        log('A hotbar aceita apenas poções.');
        return;
      }
    });

    // clique usa o slot
    s.addEventListener('click', () => useHotbar(i));

    hotbarEl.appendChild(s);
  }
}


export function useUsable(it){ if(!it||it.kind!=='potion')return false; const p=state.player; if(it.potion==='hp'){const v=Math.round(p.maxHp*0.15); p.hp=Math.min(p.maxHp,p.hp+v); log('Bebeu Poção de Vida (+15%)'); return true;} if(it.potion==='mana'){const v=Math.round(p.maxMana*0.15); p.mana=Math.min(p.maxMana,p.mana+v); log('Bebeu Poção de Mana (+15%)'); return true;} if(it.potion==='str'){state.buffs.push({type:'str',amount:5,t:10}); applyAllBonuses(); log('Poção de Força: +5 STR por 10s'); return true;} if(it.potion==='spd'){state.buffs.push({type:'spd',amount:0.05,t:10}); log('Poção de Velocidade: +5% por 10s'); return true;} return false; }
export function useHotbar(i){ const it=state.hotbar[i]; if(!it)return; if(useUsable(it)){ it.count=(it.count??1)-1; if(it.count<=0) state.hotbar[i]=null; renderHotbar(); } }
