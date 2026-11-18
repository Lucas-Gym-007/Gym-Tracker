'use strict';
/* =====================================================================
   Gym Tracker – Ernährung, Gewicht & Training mit Auto-Progression
   Alle Daten liegen lokal im Browser (localStorage). Backup über "Mehr".
   ===================================================================== */

/* ---------- Helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmt = (n, d = 0) => n == null || !Number.isFinite(+n) ? '–' : (+n).toLocaleString('de-DE', { maximumFractionDigits: d });
const sgn = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n), d);
const roundTo = (x, step) => +(Math.round(x / step) * step).toFixed(2);
const fmtDate = (s, o = { day: '2-digit', month: '2-digit' }) => parseYmd(s).toLocaleDateString('de-DE', o);
const weekStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const mmss = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + pad(m) : m) + ':' + pad(s % 60); };
const e1rm = (w, r) => (!r ? 0 : r === 1 ? w : w * (1 + r / 30));
const setScore = s => e1rm(s.w || 0, s.r) + (s.w ? 0 : s.r * 0.001);

const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const DAY_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const MEALS = { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snacks' };
const MUSCLES = ['Brust', 'Rücken', 'Schultern', 'Beine', 'Arme', 'Bauch', 'Ganzkörper'];
const ACTIVITY = [[1.2, 'Kaum aktiv (Bürojob, kein Sport)'], [1.375, 'Leicht aktiv (1–2× Sport)'], [1.55, 'Aktiv (3–4× Sport)'], [1.725, 'Sehr aktiv (5–6× Sport)'], [1.9, 'Extrem aktiv (körperl. Arbeit + Sport)']];
const GOALS = { cut: 'Abnehmen (Defizit)', maintain: 'Gewicht halten', bulk: 'Muskelaufbau (Überschuss)' };

/* Nährwerte pro 100 g (Richtwerte) + typische Portion */
const FOOD_DB = [
  ['Haferflocken', 372, 13.5, 58.7, 7, '1 Portion', 50], ['Reis (gekocht)', 130, 2.7, 28, 0.3, '1 Portion', 150],
  ['Reis (roh)', 350, 7, 78, 0.6, '1 Portion', 75], ['Nudeln (gekocht)', 158, 5.8, 31, 0.9, '1 Teller', 200],
  ['Nudeln (roh)', 359, 12.5, 71, 1.5, '1 Portion', 100], ['Kartoffeln (gekocht)', 77, 2, 17, 0.1, '1 Portion', 200],
  ['Süßkartoffel (gekocht)', 86, 1.6, 20, 0.1, '1 Portion', 200], ['Hähnchenbrust (roh)', 110, 23, 0, 1.5, '1 Filet', 150],
  ['Putenbrust (roh)', 107, 24, 0, 1, '1 Filet', 150], ['Rinderhack (roh)', 254, 17.2, 0, 20, '1 Packung', 400],
  ['Rinderhack mager 5% (roh)', 137, 21, 0, 5, '1 Portion', 125], ['Lachs (roh)', 208, 20, 0, 13, '1 Filet', 125],
  ['Thunfisch (Dose, Wasser)', 116, 26, 0, 1, '1 Dose', 150], ['Ei', 155, 13, 1.1, 11, '1 Ei (M)', 60],
  ['Eiklar', 52, 11, 0.7, 0.2, '1 Eiklar', 33], ['Magerquark', 67, 12, 4, 0.2, '1 Becher', 250],
  ['Skyr', 63, 11, 4, 0.2, '1 Becher', 150], ['Griechischer Joghurt 10%', 133, 5, 4, 10, '1 Portion', 150],
  ['Hüttenkäse', 98, 11, 3.4, 4.3, '1 Becher', 200], ['Milch 1,5%', 47, 3.4, 4.9, 1.5, '1 Glas', 250],
  ['Whey Protein', 380, 78, 6, 5, '1 Scoop', 30], ['Vollkornbrot', 220, 8, 41, 1.5, '1 Scheibe', 50],
  ['Toastbrot', 265, 8, 49, 3.5, '1 Scheibe', 25], ['Brötchen', 270, 9, 53, 2, '1 Brötchen', 60],
  ['Reiswaffeln', 387, 8, 81, 3, '1 Stück', 8], ['Banane', 89, 1.1, 23, 0.3, '1 Banane', 120],
  ['Apfel', 52, 0.3, 14, 0.2, '1 Apfel', 150], ['Beeren (TK)', 45, 1, 9, 0.4, '1 Portion', 100],
  ['Brokkoli', 34, 2.8, 7, 0.4, '1 Portion', 150], ['Gemüsemix (TK)', 40, 2, 6, 0.4, '1 Portion', 200],
  ['Avocado', 160, 2, 9, 15, '½ Avocado', 70], ['Linsen (gekocht)', 116, 9, 20, 0.4, '1 Portion', 150],
  ['Kidneybohnen (Dose)', 104, 7, 16, 0.6, '1 Dose', 250], ['Tofu natur', 120, 12, 2, 7, '1 Portion', 100],
  ['Erdnussbutter', 588, 25, 20, 50, '1 EL', 15], ['Mandeln', 579, 21, 22, 50, '1 Handvoll', 30],
  ['Olivenöl', 884, 0, 0, 100, '1 EL', 10], ['Butter', 741, 0.7, 0.6, 83, '1 Portion', 10],
  ['Gouda', 356, 25, 0, 27, '1 Scheibe', 25], ['Mozzarella light', 160, 19, 1, 9, '1 Kugel', 125],
  ['Pizza (TK)', 250, 10, 30, 10, '1 Pizza', 350], ['Döner Kebab', 215, 11, 20, 10, '1 Döner', 400],
  ['Vollmilchschokolade', 535, 7.7, 59, 30, '1 Riegel', 25], ['Chips', 536, 6, 53, 33, '1 Handvoll', 30],
  ['Cola', 42, 0, 10.6, 0, '1 Dose (330 ml)', 330], ['Orangensaft', 45, 0.7, 10, 0.2, '1 Glas', 250],
  ['Bier', 43, 0.5, 3.6, 0, '1 Flasche (0,5 l)', 500], ['Proteinriegel', 360, 33, 35, 12, '1 Riegel', 55],
  // Kohlenhydrate & Brot
  ['Vollkornnudeln (roh)', 350, 13, 64, 2.5, '1 Portion', 100], ['Basmatireis (roh)', 355, 8, 78, 1, '1 Portion', 75],
  ['Couscous (roh)', 360, 12, 72, 1.5, '1 Portion', 70], ['Quinoa (roh)', 368, 14, 64, 6, '1 Portion', 70],
  ['Wrap (Weizen)', 300, 8, 50, 7, '1 Wrap', 60], ['Knäckebrot', 360, 10, 66, 2.5, '1 Scheibe', 10],
  ['Müsli (ungesüßt)', 365, 10, 60, 7, '1 Schale', 60], ['Cornflakes', 378, 7, 84, 0.9, '1 Schale', 40],
  ['Brezel', 276, 8, 56, 1.8, '1 Brezel', 80], ['Croissant', 406, 8, 46, 21, '1 Croissant', 60],
  // Fleisch, Fisch, Aufschnitt
  ['Hähnchenschenkel ohne Haut (roh)', 119, 19.7, 0, 4.3, '1 Portion', 150], ['Schweinefilet (roh)', 105, 22, 0, 2, '1 Portion', 150],
  ['Rindersteak Hüfte (roh)', 130, 22, 0, 4.5, '1 Steak', 200], ['Garnelen (roh)', 85, 19, 0, 1, '1 Portion', 150],
  ['Seelachs (roh)', 80, 18, 0, 0.9, '1 Filet', 150], ['Kochschinken', 110, 20, 1, 3, '1 Scheibe', 20],
  ['Putenaufschnitt', 105, 21, 1, 2, '1 Scheibe', 15], ['Salami', 420, 21, 1, 37, '1 Scheibe', 10],
  // Milchprodukte
  ['Feta', 264, 14, 4, 21, '1 Portion', 50], ['Harzer Käse', 120, 27, 0, 0.7, '1 Portion', 50],
  ['Frischkäse', 235, 5.4, 4, 21.5, '1 EL', 20], ['Proteinpudding', 78, 10, 6.6, 1.3, '1 Becher', 200],
  ['Naturjoghurt 3,5%', 64, 3.5, 4.7, 3.5, '1 Portion', 150], ['Haferdrink', 42, 1, 6.5, 1.5, '1 Glas', 250],
  ['Sojadrink', 39, 3.3, 2.5, 1.8, '1 Glas', 250],
  // Gemüse & Hülsenfrüchte
  ['Mais (Dose)', 85, 2.9, 15, 1.2, '1 kleine Dose', 140], ['Kichererbsen (Dose)', 119, 7, 15, 2.5, '1 Dose', 240],
  ['Paprika', 30, 1, 6, 0.3, '1 Paprika', 150], ['Tomate', 18, 0.9, 3, 0.2, '1 Tomate', 100],
  ['Gurke', 15, 0.6, 2.2, 0.1, '½ Gurke', 200], ['Karotte', 41, 0.9, 9.6, 0.2, '1 Karotte', 80],
  ['Spinat', 23, 2.9, 3.6, 0.4, '1 Portion', 100], ['Blattsalat', 15, 1.3, 2, 0.2, '1 Schale', 80],
  ['Champignons', 22, 3, 3, 0.3, '1 Portion', 100], ['Zucchini', 17, 1.2, 3, 0.3, '1 Zucchini', 200],
  // Obst, Nüsse, Süßes
  ['Orange', 47, 0.9, 12, 0.1, '1 Orange', 150], ['Weintrauben', 69, 0.7, 18, 0.2, '1 Handvoll', 100],
  ['Erdbeeren', 32, 0.7, 7.7, 0.3, '1 Schale', 150], ['Mango', 60, 0.8, 15, 0.4, '½ Mango', 150],
  ['Kiwi', 61, 1.1, 15, 0.5, '1 Kiwi', 75], ['Datteln', 282, 2.5, 75, 0.4, '3 Stück', 25],
  ['Walnüsse', 654, 15, 14, 65, '1 Handvoll', 30], ['Cashews', 553, 18, 30, 44, '1 Handvoll', 30],
  ['Honig', 304, 0.3, 82, 0, '1 TL', 10], ['Marmelade', 250, 0.4, 60, 0.1, '1 EL', 20],
  ['Nuss-Nougat-Creme', 539, 6.3, 57, 31, '1 Portion', 15], ['Gummibärchen', 343, 6.9, 77, 0.1, '1 Handvoll', 30],
  ['Vanilleeis', 207, 3.5, 24, 11, '1 Kugel', 50],
  // Gerichte & Fast Food
  ['Pommes', 312, 3.4, 41, 15, '1 Portion', 150], ['Burger', 257, 13, 22, 13, '1 Burger', 220],
  ['Currywurst mit Soße', 220, 9, 9, 16, '1 Portion', 250], ['Lasagne', 132, 7, 12, 6, '1 Portion', 350],
  ['Spaghetti Bolognese', 130, 6.5, 16, 4.5, '1 Teller', 400], ['Sushi (Maki)', 145, 4, 28, 1.5, '8 Stück', 200],
  // Getränke
  ['Energy Drink', 46, 0, 11, 0, '1 Dose', 250], ['Rotwein', 85, 0.1, 2.6, 0, '1 Glas', 200],
  ['Apfelschorle', 24, 0, 5.5, 0, '1 Flasche (0,5 l)', 500], ['Cappuccino', 40, 2.5, 3.5, 1.6, '1 Tasse', 200],
].map(([name, kcal, p, c, f, pl, pg]) => ({ name, kcal, p, c, f, portion: { l: pl, g: pg } }));

/* Übungen: Wdh-Bereich (Double Progression), Steigerung in kg, Ziel-Sätze, Pause in s */
const DEFAULT_EXERCISES = [
  ['bench', 'Bankdrücken', 'Brust', 6, 10, 2.5, 3, 150, true, 40],
  ['incline_db', 'Schrägbankdrücken (KH)', 'Brust', 8, 12, 2, 3, 120, false, 16],
  ['dips', 'Dips', 'Brust', 6, 12, 2.5, 3, 120, false, 0],
  ['squat', 'Kniebeugen', 'Beine', 5, 8, 2.5, 3, 180, true, 40],
  ['deadlift', 'Kreuzheben', 'Rücken', 3, 6, 5, 3, 180, true, 60],
  ['rdl', 'Rumänisches Kreuzheben', 'Beine', 8, 12, 2.5, 3, 120, true, 40],
  ['ohp', 'Schulterdrücken (LH)', 'Schultern', 6, 10, 2.5, 3, 120, true, 25],
  ['row', 'Langhantelrudern', 'Rücken', 6, 10, 2.5, 3, 120, true, 40],
  ['pullup', 'Klimmzüge', 'Rücken', 5, 10, 2.5, 3, 120, false, 0],
  ['latpull', 'Latzug', 'Rücken', 8, 12, 5, 3, 90, false, 40],
  ['cablerow', 'Kabelrudern', 'Rücken', 10, 12, 5, 3, 90, false, 40],
  ['legpress', 'Beinpresse', 'Beine', 10, 15, 10, 3, 120, false, 80],
  ['legcurl', 'Beinbeuger', 'Beine', 10, 15, 5, 3, 90, false, 30],
  ['legext', 'Beinstrecker', 'Beine', 10, 15, 5, 3, 90, false, 30],
  ['hipthrust', 'Hip Thrust', 'Beine', 8, 12, 5, 3, 120, true, 40],
  ['calf', 'Wadenheben', 'Beine', 12, 20, 5, 3, 60, false, 40],
  ['lateral', 'Seitheben', 'Schultern', 12, 20, 1, 3, 60, false, 6],
  ['facepull', 'Face Pulls', 'Schultern', 12, 20, 2.5, 3, 60, false, 15],
  ['curl', 'Bizepscurls (KH)', 'Arme', 8, 12, 1, 3, 75, false, 10],
  ['pushdown', 'Trizepsdrücken (Kabel)', 'Arme', 10, 15, 2.5, 3, 75, false, 20],
  ['crunch', 'Kabel-Crunches', 'Bauch', 10, 15, 5, 3, 60, false, 25],
  ['hanging_leg', 'Beinheben hängend', 'Bauch', 8, 15, 2.5, 3, 60, false, 0],
  ['db_press', 'Bankdrücken (KH)', 'Brust', 8, 12, 2, 3, 120, false, 20],
  ['pushup', 'Liegestütze', 'Brust', 10, 20, 2.5, 3, 60, false, 0],
  ['db_row', 'Kurzhantelrudern', 'Rücken', 8, 12, 2, 3, 90, false, 20],
  ['db_shoulder', 'Schulterdrücken (KH)', 'Schultern', 8, 12, 2, 3, 90, false, 12],
  ['goblet', 'Goblet Squat', 'Beine', 8, 12, 2, 3, 90, false, 16],
  ['lunge', 'Ausfallschritte (KH)', 'Beine', 8, 12, 2, 3, 90, false, 10],
  ['hammer', 'Hammercurls', 'Arme', 8, 12, 1, 3, 60, false, 10],
  ['frenchpress', 'French Press (SZ)', 'Arme', 8, 12, 2.5, 3, 75, false, 20],
].map(([id, name, muscle, repMin, repMax, inc, sets, rest, barbell, start]) => ({ id, name, muscle, repMin, repMax, inc, sets, rest, barbell, start }));

const DEFAULT_ROUTINES = [
  { id: 'push', group: 'ppl', name: 'Push (Brust, Schultern, Trizeps)', exIds: ['bench', 'ohp', 'incline_db', 'lateral', 'pushdown'] },
  { id: 'pull', group: 'ppl', name: 'Pull (Rücken, Bizeps)', exIds: ['deadlift', 'pullup', 'row', 'facepull', 'curl'] },
  { id: 'legs', group: 'ppl', name: 'Beine', exIds: ['squat', 'rdl', 'legpress', 'legcurl', 'calf'] },
  { id: 'upper', group: 'ul', name: 'Oberkörper', exIds: ['bench', 'row', 'ohp', 'latpull', 'curl', 'pushdown'] },
  { id: 'lower', group: 'ul', name: 'Unterkörper', exIds: ['squat', 'rdl', 'legpress', 'legcurl', 'calf', 'hanging_leg'] },
  { id: 'fb_a', group: 'fb', name: 'Ganzkörper A', exIds: ['squat', 'bench', 'row', 'lateral', 'pushdown'] },
  { id: 'fb_b', group: 'fb', name: 'Ganzkörper B', exIds: ['deadlift', 'ohp', 'latpull', 'lunge', 'curl'] },
  { id: 'home', group: 'home', name: 'Ganzkörper Zuhause (KH)', exIds: ['goblet', 'db_press', 'db_row', 'db_shoulder', 'lunge', 'pushup', 'hammer'] },
];
const ROUTINE_GROUPS = {
  ppl: 'Push / Pull / Beine · 3–6× pro Woche', ul: 'Oberkörper / Unterkörper · 4× pro Woche',
  fb: 'Ganzkörper · 2–3× pro Woche', home: 'Zuhause mit Kurzhanteln', own: 'Eigene Pläne',
};
const SEED_V = 2; // Version der Standard-Übungen/-Pläne (für Updates bestehender Daten)

const DEFAULTS = () => ({
  v: 1,
  settings: {
    sex: 'm', age: 25, height: 180, activity: 1.55, goal: 'cut', goalWeight: null,
    kcal: 2200, protein: 150, carbs: 220, fat: 70, water: 2500, weeklyWorkouts: 3,
    weighDay: 1, weighTime: '08:00', bar: 20,
  },
  foods: [], favFoods: [], water: {}, weights: [], measures: [],
  exercises: DEFAULT_EXERCISES.map(e => ({ ...e })),
  routines: DEFAULT_ROUTINES.map(r => ({ ...r, exIds: [...r.exIds] })),
  workouts: [], active: null,
  meta: { onboarded: false, notifiedSlot: null, seedV: SEED_V },
});

/* ---------- State ---------- */
const KEY = 'gymtracker.v1';
let S = load();
const UI = { tab: 'today', foodDate: today(), bodyRange: 90, rest: null };

function load() {
  const d = DEFAULTS();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    const st = { ...d, ...s, settings: { ...d.settings, ...s.settings }, meta: { ...d.meta, seedV: 1, ...s.meta } };
    if (st.meta.seedV < SEED_V) { // neue Standard-Übungen & -Pläne ergänzen, ohne Eigenes zu überschreiben
      for (const e of DEFAULT_EXERCISES) if (!st.exercises.some(x => x.id === e.id)) st.exercises.push({ ...e });
      for (const r of DEFAULT_ROUTINES) {
        const ex = st.routines.find(x => x.id === r.id);
        if (ex) ex.group = ex.group || r.group; else st.routines.push({ ...r, exIds: [...r.exIds] });
      }
      st.meta.seedV = SEED_V;
    }
    return st;
  } catch (e) { console.warn('Laden fehlgeschlagen', e); return d; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('⚠️ Speichern fehlgeschlagen – Speicher voll?'); }
}
const exById = id => S.exercises.find(e => e.id === id);
const latestWeight = () => [...S.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);

/* ---------- UI primitives ---------- */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
function openSheet(html) {
  $('#sheet .sheet-panel').innerHTML = html;
  $('#sheet').classList.remove('hidden');
  $('#sheet .sheet-panel').scrollTop = 0;
}
function closeSheet() { stopScan(); $('#sheet').classList.add('hidden'); $('#sheet .sheet-panel').innerHTML = ''; }
const sheetOpen = () => !$('#sheet').classList.contains('hidden');

function ring(pct, color, label, sub) {
  const r = 52, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<div class="ring"><svg viewBox="0 0 120 120" width="120" height="120">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--card2)" stroke-width="11"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/></svg>
    <div class="c"><div><b>${label}</b><span>${sub}</span></div></div></div>`;
}
function bar(label, val, goal, color, unit = 'g') {
  const pct = goal ? val / goal : 0;
  return `<div class="bar"><div class="lbl"><span>${label}</span><span><b>${fmt(val)}</b> / ${fmt(goal)} ${unit}</span></div>
    <div class="track ${pct > 1.1 ? 'over' : ''}"><i style="width:${Math.min(100, pct * 100)}%;background:${color}"></i></div></div>`;
}

/* Kleines SVG-Liniendiagramm. series: [{pts:[[ms,y]], color, dash, dots}] */
function lineChart(series, { h = 150, goal = null, unit = '' } = {}) {
  const all = series.flatMap(s => s.pts);
  if (all.length < 2) return '<div class="empty small">Noch zu wenig Daten für ein Diagramm – trag mindestens 2 Werte ein.</div>';
  const W = 340, H = h, pl = 36, pr = 10, pt = 10, pb = 20;
  let x0 = Math.min(...all.map(p => p[0])), x1 = Math.max(...all.map(p => p[0]));
  if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  const ys = all.map(p => p[1]).concat(goal != null ? [goal] : []);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const padY = (y1 - y0) * 0.12 || 1; y0 -= padY; y1 += padY;
  const sx = x => pl + (x - x0) / (x1 - x0) * (W - pl - pr);
  const sy = y => pt + (1 - (y - y0) / (y1 - y0)) * (H - pt - pb);
  let g = '';
  for (let i = 0; i <= 2; i++) {
    const v = y0 + (y1 - y0) * i / 2;
    g += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${pl - 5}" y="${sy(v) + 3}" text-anchor="end">${fmt(v, Math.abs(y1 - y0) < 10 ? 1 : 0)}</text>`;
  }
  if (goal != null) g += `<line x1="${pl}" x2="${W - pr}" y1="${sy(goal)}" y2="${sy(goal)}" stroke="var(--accent)" stroke-dasharray="4 4" opacity=".7"/><text x="${W - pr}" y="${sy(goal) - 4}" text-anchor="end" style="fill:var(--accent)">Ziel ${fmt(goal, 1)}${unit}</text>`;
  const dl = ms => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  g += `<text x="${pl}" y="${H - 4}">${dl(x0)}</text><text x="${W - pr}" y="${H - 4}" text-anchor="end">${dl(x1)}</text>`;
  for (const s of series) {
    if (!s.pts.length) continue;
    const d = s.pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join('');
    g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}" ${s.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.dots) g += s.pts.map(p => `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="3" fill="${s.color}"/>`).join('');
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function barChart(vals, labels, { h = 110, goal = null, color = 'var(--accent)' } = {}) {
  const W = 340, H = h, pb = 18, pt = 8, max = Math.max(1, goal || 0, ...vals);
  const bw = (W - 10) / vals.length;
  let g = '';
  vals.forEach((v, i) => {
    const bh = (H - pb - pt) * v / max, x = 5 + i * bw + bw * 0.18;
    g += `<rect x="${x}" y="${H - pb - bh}" width="${bw * 0.64}" height="${Math.max(bh, 2)}" rx="4" fill="${goal && v >= goal ? color : 'var(--card2)'}" ${goal && v >= goal ? '' : 'stroke="var(--line)"'}/>`;
    g += `<text x="${x + bw * 0.32}" y="${H - 5}" text-anchor="middle">${labels[i]}</text>`;
    if (v) g += `<text x="${x + bw * 0.32}" y="${H - pb - bh - 3}" text-anchor="middle" style="fill:var(--text)">${v}</text>`;
  });
  if (goal) { const y = H - pb - (H - pb - pt) * goal / max; g += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="var(--accent)" stroke-dasharray="4 4" opacity=".5"/>`; }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

/* ---------- Ernährung ---------- */
function dayTotals(date) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const x of S.foods) if (x.date === date) { t.kcal += x.kcal; t.p += x.p; t.c += x.c; t.f += x.f; }
  return t;
}
function avgKcal(days = 7) {
  const vals = [];
  for (let i = 1; i <= days; i++) { const d = addDays(today(), -i), t = dayTotals(d); if (t.kcal > 0) vals.push(t.kcal); }
  return vals.length ? { avg: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length } : null;
}

/* ---------- Gewicht & Wiege-Erinnerung ---------- */
function lastWeighSlot(now = new Date()) {
  const [hh, mm] = S.settings.weighTime.split(':').map(Number);
  const d = new Date(now); d.setHours(hh, mm, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - S.settings.weighDay + 7) % 7));
  if (d > now) d.setDate(d.getDate() - 7);
  return d;
}
function nextWeighSlot() { const d = lastWeighSlot(); d.setDate(d.getDate() + 7); return d; }
function weighDue() {
  if (!S.weights.length) return true;
  const slot = addDays(ymd(lastWeighSlot()), -1); // einen Tag früher wiegen zählt auch
  return !S.weights.some(w => w.date >= slot);
}
/* Wöchentliche Rate (kg/Woche) aus linearer Regression der letzten ~5 Wochen */
function weightTrend(days = 35) {
  const from = addDays(today(), -days);
  const pts = S.weights.filter(w => w.date >= from).map(w => [daysBetween(from, w.date), w.kg]);
  if (pts.length < 2 || Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0])) < 6) return null;
  const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  const slope = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  return slope * 7;
}
function coachTip() {
  const rate = weightTrend(), lw = latestWeight();
  if (rate == null || !lw) return null;
  const pct = rate / lw.kg * 100, g = S.settings.goal;
  const r = `${sgn(rate, 2)} kg/Woche (${sgn(pct, 1)} %)`;
  if (g === 'cut') {
    if (rate > -0.1) return { cls: 'warn', t: `Dein Gewicht stagniert (${r}). Reduziere um ca. 150–200 kcal/Tag oder mach mehr Schritte.` };
    if (pct < -1) return { cls: 'warn', t: `Du nimmst sehr schnell ab (${r}). Iss ca. 150 kcal mehr, sonst geht Muskulatur verloren.` };
    return { cls: 'accent', t: `Perfektes Tempo! ${r} – weiter so. 💪` };
  }
  if (g === 'bulk') {
    if (rate < 0.05) return { cls: 'warn', t: `Kaum Zunahme (${r}). Iss ca. 150–200 kcal mehr pro Tag.` };
    if (pct > 0.5) return { cls: 'warn', t: `Du nimmst schnell zu (${r}) – wahrscheinlich viel Fett. Reduziere ca. 150 kcal.` };
    return { cls: 'accent', t: `Sauberer Aufbau: ${r}. 💪` };
  }
  if (Math.abs(rate) > 0.25) return { cls: 'warn', t: `Dein Gewicht verändert sich (${r}). Passe die Kalorien um ~150 kcal an.` };
  return { cls: 'accent', t: `Gewicht stabil (${r}). 👌` };
}

/* ---------- Training & Progression ---------- */
function exHistory(exId) { // neueste zuerst
  const out = [];
  for (const w of [...S.workouts].sort((a, b) => b.start - a.start))
    for (const e of w.entries) if (e.exId === exId && e.sets.length) out.push({ date: w.date, start: w.start, sets: e.sets });
  return out;
}
function workSets(sess) { const wk = Math.max(...sess.sets.map(s => s.w || 0)); return { wk, sets: sess.sets.filter(s => (s.w || 0) === wk) }; }

/*
 * Double Progression:
 *  - Alle Ziel-Sätze am oberen Ende des Wdh-Bereichs → Gewicht + Steigerung, Wdh zurück aufs untere Ende
 *  - 2 Einheiten in Folge mit gleichem Gewicht unter dem unteren Wdh-Ende → Deload −10 %
 *  - sonst: Gewicht halten und pro Satz +1 Wdh anpeilen
 */
function suggest(ex) {
  const h = exHistory(ex.id);
  const bw = !ex.start && !ex.barbell;
  const kg = w => (bw && w === 0 ? 'Körpergewicht' : `${fmt(w, 2)} kg${bw ? ' Zusatz' : ''}`);
  if (!h.length) return { w: ex.start || 0, reps: Array(ex.sets).fill(ex.repMin), status: 'new', text: `🆕 Erstes Mal: Starte mit einem Gewicht, das du sauber ${ex.repMin}–${ex.repMax}× schaffst.` };
  const a = workSets(h[0]);
  if (a.sets.length >= ex.sets && a.sets.slice(0, ex.sets).every(s => s.r >= ex.repMax)) {
    const nw = roundTo(a.wk + ex.inc, 0.25);
    return { w: nw, reps: Array(ex.sets).fill(ex.repMin), status: 'up', text: `⬆️ Level up! Letztes Mal alle Sätze mit ${ex.repMax}+ Wdh. → jetzt ${kg(nw)} für ${ex.repMin}+ Wdh.` };
  }
  if (h[1]) {
    const b = workSets(h[1]);
    const fail = x => x.sets.some(s => s.r < ex.repMin);
    if (fail(a) && fail(b) && a.wk === b.wk && a.wk > 0) {
      const nw = Math.max(0, roundTo(a.wk * 0.9, ex.inc));
      return { w: nw, reps: Array(ex.sets).fill(ex.repMax), status: 'deload', text: `↘️ 2× Ziel verfehlt → Deload auf ${kg(nw)} (−10 %) und von dort wieder hocharbeiten.` };
    }
  }
  const reps = Array.from({ length: ex.sets }, (_, i) => Math.min(ex.repMax, (a.sets[i]?.r ?? a.sets.at(-1).r) + 1));
  const total = a.sets.slice(0, ex.sets).reduce((s, x) => s + x.r, 0);
  return { w: a.wk, reps, status: 'hold', text: `➡️ ${kg(a.wk)} halten und je Satz +1 Wdh. holen. Fortschritt bis Level-up: ${total}/${ex.sets * ex.repMax} Wdh.` };
}
function plates(total) {
  const bar = S.settings.bar || 20;
  let side = (total - bar) / 2; if (side <= 0) return total > 0 && total <= bar ? 'Nur Stange' : '';
  const out = [];
  for (const p of [25, 20, 15, 10, 5, 2.5, 1.25, 0.5]) while (side >= p - 1e-9) { out.push(p); side = +(side - p).toFixed(3); }
  return `Pro Seite: ${out.map(p => fmt(p, 2)).join(' · ')}${side > 0.01 ? ` (+${fmt(side, 2)})` : ''} — Stange ${bar} kg`;
}
function bestSet(sets) { return sets.reduce((b, s) => (!b || setScore(s) > setScore(b) ? s : b), null); }
function workoutsInWeek(d) {
  const ws = weekStart(d).getTime(), we = ws + 7 * 864e5;
  return S.workouts.filter(w => w.start >= ws && w.start < we).length;
}
function weekStreak() {
  const goal = S.settings.weeklyWorkouts || 1;
  let d = new Date(), n = 0;
  if (workoutsInWeek(d) < goal) d = new Date(weekStart(d).getTime() - 864e5);
  while (workoutsInWeek(d) >= goal) { n++; d = new Date(weekStart(d).getTime() - 864e5); }
  return n;
}
function newEntry(ex) {
  const s = suggest(ex);
  return { exId: ex.id, sets: s.reps.map(t => ({ w: s.w, r: null, t, done: false })) };
}
function startWorkout(routineId) {
  if (S.active) { UI.tab = 'train'; render(); return; }
  const r = S.routines.find(x => x.id === routineId);
  S.active = {
    id: uid(), name: r ? r.name : 'Freies Training', routineId: r?.id || null, start: Date.now(), date: today(),
    entries: r ? r.exIds.map(exById).filter(Boolean).map(newEntry) : [],
  };
  save(); UI.tab = 'train'; render(); window.scrollTo(0, 0);
}

/* ---------- Views ---------- */
const VIEWS = {};

VIEWS.today = () => {
  const st = S.settings, t = dayTotals(today()), lw = latestWeight();
  const hour = new Date().getHours();
  const hi = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hey' : 'Guten Abend';
  const left = st.kcal - t.kcal;
  const water = S.water[today()] || 0;
  const weekN = workoutsInWeek(new Date()), streak = weekStreak();
  const tip = coachTip();
  const due = weighDue();
  const lastW = [...S.workouts].sort((a, b) => b.start - a.start)[0];
  const nextR = (() => { // nächster Plan in der Rotation
    if (!S.routines.length) return null;
    const last = lastW?.routineId && S.routines.find(r => r.id === lastW.routineId);
    if (!last) return S.routines[0];
    const grp = S.routines.filter(r => (r.group || 'own') === (last.group || 'own'));
    return grp[(grp.indexOf(last) + 1) % grp.length];
  })();
  const recent = S.weights.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-10);

  return `
  <h1>${hi}! 👋</h1>
  <div class="sub">${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>

  ${!S.meta.onboarded ? `<div class="card accent"><h2>Willkommen bei deinem Gym Tracker 🚀</h2>
    <p class="muted small" style="margin:0 0 10px">Trag kurz dein Profil ein – dann berechne ich dir Kalorien- & Makroziele automatisch.</p>
    <button class="btn primary" data-act="tab" data-tab="more">Profil einrichten</button></div>` : ''}

  ${due ? `<div class="card warn"><div class="row"><div class="grow"><b>⚖️ Zeit zum Wiegen!</b><div class="small muted">${S.weights.length ? `Wöchentlicher Check-in (${DAYS[st.weighDay]}). Morgens, nüchtern, nach dem Klo.` : 'Trag dein Startgewicht ein.'}</div></div>
    <button class="btn primary" data-act="addWeight">Eintragen</button></div></div>` : ''}

  ${S.active ? `<div class="card accent"><div class="row"><div class="grow"><b>🏋️ ${esc(S.active.name)}</b><div class="small muted">läuft seit <span data-elapsed>${mmss((Date.now() - S.active.start) / 1000)}</span></div></div>
    <button class="btn primary" data-act="tab" data-tab="train">Weiter</button></div></div>` : ''}

  <div class="card">
    <div class="card-head"><h2>Ernährung heute</h2><button class="btn sm" data-act="quickFood">+ Essen</button></div>
    <div class="kcal">
      ${ring(t.kcal / st.kcal, left < 0 ? 'var(--red)' : 'var(--accent)', fmt(Math.abs(left)), left < 0 ? 'kcal drüber' : 'kcal übrig')}
      <div class="bars">
        ${bar('Kalorien', t.kcal, st.kcal, 'var(--accent)', 'kcal')}
        ${bar('Protein', t.p, st.protein, 'var(--pink)')}
        ${bar('Kohlenhydrate', t.c, st.carbs, 'var(--blue)')}
        ${bar('Fett', t.f, st.fat, 'var(--orange)')}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h2>💧 Wasser</h2><span class="muted small">${fmt(water / 1000, 2)} / ${fmt(st.water / 1000, 1)} l</span></div>
    <div class="water">
      <div class="drops">${Array.from({ length: Math.ceil(st.water / 250) }, (_, i) => `<i class="${i < water / 250 ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn sm" data-act="water" data-ml="-250">−</button>
      <button class="btn sm primary" data-act="water" data-ml="250">+ 250 ml</button>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h2>Training</h2><span class="pill ${weekN >= st.weeklyWorkouts ? 'acc' : ''}">${weekN}/${st.weeklyWorkouts} diese Woche</span></div>
    <div class="grid3" style="margin-bottom:10px">
      <div class="stat"><b>${streak} 🔥</b><span>Wochen-Streak</span></div>
      <div class="stat"><b>${S.workouts.length}</b><span>Trainings gesamt</span></div>
      <div class="stat"><b>${lastW ? daysBetween(lastW.date, today()) + ' T' : '–'}</b><span>seit letztem</span></div>
    </div>
    ${S.active ? '' : `<div class="row">${nextR ? `<button class="btn primary grow" data-act="startWorkout" data-id="${nextR.id}">▶ ${esc(nextR.name.split(' (')[0])} starten</button>` : ''}
      <button class="btn" data-act="tab" data-tab="train">Alle Pläne</button></div>`}
  </div>

  <div class="card">
    <div class="card-head"><h2>Gewicht</h2>${lw ? `<span class="muted small">zuletzt ${fmtDate(lw.date)}</span>` : ''}</div>
    ${lw ? `<div class="row" style="margin-bottom:6px"><span class="big">${fmt(lw.kg, 1)} kg</span>
      ${weightTrend() != null ? `<span class="pill ${(weightTrend() < 0) === (st.goal !== 'bulk') ? 'up' : 'down'}">${sgn(weightTrend(), 2)} kg/Woche</span>` : ''}</div>
      ${lineChart([{ pts: recent.map(w => [parseYmd(w.date).getTime(), w.kg]), color: 'var(--accent)', dots: true }], { h: 110, goal: st.goalWeight, unit: ' kg' })}`
    : '<div class="empty">Noch kein Gewicht eingetragen.</div>'}
  </div>

  ${tip ? `<div class="card ${tip.cls}"><b>🧠 Coach</b><div class="small" style="margin-top:4px">${tip.t}</div>
    ${avgKcal() ? `<div class="small muted" style="margin-top:6px">Ø ${fmt(avgKcal().avg)} kcal an den letzten ${avgKcal().n} geloggten Tagen (Ziel ${fmt(st.kcal)}).</div>` : ''}</div>` : ''}
  `;
};

VIEWS.food = () => {
  const d = UI.foodDate, st = S.settings, t = dayTotals(d);
  const isToday = d === today();
  const label = isToday ? 'Heute' : d === addDays(today(), -1) ? 'Gestern' : fmtDate(d, { weekday: 'short', day: '2-digit', month: '2-digit' });
  const items = S.foods.filter(f => f.date === d);
  return `
  <h1>Ernährung</h1>
  <div class="datenav" style="margin-top:10px">
    <button class="icon-btn" data-act="foodDay" data-n="-1">‹</button>
    <b>${label}</b>
    <button class="icon-btn" data-act="foodDay" data-n="1" ${isToday ? 'disabled style="opacity:.3"' : ''}>›</button>
  </div>
  <div class="card">
    <div class="grid2" style="margin-bottom:10px">
      <div class="stat"><b>${fmt(t.kcal)} kcal</b><span>gegessen</span></div>
      <div class="stat"><b class="${st.kcal - t.kcal < 0 ? 'down' : ''}">${fmt(st.kcal - t.kcal)} kcal</b><span>übrig von ${fmt(st.kcal)}</span></div>
    </div>
    <div class="bars">
      ${bar('Protein', t.p, st.protein, 'var(--pink)')}
      ${bar('Kohlenhydrate', t.c, st.carbs, 'var(--blue)')}
      ${bar('Fett', t.f, st.fat, 'var(--orange)')}
    </div>
  </div>
  ${!items.length && S.foods.some(f => f.date === addDays(d, -1)) ? `<button class="btn block ghost" data-act="copyDay">⧉ Vortag kopieren</button>` : ''}
  ${Object.entries(MEALS).map(([k, name]) => {
    const list = items.filter(f => f.meal === k);
    const kc = list.reduce((a, f) => a + f.kcal, 0);
    return `<div class="meal"><div class="meal-head"><h3>${name} ${kc ? `· ${fmt(kc)} kcal` : ''}</h3><button class="btn sm" data-act="addFood" data-meal="${k}">+ Hinzufügen</button></div>
      ${list.length ? `<div class="list">${list.map(f => `<div class="item"><div class="t"><b>${esc(f.name)}</b>
        <span>${f.g ? fmt(f.g) + ' g · ' : ''}P ${fmt(f.p)} · K ${fmt(f.c)} · F ${fmt(f.f)}</span></div>
        <b>${fmt(f.kcal)}</b><button class="x" data-act="delFood" data-id="${f.id}" aria-label="Löschen">×</button></div>`).join('')}</div>` : ''}
    </div>`;
  }).join('')}`;
};

VIEWS.train = () => (S.active ? workoutLogger() : trainOverview());

function trainOverview() {
  const st = S.settings;
  const weeks = Array.from({ length: 8 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (7 - i) * 7); return d; });
  const hist = [...S.workouts].sort((a, b) => b.start - a.start);
  const used = new Set(S.workouts.flatMap(w => w.entries.map(e => e.exId)));
  return `
  <h1>Training</h1>
  <div class="sub">Pläne starten, Sätze loggen – die App sagt dir, wann du steigern musst.</div>

  ${Object.entries(ROUTINE_GROUPS).map(([g, label]) => {
    const rs = S.routines.filter(r => (r.group || 'own') === g);
    return rs.length ? `<h3>${label}</h3><div class="list">
    ${rs.map(r => `<div class="item"><div class="t"><b>${esc(r.name)}</b><span>${r.exIds.map(id => esc(exById(id)?.name)).filter(Boolean).join(', ')}</span></div>
      <button class="btn sm ghost" data-act="editRoutine" data-id="${r.id}">✎</button>
      <button class="btn sm primary" data-act="startWorkout" data-id="${r.id}">Start</button></div>`).join('')}
  </div>` : '';
  }).join('')}
  <div class="row" style="margin-top:8px">
    <button class="btn grow" data-act="editRoutine">+ Neuer Plan</button>
    <button class="btn grow" data-act="startWorkout">Freies Training</button>
  </div>

  <h3>Trainings pro Woche</h3>
  <div class="card">${barChart(weeks.map(workoutsInWeek), weeks.map(d => 'KW' + isoWeek(d)), { goal: st.weeklyWorkouts })}</div>

  ${used.size ? `<h3>Übungen & nächstes Ziel</h3>
  <div class="list">${S.exercises.filter(e => used.has(e.id)).map(ex => {
    const s = suggest(ex), b = bestSet(exHistory(ex.id).flatMap(x => x.sets));
    return `<div class="item tap" data-act="openExercise" data-id="${ex.id}"><div class="t"><b>${esc(ex.name)}</b>
      <span>Bestes: ${b ? `${fmt(b.w, 2)} kg × ${b.r}` : '–'} · e1RM ${b?.w ? fmt(e1rm(b.w, b.r), 1) + ' kg' : '–'}</span></div>
      <span class="pill ${s.status === 'up' ? 'up' : s.status === 'deload' ? 'down' : ''}">${s.status === 'up' ? '⬆ ' : s.status === 'deload' ? '↘ ' : ''}${fmt(s.w, 2)} kg</span></div>`;
  }).join('')}</div>` : ''}

  <h3>Verlauf</h3>
  ${hist.length ? `<div class="list">${hist.slice(0, 30).map(w => {
    const vol = w.entries.reduce((a, e) => a + e.sets.reduce((b, s) => b + (s.w || 0) * s.r, 0), 0);
    const nSets = w.entries.reduce((a, e) => a + e.sets.length, 0);
    return `<div class="item tap" data-act="openWorkout" data-id="${w.id}"><div class="t"><b>${esc(w.name)}</b>
      <span>${fmtDate(w.date, { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${mmss((w.end - w.start) / 1000)} · ${nSets} Sätze · ${fmt(vol)} kg Volumen</span></div><span class="muted">›</span></div>`;
  }).join('')}</div>` : '<div class="empty">Noch keine Trainings. Starte deinen ersten Plan! 💪</div>'}`;
}
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
}

function workoutLogger() {
  const a = S.active;
  const done = a.entries.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  const total = a.entries.reduce((n, e) => n + e.sets.length, 0);
  return `
  <div class="card">
    <input class="wk-name" data-bind="name" value="${esc(a.name)}">
    <div class="muted small">⏱ <span data-elapsed>${mmss((Date.now() - a.start) / 1000)}</span> · ${done}/${total} Sätze erledigt</div>
    <div class="row" style="margin-top:10px">
      <button class="btn ghost danger" data-act="cancelWorkout">Verwerfen</button>
      <button class="btn primary grow" data-act="finishWorkout">✓ Training beenden</button>
    </div>
  </div>
  ${a.entries.map((e, ei) => {
    const ex = exById(e.exId); if (!ex) return '';
    const s = suggest(ex), prev = exHistory(ex.id)[0];
    const pl = ex.barbell ? plates(e.sets.find(x => !x.done)?.w ?? e.sets[0]?.w ?? 0) : '';
    return `<div class="card">
      <div class="ex-head"><button class="link" data-act="openExercise" data-id="${ex.id}">${esc(ex.name)}</button>
        <span class="muted small">${ex.repMin}–${ex.repMax} Wdh · ${mmss(ex.rest)} Pause</span></div>
      <div class="sugg ${s.status}">${s.text}</div>
      ${pl ? `<div class="plates">🏋️ ${pl}</div>` : ''}
      <table class="sets"><tr><th>Satz</th><th>Vorher</th><th>kg</th><th>Wdh</th><th>✓</th></tr>
      ${e.sets.map((x, si) => `<tr class="${x.done ? 'done' : ''}"><td>${si + 1}</td>
        <td class="prev">${prev?.sets[si] ? `${fmt(prev.sets[si].w, 2)}×${prev.sets[si].r}` : '–'}</td>
        <td><input inputmode="decimal" data-bind="w" data-e="${ei}" data-s="${si}" value="${x.w ?? ''}"></td>
        <td><input inputmode="numeric" data-bind="r" data-e="${ei}" data-s="${si}" value="${x.r ?? ''}" placeholder="${x.t ?? ''}"></td>
        <td><button class="chk" data-act="toggleSet" data-e="${ei}" data-s="${si}">✓</button></td></tr>`).join('')}
      </table>
      <div class="row" style="margin-top:8px">
        <button class="btn sm" data-act="addSet" data-e="${ei}">+ Satz</button>
        <button class="btn sm" data-act="removeSet" data-e="${ei}">− Satz</button>
        <span class="grow"></span>
        ${ei > 0 ? `<button class="btn sm ghost" data-act="moveEntry" data-e="${ei}">↑</button>` : ''}
        <button class="btn sm ghost danger" data-act="removeEntry" data-e="${ei}">Entfernen</button>
      </div>
    </div>`;
  }).join('')}
  <button class="btn block" data-act="addEntry">+ Übung hinzufügen</button>`;
}

VIEWS.body = () => {
  const st = S.settings;
  const ws = [...S.weights].sort((a, b) => a.date.localeCompare(b.date));
  const from = UI.bodyRange ? addDays(today(), -UI.bodyRange) : '0000';
  const shown = ws.filter(w => w.date >= from);
  const first = ws[0], last = ws.at(-1), rate = weightTrend();
  const bmi = last ? last.kg / (st.height / 100) ** 2 : null;
  const ms = [...S.measures].sort((a, b) => b.date.localeCompare(a.date));
  const MF = [['waist', 'Bauch'], ['chest', 'Brust'], ['arm', 'Arm'], ['thigh', 'Oberschenkel'], ['hip', 'Hüfte'], ['bf', 'KFA %']];
  const nxt = nextWeighSlot();
  return `
  <h1>Körper</h1>
  <div class="sub">Nächster Wiege-Termin: ${weighDue() ? '<b style="color:var(--orange)">jetzt fällig</b>' : `${DAYS[nxt.getDay()]}, ${nxt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${S.settings.weighTime} Uhr`}</div>
  <div class="card">
    <div class="card-head"><h2>Gewicht</h2><button class="btn sm primary" data-act="addWeight">+ Wiegen</button></div>
    <div class="grid3" style="margin-bottom:10px">
      <div class="stat"><b>${last ? fmt(last.kg, 1) : '–'}</b><span>aktuell (kg)</span></div>
      <div class="stat"><b class="${first && last ? ((last.kg - first.kg < 0) === (st.goal !== 'bulk') ? 'up' : 'down') : ''}">${first && last ? sgn(last.kg - first.kg) : '–'}</b><span>seit Start</span></div>
      <div class="stat"><b>${rate != null ? sgn(rate, 2) : '–'}</b><span>kg / Woche</span></div>
    </div>
    <div class="seg">${[[30, '1M'], [90, '3M'], [365, '1J'], [0, 'Alles']].map(([v, l]) => `<button class="${UI.bodyRange === v ? 'on' : ''}" data-act="bodyRange" data-v="${v}">${l}</button>`).join('')}</div>
    ${lineChart([{ pts: shown.map(w => [parseYmd(w.date).getTime(), w.kg]), color: 'var(--accent)', dots: true }], { h: 170, goal: st.goalWeight, unit: ' kg' })}
    <div class="grid2" style="margin-top:10px">
      <div class="stat"><b>${bmi ? fmt(bmi, 1) : '–'}</b><span>BMI</span></div>
      <div class="stat"><b>${st.goalWeight && last ? fmt(Math.abs(last.kg - st.goalWeight), 1) + ' kg' : '–'}</b><span>${st.goalWeight ? `bis Ziel (${fmt(st.goalWeight, 1)} kg)` : 'Zielgewicht in "Mehr" setzen'}</span></div>
    </div>
    ${st.goalWeight && last && rate && Math.sign(st.goalWeight - last.kg) === Math.sign(rate) ? `<div class="small muted" style="margin-top:8px">📅 Bei aktuellem Tempo erreichst du dein Ziel in ca. <b>${fmt(Math.abs((st.goalWeight - last.kg) / rate))} Wochen</b>.</div>` : ''}
  </div>
  ${ws.length ? `<div class="list">${ws.slice().reverse().slice(0, 20).map((w, i, arr) => {
    const p = arr[i + 1];
    return `<div class="item"><div class="t"><b>${fmt(w.kg, 1)} kg</b><span>${fmtDate(w.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })}${w.note ? ' · ' + esc(w.note) : ''}</span></div>
      ${p ? `<span class="pill">${sgn(w.kg - p.kg)}</span>` : ''}<button class="x" data-act="delWeight" data-id="${w.id}">×</button></div>`;
  }).join('')}</div>` : ''}

  <h3>Fortschrittsfotos</h3>
  <div class="card">
    <div class="card-head"><h2>📸 Fotos</h2><div class="row">
      ${PH.list.length >= 2 ? '<button class="btn sm" data-act="photoCompare">⇆ Vergleich</button>' : ''}
      <button class="btn sm primary" data-act="addPhoto">+ Foto</button></div></div>
    ${PH.list.length ? `<div class="photos">${PH.list.map(p => `<button class="ph" data-act="openPhoto" data-id="${p.id}">
      <img src="${p.url}" alt="" loading="lazy"><span>${fmtDate(p.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}${p.kg ? ` · ${fmt(p.kg, 1)} kg` : ''}</span></button>`).join('')}</div>`
    : `<div class="empty small">${PH.ready ? 'Mach alle 2–4 Wochen ein Foto – gleiches Licht, gleiche Pose. Im Vergleich siehst du Fortschritt, den Waage & Spiegel nicht zeigen.' : 'Lade Fotos …'}</div>`}
    <div class="small muted" style="margin-top:8px">🔒 Fotos bleiben nur auf diesem Gerät und sind nicht im JSON-Backup enthalten.</div>
  </div>

  <h3>Körpermaße</h3>
  <div class="card">
    <div class="card-head"><h2>📏 Maße</h2><button class="btn sm" data-act="addMeasure">+ Messen</button></div>
    ${ms.length ? `<div class="grid3">${MF.map(([k, l]) => {
      const vals = ms.filter(m => m[k] != null); if (!vals.length) return '';
      const d = vals.length > 1 ? vals[0][k] - vals.at(-1)[k] : null;
      return `<div class="stat"><b>${fmt(vals[0][k], 1)}</b><span>${l}${d != null ? ` · ${sgn(d)}` : ''}</span></div>`;
    }).join('')}</div>
    <div class="small muted" style="margin-top:8px">Letzte Messung ${fmtDate(ms[0].date)} · Veränderung seit ${fmtDate(ms.at(-1).date)}</div>
    <div class="list" style="margin-top:10px">${ms.slice(0, 8).map(m => `<div class="item"><div class="t"><b>${fmtDate(m.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}</b>
      <span>${MF.filter(([k]) => m[k] != null).map(([k, l]) => `${l} ${fmt(m[k], 1)}`).join(' · ')}</span></div><button class="x" data-act="delMeasure" data-id="${m.id}">×</button></div>`).join('')}</div>`
    : '<div class="empty small">Miss alle 2–4 Wochen Bauch, Brust, Arme … – oft siehst du hier Fortschritt, auch wenn die Waage stagniert.</div>'}
  </div>`;
};

VIEWS.more = () => {
  const st = S.settings;
  const notif = 'Notification' in window ? Notification.permission : 'unsupported';
  return `
  <h1>Einstellungen</h1>
  <div class="sub">Profil, Ziele, Erinnerungen & Daten</div>

  <div class="card">
    <h2>👤 Profil</h2>
    <div class="grid2">
      <label class="f"><span>Geschlecht</span><select id="s_sex"><option value="m" ${st.sex === 'm' ? 'selected' : ''}>Männlich</option><option value="f" ${st.sex === 'f' ? 'selected' : ''}>Weiblich</option></select></label>
      <label class="f"><span>Alter</span><input id="s_age" inputmode="numeric" value="${st.age ?? ''}"></label>
      <label class="f"><span>Größe (cm)</span><input id="s_height" inputmode="numeric" value="${st.height ?? ''}"></label>
      <label class="f"><span>Zielgewicht (kg)</span><input id="s_goalWeight" inputmode="decimal" value="${st.goalWeight ?? ''}" placeholder="optional"></label>
    </div>
    <label class="f"><span>Aktivität</span><select id="s_activity">${ACTIVITY.map(([v, l]) => `<option value="${v}" ${+st.activity === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f"><span>Ziel</span><select id="s_goal">${Object.entries(GOALS).map(([v, l]) => `<option value="${v}" ${st.goal === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <button class="btn block" data-act="calcGoals">🧮 Ziele automatisch berechnen</button>
    <div class="small muted" style="margin-top:6px">Nutzt die Mifflin-St-Jeor-Formel und dein letztes Gewicht. Protein: 2 g/kg, Fett: 0,8 g/kg, Rest Kohlenhydrate.</div>
  </div>

  <div class="card">
    <h2>🎯 Tagesziele</h2>
    <div class="grid2">
      <label class="f"><span>Kalorien (kcal)</span><input id="s_kcal" inputmode="numeric" value="${st.kcal}"></label>
      <label class="f"><span>Protein (g)</span><input id="s_protein" inputmode="numeric" value="${st.protein}"></label>
      <label class="f"><span>Kohlenhydrate (g)</span><input id="s_carbs" inputmode="numeric" value="${st.carbs}"></label>
      <label class="f"><span>Fett (g)</span><input id="s_fat" inputmode="numeric" value="${st.fat}"></label>
      <label class="f"><span>Wasser (ml)</span><input id="s_water" inputmode="numeric" value="${st.water}"></label>
      <label class="f"><span>Trainings / Woche</span><input id="s_weeklyWorkouts" inputmode="numeric" value="${st.weeklyWorkouts}"></label>
    </div>
    <label class="f"><span>Gewicht Langhantelstange (kg) – für den Scheibenrechner</span><input id="s_bar" inputmode="decimal" value="${st.bar}"></label>
    <button class="btn primary block" data-act="saveSettings">Speichern</button>
  </div>

  <div class="card">
    <h2>⚖️ Wöchentliche Wiege-Erinnerung</h2>
    <div class="grid2">
      <label class="f"><span>Tag</span><select id="s_weighDay">${DAYS.map((d, i) => [d, i]).slice(1).concat([[DAYS[0], 0]]).map(([d, i]) => `<option value="${i}" ${+st.weighDay === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label class="f"><span>Uhrzeit</span><input id="s_weighTime" type="time" value="${st.weighTime}"></label>
    </div>
    <button class="btn primary block" data-act="saveSettings">Speichern</button>
    <div class="hr"></div>
    <p class="small muted" style="margin-top:0"><b>Zuverlässigste Variante:</b> Termin in deinen Handy-Kalender übernehmen – dann klingelt es jede Woche, auch wenn die App zu ist.</p>
    <button class="btn block" data-act="downloadIcs">📅 Wöchentlichen Termin zum Kalender hinzufügen</button>
    <p class="small muted">Zusätzlich zeigt die App ein Banner, sobald das Wiegen fällig ist${notif !== 'unsupported' ? ', und schickt eine Benachrichtigung, wenn sie geöffnet ist' : ''}.</p>
    ${notif === 'default' ? '<button class="btn block" data-act="askNotif">🔔 Benachrichtigungen erlauben</button>' : notif === 'granted' ? '<div class="small up">🔔 Benachrichtigungen sind aktiv.</div>' : notif === 'denied' ? '<div class="small muted">🔕 Benachrichtigungen sind im Browser blockiert.</div>' : ''}
  </div>

  <div class="card">
    <div class="card-head"><h2>🏋️ Übungen</h2><button class="btn sm" data-act="editExercise">+ Neu</button></div>
    <p class="small muted" style="margin-top:0">Tippe auf eine Übung, um Wdh-Bereich, Steigerung & Pause einzustellen.</p>
    <div class="list">${[...S.exercises].sort((a, b) => a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name)).map(ex => `<div class="item tap" data-act="openExercise" data-id="${ex.id}">
      <div class="t"><b>${esc(ex.name)}</b><span>${esc(ex.muscle)} · ${ex.sets}× ${ex.repMin}–${ex.repMax} · +${fmt(ex.inc, 2)} kg</span></div><span class="muted">›</span></div>`).join('')}</div>
  </div>

  <div class="card">
    <h2>💾 Daten</h2>
    <p class="small muted" style="margin-top:0">Alles wird nur auf diesem Gerät gespeichert. Mach ab und zu ein Backup!</p>
    <div class="row">
      <button class="btn grow" data-act="exportData">⬇ Backup exportieren</button>
      <button class="btn grow" data-act="importData">⬆ Backup laden</button>
    </div>
    <button class="btn block ghost danger" style="margin-top:8px" data-act="resetAll">Alle Daten löschen</button>
  </div>
  <div class="small muted" style="text-align:center">Gym Tracker · ${S.workouts.length} Trainings · ${S.foods.length} Essens-Einträge · ${S.weights.length} Wiegungen</div>`;
};

/* ---------- Fortschrittsfotos (IndexedDB, nur lokal) ---------- */
const PH = { list: [], ready: false }; // {id, date, kg, ts, url}
let _db = null;
function idb() {
  if (_db) return _db;
  return (_db = new Promise((res, rej) => {
    const r = indexedDB.open('gymtracker-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => { _db = null; rej(r.error); };
  }));
}
async function idbTx(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('photos', mode), req = fn(tx.objectStore('photos'));
    tx.oncomplete = () => res(req?.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
}
async function loadPhotos() {
  try {
    const all = await idbTx('readonly', st => st.getAll());
    PH.list.forEach(p => URL.revokeObjectURL(p.url));
    PH.list = all.sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts)
      .map(p => ({ id: p.id, date: p.date, kg: p.kg, ts: p.ts, url: URL.createObjectURL(p.blob) }));
  } catch (e) { console.warn('Fotos nicht ladbar', e); }
  PH.ready = true;
  if (UI.tab === 'body' && !sheetOpen()) render();
}
async function resizeImage(file, max = 1280) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
  } finally { URL.revokeObjectURL(url); }
}
function weightAt(date) { // Gewicht am/vor dem Datum (sonst das nächste danach)
  const ws = [...S.weights].sort((a, b) => a.date.localeCompare(b.date));
  return (ws.filter(w => w.date <= date).at(-1) || ws.find(w => w.date > date))?.kg ?? null;
}
async function addPhotos(files) {
  toast('📸 Speichere Foto …');
  let n = 0;
  for (const f of files) {
    try {
      const blob = await resizeImage(f);
      let date = f.lastModified ? ymd(new Date(f.lastModified)) : today();
      if (date > today()) date = today();
      await idbTx('readwrite', st => st.put({ id: uid(), date, kg: weightAt(date), ts: Date.now(), blob }));
      n++;
    } catch (e) { console.warn(e); }
  }
  await loadPhotos();
  toast(n ? `✓ ${n} Foto${n > 1 ? 's' : ''} gespeichert` : '⚠️ Foto konnte nicht gespeichert werden');
}
function photoSheet(id) {
  const p = PH.list.find(x => x.id === id); if (!p) return;
  openSheet(`<h2>${fmtDate(p.date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</h2>
    <img class="ph-full" src="${p.url}" alt="">
    <div class="grid2" style="margin-top:10px">
      <label class="f"><span>Datum</span><input id="ph_date" type="date" value="${p.date}" max="${today()}"></label>
      <label class="f"><span>Gewicht (kg)</span><input id="ph_kg" inputmode="decimal" value="${p.kg != null ? fmt(p.kg, 1) : ''}"></label>
    </div>
    <div class="sheet-actions"><button class="btn danger" data-act="delPhoto" data-id="${p.id}">Löschen</button>
      ${PH.list.length > 1 ? `<button class="btn" data-act="photoCompare" data-b="${p.id}">⇆ Vergleich</button>` : ''}
      <button class="btn primary" data-act="savePhoto" data-id="${p.id}">Speichern</button></div>`);
}
function compareSheet(aId, bId) {
  const old = PH.list.at(-1), neu = PH.list[0];
  const a = PH.list.find(x => x.id === aId) || old, b = PH.list.find(x => x.id === bId) || neu;
  const opts = sel => PH.list.map(p => `<option value="${p.id}" ${p.id === sel.id ? 'selected' : ''}>${fmtDate(p.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}${p.kg ? ` · ${fmt(p.kg, 1)} kg` : ''}</option>`).join('');
  const days = daysBetween(a.date, b.date), dkg = a.kg != null && b.kg != null ? b.kg - a.kg : null;
  openSheet(`<h2>⇆ Vorher / Nachher</h2>
    <div class="cmp">
      <div><img src="${a.url}" alt=""><select id="cmp_a">${opts(a)}</select></div>
      <div><img src="${b.url}" alt=""><select id="cmp_b">${opts(b)}</select></div>
    </div>
    <div class="grid2" style="margin-top:10px">
      <div class="stat"><b>${Math.abs(days) >= 14 ? fmt(Math.abs(days) / 7) + ' Wochen' : Math.abs(days) + ' Tage'}</b><span>Abstand</span></div>
      <div class="stat"><b>${dkg != null ? sgn(dkg) + ' kg' : '–'}</b><span>Gewicht</span></div>
    </div>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Schließen</button></div>`);
}

/* ---------- Render ---------- */
function render() {
  $('#view').innerHTML = VIEWS[UI.tab]();
  $$('.tabbar button').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === UI.tab);
    b.classList.toggle('dot', (b.dataset.tab === 'train' && !!S.active) || (b.dataset.tab === 'body' && weighDue()));
  });
}

/* ---------- Sheets ---------- */
function weightSheet() {
  const lw = latestWeight();
  openSheet(`<h2>⚖️ Gewicht eintragen</h2>
    <div class="grid2"><label class="f"><span>Gewicht (kg)</span><input id="w_kg" inputmode="decimal" value="${lw ? fmt(lw.kg, 1) : ''}" autofocus></label>
    <label class="f"><span>Datum</span><input id="w_date" type="date" value="${today()}" max="${today()}"></label></div>
    <label class="f"><span>Notiz (optional)</span><input id="w_note" placeholder="z.B. nach Cheat Day"></label>
    <div class="small muted">Tipp: Immer gleich wiegen – morgens, nüchtern, nach dem Toilettengang, ohne Kleidung.</div>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="saveWeight">Speichern</button></div>`);
  setTimeout(() => $('#w_kg')?.select(), 50);
}
function measureSheet() {
  const last = [...S.measures].sort((a, b) => b.date.localeCompare(a.date))[0] || {};
  const F = [['waist', 'Bauch (cm)'], ['chest', 'Brust (cm)'], ['arm', 'Oberarm (cm)'], ['thigh', 'Oberschenkel (cm)'], ['hip', 'Hüfte (cm)'], ['bf', 'Körperfett (%)']];
  openSheet(`<h2>📏 Körpermaße</h2>
    <label class="f"><span>Datum</span><input id="m_date" type="date" value="${today()}" max="${today()}"></label>
    <div class="grid2">${F.map(([k, l]) => `<label class="f"><span>${l}</span><input id="m_${k}" inputmode="decimal" placeholder="${last[k] != null ? fmt(last[k], 1) : ''}"></label>`).join('')}</div>
    <div class="small muted">Leere Felder werden nicht gespeichert. Grau = letzter Wert.</div>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="saveMeasure">Speichern</button></div>`);
}

/* ---- Essen hinzufügen ---- */
let FC = null;
function foodSheet(meal) {
  if (!meal) { const h = new Date().getHours(); meal = h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner'; }
  FC = { meal, date: UI.tab === 'food' ? UI.foodDate : today(), mode: 'search', list: [], picked: null };
  openSheet(`<h2>${MEALS[meal]} hinzufügen</h2>
    <div class="seg" id="foodSeg">${[['search', '🔎 Suchen'], ['manual', '✏️ Manuell'], ['barcode', '▥ Barcode']].map(([m, l]) => `<button data-act="foodMode" data-m="${m}" class="${m === 'search' ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="foodBody"></div>`);
  renderFoodBody();
}
function renderFoodBody() {
  const b = $('#foodBody'); if (!b) return;
  $$('#foodSeg button').forEach(x => x.classList.toggle('on', x.dataset.m === FC.mode));
  stopScan();
  if (FC.picked) return renderAmount();
  if (FC.mode === 'search') {
    b.innerHTML = `<input id="fq" type="search" placeholder="z.B. Haferflocken, Skyr, Hähnchen …" autocomplete="off">
      <div id="fres" style="margin-top:10px"></div>
      <button class="btn block ghost" style="margin-top:10px" data-act="offSearch">🌐 Online in Open Food Facts suchen</button>`;
    renderFoodResults();
  } else if (FC.mode === 'manual') {
    b.innerHTML = `<label class="f"><span>Name</span><input id="fm_name" placeholder="z.B. Mensa Pasta"></label>
      <div class="grid2"><label class="f"><span>Kalorien (kcal)</span><input id="fm_kcal" inputmode="decimal"></label>
      <label class="f"><span>Protein (g)</span><input id="fm_p" inputmode="decimal"></label>
      <label class="f"><span>Kohlenhydrate (g)</span><input id="fm_c" inputmode="decimal"></label>
      <label class="f"><span>Fett (g)</span><input id="fm_f" inputmode="decimal"></label></div>
      <label class="row" style="margin-bottom:10px"><input type="checkbox" id="fm_fav"> <span>Als Favorit speichern ⭐</span></label>
      <button class="btn primary block" data-act="addManual">Hinzufügen</button>`;
  } else {
    const can = 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia;
    b.innerHTML = `${can ? '<button class="btn primary block" data-act="scanStart">📷 Kamera-Scanner starten</button><video id="scanVideo" class="scan hidden" playsinline muted></video><div class="hr"></div>' : ''}
      <label class="f"><span>Barcode-Nummer (EAN)</span><input id="fb_code" inputmode="numeric" placeholder="z.B. 4008400404127"></label>
      <button class="btn block" data-act="barcodeLookup">Produkt suchen</button>
      ${can ? '' : '<p class="small muted">Kamera-Scan wird von diesem Browser nicht unterstützt – Nummer einfach abtippen.</p>'}
      <div id="fbres" class="small muted" style="margin-top:8px"></div>`;
  }
}
function renderFoodResults(extra) {
  const box = $('#fres'); if (!box) return;
  const q = ($('#fq')?.value || '').trim().toLowerCase();
  const seen = new Set(), recents = [];
  for (const f of [...S.foods].sort((a, b) => b.ts - a.ts)) {
    const k = f.name.toLowerCase() + '|' + Math.round(f.kcal);
    if (!seen.has(k)) { seen.add(k); recents.push(f); } if (recents.length >= 40) break;
  }
  const m = x => !q || x.name.toLowerCase().includes(q);
  const list = [
    ...S.favFoods.filter(m).map(x => ({ ...x, kind: 'abs', tag: '⭐' })),
    ...recents.filter(m).slice(0, q ? 10 : 8).map(x => ({ ...x, kind: 'abs', tag: 'Zuletzt' })),
    ...(q ? FOOD_DB.filter(m).map(x => ({ ...x, kind: 'per100', tag: 'pro 100 g' })) : []),
    ...(extra || []).map(x => ({ ...x, kind: 'per100', tag: 'Online' })),
  ];
  FC.list = list;
  box.innerHTML = list.length ? `<div class="list">${list.map((x, i) => `<div class="item tap" data-act="pickFood" data-i="${i}">
    <div class="t"><b>${esc(x.name)}</b><span>${x.tag} · ${fmt(x.kcal)} kcal · P ${fmt(x.p)} · K ${fmt(x.c)} · F ${fmt(x.f)}</span></div>
    ${x.id && x.tag === '⭐' ? `<button class="x" data-act="delFav" data-id="${x.id}">×</button>` : ''}<span class="muted">${x.kind === 'abs' ? '+' : '›'}</span></div>`).join('')}</div>`
    : `<div class="empty small">${q ? 'Nichts gefunden – probier die Online-Suche oder trag es manuell ein.' : 'Tippe, um zu suchen. Zuletzt gegessene Sachen erscheinen hier für 1-Tap-Logging.'}</div>`;
}
function renderAmount() {
  const x = FC.picked, g0 = x.portion?.g || 100;
  $('#foodBody').innerHTML = `<div class="card"><b>${esc(x.name)}</b><div class="small muted">pro 100 g: ${fmt(x.kcal)} kcal · P ${fmt(x.p, 1)} · K ${fmt(x.c, 1)} · F ${fmt(x.f, 1)}</div></div>
    <label class="f"><span>Menge (g / ml)</span><input id="fa_g" inputmode="decimal" value="${g0}"></label>
    <div class="row" style="margin-bottom:10px">${x.portion ? `<button class="btn sm" data-act="setAmt" data-g="${x.portion.g}">${esc(x.portion.l)} (${x.portion.g} g)</button>` : ''}
      ${[50, 100, 150, 200].map(g => `<button class="btn sm" data-act="setAmt" data-g="${g}">${g} g</button>`).join('')}</div>
    <div class="card" id="fa_prev"></div>
    <div class="sheet-actions"><button class="btn" data-act="foodBack">Zurück</button><button class="btn primary" data-act="addAmount">Hinzufügen</button></div>`;
  updateAmountPreview();
}
function updateAmountPreview() {
  const x = FC.picked, g = num($('#fa_g')?.value) || 0, k = g / 100;
  const el = $('#fa_prev'); if (el) el.innerHTML = `<div class="grid2"><div class="stat"><b>${fmt(x.kcal * k)} kcal</b><span>${fmt(g)} g</span></div>
    <div class="stat"><b style="font-size:14px">P ${fmt(x.p * k)} · K ${fmt(x.c * k)} · F ${fmt(x.f * k)}</b><span>Makros (g)</span></div></div>`;
}
function addFoodEntry(x) {
  S.foods.push({ id: uid(), date: FC.date, meal: FC.meal, name: x.name, kcal: +x.kcal || 0, p: +x.p || 0, c: +x.c || 0, f: +x.f || 0, g: x.g || null, ts: Date.now() });
  save(); render(); toast(`✓ ${x.name} (${fmt(x.kcal)} kcal)`);
}
const offMap = p => {
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null);
  if (kcal == null || !p.product_name) return null;
  const sq = num(p.serving_quantity);
  return { name: p.product_name + (p.brands ? ` (${p.brands.split(',')[0]})` : ''), kcal: +kcal, p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0), portion: sq ? { l: '1 Portion', g: sq } : null };
};
async function offSearch() {
  const q = ($('#fq')?.value || '').trim();
  if (!q) return toast('Erst einen Suchbegriff eingeben');
  $('#fres').innerHTML = '<div class="empty small">Suche online …</div>';
  try {
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=25&fields=product_name,brands,nutriments,serving_quantity`);
    const j = await r.json();
    const res = (j.products || []).map(offMap).filter(Boolean);
    renderFoodResults(res);
    if (!res.length) toast('Online nichts gefunden');
  } catch { renderFoodResults(); toast('⚠️ Keine Verbindung zur Online-Datenbank'); }
}
async function barcodeLookup(code) {
  code = String(code || '').replace(/\D/g, '');
  if (!code) return toast('Barcode eingeben');
  const out = $('#fbres'); if (out) out.textContent = 'Suche Produkt …';
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_quantity`);
    const j = await r.json(), item = j.product && offMap(j.product);
    if (!item) { if (out) out.textContent = 'Produkt nicht gefunden (oder ohne Nährwerte). Trag es manuell ein.'; return; }
    FC.picked = item; renderFoodBody();
  } catch { if (out) out.textContent = '⚠️ Keine Verbindung.'; }
}
let scan = null;
async function scanStart() {
  const v = $('#scanVideo'); if (!v) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    v.srcObject = stream; v.classList.remove('hidden'); await v.play();
    const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    scan = { stream, timer: setInterval(async () => {
      try { const codes = await det.detect(v); if (codes.length) { const c = codes[0].rawValue; stopScan(); navigator.vibrate?.(60); $('#fb_code').value = c; barcodeLookup(c); } } catch {}
    }, 350) };
  } catch { toast('Kamera nicht verfügbar'); }
}
function stopScan() { if (!scan) return; clearInterval(scan.timer); scan.stream.getTracks().forEach(t => t.stop()); scan = null; $('#scanVideo')?.classList.add('hidden'); }

/* ---- Übungen ---- */
function exercisePicker() {
  openSheet(`<h2>Übung hinzufügen</h2><input id="exq" type="search" placeholder="Suchen …" autocomplete="off"><div id="exres" style="margin-top:10px"></div>
    <button class="btn block" style="margin-top:10px" data-act="editExercise" data-pick="1">+ Neue Übung anlegen</button>`);
  renderExPicker();
}
function renderExPicker() {
  const q = ($('#exq')?.value || '').toLowerCase();
  $('#exres').innerHTML = `<div class="list">${S.exercises.filter(e => !q || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q))
    .sort((a, b) => a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name))
    .map(e => `<div class="item tap" data-act="pickExercise" data-id="${e.id}"><div class="t"><b>${esc(e.name)}</b><span>${esc(e.muscle)}</span></div><span class="muted">+</span></div>`).join('')}</div>`;
}
function exerciseSheet(id) {
  const ex = exById(id); if (!ex) return;
  const h = exHistory(id), s = suggest(ex);
  const pts = h.slice().reverse().map(x => { const b = bestSet(x.sets); return [x.start, b.w ? e1rm(b.w, b.r) : b.r]; });
  const best = bestSet(h.flatMap(x => x.sets));
  openSheet(`<div class="card-head"><h2 style="margin:0">${esc(ex.name)}</h2><button class="btn sm" data-act="editExercise" data-id="${ex.id}">✎ Bearbeiten</button></div>
    <div class="small muted" style="margin-bottom:10px">${esc(ex.muscle)} · ${ex.sets} Sätze × ${ex.repMin}–${ex.repMax} Wdh · Steigerung +${fmt(ex.inc, 2)} kg · Pause ${mmss(ex.rest)}</div>
    <div class="sugg ${s.status}"><b>Nächstes Training:</b> ${s.text}</div>
    <div class="grid3" style="margin:10px 0">
      <div class="stat"><b>${best ? fmt(best.w, 2) + '×' + best.r : '–'}</b><span>Bester Satz</span></div>
      <div class="stat"><b>${best?.w ? fmt(e1rm(best.w, best.r), 1) : '–'}</b><span>e1RM (kg)</span></div>
      <div class="stat"><b>${h.length}</b><span>Einheiten</span></div>
    </div>
    <h3>${best?.w ? 'Geschätztes 1RM' : 'Beste Wdh.'} über Zeit</h3>
    ${lineChart([{ pts, color: 'var(--accent)', dots: true }])}
    <h3>Verlauf</h3>
    ${h.length ? `<div class="list">${h.slice(0, 15).map(x => `<div class="item"><div class="t"><b>${fmtDate(x.date, { weekday: 'short', day: '2-digit', month: '2-digit' })}</b>
      <span>${x.sets.map(z => `${fmt(z.w, 2)}×${z.r}`).join(' · ')}</span></div></div>`).join('')}</div>` : '<div class="empty small">Noch nicht trainiert.</div>'}
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Schließen</button></div>`);
}
function exerciseEditSheet(id, fromPicker) {
  const ex = exById(id) || { name: '', muscle: 'Brust', repMin: 8, repMax: 12, inc: 2.5, sets: 3, rest: 90, barbell: false, start: 20 };
  openSheet(`<h2>${id ? 'Übung bearbeiten' : 'Neue Übung'}</h2>
    <label class="f"><span>Name</span><input id="e_name" value="${esc(ex.name)}"></label>
    <div class="grid2">
      <label class="f"><span>Muskelgruppe</span><select id="e_muscle">${MUSCLES.map(m => `<option ${m === ex.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="f"><span>Ziel-Sätze</span><input id="e_sets" inputmode="numeric" value="${ex.sets}"></label>
      <label class="f"><span>Wdh. min</span><input id="e_repMin" inputmode="numeric" value="${ex.repMin}"></label>
      <label class="f"><span>Wdh. max (→ Level-up)</span><input id="e_repMax" inputmode="numeric" value="${ex.repMax}"></label>
      <label class="f"><span>Steigerung (kg)</span><input id="e_inc" inputmode="decimal" value="${ex.inc}"></label>
      <label class="f"><span>Pause (Sek.)</span><input id="e_rest" inputmode="numeric" value="${ex.rest}"></label>
      <label class="f"><span>Startgewicht (kg)</span><input id="e_start" inputmode="decimal" value="${ex.start}"></label>
      <label class="f row" style="margin-top:22px"><input type="checkbox" id="e_barbell" ${ex.barbell ? 'checked' : ''}> <span style="display:inline;margin:0">Langhantel</span></label>
    </div>
    <div class="small muted">So funktioniert die Progression: Schaffst du in <b>allen</b> Ziel-Sätzen die max. Wdh., wirst du automatisch um die Steigerung hochgestuft. Verfehlst du 2× in Folge die min. Wdh., gibt's einen Deload (−10 %).</div>
    <div class="sheet-actions">${id && !exHistory(id).length && !S.routines.some(r => r.exIds.includes(id)) ? `<button class="btn danger" data-act="delExercise" data-id="${id}">Löschen</button>` : ''}
      <button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="saveExercise" data-id="${id || ''}" data-pick="${fromPicker ? 1 : ''}">Speichern</button></div>`);
}

/* ---- Pläne ---- */
let RC = null;
function routineSheet(id) {
  const r = S.routines.find(x => x.id === id);
  RC = { id: r?.id || null, name: r?.name || '', exIds: r ? [...r.exIds] : [] };
  renderRoutineSheet();
}
function renderRoutineSheet() {
  const name = $('#r_name')?.value ?? RC.name; RC.name = name;
  openSheet(`<h2>${RC.id ? 'Plan bearbeiten' : 'Neuer Trainingsplan'}</h2>
    <label class="f"><span>Name</span><input id="r_name" value="${esc(RC.name)}" placeholder="z.B. Oberkörper A"></label>
    <h3>Übungen</h3>
    ${RC.exIds.length ? `<div class="list">${RC.exIds.map((id, i) => `<div class="item"><div class="t"><b>${i + 1}. ${esc(exById(id)?.name)}</b></div>
      ${i ? `<button class="x" data-act="rMove" data-i="${i}">↑</button>` : ''}<button class="x" data-act="rDel" data-i="${i}">×</button></div>`).join('')}</div>` : '<div class="empty small">Noch keine Übungen.</div>'}
    <select id="r_add" style="margin-top:10px"><option value="">+ Übung hinzufügen …</option>${MUSCLES.map(m => {
      const xs = S.exercises.filter(e => e.muscle === m); return xs.length ? `<optgroup label="${m}">${xs.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</optgroup>` : '';
    }).join('')}</select>
    <div class="sheet-actions">${RC.id ? '<button class="btn danger" data-act="delRoutine">Löschen</button>' : ''}<button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="saveRoutine">Speichern</button></div>`);
}

function workoutSheet(id) {
  const w = S.workouts.find(x => x.id === id); if (!w) return;
  const vol = w.entries.reduce((a, e) => a + e.sets.reduce((b, s) => b + (s.w || 0) * s.r, 0), 0);
  openSheet(`<h2>${esc(w.name)}</h2>
    <div class="small muted">${fmtDate(w.date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · ${mmss((w.end - w.start) / 1000)} · ${fmt(vol)} kg Volumen</div>
    ${w.entries.map(e => `<h3>${esc(exById(e.exId)?.name || 'Gelöschte Übung')}</h3><div class="small">${e.sets.map((s, i) => `${i + 1}. ${fmt(s.w, 2)} kg × ${s.r}`).join('<br>')}</div>`).join('')}
    <div class="sheet-actions"><button class="btn danger" data-act="delWorkout" data-id="${w.id}">Löschen</button><button class="btn" data-act="closeSheet">Schließen</button></div>`);
}

function finishWorkout() {
  const a = S.active;
  const entries = a.entries.map(e => ({ exId: e.exId, sets: e.sets.filter(s => s.done && s.r > 0).map(s => ({ w: s.w || 0, r: s.r })) })).filter(e => e.sets.length);
  if (!entries.length) {
    if (confirm('Du hast noch keinen Satz abgehakt. Training verwerfen?')) { S.active = null; UI.rest = null; save(); render(); }
    return;
  }
  const open = a.entries.reduce((n, e) => n + e.sets.filter(s => !s.done).length, 0);
  if (open && !confirm(`${open} Sätze sind nicht abgehakt und werden nicht gespeichert. Trotzdem beenden?`)) return;
  // PRs prüfen (vor dem Speichern)
  const prs = [];
  for (const e of entries) {
    const prev = bestSet(exHistory(e.exId).flatMap(x => x.sets)), now = bestSet(e.sets);
    if (!prev || setScore(now) > setScore(prev) + 1e-6) prs.push({ ex: exById(e.exId), now, first: !prev });
  }
  const w = { id: a.id, name: a.name, routineId: a.routineId, date: a.date, start: a.start, end: Date.now(), entries };
  S.workouts.push(w); S.active = null; UI.rest = null; save();
  const vol = entries.reduce((s, e) => s + e.sets.reduce((b, x) => b + x.w * x.r, 0), 0);
  const ups = entries.map(e => ({ ex: exById(e.exId), s: suggest(exById(e.exId)) })).filter(x => x.ex && x.s.status !== 'hold');
  render();
  openSheet(`<div style="text-align:center"><div style="font-size:48px">🏆</div><h2>Starkes Training!</h2>
    <div class="grid3" style="margin:12px 0"><div class="stat"><b>${mmss((w.end - w.start) / 1000)}</b><span>Dauer</span></div>
    <div class="stat"><b>${entries.reduce((n, e) => n + e.sets.length, 0)}</b><span>Sätze</span></div><div class="stat"><b>${fmt(vol)}</b><span>kg Volumen</span></div></div></div>
    ${prs.filter(p => !p.first).length ? `<h3>🎉 Neue Bestleistungen</h3><ul class="prlist">${prs.filter(p => !p.first).map(p => `<li><b>${esc(p.ex?.name)}</b>: ${fmt(p.now.w, 2)} kg × ${p.now.r}${p.now.w ? ` (e1RM ${fmt(e1rm(p.now.w, p.now.r), 1)} kg)` : ''}</li>`).join('')}</ul>` : ''}
    ${ups.length ? `<h3>Nächstes Mal</h3>${ups.map(x => `<div class="sugg ${x.s.status}"><b>${esc(x.ex.name)}:</b> ${x.s.status === 'up' ? `⬆️ Hochgestuft auf ${fmt(x.s.w, 2)} kg!` : `↘️ Deload auf ${fmt(x.s.w, 2)} kg`}</div>`).join('')}` : ''}
    <div class="sheet-actions"><button class="btn primary" data-act="closeSheet">Nice 💪</button></div>`);
  navigator.vibrate?.([80, 60, 80]);
}

/* ---------- Pausentimer ---------- */
let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(t => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.25, audioCtx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.18);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch {}
}
function startRest(sec) {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch {}
  UI.rest = { end: Date.now() + sec * 1000, total: sec };
  tickRest();
}
function tickRest() {
  const el = $('#restbar');
  if (!UI.rest) { el.classList.add('hidden'); return; }
  const left = (UI.rest.end - Date.now()) / 1000;
  if (left <= 0) {
    UI.rest = null; el.classList.add('hidden'); beep(); navigator.vibrate?.([200, 100, 200]);
    if (document.hidden) notify('⏱ Pause vorbei!', 'Nächster Satz – los geht\'s 💪');
    else toast('⏱ Pause vorbei – nächster Satz!');
    return;
  }
  el.classList.remove('hidden'); el.classList.toggle('ending', left < 10);
  $('[data-rest]', el).textContent = mmss(left);
  $('.restbar-fill', el).style.width = (100 * (1 - left / UI.rest.total)) + '%';
}

/* ---------- Benachrichtigungen & Kalender ---------- */
async function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: title });
    else new Notification(title, { body, icon: 'icons/icon-192.png' });
  } catch {}
}
function checkWeighReminder() {
  if (!weighDue() || !S.weights.length) return;
  const slot = ymd(lastWeighSlot());
  if (S.meta.notifiedSlot === slot) return;
  S.meta.notifiedSlot = slot; save();
  notify('⚖️ Zeit zum Wiegen!', 'Dein wöchentlicher Check-in steht an. Kurz wiegen und eintragen.');
}
function downloadIcs() {
  const st = S.settings, [hh, mm] = st.weighTime.split(':');
  const first = nextWeighSlot(), lastSlot = lastWeighSlot();
  const start = weighDue() ? first : (lastSlot > new Date() ? lastSlot : first);
  const dt = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${hh}${mm}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GymTracker//DE', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:weighin-${uid()}@gymtracker`, `DTSTAMP:${stamp}`, `DTSTART:${dt}`, 'DURATION:PT10M',
    `RRULE:FREQ=WEEKLY;BYDAY=${DAY_ICS[st.weighDay]}`, 'SUMMARY:⚖️ Wiegen – Gym Tracker',
    'DESCRIPTION:Morgens nüchtern nach dem Toilettengang wiegen und in der App eintragen.',
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Zeit zum Wiegen!', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  download(new Blob([ics], { type: 'text/calendar' }), 'wiegen-erinnerung.ics');
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* ---------- Actions ---------- */
const A = {
  tab: el => { UI.tab = el.dataset.tab; closeSheet(); render(); window.scrollTo(0, 0); },
  closeSheet,
  water: el => { const d = today(); S.water[d] = Math.max(0, (S.water[d] || 0) + +el.dataset.ml); save(); render(); },
  quickFood: () => foodSheet(),
  addFood: el => foodSheet(el.dataset.meal),
  delFood: el => { S.foods = S.foods.filter(f => f.id !== el.dataset.id); save(); render(); },
  foodDay: el => { const n = UI.foodDate = addDays(UI.foodDate, +el.dataset.n); if (n > today()) UI.foodDate = today(); render(); },
  copyDay: () => {
    const src = S.foods.filter(f => f.date === addDays(UI.foodDate, -1));
    src.forEach((f, i) => S.foods.push({ ...f, id: uid(), date: UI.foodDate, ts: Date.now() + i }));
    save(); render(); toast(`${src.length} Einträge kopiert`);
  },
  foodMode: el => { FC.mode = el.dataset.m; FC.picked = null; renderFoodBody(); },
  pickFood: (el, ev) => {
    if (ev.target.closest('[data-act="delFav"]')) return;
    const x = FC.list[+el.dataset.i]; if (!x) return;
    if (x.kind === 'abs') addFoodEntry(x);
    else { FC.picked = x; renderFoodBody(); setTimeout(() => $('#fa_g')?.select(), 50); }
  },
  delFav: el => { S.favFoods = S.favFoods.filter(f => f.id !== el.dataset.id); save(); renderFoodResults(); },
  setAmt: el => { $('#fa_g').value = el.dataset.g; updateAmountPreview(); },
  foodBack: () => { FC.picked = null; renderFoodBody(); },
  addAmount: () => {
    const x = FC.picked, g = num($('#fa_g').value);
    if (!g || g <= 0) return toast('Menge eingeben');
    const k = g / 100;
    addFoodEntry({ name: x.name, kcal: x.kcal * k, p: x.p * k, c: x.c * k, f: x.f * k, g });
    FC.picked = null; FC.mode = 'search'; renderFoodBody();
  },
  addManual: () => {
    const name = $('#fm_name').value.trim() || 'Eintrag', kcal = num($('#fm_kcal').value);
    if (kcal == null) return toast('Kalorien eingeben');
    const x = { name, kcal, p: num($('#fm_p').value) || 0, c: num($('#fm_c').value) || 0, f: num($('#fm_f').value) || 0 };
    if ($('#fm_fav').checked) S.favFoods.push({ id: uid(), ...x });
    addFoodEntry(x); renderFoodBody();
  },
  offSearch, barcodeLookup: () => barcodeLookup($('#fb_code').value), scanStart,

  addWeight: weightSheet,
  saveWeight: () => {
    const kg = num($('#w_kg').value), date = $('#w_date').value || today();
    if (!kg || kg < 20 || kg > 400) return toast('Bitte gültiges Gewicht eingeben');
    S.weights = S.weights.filter(w => w.date !== date);
    S.weights.push({ id: uid(), date, kg, note: $('#w_note').value.trim() });
    save(); closeSheet(); render();
    const tip = coachTip(); toast(tip ? '✓ Gespeichert – schau dir den Coach-Tipp an' : '✓ Gewicht gespeichert');
  },
  delWeight: el => { if (confirm('Eintrag löschen?')) { S.weights = S.weights.filter(w => w.id !== el.dataset.id); save(); render(); } },
  bodyRange: el => { UI.bodyRange = +el.dataset.v; render(); },
  addMeasure: measureSheet,
  saveMeasure: () => {
    const m = { id: uid(), date: $('#m_date').value || today() };
    let any = false;
    for (const k of ['waist', 'chest', 'arm', 'thigh', 'hip', 'bf']) { const v = num($('#m_' + k).value); if (v != null) { m[k] = v; any = true; } }
    if (!any) return toast('Mindestens einen Wert eingeben');
    S.measures.push(m); save(); closeSheet(); render(); toast('✓ Maße gespeichert');
  },
  delMeasure: el => { if (confirm('Messung löschen?')) { S.measures = S.measures.filter(m => m.id !== el.dataset.id); save(); render(); } },

  startWorkout: el => startWorkout(el.dataset.id),
  cancelWorkout: () => { if (confirm('Training wirklich verwerfen? Nichts wird gespeichert.')) { S.active = null; UI.rest = null; tickRest(); save(); render(); } },
  finishWorkout,
  toggleSet: el => {
    const e = S.active.entries[+el.dataset.e], s = e.sets[+el.dataset.s];
    s.done = !s.done;
    if (s.done) {
      if (s.r == null) s.r = s.t ?? null;
      if (s.r == null) { s.done = false; return toast('Wiederholungen eintragen'); }
      if (s.w == null) s.w = 0;
      // Gewicht in folgende, noch offene Sätze übernehmen
      e.sets.slice(+el.dataset.s + 1).forEach(n => { if (!n.done) n.w = s.w; });
      startRest(exById(e.exId)?.rest || 90);
      navigator.vibrate?.(30);
    }
    save(); render();
  },
  addSet: el => { const e = S.active.entries[+el.dataset.e], l = e.sets.at(-1); e.sets.push({ w: l?.w ?? 0, r: null, t: l?.t ?? null, done: false }); save(); render(); },
  removeSet: el => { const e = S.active.entries[+el.dataset.e]; if (e.sets.length > 1) e.sets.pop(); save(); render(); },
  removeEntry: el => { if (confirm('Übung aus diesem Training entfernen?')) { S.active.entries.splice(+el.dataset.e, 1); save(); render(); } },
  moveEntry: el => { const i = +el.dataset.e, en = S.active.entries; [en[i - 1], en[i]] = [en[i], en[i - 1]]; save(); render(); },
  addEntry: exercisePicker,
  pickExercise: el => { S.active.entries.push(newEntry(exById(el.dataset.id))); save(); closeSheet(); render(); window.scrollTo(0, document.body.scrollHeight); },
  openExercise: el => exerciseSheet(el.dataset.id),
  editExercise: el => exerciseEditSheet(el.dataset.id, !!el.dataset.pick),
  saveExercise: el => {
    const name = $('#e_name').value.trim(); if (!name) return toast('Name eingeben');
    const v = {
      name, muscle: $('#e_muscle').value, sets: Math.max(1, num($('#e_sets').value) || 3),
      repMin: Math.max(1, num($('#e_repMin').value) || 8), repMax: Math.max(1, num($('#e_repMax').value) || 12),
      inc: Math.max(0.25, num($('#e_inc').value) || 2.5), rest: Math.max(0, num($('#e_rest').value) || 90),
      start: num($('#e_start').value) || 0, barbell: $('#e_barbell').checked,
    };
    if (v.repMax < v.repMin) [v.repMin, v.repMax] = [v.repMax, v.repMin];
    let id = el.dataset.id;
    if (id) Object.assign(exById(id), v); else { id = uid(); S.exercises.push({ id, ...v }); }
    save();
    if (el.dataset.pick && S.active) { S.active.entries.push(newEntry(exById(id))); save(); closeSheet(); render(); }
    else { render(); exerciseSheet(id); }
  },
  delExercise: el => { if (confirm('Übung löschen?')) { S.exercises = S.exercises.filter(e => e.id !== el.dataset.id); save(); closeSheet(); render(); } },
  editRoutine: el => routineSheet(el.dataset.id),
  rMove: el => { const i = +el.dataset.i; [RC.exIds[i - 1], RC.exIds[i]] = [RC.exIds[i], RC.exIds[i - 1]]; renderRoutineSheet(); },
  rDel: el => { RC.exIds.splice(+el.dataset.i, 1); renderRoutineSheet(); },
  saveRoutine: () => {
    const name = $('#r_name').value.trim(); if (!name) return toast('Name eingeben');
    if (!RC.exIds.length) return toast('Mindestens eine Übung hinzufügen');
    if (RC.id) Object.assign(S.routines.find(r => r.id === RC.id), { name, exIds: RC.exIds });
    else S.routines.push({ id: uid(), name, exIds: RC.exIds });
    save(); closeSheet(); render(); toast('✓ Plan gespeichert');
  },
  delRoutine: () => { if (confirm('Plan löschen? (Verlauf bleibt erhalten)')) { S.routines = S.routines.filter(r => r.id !== RC.id); save(); closeSheet(); render(); } },
  openWorkout: el => workoutSheet(el.dataset.id),
  delWorkout: el => { if (confirm('Training aus dem Verlauf löschen?')) { S.workouts = S.workouts.filter(w => w.id !== el.dataset.id); save(); closeSheet(); render(); } },
  restAdd: el => { if (UI.rest) { UI.rest.end += +el.dataset.s * 1000; UI.rest.total = Math.max(1, UI.rest.total + +el.dataset.s); tickRest(); } },
  restSkip: () => { UI.rest = null; tickRest(); },

  calcGoals: () => {
    readSettingsForm();
    const st = S.settings, lw = latestWeight();
    if (!lw) { toast('Trag zuerst dein Gewicht ein'); return weightSheet(); }
    const bmr = 10 * lw.kg + 6.25 * st.height - 5 * st.age + (st.sex === 'm' ? 5 : -161);
    const tdee = bmr * st.activity;
    const kcal = Math.round((tdee + { cut: -500, maintain: 0, bulk: 300 }[st.goal]) / 10) * 10;
    const protein = Math.round(lw.kg * 2), fat = Math.round(lw.kg * 0.8);
    Object.assign(st, { kcal, protein, fat, carbs: Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4)), water: Math.round(lw.kg * 35 / 250) * 250 });
    S.meta.onboarded = true; save(); render();
    toast(`Grundumsatz ${fmt(bmr)} · Verbrauch ${fmt(tdee)} → Ziel ${fmt(kcal)} kcal`);
  },
  saveSettings: () => { readSettingsForm(); S.meta.onboarded = true; save(); render(); toast('✓ Gespeichert'); },
  askNotif: async () => { await Notification.requestPermission(); render(); if (Notification.permission === 'granted') notify('🔔 Benachrichtigungen aktiv', 'Du wirst ans Wiegen und ans Pausenende erinnert.'); },
  downloadIcs,
  exportData: () => download(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), `gym-tracker-backup-${today()}.json`),
  importData: () => $('#importFile').click(),
  resetAll: async () => {
    if (!(confirm('Wirklich ALLE Daten löschen (inkl. Fotos)? Das kann nicht rückgängig gemacht werden.') && confirm('Ganz sicher?'))) return;
    S = DEFAULTS(); save(); UI.tab = 'today';
    try { await idbTx('readwrite', st => st.clear()); } catch {}
    await loadPhotos(); render();
  },
  addPhoto: () => $('#photoFile').click(),
  openPhoto: el => photoSheet(el.dataset.id),
  photoCompare: el => compareSheet(null, el.dataset.b),
  savePhoto: async el => {
    const id = el.dataset.id, date = $('#ph_date').value || today();
    let kg = num($('#ph_kg').value);
    try {
      const rec = await idbTx('readonly', st => st.get(id));
      // Datum geändert, Gewicht nicht angefasst → Gewicht von diesem Tag übernehmen
      if (date !== rec.date && (kg == null || Math.abs(kg - (rec.kg ?? NaN)) < 0.05)) kg = weightAt(date);
      await idbTx('readwrite', st => st.put({ ...rec, date, kg }));
    } catch { return toast('⚠️ Speichern fehlgeschlagen'); }
    closeSheet(); await loadPhotos(); toast('✓ Gespeichert');
  },
  delPhoto: async el => {
    if (!confirm('Foto löschen?')) return;
    try { await idbTx('readwrite', st => st.delete(el.dataset.id)); } catch {}
    closeSheet(); await loadPhotos();
  },
};

function readSettingsForm() {
  const st = S.settings, n = (id, min = 0) => { const v = num($('#s_' + id)?.value); return v != null && v >= min ? v : st[id]; };
  if (!$('#s_kcal')) return;
  Object.assign(st, {
    sex: $('#s_sex').value, age: n('age', 10), height: n('height', 100), activity: +$('#s_activity').value, goal: $('#s_goal').value,
    goalWeight: num($('#s_goalWeight').value), kcal: n('kcal', 500), protein: n('protein'), carbs: n('carbs'), fat: n('fat'),
    water: n('water', 250), weeklyWorkouts: Math.max(1, n('weeklyWorkouts', 1)), bar: n('bar'),
    weighDay: +$('#s_weighDay').value, weighTime: $('#s_weighTime').value || '08:00',
  });
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const tab = e.target.closest('.tabbar [data-tab]');
  if (tab) return A.tab(tab);
  const el = e.target.closest('[data-act]');
  if (el && A[el.dataset.act]) { e.preventDefault?.(); A[el.dataset.act](el, e); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'fq') renderFoodResults();
  else if (t.id === 'exq') renderExPicker();
  else if (t.id === 'fa_g') updateAmountPreview();
  else if (t.dataset.bind && S.active) {
    if (t.dataset.bind === 'name') S.active.name = t.value;
    else S.active.entries[+t.dataset.e].sets[+t.dataset.s][t.dataset.bind] = num(t.value);
    save();
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'r_add' && e.target.value) { RC.exIds.push(e.target.value); renderRoutineSheet(); }
  if (e.target.id === 'photoFile' && e.target.files.length) { addPhotos([...e.target.files]); e.target.value = ''; }
  if (e.target.id === 'cmp_a' || e.target.id === 'cmp_b') compareSheet($('#cmp_a').value, $('#cmp_b').value);
  if (e.target.id === 'importFile' && e.target.files[0]) {
    e.target.files[0].text().then(txt => {
      const d = JSON.parse(txt);
      if (!d || !d.settings || !Array.isArray(d.workouts)) throw new Error();
      if (!confirm('Backup laden? Aktuelle Daten werden ersetzt.')) return;
      localStorage.setItem(KEY, JSON.stringify(d)); S = load(); render(); toast('✓ Backup geladen');
    }).catch(() => toast('⚠️ Ungültige Backup-Datei'));
    e.target.value = '';
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheetOpen()) closeSheet();
  if (e.key === 'Enter' && e.target.id === 'fq') offSearch();
  if (e.key === 'Enter' && e.target.id === 'fa_g') A.addAmount();
});

/* Sekundentakt: Timer, Erinnerungen */
setInterval(() => {
  $$('[data-elapsed]').forEach(el => { if (S.active) el.textContent = mmss((Date.now() - S.active.start) / 1000); });
  if (UI.rest) tickRest();
  if (new Date().getSeconds() === 0) checkWeighReminder();
}, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { if (UI.foodDate > today()) UI.foodDate = today(); tickRest(); if (!sheetOpen()) render(); checkWeighReminder(); }
});

/* ---------- Start ---------- */
render();
checkWeighReminder();
loadPhotos();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
navigator.storage?.persist?.();
