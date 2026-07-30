/**
 * PanelVis — Premium Floating Panel
 * app.js — All interactivity (vanilla JS, no frameworks)
 *
 * Features:
 *  • Drag-to-free + corner snap with spring easing
 *  • Water-drop bubble morph (panel ↔ bubble) with ripple
 *  • Resize handles (E/S/SE) direction-aware per corner
 *  • macOS-style window buttons (corner cycle, bubble toggle)
 *  • Corner badge, snap-preview glow
 *  • Toggle switches, segmented control, points list
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */
const SNAP_GAP     = 16;         // px from viewport edge
const SNAP_ZONE    = 0.35;       // outer 35% triggers snap-preview
const DRAG_THRESH  = 6;          // px — below this is a click, not drag
const MORPH_DUR    = 440;        // ms — bubble ↔ panel morph
const CORNERS      = ['TR','TL','BL','BR'];

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
const state = {
  corner:    'TR',      // current corner: TR | TL | BL | BR
  isBubble:  false,     // panel collapsed to bubble?
  panelW:    310,       // current panel width  (px)
  panelH:    null,      // current panel height (px, null = auto)
  morphing:  false,     // mid-animation guard
};

/* ══════════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════════ */
const panel         = document.getElementById('panel');
const dragHandle    = document.getElementById('drag-handle');
const panelBody     = document.getElementById('panel-body');
const bubble        = document.getElementById('bubble');
const cornerBadge   = document.getElementById('corner-badge');
const btnCornerCycle = document.getElementById('btn-corner-cycle');
const btnBubble     = document.getElementById('btn-bubble');
const resizeE       = document.getElementById('resize-e');
const resizeS       = document.getElementById('resize-s');
const resizeSE      = document.getElementById('resize-se');
const pointsList    = document.getElementById('points-list');
const addInput      = document.getElementById('add-input');
const btnAdd        = document.getElementById('btn-add');

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

/** Force a reflow (layout flush) so CSS transitions see dimension changes */
function forceReflow(el) {
  void el.offsetHeight;
}

/** Get current panel bounding rect */
function panelRect() {
  return panel.getBoundingClientRect();
}

/** Return viewport dimensions */
function vp() {
  return { w: window.innerWidth, h: window.innerHeight };
}

/**
 * Apply a corner-based position to the panel.
 * Converts free (left,top) OR uses SNAP_GAP for known corners.
 * @param {string} corner  - 'TR'|'TL'|'BL'|'BR'
 * @param {number} [left]  - explicit left  (only for TR/TL during drag)
 * @param {number} [top]   - explicit top   (only for TR/TL during drag)
 */
function snapToCorner(corner, left, top) {
  const { w, h } = vp();
  const pr = panelRect();
  const pw = pr.width;
  const ph = pr.height;

  // Remove all position props first
  panel.style.left   = '';
  panel.style.right  = '';
  panel.style.top    = '';
  panel.style.bottom = '';

  switch (corner) {
    case 'TR':
      panel.style.right = SNAP_GAP + 'px';
      panel.style.top   = SNAP_GAP + 'px';
      break;
    case 'TL':
      panel.style.left = SNAP_GAP + 'px';
      panel.style.top  = SNAP_GAP + 'px';
      break;
    case 'BL':
      panel.style.left   = SNAP_GAP + 'px';
      panel.style.bottom = SNAP_GAP + 'px';
      break;
    case 'BR':
      panel.style.right  = SNAP_GAP + 'px';
      panel.style.bottom = SNAP_GAP + 'px';
      break;
  }

  state.corner = corner;
  panel.dataset.corner = corner;
  updateCornerBadge();
  updateBubbleCorner();
  updateResizeCursors();
}

/** Update the corner badge text + accent state */
function updateCornerBadge() {
  cornerBadge.textContent = state.corner;
  cornerBadge.classList.toggle('active', true);
  // Briefly pulse then settle
  cornerBadge.style.transition = 'transform 200ms, color 200ms';
  cornerBadge.style.transform = 'scale(1.15)';
  setTimeout(() => { cornerBadge.style.transform = ''; }, 250);
}

/**
 * Snap bubble to same corner as panel (with SNAP_GAP)
 */
function updateBubbleCorner() {
  bubble.style.left   = '';
  bubble.style.right  = '';
  bubble.style.top    = '';
  bubble.style.bottom = '';

  switch (state.corner) {
    case 'TR': bubble.style.right = SNAP_GAP + 'px'; bubble.style.top    = SNAP_GAP + 'px'; break;
    case 'TL': bubble.style.left  = SNAP_GAP + 'px'; bubble.style.top    = SNAP_GAP + 'px'; break;
    case 'BL': bubble.style.left  = SNAP_GAP + 'px'; bubble.style.bottom = SNAP_GAP + 'px'; break;
    case 'BR': bubble.style.right = SNAP_GAP + 'px'; bubble.style.bottom = SNAP_GAP + 'px'; break;
  }
}

/** Update resize handle cursors based on corner */
function updateResizeCursors() {
  // CSS handles most via [data-corner] attribute selector
  // JS just ensures data-corner is set (done in snapToCorner)
}

/**
 * Detect which corner the panel center is closest to.
 * @returns {'TR'|'TL'|'BL'|'BR'}
 */
function detectCornerFromCenter() {
  const { w, h } = vp();
  const r = panelRect();
  const cx = r.left + r.width  / 2;
  const cy = r.top  + r.height / 2;
  const isLeft   = cx < w / 2;
  const isTop    = cy < h / 2;
  if ( isLeft &&  isTop) return 'TL';
  if (!isLeft &&  isTop) return 'TR';
  if ( isLeft && !isTop) return 'BL';
  return 'BR';
}

/**
 * Determine if panel center is in the "outer zone" → show snap-preview
 */
function isInSnapZone() {
  const { w, h } = vp();
  const r = panelRect();
  const cx = r.left + r.width  / 2;
  const cy = r.top  + r.height / 2;
  return (
    cx < w * SNAP_ZONE || cx > w * (1 - SNAP_ZONE) ||
    cy < h * SNAP_ZONE || cy > h * (1 - SNAP_ZONE)
  );
}

/* ══════════════════════════════════════════════════════════════
   PANEL DRAG
   ══════════════════════════════════════════════════════════════ */
(function initPanelDrag() {
  let dragging = false;
  let startX, startY, startL, startT;

  dragHandle.addEventListener('mousedown', onDragStart);

  function onDragStart(e) {
    if (e.button !== 0) return;
    if (state.isBubble || state.morphing) return;
    // Don't drag when clicking win-btns
    if (e.target.closest('.win-btns')) return;

    dragging = true;

    // Convert corner-relative to absolute left/top
    const r = panelRect();
    startL = r.left;
    startT = r.top;
    startX = e.clientX;
    startY = e.clientY;

    // Pin to left/top for free-dragging
    panel.style.transition = 'none';
    panel.style.left   = startL + 'px';
    panel.style.top    = startT + 'px';
    panel.style.right  = '';
    panel.style.bottom = '';

    panel.classList.add('dragging');
    document.body.style.cursor = 'grabbing';

    e.preventDefault();

    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup',   onDragEnd);
  }

  function onDragMove(e) {
    if (!dragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const { w, h } = vp();
    const pr = panelRect();

    // Clamp within viewport
    const newLeft = Math.max(0, Math.min(w - pr.width,  startL + dx));
    const newTop  = Math.max(0, Math.min(h - pr.height, startT + dy));

    panel.style.left = newLeft + 'px';
    panel.style.top  = newTop  + 'px';

    // Snap-preview glow
    panel.classList.toggle('snap-preview', isInSnapZone());
  }

  function onDragEnd(e) {
    if (!dragging) return;
    dragging = false;

    panel.classList.remove('dragging', 'snap-preview');
    document.body.style.cursor = '';

    // Re-enable transitions
    panel.style.transition = '';

    // Detect nearest corner and snap
    const corner = detectCornerFromCenter();
    snapToCorner(corner);

    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup',   onDragEnd);
  }
})();

/* ══════════════════════════════════════════════════════════════
   BUBBLE DRAG + CLICK
   ══════════════════════════════════════════════════════════════ */
(function initBubbleDrag() {
  let dragging  = false;
  let totalDist = 0;
  let startX, startY, startL, startT;

  bubble.addEventListener('mousedown', onBubbleDown);

  function onBubbleDown(e) {
    if (e.button !== 0) return;
    dragging  = false;
    totalDist = 0;

    // Resolve bubble position to absolute left/top
    const r = bubble.getBoundingClientRect();
    startL = r.left;
    startT = r.top;
    startX = e.clientX;
    startY = e.clientY;

    bubble.style.transition = 'none';
    bubble.style.left   = startL + 'px';
    bubble.style.top    = startT + 'px';
    bubble.style.right  = '';
    bubble.style.bottom = '';
    bubble.style.animationPlayState = 'paused';

    document.body.style.cursor = 'grabbing';
    e.preventDefault();

    window.addEventListener('mousemove', onBubbleMove);
    window.addEventListener('mouseup',   onBubbleUp);
  }

  function onBubbleMove(e) {
    totalDist += Math.abs(e.movementX) + Math.abs(e.movementY);

    if (totalDist >= DRAG_THRESH) {
      dragging = true;
    }

    if (!dragging) return;

    const { w, h } = vp();
    const br = bubble.getBoundingClientRect();

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newLeft = Math.max(0, Math.min(w - br.width,  startL + dx));
    const newTop  = Math.max(0, Math.min(h - br.height, startT + dy));

    bubble.style.left = newLeft + 'px';
    bubble.style.top  = newTop  + 'px';
  }

  function onBubbleUp(e) {
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', onBubbleMove);
    window.removeEventListener('mouseup',   onBubbleUp);

    bubble.style.animationPlayState = '';

    if (totalDist < DRAG_THRESH) {
      // It was a click — expand panel
      expandPanel();
    } else {
      // Snap bubble to nearest corner
      bubble.style.transition = '';
      const { w, h } = vp();
      const br = bubble.getBoundingClientRect();
      const cx = br.left + br.width  / 2;
      const cy = br.top  + br.height / 2;
      const isLeft = cx < w / 2;
      const isTop  = cy < h / 2;

      let corner;
      if ( isLeft &&  isTop) corner = 'TL';
      else if (!isLeft &&  isTop) corner = 'TR';
      else if ( isLeft && !isTop) corner = 'BL';
      else corner = 'BR';

      state.corner = corner;
      panel.dataset.corner = corner;
      updateCornerBadge();
      updateBubbleCorner();
      updateResizeCursors();
    }
  }
})();

/* ══════════════════════════════════════════════════════════════
   MORPH: PANEL ↔ BUBBLE
   ══════════════════════════════════════════════════════════════ */

/**
 * Collapse panel → water-drop bubble
 * Force-reflow trick: pin exact px → reflow → set bubble px → CSS transitions
 */
function collapsePanel() {
  if (state.morphing || state.isBubble) return;
  state.morphing = true;

  const pr  = panelRect();
  const pw  = pr.width;
  const ph  = pr.height;

  // ① Capture current corner position of panel in left/top
  const panelLeft = pr.left;
  const panelTop  = pr.top;

  // ② Pin dimensions explicitly (so transition starts from known values)
  panel.style.width   = pw + 'px';
  panel.style.height  = ph + 'px';
  panel.style.left    = panelLeft + 'px';
  panel.style.top     = panelTop  + 'px';
  panel.style.right   = '';
  panel.style.bottom  = '';
  panel.style.transition = 'none';

  // ③ Force reflow
  forceReflow(panel);

  // ④ Position bubble at same location (hidden still)
  updateBubbleCorner();

  // ⑤ Get where bubble will end up
  const br = bubble.getBoundingClientRect();

  // ⑥ Re-enable transitions + animate panel to bubble size
  panel.style.transition = '';

  requestAnimationFrame(() => {
    // Hide panel content quickly
    panelBody.style.opacity     = '0';
    panelBody.style.transition  = 'opacity 150ms ease';
    dragHandle.style.opacity    = '0';
    dragHandle.style.transition = 'opacity 150ms ease';

    // Shrink panel to bubble size at bubble's position
    panel.style.width        = '56px';
    panel.style.height       = '56px';
    panel.style.borderRadius = '50%';
    panel.style.left         = br.left + 'px';
    panel.style.top          = br.top  + 'px';
    panel.style.overflow     = 'hidden';
    panel.style.outline      = 'none';

    // Show bubble after slight delay
    setTimeout(() => {
      bubble.classList.add('is-active');
      bubble.style.transform = '';
    }, 80);

    // After morph completes
    setTimeout(() => {
      panel.classList.add('is-bubble');
      state.isBubble = true;
      state.morphing = false;

      // Reset panel body for next expand
      panelBody.style.opacity    = '';
      panelBody.style.transition = '';
      dragHandle.style.opacity   = '';
      dragHandle.style.transition = '';

      // Reset panel inline styles (CSS class handles hiding)
      panel.style.width        = '';
      panel.style.height       = '';
      panel.style.borderRadius = '';
      panel.style.left         = '';
      panel.style.top          = '';
      panel.style.overflow     = '';
      panel.style.outline      = '';

      snapToCorner(state.corner);
    }, MORPH_DUR + 40);
  });
}

/**
 * Expand bubble → panel
 * Ripple fires, then panel morphs from bubble size/position
 */
function expandPanel() {
  if (state.morphing || !state.isBubble) return;
  state.morphing = true;

  // ① Trigger ripple ring on bubble
  spawnRipple();

  const br = bubble.getBoundingClientRect();

  // ② Hide bubble (with scale-out)
  bubble.classList.remove('is-active');

  // ③ Prepare panel: remove is-bubble, pin at bubble's location + size
  panel.classList.remove('is-bubble');
  panel.style.width        = '56px';
  panel.style.height       = '56px';
  panel.style.borderRadius = '50%';
  panel.style.left         = br.left + 'px';
  panel.style.top          = br.top  + 'px';
  panel.style.right        = '';
  panel.style.bottom       = '';
  panel.style.transition   = 'none';
  panel.style.overflow     = 'hidden';
  panel.style.outline      = 'none';

  // Hide content during morph
  panelBody.style.opacity    = '0';
  dragHandle.style.opacity   = '0';

  // ④ Force reflow
  forceReflow(panel);

  // ⑤ Determine target panel dimensions
  const targetW = state.panelW || 310;
  const targetH = state.panelH ? state.panelH + 'px' : '';

  // ⑥ Re-enable transitions + expand
  panel.style.transition = '';

  requestAnimationFrame(() => {
    panel.style.width        = targetW + 'px';
    panel.style.height       = targetH || '';
    panel.style.borderRadius = '20px';
    panel.style.overflow     = '';
    panel.style.outline      = '';

    // Move to corner position
    snapToCorner(state.corner);

    // Fade content back in
    setTimeout(() => {
      panelBody.style.opacity    = '1';
      panelBody.style.transition = 'opacity 200ms ease';
      dragHandle.style.opacity   = '1';
      dragHandle.style.transition = 'opacity 200ms ease';
    }, MORPH_DUR * 0.5);

    // Cleanup
    setTimeout(() => {
      state.isBubble = false;
      state.morphing = false;
      panel.style.width  = '';
      panel.style.height = '';
      panelBody.style.opacity    = '';
      panelBody.style.transition = '';
      dragHandle.style.opacity   = '';
      dragHandle.style.transition = '';
    }, MORPH_DUR + 40);
  });
}

/** Spawn a ripple ring on the bubble element */
function spawnRipple() {
  const ring = document.createElement('span');
  ring.className = 'bubble-ripple';
  // Position relative to viewport
  const br = bubble.getBoundingClientRect();
  ring.style.position = 'fixed';
  ring.style.left = (br.left + br.width  / 2) + 'px';
  ring.style.top  = (br.top  + br.height / 2) + 'px';
  ring.style.transform = 'translate(-50%, -50%) scale(1)';
  ring.style.width  = '56px';
  ring.style.height = '56px';
  ring.style.borderRadius = '50%';
  ring.style.border = '1.5px solid rgba(59,158,255,0.7)';
  ring.style.pointerEvents = 'none';
  ring.style.zIndex = '9999';
  ring.style.animation = 'bubble-ripple-out 600ms ease-out forwards';
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), 650);
}

/* ══════════════════════════════════════════════════════════════
   WINDOW BUTTONS
   ══════════════════════════════════════════════════════════════ */

// Yellow button — collapse to bubble
btnBubble.addEventListener('click', (e) => {
  e.stopPropagation();
  collapsePanel();
});

// Blue button — cycle corner: TR → TL → BL → BR → TR
btnCornerCycle.addEventListener('click', (e) => {
  e.stopPropagation();
  if (state.morphing) return;
  const idx = CORNERS.indexOf(state.corner);
  const next = CORNERS[(idx + 1) % CORNERS.length];

  if (state.isBubble) {
    state.corner = next;
    panel.dataset.corner = next;
    updateCornerBadge();
    updateBubbleCorner();
  } else {
    snapToCorner(next);
  }
});

/* ══════════════════════════════════════════════════════════════
   RESIZE HANDLES
   ══════════════════════════════════════════════════════════════ */
(function initResize() {
  function startResize(e, mode) {
    if (e.button !== 0) return;
    if (state.isBubble || state.morphing) return;

    e.preventDefault();
    e.stopPropagation();

    const pr  = panelRect();
    const startX  = e.clientX;
    const startY  = e.clientY;
    const startW  = pr.width;
    const startH  = pr.height;
    const startL  = pr.left;
    const startT  = pr.top;
    const corner  = state.corner;

    // Pin panel to left/top during resize
    panel.style.transition = 'none';
    panel.style.left   = startL + 'px';
    panel.style.top    = startT + 'px';
    panel.style.right  = '';
    panel.style.bottom = '';
    panel.style.width  = startW + 'px';
    panel.style.height = startH + 'px';

    const activeHandle = e.currentTarget;
    activeHandle.classList.add('resizing');
    document.body.style.cursor = window.getComputedStyle(activeHandle).cursor;

    function onResizeMove(ev) {
      const { w: vw, h: vh } = vp();
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let newW = startW;
      let newH = startH;
      let newL = startL;
      let newT = startT;

      // Horizontal resize — direction depends on whether right-anchored
      if (mode === 'e' || mode === 'se') {
        if (corner === 'TR' || corner === 'BR') {
          // Right-anchored → drag left-edge → grows leftward
          newW = Math.max(240, startW - dx);
          newL = startL + (startW - newW);
        } else {
          // Left-anchored → drag right-edge → grows rightward
          newW = Math.max(240, startW + dx);
        }
      }

      // Vertical resize
      if (mode === 's' || mode === 'se') {
        if (corner === 'BL' || corner === 'BR') {
          // Bottom-anchored → drag top-edge → grows upward
          newH = Math.max(200, startH - dy);
          newT = startT + (startH - newH);
        } else {
          // Top-anchored → drag bottom-edge → grows downward
          newH = Math.max(200, startH + dy);
        }
      }

      // Clamp within viewport
      newW = Math.min(newW, vw - SNAP_GAP * 2);
      newH = Math.min(newH, vh - SNAP_GAP * 2);
      newL = Math.max(0, Math.min(newL, vw - newW));
      newT = Math.max(0, Math.min(newT, vh - newH));

      panel.style.width  = newW + 'px';
      panel.style.height = newH + 'px';
      panel.style.left   = newL + 'px';
      panel.style.top    = newT + 'px';

      state.panelW = newW;
      state.panelH = newH;
    }

    function onResizeEnd() {
      activeHandle.classList.remove('resizing');
      document.body.style.cursor = '';
      panel.style.transition = '';

      // Re-snap to corner (keeps new size, repositions to corner edge)
      const newCorner = detectCornerFromCenter();
      const pr2 = panelRect();
      state.panelW = pr2.width;
      state.panelH = pr2.height;
      snapToCorner(newCorner);

      window.removeEventListener('mousemove', onResizeMove);
      window.removeEventListener('mouseup',   onResizeEnd);
    }

    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup',   onResizeEnd);
  }

  resizeE.addEventListener('mousedown',  (e) => startResize(e, 'e'));
  resizeS.addEventListener('mousedown',  (e) => startResize(e, 's'));
  resizeSE.addEventListener('mousedown', (e) => startResize(e, 'se'));
})();

/* ══════════════════════════════════════════════════════════════
   TOGGLE SWITCHES
   ══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.toggle-sw').forEach(sw => {
  sw.addEventListener('click', () => {
    const isOn = sw.classList.toggle('on');
    sw.setAttribute('aria-checked', isOn ? 'true' : 'false');
  });
});

/* ══════════════════════════════════════════════════════════════
   SEGMENTED CONTROL (mode toggle)
   ══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ══════════════════════════════════════════════════════════════
   POINTS LIST
   ══════════════════════════════════════════════════════════════ */

/** Make a point item active (highlight) */
pointsList.addEventListener('click', (e) => {
  const item = e.target.closest('.point-item');
  if (!item) return;
  // Delete button
  if (e.target.closest('.point-delete')) {
    deletePointItem(item);
    return;
  }
  // Activate
  document.querySelectorAll('.point-item').forEach(i => i.classList.remove('active'));
  item.classList.add('active');
});

function deletePointItem(item) {
  item.style.transition = 'opacity 200ms, transform 200ms';
  item.style.opacity    = '0';
  item.style.transform  = 'translateX(8px) scale(0.97)';
  setTimeout(() => item.remove(), 220);
}

/** Add new point */
function addPoint() {
  const label = addInput.value.trim();
  if (!label) {
    addInput.focus();
    return;
  }

  const li = document.createElement('li');
  li.className = 'point-item';
  li.setAttribute('role', 'listitem');

  const randomCoord = `(${Math.round((Math.random()-0.5)*20)}, ${Math.round((Math.random()-0.5)*20)})`;

  li.innerHTML = `
    <div class="point-meta">
      <code class="point-coord">${randomCoord}</code>
      <em class="point-math">${escapeHTML(label)}</em>
    </div>
    <button class="point-delete" aria-label="Delete point" title="Delete">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M2 2l8 8M10 2l-8 8"/>
      </svg>
    </button>
  `;

  // Animate in
  li.style.opacity   = '0';
  li.style.transform = 'translateX(-6px)';
  pointsList.appendChild(li);
  forceReflow(li);
  li.style.transition = 'opacity 220ms ease, transform 220ms ease';
  li.style.opacity    = '1';
  li.style.transform  = 'translateX(0)';

  // Activate it
  document.querySelectorAll('.point-item').forEach(i => i.classList.remove('active'));
  li.classList.add('active');

  addInput.value = '';
  addInput.focus();
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

btnAdd.addEventListener('click', addPoint);
addInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addPoint();
});

/* ══════════════════════════════════════════════════════════════
   ACTION BUTTONS (demo feedback)
   ══════════════════════════════════════════════════════════════ */
function flashBtn(btn, text, ms = 1400) {
  const orig = btn.innerHTML;
  btn.innerHTML = text;
  btn.disabled  = true;
  btn.style.opacity = '0.7';
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.disabled  = false;
    btn.style.opacity = '';
  }, ms);
}

document.getElementById('btn-export').addEventListener('click', function() {
  flashBtn(this, '✓ Exported!');
});
document.getElementById('btn-import').addEventListener('click', function() {
  flashBtn(this, '✓ Imported!');
});
document.getElementById('btn-clear').addEventListener('click', function() {
  const items = document.querySelectorAll('.point-item');
  if (items.length === 0) return;
  items.forEach((item, i) => {
    setTimeout(() => deletePointItem(item), i * 60);
  });
});

/* ══════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
  // Escape — collapse to bubble
  if (e.key === 'Escape' && !state.isBubble) {
    collapsePanel();
  }
  // B — toggle bubble
  if (e.key === 'b' || e.key === 'B') {
    if (!e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement.tagName !== 'INPUT') {
      if (state.isBubble) expandPanel();
      else collapsePanel();
    }
  }
  // C — cycle corner
  if (e.key === 'c' || e.key === 'C') {
    if (!e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement.tagName !== 'INPUT') {
      btnCornerCycle.click();
    }
  }
});

/* ══════════════════════════════════════════════════════════════
   CANVAS CLICK (demo: add ripple dot)
   ══════════════════════════════════════════════════════════════ */
document.getElementById('canvas-area').addEventListener('click', (e) => {
  const dot = document.createElement('div');
  dot.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top:  ${e.clientY}px;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: rgba(59,158,255,0.6);
    transform: translate(-50%,-50%) scale(0);
    pointer-events: none;
    z-index: 999;
    box-shadow: 0 0 12px rgba(59,158,255,0.5);
    transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1), opacity 600ms ease;
  `;
  document.body.appendChild(dot);
  forceReflow(dot);
  dot.style.transform = 'translate(-50%,-50%) scale(1)';

  // Ripple ring
  const ring = document.createElement('div');
  ring.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top:  ${e.clientY}px;
    width: 8px; height: 8px;
    border-radius: 50%;
    border: 1px solid rgba(59,158,255,0.5);
    transform: translate(-50%,-50%) scale(1);
    pointer-events: none;
    z-index: 998;
    transition: transform 600ms ease-out, opacity 600ms ease-out, border-color 600ms;
  `;
  document.body.appendChild(ring);
  forceReflow(ring);
  ring.style.transform   = 'translate(-50%,-50%) scale(6)';
  ring.style.opacity     = '0';
  ring.style.borderColor = 'rgba(59,158,255,0)';

  setTimeout(() => {
    dot.style.opacity = '0';
    setTimeout(() => { dot.remove(); ring.remove(); }, 700);
  }, 600);
});

/* ══════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════ */
(function init() {
  // Set initial corner
  panel.dataset.corner = state.corner;
  updateCornerBadge();
  updateBubbleCorner();

  // Entrance animation for panel
  panel.style.opacity   = '0';
  panel.style.transform = 'translateY(-8px) scale(0.98)';
  panel.style.transition = 'opacity 500ms ease, transform 500ms var(--spring-morph)';
  setTimeout(() => {
    panel.style.opacity   = '1';
    panel.style.transform = '';
    setTimeout(() => {
      panel.style.opacity   = '';
      panel.style.transform = '';
      panel.style.transition = '';
    }, 600);
  }, 80);

  console.log(
    '%cPanelVis 🔵',
    'color:#3b9eff;font-weight:900;font-size:14px;',
    '\nShortcuts: [B] toggle bubble · [C] cycle corner · [Esc] collapse'
  );
})();
