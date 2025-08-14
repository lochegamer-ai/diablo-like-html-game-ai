import {state} from './state.js';
import {MAX_STACK} from './config.js';
import {canStack,stackInto,isUsable,itemLabel,potionHint} from './items.js';

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
export function renderHotbar(){ hotbarEl.innerHTML=''; for(let i=0;i<9;i++){ const s=document.createElement('div'); s.className='hb-slot'; s.dataset.idx=i; const k=document.createElement('div'); k.className='key'; k.textContent=String(i+1); s.appendChild(k); const it=state.hotbar[i]; if(it){ const d=document.createElement('div'); d.className='hb-item '+(it.potion||''); d.draggable=true; d.textContent=' '; d.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',JSON.stringify({type:'hb',index:i}))}); s.appendChild(d); const q=document.createElement('span'); q.className='qty'; q.textContent=String(it.count??1); s.appendChild(q);} s.addEventListener('dragover',e=>e.preventDefault()); s.addEventListener('drop',e=>{ e.preventDefault(); let payload; try{payload=JSON.parse(e.dataTransfer.getData('text/plain'))}catch{payload=null} if(!payload) return; if(payload.type==='inv'){ const idx=payload.index, src=state.inv.slots[idx]; if(!src || src.kind!=='potion'){log('A hotbar aceita apenas poções.'); return;} if(!state.hotbar[i]){ state.hotbar[i]=src; state.inv.slots[idx]=null; state.inv.render(); renderHotbar(); return; } if(canStack(state.hotbar[i],src)){ const moved=stackInto(state.hotbar[i],src); if((src.count??1)<=0) state.inv.slots[idx]=null; state.inv.render(); renderHotbar(); } else { [state.hotbar[i],state.inv.slots[idx]]=[src,state.hotbar[i]]; state.inv.render(); renderHotbar(); } } else if(payload.type==='hb'){ const from=payload.index; if(from===i) return; if(state.hotbar[from]&&state.hotbar[i]&&canStack(state.hotbar[i],state.hotbar[from])){ const moved=stackInto(state.hotbar[i],state.hotbar[from]); if((state.hotbar[from].count??1)<=0) state.hotbar[from]=null; } else { [state.hotbar[from],state.hotbar[i]]=[state.hotbar[i],state.hotbar[from]]; } renderHotbar(); }}); s.addEventListener('click',()=>useHotbar(i)); hotbarEl.appendChild(s);} }
export function useUsable(it){ if(!it||it.kind!=='potion')return false; const p=state.player; if(it.potion==='hp'){const v=Math.round(p.maxHp*0.15); p.hp=Math.min(p.maxHp,p.hp+v); log('Bebeu Poção de Vida (+15%)'); return true;} if(it.potion==='mana'){const v=Math.round(p.maxMana*0.15); p.mana=Math.min(p.maxMana,p.mana+v); log('Bebeu Poção de Mana (+15%)'); return true;} if(it.potion==='str'){state.buffs.push({type:'str',amount:5,t:10}); applyAllBonuses(); log('Poção de Força: +5 STR por 10s'); return true;} if(it.potion==='spd'){state.buffs.push({type:'spd',amount:0.05,t:10}); log('Poção de Velocidade: +5% por 10s'); return true;} return false; }
export function useHotbar(i){ const it=state.hotbar[i]; if(!it)return; if(useUsable(it)){ it.count=(it.count??1)-1; if(it.count<=0) state.hotbar[i]=null; renderHotbar(); } }
