// Turns the admin form's Floor and Shelf text boxes into dropdowns so only
// valid map locations can be saved (Floor 1: stores A-F, Floor 2: stores G-H).
import { SHELF_OPTIONS } from './floormap.js';

function toSelect(input, placeholder) {
  const sel = document.createElement('select');
  for (const a of ['id', 'name', 'class', 'required']) if (input.hasAttribute(a)) sel.setAttribute(a, input.getAttribute(a));
  sel.append(new Option(placeholder, ''));
  input.replaceWith(sel);
  return sel;
}

export function attachShelfPicker(floorEl, shelfEl) {
  if (!floorEl || !shelfEl) return null;
  const floorSel = toSelect(floorEl, 'Select floor');
  const shelfSel = toSelect(shelfEl, 'Select book store');
  [['1', 'Floor 1'], ['2', 'Floor 2']].forEach(([v, l]) => floorSel.append(new Option(l, v)));

  const fillShelves = (keep = '') => {
    const list = SHELF_OPTIONS[floorSel.value] || [];
    shelfSel.innerHTML = '';
    shelfSel.append(new Option('Select book store', ''));
    list.forEach(c => shelfSel.append(new Option(`Book store ${c}`, c)));
    shelfSel.value = list.includes(keep) ? keep : '';
  };
  floorSel.addEventListener('change', () => fillShelves(''));

  // Set both dropdowns from saved values (old values like "2nd Floor" or "C3" are understood).
  const set = (floor = '', shelf = '') => {
    const n = (parseInt(String(floor).replace(/\D/g, ''), 10) || '').toString();
    floorSel.value = ['1', '2'].includes(n) ? n : '';
    fillShelves(String(shelf).trim().toUpperCase().match(/^[A-H]/)?.[0] || '');
  };
  set();
  return { floorSel, shelfSel, set };
}
