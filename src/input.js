import {state} from './state.js';
import {screenToWorld} from './iso/coords.js';
import {castFireboltAtScreen, meleeAttack} from './systems.js';

const DRAG_THRESHOLD = 8;
let ctrlHeld = false; // <- rastreia Ctrl

export function attachInput(){
  const canvas = state.canvas;

  // ===== mouse move (pan em tempo real) =====
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = e.clientX - r.left;
    state.mouse.y = e.clientY - r.top;

    if (state.isDragging) {
      const dx = e.clientX - state.dragStart.x;
      const dy = e.clientY - state.dragStart.y;
      if (!state.didPan && Math.hypot(dx, dy) > DRAG_THRESHOLD) state.didPan = true;
      if (state.didPan) {
        state.origin.x = state.originStart.x + dx;
        state.origin.y = state.originStart.y + dy;
        clampOrigin();
      }
    }
  });

  // ===== bloqueia menu do RMB no canvas =====
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ===== mousedown =====
  canvas.addEventListener('mousedown', e => {
    // RMB = magia
  if (e.button === 2) {
    // Warrior: RMB é o Whirl (já tratado em main.js). Não solta fireball aqui.
    // Se quiser manter fireball só para MAGE no futuro:
    if (state.class === 'mage') {
      castFireboltAtScreen(e.clientX, e.clientY);
    }
    e.preventDefault();
    return;
  }

  // LMB: inicia pan SOMENTE se Ctrl estiver pressionado
  if (e.button === 0) {
    const wantPan = e.ctrlKey || ctrlHeld;
    state.panMode = wantPan;
    if (wantPan) {
      state.isDragging = true;
      state.didPan = false;
      state.dragStart = { x: e.clientX, y: e.clientY };
      state.originStart = { x: state.origin.x, y: state.origin.y };
    }
  }});

  // ===== mouseup =====
  canvas.addEventListener('mouseup', e => {
    if (e.button !== 0) return;
    const wasPan = state.panMode;
    state.isDragging = false;
    state.didPan = false;
    state.panMode = false;

    // se não era pan, o LMB executa melee (click-attack)
    if (!wasPan && !state.gameOver) meleeAttack();
  });

  // ===== mouse leave =====
  canvas.addEventListener('mouseleave', () => {
    state.isDragging = false;
    state.didPan = false;
    state.panMode = false;
  });

  // ===== teclado (movimento + hotbar + Ctrl tracker) =====
  document.addEventListener('keydown', e => {
    if (state.gameOver) return;
    if (e.key === 'Control') ctrlHeld = true; // <- marca Ctrl

    const k = e.key.toLowerCase();
    if (k === 'i') {                       // toggle nomes dos itens dropados
     state.showNames = !state.showNames;
     e.preventDefault();
    }
    if (['w','a','s','d'].includes(k)) { e.preventDefault(); state.keys[k] = true; }
    if (e.code && /^Digit[1-9]$/.test(e.code)) {
      import('./ui.js').then(m => m.useHotbar(+e.code.slice(5) - 1));
      e.preventDefault();
    }
    if (k === 'j') { e.preventDefault(); meleeAttack(); }
    if (k === 'r') { window.dispatchEvent(new CustomEvent('game-reset', { detail: 'Reinício manual' })); }
  });

  document.addEventListener('keyup', e => {
    if (e.key === 'Control') ctrlHeld = false; // <- desmarca Ctrl
    const k = e.key.toLowerCase();
    if (['w','a','s','d'].includes(k)) { e.preventDefault(); state.keys[k] = false; }
  });
}

// Limita a origem pra não sair do campo útil
export function clampOrigin(){
  const maxX = state.canvas.width * 0.75, maxY = state.canvas.height * 0.75;
  const minX = -4000, minY = -4000;
  state.origin.x = Math.max(minX, Math.min(maxX, state.origin.x));
  state.origin.y = Math.max(minY, Math.min(maxY, state.origin.y));
}
