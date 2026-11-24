'use strict';
/* =====================================================================
   Duty First – Training, Ernährung & Health mit Auto-Progression
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
const WK = sets => sets.filter(s => s.type !== 'warm'); // Arbeitssätze (ohne Aufwärmen)

const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const DAY_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
/* Mahlzeiten: frei einstellbar (Reihenfolge = Tagesablauf). MEALS wird aus den Einstellungen befüllt. */
const MEAL_BASE = { breakfast: 'Frühstück', snack_am: 'Zwischenmahlzeit', lunch: 'Mittagessen', snack: 'Snack', dinner: 'Abendessen', late: 'Spätmahlzeit' };
const MEAL_PRESETS = {
  3: ['breakfast', 'lunch', 'dinner'],
  4: ['breakfast', 'lunch', 'snack', 'dinner'],
  5: ['breakfast', 'snack_am', 'lunch', 'snack', 'dinner'],
  6: ['breakfast', 'snack_am', 'lunch', 'snack', 'dinner', 'late'],
};
const presetMeals = n => MEAL_PRESETS[n].map(id => ({ id, name: MEAL_BASE[id] }));
const MEALS = {};
function applyMeals() {
  for (const k of Object.keys(MEALS)) delete MEALS[k];
  const list = S.settings.meals?.length ? S.settings.meals : presetMeals(4);
  for (const m of list) MEALS[m.id] = m.name;
}
const mealName = k => MEALS[k] || MEAL_BASE[k] || 'Mahlzeit';
function fitMeal(k) { // gewünschte Standard-Mahlzeit → vorhandene Mahlzeit
  if (MEALS[k]) return k;
  const keys = Object.keys(MEALS), order = Object.keys(MEAL_BASE), want = order.indexOf(k);
  let best = keys[0], bd = 99;
  for (const x of keys) { const i = order.indexOf(x); const dd = i < 0 ? 50 : Math.abs(i - want); if (dd < bd) { bd = dd; best = x; } }
  return best;
}
function mealForNow() { // Mahlzeit passend zur Uhrzeit (06–22 Uhr gleichmäßig aufgeteilt)
  const keys = Object.keys(MEALS), h = new Date().getHours() + new Date().getMinutes() / 60;
  return keys[Math.max(0, Math.min(keys.length - 1, Math.floor((h - 6) / (16 / keys.length))))] || 'breakfast';
}
const MUSCLES = ['Brust', 'Rücken', 'Schultern', 'Beine', 'Arme', 'Bauch', 'Ganzkörper'];
const ACTIVITY = [[1.2, 'Kaum aktiv (Bürojob, kein Sport)'], [1.375, 'Leicht aktiv (1–2× Sport)'], [1.55, 'Aktiv (3–4× Sport)'], [1.725, 'Sehr aktiv (5–6× Sport)'], [1.9, 'Extrem aktiv (körperl. Arbeit + Sport)']];
const GOALS = { cut: 'Abnehmen (Defizit)', maintain: 'Gewicht halten', bulk: 'Muskelaufbau (Überschuss)' };

/* Lebensmittel-Datenbank: siehe foods.js (FOOD_CATS) */
const FOOD_DB = Object.entries(FOOD_CATS).flatMap(([cat, rows]) => rows.map(([name, kcal, p, c, f, pl, pg]) => ({ name, kcal, p, c, f, cat, portion: { l: pl, g: pg } })));
const foodNorm = s => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9%]+/g, ' ').trim();
const FOOD_SYN = { huhn: 'haehnchen', chicken: 'haehnchen', haenchen: 'haehnchen', hendl: 'haehnchen', pute: 'puten', truthahn: 'puten', pasta: 'nudeln', spaghetti: 'nudeln', yoghurt: 'joghurt', jogurt: 'joghurt', shake: 'protein', eiweiss: 'protein', semmel: 'broetchen', schrippe: 'broetchen', erdapfel: 'kartoffel', fritten: 'pommes', paradeiser: 'tomate', topfen: 'quark', oat: 'hafer',
  eier: 'ei', schlagsahne: 'sahne', obers: 'sahne', ghee: 'butterschmalz', blaubeeren: 'heidelbeeren', clementine: 'mandarine', krapfen: 'berliner', porree: 'lauch', moehre: 'karotte', moehren: 'karotte', mohrruebe: 'karotte', broccoli: 'brokkoli', karfiol: 'blumenkohl', marille: 'aprikose', kren: 'meerrettich', hackfleisch: 'hack', faschiertes: 'hack', bulette: 'frikadelle', boulette: 'frikadelle', fleischpflanzerl: 'frikadelle', limo: 'limonade', sprudel: 'wasser', proteinpulver: 'protein', vegetarisch: 'veggie', schoki: 'schokolade', sosse: 'sauce', nutella: 'nuss nougat', haferbrei: 'porridge', oatmeal: 'porridge' };
const foodStem = t => (t.length > 4 ? t.replace(/(en|n|s|e)$/, '') : t);
function foodScore(name, q) { // −1 = kein Treffer, sonst kleiner = besser
  const n = foodNorm(name), toks = foodNorm(q).split(' ').filter(Boolean);
  if (!toks.length) return -1;
  for (const t of toks) { const s = FOOD_SYN[t]; if (!n.includes(t) && !(s && n.includes(s)) && !n.includes(foodStem(t))) return -1; }
  const t0 = FOOD_SYN[toks[0]] && !n.includes(toks[0]) ? FOOD_SYN[toks[0]] : toks[0];
  const w0 = n.split(' ')[0], exact = toks.length === 1 && (foodStem(w0) === foodStem(toks[0]) || w0 === FOOD_SYN[toks[0]]);
  const loose = toks.filter(t => !n.includes(t)).length; // nur über Synonym/Plural gefunden → etwas weiter hinten
  return (exact ? 0 : n.startsWith(t0) ? 1 : (' ' + n).includes(' ' + t0) ? 2 : 3) + loose * 0.6 + n.length / 200;
}
function foodSearch(q, list = FOOD_DB) {
  return list.map(x => [x, foodScore(x.name, q)]).filter(([, s]) => s >= 0).sort((a, b) => a[1] - b[1]).map(([x]) => x);
}

/* Übungen: Wdh-Bereich (Double Progression), Steigerung in kg, Ziel-Sätze, Pause in s */
const MUSCLE_MAP = { // Übung → [Hauptmuskeln, Hilfsmuskeln]
  bench: [['chest'], ['frontdelt', 'triceps']], incline_db: [['chest'], ['frontdelt', 'triceps']], dips: [['chest', 'triceps'], ['frontdelt']],
  squat: [['quads', 'glutes'], ['lowerback']], deadlift: [['glutes', 'hams', 'lowerback'], ['upperback', 'forearms', 'quads']],
  rdl: [['hams', 'glutes'], ['lowerback']], ohp: [['frontdelt'], ['sidedelt', 'triceps']], row: [['upperback', 'lats'], ['reardelt', 'biceps', 'lowerback']],
  pullup: [['lats'], ['biceps', 'upperback']], latpull: [['lats'], ['biceps', 'upperback']], cablerow: [['upperback', 'lats'], ['biceps', 'reardelt']],
  legpress: [['quads'], ['glutes']], legcurl: [['hams'], []], legext: [['quads'], []], hipthrust: [['glutes'], ['hams']], calf: [['calves'], []],
  lateral: [['sidedelt'], []], facepull: [['reardelt'], ['upperback']], curl: [['biceps'], ['forearms']], pushdown: [['triceps'], []],
  crunch: [['abs'], []], hanging_leg: [['abs'], []], db_press: [['chest'], ['frontdelt', 'triceps']], pushup: [['chest'], ['frontdelt', 'triceps']],
  db_row: [['lats', 'upperback'], ['biceps', 'reardelt']], db_shoulder: [['frontdelt'], ['sidedelt', 'triceps']], goblet: [['quads', 'glutes'], ['abs']],
  lunge: [['quads', 'glutes'], ['hams']], hammer: [['biceps', 'forearms'], []], frenchpress: [['triceps'], []],
};
const GROUP_MUSCLE = { Brust: 'chest', Rücken: 'lats', Schultern: 'sidedelt', Beine: 'quads', Arme: 'biceps', Bauch: 'abs', Ganzkörper: 'quads' };

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
].map(([id, name, muscle, repMin, repMax, inc, sets, rest, barbell, start]) => ({ id, name, muscle, repMin, repMax, inc, sets, rest, barbell, start, pm: [...MUSCLE_MAP[id][0]], sm: [...MUSCLE_MAP[id][1]] }));
/* Geräte & erweiterte Übungsbibliothek */
const EQ = { lh: 'Langhantel', kh: 'Kurzhantel', kabel: 'Kabel', masch: 'Maschine', kg: 'Körpergewicht', sz: 'SZ-Stange', smith: 'Multipresse', kb: 'Kettlebell', other: 'Sonstiges' };
const EQ_OF = {
  bench: 'lh', incline_db: 'kh', dips: 'kg', squat: 'lh', deadlift: 'lh', rdl: 'lh', ohp: 'lh', row: 'lh', pullup: 'kg', latpull: 'kabel',
  cablerow: 'kabel', legpress: 'masch', legcurl: 'masch', legext: 'masch', hipthrust: 'lh', calf: 'masch', lateral: 'kh', facepull: 'kabel',
  curl: 'kh', pushdown: 'kabel', crunch: 'kabel', hanging_leg: 'kg', db_press: 'kh', pushup: 'kg', db_row: 'kh', db_shoulder: 'kh',
  goblet: 'kh', lunge: 'kh', hammer: 'kh', frenchpress: 'sz',
};
const REGION_OF_M = { chest: 'Brust', lats: 'Rücken', upperback: 'Rücken', lowerback: 'Rücken', frontdelt: 'Schultern', sidedelt: 'Schultern', reardelt: 'Schultern',
  biceps: 'Arme', triceps: 'Arme', forearms: 'Arme', quads: 'Beine', hams: 'Beine', glutes: 'Beine', calves: 'Beine', abs: 'Bauch' };
DEFAULT_EXERCISES.forEach(e => { e.eq = EQ_OF[e.id] || 'other'; });
// [id, Name, Gerät, Hauptmuskeln, Hilfsmuskeln, Wdh min, Wdh max, Steigerung, Pause, Startgewicht, Langhantel]
const EXTRA_EXERCISES = [
  ['incline_bench', 'Schrägbankdrücken (LH)', 'lh', ['chest'], ['frontdelt', 'triceps'], 6, 10, 2.5, 150, 30, true],
  ['decline_bench', 'Negativ-Bankdrücken', 'lh', ['chest'], ['triceps'], 6, 10, 2.5, 150, 40, true],
  ['db_fly', 'Kurzhantel-Flys', 'kh', ['chest'], ['frontdelt'], 10, 15, 1, 75, 8, false],
  ['cable_fly', 'Cable Flys', 'kabel', ['chest'], ['frontdelt'], 10, 15, 2.5, 75, 10, false],
  ['low_cable_fly', 'Cable Flys von unten', 'kabel', ['chest'], ['frontdelt'], 10, 15, 2.5, 75, 7.5, false],
  ['pec_deck', 'Butterfly (Maschine)', 'masch', ['chest'], [], 10, 15, 5, 75, 30, false],
  ['chest_press', 'Brustpresse (Maschine)', 'masch', ['chest'], ['triceps', 'frontdelt'], 8, 12, 5, 90, 40, false],
  ['smith_incline', 'Schrägbankdrücken (Multipresse)', 'smith', ['chest'], ['frontdelt', 'triceps'], 8, 12, 2.5, 120, 30, false],
  ['db_squeeze', 'Squeeze Press (KH)', 'kh', ['chest'], ['triceps'], 10, 15, 2, 75, 14, false],
  ['machine_dips', 'Dips (Maschine)', 'masch', ['triceps', 'chest'], ['frontdelt'], 8, 12, 5, 90, 40, false],
  ['chinup', 'Chin-ups (Untergriff)', 'kg', ['lats', 'biceps'], ['upperback'], 5, 10, 2.5, 120, 0, false],
  ['pullup_neutral', 'Klimmzüge (neutraler Griff)', 'kg', ['lats'], ['biceps', 'upperback'], 5, 10, 2.5, 120, 0, false],
  ['close_latpull', 'Latzug eng (V-Griff)', 'kabel', ['lats'], ['biceps', 'upperback'], 8, 12, 5, 90, 40, false],
  ['single_row', 'Einarmiges Kabelrudern', 'kabel', ['lats'], ['upperback', 'biceps'], 10, 12, 2.5, 75, 15, false],
  ['straight_pulldown', 'Überzüge am Kabel', 'kabel', ['lats'], ['triceps'], 10, 15, 2.5, 60, 15, false],
  ['db_pullover', 'Kurzhantel-Pullover', 'kh', ['lats'], ['chest', 'triceps'], 10, 15, 2, 75, 14, false],
  ['tbar_row', 'T-Bar-Rudern', 'lh', ['upperback', 'lats'], ['biceps', 'reardelt'], 8, 12, 2.5, 120, 30, false],
  ['chest_row', 'Brustgestütztes Rudern (KH)', 'kh', ['upperback'], ['lats', 'reardelt', 'biceps'], 8, 12, 2, 90, 16, false],
  ['machine_row', 'Rudermaschine', 'masch', ['upperback', 'lats'], ['biceps', 'reardelt'], 8, 12, 5, 90, 40, false],
  ['pendlay', 'Pendlay Row', 'lh', ['upperback', 'lats'], ['lowerback', 'biceps'], 5, 8, 2.5, 150, 40, true],
  ['shrug', 'Shrugs (LH)', 'lh', ['upperback'], ['forearms'], 10, 15, 5, 75, 60, true],
  ['db_shrug', 'Shrugs (KH)', 'kh', ['upperback'], ['forearms'], 10, 15, 2, 60, 20, false],
  ['rack_pull', 'Rack Pulls', 'lh', ['upperback', 'lowerback'], ['glutes', 'hams', 'forearms'], 3, 6, 5, 180, 80, true],
  ['hyperext', 'Hyperextensions', 'kg', ['lowerback'], ['glutes', 'hams'], 10, 15, 2.5, 75, 0, false],
  ['good_morning', 'Good Mornings', 'lh', ['hams', 'lowerback'], ['glutes'], 8, 12, 2.5, 120, 30, true],
  ['arnold', 'Arnold Press', 'kh', ['frontdelt'], ['sidedelt', 'triceps'], 8, 12, 2, 90, 12, false],
  ['machine_shoulder', 'Schulterpresse (Maschine)', 'masch', ['frontdelt'], ['sidedelt', 'triceps'], 8, 12, 5, 90, 30, false],
  ['front_raise', 'Frontheben', 'kh', ['frontdelt'], [], 10, 15, 1, 60, 6, false],
  ['cable_lateral', 'Seitheben am Kabel', 'kabel', ['sidedelt'], [], 12, 20, 1.25, 60, 5, false],
  ['machine_lateral', 'Seitheben (Maschine)', 'masch', ['sidedelt'], [], 12, 20, 2.5, 60, 15, false],
  ['upright_row', 'Aufrechtes Rudern', 'sz', ['sidedelt', 'upperback'], ['biceps'], 10, 15, 2.5, 75, 20, false],
  ['reverse_fly', 'Reverse Flys (KH)', 'kh', ['reardelt'], ['upperback'], 12, 20, 1, 60, 5, false],
  ['rear_delt_machine', 'Reverse Butterfly', 'masch', ['reardelt'], ['upperback'], 12, 20, 2.5, 60, 20, false],
  ['bb_curl', 'Langhantel-Curls', 'lh', ['biceps'], ['forearms'], 8, 12, 2.5, 75, 20, false],
  ['ez_curl', 'SZ-Curls', 'sz', ['biceps'], ['forearms'], 8, 12, 2.5, 75, 20, false],
  ['preacher', 'Scottcurls', 'sz', ['biceps'], [], 8, 12, 2.5, 75, 15, false],
  ['incline_curl', 'Schrägbank-Curls', 'kh', ['biceps'], [], 8, 12, 1, 75, 8, false],
  ['cable_curl', 'Kabelcurls', 'kabel', ['biceps'], ['forearms'], 10, 15, 2.5, 60, 15, false],
  ['conc_curl', 'Konzentrationscurls', 'kh', ['biceps'], [], 10, 15, 1, 60, 8, false],
  ['overhead_ext', 'Trizeps Überkopf (Kabel)', 'kabel', ['triceps'], [], 10, 15, 2.5, 75, 15, false],
  ['rope_pushdown', 'Trizepsdrücken (Seil)', 'kabel', ['triceps'], [], 10, 15, 2.5, 60, 15, false],
  ['close_bench', 'Enges Bankdrücken', 'lh', ['triceps'], ['chest', 'frontdelt'], 6, 10, 2.5, 120, 40, true],
  ['kickback', 'Trizeps-Kickbacks', 'kh', ['triceps'], [], 10, 15, 1, 60, 6, false],
  ['bench_dips', 'Bankdips', 'kg', ['triceps'], ['chest', 'frontdelt'], 10, 20, 2.5, 60, 0, false],
  ['wrist_curl', 'Handgelenk-Curls', 'lh', ['forearms'], [], 12, 20, 1.25, 45, 15, false],
  ['reverse_curl', 'Reverse Curls', 'sz', ['forearms'], ['biceps'], 10, 15, 2.5, 60, 15, false],
  ['farmer', 'Farmer\'s Walk (Schritte)', 'kh', ['forearms'], ['upperback', 'abs'], 20, 40, 2, 90, 20, false],
  ['front_squat', 'Frontkniebeugen', 'lh', ['quads'], ['glutes', 'abs'], 5, 8, 2.5, 180, 40, true],
  ['hack_squat', 'Hackenschmidt-Kniebeugen', 'masch', ['quads'], ['glutes'], 8, 12, 5, 120, 40, false],
  ['bulgarian', 'Bulgarian Split Squats', 'kh', ['quads', 'glutes'], ['hams'], 8, 12, 2, 90, 10, false],
  ['smith_squat', 'Kniebeugen (Multipresse)', 'smith', ['quads', 'glutes'], [], 8, 12, 2.5, 120, 40, false],
  ['step_up', 'Step-ups', 'kh', ['quads', 'glutes'], [], 8, 12, 2, 75, 10, false],
  ['walking_lunge', 'Ausfallschritte gehend', 'kh', ['quads', 'glutes'], ['hams'], 10, 16, 2, 90, 10, false],
  ['seated_curl', 'Beinbeuger sitzend', 'masch', ['hams'], [], 10, 15, 5, 75, 30, false],
  ['lying_curl', 'Beinbeuger liegend', 'masch', ['hams'], [], 10, 15, 5, 75, 25, false],
  ['nordic', 'Nordic Curls', 'kg', ['hams'], [], 4, 8, 2.5, 120, 0, false],
  ['db_rdl', 'Rumänisches Kreuzheben (KH)', 'kh', ['hams', 'glutes'], ['lowerback'], 8, 12, 2, 120, 20, false],
  ['sumo_dl', 'Sumo-Kreuzheben', 'lh', ['glutes', 'hams'], ['quads', 'lowerback', 'upperback'], 3, 6, 5, 180, 60, true],
  ['glute_bridge', 'Glute Bridge', 'lh', ['glutes'], ['hams'], 10, 15, 5, 90, 40, true],
  ['cable_kickback', 'Glute Kickbacks (Kabel)', 'kabel', ['glutes'], [], 10, 15, 2.5, 60, 10, false],
  ['abductor', 'Abduktoren (Maschine)', 'masch', ['glutes'], [], 12, 20, 5, 60, 30, false],
  ['kb_swing', 'Kettlebell Swings', 'kb', ['glutes', 'hams'], ['lowerback', 'forearms'], 12, 20, 4, 90, 16, false],
  ['seated_calf', 'Wadenheben sitzend', 'masch', ['calves'], [], 12, 20, 5, 60, 30, false],
  ['legpress_calf', 'Wadendrücken (Beinpresse)', 'masch', ['calves'], [], 12, 20, 10, 60, 80, false],
  ['ab_wheel', 'Ab Wheel Rollouts', 'kg', ['abs'], ['lats'], 8, 15, 2.5, 75, 0, false],
  ['woodchop', 'Holzhacker (Kabel)', 'kabel', ['abs'], [], 10, 15, 2.5, 60, 10, false],
  ['leg_raise', 'Beinheben liegend', 'kg', ['abs'], [], 10, 20, 2.5, 60, 0, false],
  ['pallof', 'Pallof Press', 'kabel', ['abs'], [], 10, 15, 2.5, 60, 10, false],
  ['decline_situp', 'Sit-ups (Schrägbank)', 'kg', ['abs'], [], 10, 20, 2.5, 60, 0, false],
];
EXTRA_EXERCISES.forEach(([id, name, eq, pm, sm, repMin, repMax, inc, rest, start, barbell]) => DEFAULT_EXERCISES.push({
  id, name, muscle: REGION_OF_M[pm[0]] || 'Ganzkörper', repMin, repMax, inc, sets: 3, rest, barbell, start, pm: [...pm], sm: [...sm], eq,
}));


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
const DEFAULT_PROGRAMS = [
  { id: 'ppl', name: 'Push / Pull / Beine', perWeek: 3, days: ['push', 'pull', 'legs'] },
  { id: 'ul', name: 'Oberkörper / Unterkörper', perWeek: 4, days: ['upper', 'lower'] },
  { id: 'fb', name: 'Ganzkörper A/B', perWeek: 3, days: ['fb_a', 'fb_b'] },
  { id: 'home', name: 'Zuhause mit Kurzhanteln', perWeek: 3, days: ['home'] },
];
const mkPrograms = () => DEFAULT_PROGRAMS.map(p => ({ ...p, days: p.days.map(rid => ({ rid, wd: null })) }));
const SEED_V = 5; // Version der Standard-Daten (für Updates bestehender Daten)

const DEFAULTS = () => ({
  v: 1,
  settings: {
    gymVoice: true, autoKcal: false, pace: null,
    name: '', sex: 'm', age: 25, height: 180, activity: 1.55, goal: 'cut', goalWeight: null,
    kcal: 2200, protein: 150, carbs: 220, fat: 70, water: 2500, weeklyWorkouts: 3,
    weighDay: 1, weighTime: '08:00', bar: 20, vol: {}, focus: [],
    prog: { min: 8, max: 12, up: 12 }, // Wdh-Bereich & Steiger-Schwelle für alle Übungen
    sleepGoal: 8,
  },
  foods: [], favFoods: [], water: {}, weights: [], measures: [], prs: [],
  sleep: [], dayCheck: {}, mobility: [], // Health: Schlaf, Tages-Check, Mobility-Einheiten
  recurring: [], recApplied: {}, // regelmäßige Mahlzeiten (nach Wochentagen) + bereits eingetragene Tage
  cardio: [], mealTemplates: [], recipes: [], goals: [],
  habits: [], habitLog: {}, shopping: [], prep: [], checkins: [], tdeeHist: [], customFoods: [], weekPlan: null,
  exercises: DEFAULT_EXERCISES.map(e => ({ ...e })),
  routines: DEFAULT_ROUTINES.map(r => ({ ...r, exIds: [...r.exIds] })),
  programs: mkPrograms(), activeProgram: 'ppl',
  workouts: [], active: null,
  meta: { onboarded: false, notifiedSlot: null, seedV: SEED_V },
});

/* ---------- State ---------- */
const KEY = 'gymtracker.v1';
let S = load();
const UI = { prgRange: '3m', exMetric: 'e1rm', tab: 'today', prog: 'body', foodDate: today(), bodyRange: 90, volWeek: 0, rest: null, statsMode: 'week', statsOff: 0, statsFrom: 'today' };

function load() {
  const d = DEFAULTS();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    const st = { ...d, ...s, settings: { ...d.settings, ...s.settings }, meta: { ...d.meta, seedV: 1, ...s.meta } };
    if (st.meta.seedV < 2) { // neue Standard-Übungen & -Pläne ergänzen, ohne Eigenes zu überschreiben
      for (const e of DEFAULT_EXERCISES) if (!st.exercises.some(x => x.id === e.id)) st.exercises.push({ ...e });
      for (const r of DEFAULT_ROUTINES) {
        const ex = st.routines.find(x => x.id === r.id);
        if (ex) ex.group = ex.group || r.group; else st.routines.push({ ...r, exIds: [...r.exIds] });
      }
      st.meta.seedV = 2;
    }
    if (st.meta.seedV < 3) { // Muskeln je Übung + Trainingspläne (Programme)
      for (const e of st.exercises) if (!e.pm) {
        const mm = MUSCLE_MAP[e.id];
        e.pm = mm ? [...mm[0]] : [GROUP_MUSCLE[e.muscle] || 'chest']; e.sm = mm ? [...mm[1]] : [];
      }
      if (!s.programs) {
        st.programs = mkPrograms().map(p => ({ ...p, days: p.days.filter(d => st.routines.some(r => r.id === d.rid)) })).filter(p => p.days.length);
        const own = st.routines.filter(r => !DEFAULT_ROUTINES.some(x => x.id === r.id));
        if (own.length) st.programs.push({ id: 'own', name: 'Meine Einheiten', perWeek: 3, days: own.map(r => ({ rid: r.id, wd: null })) });
        const lastW = [...st.workouts].sort((a, b) => b.start - a.start).find(w => w.routineId);
        st.activeProgram = (lastW && st.programs.find(p => p.days.some(d => d.rid === lastW.routineId))?.id) || st.programs[0]?.id || null;
      }
      st.meta.seedV = 3;
    }
    if (st.meta.seedV < 4) { // erweiterte Übungsbibliothek + Geräte
      for (const e of DEFAULT_EXERCISES) if (!st.exercises.some(x => x.id === e.id)) st.exercises.push({ ...e, pm: [...e.pm], sm: [...e.sm] });
      for (const e of st.exercises) if (!e.eq) e.eq = EQ_OF[e.id] || 'other';
      st.meta.seedV = 4;
    }
    if (st.meta.seedV < 5) { // Progression: alle Übungen nutzen den Bereich aus den Einstellungen
      for (const e of st.exercises) e.ownRange = false;
      st.meta.seedV = 5;
    }
    for (const x of st.customFoods || []) delete x.barcode; // Barcode-Funktion entfernt
    return st;
  } catch (e) { console.warn('Laden fehlgeschlagen', e); return d; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('⚠ Speichern fehlgeschlagen – Speicher voll?'); }
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
function closeSheet() { stopCam(); $('#sheet').classList.add('hidden'); $('#sheet .sheet-panel').innerHTML = ''; }
const sheetOpen = () => !$('#sheet').classList.contains('hidden');

function ring(pct, color, label, sub) {
  const r = 54, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<div class="ring"><svg viewBox="0 0 120 120"><defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent-hi)"/><stop offset="1" style="stop-color:var(--accent-lo)"/></linearGradient></defs>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="5"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" style="transition:stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)"/></svg>
    <div class="c"><div><b>${label}</b><span>${sub}</span></div></div></div>`;
}
function bar(label, val, goal, color, unit = 'g') {
  const pct = goal ? val / goal : 0;
  return `<div class="bar"><div class="lbl"><span>${label}</span><span><b>${fmt(val)}</b> / ${fmt(goal)} ${unit}</span></div>
    <div class="track ${pct > 1.1 ? 'over' : ''}"><i style="width:${Math.min(100, pct * 100)}%;background:${color}"></i></div></div>`;
}

/* Kleines SVG-Liniendiagramm. series: [{pts:[[ms,y]], color, dash, dots}] */
let CHART_ID = 0;
function lineChart(series, { h = 150, goal = null, unit = '', fy = null } = {}) {
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
    g += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${pl - 5}" y="${sy(v) + 3}" text-anchor="end">${fy ? fy(v) : fmt(v, Math.abs(y1 - y0) < 10 ? 1 : 0)}</text>`;
  }
  if (goal != null) g += `<line x1="${pl}" x2="${W - pr}" y1="${sy(goal)}" y2="${sy(goal)}" stroke="var(--accent)" stroke-dasharray="4 4" opacity=".7"/><text x="${W - pr}" y="${sy(goal) - 4}" text-anchor="end" style="fill:var(--accent)">Ziel ${fmt(goal, 1)}${unit}</text>`;
  const dl = ms => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  g += `<text x="${pl}" y="${H - 4}">${dl(x0)}</text><text x="${W - pr}" y="${H - 4}" text-anchor="end">${dl(x1)}</text>`;
  for (const s of series) {
    if (!s.pts.length) continue;
    const d = s.pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join('');
    if (s.area) { const gid = 'lg' + (++CHART_ID), base = (H - pb).toFixed(1); g += `<defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".26"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs><path d="${d}L${sx(s.pts.at(-1)[0]).toFixed(1)} ${base}L${sx(s.pts[0][0]).toFixed(1)} ${base}Z" fill="url(#${gid})"/>`; }
    if (s.zero != null && s.zero > y0 && s.zero < y1) g += `<line x1="${pl}" x2="${W - pr}" y1="${sy(s.zero)}" y2="${sy(s.zero)}" stroke="rgba(255,255,255,.18)" stroke-dasharray="3 4"/>`;
    g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}" ${s.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.dots) g += s.pts.map(p => `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="3" fill="${s.color}"/>`).join('');
    if (s.marks) g += s.marks.map(p => `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="5" fill="var(--bg)" stroke="var(--accent-hi)" stroke-width="2.2"/>`).join('');
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function barChart(vals, labels, { h = 110, goal = null, color = 'var(--accent)', under = null, fv = v => v } = {}) {
  const W = 340, H = h, pb = 18, pt = 16, max = Math.max(1, goal || 0, ...vals);
  const bw = (W - 10) / vals.length;
  let g = '';
  vals.forEach((v, i) => {
    const bh = (H - pb - pt) * v / max, x = 5 + i * bw + bw * 0.18;
    g += `<rect x="${x}" y="${H - pb - bh}" width="${bw * 0.64}" height="${Math.max(bh, 2)}" rx="4" fill="${goal && v >= goal ? color : v && under ? under : 'var(--card2)'}" ${goal && v >= goal || (v && under) ? '' : 'stroke="var(--line)"'}/>`;
    g += `<text x="${x + bw * 0.32}" y="${H - 5}" text-anchor="middle">${labels[i]}</text>`;
    if (v) g += `<text x="${x + bw * 0.32}" y="${H - pb - bh - 3}" text-anchor="middle" style="fill:var(--text)">${fv(v)}</text>`;
  });
  if (goal) { const y = H - pb - (H - pb - pt) * goal / max; g += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="var(--accent)" stroke-dasharray="4 4" opacity=".5"/>`; }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

/* ---------- Ernährung ---------- */
function dayTotals(date, mode) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const x of S.foods) if (x.date === date && (mode === 'all' || !x.planned === (mode !== 'plan'))) { t.kcal += x.kcal; t.p += x.p; t.c += x.c; t.f += x.f; }
  return t;
}
// Neuer Essens-Eintrag: in der Zukunft immer geplant, heute optional geplant
function pushFood(e, plan) {
  const x = { ...e }; delete x.planned; delete x.fromPlan;
  if (plan || x.date > today()) { x.planned = true; x.fromPlan = true; }
  S.foods.push(x);
}
const eaten = f => !f.planned;
/* ---------- Regelmäßige Mahlzeiten (z.B. jeden Tag Kaffee, mittwochs Döner) ---------- */
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0], WD_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
function daysTxt(days) {
  const s = [...new Set(days)];
  if (s.length === 7) return 'Täglich';
  if (s.length === 5 && [1, 2, 3, 4, 5].every(d => s.includes(d))) return 'Mo–Fr';
  if (s.length === 2 && s.includes(0) && s.includes(6)) return 'Wochenende';
  return WD_ORDER.filter(d => s.includes(d)).map(d => WD_SHORT[d]).join(', ');
}
// trägt die passenden Regeln für einen Tag ein (jede Regel höchstens einmal pro Tag, nie rückwirkend)
function applyRecurring(d) {
  if (!S.recurring?.length || d < today()) return false;
  const done = (S.recApplied ||= {})[d] ||= [], wd = parseYmd(d).getDay();
  let ch = false;
  for (const r of S.recurring) {
    if (r.paused || !r.days.includes(wd) || done.includes(r.id) || (r.mode === 'auto' && d > today())) continue;
    pushFood({ id: uid(), date: d, meal: MEALS[r.meal] ? r.meal : fitMeal(r.meal), name: r.name, kcal: r.kcal, p: r.p, c: r.c, f: r.f, g: r.g || null, ts: Date.now(), recId: r.id }, r.mode !== 'auto');
    done.push(r.id); ch = true;
  }
  return ch;
}
function applyRecurringAll() {
  if (!S.recurring?.length) return;
  const t = today(); let ch = false;
  for (const d of new Set([t, addDays(t, 1), UI.foodDate])) ch = applyRecurring(d) || ch;
  for (const d of Object.keys(S.recApplied || {})) if (d < addDays(t, -2)) { delete S.recApplied[d]; ch = true; }
  if (ch) save();
}
// Regel geändert/gelöscht: noch offene (geplante) Einträge ab heute entfernen, damit sie neu passend eingetragen werden
function resetRecurring(id) {
  const t = today();
  S.foods = S.foods.filter(f => !(f.recId === id && f.date >= t && f.planned));
  for (const [d, ids] of Object.entries(S.recApplied || {})) if (d >= t && !S.foods.some(f => f.recId === id && f.date === d)) S.recApplied[d] = ids.filter(x => x !== id);
}
const plannedOpen = d => S.foods.filter(f => f.date === d && f.planned);
const PLAN_DAYS = 7;
function dayLabel(d) {
  return d === today() ? 'Heute' : d === addDays(today(), -1) ? 'Gestern' : d === addDays(today(), 1) ? 'Morgen' : fmtDate(d, { weekday: 'short', day: '2-digit', month: '2-digit' });
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
    return { cls: 'accent', t: `Perfektes Tempo! ${r} – weiter so.` };
  }
  if (g === 'bulk') {
    if (rate < 0.05) return { cls: 'warn', t: `Kaum Zunahme (${r}). Iss ca. 150–200 kcal mehr pro Tag.` };
    if (pct > 0.5) return { cls: 'warn', t: `Du nimmst schnell zu (${r}) – wahrscheinlich viel Fett. Reduziere ca. 150 kcal.` };
    return { cls: 'accent', t: `Sauberer Aufbau: ${r}.` };
  }
  if (Math.abs(rate) > 0.25) return { cls: 'warn', t: `Dein Gewicht verändert sich (${r}). Passe die Kalorien um ~150 kcal an.` };
  return { cls: 'accent', t: `Gewicht stabil (${r}).` };
}

/* ---------- Training & Progression ---------- */
function exHistory(exId) { // neueste zuerst
  const out = [];
  for (const w of [...S.workouts].sort((a, b) => b.start - a.start))
    for (const e of w.entries) if (e.exId === exId && WK(e.sets).length) out.push({ date: w.date, start: w.start, sets: WK(e.sets), target: e.target });
  return out;
}
function workSets(sess) { const wk = Math.max(...sess.sets.map(s => s.w || 0)); return { wk, sets: sess.sets.filter(s => (s.w || 0) === wk) }; }

// Wdh-Bereich einer Übung: aus den Einstellungen – außer die Übung hat einen eigenen
function RR(ex) {
  if (ex?.ownRange) return { min: ex.repMin, max: ex.repMax, up: ex.upAt || ex.repMax };
  const p = S.settings.prog || { min: 8, max: 12, up: 12 };
  return { min: p.min, max: p.max, up: p.up || p.max };
}
/*
 * Progression – es geht immer vorwärts, kein Deload:
 *  - Letzte Einheit in allen Arbeitssätzen ≥ „Steigern ab“-Wdh → Gewicht + Steigerung, Wdh zurück auf den Bereichsanfang
 *  - sonst: gleiches Gewicht, je Satz +1 Wdh (bis zur Steiger-Schwelle)
 */
function suggest(ex) {
  const h = exHistory(ex.id), R = RR(ex);
  const bw = !ex.start && !ex.barbell;
  const kg = w => (bw && w === 0 ? 'Körpergewicht' : `${fmt(w, 2)} kg${bw ? ' Zusatz' : ''}`);
  if (!h.length) return { w: ex.start || 0, reps: Array(ex.sets).fill(R.min), last: null, bw, status: 'new', badge: 'Erstes Mal', text: `Wähle ein Gewicht, das du sauber ${R.min}–${R.max}× schaffst.` };
  const a = workSets(h[0]), need = h[0].target || ex.sets;
  const last = { w: a.wk, reps: a.sets.map(s => s.r) };
  const next = roundTo(a.wk + ex.inc, 0.25);
  if (a.sets.length >= need && a.sets.slice(0, need).every(s => s.r >= R.up))
    return { w: next, reps: Array(ex.sets).fill(R.min), last, bw, status: 'up', badge: `+${fmt(ex.inc, 2)} kg`, text: `Letztes Mal alle Sätze mit ${R.up}+ Wdh. → heute mehr Gewicht, Wdh. wieder ab ${R.min}.` };
  const reps = Array.from({ length: ex.sets }, (_, i) => Math.min(R.up, Math.max(1, (a.sets[i]?.r ?? a.sets.at(-1).r) + 1)));
  const more = reps.some((r, i) => a.sets[i] && r > a.sets[i].r);
  return { w: a.wk, reps, last, bw, status: 'reps', badge: more ? '+1 Wdh.' : 'Alle Sätze', text: more ? `Gleiches Gewicht, je Satz +1 Wdh. Mit ${R.up} Wdh. in allen Sätzen geht's auf ${kg(next)}.` : `Schaff alle ${need} Sätze mit ${R.up} Wdh. – dann geht's auf ${kg(next)}.` };
}
// „Letztes Mal → Heute“-Anzeige
const repsTxt = r => (r.length > 1 && r.every(x => x === r[0]) ? `${r.length}×${r[0]}` : r.join('/'));
function progBox(s, compact) {
  const kg = w => (s.bw && !w ? 'KG' : `${fmt(w, 2)} kg`);
  return `<div class="prog ${s.status}${compact ? ' compact' : ''}">
    <div class="pcol"><span class="label">Letztes Mal</span><b>${s.last ? `${kg(s.last.w)} · ${repsTxt(s.last.reps)}` : '–'}</b></div>
    <div class="parrow">→</div>
    <div class="pcol"><span class="label">Heute</span><b>${kg(s.w)} · ${repsTxt(s.reps)}</b></div>
    <span class="pbadge">${s.status === 'up' ? '⬆ ' : ''}${s.badge}</span></div>`;
}
/* ---------- Progressions-Diagramme ---------- */
const PRG_RANGES = [['1m', '4 W', 28], ['3m', '3 M', 91], ['6m', '6 M', 182], ['all', 'Alles', null]];
const PRG_METRICS = [['e1rm', 'Geschätztes 1RM', 'kg'], ['top', 'Top-Gewicht', 'kg'], ['vol', 'Volumen', 'kg'], ['reps', 'Wiederholungen', 'Wdh']];
const isBW = ex => !ex.start && !ex.barbell && !exHistory(ex.id).some(x => x.sets.some(s => s.w > 0));
const prgFrom = () => { const d = PRG_RANGES.find(r => r[0] === UI.prgRange)?.[2]; return d ? Date.now() - d * 864e5 : 0; };
function sessVal(x, m) {
  const s = x.sets;
  if (m === 'top') return Math.max(...s.map(z => z.w || 0));
  if (m === 'vol') return s.reduce((a, z) => a + (z.w || 0) * z.r, 0);
  if (m === 'reps') return s.reduce((a, z) => a + z.r, 0);
  return Math.max(...s.map(z => (z.w ? e1rm(z.w, z.r) : 0))); // e1rm
}
// Punkte einer Übung im Zeitraum (ältester zuerst) + Rekordpunkte
function exPoints(exId, m, from = prgFrom()) {
  const all = exHistory(exId).slice().reverse().map(x => [x.start, Math.round(sessVal(x, m) * 10) / 10]).filter(p => p[1] > 0);
  let best = -Infinity; const marks = [];
  for (const p of all) { if (p[1] > best) { if (best > -Infinity && p[0] >= from) marks.push(p); best = p[1]; } }
  const pts = all.filter(p => p[0] >= from);
  const before = all.filter(p => p[0] < from).at(-1); // Ausgangswert vor dem Zeitraum
  return { pts, marks, base: before ? before[1] : pts[0]?.[1], all };
}
function chg(base, last) { if (!base || last == null) return null; return { abs: last - base, pct: (last / base - 1) * 100 }; }
const pctTxt = p => (p == null ? '–' : `${p > 0 ? '+' : p < 0 ? '−' : '±'}${fmt(Math.abs(p), Math.abs(p) < 10 ? 1 : 0)} %`);
const pctCls = p => (p == null ? '' : p > 0.5 ? 'up' : p < -0.5 ? 'down' : '');
const rangeChips = (act, extra = '') => `<div class="chips prg-chips">${PRG_RANGES.map(([k, l]) => `<button class="chip ${UI.prgRange === k ? 'on' : ''}" data-act="${act}" ${extra} data-k="${k}">${l}</button>`).join('')}</div>`;
// Detail-Diagramm einer Übung
function exProgHtml(id) {
  const ex = exById(id); if (!ex) return '';
  const bw = isBW(ex), metrics = bw ? PRG_METRICS.filter(m => m[0] === 'reps') : PRG_METRICS;
  if (!metrics.some(m => m[0] === UI.exMetric)) UI.exMetric = metrics[0][0];
  const [mk, ml, unit] = PRG_METRICS.find(m => m[0] === UI.exMetric);
  const { pts, marks, base } = exPoints(id, mk), last = pts.at(-1)?.[1], c = chg(base, last);
  const best = Math.max(0, ...exPoints(id, mk, 0).all.map(p => p[1]));
  return `${metrics.length > 1 ? `<div class="chips prg-chips">${metrics.map(([k, l]) => `<button class="chip ${UI.exMetric === k ? 'on' : ''}" data-act="exMetric" data-id="${id}" data-k="${k}">${l}</button>`).join('')}</div>` : ''}
    ${rangeChips('exRange', `data-id="${id}"`)}
    <div class="grid3" style="margin:12px 0 6px">
      <div class="stat"><b>${base != null ? fmt(base, 1) : '–'}</b><span>Start (${unit})</span></div>
      <div class="stat"><b>${last != null ? fmt(last, 1) : '–'}</b><span>Zuletzt (${unit})</span></div>
      <div class="stat"><b class="${c ? (c.abs > 0 ? 'up' : c.abs < 0 ? 'down' : '') : ''}">${c ? `${c.abs > 0 ? '+' : ''}${fmt(c.abs, 1)}` : '–'}</b><span>${c ? pctTxt(c.pct) : 'Veränderung'}</span></div>
    </div>
    ${lineChart([{ pts, color: 'var(--accent)', dots: pts.length <= 24, area: true, marks }], { h: 170 })}
    <div class="small muted" style="margin-top:6px">${ml}${mk === 'e1rm' ? ' (aus Gewicht × Wdh geschätzt)' : mk === 'vol' ? ' pro Einheit (kg × Wdh)' : mk === 'reps' ? ' pro Einheit' : ' pro Einheit'} · ◯ = neuer Rekord · Bestwert ${fmt(best, 1)} ${unit}</div>`;
}
// Plan-Fortschritt: Kraft-Index (Ø Veränderung des 1RM aller Plan-Übungen) + Volumen pro Woche
function planProgress(pg) {
  const days = programDays(pg), rids = new Set(days.map(d => d.r.id));
  let ids = [...new Set(days.flatMap(d => d.r.exIds))].filter(id => exById(id) && exHistory(id).length);
  if (!ids.length) ids = [...new Set(S.workouts.flatMap(w => w.entries.map(e => e.exId)))].filter(id => exById(id));
  const from = prgFrom() || Math.min(...S.workouts.map(w => w.start), Date.now());
  const ex = ids.map(id => { const e = exById(id), m = isBW(e) ? 'reps' : 'e1rm', p = exPoints(id, m, from); return { id, e, m, ...p, c: chg(p.base, p.pts.at(-1)?.[1]) }; });
  // Wochen im Zeitraum
  const inPlan = w => !rids.size || rids.has(w.routineId);
  const first = Math.max(from, Math.min(...S.workouts.filter(inPlan).map(w => w.start), Date.now())); // leere Wochen vor dem ersten Training weglassen
  const weeks = []; for (let t = weekStart(new Date(first)).getTime(); t <= Date.now(); t += 7 * 864e5) weeks.push(t);
  const idx = weeks.map(ws => {
    const we = ws + 7 * 864e5, v = ex.map(x => { if (!x.base) return null; const p = x.all.filter(q => q[0] < we).at(-1); return p ? (p[1] / x.base - 1) * 100 : null; }).filter(z => z != null);
    return v.length ? [Math.min(we, Date.now()), Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10] : null;
  }).filter(Boolean);
  const vol = weeks.map(ws => S.workouts.filter(w => w.start >= ws && w.start < ws + 7 * 864e5 && inPlan(w)).reduce((a, w) => a + w.entries.reduce((b, e) => b + WK(e.sets).reduce((c, s) => c + (s.w || 0) * s.r, 0), 0), 0));
  const nW = S.workouts.filter(w => w.start >= from && inPlan(w)).length;
  const valid = ex.filter(x => x.c), avg = valid.length ? valid.reduce((a, x) => a + x.c.pct, 0) / valid.length : null;
  return { ex, idx, weeks, vol, nW, avg, n: valid.length };
}
function planProgressCard() {
  if (!S.workouts.length) return '';
  const pg = activeProgram(), P = planProgress(pg);
  const vw = P.vol.slice(-12), vl = P.weeks.slice(-12).map(t => 'KW' + isoWeek(new Date(t)));
  const full = P.weeks.at(-1) + 7 * 864e5 > Date.now() ? P.vol.slice(0, -1) : P.vol; // laufende Woche ist noch unvollständig
  const half = Math.floor(full.length / 2), a1 = full.slice(0, half), a2 = full.slice(half);
  const vc = a1.length && a2.length && a1.some(Boolean) ? chg(a1.reduce((a, b) => a + b, 0) / a1.length, a2.reduce((a, b) => a + b, 0) / a2.length) : null;
  return `<h3>Fortschritt${pg ? ` · ${esc(pg.name)}` : ''}</h3>
  <div class="card">
    <div class="card-head"><span class="label">Kraft-Index</span>${rangeChips('prgRange')}</div>
    <div class="prg-big"><b class="${pctCls(P.avg)}">${pctTxt(P.avg)}</b><span>Ø Kraftzuwachs von ${P.n} Übung${P.n === 1 ? '' : 'en'}${pg ? ' im Plan' : ''}</span></div>
    ${P.idx.length >= 2 ? lineChart([{ pts: P.idx, color: 'var(--accent)', area: true, dots: P.idx.length <= 16, zero: 0 }], { h: 150, fy: v => `${v > 0 ? '+' : ''}${fmt(v)} %` }) : '<div class="empty small">Noch zu wenig Trainings im Zeitraum – nach ein paar Einheiten erscheint hier deine Kurve.</div>'}
    <div class="small muted" style="margin-top:6px">Durchschnittliche Veränderung des geschätzten 1RM (bei Körpergewichts-Übungen: Wiederholungen) gegenüber dem Start des Zeitraums.</div>
    <div class="hr"></div>
    <div class="card-head"><span class="label">Volumen pro Woche</span><span class="pill ${pctCls(vc?.pct)}">${vc ? pctTxt(vc.pct) : '–'}</span></div>
    ${barChart(vw.map(v => Math.round(v / 100) / 10), vl, { color: 'var(--accent)', under: 'var(--accent-lo)', fv: v => String(v).replace('.', ',') })}
    <div class="small muted" style="margin-top:4px">In Tonnen (Gewicht × Wdh) · ${P.nW} Training${P.nW === 1 ? '' : 's'} im Zeitraum${vc ? ' · Veränderung: 2. vs. 1. Hälfte des Zeitraums, ohne die laufende Woche' : ''}</div>
  </div>
  <div class="list prg-list">${P.ex.slice(0, UI.prgAll ? 99 : 6).map(x => `<div class="item tap" data-act="openExercise" data-id="${x.id}"><div class="t"><b>${esc(x.e.name)}</b>
      <span>${x.pts.length ? `${x.m === 'reps' ? `${fmt(x.pts.at(-1)[1])} Wdh` : `1RM ${fmt(x.pts.at(-1)[1], 1)} kg`} · ${x.pts.length}×` : 'nicht im Zeitraum'}</span></div>
      <div class="prg-spark">${sparkline(x.pts.map(p => p[1]), { w: 90, h: 30 })}</div><span class="pill ${pctCls(x.c?.pct)}">${x.c ? pctTxt(x.c.pct) : '–'}</span></div>`).join('')}</div>
  ${P.ex.length > 6 ? `<button class="btn sm ghost block" style="margin-top:8px" data-act="prgAll">${UI.prgAll ? 'Weniger anzeigen' : `Alle ${P.ex.length} Übungen anzeigen`}</button>` : ''}`;
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
function newEntry(ex, n = ex.sets) {
  const s = suggest(ex);
  return { exId: ex.id, sets: Array.from({ length: n }, (_, i) => ({ w: s.w, r: null, t: s.reps[i] ?? s.reps.at(-1), done: false })) };
}
function startWorkout(routineId) {
  if (S.active) { UI.tab = 'train'; render(); return; }
  const r = S.routines.find(x => x.id === routineId);
  S.active = {
    id: uid(), name: r ? r.name : 'Freies Training', routineId: r?.id || null, start: Date.now(), date: today(),
    entries: r ? r.exIds.map(exById).filter(Boolean).map(ex => { const e = newEntry(ex, daySets(r, ex)); if (r.warm?.[ex.id]) e.sets.unshift(...warmupSets(ex, e.sets[0]?.w)); return e; }) : [],
  };
  save(); UI.tab = 'train'; render(); window.scrollTo(0, 0);
}

/* ---------- Muskeln & Wochenvolumen ---------- */
// [id, Name, Region, Standard-Ziel min, max (harte Sätze pro Woche)]
const MUSCLE_LIST = [
  ['chest', 'Brust', 'Brust', 10, 20],
  ['lats', 'Latissimus', 'Rücken', 10, 20], ['upperback', 'Oberer Rücken', 'Rücken', 10, 20], ['lowerback', 'Unterer Rücken', 'Rücken', 4, 10],
  ['frontdelt', 'Vordere Schulter', 'Schultern', 4, 12], ['sidedelt', 'Seitliche Schulter', 'Schultern', 8, 20], ['reardelt', 'Hintere Schulter', 'Schultern', 6, 16],
  ['biceps', 'Bizeps', 'Arme', 8, 16], ['triceps', 'Trizeps', 'Arme', 8, 16], ['forearms', 'Unterarme', 'Arme', 2, 10],
  ['quads', 'Quadrizeps', 'Beine', 10, 20], ['hams', 'Beinbeuger', 'Beine', 8, 16], ['glutes', 'Po', 'Beine', 8, 16], ['calves', 'Waden', 'Beine', 8, 16],
  ['abs', 'Bauch', 'Bauch', 6, 16],
];
const MUSCLE = Object.fromEntries(MUSCLE_LIST.map(([id, name, region, mn, mx]) => [id, { id, name, region, def: [mn, mx] }]));
const REGIONS = ['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine', 'Bauch'];
const mName = m => MUSCLE[m]?.name || m;
const muscleText = ex => (ex.pm || []).map(mName).join(', ') + ((ex.sm || []).length ? ` · Hilfsm.: ${ex.sm.map(mName).join(', ')}` : '');
const isFocus = m => (S.settings.focus || []).includes(m);
const baseTarget = m => S.settings.vol?.[m] || MUSCLE[m].def;
const effTarget = m => { const [a, b] = baseTarget(m); return isFocus(m) ? [Math.round(a * 1.3), Math.round(b * 1.3)] : [a, b]; };
const volStatus = (v, [mn, mx]) => (v <= 0 ? 'none' : v < mn ? 'low' : v <= mx ? 'ok' : 'high');
const STATUS_TXT = { none: '—', low: 'zu wenig', ok: 'im Ziel', high: 'viel' };

function emptyVol() { return Object.fromEntries(MUSCLE_LIST.map(([m]) => [m, 0])); }
function addVol(vol, ex, n) {
  for (const m of ex.pm || []) vol[m] = (vol[m] || 0) + n;
  for (const m of ex.sm || []) vol[m] = (vol[m] || 0) + n / 2;
}
function weekVolume(d) { // Hauptmuskel = 1 Satz, Hilfsmuskel = ½ Satz
  const ws = weekStart(d).getTime(), we = ws + 7 * 864e5, vol = emptyVol();
  for (const w of S.workouts) if (w.start >= ws && w.start < we)
    for (const e of w.entries) { const ex = exById(e.exId); if (ex) addVol(vol, ex, WK(e.sets).length); }
  return vol;
}
const daySets = (r, ex) => r.sets?.[ex.id] ?? ex.sets;
function programDays(pg) { return (pg?.days || []).map(d => ({ ...d, r: S.routines.find(r => r.id === d.rid) })).filter(d => d.r); }
function plannedVolume(pg) {
  const vol = emptyVol(), days = programDays(pg);
  const sched = days.some(d => d.wd != null);
  for (const d of days) {
    const w = sched ? (d.wd != null ? 1 : 0) : (pg.perWeek || 3) / days.length;
    for (const id of d.r.exIds) { const ex = exById(id); if (ex) addVol(vol, ex, daySets(d.r, ex) * w); }
  }
  return vol;
}
const activeProgram = () => S.programs.find(p => p.id === S.activeProgram) || null;
function programMeta(pg) {
  const days = programDays(pg), sched = days.some(d => d.wd != null);
  const direct = days.reduce((a, d) => a + d.r.exIds.reduce((b, id) => { const ex = exById(id); return b + (ex ? daySets(d.r, ex) : 0); }, 0) * (sched ? (d.wd != null ? 1 : 0) : (pg.perWeek || 3) / days.length), 0);
  return `${days.length} Tag${days.length === 1 ? '' : 'e'} · ${sched ? days.filter(d => d.wd != null).sort((a, b) => ((a.wd + 6) % 7) - ((b.wd + 6) % 7)).map(d => DAYS[d.wd].slice(0, 2)).join('/') : `${pg.perWeek || 3}× pro Woche`} · ~${fmt(direct)} Sätze/Woche`;
}
function nextDay() {
  const pg = activeProgram(), days = programDays(pg);
  if (!days.length) return S.routines[0] ? { r: S.routines[0] } : null;
  const wdToday = new Date().getDay();
  if (days.some(d => d.wd != null)) {
    const doneToday = S.workouts.some(w => w.date === today() && days.some(d => d.rid === w.routineId));
    for (let i = doneToday ? 1 : 0; i <= 7; i++) {
      const d = days.find(x => x.wd === (wdToday + i) % 7);
      if (d) return { r: d.r, wd: d.wd, inDays: i };
    }
  }
  const last = [...S.workouts].sort((a, b) => b.start - a.start).find(w => days.some(d => d.rid === w.routineId));
  if (!last) return { r: days[0].r };
  const i = days.findIndex(d => d.rid === last.routineId);
  return { r: days[(i + 1) % days.length].r };
}
function weakPoints() { // Ø der letzten 4 abgeschlossenen Trainingswochen
  const weeks = [1, 2, 3, 4].map(i => { const d = new Date(); d.setDate(d.getDate() - 7 * i); return weekVolume(d); })
    .filter(v => Object.values(v).some(x => x > 0));
  const plan = plannedVolume(activeProgram());
  const src = weeks.length ? 'hist' : Object.values(plan).some(x => x > 0) ? 'plan' : null;
  if (!src) return null;
  const avg = m => (src === 'hist' ? weeks.reduce((a, w) => a + w[m], 0) / weeks.length : plan[m]);
  const list = MUSCLE_LIST.map(([m]) => ({ m, v: avg(m), t: effTarget(m) })).filter(x => x.v < x.t[0])
    .sort((a, b) => (isFocus(b.m) - isFocus(a.m)) || (a.v / a.t[0]) - (b.v / b.t[0]));
  return { src, n: weeks.length, list };
}
function bestExerciseFor(m) {
  const done = new Set(S.workouts.flatMap(w => w.entries.map(e => e.exId)));
  return S.exercises.filter(e => (e.pm || []).includes(m))
    .sort((a, b) => (done.has(b.id) - done.has(a.id)) || (a.pm.length - b.pm.length))[0] || null;
}

function vbar(v, [mn, mx], plan = null) {
  const top = Math.max(mx * 1.25, v, plan || 0, 1), pct = x => Math.min(100, x / top * 100);
  return `<div class="vbar"><div class="zone" style="left:${pct(mn)}%;width:${pct(mx) - pct(mn)}%"></div>
    <i class="${volStatus(v, [mn, mx])}" style="width:${pct(v)}%"></i>${plan != null ? `<b class="plan" style="left:${pct(plan)}%"></b>` : ''}</div>`;
}

/* ---------- Körpermodell: anatomische Figur aus deinen Körperwerten ---------- */
const BODY_PRESETS = {
  slim: { label: 'Schlank', bmi: 20.5, musc: 0.94, bf: 11 },
  athletic: { label: 'Athletisch', bmi: 23.5, musc: 1.07, bf: 12 },
  muscular: { label: 'Muskulös', bmi: 27, musc: 1.18, bf: 13 },
  heavy: { label: 'Kräftig', bmi: 31, musc: 1.02, bf: 28 },
};
const BODY_SLIDERS = [['sh', 'Schultern'], ['ch', 'Brust / Oberkörper'], ['wa', 'Taille / Bauch'], ['hi', 'Hüfte'], ['ar', 'Arme'], ['le', 'Oberschenkel'], ['ca', 'Waden']];
const MEASURE_KEYS = ['shoulders', 'chest', 'waist', 'hip', 'arm', 'thigh', 'calf'];
const bodyCfg = () => ({ mode: 'auto', preset: 'athletic', adj: {}, bfAdj: 0, ...(S.settings.body || {}) });

// Umfänge (cm) aus BMI schätzen (Näherungen), skaliert mit der Körpergröße
function estimateBody(sex, bmi, age, h) {
  const m = sex !== 'f', hs = Math.pow(h / (m ? 178 : 165), 0.6);
  const e = m
    ? { chest: 1.9 * bmi + 57, waist: 2.4 * bmi + 26, hip: 1.6 * bmi + 62, arm: 0.9 * bmi + 11, thigh: 1.3 * bmi + 27, calf: 0.45 * bmi + 27, bf: 1.2 * bmi + 0.23 * age - 16.2 }
    : { chest: 1.7 * bmi + 52, waist: 2.3 * bmi + 22, hip: 2.0 * bmi + 55, arm: 0.85 * bmi + 8.5, thigh: 1.5 * bmi + 25, calf: 0.45 * bmi + 25, bf: 1.2 * bmi + 0.23 * age - 5.4 };
  for (const k of ['chest', 'waist', 'hip', 'arm', 'thigh', 'calf']) e[k] *= hs;
  e.shoulders = e.chest * (m ? 1.13 : 1.06);
  e.bf = Math.max(m ? 6 : 13, e.bf);
  return e;
}
// Datenquelle für die Figur: 'latest' (jetzt) oder 'first' (Start)
function bodySource(which = 'latest', forceMode) {
  const st = S.settings, b = bodyCfg(), sex = st.sex === 'f' ? 'f' : 'm';
  const h = st.height || (sex === 'f' ? 168 : 180), age = st.age || 30;
  const mode = forceMode || b.mode;
  if (mode === 'preset') {
    const p = BODY_PRESETS[b.preset] || BODY_PRESETS.athletic;
    const e = estimateBody(sex, p.bmi, age, h);
    for (const k of ['chest', 'shoulders', 'arm', 'thigh', 'calf']) e[k] *= p.musc;
    const srcs = Object.fromEntries(MEASURE_KEYS.map(k => [k, 'Vorlage']));
    return { sex, h, kg: p.bmi * (h / 100) ** 2, c: e, bf: p.bf + (sex === 'f' ? 8 : 0), srcs, mode };
  }
  const ws = [...S.weights].sort((x, y) => x.date.localeCompare(y.date));
  const w = which === 'first' ? ws[0] : ws.at(-1);
  const kg = w?.kg ?? (sex === 'f' ? 62 : 78) * (h / (sex === 'f' ? 165 : 178)) ** 2;
  const bmi = kg / (h / 100) ** 2;
  const est = estimateBody(sex, bmi, age, h);
  const ms = [...S.measures].sort((x, y) => x.date.localeCompare(y.date));
  const pick = k => { const arr = ms.filter(m => m[k] != null); const m = which === 'first' ? arr[0] : arr.at(-1); return m ? m[k] : null; };
  const c = {}, srcs = {};
  for (const k of MEASURE_KEYS) {
    const v = pick(k);
    c[k] = v ?? est[k]; srcs[k] = v != null ? 'gemessen' : 'geschätzt';
  }
  if (srcs.shoulders === 'geschätzt' && srcs.chest === 'gemessen') c.shoulders = c.chest * (sex === 'f' ? 1.06 : 1.13);
  const bfM = pick('bf');
  return { sex, h, kg, bmi, c, bf: bfM ?? est.bf, bfSrc: bfM != null ? 'gemessen' : 'geschätzt', srcs, date: w?.date, mode };
}
// Umfänge → Geometrie der Figur (Einheiten: Figur ist ~395 hoch, Mitte x = 100)
function bodyParams(src, useAdj = true) {
  const b = bodyCfg(), A = useAdj ? b.adj || {} : {}, a = k => A[k] ?? 1;
  const u = 395 / src.h, c = src.c, cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const bf = cl(src.bf + (useAdj ? b.bfAdj || 0 : 0), 4, 50);
  const P = {
    sex: src.sex, bf,
    shoulderW: cl(c.shoulders / 5.0 * u * a('sh'), 34, 72),
    chestW: cl(c.chest / 6.2 * u * a('ch'), 24, 60),
    waistW: cl(c.waist / (src.sex === 'f' ? 6.1 : 5.8) * u * a('wa'), 18, 64),
    hipW: cl(c.hip / (src.sex === 'f' ? 5.25 : 5.6) * u * a('hi'), 24, 62),
    ua: cl(c.arm / 6.28 * u * a('ar'), 6, 20),
    thigh: cl(c.thigh / 6.28 * u * a('le'), 11, 30),
    calf: cl(c.calf / 6.28 * u * a('ca'), 7, 19),
  };
  P.shoulderW = Math.min(72, Math.max(P.shoulderW, P.chestW + P.ua * 1.6));
  P.fa = P.ua * 0.86;
  P.neck = cl(7.6 + (P.chestW - 34) * 0.16, 6.6, 12);
  // Arme
  P.armTop = Math.max(P.shoulderW - P.ua * 0.95, P.chestW + P.ua * 0.7);
  P.elbow = Math.max(P.armTop + 2, P.waistW + P.ua * 0.72 + 1.5, P.chestW * 0.92 + P.ua * 0.6);
  P.wrist = Math.max(P.elbow + 2.5, P.hipW + P.fa * 0.62 + 1.5);
  P.arm = [[64, P.armTop - 1, P.ua * 0.85], [80, P.armTop, P.ua * 1.02], [102, P.armTop + (P.elbow - P.armTop) * 0.4, P.ua], [128, P.armTop + (P.elbow - P.armTop) * 0.8, P.ua * 0.92],
    [152, P.elbow, P.ua * 0.72], [170, P.elbow + (P.wrist - P.elbow) * 0.25, P.fa], [196, P.elbow + (P.wrist - P.elbow) * 0.62, P.fa * 0.8],
    [220, P.wrist, P.fa * 0.5], [234, P.wrist + 0.6, P.fa * 0.66], [252, P.wrist + 1.2, P.fa * 0.4]];
  // Beine
  P.legCx = Math.max(P.hipW - P.thigh, P.thigh * 0.88 + 0.5);
  P.kneeH = Math.max(P.thigh * 0.56, P.calf * 0.78);
  P.kneeCx = Math.max(P.legCx * 0.8, P.kneeH + 1.2);
  P.ankleCx = Math.max(P.kneeCx * 0.88, 6.5);
  P.leg = [[198, P.legCx, P.thigh * 1.04], [228, P.legCx, P.thigh], [262, (P.legCx + P.kneeCx) / 2, P.thigh * 0.84], [298, P.kneeCx, P.kneeH],
    [316, P.kneeCx, P.calf * 0.9], [334, P.kneeCx * 0.98, P.calf], [360, P.kneeCx * 0.4 + P.ankleCx * 0.6, P.calf * 0.66],
    [380, P.ankleCx, 5], [389, P.ankleCx + 1.5, 6.4], [397, P.ankleCx + 2.6, 4.6]];
  // Definition: je weniger Körperfett, desto sichtbarer die Muskeltrennung
  const thr = P.sex === 'f' ? 32 : 24;
  P.def = cl((thr - bf) / 12, 0.2, 1);
  P.absBlocks = bf < (P.sex === 'f' ? 25 : 18);
  P.sep = 0.7 + P.def * 1.1;
  P.W = Math.max(76, P.wrist + P.fa * 0.7 + 4, P.shoulderW + 4); // fester Maßstab → breitere Körper wirken auch breiter
  return P;
}

const _f = p => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
function smoothPath(pts, closed = true, t = 1) { // Catmull-Rom → Bezier
  const n = pts.length, g = i => pts[(i + n) % n];
  let d = 'M' + _f(pts[0]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = closed ? g(i - 1) : pts[Math.max(0, i - 1)], p1 = g(i), p2 = g(i + 1), p3 = closed ? g(i + 2) : pts[Math.min(n - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) * t / 6, p1[1] + (p2[1] - p0[1]) * t / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t / 6, p2[1] - (p3[1] - p1[1]) * t / 6];
    d += 'C' + _f(c1) + ' ' + _f(c2) + ' ' + _f(p2);
  }
  return d + (closed ? 'Z' : '');
}
function lensPath(p1, p2, w, bias = 0.5) { // spindelförmiger Muskelbauch zwischen zwei Punkten
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const at = (t, k) => [p1[0] + dx * t + nx * w * k, p1[1] + dy * t + ny * w * k];
  const b2 = bias + (1 - bias) * 0.55;
  return smoothPath([p1, at(bias * 0.45, 0.78), at(bias, 1), at(b2, 0.74), p2, at(b2, -0.74), at(bias, -1), at(bias * 0.45, -0.78)]);
}
function limbAt(nodes, y) {
  if (y <= nodes[0][0]) return { cx: nodes[0][1], hw: nodes[0][2] };
  for (let i = 1; i < nodes.length; i++) if (y <= nodes[i][0]) {
    const [y0, c0, w0] = nodes[i - 1], [y1, c1, w1] = nodes[i], t = (y - y0) / (y1 - y0);
    return { cx: c0 + (c1 - c0) * t, hw: w0 + (w1 - w0) * t };
  }
  const l = nodes.at(-1); return { cx: l[1], hw: l[2] };
}
function limbPath(nodes, s) {
  const X = v => 100 + s * v;
  return smoothPath([...nodes.map(([y, cx, hw]) => [X(cx + hw), y]), ...[...nodes].reverse().map(([y, cx, hw]) => [X(cx - hw), y])]);
}
const rrPath = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;

function bodySilhouette(P) {
  const X = v => 100 + v;
  const side = s => [[s * P.neck, 46], [s * (P.neck + 2.5), 55], [s * (P.shoulderW - 9), 62], [s * (P.shoulderW - 3), 72],
    [s * (P.chestW + 0.5), 100], [s * (P.chestW * 0.55 + P.waistW * 0.45), 130], [s * P.waistW, 158],
    [s * (P.hipW * 0.97), 188], [s * P.hipW, 204], [s * (P.legCx * 0.7), 222]];
  const L = side(-1), R = side(1).reverse();
  const torso = smoothPath([...L, [0, 228], ...R].map(([x, y]) => [X(x), y]));
  const parts = [torso, limbPath(P.arm, -1), limbPath(P.arm, 1), limbPath(P.leg, -1), limbPath(P.leg, 1)];
  const hr = P.sex === 'f' ? 13.2 : 14.2;
  return `<g fill="var(--body)">${parts.map(d => `<path d="${d}"/>`).join('')}
    <rect x="${X(-P.neck)}" y="36" width="${2 * P.neck}" height="22" rx="4"/><ellipse cx="100" cy="25" rx="${hr}" ry="${hr * 1.24}"/></g>`;
}
function bodyMuscles(P, view) {
  const X = v => 100 + v, out = [], add = (m, d) => out.push({ m, d });
  const pt = (s, x, y) => [X(s * x), y];
  for (const s of [-1, 1]) {
    const arm = y => limbAt(P.arm, y), leg = y => limbAt(P.leg, y);
    const ax = (y, k = 0) => { const a = arm(y); return [X(s * (a.cx + k * a.hw)), y]; };
    const lx = (y, k = 0) => { const l = leg(y); return [X(s * (l.cx + k * l.hw)), y]; };
    // Seitliche Schulter (vorne & hinten sichtbar)
    add('sidedelt', smoothPath([pt(s, P.shoulderW - 8, 64), pt(s, P.shoulderW - 1.5, 76), pt(s, P.shoulderW + 0.3, 90), pt(s, P.shoulderW - 3.5, 105), pt(s, P.shoulderW - 5.5, 88)]));
    const fh = arm(174).hw;
    if (view === 'front') {
      add('upperback', smoothPath([pt(s, P.neck - 0.5, 49), pt(s, P.neck + 7, 56), pt(s, P.shoulderW - 10, 62), pt(s, P.neck + 3, 61)]));
      add('chest', smoothPath([pt(s, 1.6, 70), pt(s, P.chestW * 0.45, 65.5), pt(s, P.chestW - 5, 67), pt(s, P.chestW + 0.8, 82), pt(s, P.chestW - 1.5, 100),
        pt(s, P.chestW * 0.62, 110 + (P.sex === 'f' ? 3 : 0)), pt(s, 1.6, 107)]));
      add('frontdelt', smoothPath([pt(s, P.chestW - 5, 64.5), pt(s, P.shoulderW - 7.5, 66), pt(s, P.shoulderW - 4.5, 82), pt(s, P.shoulderW - 7, 104), pt(s, P.chestW + 1, 88)]));
      add('biceps', lensPath(ax(90, 0.05), ax(148, -0.05), P.ua * 0.74, 0.55));
      add('forearms', lensPath(ax(155, 0.5), ax(200, 0.25), fh * 0.42, 0.4));
      add('forearms', lensPath(ax(162, -0.25), ax(216, -0.05), fh * 0.55, 0.35));
      // Bauch: gerader Bauchmuskel + schräge Bauchmuskeln
      const abW = Math.min(11.5, P.waistW * 0.4);
      if (P.absBlocks) {
        [[114, 129], [131, 146], [148, 163]].forEach(([y0, y1]) => add('abs', rrPath(s < 0 ? X(-abW) : X(0.9), y0, abW - 0.9, y1 - y0, 3.6)));
        add('abs', smoothPath([pt(s, 0.9, 165), pt(s, abW - 0.5, 165), pt(s, abW * 0.8, 184), pt(s, 3.5, 198), pt(s, 0.9, 198)]));
      } else add('abs', smoothPath([pt(s, 0.9, 115), pt(s, abW, 116), pt(s, abW + 0.8, 150), pt(s, abW * 0.85, 184), pt(s, 3.5, 198), pt(s, 0.9, 198)]));
      add('abs', smoothPath([pt(s, abW + 2.4, 124), pt(s, P.chestW * 0.8, 115), pt(s, P.chestW * 0.45 + P.waistW * 0.55 - 1.5, 138), pt(s, P.waistW - 1.6, 160),
        pt(s, P.waistW * 0.5 + P.hipW * 0.42, 186), pt(s, abW + 3.4, 196), pt(s, abW + 2.4, 160)]));
      // Quadrizeps (3 sichtbare Köpfe)
      add('quads', lensPath(lx(210, 0.42), lx(292, 0.52), leg(250).hw * 0.5, 0.45));
      add('quads', lensPath(lx(204, -0.02), lx(288, 0.02), leg(245).hw * 0.44, 0.45));
      add('quads', lensPath(lx(250, -0.5), lx(298, -0.22), leg(280).hw * 0.46, 0.55));
      // Unterschenkel vorne
      add('calves', lensPath(lx(310, 0.5), lx(360, 0.42), leg(330).hw * 0.38, 0.4));
      add('calves', lensPath(lx(312, -0.5), lx(352, -0.4), leg(330).hw * 0.34, 0.4));
    } else {
      add('upperback', smoothPath([pt(s, P.chestW * 0.5 + 1.5, 76), pt(s, P.chestW + 0.5, 80), pt(s, P.chestW - 1, 98), pt(s, P.chestW * 0.6, 102), pt(s, P.chestW * 0.42, 90)]));
      add('reardelt', smoothPath([pt(s, P.chestW - 4, 64), pt(s, P.shoulderW - 6.5, 67), pt(s, P.shoulderW - 3.5, 84), pt(s, P.shoulderW - 8, 102), pt(s, P.chestW + 0.5, 86)]));
      add('lats', smoothPath([pt(s, P.chestW + 0.5, 95), pt(s, P.chestW * 0.55, 105), pt(s, 10, 126), pt(s, 7.5, 160), pt(s, P.waistW * 0.55, 178),
        pt(s, P.waistW - 0.8, 160), pt(s, P.chestW - 1, 120)]));
      add('lowerback', lensPath(pt(s, 5.6, 126), pt(s, 6.8, 200), 5.2, 0.6));
      add('triceps', lensPath(ax(88, -0.15), ax(146, 0), P.ua * 0.72, 0.45));
      add('triceps', lensPath(ax(90, 0.5), ax(128, 0.38), P.ua * 0.38, 0.45));
      add('forearms', lensPath(ax(157, 0.35), ax(214, 0.1), fh * 0.6, 0.35));
      add('glutes', smoothPath([pt(s, 1.2, 200), pt(s, P.hipW * 0.52, 192), pt(s, P.hipW - 2.5, 205), pt(s, P.hipW - 3, 226), pt(s, P.hipW * 0.55, 241), pt(s, 1.6, 238)]));
      add('hams', lensPath(lx(242, 0.34), lx(300, 0.45), leg(268).hw * 0.5, 0.45));
      add('hams', lensPath(lx(242, -0.34), lx(300, -0.42), leg(268).hw * 0.48, 0.45));
      add('calves', lensPath(lx(305, -0.3), lx(352, -0.15), leg(325).hw * 0.52, 0.4));
      add('calves', lensPath(lx(305, 0.32), lx(346, 0.22), leg(325).hw * 0.46, 0.4));
    }
  }
  if (view === 'back') out.unshift({ m: 'upperback', d: smoothPath([[100, 45], [X(P.neck + 1.5), 50], [X(P.shoulderW - 12), 61], [X(P.chestW * 0.5), 72], [X(8), 100], [100, 122],
    [X(-8), 100], [X(-P.chestW * 0.5), 72], [X(-(P.shoulderW - 12)), 61], [X(-(P.neck + 1.5)), 50]]) });
  return out;
}
// Ganze Figur als SVG. vol = Wochenvolumen (Färbung) oder null (neutrale Vorschau)
function bodySVG(P, view, vol, { interactive = true, W = P.W, colorOf = null } = {}) {
  const ms = bodyMuscles(P, view).map(({ m, d }) => {
    let fill = 'var(--muscle)', op = 1;
    if (colorOf) ({ fill, op = 1 } = colorOf(m));
    else if (vol) {
      const v = vol[m] || 0, tg = effTarget(m), st = volStatus(v, tg);
      fill = { none: 'var(--muscle)', low: 'var(--low)', ok: 'var(--ok)', high: 'var(--high)' }[st];
      if (st === 'low') op = (0.45 + 0.55 * v / tg[0]).toFixed(2);
    }
    const foc = vol && !colorOf && isFocus(m);
    return `<path d="${d}" ${interactive ? `data-act="openMuscle" data-m="${m}"` : ''} fill="${fill}" fill-opacity="${op}" stroke="${foc ? 'var(--text)' : 'var(--bg)'}" stroke-width="${foc ? 1.8 : P.sep.toFixed(2)}" stroke-linejoin="round"/>`;
  }).join('');
  const spine = view === 'back' ? `<path d="M100 126V204" stroke="var(--bg)" stroke-width="${P.sep.toFixed(2)}" opacity=".8"/>` : '';
  return `<svg viewBox="${(100 - W).toFixed(1)} 6 ${(2 * W).toFixed(1)} 396" role="img" aria-label="Körper ${view === 'front' ? 'vorne' : 'hinten'}">${bodySilhouette(P)}${ms}${spine}</svg>`;
}
function bodyMap(vol) {
  const P = bodyParams(bodySource());
  return `<div class="bodymap"><div>${bodySVG(P, 'front', vol)}<div class="lbl">Vorne</div></div><div>${bodySVG(P, 'back', vol)}<div class="lbl">Hinten</div></div></div>
    <div class="legend"><span><i style="background:var(--muscle)"></i>nichts</span><span><i style="background:var(--low)"></i>unter Ziel</span>
    <span><i style="background:var(--ok)"></i>im Ziel</span><span><i style="background:var(--high)"></i>über Ziel</span><span><i style="border:2px solid var(--text)"></i>Fokus</span></div>
    <button class="btn sm ghost block" style="margin-top:14px" data-act="bodyShape">Körperform anpassen</button>`;
}

/* ---- Körperform-Einstellungen ---- */
function bodyShapeSheet() {
  const b = bodyCfg();
  openSheet(`<h2>Körperform</h2>
    <div class="small muted">Die Muskelkarte passt sich deinem Körper an – automatisch aus deinen Daten oder per Körpertyp, plus Feinjustierung.</div>
    <div id="bs_prev" class="bodymap" style="margin:12px auto 4px"></div>
    <div class="seg" id="bs_mode">${[['auto', 'Aus meinen Daten'], ['preset', 'Körpertyp']].map(([k, l]) => `<button class="${b.mode === k ? 'on' : ''}" data-act="bsMode" data-k="${k}">${l}</button>`).join('')}</div>
    <div id="bs_body"></div>
    <h3>Feinjustierung</h3>
    ${BODY_SLIDERS.map(([k, l]) => `<label class="slider"><span>${l}</span><input type="range" min="80" max="125" step="1" data-bs="${k}" value="${Math.round((b.adj[k] ?? 1) * 100)}"><b id="bsv_${k}">${Math.round((b.adj[k] ?? 1) * 100)} %</b></label>`).join('')}
    <label class="slider"><span>Definition</span><input type="range" min="-12" max="12" step="1" data-bs="bf" value="${-(b.bfAdj || 0)}"><b id="bsv_bf">${-(b.bfAdj || 0) > 0 ? '+' : ''}${-(b.bfAdj || 0)}</b></label>
    <div class="small muted">Definition verschiebt das Körperfett für die Darstellung: mehr Definition = sichtbare Bauchmuskeln & schärfere Muskelkanten.</div>
    <button class="btn block ghost" style="margin-top:8px" data-act="bsReset">Regler zurücksetzen</button>
    <div id="bs_cmp"></div>
    <div class="sheet-actions"><button class="btn primary" data-act="bsDone">Fertig</button></div>`);
  renderBsBody(); renderBsPrev();
}
function renderBsPrev() {
  const P = bodyParams(bodySource());
  $('#bs_prev').innerHTML = `<div>${bodySVG(P, 'front', null, { interactive: false })}</div><div>${bodySVG(P, 'back', null, { interactive: false })}</div>`;
}
function renderBsBody() {
  const b = bodyCfg(), el = $('#bs_body'); if (!el) return;
  if (b.mode === 'preset') {
    el.innerHTML = `<div class="grid2 presets">${Object.entries(BODY_PRESETS).map(([k, p]) => {
      const P = bodyParams({ ...bodySourcePreset(k) }, false);
      return `<button class="preset ${b.preset === k ? 'on' : ''}" data-act="bsPreset" data-k="${k}">${bodySVG(P, 'front', null, { interactive: false })}<span>${p.label}</span></button>`;
    }).join('')}</div>`;
    $('#bs_cmp').innerHTML = '';
    return;
  }
  const src = bodySource(), st = S.settings;
  const L = { shoulders: 'Schultern', chest: 'Brust', waist: 'Bauch', hip: 'Hüfte', arm: 'Oberarm', thigh: 'Oberschenkel', calf: 'Wade' };
  const nEst = MEASURE_KEYS.filter(k => src.srcs[k] !== 'gemessen').length;
  el.innerHTML = `<div class="card" style="margin:0">
    <div class="small" style="margin-bottom:6px"><b>${st.sex === 'f' ? 'Weiblich' : 'Männlich'} · ${fmt(src.h)} cm · ${fmt(src.kg, 1)} kg${S.weights.length ? '' : ' (geschätzt)'} · KFA ${fmt(src.bf, 0)} % ${src.bfSrc === 'gemessen' ? '' : '(geschätzt)'}</b></div>
    <div class="chips">${MEASURE_KEYS.map(k => `<span class="chip ${src.srcs[k] === 'gemessen' ? 'on2' : ''}">${L[k]} ${fmt(src.c[k], 0)} cm${src.srcs[k] === 'gemessen' ? ' ✓' : ' ~'}</span>`).join('')}</div>
    <div class="small muted" style="margin-top:8px">✓ = gemessen, ~ = aus Größe & Gewicht geschätzt.${nEst ? ` Je mehr Maße du einträgst, desto genauer wird die Figur.` : ' Alles gemessen – top!'}</div>
    ${nEst ? '<button class="btn sm" style="margin-top:8px" data-act="addMeasure">Maße eintragen</button>' : ''}
    ${!st.height || !S.meta.onboarded ? '<div class="small muted" style="margin-top:6px">Tipp: Größe & Geschlecht unter „Mehr → Profil“ eintragen.</div>' : ''}
  </div>`;
  // Vergleich Start ↔ Jetzt
  const first = bodySource('first'), changed = MEASURE_KEYS.some(k => Math.abs(first.c[k] - src.c[k]) > 0.5) || Math.abs(first.bf - src.bf) > 0.5;
  $('#bs_cmp').innerHTML = changed ? `<h3>Entwicklung deiner Körperform</h3><div class="bodymap">
    <div>${bodySVG(bodyParams(first), 'front', null, { interactive: false })}<div class="lbl">Start${first.date ? ' · ' + fmtDate(first.date) : ''} · ${fmt(first.kg, 1)} kg</div></div>
    <div>${bodySVG(bodyParams(src), 'front', null, { interactive: false })}<div class="lbl">Jetzt${src.date ? ' · ' + fmtDate(src.date) : ''} · ${fmt(src.kg, 1)} kg</div></div></div>` : '';
}
function bodySourcePreset(k) {
  const cfg = S.settings.body; S.settings.body = { ...bodyCfg(), mode: 'preset', preset: k };
  try { return bodySource('latest', 'preset'); } finally { S.settings.body = cfg; }
}
function bodyCompareCard() {
  if (bodyCfg().mode !== 'auto') return '';
  const a = bodySource('first'), b = bodySource('latest');
  if (!(MEASURE_KEYS.some(k => Math.abs(a.c[k] - b.c[k]) > 0.5) || Math.abs(a.bf - b.bf) > 0.5)) return '';
  return `<div class="card"><div class="card-head"><h2>Körperform-Entwicklung</h2><button class="btn sm" data-act="bodyShape">Anpassen</button></div>
    <div class="bodymap">
      <div>${bodySVG(bodyParams(a), 'front', null, { interactive: false })}<div class="lbl">Start${a.date ? ' · ' + fmtDate(a.date) : ''}<br>${fmt(a.kg, 1)} kg</div></div>
      <div>${bodySVG(bodyParams(b), 'front', null, { interactive: false })}<div class="lbl">Jetzt${b.date ? ' · ' + fmtDate(b.date) : ''}<br>${fmt(b.kg, 1)} kg</div></div>
    </div><div class="small muted" style="margin-top:6px">Aus deinem Gewicht und deinen Körpermaßen berechnet.</div></div>`;
}

function progMuscles() {
  const d = new Date(); d.setDate(d.getDate() - 7 * UI.volWeek);
  const ws = weekStart(d), we = new Date(ws.getTime() + 6 * 864e5);
  const vol = weekVolume(d), pg = activeProgram(), plan = pg ? plannedVolume(pg) : null;
  const total = MUSCLE_LIST.reduce((a, [m]) => a + vol[m], 0);
  const inRange = MUSCLE_LIST.filter(([m]) => ['ok', 'high'].includes(volStatus(vol[m], effTarget(m)))).length;
  const wp = weakPoints();
  const cur = UI.volWeek === 0;
  return `
  <div class="datenav">
    <button class="icon-btn" data-act="volWeek" data-n="1">‹</button>
    <b>${cur ? 'Diese Woche' : UI.volWeek === 1 ? 'Letzte Woche' : 'KW ' + isoWeek(ws)} · ${ws.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}–${we.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</b>
    <button class="icon-btn" data-act="volWeek" data-n="-1" ${cur ? 'disabled style="opacity:.3"' : ''}>›</button>
  </div>
  <div class="card">
    ${bodyMap(vol)}
    <div class="grid3" style="margin-top:12px">
      <div class="stat"><b>${fmt(total, 1)}</b><span>Sätze gesamt*</span></div>
      <div class="stat"><b>${inRange}/${MUSCLE_LIST.length}</b><span>Muskeln im Ziel</span></div>
      <div class="stat"><b>${(S.settings.focus || []).length}</b><span>Fokus-Muskeln</span></div>
    </div>
    <div class="small muted" style="margin-top:8px">Tippe auf einen Muskel für Details, Ziel & Fokus. *Hauptmuskel = 1 Satz, Hilfsmuskel = ½ Satz.${cur ? ' Die Woche läuft noch.' : ''}</div>
  </div>

  ${wp && wp.list.length ? `<div class="card warn"><h2>Schwachstellen</h2>
    <div class="small muted" style="margin:-6px 0 8px">${wp.src === 'hist' ? (wp.n > 1 ? `Ø der letzten ${wp.n} Trainingswochen` : 'In deiner letzten Trainingswoche') : 'Laut deinem aktiven Plan'} unter dem Mindestziel:</div>
    <div class="list">${wp.list.slice(0, 6).map(x => { const ex = bestExerciseFor(x.m); return `<div class="item tap" data-act="openMuscle" data-m="${x.m}">
      <div class="t"><b>${isFocus(x.m) ? '★ ' : ''}${mName(x.m)}</b><span>Ø ${fmt(x.v, 1)} Sätze · Ziel ${x.t[0]}–${x.t[1]} → <strong style="color:var(--orange)">+${fmt(Math.ceil(x.t[0] - x.v))} Sätze/Woche</strong>${ex ? `, z.B. ${esc(ex.name)}` : ''}</span></div><span class="muted">›</span></div>`; }).join('')}</div>
  </div>` : wp ? `<div class="card accent"><b>Keine Schwachstellen</b><div class="small muted">Alle Muskeln erreichen ${wp.src === 'hist' ? 'im Schnitt' : 'laut Plan'} ihr Mindestvolumen.</div></div>` : ''}

  <div class="card-head" style="margin-top:16px"><h3 style="margin:0">Volumen pro Muskel</h3>${plan ? '<span class="small muted">▌ = Plan</span>' : ''}</div>
  ${REGIONS.map(rg => `<div class="list" style="margin-bottom:10px">${MUSCLE_LIST.filter(([, , r]) => r === rg).map(([m]) => {
    const t = effTarget(m), st = volStatus(vol[m], t);
    return `<div class="item tap" data-act="openMuscle" data-m="${m}"><div class="t"><b>${isFocus(m) ? '★ ' : ''}${mName(m)}</b>
      ${vbar(vol[m], t, plan ? plan[m] : null)}
      <span>${fmt(vol[m], 1)} Sätze · Ziel ${t[0]}–${t[1]}${plan ? ` · Plan ${fmt(plan[m], 1)}` : ''}</span></div>
      <span class="pill ${st}">${STATUS_TXT[st]}</span></div>`;
  }).join('')}</div>`).join('')}
  <button class="btn block ghost" data-act="resetTargets">Alle Ziele & Fokus zurücksetzen</button>`;
}

function muscleSheet(m) {
  const M = MUSCLE[m]; if (!M) return;
  const [mn, mx] = baseTarget(m), eff = effTarget(m), foc = isFocus(m);
  const weeks = Array.from({ length: 8 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (7 - i) * 7); return d; });
  const vals = weeks.map(d => Math.round(weekVolume(d)[m] * 10) / 10);
  // Woher kommt das Volumen (letzte 4 Wochen)?
  const from = Date.now() - 28 * 864e5, contrib = {};
  for (const w of S.workouts) if (w.start >= from) for (const e of w.entries) {
    const ex = exById(e.exId); if (!ex) continue;
    const f = (ex.pm || []).includes(m) ? 1 : (ex.sm || []).includes(m) ? 0.5 : 0;
    if (f) contrib[ex.id] = (contrib[ex.id] || 0) + WK(e.sets).length * f;
  }
  const cs = Object.entries(contrib).sort((a, b) => b[1] - a[1]);
  const exs = S.exercises.filter(e => (e.pm || []).includes(m) || (e.sm || []).includes(m))
    .sort((a, b) => (b.pm.includes(m) - a.pm.includes(m)) || a.name.localeCompare(b.name));
  const pg = activeProgram(), days = programDays(pg);
  const plan = pg ? plannedVolume(pg)[m] : null;
  const dayScore = r => r.exIds.reduce((a, id) => { const ex = exById(id); return a + (ex ? [...(ex.pm || []), ...(ex.sm || [])].filter(x => MUSCLE[x].region === M.region).length : 0); }, 0);
  const bestDay = days.reduce((b, d) => (!b || dayScore(d.r) > dayScore(b.r) ? d : b), null);
  openSheet(`<h2>${foc ? '★ ' : ''}${M.name}</h2>
    <div class="small muted" style="margin-bottom:10px">${M.region} · Ziel ${eff[0]}–${eff[1]} Sätze/Woche${foc ? ' (Fokus: +30 %)' : ''}${plan != null ? ` · Plan: ${fmt(plan, 1)}` : ''}</div>
    <button class="btn block ${foc ? 'primary' : ''}" data-act="toggleFocus" data-m="${m}">${foc ? '★ Fokus aktiv – tippen zum Entfernen' : '☆ Als Fokus / Schwachstelle markieren'}</button>
    <h3>Sätze pro Woche</h3>
    ${barChart(vals, weeks.map(d => 'KW' + isoWeek(d)), { goal: eff[0], under: 'var(--orange)' })}
    <h3>Zielbereich (Sätze pro Woche)</h3>
    <div class="grid2"><label class="f"><span>Minimum</span><input id="mt_min" inputmode="numeric" value="${mn}"></label>
      <label class="f"><span>Maximum</span><input id="mt_max" inputmode="numeric" value="${mx}"></label></div>
    <div class="row"><button class="btn grow" data-act="saveTarget" data-m="${m}">Ziel speichern</button>
      <button class="btn ghost" data-act="resetTarget" data-m="${m}">Standard (${M.def[0]}–${M.def[1]})</button></div>
    <div class="small muted" style="margin-top:6px">Richtwert: 10–20 harte Sätze/Woche für große Muskeln. Fokus erhöht das Ziel um 30 %.</div>
    <h3>Woher kommt dein Volumen? (4 Wochen)</h3>
    ${cs.length ? `<div class="list">${cs.map(([id, n]) => `<div class="item"><div class="t"><b>${esc(exById(id).name)}</b></div><b>${fmt(n, 1)} Sätze</b></div>`).join('')}</div>` : '<div class="empty small">Noch kein Training für diesen Muskel.</div>'}
    <h3>Mehr Volumen einplanen</h3>
    ${exs.length && days.length ? `<label class="f"><span>Übung</span><select id="mx_ex">${exs.map(e => `<option value="${e.id}">${esc(e.name)}${e.pm.includes(m) ? '' : ' (Hilfsmuskel)'}</option>`).join('')}</select></label>
      <div class="grid2"><label class="f"><span>Trainingstag (${esc(pg.name)})</span><select id="mx_day">${days.map(d => `<option value="${d.r.id}" ${d === bestDay ? 'selected' : ''}>${esc(d.r.name)}</option>`).join('')}</select></label>
      <label class="f"><span>Sätze</span><input id="mx_sets" inputmode="numeric" value="3"></label></div>
      <button class="btn primary block" data-act="addToDay" data-m="${m}">+ Zum Plan hinzufügen</button>`
    : `<div class="empty small">${days.length ? 'Keine passende Übung – leg unter „Mehr → Übungen“ eine an.' : 'Aktiviere zuerst einen Trainingsplan (Training-Tab).'}</div>`}
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Schließen</button></div>`);
}

/* ---- Plan-Baukasten ---- */
let PB = null;
function programSheet(id) {
  const p = S.programs.find(x => x.id === id);
  PB = p ? { id: p.id, name: p.name, perWeek: p.perWeek || 3, days: p.days.map(d => ({ ...d })), active: S.activeProgram === p.id }
    : { id: null, name: '', perWeek: 3, days: [], active: true };
  renderProgramSheet();
}
function syncPB() {
  if (!PB || !$('#pb_name')) return;
  PB.name = $('#pb_name').value;
  PB.perWeek = Math.max(1, Math.min(14, num($('#pb_per').value) || PB.perWeek));
  PB.active = $('#pb_active').checked;
  $$('[data-pbwd]').forEach(s => { PB.days[+s.dataset.pbwd].wd = s.value === '' ? null : +s.value; });
}
function renderProgramSheet(keep) {
  PB.days = PB.days.filter(d => S.routines.some(r => r.id === d.rid));
  const days = programDays(PB), sched = days.some(d => d.wd != null);
  const vol = plannedVolume(PB);
  const low = MUSCLE_LIST.filter(([m]) => vol[m] < effTarget(m)[0]).map(([m]) => m);
  const unused = S.routines.filter(r => !PB.days.some(d => d.rid === r.id));
  const scroll = keep ? $("#sheet .sheet-panel").scrollTop : 0;
  openSheet(`<h2>${PB.id ? '✎ Plan bearbeiten' : 'Plan bauen'}</h2>
    <label class="f"><span>Name</span><input id="pb_name" value="${esc(PB.name)}" placeholder="z.B. Mein 4er-Split"></label>
    <div class="grid2"><label class="f"><span>Einheiten pro Woche</span><input id="pb_per" inputmode="numeric" value="${PB.perWeek}" ${sched ? 'disabled' : ''}></label>
      <label class="f row" style="margin-top:22px"><input type="checkbox" id="pb_active" ${PB.active ? 'checked' : ''}> <span style="display:inline;margin:0">Aktiver Plan</span></label></div>
    <div class="small muted">${sched ? 'Feste Wochentage: jeder Tag mit Wochentag zählt 1× pro Woche.' : 'Rotation: die Tage werden der Reihe nach trainiert. Optional feste Wochentage zuordnen.'}</div>
    <h3>Trainingstage</h3>
    ${days.length ? `<div class="list">${days.map((d, i) => `<div class="item">
      <div class="t"><b>${i + 1}. ${esc(d.r.name)}</b><span>${d.r.exIds.length} Übungen · ${d.r.exIds.reduce((a, id) => a + (exById(id) ? daySets(d.r, exById(id)) : 0), 0)} Sätze</span></div>
      <select class="wd" data-pbwd="${i}"><option value="">flexibel</option>${[1, 2, 3, 4, 5, 6, 0].map(w => `<option value="${w}" ${d.wd === w ? 'selected' : ''}>${DAYS[w].slice(0, 2)}</option>`).join('')}</select>
      <button class="x" data-act="pbEditDay" data-i="${i}">✎</button>${i ? `<button class="x" data-act="pbMove" data-i="${i}">↑</button>` : ''}<button class="x" data-act="pbDel" data-i="${i}">×</button></div>`).join('')}</div>`
    : '<div class="empty small">Noch keine Tage. Leg einen neuen an oder nimm einen vorhandenen.</div>'}
    <div class="row" style="margin-top:8px"><button class="btn" data-act="pbNewDay">+ Neuer Tag</button>
      ${unused.length ? `<select id="pb_addday" class="grow" style="flex:1"><option value="">+ Vorhandener Tag …</option>${unused.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>` : ''}</div>
    <h3>Geplantes Wochenvolumen</h3>
    ${days.length ? (low.length ? `<div class="sugg deload">⚠ Unter Ziel: ${low.map(m => `${isFocus(m) ? '★' : ''}${mName(m)}`).join(', ')}</div>` : '<div class="sugg up">Alle Muskeln mindestens im Zielbereich.</div>') : ''}
    <div class="list">${MUSCLE_LIST.map(([m]) => { const t = effTarget(m); return `<div class="item"><div class="t"><b>${isFocus(m) ? '★ ' : ''}${mName(m)}</b>${vbar(vol[m], t)}</div>
      <span class="small ${volStatus(vol[m], t) === 'low' ? 'down' : 'muted'}" style="min-width:64px;text-align:right">${fmt(vol[m], 1)} / ${t[0]}–${t[1]}</span></div>`; }).join('')}</div>
    <div class="sheet-actions">${PB.id ? '<button class="btn danger" data-act="pbDelete">Löschen</button>' : ''}<button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="pbSave">Speichern</button></div>`);
  $('#sheet .sheet-panel').scrollTop = scroll;
}

/* Muskel-Auswahl im Übungs-Editor */
let EC = null;
function emChips() {
  const chips = t => MUSCLE_LIST.map(([m]) => `<button type="button" class="chip ${EC[t].has(m) ? (t === 'pm' ? 'on' : 'on2') : ''}" data-act="emToggle" data-t="${t}" data-m="${m}">${mName(m)}</button>`).join('');
  $('#em_pm').innerHTML = chips('pm'); $('#em_sm').innerHTML = chips('sm');
}

/* ---------- PRs (automatisch aus Trainings + eigene Einträge) ---------- */
const PR_KINDS = { lift: 'Gewicht × Wdh', reps: 'Wiederholungen', time: 'Zeit', dist: 'Distanz', other: 'Sonstiges' };
function parseTime(s) {
  const parts = String(s || '').trim().split(':').map(num);
  if (!parts.length || parts.some(x => x == null || x < 0)) return null;
  return parts.reduce((a, x) => a * 60 + x, 0);
}
function prScore(p) {
  switch (p.kind) {
    case 'lift': return e1rm(p.w || 0, p.r) + (p.w ? 0 : p.r * 0.001);
    case 'reps': return p.r;
    case 'time': return p.more ? p.sec : -p.sec;
    case 'dist': return p.km;
    default: return 0;
  }
}
function prLabel(p) {
  switch (p.kind) {
    case 'lift': return p.w ? `${fmt(p.w, 2)} kg × ${p.r}` : `${p.r} Wdh.`;
    case 'reps': return `${p.r} Wdh.`;
    case 'time': return mmss(p.sec);
    case 'dist': return `${fmt(p.km, 2)} km`;
    default: return esc(p.text);
  }
}
const prKey = p => p.kind + '|' + (p.exId || p.title.trim().toLowerCase());
function autoPRs() { // Bestwert je Übung + jedes Mal, wenn er im Training übertroffen wurde
  const best = {}, events = [];
  for (const w of [...S.workouts].sort((a, b) => a.start - b.start)) for (const e of w.entries) {
    const s = bestSet(WK(e.sets)); if (!s) continue;
    const prev = best[e.exId];
    if (!prev || setScore(s) > setScore(prev.set) + 1e-6) {
      if (prev) events.push({ date: w.date, ts: w.start, exId: e.exId, set: s });
      best[e.exId] = { set: s, date: w.date };
    }
  }
  return { best, events };
}
function liftBest(exId, auto = autoPRs()) {
  const a = auto.best[exId];
  const m = S.prs.filter(p => p.kind === 'lift' && p.exId === exId).reduce((b, p) => (!b || prScore(p) > prScore(b) ? p : b), null);
  if (m && (!a || prScore(m) > setScore(a.set))) return { w: m.w, r: m.r, date: m.date, manual: true };
  return a ? { ...a.set, date: a.date } : null;
}
function manualPrGroups() {
  const g = {};
  for (const p of S.prs) (g[prKey(p)] ||= []).push(p);
  return Object.entries(g).map(([key, items]) => {
    items.sort((a, b) => b.date.localeCompare(a.date));
    const best = items[0].kind === 'other' ? items[0] : items.reduce((b, p) => (prScore(p) > prScore(b) ? p : b));
    return { key, items, best };
  }).sort((a, b) => b.items[0].date.localeCompare(a.items[0].date));
}
function prFeed(auto = autoPRs()) {
  return [
    ...auto.events.map(e => ({ date: e.date, ts: e.ts, title: exById(e.exId)?.name || '?', label: prLabel({ kind: 'lift', ...e.set }), src: 'Training' })),
    ...S.prs.filter(p => p.isPr).map(p => ({ date: p.date, ts: p.ts || 0, title: p.title, label: prLabel(p), src: 'Eingetragen' })),
  ].sort((x, y) => y.date.localeCompare(x.date) || y.ts - x.ts);
}
const relDay = d => { const n = daysBetween(d, today()); return n <= 0 ? 'heute' : n === 1 ? 'gestern' : `vor ${n} Tagen`; };

function prSheet(pre = {}) {
  const kind = pre.kind || 'lift';
  const titles = [...new Set([...S.exercises.map(e => e.name), ...S.prs.map(p => p.title)])];
  openSheet(`<h2>PR eintragen</h2>
    <label class="f"><span>Art</span><select id="pr_kind">${Object.entries(PR_KINDS).map(([k, l]) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f"><span>Was?</span><input id="pr_title" list="pr_titles" value="${esc(pre.title || '')}" placeholder="z.B. Bankdrücken, 5 km Lauf, Plank" autocomplete="off">
      <datalist id="pr_titles">${titles.map(t => `<option value="${esc(t)}">`).join('')}</datalist></label>
    <div class="grid2" data-k="lift"><label class="f"><span>Gewicht (kg)</span><input id="pr_w" inputmode="decimal"></label>
      <label class="f"><span>Wiederholungen</span><input id="pr_r" inputmode="numeric" value="1"></label></div>
    <div data-k="reps"><label class="f"><span>Wiederholungen</span><input id="pr_reps" inputmode="numeric"></label></div>
    <div data-k="time"><label class="f"><span>Zeit (mm:ss oder h:mm:ss)</span><input id="pr_time" inputmode="text" placeholder="24:30"></label>
      <label class="row" style="margin-bottom:10px"><input type="checkbox" id="pr_more" ${pre.more ? 'checked' : ''}> <span>Länger ist besser (z.B. Plank, Dead Hang)</span></label></div>
    <div data-k="dist"><label class="f"><span>Distanz (km)</span><input id="pr_km" inputmode="decimal"></label></div>
    <div data-k="other"><label class="f"><span>Ergebnis</span><input id="pr_text" placeholder="z.B. Erster Muscle-Up"></label></div>
    <div class="grid2"><label class="f"><span>Datum</span><input id="pr_date" type="date" value="${today()}" max="${today()}"></label>
      <label class="f"><span>Notiz</span><input id="pr_note" placeholder="optional"></label></div>
    <div id="pr_hint" class="small muted"></div>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="savePr">Speichern</button></div>`);
  prKindFields();
}
function prKindFields() {
  const k = $('#pr_kind').value;
  $$('#sheet [data-k]').forEach(el => el.classList.toggle('hidden', el.dataset.k !== k));
  prHint();
}
function prHint() {
  const el = $('#pr_hint'); if (!el) return;
  const k = $('#pr_kind').value, t = $('#pr_title').value.trim();
  if (!t) { el.textContent = ''; return; }
  const ex = S.exercises.find(e => e.name.toLowerCase() === t.toLowerCase());
  let best = null;
  if (k === 'lift' && ex) { const b = liftBest(ex.id); if (b) best = prLabel({ kind: 'lift', ...b }) + (b.w ? ` (e1RM ${fmt(e1rm(b.w, b.r), 1)} kg)` : ''); }
  else { const g = manualPrGroups().find(g => g.key === k + '|' + t.toLowerCase()); if (g) best = prLabel(g.best); }
  el.innerHTML = best ? `Aktueller Bestwert: <b>${best}</b> – schlag ihn!` : 'Erster Eintrag – zählt automatisch als PR.';
}
function prGroupSheet(key) {
  const g = manualPrGroups().find(x => x.key === key); if (!g) return closeSheet();
  const k = g.best.kind;
  const val = p => (k === 'time' ? p.sec / 60 : k === 'lift' ? (p.w ? e1rm(p.w, p.r) : p.r) : k === 'reps' ? p.r : p.km);
  const pts = k === 'other' ? [] : g.items.slice().reverse().map(p => [parseYmd(p.date).getTime(), val(p)]);
  openSheet(`<h2>${esc(g.best.title)}</h2>
    <div class="small muted">${PR_KINDS[k]} · Bestwert <b style="color:var(--accent)">${prLabel(g.best)}</b> am ${fmtDate(g.best.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
    ${pts.length > 1 ? `<h3>Verlauf${k === 'time' ? ' (Minuten)' : k === 'lift' ? ' (e1RM)' : ''}</h3>${lineChart([{ pts, color: 'var(--accent)', dots: true }])}` : ''}
    <div class="list" style="margin-top:12px">${g.items.map(p => `<div class="item"><div class="t"><b>${prLabel(p)} ${p.id === g.best.id ? '' : ''}</b>
      <span>${fmtDate(p.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}${p.note ? ' · ' + esc(p.note) : ''}</span></div>
      <button class="x" data-act="delPr" data-id="${p.id}" data-key="${esc(key)}">×</button></div>`).join('')}</div>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Schließen</button>
      <button class="btn primary" data-act="addPr" data-kind="${k}" data-title="${esc(g.best.title)}" data-more="${g.best.more ? 1 : ''}">+ Neuer Versuch</button></div>`);
}

/* =====================================================================
   Cardio · Rezepte & Vorlagen · Rückblick · Kraft-Standards · Abzeichen · Ziele · Foto-Kamera
   ===================================================================== */

/* ---------- Cardio ---------- */
const CARDIO = { run: ['Laufen', 0], walk: ['Gehen', 3.5], bike: ['Radfahren', 7.5], row: ['Rudern', 7], swim: ['Schwimmen', 7], stair: ['Stepper', 9], elliptical: ['Crosstrainer', 5], hiit: ['HIIT', 8], other: ['Sonstiges', 6] };
function cardioKcal(type, min, km) { // MET × kg × Stunden
  const kg = latestWeight()?.kg || 75;
  let met = CARDIO[type]?.[1] || 6;
  if (type === 'run') met = km && min ? Math.min(16, Math.max(6, km / (min / 60))) : 9.8;
  return Math.round(met * kg * (min || 0) / 60);
}
const cKcal = c => c.kcal ?? cardioKcal(c.type, c.min, c.km);
const paceTxt = (min, km) => (km && min ? mmss(min * 60 / km) + ' /km' : '');
const cardioInRange = (fromYmd, toYmd) => S.cardio.filter(c => c.date >= fromYmd && c.date < toYmd);
let CD = null;
function cardioSheet(id) {
  const c = S.cardio.find(x => x.id === id) || { type: 'run', min: '', km: '', kcal: null, hr: null, date: today(), note: '' };
  CD = { type: c.type };
  openSheet(`<h2>${id ? 'Cardio bearbeiten' : 'Cardio eintragen'}</h2>
    <div class="chips" id="cd_types" style="margin-bottom:16px">${Object.entries(CARDIO).map(([k, [l]]) => `<button type="button" class="chip ${c.type === k ? 'on' : ''}" data-act="cdType" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="grid2">
      <label class="f"><span>Dauer (min)</span><input id="cd_min" inputmode="decimal" value="${c.min ?? ''}" placeholder="30"></label>
      <label class="f"><span>Distanz (km)</span><input id="cd_km" inputmode="decimal" value="${c.km ?? ''}" placeholder="optional"></label>
      <label class="f"><span>Kalorien</span><input id="cd_kcal" inputmode="numeric" value="${c.kcal ?? ''}" placeholder="automatisch"></label>
      <label class="f"><span>Ø Puls</span><input id="cd_hr" inputmode="numeric" value="${c.hr ?? ''}" placeholder="optional"></label>
      <label class="f"><span>Datum</span><input id="cd_date" type="date" value="${c.date}" max="${today()}"></label>
      <label class="f"><span>Notiz</span><input id="cd_note" value="${esc(c.note || '')}" placeholder="optional"></label>
    </div>
    <div id="cd_prev" class="small muted"></div>
    <div class="sheet-actions">${id ? `<button class="btn danger" data-act="delCardio" data-id="${id}">Löschen</button>` : ''}<button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="saveCardio" data-id="${id || ''}">Speichern</button></div>`);
  cdPreview();
}
function cdPreview() {
  const el = $('#cd_prev'); if (!el || !CD) return;
  const min = num($('#cd_min').value), km = num($('#cd_km').value), parts = [];
  if (min) parts.push(`≈ ${fmt(cardioKcal(CD.type, min, km))} kcal`);
  if (min && km) parts.push(`Pace ${paceTxt(min, km)}`, `${fmt(km / (min / 60), 1)} km/h`);
  el.textContent = parts.join(' · ');
}
function cardioCard() {
  const ws = ymd(weekStart(new Date())), wk = cardioInRange(ws, addDays(ws, 7));
  const min = wk.reduce((a, c) => a + (c.min || 0), 0), km = wk.reduce((a, c) => a + (c.km || 0), 0), kcal = wk.reduce((a, c) => a + cKcal(c), 0);
  const recent = [...S.cardio].sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0)).slice(0, 5);
  return `<h3>Cardio</h3><div class="card">
    <div class="card-head"><span class="label">Diese Woche</span><button class="btn sm" data-act="addCardio">+ Cardio</button></div>
    <div class="grid3"><div class="stat"><b>${fmt(min)}</b><span>Minuten</span></div><div class="stat"><b>${fmt(km, 1)}</b><span>km</span></div><div class="stat"><b>${fmt(kcal)}</b><span>kcal</span></div></div>
    ${recent.length ? `<div class="list" style="margin-top:14px">${recent.map(c => `<div class="item tap" data-act="editCardio" data-id="${c.id}"><div class="t"><b>${CARDIO[c.type]?.[0] || 'Cardio'}${c.note ? ` · ${esc(c.note)}` : ''}</b>
      <span>${fmtDate(c.date, { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${fmt(c.min)} min${c.km ? ` · ${fmt(c.km, 2)} km · ${paceTxt(c.min, c.km)}` : ''}${c.hr ? ` · ${c.hr} bpm` : ''}</span></div><span class="small muted">${fmt(cKcal(c))} kcal</span></div>`).join('')}</div>` : ''}
  </div>`;
}

/* ---------- Mahlzeit-Vorlagen & Rezepte ---------- */
const recipeTotals = r => r.items.reduce((t, i) => { const k = (i.g || 0) / 100; t.kcal += i.kcal * k; t.p += i.p * k; t.c += i.c * k; t.f += i.f * k; t.g += i.g || 0; return t; }, { kcal: 0, p: 0, c: 0, f: 0, g: 0 });
const perPortion = r => { const t = recipeTotals(r), n = r.portions || 1; return { kcal: t.kcal / n, p: t.p / n, c: t.c / n, f: t.f / n, g: t.g / n }; };
const tplTotals = t => t.items.reduce((a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { kcal: 0, p: 0, c: 0, f: 0 });

function renderSaved(b) {
  b.innerHTML = `${S.mealTemplates.length ? `<h3 style="margin-top:0">Mahlzeit-Vorlagen</h3><div class="list">${S.mealTemplates.map(t => { const s = tplTotals(t); return `<div class="item tap" data-act="useTemplate" data-id="${t.id}">
      <div class="t"><b>${esc(t.name)}</b><span>${t.items.length} Lebensmittel · ${fmt(s.kcal)} kcal · P ${fmt(s.p)}</span></div><span class="muted">+</span></div>`; }).join('')}</div>` : ''}
    ${S.recipes.length ? `<h3>Rezepte</h3><div class="list">${S.recipes.map(r => { const s = perPortion(r); return `<div class="item tap" data-act="pickRecipe" data-id="${r.id}">
      <div class="t"><b>${esc(r.name)}</b><span>pro Portion · ${fmt(s.kcal)} kcal · P ${fmt(s.p)}</span></div><span class="muted">›</span></div>`; }).join('')}</div>` : ''}
    ${!S.mealTemplates.length && !S.recipes.length ? '<div class="empty small">Noch nichts gespeichert. Speichere eine Mahlzeit über „Als Vorlage“ im Essen-Tab oder leg ein Rezept an.</div>' : ''}
    <button class="btn block" style="margin-top:12px" data-act="ideas">Rezeptideen & Tagespläne</button>
    <button class="btn block ghost" style="margin-top:8px" data-act="newRecipe">+ Neues Rezept</button>`;
}
function renderRecipeAmount() {
  const r = S.recipes.find(x => x.id === FC.picked.recipe); if (!r) { FC.picked = null; return renderFoodBody(); }
  const s = perPortion(r);
  $('#foodBody').innerHTML = `<div class="card"><b>${esc(r.name)}</b><div class="small muted">pro Portion (${fmt(s.g)} g): ${fmt(s.kcal)} kcal · P ${fmt(s.p, 1)} · K ${fmt(s.c, 1)} · F ${fmt(s.f, 1)}</div></div>
    <label class="f"><span>Portionen</span><input id="fr_n" inputmode="decimal" value="1"></label>
    <div class="row" style="margin-bottom:12px">${[0.5, 1, 1.5, 2].map(n => `<button class="btn sm" data-act="setPortions" data-n="${n}">${fmt(n, 1)}</button>`).join('')}</div>
    <div class="card" id="fr_prev"></div>
    <div class="sheet-actions"><button class="btn" data-act="foodBack">Zurück</button><button class="btn primary" data-act="addRecipe">Hinzufügen</button></div>`;
  updateRecipePreview();
}
function updateRecipePreview() {
  const r = S.recipes.find(x => x.id === FC?.picked?.recipe), el = $('#fr_prev'); if (!r || !el) return;
  const s = perPortion(r), n = num($('#fr_n')?.value) || 0;
  el.innerHTML = `<div class="grid2"><div class="stat"><b>${fmt(s.kcal * n)} kcal</b><span>${fmt(n, 1)} Portion${n === 1 ? '' : 'en'}</span></div>
    <div class="stat"><b style="font-size:14px">P ${fmt(s.p * n)} · K ${fmt(s.c * n)} · F ${fmt(s.f * n)}</b><span>Makros (g)</span></div></div>`;
}
function templateSheet(meal) {
  const items = S.foods.filter(f => f.date === UI.foodDate && f.meal === meal);
  openSheet(`<h2>Als Vorlage speichern</h2>
    <div class="small muted" style="margin-bottom:14px">${items.map(i => esc(i.name)).join(' · ')} — ${fmt(items.reduce((a, i) => a + i.kcal, 0))} kcal</div>
    <label class="f"><span>Name der Vorlage</span><input id="tp_name" value="Mein ${mealName(meal)}"></label>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="saveTpl" data-meal="${meal}">Speichern</button></div>`);
  setTimeout(() => $('#tp_name')?.select(), 50);
}
function librarySheet() {
  openSheet(`<h2>Rezepte & Vorlagen</h2>
    <h3 style="margin-top:4px">Rezepte</h3>
    ${S.recipes.length ? `<div class="list">${S.recipes.map(r => { const s = perPortion(r); return `<div class="item tap" data-act="editRecipe" data-id="${r.id}">
      <div class="t"><b>${esc(r.name)}</b><span>${r.items.length} Zutaten · ${fmt(r.portions, 1)} Portionen · ${fmt(s.kcal)} kcal/Portion</span></div><span class="muted">›</span></div>`; }).join('')}</div>` : '<div class="empty small">Noch keine Rezepte.</div>'}
    <button class="btn block" style="margin-top:10px" data-act="newRecipe">+ Neues Rezept</button>
    <h3>Eigene Lebensmittel</h3>
    ${(S.customFoods || []).length ? `<div class="list">${S.customFoods.map(x => `<div class="item tap" data-act="editCustomFood" data-id="${x.id}">
      <div class="t"><b>${esc(x.name)}</b><span>${esc(x.cat || 'Eigene')} · pro 100 g ${fmt(x.kcal)} kcal · P ${fmt(x.p, 1)} g</span></div><span class="muted">›</span></div>`).join('')}</div>` : '<div class="empty small">Noch keine eigenen Lebensmittel.</div>'}
    <button class="btn block" style="margin-top:10px" data-act="newCustomFood">+ Eigenes Lebensmittel</button>
    <h3>Mahlzeit-Vorlagen</h3>
    ${S.mealTemplates.length ? `<div class="list">${S.mealTemplates.map(t => `<div class="item"><div class="t"><b>${esc(t.name)}</b><span>${t.items.map(i => esc(i.name)).join(', ')} · ${fmt(tplTotals(t).kcal)} kcal</span></div>
      <button class="x" data-act="delTemplate" data-id="${t.id}">×</button></div>`).join('')}</div>` : '<div class="empty small">Speichere eine Mahlzeit im Essen-Tab über „Als Vorlage“.</div>'}
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Schließen</button></div>`);
}
let RE = null, RE_EXTRA = [];
function recipeSheet(id) {
  const r = S.recipes.find(x => x.id === id);
  RE = r ? JSON.parse(JSON.stringify(r)) : { id: null, name: '', portions: 2, items: [] };
  RE_EXTRA = []; renderRecipeSheet();
}
function syncRE() { if (!RE || !$('#re_name')) return; RE.name = $('#re_name').value; RE.portions = Math.max(0.5, num($('#re_por').value) || RE.portions); }
function renderRecipeSheet(keep) {
  const scroll = keep ? $('#sheet .sheet-panel').scrollTop : 0;
  openSheet(`<h2>${RE.id ? 'Rezept bearbeiten' : 'Neues Rezept'}</h2>
    <div class="grid2" style="grid-template-columns:2fr 1fr"><label class="f"><span>Name</span><input id="re_name" value="${esc(RE.name)}" placeholder="z.B. Protein-Pancakes"></label>
      <label class="f"><span>Portionen</span><input id="re_por" inputmode="decimal" value="${RE.portions}"></label></div>
    <h3>Zutaten</h3>
    ${RE.items.length ? `<div class="list">${RE.items.map((i, k) => `<div class="item"><div class="t"><b>${esc(i.name)}</b><span id="re_k${k}">${fmt(i.kcal * i.g / 100)} kcal</span></div>
      <input class="g-in" data-rig="${k}" inputmode="decimal" value="${i.g}"><span class="small muted">g</span><button class="x" data-act="reDel" data-i="${k}">×</button></div>`).join('')}</div>` : '<div class="empty small">Füge unten Zutaten hinzu.</div>'}
    <input id="rq" type="search" placeholder="Zutat suchen, z.B. Haferflocken …" autocomplete="off" style="margin-top:12px">
    <div id="rres" style="margin-top:8px"></div>
    <div class="card" id="re_tot" style="margin-top:16px"></div>
    <div class="sheet-actions">${RE.id ? '<button class="btn danger" data-act="reDelete">Löschen</button>' : ''}<button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="reSave">Speichern</button></div>`);
  $('#sheet .sheet-panel').scrollTop = scroll; reTotals();
}
function reTotals() {
  const el = $('#re_tot'); if (!el) return;
  const t = recipeTotals(RE), n = Math.max(0.5, num($('#re_por')?.value) || RE.portions || 1);
  el.innerHTML = `<div class="grid2"><div class="stat"><b>${fmt(t.kcal)} kcal</b><span>gesamt · ${fmt(t.g)} g</span></div>
    <div class="stat"><b>${fmt(t.kcal / n)} kcal</b><span>pro Portion · P ${fmt(t.p / n)} · K ${fmt(t.c / n)} · F ${fmt(t.f / n)}</span></div></div>`;
  RE.items.forEach((i, k) => { const s = $('#re_k' + k); if (s) s.textContent = `${fmt(i.kcal * i.g / 100)} kcal`; });
}
function renderRecipeSearch() {
  const box = $('#rres'); if (!box) return;
  const q = ($('#rq')?.value || '').trim().toLowerCase();
  const list = q ? [...foodSearch(q, foodAll()), ...RE_EXTRA] : [];
  RE.list = list;
  box.innerHTML = q ? `${list.length ? `<div class="list">${list.slice(0, 15).map((x, i) => `<div class="item tap" data-act="reAdd" data-i="${i}">
      <div class="t"><b>${esc(x.name)}</b><span>pro 100 g · ${fmt(x.kcal)} kcal · P ${fmt(x.p)}</span></div><span class="muted">+</span></div>`).join('')}</div>` : '<div class="empty small">Nichts gefunden – lege die Zutat unter „Rezepte & Vorlagen → Eigenes Lebensmittel“ an.</div>'}` : '';
}

/* ---------- Rückblick: Woche / Monat / Jahr ---------- */
function periodOf(mode, off) {
  const now = new Date(), dm = { day: '2-digit', month: '2-digit' };
  if (mode === 'week') {
    const s = weekStart(now); s.setDate(s.getDate() - 7 * off);
    const e = new Date(s); e.setDate(e.getDate() + 7);
    return { s, e, label: off === 0 ? 'Diese Woche' : off === 1 ? 'Letzte Woche' : `KW ${isoWeek(s)}`, sub: `${s.toLocaleDateString('de-DE', dm)} – ${new Date(e - 864e5).toLocaleDateString('de-DE', dm)}` };
  }
  if (mode === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth() - off, 1), e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
    return { s, e, label: s.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }), sub: off === 0 ? 'laufender Monat' : '' };
  }
  const s = new Date(now.getFullYear() - off, 0, 1), e = new Date(s.getFullYear() + 1, 0, 1);
  return { s, e, label: String(s.getFullYear()), sub: off === 0 ? 'laufendes Jahr' : '' };
}
function periodStats(s, e) {
  const st = S.settings, sY = ymd(s), eY = ymd(e), sm = s.getTime(), em = e.getTime();
  const ws = S.workouts.filter(w => w.start >= sm && w.start < em);
  const setsOf = w => w.entries.reduce((b, x) => b + WK(x.sets).length, 0);
  const volOf = w => w.entries.reduce((b, x) => b + WK(x.sets).reduce((c, z) => c + (z.w || 0) * z.r, 0), 0);
  const sets = ws.reduce((a, w) => a + setsOf(w), 0), vol = ws.reduce((a, w) => a + volOf(w), 0);
  const dur = ws.reduce((a, w) => a + (w.end - w.start), 0) / 60000;
  const cs = cardioInRange(sY, eY);
  const cMin = cs.reduce((a, c) => a + (c.min || 0), 0), cKm = cs.reduce((a, c) => a + (c.km || 0), 0), cK = cs.reduce((a, c) => a + cKcal(c), 0);
  const auto = autoPRs(), prs = prFeed(auto).filter(f => f.date >= sY && f.date < eY);
  // Ernährung (nur geloggte Tage bis heute)
  const end = eY > addDays(today(), 1) ? addDays(today(), 1) : eY, days = [];
  for (let d = sY; d < end; d = addDays(d, 1)) { const t = dayTotals(d); if (t.kcal > 0) days.push(t); }
  const avg = k => (days.length ? days.reduce((a, t) => a + t[k], 0) / days.length : null);
  const protDays = days.filter(t => t.p >= st.protein * 0.95).length, kcalDays = days.filter(t => Math.abs(t.kcal - st.kcal) <= st.kcal * 0.1).length;
  // Körper
  const W = [...S.weights].sort((a, b) => a.date.localeCompare(b.date));
  const wIn = W.filter(w => w.date >= sY && w.date < eY), before = W.filter(w => w.date < sY).at(-1);
  const wStart = before?.kg ?? wIn[0]?.kg, wEnd = wIn.at(-1)?.kg;
  const M = [...S.measures].sort((a, b) => a.date.localeCompare(b.date)).filter(m => m.waist != null);
  const mIn = M.filter(m => m.date >= sY && m.date < eY), mBefore = M.filter(m => m.date < sY).at(-1);
  const waistD = mIn.length && (mBefore || mIn.length > 1) ? mIn.at(-1).waist - (mBefore || mIn[0]).waist : null;
  // Muskeln
  const mv = emptyVol();
  for (const w of ws) for (const x of w.entries) { const ex = exById(x.exId); if (ex) addVol(mv, ex, WK(x.sets).length); }
  const top = Object.entries(mv).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const none = ws.length ? MUSCLE_LIST.map(([m]) => m).filter(m => !mv[m]) : [];
  // Highlight
  const evs = auto.events.filter(ev => ev.date >= sY && ev.date < eY);
  let highlight = null;
  if (evs.length) {
    const best = evs.reduce((b, ev) => (!b || setScore(ev.set) > setScore(b.set) ? ev : b), null);
    highlight = `Neuer PR: ${exById(best.exId)?.name || ''} ${prLabel({ kind: 'lift', ...best.set })}`;
  } else if (prs.length) highlight = `Neuer Rekord: ${prs[0].title} ${prs[0].label}`;
  else if (ws.length) highlight = `${ws.length} Training${ws.length > 1 ? 's' : ''} · ${fmt(vol / 1000, 1)} t bewegt`;
  else if (cs.length) highlight = `${fmt(cMin)} Minuten Cardio`;
  const badges = (S.meta.badges || []).filter(b => b.date >= sY && b.date < eY).map(b => BADGES.find(x => x[0] === b.id)).filter(Boolean);
  return { ws, n: ws.length, sets, vol, dur, cs, cMin, cKm, cK, prs, days: days.length, avgK: avg('kcal'), avgP: avg('p'), protDays, kcalDays, wStart, wEnd, wIn, waistD, top, none, highlight, badges, setsOf, volOf };
}
function statsChart(mode, P, x) {
  if (mode === 'week') {
    const vals = Array.from({ length: 7 }, (_, i) => { const d = ymd(new Date(P.s.getTime() + i * 864e5)); return x.ws.filter(w => w.date === d).reduce((a, w) => a + x.setsOf(w), 0); });
    return { title: 'Sätze pro Tag', svg: barChart(vals, ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], { color: 'url(#gold)' }) };
  }
  if (mode === 'month') {
    const weeks = []; for (let d = weekStart(P.s); d < P.e; d = new Date(d.getTime() + 7 * 864e5)) weeks.push(new Date(d));
    const vals = weeks.map(d => { const a = d.getTime(), b = a + 7 * 864e5; return x.ws.filter(w => w.start >= a && w.start < b).length; });
    return { title: 'Trainings pro Woche', svg: barChart(vals, weeks.map(d => 'KW' + isoWeek(d)), { goal: S.settings.weeklyWorkouts }) };
  }
  const vals = Array.from({ length: 12 }, (_, m) => x.ws.filter(w => new Date(w.start).getMonth() === m).length);
  return { title: 'Trainings pro Monat', svg: barChart(vals, ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']) };
}
function statsView() {
  const mode = UI.statsMode, P = periodOf(mode, UI.statsOff), x = periodStats(P.s, P.e), st = S.settings;
  const ch = statsChart(mode, P, x);
  const h = Math.floor(x.dur / 60), m = Math.round(x.dur % 60);
  return `
  <div class="row" style="margin-bottom:10px;justify-content:space-between"><button class="icon-btn" data-act="statsBack" aria-label="Zurück">‹</button><button class="btn sm" data-act="shareStats">Teilen</button></div>
  <h1>Rückblick</h1><div class="sub">Deine Zahlen auf einen Blick.</div>
  <div class="seg">${[['week', 'Woche'], ['month', 'Monat'], ['year', 'Jahr']].map(([k, l]) => `<button class="${mode === k ? 'on' : ''}" data-act="statsMode" data-k="${k}">${l}</button>`).join('')}</div>
  <div class="datenav"><button class="icon-btn" data-act="statsNav" data-n="1">‹</button>
    <div style="text-align:center"><b>${P.label}</b>${P.sub ? `<div class="small muted">${P.sub}</div>` : ''}</div>
    <button class="icon-btn" data-act="statsNav" data-n="-1" ${UI.statsOff === 0 ? 'disabled style="opacity:.3"' : ''}>›</button></div>

  <div class="card accent">
    <span class="label">Highlight</span>
    <div style="font-size:20px;font-weight:500;letter-spacing:-.02em;margin:8px 0 16px">${x.highlight ? esc(x.highlight) : 'Noch keine Aktivität in diesem Zeitraum'}</div>
    <div class="grid3"><div class="stat"><b>${x.n}</b><span>Trainings</span></div><div class="stat"><b>${fmt(x.vol / 1000, 1)} t</b><span>Volumen</span></div><div class="stat"><b>${x.prs.length}</b><span>Rekorde</span></div></div>
  </div>

  <h3>Training</h3>
  <div class="card">
    <div class="grid3" style="margin-bottom:14px"><div class="stat"><b>${fmt(x.sets)}</b><span>Sätze</span></div><div class="stat"><b>${h}:${pad(m)}</b><span>Stunden</span></div><div class="stat"><b>${x.n ? fmt(x.dur / x.n) : '–'}</b><span>Ø Minuten</span></div></div>
    <span class="label">${ch.title}</span><div style="margin-top:10px">${ch.svg}</div>
  </div>

  <h3>Cardio</h3>
  <div class="card"><div class="grid3"><div class="stat"><b>${fmt(x.cMin)}</b><span>Minuten · ${x.cs.length}×</span></div><div class="stat"><b>${fmt(x.cKm, 1)}</b><span>km</span></div><div class="stat"><b>${fmt(x.cK)}</b><span>kcal</span></div></div></div>

  <h3>Ernährung</h3>
  <div class="card">
    <div class="grid3"><div class="stat"><b>${x.avgK != null ? fmt(x.avgK) : '–'}</b><span>Ø kcal · Ziel ${fmt(st.kcal)}</span></div><div class="stat"><b>${x.avgP != null ? fmt(x.avgP) + ' g' : '–'}</b><span>Ø Protein</span></div><div class="stat"><b>${x.days}</b><span>Tage geloggt</span></div></div>
    ${x.days ? `<div class="small muted" style="margin-top:12px">Protein-Ziel an ${x.protDays} von ${x.days} Tagen · Kalorien im Ziel (±10 %) an ${x.kcalDays} Tagen</div>` : ''}
  </div>

  <h3>Körper</h3>
  <div class="card">
    <div class="grid2"><div class="stat"><b>${x.wEnd != null ? fmt(x.wEnd, 1) + ' kg' : '–'}</b><span>${x.wStart != null && x.wEnd != null ? `${sgn(x.wEnd - x.wStart)} kg im Zeitraum` : 'Gewicht'}</span></div>
      <div class="stat"><b>${x.waistD != null ? sgn(x.waistD) + ' cm' : '–'}</b><span>Bauchumfang</span></div></div>
    ${x.wIn.length > 1 ? `<div style="margin-top:12px">${lineChart([{ pts: x.wIn.map(w => [parseYmd(w.date).getTime(), w.kg]), color: 'var(--accent)', dots: true }], { h: 120 })}</div>` : ''}
  </div>

  ${x.n ? `<h3>Muskeln</h3><div class="card">
    <div class="chips">${x.top.slice(0, 6).map(([mm, v]) => `<span class="chip on2">${mName(mm)} ${fmt(v, 1)}</span>`).join('')}</div>
    ${x.none.length ? `<div class="small muted" style="margin-top:12px">Nicht trainiert: ${x.none.map(mName).join(', ')}</div>` : '<div class="small muted" style="margin-top:12px">Alle Muskeln trainiert.</div>'}
  </div>` : ''}

  ${x.prs.length ? `<h3>Rekorde</h3><div class="list">${x.prs.slice(0, 12).map(f => `<div class="item"><span style="color:var(--accent)">${ic('trophy')}</span><div class="t"><b>${esc(f.title)}</b><span>${fmtDate(f.date, { weekday: 'short', day: '2-digit', month: '2-digit' })}</span></div><b>${f.label}</b></div>`).join('')}</div>` : ''}
  ${x.badges.length ? `<h3>Neue Abzeichen</h3><div class="badges">${x.badges.map(([id, title, , icon]) => `<div class="badge on"><span class="medal">${ic(icon)}</span><b>${title}</b></div>`).join('')}</div>` : ''}`;
}

/* ---------- Kraft-Standards (geschätztes 1RM / Körpergewicht) ---------- */
const STANDARDS = {
  bench: { m: [0.5, 0.75, 1, 1.5, 2], f: [0.25, 0.5, 0.75, 1, 1.5] },
  squat: { m: [0.75, 1.25, 1.5, 2, 2.5], f: [0.5, 0.75, 1, 1.5, 2] },
  deadlift: { m: [1, 1.5, 2, 2.5, 3], f: [0.5, 1, 1.25, 1.75, 2.5] },
  ohp: { m: [0.35, 0.55, 0.8, 1.05, 1.35], f: [0.2, 0.35, 0.5, 0.75, 1] },
  row: { m: [0.5, 0.75, 1, 1.5, 1.75], f: [0.25, 0.4, 0.65, 0.9, 1.2] },
};
const LEVELS = ['Anfänger', 'Novize', 'Mittelstufe', 'Fortgeschritten', 'Elite'];
function strengthLevel(exId) {
  const bw = latestWeight()?.kg, b = liftBest(exId), std = STANDARDS[exId]?.[S.settings.sex === 'f' ? 'f' : 'm'];
  if (!bw || !b || !b.w || !std) return null;
  const one = e1rm(b.w, b.r), ratio = one / bw;
  let lvl = -1; std.forEach((t, i) => { if (ratio >= t) lvl = i; });
  const nx = std[lvl + 1];
  const pos = lvl < 0 ? Math.max(0.01, ratio / std[0] * 0.04) : (lvl + Math.min(1, (ratio - std[lvl]) / ((std[lvl + 1] ?? std[lvl] * 1.25) - std[lvl]))) / 5;
  return { one, ratio, lvl, pos, std, label: lvl < 0 ? 'Einstieg' : LEVELS[lvl], next: nx ? { label: LEVELS[lvl + 1], kg: nx * bw } : null };
}
function standardsCard() {
  const bw = latestWeight()?.kg;
  const rows = Object.keys(STANDARDS).filter(exById).map(id => ({ id, ex: exById(id), L: strengthLevel(id) }));
  return `<h3>Kraft-Standards</h3><div class="card">
    ${!bw ? '<div class="small muted">Trag dein Körpergewicht ein, um deine Kraft-Level zu sehen.</div>' : `
    <div class="std-legend">${LEVELS.map(l => `<span>${l}</span>`).join('')}</div>
    ${rows.map(({ id, ex, L }) => `<div class="std tap-card" data-act="openExercise" data-id="${id}">
      <div class="row" style="justify-content:space-between"><b>${esc(ex.name)}</b><span class="pill ${L && L.lvl >= 2 ? 'acc' : ''}">${L ? L.label : 'keine Daten'}</span></div>
      <div class="std-bar">${[0, 1, 2, 3, 4].map(i => `<i class="${L && i <= L.lvl ? 'on' : ''}"></i>`).join('')}${L ? `<u style="left:${(L.pos * 100).toFixed(1)}%"></u>` : ''}</div>
      <div class="small muted">${L ? `e1RM ${fmt(L.one, 1)} kg · ${fmt(L.ratio, 2)}× Körpergewicht${L.next ? ` · noch ${fmt(Math.max(0.5, L.next.kg - L.one), 1)} kg bis ${L.next.label}` : ' · Top-Level erreicht'}` : 'Trainiere die Übung, um dein Level zu sehen.'}</div>
    </div>`).join('')}
    <div class="small muted" style="margin-top:12px">Richtwerte für das geschätzte 1RM im Verhältnis zum Körpergewicht (${S.settings.sex === 'f' ? 'Frauen' : 'Männer'}, ${fmt(bw, 1)} kg).</div>`}
  </div>`;
}

/* ---------- Abzeichen ---------- */
const BADGES = [ // [id, Titel, Beschreibung, Icon, (ctx) => [Wert, Ziel]]
  ['w1', 'Erstes Training', 'Dein erstes Training geloggt', 'dumbbell', c => [c.w, 1]],
  ['w10', '10 Trainings', '10 Trainings abgeschlossen', 'dumbbell', c => [c.w, 10]],
  ['w50', '50 Trainings', '50 Trainings abgeschlossen', 'dumbbell', c => [c.w, 50]],
  ['w100', '100 Trainings', 'Dreistellig', 'dumbbell', c => [c.w, 100]],
  ['w250', '250 Trainings', 'Training ist Routine', 'dumbbell', c => [c.w, 250]],
  ['s4', '4 Wochen Streak', '4 Wochen in Folge das Wochenziel erreicht', 'flame', c => [c.streak, 4]],
  ['s12', '12 Wochen Streak', 'Ein Quartal am Stück', 'flame', c => [c.streak, 12]],
  ['s26', '26 Wochen Streak', 'Ein halbes Jahr durchgezogen', 'flame', c => [c.streak, 26]],
  ['pr1', 'Erster Rekord', 'Deinen ersten PR aufgestellt', 'trophy', c => [c.prs, 1]],
  ['pr10', '10 Rekorde', '10 PRs aufgestellt', 'trophy', c => [c.prs, 10]],
  ['pr50', '50 Rekorde', '50 PRs aufgestellt', 'trophy', c => [c.prs, 50]],
  ['t10', '10 Tonnen', '10.000 kg Gesamtvolumen', 'activity', c => [c.vol, 1e4]],
  ['t100', '100 Tonnen', '100.000 kg Gesamtvolumen', 'activity', c => [c.vol, 1e5]],
  ['t1000', '1.000 Tonnen', 'Eine Million Kilo bewegt', 'activity', c => [c.vol, 1e6]],
  ['bwb', 'Körpergewicht', 'Bankdrücken mit dem eigenen Körpergewicht', 'target', c => [c.benchBw, 1]],
  ['b100', '100-kg-Club', '100 kg Bankdrücken', 'target', c => [c.bench, 100]],
  ['sq140', '140-kg-Club', '140 kg Kniebeugen', 'target', c => [c.squat, 140]],
  ['dl180', '180-kg-Club', '180 kg Kreuzheben', 'target', c => [c.dead, 180]],
  ['f7', '7 Tage geloggt', 'Eine Woche Ernährung getrackt', 'utensils', c => [c.foodDays, 7]],
  ['f30', '30 Tage geloggt', 'Einen Monat Ernährung getrackt', 'utensils', c => [c.foodDays, 30]],
  ['f100', '100 Tage geloggt', '100 Tage Ernährung getrackt', 'utensils', c => [c.foodDays, 100]],
  ['p7', 'Protein-Profi', 'An 7 Tagen das Protein-Ziel erreicht', 'utensils', c => [c.protDays, 7]],
  ['rc1', 'Küchenchef', 'Erstes Rezept angelegt', 'utensils', c => [c.recipes, 1]],
  ['c1', 'Erstes Cardio', 'Erste Cardio-Einheit geloggt', 'activity', c => [c.cardioN, 1]],
  ['c50', '50 km', '50 km Cardio gesamt', 'activity', c => [c.cardioKm, 50]],
  ['c250', '250 km', '250 km Cardio gesamt', 'activity', c => [c.cardioKm, 250]],
  ['wg8', 'Am Ball', '8× gewogen', 'scale', c => [c.weighs, 8]],
  ['ph1', 'Erstes Foto', 'Erstes Progress-Foto', 'camera', c => [c.photos, 1]],
  ['ph10', '10 Fotos', '10 Progress-Fotos', 'camera', c => [c.photos, 10]],
  ['g1', 'Ziel erreicht', 'Dein erstes PR-Ziel geschafft', 'target', c => [c.goalsDone, 1]],
  ['hb7', 'Gewohnheitstier', 'Eine Gewohnheit 7 Tage am Stück', 'check', c => [c.habitBest, 7]],
  ['hb30', 'Eiserne Disziplin', 'Eine Gewohnheit 30 Tage am Stück', 'check', c => [c.habitBest, 30]],
  ['ci4', 'Ehrlich zu dir', '4 wöchentliche Check-ins', 'check', c => [c.checkins, 4]],
  ['mp1', 'Meal-Prepper', 'Erstes Meal-Prep gekocht', 'utensils', c => [c.preps, 1]],
];
function badgeCtx() {
  const bestW = id => Math.max(0, ...S.workouts.flatMap(w => w.entries.filter(e => e.exId === id).flatMap(e => e.sets.map(s => s.w || 0))),
    ...S.prs.filter(p => p.kind === 'lift' && p.exId === id).map(p => p.w || 0));
  const bw = latestWeight()?.kg, days = new Set(S.foods.filter(eaten).map(f => f.date));
  let prot = 0; for (const d of days) if (dayTotals(d).p >= S.settings.protein * 0.95) prot++;
  return {
    w: S.workouts.length, streak: weekStreak(), prs: prFeed().length,
    vol: S.workouts.reduce((a, w) => a + w.entries.reduce((b, x) => b + WK(x.sets).reduce((c, z) => c + (z.w || 0) * z.r, 0), 0), 0),
    bench: bestW('bench'), squat: bestW('squat'), dead: bestW('deadlift'), benchBw: bw ? bestW('bench') / bw : 0,
    foodDays: days.size, protDays: prot, recipes: S.recipes.length, cardioN: S.cardio.length, cardioKm: S.cardio.reduce((a, c) => a + (c.km || 0), 0),
    weighs: S.weights.length, photos: PH.ready ? PH.list.length : 0, goalsDone: S.goals.filter(g => g.done).length,
    habitBest: Math.max(0, ...S.habits.map(h => habitStreak(h.id))), checkins: S.checkins.length, preps: S.prep.filter(x => x.status === 'ready').length,
  };
}
function badgeList() {
  const c = badgeCtx(), got = new Map((S.meta.badges || []).map(b => [b.id, b.date]));
  return BADGES.map(([id, title, desc, icon, fn]) => { const [v, max] = fn(c); return { id, title, desc, icon, v, max, done: got.has(id), date: got.get(id) }; });
}
function badgesSection() {
  const L = badgeList(), n = L.filter(b => b.done).length;
  const sorted = [...L.filter(b => b.done), ...L.filter(b => !b.done).sort((a, b) => b.v / b.max - a.v / a.max)];
  const shown = UI.allBadges ? sorted : sorted.slice(0, 9);
  return `<h3>Abzeichen · ${n} / ${L.length}</h3><div class="badges">${shown.map(b => `<button class="badge ${b.done ? 'on' : ''}" data-act="badgeInfo" data-id="${b.id}">
    <span class="medal">${ic(b.icon)}</span><b>${b.title}</b><span>${b.done ? (b.date ? fmtDate(b.date) : 'erreicht') : `${fmt(Math.min(b.v, b.max), b.max < 2 ? 2 : 0)} / ${fmt(b.max)}`}</span></button>`).join('')}</div>
    <button class="btn sm ghost block" data-act="toggleBadges">${UI.allBadges ? 'Weniger anzeigen' : `Alle ${L.length} Abzeichen anzeigen`}</button>`;
}
let achTimer = null;
function checkAchievements() { clearTimeout(achTimer); achTimer = setTimeout(runAchievements, 350); }
function runAchievements() {
  const goalsHit = [];
  for (const g of S.goals) if (!g.done) { const p = goalProgress(g); if (p.reached) { g.done = today(); goalsHit.push(g); } }
  const c = badgeCtx(); S.meta.badges ||= [];
  const have = new Set(S.meta.badges.map(b => b.id)), fresh = [];
  for (const [id, title, , , fn] of BADGES) { if (have.has(id)) continue; const [v, max] = fn(c); if (v >= max) { S.meta.badges.push({ id, date: today() }); fresh.push(title); } }
  if (!goalsHit.length && !fresh.length) return;
  // nicht neu zeichnen, während jemand in Einstellungen/Formularen tippt – sonst gehen ungespeicherte Eingaben verloren
  const typing = document.activeElement?.matches?.('input, textarea, select') && $('#view').contains(document.activeElement);
  save(); if (!sheetOpen() && !typing && UI.tab !== 'more') render();
  toast(goalsHit.length ? `Ziel erreicht: ${goalsHit[0].title}` : fresh.length === 1 ? `Abzeichen freigeschaltet: ${fresh[0]}` : `${fresh.length} neue Abzeichen freigeschaltet`);
  if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.([40, 30, 40]);
}

/* ---------- PR-Ziele mit Deadline ---------- */
function goalCurrent(g) {
  if (g.kind === 'lift') { const b = liftBest(g.exId); return b ? (b.w ? e1rm(b.w, b.r) : 0) : null; }
  const grp = manualPrGroups().find(x => x.key === g.kind + '|' + g.title.trim().toLowerCase());
  return grp ? prScore(grp.best) : null;
}
const goalTarget = g => (g.kind === 'lift' ? e1rm(g.w, g.r) : prScore({ kind: g.kind, r: g.val, sec: g.val, km: g.val, more: g.more }));
function goalFmt(g, score) {
  if (score == null) return '–';
  if (g.kind === 'lift') return `${fmt(score, 1)} kg`;
  if (g.kind === 'time') return mmss(Math.abs(score));
  if (g.kind === 'dist') return `${fmt(score, 2)} km`;
  return `${fmt(score)} Wdh.`;
}
const goalTargetLabel = g => (g.kind === 'lift' ? `${fmt(g.w, 2)} kg × ${g.r}` : g.kind === 'time' ? mmss(g.val) : g.kind === 'dist' ? `${fmt(g.val, 2)} km` : `${fmt(g.val)} Wdh.`);
function goalProgress(g) {
  const cur = goalCurrent(g), target = goalTarget(g);
  let pct = 0;
  if (cur != null) {
    pct = target > 0 ? cur / target : target / cur; // Zeit (negativ): kleiner ist besser
  }
  pct = Math.max(0, Math.min(1, pct || 0));
  const reached = cur != null && cur >= target - 1e-9;
  const daysLeft = daysBetween(today(), g.deadline);
  let status = '';
  if (g.done) status = `Erreicht am ${fmtDate(g.done)}`;
  else if (daysLeft < 0) status = 'Deadline verpasst – setz ein neues Datum.';
  else if (g.kind === 'lift' && cur != null) {
    const from = addDays(today(), -70);
    const pts = exHistory(g.exId).filter(h => h.date >= from).map(h => { const b = bestSet(h.sets); return [daysBetween(from, h.date), b.w ? e1rm(b.w, b.r) : 0]; });
    const need = (target - cur) / Math.max(1, daysLeft / 7);
    if (pts.length >= 2) {
      const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
      const den = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0), slope = den ? pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / den : 0;
      if (slope > 0.005) {
        const eta = Math.ceil((target - cur) / slope);
        status = eta <= daysLeft ? `Prognose: erreicht ca. ${fmtDate(addDays(today(), eta))} – im Plan ✓` : `Zu langsam: nötig +${fmt(need, 1)} kg/Woche, aktuell +${fmt(slope * 7, 1)} kg/Woche`;
      } else status = `Nötig: +${fmt(need, 1)} kg e1RM pro Woche`;
    } else status = `Nötig: +${fmt(need, 1)} kg e1RM pro Woche`;
  } else status = cur == null ? 'Noch kein Wert – trag einen Versuch ein.' : `Noch ${daysLeft} Tage`;
  return { cur, target, pct, reached, daysLeft, status };
}
function goalsSection() {
  const gs = [...S.goals].sort((a, b) => (!!a.done - !!b.done) || a.deadline.localeCompare(b.deadline));
  return `<h3>Ziele</h3>
  ${gs.map(g => { const p = goalProgress(g); return `<div class="card goal tap-card" data-act="editGoal" data-id="${g.id}">
    <div class="row" style="justify-content:space-between"><b>${esc(g.title)}</b><span class="pill ${g.done ? 'up' : p.daysLeft < 0 ? 'down' : 'acc'}">${g.done ? 'erreicht' : p.daysLeft < 0 ? 'überfällig' : `noch ${p.daysLeft} T`}</span></div>
    <div class="small muted" style="margin-top:2px">${goalTargetLabel(g)} bis ${fmtDate(g.deadline, { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
    <div class="track" style="margin:14px 0 8px;height:5px"><i style="width:${(p.pct * 100).toFixed(1)}%"></i></div>
    <div class="row" style="justify-content:space-between"><span class="small">Aktuell ${goalFmt(g, p.cur)}${g.kind === 'lift' ? ' e1RM' : ''} · Ziel ${goalFmt(g, p.target)}</span><span class="small muted">${fmt(p.pct * 100)} %</span></div>
    <div class="small muted" style="margin-top:6px">${p.status}</div>
  </div>`; }).join('')}
  <button class="btn block" data-act="addGoal">+ Ziel mit Deadline setzen</button>`;
}
function homeGoalLine() {
  const g = S.goals.filter(x => !x.done).sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  if (!g) return '';
  const p = goalProgress(g);
  return `<div class="meta">Ziel: ${esc(g.title)}<div class="track" style="margin:8px 0 6px"><i style="width:${(p.pct * 100).toFixed(1)}%"></i></div>${fmt(p.pct * 100)} % · ${p.daysLeft >= 0 ? `noch ${p.daysLeft} T` : 'überfällig'}</div>`;
}
let GL = null;
function goalSheet(id) {
  const g = S.goals.find(x => x.id === id) || { kind: 'lift', exId: 'bench', title: '', w: '', r: 1, val: '', more: false, deadline: addDays(today(), 84) };
  GL = { kind: g.kind, id: g.id || null };
  const exs = [...S.exercises].sort((a, b) => a.name.localeCompare(b.name));
  openSheet(`<h2>${id ? 'Ziel bearbeiten' : 'Neues PR-Ziel'}</h2>
    <div class="seg" id="gl_kind">${[['lift', 'Kraft'], ['reps', 'Wdh.'], ['time', 'Zeit'], ['dist', 'Distanz']].map(([k, l]) => `<button class="${g.kind === k ? 'on' : ''}" data-act="glKind" data-k="${k}">${l}</button>`).join('')}</div>
    <div data-gk="lift">
      <label class="f"><span>Übung</span><select id="gl_ex">${exs.map(e => `<option value="${e.id}" ${e.id === g.exId ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>
      <div class="grid2"><label class="f"><span>Zielgewicht (kg)</span><input id="gl_w" inputmode="decimal" value="${g.w ?? ''}" placeholder="z.B. 100"></label>
        <label class="f"><span>Wiederholungen</span><input id="gl_r" inputmode="numeric" value="${g.r ?? 1}"></label></div>
    </div>
    <div data-gk="other">
      <label class="f"><span>Was?</span><input id="gl_title" list="gl_titles" value="${esc(g.kind !== 'lift' ? g.title : '')}" placeholder="z.B. 5 km Lauf, Klimmzüge am Stück" autocomplete="off">
        <datalist id="gl_titles">${[...new Set(S.prs.map(p => p.title))].map(t => `<option value="${esc(t)}">`).join('')}</datalist></label>
      <label class="f"><span id="gl_vlbl">Zielwert</span><input id="gl_val" value="${g.kind === 'time' && g.val ? mmss(g.val) : g.val ?? ''}"></label>
      <label class="row" data-gt="1" style="margin-bottom:12px"><input type="checkbox" id="gl_more" ${g.more ? 'checked' : ''}> <span>Länger ist besser (z.B. Plank)</span></label>
    </div>
    <label class="f"><span>Deadline</span><input id="gl_dl" type="date" value="${g.deadline}" min="${addDays(today(), 1)}"></label>
    <div class="row" style="margin-bottom:8px">${[[4, '4 Wochen'], [8, '8 Wochen'], [12, '12 Wochen'], [26, '6 Monate']].map(([w, l]) => `<button class="btn sm" data-act="glDl" data-w="${w}">${l}</button>`).join('')}</div>
    <div id="gl_hint" class="small muted"></div>
    <div class="sheet-actions">${id ? `<button class="btn danger" data-act="delGoal" data-id="${id}">Löschen</button>` : ''}<button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="saveGoal" data-id="${id || ''}">Speichern</button></div>`);
  glFields();
}
function glFields() {
  const k = GL.kind;
  $$('#sheet [data-gk]').forEach(el => el.classList.toggle('hidden', (el.dataset.gk === 'lift') !== (k === 'lift')));
  $$('#sheet [data-gt]').forEach(el => el.classList.toggle('hidden', k !== 'time'));
  $$('#gl_kind button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  const l = $('#gl_vlbl'); if (l) l.textContent = { reps: 'Ziel-Wiederholungen', time: 'Zielzeit (mm:ss)', dist: 'Zieldistanz (km)' }[k] || '';
  const v = $('#gl_val'); if (v) v.placeholder = { reps: 'z.B. 15', time: 'z.B. 24:00', dist: 'z.B. 10' }[k] || '';
  glHint();
}
function glHint() {
  const el = $('#gl_hint'); if (!el || !GL) return;
  if (GL.kind === 'lift') {
    const b = liftBest($('#gl_ex').value), w = num($('#gl_w').value), r = num($('#gl_r').value) || 1;
    el.innerHTML = (b ? `Aktuell: ${prLabel({ kind: 'lift', ...b })}${b.w ? ` (e1RM ${fmt(e1rm(b.w, b.r), 1)} kg)` : ''}` : 'Noch keine Daten für diese Übung.') + (w ? ` · Ziel-e1RM ${fmt(e1rm(w, r), 1)} kg` : '');
  } else {
    const t = $('#gl_title').value.trim(), grp = t && manualPrGroups().find(x => x.key === GL.kind + '|' + t.toLowerCase());
    el.textContent = grp ? `Aktueller Bestwert: ${prLabel(grp.best).replace(/<[^>]+>/g, '')}` : t ? 'Noch kein Eintrag – trag Versuche unter „PR eintragen“ ein.' : '';
  }
}

/* ---------- Progress-Foto mit Overlay ---------- */
let CAM = null;
function stopCam() { if (!CAM) return; clearInterval(CAM.cd); CAM.stream?.getTracks().forEach(t => t.stop()); CAM = null; }
async function photoCamera() {
  if (!navigator.mediaDevices?.getUserMedia) return $('#photoFile').click();
  const last = PH.list[0];
  openSheet(`<h2>Progress-Foto</h2>
    <div class="cam mirror" id="cam"><video id="camV" playsinline muted autoplay></video>${last ? `<img class="ghost" id="camG" src="${last.url}" alt="" style="opacity:.35">` : ''}<div class="cam-count hidden" id="camCount"></div></div>
    ${last ? `<label class="slider" style="margin-top:16px"><span>Overlay</span><input type="range" id="camOp" min="0" max="80" value="35"><b id="camOpV">35 %</b></label>`
      : '<div class="small muted" style="margin-top:14px">Ab dem nächsten Foto wird dieses hier halbtransparent eingeblendet – so triffst du immer dieselbe Pose.</div>'}
    <div class="cam-ctrl"><button class="icon-btn" data-act="camFlip" aria-label="Kamera wechseln">⇆</button><button class="shutter" data-act="camShot" aria-label="Aufnehmen"></button><button class="icon-btn" data-act="camTimer" id="camT" aria-label="Selbstauslöser">0s</button></div>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn" data-act="camGallery">Aus Galerie</button></div>`);
  CAM = { facing: 'user', timer: 0 };
  await camStart();
}
async function camStart() {
  if (!CAM) return;
  CAM.stream?.getTracks().forEach(t => t.stop());
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: CAM.facing, width: { ideal: 1440 }, height: { ideal: 1920 } }, audio: false });
    const v = $('#camV');
    if (!CAM || !v) { stream.getTracks().forEach(t => t.stop()); return; }
    CAM.stream = stream; v.srcObject = stream; await v.play().catch(() => {});
    $('#cam')?.classList.toggle('mirror', CAM.facing === 'user');
  } catch { toast('Kamera nicht verfügbar – wähle ein Foto aus der Galerie'); }
}
function camCapture() {
  const v = $('#camV');
  if (!CAM || !v?.videoWidth) return toast('Kamera ist noch nicht bereit');
  const vw = v.videoWidth, vh = v.videoHeight, ar = 3 / 4; // gleicher 3:4-Ausschnitt wie in der Vorschau
  let sw = vw, sh = vh; if (vw / vh > ar) sw = vh * ar; else sh = vw / ar;
  const c = document.createElement('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
  const x = c.getContext('2d');
  if (CAM.facing === 'user') { x.translate(c.width, 0); x.scale(-1, 1); }
  x.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, c.width, c.height);
  navigator.vibrate?.(30);
  c.toBlob(b => { closeSheet(); if (b) addPhotos([b]); }, 'image/jpeg', 0.9);
}

/* =====================================================================
   Live-Vergleich · Gewohnheiten · Meal-Prep & Einkaufsliste · Check-in · Teilen · Tipps
   ===================================================================== */

/* ---------- Live-Vergleich im Workout ---------- */
function liveDelta(x, p) {
  const r = x.r ?? (x.done ? x.t : null);
  if (r == null || !p) return '';
  const dw = (x.w || 0) - (p.w || 0), dr = r - p.r;
  if (dw > 0.001) return `<em class="lv up">▲ ${fmt(dw, 2)} kg</em>`;
  if (dw < -0.001) return `<em class="lv down">▼ ${fmt(-dw, 2)} kg</em>`;
  if (dr > 0) return `<em class="lv up">▲ ${dr} Wdh</em>`;
  if (dr < 0) return `<em class="lv down">▼ ${-dr} Wdh</em>`;
  return '<em class="lv">= gleich</em>';
}
function liveSummary(e, prev) {
  const cur = WK(e.sets).reduce((a, x) => { const r = x.r ?? (x.done ? x.t : null); return r ? a + (x.w || 0) * r : a; }, 0);
  if (!prev) return cur ? `Heute <b>${fmt(cur)} kg</b> Volumen` : '';
  const pv = prev.sets.reduce((a, x) => a + (x.w || 0) * x.r, 0);
  if (!cur) return `Letztes Mal ${fmt(pv)} kg Volumen`;
  const d = cur - pv, pct = pv ? Math.abs(d / pv * 100) : 0;
  return `Heute <b>${fmt(cur)} kg</b> · letztes Mal ${fmt(pv)} kg${pv ? ` <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${fmt(pct)} %</span>` : ''}`;
}
function updateLive(ei) {
  const e = S.active?.entries[ei]; if (!e) return;
  const prev = exHistory(e.exId)[0];
  e.sets.forEach((x, si) => { const el = $(`#lv_${ei}_${si}`); if (el) el.innerHTML = liveDelta(x, x.type === 'warm' ? null : prev?.sets[workIdx(e, si)]); });
  const s = $(`#lvs_${ei}`); if (s) s.innerHTML = liveSummary(e, prev);
}

/* ---------- Supplements & Gewohnheiten ---------- */
const HABIT_PRESETS = ['Kreatin', 'Vitamin D', 'Omega-3', 'Magnesium', 'Multivitamin', 'Protein-Shake', '10.000 Schritte', '8 h Schlaf', 'Dehnen / Mobility', '3 l Wasser', 'Kein Alkohol', 'Kein Süßkram'];
const habitDone = (id, d = today()) => !!S.habitLog[d]?.[id];
function habitStreak(id) {
  let d = today(), n = 0;
  if (!habitDone(id, d)) d = addDays(d, -1);
  while (habitDone(id, d)) { n++; d = addDays(d, -1); }
  return n;
}
function habitsTile() {
  if (!S.habits.length) return `<div class="tile wide" data-act="habitSheet"><div class="th"><span class="label">Supplements & Gewohnheiten</span>${ic('check')}</div>
    <div class="meta" style="margin:0 0 12px">Kreatin, Vitamine, Schritte, Schlaf … täglich abhaken und Streaks sammeln.</div><span class="btn sm" style="align-self:flex-start">Einrichten</span></div>`;
  const n = S.habits.filter(h => habitDone(h.id)).length;
  return `<div class="tile wide"><div class="th"><span class="label">Gewohnheiten · ${n} / ${S.habits.length}</span><button class="link small muted" style="font-weight:500" data-act="habitSheet">Bearbeiten</button></div>
    <div class="habits">${S.habits.map(h => { const on = habitDone(h.id), st = habitStreak(h.id); return `<button class="habit ${on ? 'on' : ''}" data-act="habitToggle" data-id="${h.id}">
      <i>${on ? '✓' : ''}</i><span>${esc(h.name)}</span>${st > 1 ? `<small>${st} T</small>` : ''}</button>`; }).join('')}</div></div>`;
}
function habitSheet() {
  const left = HABIT_PRESETS.filter(p => !S.habits.some(h => h.name.toLowerCase() === p.toLowerCase()));
  openSheet(`<h2>Supplements & Gewohnheiten</h2>
    ${S.habits.length ? `<div class="list">${S.habits.map((h, i) => `<div class="item"><div class="t"><b>${esc(h.name)}</b><span>Streak ${habitStreak(h.id)} Tage · ${Object.values(S.habitLog).filter(d => d[h.id]).length}× erledigt</span></div>
      ${i ? `<button class="x" data-act="habitUp" data-i="${i}">↑</button>` : ''}<button class="x" data-act="habitDel" data-id="${h.id}">×</button></div>`).join('')}</div>` : '<div class="empty small">Noch keine Gewohnheiten.</div>'}
    <div class="row" style="margin-top:14px"><input id="hb_in" placeholder="Eigene, z.B. Zink oder Lesen" style="flex:1"><button class="btn primary" data-act="habitAdd">+</button></div>
    ${left.length ? `<h3>Vorschläge</h3><div class="chips">${left.map(p => `<button class="chip" data-act="habitPreset" data-n="${esc(p)}">+ ${esc(p)}</button>`).join('')}</div>` : ''}
    <div class="sheet-actions"><button class="btn primary" data-act="closeSheet">Fertig</button></div>`);
}

/* ---------- Meal-Prep & Einkaufsliste ---------- */
const recipeById = id => S.recipes.find(r => r.id === id);
const autoMeal = () => mealForNow();
const fmtQty = g => (g == null || !g ? '' : g >= 1000 ? `${fmt(g / 1000, 2)} kg` : `${fmt(Math.max(5, Math.round(g / 5) * 5))} g`);
function ingredientsOf(r, portions) { const k = portions / (r.portions || 1); return r.items.map(i => ({ name: i.name, g: (i.g || 0) * k })); }
function addToShopping(list) {
  let n = 0;
  for (const it of list) {
    const ex = S.shopping.find(s => !s.done && s.name.toLowerCase() === it.name.toLowerCase());
    if (ex) { if (it.g) ex.g = (ex.g || 0) + it.g; } else { S.shopping.push({ id: uid(), name: it.name, g: it.g || null, done: false }); n++; }
  }
  return n;
}
function prepCard() {
  const ready = S.prep.filter(p => p.status === 'ready' && p.left > 0 && recipeById(p.rid)), planned = S.prep.filter(p => p.status === 'planned');
  const openShop = S.shopping.filter(s => !s.done).length;
  return `<div class="card"><div class="card-head"><span class="label">Meal-Prep</span><div class="row" style="gap:6px">
      <button class="btn sm ghost" data-act="shopping">Einkaufsliste${openShop ? ` · ${openShop}` : ''}</button><button class="btn sm" data-act="prepSheet">Planen</button></div></div>
    ${ready.length ? `<div class="list">${ready.map(p => { const r = recipeById(p.rid), s = perPortion(r); return `<div class="item"><div class="t"><b>${esc(r.name)}</b>
      <span>${p.left} von ${p.portions} Portionen · ${fmt(s.kcal)} kcal · P ${fmt(s.p)} g</span></div><button class="btn sm primary" data-act="prepEat" data-id="${p.id}">Essen</button></div>`; }).join('')}</div>`
    : `<div class="small muted">${planned.length ? `${planned.length} Rezept${planned.length > 1 ? 'e' : ''} eingeplant – nach dem Kochen als „gekocht“ markieren.` : 'Rezepte für die Woche planen, gezielt einkaufen und Portionen mit einem Tipp loggen.'}</div>`}
  </div>`;
}
function prepSheet() {
  const planned = S.prep.filter(p => p.status === 'planned' && recipeById(p.rid)), ready = S.prep.filter(p => p.status === 'ready' && p.left > 0 && recipeById(p.rid));
  const tot = planned.reduce((a, p) => { const s = perPortion(recipeById(p.rid)); a.kcal += s.kcal * p.portions; a.p += s.p * p.portions; a.n += p.portions; return a; }, { kcal: 0, p: 0, n: 0 });
  openSheet(`<h2>Meal-Prep</h2>
    ${S.recipes.length ? `<div class="grid2" style="grid-template-columns:2fr 1fr"><label class="f"><span>Rezept</span><select id="mp_r">${S.recipes.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label>
      <label class="f"><span>Portionen</span><input id="mp_n" inputmode="numeric" value="4"></label></div>
      <button class="btn block" data-act="prepAdd">+ Einplanen</button>`
    : '<div class="empty small">Leg zuerst ein Rezept an – dann kannst du es hier für die Woche einplanen.</div><button class="btn block" data-act="newRecipe">+ Neues Rezept</button>'}
    ${planned.length ? `<h3>Eingeplant</h3><div class="list">${planned.map(p => { const r = recipeById(p.rid); return `<div class="item"><div class="t"><b>${esc(r.name)}</b>
      <span>${p.portions} Portionen · ${fmt(perPortion(r).kcal * p.portions)} kcal</span></div><button class="btn sm" data-act="prepCooked" data-id="${p.id}">Gekocht ✓</button><button class="x" data-act="prepDel" data-id="${p.id}">×</button></div>`; }).join('')}</div>
      <div class="small muted" style="margin-top:8px">${tot.n} Portionen · Ø ${fmt(tot.kcal / tot.n)} kcal und ${fmt(tot.p / tot.n)} g Protein pro Portion</div>
      <button class="btn block" style="margin-top:12px" data-act="shFromPrep">Alle Zutaten auf die Einkaufsliste</button>` : ''}
    ${ready.length ? `<h3>Vorrat</h3><div class="list">${ready.map(p => `<div class="item"><div class="t"><b>${esc(recipeById(p.rid).name)}</b><span>${p.left} von ${p.portions} übrig · gekocht ${fmtDate(p.date)}</span></div>
      <button class="x" data-act="prepDel" data-id="${p.id}">×</button></div>`).join('')}</div>` : ''}
    <div class="sheet-actions"><button class="btn" data-act="shopping">Einkaufsliste</button><button class="btn primary" data-act="closeSheet">Fertig</button></div>`);
}
function shoppingSheet() {
  const open = S.shopping.filter(s => !s.done), done = S.shopping.filter(s => s.done);
  const item = s => `<div class="item tap shop ${s.done ? 'done' : ''}" data-act="shToggle" data-id="${s.id}"><i class="cb">${s.done ? '✓' : ''}</i>
    <div class="t"><b>${esc(s.name)}</b>${s.g ? `<span>${fmtQty(s.g)}</span>` : ''}</div><button class="x" data-act="shDel" data-id="${s.id}">×</button></div>`;
  openSheet(`<h2>Einkaufsliste</h2>
    <div class="row" style="margin-bottom:14px"><input id="sh_in" placeholder="Artikel hinzufügen …" style="flex:1" autocomplete="off"><button class="btn primary" data-act="shAdd">+</button></div>
    ${open.length ? `<div class="list">${open.map(item).join('')}</div>` : '<div class="empty small">Die Liste ist leer. Füge Artikel hinzu oder übernimm Zutaten aus Meal-Prep oder Rezepten.</div>'}
    ${done.length ? `<h3>Im Wagen · ${done.length}</h3><div class="list">${done.map(item).join('')}</div>` : ''}
    <div class="row" style="margin-top:14px"><button class="btn sm" data-act="shFromRecipe">+ Aus Rezept</button><button class="btn sm" data-act="shFromPrep">+ Aus Meal-Prep</button>${done.length ? '<button class="btn sm ghost" data-act="shClear">Erledigte löschen</button>' : ''}</div>
    <div class="sheet-actions"><button class="btn" data-act="shShare">Teilen</button><button class="btn primary" data-act="closeSheet">Fertig</button></div>`);
}
function shFromRecipeSheet() {
  if (!S.recipes.length) return toast('Noch keine Rezepte angelegt');
  openSheet(`<h2>Zutaten aus Rezept</h2>
    <div class="grid2" style="grid-template-columns:2fr 1fr"><label class="f"><span>Rezept</span><select id="sr_r">${S.recipes.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label>
    <label class="f"><span>Portionen</span><input id="sr_n" inputmode="numeric" value="${S.recipes[0].portions}"></label></div>
    <div class="sheet-actions"><button class="btn" data-act="shopping">Zurück</button><button class="btn primary" data-act="shRecipeAdd">Hinzufügen</button></div>`);
}

/* ---------- Wöchentlicher Check-in ---------- */
const CHECK_Q = [['energy', 'Energie', 'niedrig', 'hoch'], ['sleep', 'Schlaf', 'schlecht', 'super'], ['hunger', 'Hunger', 'kaum', 'stark'],
  ['stress', 'Stress', 'entspannt', 'sehr hoch'], ['training', 'Training', 'zäh', 'stark'], ['adherence', 'Plan eingehalten', 'kaum', 'komplett']];
let CI = null;
function checkinDue() {
  if (!(S.workouts.length || S.foods.length || S.weights.length)) return false;
  const ws = ymd(weekStart(new Date()));
  if (S.checkins.some(c => c.date >= ws)) return false;
  return (new Date().getDay() + 6) % 7 >= (S.settings.weighDay + 6) % 7;
}
function checkinSheet() {
  const lw = latestWeight();
  CI = Object.fromEntries(CHECK_Q.map(([k]) => [k, 3]));
  openSheet(`<h2>Wöchentlicher Check-in</h2>
    <div class="small muted" style="margin-bottom:16px">Eine Minute – damit der Coach dich besser einschätzen kann.</div>
    <label class="f"><span>Gewicht heute (kg, optional)</span><input id="ci_kg" inputmode="decimal" placeholder="${lw ? fmt(lw.kg, 1) : 'z.B. 80,5'}"></label>
    ${CHECK_Q.map(([k, l, lo, hi]) => `<div class="fl"><span>${l}</span><div class="scale" data-ci="${k}">${[1, 2, 3, 4, 5].map(v => `<button class="${v === 3 ? 'on' : ''}" data-act="ciSet" data-k="${k}" data-v="${v}">${v}</button>`).join('')}</div>
      <div class="scale-lbl"><span>${lo}</span><span>${hi}</span></div></div>`).join('')}
    <label class="f"><span>Notiz</span><input id="ci_note" placeholder="Was lief gut, was nicht?"></label>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Später</button><button class="btn primary" data-act="ciSave">Speichern</button></div>`);
}
function checkinAdvice(c) {
  const tips = [], goal = S.settings.goal;
  if (c.sleep <= 2) tips.push('Schlaf ist gerade dein größter Hebel: 7–9 Stunden, feste Zeiten und 30 Minuten vor dem Schlafen kein Handy.');
  if (c.energy <= 2 && c.training <= 2) tips.push('Energie und Training sind schwach – gönn dir einen zusätzlichen Ruhetag und achte auf Schlaf und genug Kalorien.');
  else if (c.energy <= 2) tips.push('Wenig Energie: Prüfe Schlaf, Wasser und ob du genug isst – ein zu großes Defizit kostet Leistung.');
  if (c.hunger >= 4 && goal === 'cut') tips.push('Starker Hunger: mehr Protein und sättigende Lebensmittel (Gemüse, Kartoffeln, Skyr). Hält es an, iss 100–150 kcal mehr.');
  if (c.hunger <= 2 && goal === 'bulk') tips.push('Wenig Hunger im Aufbau: Flüssige Kalorien (Shake, Milch) und energiedichte Snacks wie Nüsse helfen.');
  if (c.stress >= 4) tips.push('Viel Stress: Spaziergänge, Atemübungen und etwas weniger Trainingsvolumen unterstützen die Regeneration.');
  if (c.adherence <= 2) tips.push('Plantreue niedrig: Mach es dir leichter – Mahlzeit-Vorlagen und Meal-Prep sparen Entscheidungen im Alltag.');
  if (c.adherence >= 4 && c.energy >= 4 && c.training >= 4) tips.push('Starke Woche – Energie, Training und Plantreue passen. Genau so weitermachen.');
  const ct = coachTip(); if (ct) tips.push(ct.t);
  return tips.length ? tips : ['Solide Woche. Bleib dran – Konstanz bringt die Ergebnisse.'];
}
function checkinCard() {
  if (!S.checkins.length) return `<div class="card tap-card" data-act="checkin"><div class="card-head" style="margin:0"><span class="label">Wöchentlicher Check-in</span><span class="btn sm">Starten</span></div>
    <div class="small muted" style="margin-top:8px">Energie, Schlaf, Hunger, Stress – einmal pro Woche, der Coach wertet es aus.</div></div>`;
  const cs = [...S.checkins].sort((a, b) => a.date.localeCompare(b.date)), last = cs.at(-1), recent = cs.slice(-8);
  return `<div class="card"><div class="card-head"><span class="label">Check-in · ${fmtDate(last.date)}</span><button class="btn sm" data-act="checkin">Neu</button></div>
    <div class="ci-grid">${CHECK_Q.map(([k, l]) => `<div><span>${l}</span><div class="ci-bars">${recent.map(c => `<i style="height:${c[k] * 20}%" class="${c === last ? 'on' : ''}"></i>`).join('')}</div><b>${last[k]}</b></div>`).join('')}</div>
    ${last.note ? `<div class="small muted" style="margin-top:10px">„${esc(last.note)}“</div>` : ''}</div>`;
}

/* ---------- Teilbare Karten (Bild 1080 × 1350) ---------- */
let SHARE = null;
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function renderShareCard({ eyebrow, title, sub, stats = [], lines = [], photos = null, note = null }) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const F = (w, s) => `${w} ${s}px -apple-system, "SF Pro Display", "Inter", "Segoe UI", Roboto, sans-serif`;
  const cv = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const gold = x.createLinearGradient(80, 0, W - 80, 0); gold.addColorStop(0, cv('--accent-hi') || '#ecd5a6'); gold.addColorStop(1, cv('--accent2') || '#b48f57');
  const bg = x.createRadialGradient(W / 2, -200, 100, W / 2, 200, 1100); bg.addColorStop(0, cv('--glow') || '#2a2416'); bg.addColorStop(0.55, '#0d0d0e'); bg.addColorStop(1, '#0a0a0b');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  const fit = (t, max) => { t = String(t); while (x.measureText(t).width > max && t.length > 3) t = t.slice(0, -2).trimEnd() + '…'; return t; };
  let y = 120;
  x.fillStyle = '#9a958d'; x.font = F(600, 26); x.fillText(eyebrow.toUpperCase().split('').join(String.fromCharCode(8202)), 80, y);
  y += 92; x.fillStyle = '#f3f0ea'; x.font = F(600, 78); x.fillText(fit(title, W - 160), 80, y);
  if (sub) { y += 56; x.fillStyle = '#9a958d'; x.font = F(400, 34); x.fillText(fit(sub, W - 160), 80, y); }
  y += 60;
  if (photos) {
    const pw = (W - 160 - 24) / 2, ph = pw * 4 / 3;
    for (let i = 0; i < 2; i++) {
      const p = photos[i], X = 80 + i * (pw + 24);
      x.save(); rr(X, y, pw, ph, 28); x.clip();
      try { const im = await loadImg(p.url); const s = Math.max(pw / im.width, ph / im.height); x.drawImage(im, X + (pw - im.width * s) / 2, y + (ph - im.height * s) / 2, im.width * s, im.height * s); } catch { x.fillStyle = '#1b1b1e'; x.fillRect(X, y, pw, ph); }
      const sh = x.createLinearGradient(0, y + ph - 180, 0, y + ph); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.8)'); x.fillStyle = sh; x.fillRect(X, y + ph - 180, pw, 180);
      x.restore();
      x.fillStyle = '#f3f0ea'; x.font = F(600, 34); x.fillText(p.label, X + 26, y + ph - 64);
      x.fillStyle = '#c9c3b8'; x.font = F(400, 28); x.fillText(p.sub, X + 26, y + ph - 26);
    }
    y += ph + 50;
  }
  if (stats.length) {
    const n = stats.length, gap = 20, sw = (W - 160 - gap * (n - 1)) / n;
    stats.forEach(([label, val], i) => {
      const X = 80 + i * (sw + gap);
      rr(X, y, sw, 170, 30); x.fillStyle = 'rgba(255,255,255,.04)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 2; x.stroke();
      x.fillStyle = i === 0 ? gold : '#f3f0ea'; x.font = F(300, 62); x.fillText(fit(val, sw - 50), X + 28, y + 92);
      x.fillStyle = '#9a958d'; x.font = F(500, 24); x.fillText(label.toUpperCase(), X + 28, y + 136);
    });
    y += 230;
  }
  if (note) {
    x.fillStyle = gold; x.font = F(500, 44);
    const words = String(note).split(' '); let line = '', rows = 0;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > W - 160 && line) { x.fillText(line, 80, y); y += 58; line = w; rows++; if (rows >= 2) break; } else line = t;
    }
    if (line && rows < 3) { x.fillText(fit(line, W - 160), 80, y); y += 58; }
    y += 50;
  }
  x.font = F(400, 34);
  for (const [l, r, hl] of lines.slice(0, Math.max(0, Math.floor((H - 200 - y) / 76)))) {
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(80, y - 50, W - 160, 2);
    if (hl) { x.fillStyle = gold; x.beginPath(); x.arc(92, y - 12, 7, 0, 7); x.fill(); }
    x.fillStyle = '#f3f0ea'; x.font = F(500, 34); x.textAlign = 'left';
    const L = fit(l, (W - 160) * 0.55), lw = x.measureText(L).width + (hl ? 34 : 0);
    x.fillText(L, hl ? 114 : 80, y);
    x.fillStyle = hl ? (cv('--accent-hi') || '#e3c792') : '#b8b2a8'; x.font = F(400, 34); x.textAlign = 'right'; x.fillText(fit(r, W - 160 - lw - 40), W - 80, y);
    x.textAlign = 'left'; y += 76;
  }
  // Fuß: Marke
  x.strokeStyle = gold; x.lineWidth = 6; x.lineCap = 'round';
  const bx = 80, by = H - 96;
  x.lineJoin = 'round';
  [1, 0.78, 0.52].forEach((a, i) => { x.globalAlpha = a; const y0 = by - 20 + i * 13; x.beginPath(); x.moveTo(bx + 6, y0 + 15); x.lineTo(bx + 30, y0); x.lineTo(bx + 54, y0 + 15); x.stroke(); });
  x.globalAlpha = 1;
  x.fillStyle = '#f3f0ea'; x.font = F(600, 30); x.fillText('DUTY FIRST', bx + 84, by + 11);
  x.fillStyle = '#6d6962'; x.font = F(400, 26); x.textAlign = 'right'; x.fillText(new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }), W - 80, by + 10); x.textAlign = 'left';
  return new Promise(res => c.toBlob(b => res(b), 'image/png'));
}
async function openShare(spec, filename) {
  toast('Karte wird erstellt …');
  const blob = await renderShareCard(spec);
  if (!blob) return toast('Bild konnte nicht erstellt werden');
  if (SHARE?.url) URL.revokeObjectURL(SHARE.url);
  SHARE = { blob, url: URL.createObjectURL(blob), name: filename };
  openSheet(`<h2>Teilen</h2><img class="share-prev" src="${SHARE.url}" alt="Vorschau">
    <div class="sheet-actions"><button class="btn" data-act="shareSave">Speichern</button><button class="btn primary" data-act="shareSend">Teilen</button></div>`);
}
function workoutShareSpec(id) {
  const w = S.workouts.find(x => x.id === id); if (!w) return null;
  const vol = w.entries.reduce((a, e) => a + WK(e.sets).reduce((b, s) => b + (s.w || 0) * s.r, 0), 0);
  const nSets = w.entries.reduce((a, e) => a + WK(e.sets).length, 0);
  const prEx = new Set(autoPRs().events.filter(ev => ev.date === w.date).map(ev => ev.exId));
  return {
    eyebrow: `Workout · ${fmtDate(w.date, { weekday: 'long', day: 'numeric', month: 'long' })}`,
    title: w.name.split(' (')[0], sub: `${mmss((w.end - w.start) / 1000)} Dauer · ${w.entries.length} Übungen`,
    stats: [['Volumen', vol >= 10000 ? `${fmt(vol / 1000, 1)} t` : `${fmt(vol)} kg`], ['Sätze', fmt(nSets)], ['Rekorde', fmt(prEx.size)]],
    lines: w.entries.filter(e => WK(e.sets).length).map(e => { const b = bestSet(WK(e.sets)); return [exById(e.exId)?.name || 'Übung', `${WK(e.sets).length}× · ${prLabel({ kind: 'lift', ...b })}${prEx.has(e.exId) ? '  PR' : ''}`, prEx.has(e.exId)]; }),
  };
}
function statsShareSpec() {
  const P = periodOf(UI.statsMode, UI.statsOff), x = periodStats(P.s, P.e);
  const lines = [];
  if (x.cs.length) lines.push(['Cardio', `${fmt(x.cMin)} min${x.cKm ? ` · ${fmt(x.cKm, 1)} km` : ''}`]);
  if (x.avgK != null) lines.push(['Ø Kalorien', `${fmt(x.avgK)} kcal`]);
  if (x.avgP != null) lines.push(['Ø Protein', `${fmt(x.avgP)} g`]);
  if (x.wStart != null && x.wEnd != null) lines.push(['Gewicht', `${sgn(x.wEnd - x.wStart)} kg`]);
  if (x.top.length) lines.push(['Meiste Sätze', x.top.slice(0, 2).map(([m]) => mName(m)).join(', ')]);
  return { eyebrow: `Rückblick · ${{ week: 'Woche', month: 'Monat', year: 'Jahr' }[UI.statsMode]}`, title: P.label, sub: P.sub || '', note: x.highlight,
    stats: [['Trainings', fmt(x.n)], ['Volumen', `${fmt(x.vol / 1000, 1)} t`], ['Rekorde', fmt(x.prs.length)]], lines };
}

/* ---------- Tipp des Tages ---------- */
const TIPS = [
  ['Training', 'Progressive Overload ist der Schlüssel: mehr Gewicht, mehr Wiederholungen oder sauberere Technik – Hauptsache, du steigerst dich über die Wochen.'],
  ['Training', 'Die meisten Sätze 1–3 Wiederholungen vor dem Muskelversagen beenden: fast derselbe Reiz bei deutlich weniger Ermüdung.'],
  ['Training', 'Jeden Muskel etwa 2× pro Woche zu trainieren bringt meist mehr als ein einziger großer Tag.'],
  ['Training', 'Bei schweren Grundübungen lohnen sich 2–3 Minuten Pause – der nächste Satz wird spürbar stärker.'],
  ['Training', 'Kontrolliert absenken (2–3 Sekunden) verbessert Technik und Muskelreiz.'],
  ['Training', 'Zum Aufwärmen reichen meist 2–3 leichte Sätze der ersten Übung – kein langes Cardio nötig.'],
  ['Training', 'Volle Bewegungsamplitude schlägt Ego-Gewicht – besonders die gedehnte Position ist wichtig fürs Wachstum.'],
  ['Training', 'Steckst du bei einer Übung fest, hilft oft schon mehr Schlaf, etwas mehr Essen oder ein Satz mehr pro Woche.'],
  ['Training', 'Grundübungen zuerst, Isolation danach – so hast du die meiste Kraft für die schweren Sachen.'],
  ['Training', 'Schau dir im Workout den Live-Vergleich an: Ein Satz mehr oder 2,5 kg mehr als letztes Mal ist Fortschritt.'],
  ['Ernährung', 'Ziel: etwa 1,6–2,2 g Protein pro kg Körpergewicht am Tag.'],
  ['Ernährung', 'Verteile dein Protein auf 3–5 Mahlzeiten mit jeweils 20–40 g.'],
  ['Ernährung', 'Kreatin-Monohydrat (3–5 g täglich) ist eines der am besten erforschten Supplements – die Uhrzeit ist egal.'],
  ['Ernährung', 'Im Defizit machen Gemüse, Kartoffeln und mageres Protein lange satt bei wenig Kalorien.'],
  ['Ernährung', 'Flüssige Kalorien aus Säften, Softdrinks und Alkohol werden oft vergessen – sie zählen voll mit.'],
  ['Ernährung', 'Wiege Reis und Nudeln roh: Gekocht wiegen sie etwa das Doppelte bis Dreifache.'],
  ['Ernährung', 'Ein moderates Defizit von 0,5–1 % Körpergewicht pro Woche schützt deine Muskulatur.'],
  ['Ernährung', 'Im Aufbau reichen +200–300 kcal Überschuss – mehr landet vor allem als Fett.'],
  ['Ernährung', '25–35 g Ballaststoffe am Tag unterstützen Verdauung und Sättigung.'],
  ['Ernährung', 'Meal-Prep am Sonntag spart unter der Woche Zeit und schlechte Spontan-Entscheidungen.'],
  ['Regeneration', 'Muskeln wachsen in der Erholung: 7–9 Stunden Schlaf sind ein echter Leistungsbooster.'],
  ['Regeneration', 'Schlafmangel senkt die Kraft und steigert den Hunger – Schlaf ist Teil des Trainings.'],
  ['Regeneration', 'Lockere Bewegung an Ruhetagen, etwa Spazierengehen, fördert die Erholung.'],
  ['Regeneration', 'Muskelkater ist kein Maßstab für ein gutes Training.'],
  ['Regeneration', 'Schon 2 % Flüssigkeitsverlust können die Leistung senken – trink über den Tag verteilt.'],
  ['Regeneration', '7.000–10.000 Schritte am Tag erhöhen den Verbrauch deutlich, ohne die Regeneration zu stören.'],
  ['Fortschritt', 'Dein Gewicht schwankt täglich um 1–2 kg durch Wasser, Salz und Verdauung. Entscheidend ist der Wochentrend.'],
  ['Fortschritt', 'Fotos und Maße zeigen oft Fortschritt, wenn die Waage stillsteht – besonders beim gleichzeitigen Muskelaufbau.'],
  ['Fortschritt', 'Konstanz schlägt Perfektion: Drei Trainings pro Woche über ein Jahr bringen mehr als sechs für einen Monat.'],
  ['Fortschritt', 'Wiege dich immer gleich: morgens, nüchtern, nach dem Toilettengang.'],
  ['Fortschritt', 'Setz dir ein konkretes Ziel mit Deadline – unter Progress → PRs siehst du, ob du im Plan bist.'],
  ['Fortschritt', 'Der wöchentliche Check-in hilft dem Coach, Schlaf, Stress und Hunger bei seinen Tipps zu berücksichtigen.'],
];
function tipOfDay() { const n = Math.floor(parseYmd(today()).getTime() / 864e5) + (UI.tipOff || 0); return TIPS[((n % TIPS.length) + TIPS.length) % TIPS.length]; }
function tipCard() {
  const [cat, text] = tipOfDay();
  return `<div class="card tipcard"><div class="row" style="justify-content:space-between"><span class="label">Tipp · ${cat}</span><button class="link small muted" style="font-weight:500" data-act="nextTip">Nächster ›</button></div>
    <div style="margin-top:10px;font-size:15px;line-height:1.55">${text}</div></div>`;
}

/* =====================================================================
   Übungsbibliothek · Gym-Modus · Adaptiver Kalorienbedarf
   ===================================================================== */

/* ---------- Übungsbibliothek ---------- */
let LB = null;
function exLibrary(mode) {
  LB = { mode, region: LB?.region || 'all', muscle: null, eq: 'all' };
  const title = { workout: 'Übung hinzufügen', routine: 'Übung zum Tag hinzufügen', manage: 'Übungsbibliothek' }[mode];
  openSheet(`<h2>${title}</h2>
    <input id="lq" type="search" placeholder="Suchen – Name, Muskel oder Gerät" autocomplete="off">
    <div class="chips lb-chips" id="lb_reg"></div>
    <div class="chips lb-chips sub" id="lb_mus"></div>
    <div class="chips lb-chips sub" id="lb_eq"></div>
    <div id="lb_res"></div>
    <div class="sheet-actions">${mode === 'routine' ? '<button class="btn" data-act="lbBack">‹ Zurück</button>' : ''}
      <button class="btn" data-act="editExercise" data-pick="${mode === 'workout' ? 1 : ''}">+ Eigene Übung</button>
      ${mode !== 'routine' ? '<button class="btn primary" data-act="closeSheet">Fertig</button>' : ''}</div>`);
  renderLib();
}
function renderLib() {
  if (!LB || !$('#lb_res')) return;
  const q = ($('#lq')?.value || '').trim().toLowerCase();
  $('#lb_reg').innerHTML = ['all', ...REGIONS].map(r => `<button class="chip ${LB.region === r ? 'on' : ''}" data-act="lbReg" data-r="${r}">${r === 'all' ? 'Alle' : r}</button>`).join('');
  const muscles = LB.region === 'all' ? [] : MUSCLE_LIST.filter(([, , rg]) => rg === LB.region).map(([m]) => m);
  $('#lb_mus').innerHTML = muscles.length > 1 ? ['', ...muscles].map(m => `<button class="chip ${(LB.muscle || '') === m ? 'on2' : ''}" data-act="lbMus" data-m="${m}">${m ? mName(m) : 'Alle Muskeln'}</button>`).join('') : '';
  const eqs = ['all', ...Object.keys(EQ).filter(k => S.exercises.some(e => (e.eq || 'other') === k))];
  $('#lb_eq').innerHTML = eqs.map(k => `<button class="chip ${LB.eq === k ? 'on2' : ''}" data-act="lbEq" data-k="${k}">${k === 'all' ? 'Alle Geräte' : EQ[k]}</button>`).join('');
  const xs = S.exercises.filter(e => {
    const pm = e.pm || [];
    if (LB.region !== 'all' && !pm.some(m => MUSCLE[m]?.region === LB.region)) return false;
    if (LB.muscle && !pm.includes(LB.muscle)) return false;
    if (LB.eq !== 'all' && (e.eq || 'other') !== LB.eq) return false;
    if (q && !(e.name.toLowerCase().includes(q) || pm.some(m => mName(m).toLowerCase().includes(q)) || (EQ[e.eq] || '').toLowerCase().includes(q))) return false;
    return true;
  });
  const groupOf = e => LB.muscle || (LB.region === 'all' ? e.pm[0] : e.pm.find(m => MUSCLE[m]?.region === LB.region) || e.pm[0]);
  const used = new Set(S.workouts.flatMap(w => w.entries.map(x => x.exId)));
  const inCtx = new Set(LB.mode === 'workout' ? (S.active?.entries || []).map(x => x.exId) : LB.mode === 'routine' ? RC?.exIds || [] : []);
  const groups = {}; xs.forEach(e => (groups[groupOf(e)] ||= []).push(e));
  $('#lb_res').innerHTML = xs.length ? MUSCLE_LIST.map(([m]) => m).filter(m => groups[m]).map(m => `<h3>${mName(m)} · ${groups[m].length}</h3><div class="list">${groups[m]
    .sort((a, b) => (used.has(b.id) - used.has(a.id)) || a.name.localeCompare(b.name)).map(e => {
      const b = used.has(e.id) ? bestSet(exHistory(e.id).flatMap(h => h.sets)) : null;
      return `<div class="item tap" data-act="lbPick" data-id="${e.id}"><div class="t"><b>${esc(e.name)}</b>
        <span>${EQ[e.eq] || 'Sonstiges'}${e.sm?.length ? ` · + ${e.sm.map(mName).join(', ')}` : ''}${b ? ` · Bestes ${prLabel({ kind: 'lift', ...b })}` : ''}</span></div>
        ${inCtx.has(e.id) ? '<span class="pill acc">drin</span>' : ''}<span class="muted">${LB.mode === 'manage' ? '›' : '+'}</span></div>`;
    }).join('')}</div>`).join('') : '<div class="empty small">Keine Übung gefunden – leg eine eigene an.</div>';
}
function libraryCard() {
  const counts = REGIONS.map(r => [r, S.exercises.filter(e => MUSCLE[e.pm?.[0]]?.region === r).length]);
  return `<div class="card tap-card" data-act="openLibrary"><div class="card-head"><h2>Übungsbibliothek</h2><span class="pill acc">${S.exercises.length} Übungen</span></div>
    <div class="chips">${counts.map(([r, n]) => `<span class="chip">${r} ${n}</span>`).join('')}</div>
    <div class="small muted" style="margin-top:10px">Nach Muskeln sortiert, mit Filter nach Gerät. Tippe eine Übung an für Verlauf, Wdh-Bereich, Steigerung & Pause.</div></div>`;
}

/* ---------- Gym-Modus ---------- */
let GM = null;
const gymFirstOpen = (from = 0) => {
  const en = S.active.entries;
  for (let k = 0; k < en.length; k++) { const i = (from + k) % en.length; if (en[i].sets.some(s => !s.done)) return i; }
  return null;
};
function gymNext() {
  if (!S.active) return null;
  const i = gymFirstOpen(GM?.ei || 0); if (i == null) return null;
  const e = S.active.entries[i], si = e.sets.findIndex(s => !s.done), x = e.sets[si], ex = exById(e.exId);
  return { ei: i, si, name: ex?.name || '', w: x.w || 0, r: x.r ?? x.t ?? RR(ex).min };
}
// Nur Stimmen, die auf dem Gerät laufen (localService) – Online-Stimmen würden den Text an einen Server schicken
const localVoice = () => { try { return speechSynthesis.getVoices().find(v => v.localService && /^de/i.test(v.lang)) || null; } catch { return null; } };
function speak(t) {
  if (!S.settings.gymVoice || !('speechSynthesis' in window)) return;
  const v = localVoice(); if (!v) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.voice = v; u.lang = v.lang; u.rate = 1.03; speechSynthesis.speak(u); } catch {}
}
const sayKg = w => (w ? `${fmt(w, 2).replace(',', ' Komma ')} Kilo` : 'Körpergewicht');
async function gymWake() { try { if (GM && 'wakeLock' in navigator && !document.hidden) GM.wake = await navigator.wakeLock.request('screen'); } catch {} }
function gymOpen() {
  if (!S.active) return;
  GM = { ei: gymFirstOpen() ?? 0, wake: null, warned: false };
  document.body.classList.add('gym-on'); $('#gym').classList.remove('hidden');
  renderGym(); gymWake();
}
function gymClose() {
  if (!GM) return;
  try { GM.wake?.release(); } catch {}
  GM = null; document.body.classList.remove('gym-on'); $('#gym').classList.add('hidden');
  try { speechSynthesis.cancel(); } catch {}
  render();
}
function renderGym() {
  if (!GM) return;
  if (!S.active) return gymClose();
  const a = S.active, el = $('#gym');
  const total = a.entries.reduce((n, e) => n + e.sets.length, 0), done = a.entries.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  const top = `<div class="gym-top"><button class="gym-ic" data-act="gymClose" aria-label="Zur Liste">${ic('list')}</button>
    <div class="gym-prog"><i style="width:${total ? done / total * 100 : 0}%"></i></div><span class="gym-t" data-elapsed>${mmss((Date.now() - a.start) / 1000)}</span>
    <button class="gym-ic" data-act="gymVoice" aria-label="Sprachansage">${ic(S.settings.gymVoice ? 'volume' : 'mute')}</button></div>`;
  let body;
  if (UI.rest) {
    const left = Math.max(0, (UI.rest.end - Date.now()) / 1000), n = gymNext(), C = 2 * Math.PI * 92;
    body = `<div class="gym-rest"><span class="label">Pause</span>
      <div class="gym-ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6"/>
        <circle id="gymArc" cx="100" cy="100" r="92" fill="none" stroke="url(#gold)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - left / UI.rest.total)}" transform="rotate(-90 100 100)"/>
        <defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent-hi)"/><stop offset="1" style="stop-color:var(--accent-lo)"/></linearGradient></defs></svg>
        <b id="gymRest">${mmss(left)}</b></div>
      <div class="row" style="justify-content:center;gap:10px"><button class="btn" data-act="restAdd" data-s="-15">−15 s</button><button class="btn" data-act="restAdd" data-s="15">+15 s</button><button class="btn primary" data-act="restSkip">Weiter</button></div>
      ${n ? `<div class="gym-next"><span class="label">Als Nächstes</span><b>${esc(n.name)}</b><span>Satz ${n.si + 1} · ${n.w ? fmt(n.w, 2) + ' kg' : 'Körpergewicht'} × ${n.r}</span></div>` : ''}</div>`;
  } else {
    const ei = GM.ei, e = a.entries[ei], ex = e && exById(e.exId);
    const si = e ? e.sets.findIndex(s => !s.done) : -1;
    if (gymFirstOpen() == null) {
      body = `<div class="gym-ex gym-end">${ic('trophy')}<h1>Alle Sätze erledigt</h1><div class="small muted">${done} Sätze · ${mmss((Date.now() - a.start) / 1000)}</div>
        <button class="gym-done" data-act="gymFinish">Training beenden</button><button class="btn ghost" data-act="gymClose">Zur Liste</button></div>`;
    } else if (!ex || si < 0) {
      body = `<div class="gym-ex gym-end"><h1>${esc(ex?.name || 'Übung')} erledigt</h1><button class="gym-done" data-act="gymGoto" data-i="${gymFirstOpen(ei)}">Nächste Übung</button></div>`;
    } else {
      const x = e.sets[si], prev = exHistory(ex.id)[0], p = x.type === 'warm' ? null : prev?.sets[workIdx(e, si)], r = x.r ?? x.t ?? RR(ex).min;
      body = `<div class="gym-ex">
        <span class="label">Übung ${ei + 1} / ${a.entries.length} · ${x.type === 'warm' ? `Aufwärmsatz ${e.sets.slice(0, si + 1).filter(z => z.type === 'warm').length}` : `Satz ${workIdx(e, si) + 1} / ${WK(e.sets).length}`}${x.type === 'drop' ? ' · Drop' : x.type === 'fail' ? ' · bis Versagen' : ''}</span>
        <h1>${esc(ex.name)}</h1>
        <div class="small muted">${p ? `Letztes Mal ${fmt(p.w, 2)} kg × ${p.r}` : 'Erstes Mal – sauber ausführen'}${x.type !== 'warm' && x.t != null ? ` → <b style="color:var(--accent)">heute ${fmt(x.w ?? 0, 2)} kg × ${x.t}</b>` : ''}${ex.note ? ` · ${esc(ex.note)}` : ''}</div>
        <div class="gym-val"><span class="label">Gewicht</span><div class="gym-step"><button data-act="gymAdj" data-f="w" data-d="-1" aria-label="weniger">−</button><b>${fmt(x.w ?? 0, 2)}<small>kg</small></b><button data-act="gymAdj" data-f="w" data-d="1" aria-label="mehr">+</button></div>
          ${ex.barbell ? `<div class="small muted">${plates(x.w || 0)}</div>` : ''}</div>
        <div class="gym-val"><span class="label">Wiederholungen</span><div class="gym-step"><button data-act="gymAdj" data-f="r" data-d="-1" aria-label="weniger">−</button><b>${r}</b><button data-act="gymAdj" data-f="r" data-d="1" aria-label="mehr">+</button></div></div>
        <div class="gym-delta">${liveDelta({ ...x, r }, p)}</div>
        <button class="gym-done" data-act="gymDone">Satz erledigt</button>
        <div class="gym-nav"><button class="btn sm ghost" data-act="gymGoto" data-i="${ei - 1}" ${ei ? '' : 'disabled'}>‹ Vorherige</button><button class="btn sm ghost" data-act="gymGoto" data-i="${ei + 1}" ${ei < a.entries.length - 1 ? '' : 'disabled'}>Nächste ›</button></div>
      </div>`;
    }
  }
  el.innerHTML = top + body;
}
function gymTick() {
  if (!GM || !UI.rest) return;
  const left = Math.max(0, (UI.rest.end - Date.now()) / 1000), t = $('#gymRest'), arc = $('#gymArc');
  if (!t) return renderGym();
  t.textContent = mmss(left);
  if (arc) arc.setAttribute('stroke-dashoffset', 2 * Math.PI * 92 * (1 - left / UI.rest.total));
  if (left <= 10.5 && left > 1 && !GM.warned) { GM.warned = true; speak('Noch zehn Sekunden'); }
}
function gymRestEnded() {
  if (!GM) return;
  GM.warned = false; renderGym();
  const n = gymNext();
  if (n) speak(`Weiter geht's. ${n.name}, Satz ${n.si + 1}. ${sayKg(n.w)}, ${n.r} Wiederholungen.`);
}

/* ---------- Adaptiver Kalorienbedarf ---------- */
const PACES = { cut: [[0.25, 'Sanft'], [0.5, 'Moderat'], [0.75, 'Zügig'], [1, 'Aggressiv']], bulk: [[0.1, 'Lean'], [0.25, 'Moderat'], [0.5, 'Zügig']], maintain: [[0, 'Halten']] };
function paceOf() {
  const st = S.settings, opts = PACES[st.goal] || PACES.maintain;
  return opts.some(o => o[0] === st.pace) ? st.pace : opts[Math.min(1, opts.length - 1)][0];
}
function formulaTDEE() {
  const st = S.settings, lw = latestWeight(); if (!lw) return null;
  return (10 * lw.kg + 6.25 * st.height - 5 * st.age + (st.sex === 'f' ? -161 : 5)) * st.activity;
}
/* Verbrauch = Ø gegessen − Gewichtsänderung × 7.700 kcal/kg (Regression über 28 Tage), mit Formel gemischt, solange wenig Daten */
function adaptiveTDEE(end = today(), days = 28) {
  const from = addDays(end, -days), intake = [];
  for (let d = from; d < end; d = addDays(d, 1)) { const k = dayTotals(d).kcal; if (k >= 800) intake.push(k); } // heute ist noch unvollständig
  const ws = S.weights.filter(w => w.date >= from && w.date <= end).map(w => [daysBetween(from, w.date), w.kg]);
  const span = ws.length ? Math.max(...ws.map(q => q[0])) - Math.min(...ws.map(q => q[0])) : 0;
  const formula = formulaTDEE();
  const base = { intakeDays: intake.length, weighs: ws.length, span, formula };
  if (intake.length < 10 || ws.length < 3 || span < 14) return { ok: false, ...base, need: { days: Math.max(0, 10 - intake.length), weighs: Math.max(0, 3 - ws.length), span: span < 14 } };
  const n = ws.length, mx = ws.reduce((a, q) => a + q[0], 0) / n, my = ws.reduce((a, q) => a + q[1], 0) / n;
  const slope = ws.reduce((a, q) => a + (q[0] - mx) * (q[1] - my), 0) / ws.reduce((a, q) => a + (q[0] - mx) ** 2, 0);
  const avgIn = intake.reduce((a, b) => a + b, 0) / intake.length;
  const obs = avgIn - slope * 7700;
  const conf = Math.min(1, intake.length / 21) * Math.min(1, ws.length / 4);
  const tdee = formula ? conf * obs + (1 - conf) * formula : obs;
  return { ok: true, ...base, tdee, obs, avgIn, slopeWeek: slope * 7, conf };
}
function kcalRecommendation() {
  const a = adaptiveTDEE(), st = S.settings, lw = latestWeight();
  const base = a.ok ? a.tdee : a.formula; if (!base || !lw) return null;
  const pace = paceOf(), dir = st.goal === 'cut' ? -1 : st.goal === 'bulk' ? 1 : 0;
  const kgWeek = dir * pace / 100 * lw.kg;
  const kcal = Math.max(st.sex === 'f' ? 1200 : 1500, Math.round((base + kgWeek * 7700 / 7) / 10) * 10);
  return { a, base, kcal, kgWeek, pace, adaptive: a.ok };
}
function applyKcalGoal(kcal) {
  const st = S.settings, lw = latestWeight();
  const protein = Math.round(lw.kg * 2), fat = Math.round(Math.max(lw.kg * 0.8, kcal * 0.25 / 9));
  Object.assign(st, { kcal, protein, fat, carbs: Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4)) });
}
const paceText = r => (r.kgWeek ? `${r.kgWeek < 0 ? '−' : '+'}${fmt(r.pace, 2)} % KG pro Woche ≈ ${sgn(r.kgWeek, 2)} kg` : 'Gewicht halten');
function energyCard() {
  const r = kcalRecommendation(); if (!r) return '';
  const a = r.a, st = S.settings;
  if (!a.ok) {
    const parts = [a.need.days && `noch ${a.need.days} Tage Essen loggen`, a.need.weighs && `noch ${a.need.weighs}× wiegen`, !a.need.weighs && a.need.span && 'Wiegungen über mind. 2 Wochen'].filter(Boolean);
    return `<div class="card tap-card" data-act="energySheet"><div class="card-head"><span class="label">Dein echter Kalorienbedarf</span><span class="pill">lernt noch</span></div>
      <div class="small">Aus dem, was du isst, und wie sich dein Gewicht entwickelt, berechne ich deinen tatsächlichen Verbrauch – genauer als jede Formel.</div>
      <div class="track" style="margin:14px 0 8px"><i style="width:${Math.min(100, (a.intakeDays / 10 * 50) + (Math.min(3, a.weighs) / 3 * 50))}%"></i></div>
      <div class="small muted">${parts.join(' · ')}${a.formula ? ` · Schätzung per Formel: ${fmt(a.formula)} kcal` : ''}</div></div>`;
  }
  const diff = r.kcal - st.kcal;
  return `<div class="card tap-card" data-act="energySheet">
    <div class="card-head"><span class="label">Dein Energiebedarf</span><span class="pill ${a.conf >= 0.8 ? 'acc' : ''}">${a.conf >= 0.8 ? 'gemessen' : 'wird genauer'}</span></div>
    <div class="row" style="align-items:flex-end;gap:18px;flex-wrap:nowrap"><div><div class="big">${fmt(r.base)}</div><div class="small muted">kcal Verbrauch pro Tag</div></div>
      <div class="small muted" style="margin-bottom:4px">Ø gegessen ${fmt(a.avgIn)} kcal<br>Gewicht ${sgn(a.slopeWeek, 2)} kg/Woche<br>Formel hätte ${fmt(a.formula)} gesagt</div></div>
    <div class="hr" style="margin:16px 0"></div>
    <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><span class="label">Empfohlenes Ziel</span><div style="font-size:21px;font-weight:500;margin-top:4px">${fmt(r.kcal)} kcal</div><div class="small muted">${paceText(r)}</div></div>
      ${Math.abs(diff) >= 30 ? '<button class="btn sm primary" data-act="applyKcal">Übernehmen</button>' : '<span class="pill up">aktuell</span>'}</div>
    ${st.autoKcal ? '<div class="small muted" style="margin-top:10px">Wird jeden Montag automatisch angepasst.</div>' : ''}</div>`;
}
function energySheet() {
  const r = kcalRecommendation(), st = S.settings;
  if (!r) return toast('Trag zuerst dein Gewicht und dein Profil ein');
  const a = r.a, opts = PACES[st.goal] || PACES.maintain, pace = paceOf();
  const hist = (S.tdeeHist || []).map(h => [parseYmd(h.date).getTime(), h.tdee]);
  openSheet(`<h2>Adaptiver Kalorienbedarf</h2>
    <div class="small muted" style="margin-bottom:14px">So funktioniert's: Dein Körper verbraucht, was du isst, minus das, was du abnimmst (1 kg ≈ 7.700 kcal). Aus den letzten 4 Wochen berechne ich so deinen echten Verbrauch und passe dein Ziel an.</div>
    <div class="grid3">
      <div class="stat"><b>${a.ok ? fmt(a.tdee) : '–'}</b><span>gemessen</span></div>
      <div class="stat"><b>${a.formula ? fmt(a.formula) : '–'}</b><span>Formel</span></div>
      <div class="stat"><b>${fmt(r.kcal)}</b><span>Empf. Ziel</span></div>
    </div>
    <h3>Tempo (${GOALS[st.goal]})</h3>
    <div class="chips">${opts.map(([v, l]) => `<button class="chip ${v === pace ? 'on' : ''}" data-act="setPace" data-v="${v}">${l}${v ? ` · ${fmt(v, 2)} %` : ''}</button>`).join('')}</div>
    <div class="small muted" style="margin-top:8px">${paceText(r)} · Ziel ändern unter „Mehr → Profil“.</div>
    <h3>Datenbasis (28 Tage)</h3>
    <div class="grid3">
      <div class="stat"><b>${a.intakeDays}</b><span>Tage geloggt</span></div>
      <div class="stat"><b>${a.weighs}</b><span>Wiegungen</span></div>
      <div class="stat"><b>${a.ok ? fmt(a.conf * 100) + ' %' : '–'}</b><span>Verlässlichkeit</span></div>
    </div>
    <div class="small muted" style="margin-top:8px">Tage mit unter 800 kcal zählen als unvollständig geloggt und werden ignoriert. Je vollständiger du loggst, desto genauer.</div>
    ${hist.length > 1 ? `<h3>Verlauf deines Verbrauchs</h3>${lineChart([{ pts: hist, color: 'var(--accent)', dots: true }], { h: 130 })}` : ''}
    <label class="row" style="margin-top:18px"><input type="checkbox" id="ek_auto" ${st.autoKcal ? 'checked' : ''}> <span>Ziel jeden Montag automatisch anpassen</span></label>
    <div class="sheet-actions">${Math.abs(r.kcal - st.kcal) >= 30 ? '<button class="btn primary" data-act="applyKcal">Ziel übernehmen</button>' : ''}<button class="btn" data-act="closeSheet">Schließen</button></div>`);
}
function recordTdee() {
  const wk = ymd(weekStart(new Date()));
  if (S.meta.tdeeWeek === wk) return;
  const a = adaptiveTDEE(); if (!a.ok) return;
  (S.tdeeHist ||= []).push({ date: today(), tdee: Math.round(a.tdee) });
  S.meta.tdeeWeek = wk; save();
}
function autoKcalCheck() {
  const st = S.settings; if (!st.autoKcal) return;
  const wk = ymd(weekStart(new Date())); if (S.meta.autoKcalWeek === wk) return;
  const r = kcalRecommendation(); if (!r || !r.adaptive) return;
  S.meta.autoKcalWeek = wk;
  if (Math.abs(r.kcal - st.kcal) >= 30) { const old = st.kcal; applyKcalGoal(r.kcal); save(); render(); setTimeout(() => toast(`Kalorienziel angepasst: ${fmt(old)} → ${fmt(r.kcal)} kcal`), 600); }
  else save();
}

/* =====================================================================
   Eigene Lebensmittel · Rezeptideen · Tagespläne
   ===================================================================== */

/* ---------- Eigene Lebensmittel ---------- */
const foodAll = () => [...(S.customFoods || []).map(x => ({ ...x, cat: x.cat || 'Eigene', own: true })), ...FOOD_DB];
let CF = null;
function customFoodSheet(id, pre, back) {
  const x = (S.customFoods || []).find(f => f.id === id) || pre || {};
  CF = { id: id || null, back: back || null };
  openSheet(`<h2>${id ? 'Lebensmittel bearbeiten' : 'Eigenes Lebensmittel'}</h2>
    <div class="ocr-box">
      <button class="btn primary block" data-act="ocrPick">${ic('camera')} Nährwerttabelle scannen</button>
      <div class="small muted" id="cf_ocr">Foto von der Tabelle machen – die Werte werden direkt auf dem Handy ausgelesen, es wird nichts hochgeladen.</div>
      <button class="link small" data-act="ocrPaste">Oder Text der Tabelle einfügen</button>
    </div>
    <label class="f"><span>Name</span><input id="cf_name" value="${esc(x.name || '')}" placeholder="z.B. Mein Proteinbrot (Bäcker XY)"></label>
    <label class="f"><span>Kategorie</span><select id="cf_cat">${['Eigene', ...Object.keys(FOOD_CATS)].map(c => `<option ${c === (x.cat && x.cat !== 'Online' ? x.cat : 'Eigene') ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <div class="grid2">
      <label class="f"><span>Portion (Bezeichnung)</span><input id="cf_pl" value="${esc(x.portion?.l || '1 Portion')}"></label>
      <label class="f"><span>Portion (g / ml)</span><input id="cf_pg" inputmode="decimal" value="${x.portion?.g || 100}"></label>
    </div>
    <div class="seg" id="cf_basis"><button class="on" data-act="cfBasis" data-b="100">pro 100 g</button><button data-act="cfBasis" data-b="portion">pro Portion</button></div>
    <div class="grid2">
      <label class="f"><span>Kalorien (kcal)</span><input id="cf_kcal" inputmode="decimal" value="${x.kcal != null ? fmt(x.kcal, 1) : ''}"></label>
      <label class="f"><span>Protein (g)</span><input id="cf_p" inputmode="decimal" value="${x.p != null ? fmt(x.p, 1) : ''}"></label>
      <label class="f"><span>Kohlenhydrate (g)</span><input id="cf_c" inputmode="decimal" value="${x.c != null ? fmt(x.c, 1) : ''}"></label>
      <label class="f"><span>Fett (g)</span><input id="cf_f" inputmode="decimal" value="${x.f != null ? fmt(x.f, 1) : ''}"></label>
    </div>
    <div class="small muted" id="cf_hint">Werte wie auf dem Etikett eintragen. Mit „pro Portion“ rechne ich automatisch auf 100 g um.</div>
    <div class="sheet-actions">${id ? `<button class="btn danger" data-act="delCustomFood" data-id="${id}">Löschen</button>` : ''}<button class="btn" data-act="${back === 'food' ? 'cfBack' : 'closeSheet'}">${back === 'food' ? '‹ Zurück' : 'Abbrechen'}</button><button class="btn primary" data-act="saveCustomFood">Speichern</button></div>`);
  CF.basis = '100';
}

/* ---------- Rezeptideen (Nährwerte werden aus der Lebensmittel-Datenbank berechnet) ---------- */
const IDEA_GOALS = { cut: 'Cut', maintain: 'Maintain', bulk: 'Bulk' };
const IDEA_MEALS = { breakfast: 'Frühstück', main: 'Hauptgericht', snack: 'Snack' };
const RECIPE_IDEAS = [
  // Frühstück
  { id: 'i_oats', name: 'Protein Overnight Oats', meal: 'breakfast', goals: ['cut', 'maintain', 'bulk'], min: 5, portions: 1, tags: ['vegetarisch', 'Meal-Prep'],
    items: [['Haferflocken', 50], ['Skyr', 150], ['Whey Protein', 15], ['Beeren (TK)', 100], ['Milch 1,5%', 100]],
    steps: ['Haferflocken, Skyr, Whey und Milch in einem Glas glatt rühren.', 'Abgedeckt über Nacht in den Kühlschrank stellen.', 'Morgens mit den Beeren toppen.'] },
  { id: 'i_pancakes', name: 'Protein-Pancakes mit Banane', meal: 'breakfast', goals: ['maintain', 'bulk'], min: 15, portions: 1, tags: ['vegetarisch'],
    items: [['Haferflocken', 60], ['Eiklar', 150], ['Ei', 60], ['Whey Protein', 30], ['Banane', 120]],
    steps: ['Haferflocken, Eiklar, Ei, Whey und die halbe Banane fein pürieren.', 'In einer beschichteten Pfanne kleine Pancakes bei mittlerer Hitze von beiden Seiten backen.', 'Mit der restlichen Banane in Scheiben servieren.'] },
  { id: 'i_egg_bread', name: 'Rührei auf Vollkornbrot', meal: 'breakfast', goals: ['cut', 'maintain'], min: 10, portions: 1, tags: ['vegetarisch'],
    items: [['Ei', 120], ['Eiklar', 99], ['Vollkornbrot', 50], ['Cherrytomaten', 100]],
    steps: ['Eier und Eiklar verquirlen, salzen und pfeffern.', 'In einer beschichteten Pfanne bei niedriger Hitze cremig stocken lassen.', 'Auf dem Brot mit den halbierten Tomaten anrichten.'] },
  { id: 'i_skyr_bowl', name: 'Skyr-Beeren-Bowl', meal: 'breakfast', goals: ['cut', 'maintain'], min: 3, portions: 1, tags: ['vegetarisch', 'schnell'],
    items: [['Skyr', 250], ['Heidelbeeren', 125], ['Haferflocken', 20], ['Honig', 10]],
    steps: ['Skyr in eine Schüssel geben.', 'Mit Heidelbeeren und Haferflocken toppen.', 'Mit Honig beträufeln.'] },
  { id: 'i_quark_roll', name: 'Quark-Schinken-Brötchen', meal: 'breakfast', goals: ['cut', 'maintain'], min: 5, portions: 1, tags: ['schnell'],
    items: [['Vollkornbrötchen', 120], ['Magerquark', 125], ['Kochschinken', 40], ['Gurke', 100]],
    steps: ['Brötchen aufschneiden und mit Magerquark bestreichen (mit Salz, Pfeffer, Schnittlauch würzen).', 'Mit Kochschinken und Gurkenscheiben belegen.'] },
  { id: 'i_bulk_shake', name: 'Bulk-Shake (1.000 kcal)', meal: 'snack', goals: ['bulk'], min: 3, portions: 1, tags: ['vegetarisch', 'schnell'],
    items: [['Milch 3,5 %', 500], ['Haferflocken', 80], ['Whey Protein', 30], ['Banane', 120], ['Erdnussbutter', 30]],
    steps: ['Alle Zutaten in den Mixer geben.', 'Etwa 30 Sekunden cremig mixen – fertig.'] },
  // Hauptgerichte
  { id: 'i_chicken_bowl', name: 'Hähnchen-Reis-Bowl', meal: 'main', goals: ['cut', 'maintain', 'bulk'], min: 25, portions: 1, tags: ['Meal-Prep'],
    items: [['Hähnchenbrust (roh)', 200], ['Reis (roh)', 80], ['Brokkoli', 200], ['Sojasauce', 15], ['Rapsöl', 5]],
    steps: ['Reis nach Packungsanweisung kochen, Brokkoli die letzten 5 Minuten mitdämpfen.', 'Hähnchen würfeln und im Öl rundum goldbraun braten.', 'Alles in einer Schüssel anrichten und mit Sojasauce abschmecken.'] },
  { id: 'i_turkey_wrap', name: 'Puten-Wrap', meal: 'main', goals: ['cut', 'maintain'], min: 15, portions: 1, tags: ['schnell'],
    items: [['Wrap (Weizen)', 60], ['Putenbrust (roh)', 150], ['Blattsalat', 50], ['Tomate', 100], ['Joghurt-Dressing', 30]],
    steps: ['Putenbrust in Streifen schneiden, würzen und anbraten.', 'Wrap kurz in der Pfanne erwärmen.', 'Mit Salat, Tomate, Pute und Dressing füllen und einrollen.'] },
  { id: 'i_bolo', name: 'Protein-Bolognese', meal: 'main', goals: ['maintain', 'bulk'], min: 25, portions: 1, tags: ['Meal-Prep'],
    items: [['Vollkornnudeln (roh)', 100], ['Rinderhack mager 5% (roh)', 150], ['Tomatensauce (Passata)', 200], ['Zwiebel', 50], ['Parmesan', 10]],
    steps: ['Nudeln nach Packungsanweisung kochen.', 'Zwiebel würfeln und mit dem Hack krümelig anbraten.', 'Passata dazugeben, würzen und 10 Minuten köcheln.', 'Mit den Nudeln und Parmesan servieren.'] },
  { id: 'i_salmon', name: 'Lachs mit Kartoffeln & Spinat', meal: 'main', goals: ['maintain'], min: 25, portions: 1, tags: ['Omega-3'],
    items: [['Lachs (roh)', 150], ['Kartoffeln (gekocht)', 250], ['Spinat', 150], ['Olivenöl', 5]],
    steps: ['Kartoffeln kochen.', 'Lachs würzen und im Ofen bei 200 °C ca. 12 Minuten garen.', 'Spinat im Öl zusammenfallen lassen, mit Salz und Knoblauch abschmecken.'] },
  { id: 'i_chili', name: 'Chili con Carne mit Reis', meal: 'main', goals: ['cut', 'maintain', 'bulk'], min: 40, portions: 4, tags: ['Meal-Prep'],
    items: [['Rinderhack mager 5% (roh)', 500], ['Kidneybohnen (Dose)', 250], ['Mais (Dose)', 140], ['Tomatensauce (Passata)', 500], ['Zwiebel', 100], ['Paprika', 150], ['Reis (roh)', 300]],
    steps: ['Zwiebel und Paprika würfeln, mit dem Hack anbraten.', 'Passata, Bohnen und Mais dazugeben, mit Chili, Kreuzkümmel und Salz würzen.', '20 Minuten köcheln lassen; Reis separat kochen.', 'In 4 Portionen aufteilen – hält 4 Tage im Kühlschrank.'] },
  { id: 'i_curry', name: 'Hähnchen-Curry mit Basmati', meal: 'main', goals: ['maintain', 'bulk'], min: 35, portions: 4, tags: ['Meal-Prep'],
    items: [['Hähnchenbrust (roh)', 600], ['Basmatireis (roh)', 320], ['Gemüsemix (TK)', 400], ['Naturjoghurt 3,5%', 300], ['Rapsöl', 20]],
    steps: ['Reis kochen.', 'Hähnchen würfeln und im Öl anbraten, Gemüse dazugeben.', 'Mit Currypulver, Kurkuma und Salz würzen, Joghurt unterrühren (nicht mehr kochen).', 'In 4 Portionen aufteilen.'] },
  { id: 'i_tuna_pasta', name: 'Thunfisch-Pasta mit Rucola', meal: 'main', goals: ['cut', 'maintain'], min: 15, portions: 1, tags: ['schnell'],
    items: [['Vollkornnudeln (roh)', 80], ['Thunfisch (Dose, Wasser)', 150], ['Cherrytomaten', 150], ['Rucola', 30], ['Olivenöl', 5]],
    steps: ['Nudeln kochen.', 'Tomaten halbieren und im Öl kurz anschwitzen, Thunfisch dazugeben.', 'Mit den Nudeln mischen und mit Rucola servieren.'] },
  { id: 'i_quark_potato', name: 'Pellkartoffeln mit Kräuterquark', meal: 'main', goals: ['cut'], min: 25, portions: 1, tags: ['vegetarisch', 'günstig'],
    items: [['Kartoffeln (gekocht)', 300], ['Magerquark', 250], ['Gurke', 100]],
    steps: ['Kartoffeln mit Schale kochen.', 'Quark mit etwas Wasser, Salz, Pfeffer und Kräutern cremig rühren, Gurke würfeln und unterheben.', 'Zusammen servieren.'] },
  { id: 'i_steak', name: 'Steak mit Süßkartoffel & Bohnen', meal: 'main', goals: ['maintain', 'bulk'], min: 30, portions: 1, tags: [],
    items: [['Rumpsteak (roh)', 250], ['Süßkartoffel (gekocht)', 300], ['Grüne Bohnen', 200], ['Butter', 10]],
    steps: ['Süßkartoffel in Spalten schneiden und bei 200 °C ca. 25 Minuten backen.', 'Bohnen blanchieren und in der Butter schwenken.', 'Steak scharf anbraten, 5 Minuten ruhen lassen und würzen.'] },
  { id: 'i_tofu', name: 'Tofu-Gemüse-Pfanne', meal: 'main', goals: ['cut', 'maintain'], min: 20, portions: 1, tags: ['vegan'],
    items: [['Räuchertofu', 200], ['Gemüsemix (TK)', 300], ['Reis (roh)', 50], ['Sojasauce', 15], ['Rapsöl', 10]],
    steps: ['Reis kochen.', 'Tofu würfeln und im Öl knusprig braten.', 'Gemüse dazugeben, mit Sojasauce ablöschen und mit dem Reis servieren.'] },
  { id: 'i_lentil_bolo', name: 'Linsen-Bolognese', meal: 'main', goals: ['maintain'], min: 25, portions: 1, tags: ['vegetarisch', 'günstig'],
    items: [['Rote Linsen (roh)', 70], ['Vollkornnudeln (roh)', 80], ['Tomatensauce (Passata)', 200], ['Parmesan', 15]],
    steps: ['Linsen mit der Passata und etwas Wasser ca. 12 Minuten köcheln, würzen.', 'Nudeln kochen.', 'Mit Parmesan servieren.'] },
  { id: 'i_oven_chicken', name: 'Ofen-Hähnchen mit Gemüse', meal: 'main', goals: ['cut', 'maintain'], min: 35, portions: 1, tags: ['Meal-Prep'],
    items: [['Hähnchenbrust (roh)', 200], ['Zucchini', 200], ['Paprika', 150], ['Kartoffeln (gekocht)', 200], ['Olivenöl', 10]],
    steps: ['Gemüse und Kartoffeln in Stücke schneiden, mit Öl und Gewürzen mischen.', 'Mit dem gewürzten Hähnchen aufs Blech legen.', 'Bei 200 °C ca. 25 Minuten backen.'] },
  { id: 'i_pollock', name: 'Seelachs mit Reis & Brokkoli', meal: 'main', goals: ['cut'], min: 20, portions: 1, tags: ['fettarm'],
    items: [['Seelachs (roh)', 200], ['Reis (roh)', 60], ['Brokkoli', 200], ['Olivenöl', 5]],
    steps: ['Reis kochen, Brokkoli dämpfen.', 'Seelachs würzen und im Öl von jeder Seite 3–4 Minuten braten.', 'Mit Zitrone servieren.'] },
  { id: 'i_carbonara', name: 'Protein-Carbonara', meal: 'main', goals: ['bulk'], min: 20, portions: 1, tags: [],
    items: [['Nudeln (roh)', 150], ['Bacon', 30], ['Ei', 120], ['Parmesan', 20], ['Kochschinken', 60]],
    steps: ['Nudeln kochen.', 'Bacon und Schinken in Streifen knusprig braten.', 'Eier mit Parmesan verquirlen.', 'Pfanne vom Herd nehmen, Nudeln und Eimasse unterrühren, bis es cremig ist.'] },
  // Snacks
  { id: 'i_pudding', name: 'Proteinpudding mit Beeren', meal: 'snack', goals: ['cut', 'maintain'], min: 2, portions: 1, tags: ['schnell'],
    items: [['Proteinpudding', 200], ['Beeren (TK)', 100]], steps: ['Beeren antauen lassen und über den Pudding geben.'] },
  { id: 'i_cottage', name: 'Hüttenkäse-Reiswaffeln', meal: 'snack', goals: ['cut'], min: 3, portions: 1, tags: ['vegetarisch', 'schnell'],
    items: [['Hüttenkäse', 200], ['Reiswaffeln', 24], ['Cherrytomaten', 100]], steps: ['Reiswaffeln mit Hüttenkäse bestreichen.', 'Mit Tomaten, Salz und Pfeffer toppen.'] },
  { id: 'i_pb_toast', name: 'Erdnussbutter-Bananen-Toast + Milch', meal: 'snack', goals: ['bulk'], min: 5, portions: 1, tags: ['vegetarisch'],
    items: [['Vollkorntoast', 50], ['Erdnussbutter', 30], ['Banane', 120], ['Milch 3,5 %', 300]], steps: ['Toast rösten, mit Erdnussbutter bestreichen und mit Bananenscheiben belegen.', 'Dazu ein großes Glas Milch.'] },
  { id: 'i_skyr_nuts', name: 'Skyr mit Studentenfutter', meal: 'snack', goals: ['maintain', 'bulk'], min: 2, portions: 1, tags: ['vegetarisch', 'schnell'],
    items: [['Skyr', 200], ['Studentenfutter', 30], ['Honig', 10]], steps: ['Skyr mit Studentenfutter und Honig toppen.'] },
];
const ideaById = id => RECIPE_IDEAS.find(r => r.id === id);
const ideaItems = r => r.items.map(([n, g]) => { const f = FOOD_DB.find(x => x.name === n) || { kcal: 0, p: 0, c: 0, f: 0 }; return { name: n, kcal: f.kcal, p: f.p, c: f.c, f: f.f, g }; });
const ideaPer = r => perPortion({ portions: r.portions, items: ideaItems(r) });

/* ---------- Tagespläne (skalieren auf das gewünschte Kalorienziel) ---------- */
const PLAN_TEMPLATES = {
  cut: [{ name: 'Klassisch', meals: [['breakfast', 'i_oats'], ['lunch', 'i_oven_chicken'], ['snack', 'i_cottage'], ['dinner', 'i_pollock']] },
    { name: 'Schnell & einfach', meals: [['breakfast', 'i_egg_bread'], ['lunch', 'i_tuna_pasta'], ['snack', 'i_pudding'], ['dinner', 'i_quark_potato']] }],
  maintain: [{ name: 'Klassisch', meals: [['breakfast', 'i_quark_roll'], ['lunch', 'i_chicken_bowl'], ['snack', 'i_skyr_nuts'], ['dinner', 'i_salmon']] },
    { name: 'Vegetarisch', meals: [['breakfast', 'i_skyr_bowl'], ['lunch', 'i_lentil_bolo'], ['snack', 'i_pudding'], ['dinner', 'i_tofu']] }],
  bulk: [{ name: 'Klassisch', meals: [['breakfast', 'i_pancakes'], ['lunch', 'i_curry'], ['snack', 'i_bulk_shake'], ['dinner', 'i_steak']] },
    { name: 'Pasta-Power', meals: [['breakfast', 'i_oats'], ['lunch', 'i_bolo'], ['snack', 'i_pb_toast'], ['dinner', 'i_carbonara']] }],
};
const PLAN_KCAL = [1600, 1800, 2000, 2200, 2500, 2800, 3000, 3500];
function buildPlan(goal, tpl, target) {
  const T = PLAN_TEMPLATES[goal][tpl] || PLAN_TEMPLATES[goal][0];
  const per = T.meals.map(([, id]) => ideaPer(ideaById(id)));
  const base = per.reduce((a, x) => a + x.kcal, 0), k = target / base;
  // Startwert: gleichmäßig skaliert, dann Gericht für Gericht in Viertel-Portionen nachjustieren
  const por = per.map(() => Math.min(3, Math.max(0.5, Math.round(k * 4) / 4)));
  const total = () => por.reduce((a, q, i) => a + q * per[i].kcal, 0);
  for (let it = 0; it < 40; it++) {
    let best = null, err = Math.abs(total() - target);
    por.forEach((q, i) => [0.25, -0.25].forEach(d => {
      const nq = q + d; if (nq < 0.5 || nq > 3) return;
      const e = Math.abs(total() + d * per[i].kcal - target);
      // kleine Bevorzugung, Portionen nahe am Durchschnitt zu halten
      const score = e + Math.abs(nq - k) * 15;
      if (e < err - 1 && (!best || score < best.score)) best = { i, nq, score };
    }));
    if (!best) break;
    por[best.i] = best.nq;
  }
  const meals = T.meals.map(([meal, id], i) => {
    const r = ideaById(id), s = per[i], portions = por[i];
    return { meal, r, portions, kcal: s.kcal * portions, p: s.p * portions, c: s.c * portions, f: s.f * portions };
  });
  const tot = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  return { name: T.name, meals, tot };
}

/* ---------- Sheet: Rezeptideen & Tagespläne ---------- */
let ID = null;
function ideasSheet(tab) {
  const st = S.settings;
  ID = { tab: tab || ID?.tab || 'recipes', goal: ID?.goal || 'all', meal: ID?.meal || 'all', pgoal: ID?.pgoal || (IDEA_GOALS[st.goal] ? st.goal : 'maintain'),
    kcal: ID?.kcal || Math.round((st.kcal || 2000) / 50) * 50, tpl: ID?.tpl || 0, days: ID?.days || 3 };
  renderIdeas();
}
function renderIdeas(keep) {
  const scroll = keep ? $('#sheet .sheet-panel').scrollTop : 0, st = S.settings;
  let body;
  if (ID.tab === 'week') body = weekPlanView();
  else if (ID.tab === 'recipes') {
    const list = RECIPE_IDEAS.filter(r => (ID.goal === 'all' || r.goals.includes(ID.goal)) && (ID.meal === 'all' || r.meal === ID.meal));
    body = `<div class="chips lb-chips">${[['all', 'Alle'], ...Object.entries(IDEA_GOALS)].map(([k, l]) => `<button class="chip ${ID.goal === k ? 'on' : ''}" data-act="idGoal" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="chips lb-chips sub">${[['all', 'Alle Mahlzeiten'], ...Object.entries(IDEA_MEALS)].map(([k, l]) => `<button class="chip ${ID.meal === k ? 'on2' : ''}" data-act="idMeal" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="list" style="margin-top:14px">${list.map(r => { const s = ideaPer(r); return `<div class="item tap" data-act="ideaOpen" data-id="${r.id}">
        <div class="t"><b>${esc(r.name)}</b><span>${IDEA_MEALS[r.meal]} · ${r.min} Min · ${fmt(s.kcal)} kcal${r.portions > 1 ? ` pro Portion (${r.portions}×)` : ''} · ${r.goals.map(g => IDEA_GOALS[g]).join(' / ')}</span></div>
        <span class="pill acc">${fmt(s.p)} g P</span></div>`; }).join('')}</div>`;
  } else {
    const plan = buildPlan(ID.pgoal, ID.tpl, ID.kcal), diff = plan.tot.kcal - ID.kcal;
    const presets = [...new Set([...PLAN_KCAL, Math.round((st.kcal || 2000) / 50) * 50])].sort((a, b) => a - b);
    body = `<div class="seg">${Object.entries(IDEA_GOALS).map(([k, l]) => `<button class="${ID.pgoal === k ? 'on' : ''}" data-act="idPGoal" data-k="${k}">${l}</button>`).join('')}</div>
      <span class="label">Kalorien pro Tag</span>
      <div class="chips lb-chips">${presets.map(v => `<button class="chip ${ID.kcal === v ? 'on' : ''}" data-act="idKcal" data-v="${v}">${fmt(v)}${v === Math.round((st.kcal || 2000) / 50) * 50 ? ' · Ziel' : ''}</button>`).join('')}</div>
      <div class="chips lb-chips sub">${PLAN_TEMPLATES[ID.pgoal].map((t, i) => `<button class="chip ${ID.tpl === i ? 'on2' : ''}" data-act="idTpl" data-i="${i}">${t.name}</button>`).join('')}</div>
      <div class="card" style="margin-top:14px">
        <div class="grid3"><div class="stat"><b>${fmt(plan.tot.kcal)}</b><span>kcal · ${Math.abs(diff) < 60 ? 'passt' : (diff > 0 ? '+' : '−') + fmt(Math.abs(diff))}</span></div>
          <div class="stat"><b>${fmt(plan.tot.p)} g</b><span>Protein</span></div><div class="stat"><b style="font-size:16px;white-space:nowrap">${fmt(plan.tot.c)} / ${fmt(plan.tot.f)}</b><span>KH / Fett (g)</span></div></div>
      </div>
      <div class="list">${plan.meals.map(m => `<div class="item tap" data-act="ideaOpen" data-id="${m.r.id}"><div class="t"><b>${mealName(m.meal)} · ${esc(m.r.name)}</b>
        <span>${fmt(m.portions, 2)} Portion${m.portions === 1 ? '' : 'en'} · ${fmt(m.kcal)} kcal · ${fmt(m.p)} g Protein</span></div><span class="muted">›</span></div>`).join('')}</div>
      <button class="btn primary block" style="margin-top:14px" data-act="planLog">Plan heute eintragen</button>
      <div class="row" style="margin-top:12px;justify-content:space-between"><span class="small muted">Einkaufsliste für</span>
        <div class="chips">${[1, 3, 5, 7].map(d => `<button class="chip ${ID.days === d ? 'on2' : ''}" data-act="idDays" data-d="${d}">${d} ${d === 1 ? 'Tag' : 'Tage'}</button>`).join('')}</div></div>
      <button class="btn block" style="margin-top:10px" data-act="planShop">Zutaten auf die Einkaufsliste</button>
      <div class="small muted" style="margin-top:10px">Die Portionen werden automatisch auf dein Kalorienziel skaliert (in Viertel-Portionen). Tippe ein Gericht an für Zutaten und Zubereitung.</div>`;
  }
  openSheet(`<h2>Rezeptideen & Tagespläne</h2>
    <div class="seg"><button class="${ID.tab === 'recipes' ? 'on' : ''}" data-act="idTab" data-k="recipes">Rezepte</button><button class="${ID.tab === 'plans' ? 'on' : ''}" data-act="idTab" data-k="plans">Tagesplan</button><button class="${ID.tab === 'week' ? 'on' : ''}" data-act="idTab" data-k="week">Woche</button></div>
    ${body}
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Schließen</button></div>`);
  $('#sheet .sheet-panel').scrollTop = scroll;
}
function ideaSheet(id) {
  const r = ideaById(id); if (!r) return;
  const s = ideaPer(r), items = ideaItems(r);
  openSheet(`<h2>${esc(r.name)}</h2>
    <div class="chips" style="margin-bottom:14px">${r.goals.map(g => `<span class="chip on2">${IDEA_GOALS[g]}</span>`).join('')}<span class="chip">${IDEA_MEALS[r.meal]}</span><span class="chip">${r.min} Min</span>${r.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
    <span class="label">Pro Portion</span>
    <div class="grid3" style="margin-top:8px"><div class="stat"><b>${fmt(s.kcal)}</b><span>kcal</span></div><div class="stat"><b>${fmt(s.p)} g</b><span>Protein</span></div><div class="stat"><b style="font-size:16px;white-space:nowrap">${fmt(s.c)} / ${fmt(s.f)}</b><span>KH / Fett (g)</span></div></div>
    <h3>Zutaten${r.portions > 1 ? ` für ${r.portions} Portionen` : ''}</h3>
    <div class="list">${items.map(i => `<div class="item"><div class="t"><b>${esc(i.name)}</b></div><span class="small muted">${fmtQty(i.g)}</span></div>`).join('')}</div>
    <h3>Zubereitung</h3>
    <ol class="steps">${r.steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
    <div class="row" style="margin-top:16px"><button class="btn primary grow" data-act="ideaLog" data-id="${r.id}">1 Portion eintragen</button><button class="btn" data-act="ideaShop" data-id="${r.id}">Einkaufsliste</button></div>
    <div class="sheet-actions"><button class="btn" data-act="ideasBack">‹ Zurück</button><button class="btn" data-act="ideaCopy" data-id="${r.id}">Zu meinen Rezepten</button></div>`);
}
function ideasCard() {
  return `<div class="card tap-card" data-act="ideas"><div class="card-head" style="margin-bottom:8px"><span class="label">Rezeptideen & Tagespläne</span>${ic('sparkle')}</div>
    <div class="small">${RECIPE_IDEAS.length} eiweißreiche Rezepte für Cut, Maintain & Bulk, fertige Tagespläne von 1.600 bis 3.500 kcal und ein Wochen-Mealplan.</div></div>`;
}

/* =====================================================================
   Was passt noch? · Wochen-Mealplan · Satz-Typen & Aufwärmsätze
   ===================================================================== */

/* ---------- Satz-Typen ---------- */
const SET_TYPES = ['', 'warm', 'drop', 'fail'];
const SET_TYPE_NAME = { '': 'Arbeitssatz', warm: 'Aufwärmsatz', drop: 'Drop-Satz', fail: 'Bis Muskelversagen' };
const workIdx = (e, si) => e.sets.slice(0, si).filter(s => s.type !== 'warm').length;
const setLabel = (x, wi) => (x.type === 'warm' ? 'W' : x.type === 'drop' ? 'D' : x.type === 'fail' ? 'F' : wi + 1);
/* Aufwärm-Rampe zum ersten Arbeitsgewicht */
function warmupSets(ex, w) {
  if (!ex || !w || w <= 0) return [];
  const bar = S.settings.bar || 20, step = (ex.inc || 2.5) >= 2.5 ? 2.5 : ex.inc || 1;
  const scheme = ex.barbell ? (w >= 60 ? [[0.4, 8], [0.6, 5], [0.8, 3]] : [[0.5, 8], [0.75, 4]]) : (w >= 20 ? [[0.5, 10], [0.75, 5]] : [[0.6, 8]]);
  const out = [];
  if (ex.barbell && w >= 60) out.push({ w: bar, r: null, t: 10, done: false, type: 'warm' });
  for (const [pct, r] of scheme) {
    const ww = Math.max(ex.barbell ? bar : 0, roundTo(w * pct, step));
    if (ww >= w || out.some(o => o.w === ww)) continue;
    out.push({ w: ww, r: null, t: r, done: false, type: 'warm' });
  }
  return out;
}

/* ---------- Was passt noch? ---------- */
const READY_CATS = ['Eier & Milchprodukte', 'Aufschnitt', 'Sportnahrung', 'Obst', 'Nüsse, Samen & Aufstriche', 'Brot & Getreide', 'Süßes & Snacks', 'Hülsenfrüchte & Tofu'];
let FIT = [];
function remainingFor(date) {
  const st = S.settings, t = dayTotals(date, 'all');
  return { kcal: st.kcal - t.kcal, p: st.protein - t.p, c: st.carbs - t.c, f: st.fat - t.f, date };
}
function fitSuggestions(date, n = 8) {
  const R = remainingFor(date);
  if (R.kcal < 80) return { R, list: [] };
  const h = new Date().getHours(), share = date !== today() ? 1 : h < 10 ? 0.35 : h < 14 ? 0.5 : h < 18 ? 0.65 : 1;
  const tk = Math.max(150, R.kcal * share);
  const score = (k, p, c = 0, f = 0) => {
    if (k > R.kcal * 1.05 + 20 || k < 60) return -1;
    const pf = R.p > 5 ? Math.min(p, R.p) / R.p : 0.4;
    const kf = 1 - Math.min(1, Math.abs(k - tk) / tk);
    const over = (f > Math.max(0, R.f) + 10 ? 0.2 : 0) + (c > Math.max(0, R.c) + 25 ? 0.15 : 0); // Fett-/KH-Budget sprengen kostet Punkte
    return pf * 0.5 + kf * 0.4 + Math.min(0.3, p * 4 / k) * 0.4 - over;
  };
  const cands = [];
  const consider = (base, kind, extra, amounts) => {
    let best = null;
    for (const q of amounts) { const sc = score(base.kcal * q, base.p * q, base.c * q, base.f * q); if (sc >= 0 && (!best || sc > best.sc)) best = { q, sc }; }
    if (best) cands.push({ kind, ...extra, q: best.q, sc: best.sc + (extra.bonus || 0), kcal: base.kcal * best.q, p: base.p * best.q, c: base.c * best.q, f: base.f * best.q });
  };
  for (const r of RECIPE_IDEAS) {
    const bonus = (h < 10 && r.meal === 'breakfast') || (h >= 11 && share >= 0.5 && r.meal === 'main') || (share < 0.5 && h >= 10 && r.meal === 'snack') ? 0.06 : 0;
    consider(ideaPer(r), 'idea', { r, name: r.name, bonus }, [0.5, 0.75, 1, 1.25, 1.5]);
  }
  for (const r of S.recipes) consider(perPortion(r), 'recipe', { r, name: r.name, bonus: 0.04 }, [0.5, 1, 1.5]);
  for (const x of foodAll().filter(x => (x.own || READY_CATS.includes(x.cat)) && x.p * 4 / x.kcal >= 0.25 && x.kcal >= 40)) {
    const g = x.portion?.g || 100, per = { kcal: x.kcal * g / 100, p: x.p * g / 100, c: x.c * g / 100, f: x.f * g / 100 };
    consider(per, 'food', { x, name: x.name, g, bonus: x.own ? 0.03 : 0 }, [1, 2].filter(m => m * g <= 400));
  }
  cands.sort((a, b) => b.sc - a.sc);
  const list = []; let foods = 0;
  for (const c of cands) {
    if (list.some(l => l.name === c.name)) continue;
    if (c.kind === 'food' && foods >= 3) continue;
    if (c.kind === 'food') foods++;
    list.push(c); if (list.length >= n) break;
  }
  return { R, list };
}
const fitLabel = c => (c.kind === 'food' ? `${esc(c.name)} · ${fmt(c.g * c.q)} g` : `${esc(c.name)}${c.q !== 1 ? ` · ${fmt(c.q, 2)} Portion${c.q > 1 ? 'en' : ''}` : ''}`);
function fitRows(list) {
  return `<div class="list">${list.map((c, i) => `<div class="item ${c.kind === 'idea' ? 'tap' : ''}" ${c.kind === 'idea' ? `data-act="ideaOpen" data-id="${c.r.id}"` : ''}>
    <div class="t"><b>${fitLabel(c)}</b><span>${fmt(c.kcal)} kcal · ${fmt(c.p)} g Protein · K ${fmt(c.c)} · F ${fmt(c.f)}</span></div>
    <button class="icon-btn" data-act="fitAdd" data-i="${i}" aria-label="Eintragen">+</button></div>`).join('')}</div>`;
}
function fitCard(date) {
  const st = S.settings, t = dayTotals(date, 'all');
  if (!t.kcal && date !== today()) return '';
  const { R, list } = fitSuggestions(date, 3); FIT = list;
  if (R.kcal < 80) {
    const over = -R.kcal;
    return `<div class="card"><span class="label">Was passt noch?</span><div class="small" style="margin-top:8px">${over > 150 ? date > today() ? `Der Plan liegt ${fmt(over)} kcal über dem Ziel – evtl. eine Portion kleiner planen.` : `Heute ${fmt(over)} kcal über dem Ziel – kein Problem, morgen geht's normal weiter.` : 'Punktlandung – dein Kalorienziel ist erreicht.'}${R.p > 15 ? ` Es fehlen noch ${fmt(R.p)} g Protein: ein Proteinshake oder Skyr passt notfalls.` : ''}</div></div>`;
  }
  return `<div class="card"><div class="card-head"><span class="label">Was passt noch?</span><button class="btn sm ghost" data-act="fitSheet">Mehr</button></div>
    <div class="small muted">Noch offen: <b style="color:var(--text)">${fmt(R.kcal)} kcal</b> · ${fmt(Math.max(0, R.p))} g Protein · ${fmt(Math.max(0, R.c))} g KH · ${fmt(Math.max(0, R.f))} g Fett</div>
    <div style="margin-top:12px">${list.length ? fitRows(list) : '<div class="empty small">Gerade nichts Passendes gefunden.</div>'}</div></div>`;
}
function fitSheet() {
  const date = UI.tab === 'food' ? UI.foodDate : today(), { R, list } = fitSuggestions(date, 10); FIT = list;
  openSheet(`<h2>Was passt noch?</h2>
    <div class="grid3" style="margin-bottom:6px"><div class="stat"><b>${fmt(Math.max(0, R.kcal))}</b><span>kcal offen</span></div><div class="stat"><b>${fmt(Math.max(0, R.p))} g</b><span>Protein offen</span></div><div class="stat"><b>${fmt(Math.max(0, R.c))} / ${fmt(Math.max(0, R.f))}</b><span>KH / Fett (g)</span></div></div>
    <div class="small muted" style="margin:8px 0 14px">Sortiert danach, wie gut Kalorien und Protein jetzt passen${date === today() ? ' – abhängig von der Uhrzeit bleibt Platz für spätere Mahlzeiten' : ''}.</div>
    ${list.length ? fitRows(list) : '<div class="empty small">Dein Ziel ist erreicht.</div>'}
    <div class="sheet-actions"><button class="btn" data-act="ideas">Alle Rezeptideen</button><button class="btn primary" data-act="closeSheet">Fertig</button></div>`);
}

/* ---------- Wochen-Mealplan ---------- */
function fitPortions(kcals, target) {
  const base = kcals.reduce((a, b) => a + b, 0), k = target / base;
  const por = kcals.map(() => Math.min(3, Math.max(0.5, Math.round(k * 4) / 4)));
  const total = () => por.reduce((a, q, i) => a + q * kcals[i], 0);
  for (let it = 0; it < 40; it++) {
    let best = null; const err = Math.abs(total() - target);
    por.forEach((q, i) => [0.25, -0.25].forEach(d => {
      const nq = q + d; if (nq < 0.5 || nq > 3) return;
      const e = Math.abs(total() + d * kcals[i] - target), sc = e + Math.abs(nq - k) * 15;
      if (e < err - 1 && (!best || sc < best.sc)) best = { i, nq, sc };
    }));
    if (!best) break; por[best.i] = best.nq;
  }
  return por;
}
function seededRandom(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function shuffled(arr, rnd) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function wpPool(goal, meal) {
  let p = RECIPE_IDEAS.filter(r => r.meal === meal && r.goals.includes(goal));
  if (meal === 'snack' && p.length < 2) p = [...p, ...RECIPE_IDEAS.filter(r => r.meal === 'breakfast' && r.goals.includes(goal) && r.min <= 5)];
  return p.length ? p : RECIPE_IDEAS.filter(r => r.meal === meal);
}
function genWeekPlan(goal, kcal, seed) {
  const rnd = seededRandom(seed);
  const bf = shuffled(wpPool(goal, 'breakfast'), rnd), sn = shuffled(wpPool(goal, 'snack'), rnd);
  const mains = shuffled(wpPool(goal, 'main'), rnd), batch = mains.filter(r => r.portions > 1), single = mains.filter(r => r.portions === 1);
  let k = 0;
  const nextSingle = avoid => { for (let t = 0; t < single.length; t++) { const r = single[k++ % single.length]; if (!avoid.includes(r.id)) return r; } return single[0] || mains[0]; };
  const days = [];
  let prevDinner = null;
  for (let d = 0; d < 7; d++) {
    // Meal-Prep: ein Batch-Gericht Mo+Di, ein zweites Do+Fr
    const b = d < 2 ? batch[0] : d === 3 || d === 4 ? batch[1] || null : null;
    const lunch = b || nextSingle([prevDinner]);
    const dinner = nextSingle([lunch.id, prevDinner]);
    prevDinner = dinner.id;
    days.push({ meals: [['breakfast', bf[d % bf.length].id], ['lunch', lunch.id], ['snack', sn[d % sn.length].id], ['dinner', dinner.id]] });
  }
  return { start: ymd(weekStart(new Date())), goal, kcal, seed, days, logged: {} };
}
function wpDay(plan, i) {
  const day = plan.days[i], per = day.meals.map(([, id]) => ideaPer(ideaById(id)));
  const por = fitPortions(per.map(x => x.kcal), plan.kcal);
  const meals = day.meals.map(([meal, id], j) => ({ meal, r: ideaById(id), portions: por[j], kcal: per[j].kcal * por[j], p: per[j].p * por[j], c: per[j].c * por[j], f: per[j].f * por[j] }));
  return { meals, tot: meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { kcal: 0, p: 0, c: 0, f: 0 }) };
}
const wpCurrent = () => (S.weekPlan && S.weekPlan.start === ymd(weekStart(new Date())) ? S.weekPlan : null);
function wpPrep(plan) { // Batch-Gerichte der Woche mit benötigten Portionen
  const need = {};
  plan.days.forEach((_, i) => wpDay(plan, i).meals.forEach(m => { if (m.r.portions > 1) { need[m.r.id] ||= { r: m.r, portions: 0, days: [] }; need[m.r.id].portions += m.portions; if (!need[m.r.id].days.includes(i)) need[m.r.id].days.push(i); } }));
  return Object.values(need);
}
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function weekPlanView() {
  const st = S.settings, plan = wpCurrent();
  const presets = [...new Set([...PLAN_KCAL, Math.round((st.kcal || 2000) / 50) * 50])].sort((a, b) => a - b);
  const ctrl = `<div class="seg">${Object.entries(IDEA_GOALS).map(([k, l]) => `<button class="${ID.pgoal === k ? 'on' : ''}" data-act="idPGoal" data-k="${k}">${l}</button>`).join('')}</div>
    <span class="label">Kalorien pro Tag</span>
    <div class="chips lb-chips">${presets.map(v => `<button class="chip ${ID.kcal === v ? 'on' : ''}" data-act="idKcal" data-v="${v}">${fmt(v)}${v === Math.round((st.kcal || 2000) / 50) * 50 ? ' · Ziel' : ''}</button>`).join('')}</div>
    <button class="btn ${plan ? '' : 'primary'} block" style="margin-top:14px" data-act="wpCreate">${plan ? 'Neu würfeln mit diesen Einstellungen' : 'Wochenplan erstellen'}</button>`;
  if (!plan) return ctrl + '<div class="small muted" style="margin-top:10px">7 abwechslungsreiche Tage aus den Rezeptideen – Meal-Prep-Gerichte laufen bewusst zwei Tage am Stück, damit du einmal kochst und zweimal isst.</div>';
  const todayIdx = (new Date().getDay() + 6) % 7, prep = wpPrep(plan);
  return ctrl + `
    <div class="small muted" style="margin:14px 0 4px">Aktueller Plan: ${IDEA_GOALS[plan.goal]} · ${fmt(plan.kcal)} kcal/Tag</div>
    ${prep.length ? `<div class="card" style="margin-top:8px"><span class="label">Meal-Prep</span>${prep.map(x => `<div class="small" style="margin-top:8px"><b>${esc(x.r.name)}</b> – ${fmt(x.portions, 2)} Portionen für ${x.days.map(d => WD[d]).join(' & ')} (Rezept ergibt ${x.r.portions})</div>`).join('')}
      <button class="btn sm" style="margin-top:12px" data-act="wpPrep">In Meal-Prep übernehmen</button></div>` : ''}
    ${plan.days.map((_, i) => { const d = wpDay(plan, i), date = addDays(plan.start, i), logged = plan.logged?.[date]; return `<div class="card wp-day ${i === todayIdx ? 'today' : ''}">
      <div class="card-head" style="margin-bottom:8px"><b>${WD[i]} · ${fmtDate(date)}${i === todayIdx ? ' · Heute' : ''}</b><span class="small muted">${fmt(d.tot.kcal)} kcal · ${fmt(d.tot.p)} g P</span></div>
      ${d.meals.map((m, j) => `<div class="wp-meal"><span class="muted">${mealName(m.meal)}</span><button class="link" data-act="ideaOpen" data-id="${m.r.id}">${esc(m.r.name)}${m.portions !== 1 ? ` · ${fmt(m.portions, 2)}×` : ''}</button><button class="x" data-act="wpSwap" data-d="${i}" data-m="${j}" aria-label="Tauschen">⇆</button></div>`).join('')}
      ${date === today() ? `<button class="btn sm ${logged ? '' : 'primary'}" style="margin-top:10px" data-act="wpLog" data-d="${i}">${logged ? '✓ Eingetragen – nochmal eintragen' : 'Heute eintragen'}</button>` : ''}
      ${date === addDays(today(), 1) ? `<button class="btn sm ${logged ? '' : 'primary'}" style="margin-top:10px" data-act="wpLog" data-d="${i}">${logged ? '✓ Für morgen geplant – nochmal' : 'Für morgen planen'}</button>` : ''}
    </div>`; }).join('')}
    <button class="btn block" data-act="wpShop">Einkaufsliste für die ganze Woche</button>`;
}
function wpLogDay(i) {
  const plan = wpCurrent(); if (!plan) return;
  const d = wpDay(plan, i), date = addDays(plan.start, i);
  d.meals.forEach((m, j) => { const sp = ideaPer(m.r); pushFood({ id: uid(), date, meal: fitMeal(m.meal), name: m.r.name + (m.portions !== 1 ? ` (${fmt(m.portions, 2)} Port.)` : ''), kcal: m.kcal, p: m.p, c: m.c, f: m.f, g: Math.round(sp.g * m.portions) || null, ts: Date.now() + j }); });
  plan.logged = { ...(plan.logged || {}), [date]: true };
  save(); toast(`${date > today() ? '📋 ' + WD[i] + ' geplant' : '✓ ' + WD[i] + ' eingetragen'} · ${fmt(d.tot.kcal)} kcal`);
}
function planHomeCard() {
  const open = plannedOpen(today()), h = new Date().getHours(), tm = addDays(today(), 1);
  if (open.length) {
    const byMeal = Object.keys(MEALS).concat([...new Set(open.map(f => f.meal))].filter(k => !MEALS[k]));
    return `<div class="card plan-home"><div class="card-head"><span class="label">Heute geplant</span><button class="btn sm" data-act="eatAll" data-d="${today()}">Alle abhaken</button></div>
      <div class="list">${byMeal.flatMap(k => open.filter(f => f.meal === k)).slice(0, 6).map(f => `<div class="item"><button class="tick" data-act="eatFood" data-id="${f.id}" aria-label="Als gegessen abhaken">${ic('check')}</button><div class="t"><b>${esc(f.name)}</b><span>${esc(mealName(f.meal))}</span></div><b>${fmt(f.kcal)}</b></div>`).join('')}</div>
      ${open.length > 6 ? `<button class="btn sm ghost block" style="margin-top:8px" data-act="planDay" data-d="${today()}">+ ${open.length - 6} weitere</button>` : ''}</div>`;
  }
  if (h >= 18 && !S.foods.some(f => f.date === tm) && S.foods.some(f => f.fromPlan)) return `<div class="notice" data-act="planDay" data-d="${tm}">${ic('calendar')}<div class="t">Morgen planen<span>Was isst du morgen? Jetzt vorplanen, morgen nur abhaken</span></div>${ic('chev', 'chev')}</div>`;
  return '';
}
function wpTodayNotice() {
  const plan = wpCurrent(); if (!plan || plan.logged?.[today()]) return '';
  const i = (new Date().getDay() + 6) % 7, d = wpDay(plan, i);
  return `<div class="notice" data-act="wpLogToday">${ic('calendar')}<div class="t">Heute laut Wochenplan<span>${d.meals.map(m => m.r.name).slice(0, 3).join(' · ')} … · ${fmt(d.tot.kcal)} kcal</span></div><span class="btn sm primary">Eintragen</span></div>`;
}

/* Plus-Knopf erst zeigen, wenn der große „Essen eintragen“-Button aus dem Bild gescrollt ist */
function updateFab() {
  const fab = $('#fab'); if (!fab) return;
  const main = UI.tab === 'food' && $('.add-main');
  fab.classList.toggle('hidden', !main || main.getBoundingClientRect().bottom > 0);
}
window.addEventListener('scroll', updateFab, { passive: true });

/* ---------- Mahlzeiten-Einstellungen ---------- */
let MS = null;
function mealsSheet() {
  MS = (S.settings.meals?.length ? S.settings.meals : presetMeals(4)).map(m => ({ ...m }));
  renderMealsSheet();
}
function renderMealsSheet() {
  const n = MS.length, preset = Object.keys(MEAL_PRESETS).find(k => MEAL_PRESETS[k].join() === MS.map(m => m.id).join() && MS.every(m => m.name === MEAL_BASE[m.id]));
  openSheet(`<h2>Mahlzeiten</h2>
    <div class="small muted" style="margin-bottom:12px">Teile deinen Tag so auf, wie du isst. Die Reihenfolge entspricht dem Tagesablauf – danach wählt die App beim Eintragen automatisch die passende Mahlzeit.</div>
    <span class="label">Vorlagen</span>
    <div class="chips" style="margin:8px 0 16px">${Object.keys(MEAL_PRESETS).map(k => `<button class="chip ${preset === k ? 'on' : ''}" data-act="msPreset" data-k="${k}">${k} Mahlzeiten</button>`).join('')}</div>
    <span class="label">Deine Mahlzeiten · ${n}</span>
    <div class="list" style="margin-top:8px">${MS.map((m, i) => `<div class="item">
      <input class="ms-name" data-ms="${i}" value="${esc(m.name)}" aria-label="Name">
      ${i ? `<button class="x" data-act="msUp" data-i="${i}" aria-label="Nach oben">↑</button>` : ''}
      ${n > 1 ? `<button class="x" data-act="msDel" data-i="${i}" aria-label="Entfernen">×</button>` : ''}</div>`).join('')}</div>
    ${n < 8 ? '<button class="btn block" style="margin-top:10px" data-act="msAdd">+ Mahlzeit hinzufügen</button>' : ''}
    <div class="small muted" style="margin-top:10px">Bereits eingetragenes Essen bleibt erhalten – Einträge einer entfernten Mahlzeit werden weiterhin unter ihrem Namen angezeigt.</div>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="msSave">Speichern</button></div>`);
}
const syncMS = () => $$('[data-ms]').forEach(inp => { MS[+inp.dataset.ms].name = inp.value; });

/* ---------- Akzentfarbe ---------- */
const ACCENTS = {
  gold: ['Gold', '#e8cd9a', '#b9955c'], platin: ['Platin', '#e6e8ec', '#9aa0aa'], rose: ['Roségold', '#f0c4b8', '#c07f6f'],
  smaragd: ['Smaragd', '#a6dcc0', '#4f9d78'], saphir: ['Saphir', '#b7cdf3', '#5f84c9'], amethyst: ['Amethyst', '#d4c4f3', '#8c70c8'], onyx: ['Onyx', '#ffffff', '#a19d94'],
};
function applyAccent() { document.documentElement.dataset.accent = ACCENTS[S.settings.accent] ? S.settings.accent : 'gold'; }
function accentCard() {
  const cur = ACCENTS[S.settings.accent] ? S.settings.accent : 'gold';
  return `<div class="card"><h2>Design</h2><span class="label">Akzentfarbe</span>
    <div class="swatches">${Object.entries(ACCENTS).map(([k, [l, hi, lo]]) => `<button class="sw ${k === cur ? 'on' : ''}" data-act="setAccent" data-k="${k}" aria-label="${l}">
      <i style="background:linear-gradient(145deg, ${hi}, ${lo})"></i><span>${l}</span></button>`).join('')}</div></div>`;
}

/* ---------- Views ---------- */
const VIEWS = {};
VIEWS.stats = () => statsView();

/* ---------- Icons (feine Linien) ---------- */
const ICONS = {
  utensils: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
  droplet: 'M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z',
  scale: 'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8.5 10a5 5 0 0 1 7 0M12 10l1.5-2',
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  trophy: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0z',
  ruler: 'M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0zM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  check: 'M20 6 9 17l-5-5',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  volume: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  mute: 'M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6',
  screen: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  sparkle: 'M12 3l1.8 5.4c.3.8.9 1.4 1.7 1.7L21 12l-5.5 1.9c-.8.3-1.4.9-1.7 1.7L12 21l-1.8-5.4c-.3-.8-.9-1.4-1.7-1.7L3 12l5.5-1.9c.8-.3 1.4-.9 1.7-1.7z',
  play: 'M7 4.5v15a.8.8 0 0 0 1.2.7l12.3-7.5a.8.8 0 0 0 0-1.4L8.2 3.8A.8.8 0 0 0 7 4.5z',
  chev: 'M9 18l6-6-6-6',
  flame: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  body: 'M12 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 9.5l7 1.5 7-1.5M12 11v5M9 22l3-6 3 6',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  repeat: 'M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24"><path d="${ICONS[n]}"/></svg>`;
function sparkline(vals, { w = 140, h = 34 } = {}) {
  if (vals.length < 2) return '';
  const lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1;
  const pts = vals.map((v, i) => [i / (vals.length - 1) * (w - 4) + 2, h - 3 - (v - lo) / r * (h - 8)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const last = pts.at(-1);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <path d="${d}L${last[0].toFixed(1)} ${h}L2 ${h}Z" fill="url(#sg)"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}

VIEWS.today = () => {
  const st = S.settings, t = dayTotals(today()), lw = latestWeight();
  const hour = new Date().getHours();
  const hi = hour < 5 ? 'Gute Nacht' : hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
  const name = (st.name || '').trim();
  const left = st.kcal - t.kcal;
  const water = S.water[today()] || 0;
  const weekN = workoutsInWeek(new Date()), streak = weekStreak();
  const tip = coachTip(), due = weighDue(), ciDue = checkinDue();
  const nx = nextDay(), nextR = nx?.r, wp = weakPoints();
  const ws = [...S.weights].sort((a, b) => a.date.localeCompare(b.date));
  const rate = weightTrend();
  // Woche
  const wsStart = weekStart(new Date());
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(wsStart); d.setDate(d.getDate() + i); return d; });
  // Muskeln
  const vol = weekVolume(new Date());
  const inRange = MUSCLE_LIST.filter(([m]) => ['ok', 'high'].includes(volStatus(vol[m], effTarget(m)))).length;
  // PRs
  const feed = prFeed(), month = today().slice(0, 7), prMonth = feed.filter(f => f.date.startsWith(month)).length;
  // Maße
  const ms = [...S.measures].sort((a, b) => a.date.localeCompare(b.date)).filter(m => m.waist != null);
  const photo = PH.list[0];
  const kcalPct = st.kcal ? t.kcal / st.kcal : 0;

  return `
  <div class="home-head">
    <div><div class="eyebrow">${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <h1>${hi}${name ? `, ${esc(name)}` : ''}</h1></div>
    <button class="avatar" data-act="tab" data-tab="more" aria-label="Profil">${name ? esc(name[0].toUpperCase()) : ic('body')}</button>
  </div>

  ${!S.meta.welcomeOk ? `<div class="card accent welcome"><b>Willkommen bei Duty First</b>
    <div class="small muted" style="margin:6px 0 12px">Deine Daten bleiben nur auf diesem Gerät – kein Konto, kein Tracking. Die App ersetzt keine ärztliche Beratung; Nährwerte, Ziele und Tipps sind Richtwerte.</div>
    <div class="row" style="gap:8px"><button class="btn sm ghost" data-act="openLegal" data-p="hinweise">Gesundheitshinweise</button><button class="btn sm primary" data-act="welcomeOk">Verstanden</button></div></div>` : ''}
  ${!S.meta.onboarded ? `<div class="notice" data-act="tab" data-tab="more">${ic('sparkle')}<div class="t">Profil einrichten<span>Ziele für Kalorien & Makros automatisch berechnen</span></div>${ic('chev', 'chev')}</div>` : ''}
  ${S.active ? `<div class="notice" data-act="tab" data-tab="train">${ic('activity')}<div class="t">${esc(S.active.name)}<span>Training läuft · <span data-elapsed style="display:inline">${mmss((Date.now() - S.active.start) / 1000)}</span></span></div>${ic('chev', 'chev')}</div>` : ''}
  ${wpTodayNotice()}
  ${planHomeCard()}
  ${healthHomeNotice()}
  ${(() => { const R = remainingFor(today()); return new Date().getHours() >= 12 && R.kcal > 200 && S.foods.some(f => f.date === today() && !f.planned) ? `<div class="notice" data-act="fitSheet">${ic('sparkle')}<div class="t">Noch ${fmt(R.kcal)} kcal${R.p > 10 ? ` & ${fmt(R.p)} g Protein` : ''} offen<span>Vorschläge, was jetzt passt</span></div>${ic('chev', 'chev')}</div>` : ''; })()}
  ${ciDue ? `<div class="notice" data-act="checkin">${ic('check')}<div class="t">Wöchentlicher Check-in<span>Gewicht, Energie, Schlaf & Co. · 1 Minute</span></div>${ic('chev', 'chev')}</div>` : ''}
  ${due && !ciDue ? `<div class="notice warn" data-act="addWeight">${ic('scale')}<div class="t">Zeit zum Wiegen<span>${S.weights.length ? `Wöchentlicher Check-in · ${DAYS[st.weighDay]}` : 'Startgewicht eintragen'}</span></div>${ic('chev', 'chev')}</div>` : ''}

  <div class="card hero tap-card" data-act="tab" data-tab="food">
    <div class="card-head" style="margin-bottom:4px"><span class="label">Ernährung heute</span><button class="btn sm" data-act="quickFood">+ Mahlzeit</button></div>
    <div class="kcal">
      ${ring(kcalPct, left < 0 ? 'var(--red)' : 'url(#gold)', fmt(Math.abs(left)), left < 0 ? 'kcal drüber' : 'kcal übrig')}
      <div class="bars">
        ${bar('Protein', t.p, st.protein, 'var(--pink)')}
        ${bar('Kohlenhydrate', t.c, st.carbs, 'var(--blue)')}
        ${bar('Fett', t.f, st.fat, 'var(--orange)')}
      </div>
    </div>
    <div class="hero-foot"><span>Gegessen <b>${fmt(t.kcal)}</b> kcal</span><span>Ziel <b>${fmt(st.kcal)}</b> kcal</span></div>
  </div>

  <div class="qa">
    <button data-act="quickFood"><span class="circle">${ic('utensils')}</span>Essen</button>
    <button data-act="water" data-ml="250"><span class="circle">${ic('droplet')}</span>+250 ml</button>
    <button data-act="addWeight"><span class="circle">${ic('scale')}</span>Wiegen</button>
    <button ${S.active ? 'data-act="tab" data-tab="train"' : nextR ? `data-act="startWorkout" data-id="${nextR.id}"` : 'data-act="startWorkout"'}><span class="circle">${ic('dumbbell')}</span>Training</button>
    <button data-act="addPhoto"><span class="circle">${ic('camera')}</span>Foto</button>
  </div>

  <div class="card">
    <div class="card-head"><span class="label">Diese Woche</span><span class="small muted">${weekN} / ${st.weeklyWorkouts} Trainings${streak ? ` · ${streak} Wo. in Folge` : ''}</span></div>
    <div class="week">${days.map(d => {
      const ds = ymd(d), trained = S.workouts.some(w => w.date === ds), food = S.foods.some(f => f.date === ds && (ds > today() || !f.planned));
      const cls = [trained && 'train', !trained && S.cardio.some(c => c.date === ds) && 'cardio', ds === today() && 'today', ds > today() && 'future'].filter(Boolean).join(' ');
      return `<div class="d ${cls}">${DAYS[d.getDay()].slice(0, 2)}<i>${d.getDate()}</i><u class="${food ? 'on' : ''}"></u></div>`;
    }).join('')}</div>
  </div>

  <div class="tiles">
    <div class="tile wide" ${S.active ? 'data-act="tab" data-tab="train"' : 'data-act="tab" data-tab="train"'}>
      <div class="th"><span class="label">${S.active ? 'Training läuft' : 'Nächstes Training'}</span>${ic('dumbbell')}</div>
      <div class="next">
        <div style="flex:1;min-width:0">
          <div style="font-size:19px;font-weight:550;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(S.active ? S.active.name : nextR ? nextR.name.split(' (')[0] : 'Freies Training')}</div>
          <div class="meta">${S.active ? 'Weiter loggen' : nextR ? `${nextR.exIds.length} Übungen${nx?.inDays ? ` · ${DAYS[nx.wd]}` : ''}${activeProgram() ? ` · ${esc(activeProgram().name)}` : ''}` : 'Kein Plan aktiv'}</div>
        </div>
        <button class="play" ${S.active ? 'data-act="tab" data-tab="train"' : nextR ? `data-act="startWorkout" data-id="${nextR.id}"` : 'data-act="startWorkout"'} aria-label="Starten">${ic('play')}</button>
      </div>
      <div class="divider"></div>
      <div class="row" style="justify-content:space-between">
        <div class="dots">${Array.from({ length: Math.max(st.weeklyWorkouts, weekN) }, (_, i) => `<i class="${i < weekN ? 'on' : ''}"></i>`).join('')}</div>
        <span class="small muted">${(() => { const ws0 = ymd(weekStart(new Date())), cm = cardioInRange(ws0, addDays(ws0, 7)).reduce((a, c) => a + (c.min || 0), 0); return cm ? `${fmt(cm)} min Cardio` : `${S.workouts.length} Trainings gesamt`; })()}</span>
      </div>
    </div>

    ${habitsTile()}

    <div class="tile" data-act="goBody">
      <div class="th"><span class="label">Gewicht</span>${ic('scale')}</div>
      <div class="val">${lw ? fmt(lw.kg, 1) : '–'}<small>kg</small></div>
      <div class="meta">${rate != null ? `${sgn(rate, 2)} kg / Woche` : lw ? `zuletzt ${fmtDate(lw.date)}` : 'Noch nicht gewogen'}</div>
      <div class="foot">${sparkline(ws.slice(-12).map(w => w.kg))}</div>
    </div>

    <div class="tile">
      <div class="th"><span class="label">Wasser</span>${ic('droplet')}</div>
      <div class="val">${fmt(water / 1000, 2)}<small>/ ${fmt(st.water / 1000, 1)} l</small></div>
      <div class="foot">
        <div class="track" style="margin-bottom:12px"><i style="width:${Math.min(100, water / st.water * 100)}%;background:var(--blue)"></i></div>
        <div class="water-btns"><button data-act="water" data-ml="-250" aria-label="Weniger">−</button><button data-act="water" data-ml="250" aria-label="Mehr">+</button></div>
      </div>
    </div>

    <div class="tile wide" data-act="goMuscles">
      <div class="th"><span class="label">Muskeln diese Woche</span>${ic('target')}</div>
      <div class="mini-body">
        ${bodySVG(bodyParams(bodySource()), 'front', vol, { interactive: false })}
        <div style="flex:1">
          <div class="val">${inRange}<small>/ ${MUSCLE_LIST.length} im Ziel</small></div>
          <div class="meta">${fmt(MUSCLE_LIST.reduce((a, [m]) => a + vol[m], 0), 0)} Sätze diese Woche</div>
          ${wp?.list.length ? `<div class="divider" style="margin:12px 0"></div><div class="small"><span class="muted">Schwachstelle</span><br><b>${wp.list.slice(0, 2).map(x => mName(x.m)).join(', ')}</b></div>` : ''}
        </div>
      </div>
    </div>

    <div class="tile" data-act="goPrs">
      <div class="th"><span class="label">Rekorde</span>${ic('trophy')}</div>
      <div class="val">${prMonth}<small>diesen Monat</small></div>
      ${homeGoalLine() || `<div class="meta">${feed[0] ? `Zuletzt: ${esc(feed[0].title)}<br><span style="color:var(--text)">${feed[0].label}</span>` : 'Dein erster PR wartet'}</div>`}
    </div>

    ${photo ? `<div class="tile photo" data-act="goPhotos"><img src="${photo.url}" alt="">
      <div class="th"><span class="label" style="color:#fff">Progress</span>${ic('camera')}</div>
      <div class="ov"><div style="font-weight:550">${relDay(photo.date) === 'heute' ? 'Heute' : relDay(photo.date)[0].toUpperCase() + relDay(photo.date).slice(1)}</div><div class="meta" style="color:#ddd">${PH.list.length} Foto${PH.list.length > 1 ? 's' : ''}</div></div></div>`
    : `<div class="tile" data-act="addPhoto"><div class="th"><span class="label">Progress</span>${ic('camera')}</div>
      <div class="val" style="font-size:20px;font-weight:400">Erstes Foto</div><div class="meta">Vorher/Nachher festhalten</div></div>`}

    <div class="tile" data-act="goBody">
      <div class="th"><span class="label">Bauchumfang</span>${ic('ruler')}</div>
      ${ms.length ? `<div class="val">${fmt(ms.at(-1).waist, 1)}<small>cm</small></div>
        <div class="meta">${ms.length > 1 ? `${sgn(ms.at(-1).waist - ms[0].waist)} cm seit Start` : `gemessen ${fmtDate(ms.at(-1).date)}`}</div>`
      : `<div class="val" style="font-size:20px;font-weight:400">Maße</div><div class="meta">Alle 2–4 Wochen messen</div>`}
    </div>

    <div class="tile">
      <div class="th"><span class="label">Streak</span>${ic('flame')}</div>
      <div class="val">${streak}<small>${streak === 1 ? 'Woche' : 'Wochen'}</small></div>
      <div class="meta">Trainingsziel ${st.weeklyWorkouts}× pro Woche erreicht</div>
    </div>
  </div>

  ${tipCard()}

  <div class="notice" data-act="openStats" data-mode="week" data-off="${new Date().getDay() === 1 ? 1 : 0}">${ic('calendar')}<div class="t">${new Date().getDay() === 1 ? `Dein Wochenrückblick · KW ${isoWeek(new Date(Date.now() - 7 * 864e5))}` : 'Rückblick'}<span>Woche, Monat & Jahr in Zahlen</span></div>${ic('chev', 'chev')}</div>

  ${tip ? `<div class="card"><div class="coach">${ic('sparkle')}<div><div class="label" style="margin-bottom:6px">Coach</div><div class="small">${tip.t}</div>
    ${avgKcal() ? `<div class="small muted" style="margin-top:6px">Ø ${fmt(avgKcal().avg)} kcal ${avgKcal().n === 1 ? 'am letzten geloggten Tag' : `an den letzten ${avgKcal().n} geloggten Tagen`} · Ziel ${fmt(st.kcal)}</div>` : ''}</div></div></div>` : ''}
  `;
};

VIEWS.food = () => {
  const d = UI.foodDate, st = S.settings, fut = d > today();
  const t = dayTotals(d, fut ? 'all' : undefined), tp = dayTotals(d, 'plan'), open = fut ? [] : plannedOpen(d);
  const isToday = d === today();
  const label = dayLabel(d);
  const items = S.foods.filter(f => f.date === d);
  const tm = addDays(today(), 1), tmN = S.foods.filter(f => f.date === tm).length, tmK = dayTotals(tm, 'all').kcal;
  const row = f => `<div class="item tap ${f.planned ? 'planned' : ''}" data-act="foodItem" data-id="${f.id}">${!fut && (f.planned || f.fromPlan) ? `<button class="tick ${f.planned ? '' : 'on'}" data-act="eatFood" data-id="${f.id}" aria-label="${f.planned ? 'Als gegessen abhaken' : 'Zurück auf geplant'}">${ic('check')}</button>` : ''}<div class="t"><b>${esc(f.name)}</b>
        <span>${f.recId ? ic('repeat', 'rep-ic') : ''}${f.planned && !fut ? 'geplant · ' : ''}${f.g ? fmt(f.g) + ' g · ' : ''}P ${fmt(f.p)} · K ${fmt(f.c)} · F ${fmt(f.f)}</span></div>
        <b>${fmt(f.kcal)}</b><button class="x" data-act="delFood" data-id="${f.id}" aria-label="Löschen">×</button></div>`;
  return `
  <div class="row" style="justify-content:space-between;align-items:flex-start"><h1>Ernährung</h1><button class="btn sm" data-act="library" style="margin-top:6px">Rezepte & Vorlagen</button></div>
  <div class="datenav" style="margin-top:10px">
    <button class="icon-btn" data-act="foodDay" data-n="-1">‹</button>
    <b>${label}${fut ? ' <span class="plan-pill">Plan</span>' : ''}</b>
    <button class="icon-btn" data-act="foodDay" data-n="1" ${d >= addDays(today(), PLAN_DAYS) ? 'disabled style="opacity:.3"' : ''}>›</button>
  </div>
  <div class="card">
    <div class="grid2" style="margin-bottom:10px">
      <div class="stat"><b>${fmt(t.kcal)} kcal</b><span>${fut ? 'geplant' : 'gegessen'}</span></div>
      <div class="stat"><b class="${st.kcal - t.kcal < 0 ? 'down' : ''}">${fmt(st.kcal - t.kcal)} kcal</b><span>${fut ? 'frei' : 'übrig'} von ${fmt(st.kcal)}</span></div>
    </div>
    <div class="bars">
      ${bar('Protein', t.p, st.protein, 'var(--pink)')}
      ${bar('Kohlenhydrate', t.c, st.carbs, 'var(--blue)')}
      ${bar('Fett', t.f, st.fat, 'var(--orange)')}
    </div>
    ${open.length ? `<div class="plan-open"><span><span class="nw">📋 Geplant: <b>${fmt(tp.kcal)} kcal</b> · ${fmt(tp.p)} g P</span><br><span class="muted nw">Mit Plan: ${fmt(t.kcal + tp.kcal)} / ${fmt(st.kcal)} kcal</span></span><button class="btn sm" data-act="eatAll" data-d="${d}">Alle abhaken</button></div>` : ''}
  </div>
  <button class="btn primary block add-main" data-act="quickFood">${fut ? `+ ${d === tm ? 'Für morgen' : 'Für ' + label} planen` : '+ Essen eintragen'} <span>· ${esc(mealName(isToday ? mealForNow() : Object.keys(MEALS)[0]))}</span></button>
  ${!items.length && S.foods.some(f => f.date === addDays(d, -1) && (fut || !f.planned)) ? `<button class="btn block ghost" style="margin-top:10px" data-act="copyDay">⧉ ${addDays(d, -1) === today() ? 'Heute übernehmen' : 'Vortag ' + (fut ? 'übernehmen' : 'kopieren')}</button>` : ''}
  ${[...Object.entries(MEALS), ...[...new Set(items.map(f => f.meal))].filter(k => !MEALS[k]).map(k => [k, mealName(k)])].map(([k, name]) => {
    const list = items.filter(f => f.meal === k);
    const kc = list.reduce((a, f) => a + f.kcal, 0), mo = list.filter(f => f.planned).length;
    return `<div class="meal"><div class="meal-head"><h3>${name} ${kc ? `· ${fmt(kc)} kcal` : ''}</h3><div class="row" style="gap:6px">${!fut && mo ? `<button class="btn sm ghost" data-act="eatAll" data-d="${d}" data-meal="${k}">✓ Abhaken</button>` : list.length ? `<button class="btn sm ghost" data-act="saveTemplate" data-meal="${k}">Als Vorlage</button>` : ''}<button class="btn sm" data-act="addFood" data-meal="${k}">+</button></div></div>
      ${list.length ? `<div class="list">${list.map(row).join('')}</div>` : ''}
    </div>`;
  }).join('')}
  <button class="btn sm ghost block" style="margin-top:4px" data-act="mealsSheet">Mahlzeiten anpassen · ${Object.keys(MEALS).length} pro Tag</button>
  <h3>Planen & Ideen</h3>
  <div class="notice" data-act="recList">${ic('calendar')}<div class="t">Regelmäßige Mahlzeiten${(S.recurring || []).length ? ` · ${S.recurring.length}` : ''}<span>${(S.recurring || []).length ? S.recurring.slice(0, 3).map(r => `${esc(r.name)} ${daysTxt(r.days)}`).join(' · ') : 'z.B. jeden Morgen Kaffee oder mittwochs Döner – trägt sich automatisch ein'}</span></div>${ic('chev', 'chev')}</div>
  ${isToday ? `<div class="notice plan-tm" data-act="planDay" data-d="${tm}">${ic('calendar')}<div class="t">Morgen planen<span>${tmN ? `${tmN} ${tmN === 1 ? 'Eintrag' : 'Einträge'} · ${fmt(tmK)} kcal geplant` : 'Lege fest, was du morgen isst – dann nur noch abhaken'}</span></div>${ic('chev', 'chev')}</div>` : ''}
  ${fut ? `<button class="btn block ghost" style="margin-bottom:14px" data-act="planDay" data-d="${today()}">← Zurück zu heute</button>` : ''}
  ${fitCard(d)}
  ${energyCard()}
  ${ideasCard()}
  ${prepCard()}`;
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

  ${(() => {
    const pg = activeProgram(), nx = nextDay(), days = programDays(pg);
    return pg ? `<div class="card accent">
      <div class="card-head"><h2>${esc(pg.name)}</h2><button class="btn sm" data-act="editProgram" data-id="${pg.id}">✎ Bearbeiten</button></div>
      <div class="small muted" style="margin:-4px 0 10px">${programMeta(pg)}</div>
      ${nx ? `<button class="btn primary block" data-act="startWorkout" data-id="${nx.r.id}">▶ ${nx.inDays ? `Nächstes (${DAYS[nx.wd].slice(0, 2)})` : nx.wd != null ? 'Heute' : 'Als Nächstes'}: ${esc(nx.r.name)}</button>` : ''}
      <div class="list" style="margin-top:10px">${days.map(d => `<div class="item"><div class="t"><b>${d.wd != null ? `<span class="pill">${DAYS[d.wd].slice(0, 2)}</span> ` : ''}${esc(d.r.name)}</b>
        <span>${d.r.exIds.map(id => { const ex = exById(id); return ex ? `${esc(ex.name)} ${daySets(d.r, ex)}×` : ''; }).filter(Boolean).join(' · ')}</span></div>
        <button class="btn sm" data-act="startWorkout" data-id="${d.r.id}">Start</button></div>`).join('')}</div>
      <button class="btn block ghost" style="margin-top:8px" data-act="goMuscles">Volumen pro Muskel ansehen</button>
    </div>` : '<div class="card"><b>Kein aktiver Plan</b><div class="small muted" style="margin-top:4px">Bau dir einen Plan oder aktiviere eine Vorlage unten.</div></div>';
  })()}
  ${planProgressCard()}
  <h3>Alle Trainingspläne</h3>
  <div class="list">${S.programs.map(p => `<div class="item tap" data-act="editProgram" data-id="${p.id}"><div class="t"><b>${esc(p.name)}</b><span>${programMeta(p)}</span></div>
    ${p.id === S.activeProgram ? '<span class="pill acc">Aktiv</span>' : `<button class="btn sm" data-act="setActiveProgram" data-id="${p.id}">Aktivieren</button>`}</div>`).join('')}</div>
  <div class="row" style="margin-top:8px">
    <button class="btn primary grow" data-act="editProgram">Plan bauen</button>
    <button class="btn grow" data-act="startWorkout">Freies Training</button>
  </div>

  ${cardioCard()}

  <h3>Trainings pro Woche</h3>
  <div class="card">${barChart(weeks.map(workoutsInWeek), weeks.map(d => 'KW' + isoWeek(d)), { goal: st.weeklyWorkouts })}</div>

  ${used.size ? `<h3>Übungen & nächstes Ziel</h3>
  <div class="list">${S.exercises.filter(e => used.has(e.id)).map(ex => {
    const s = suggest(ex), b = bestSet(exHistory(ex.id).flatMap(x => x.sets));
    return `<div class="item tap" data-act="openExercise" data-id="${ex.id}"><div class="t"><b>${esc(ex.name)}</b>
      <span>Bestes: ${b ? `${fmt(b.w, 2)} kg × ${b.r}` : '–'} · e1RM ${b?.w ? fmt(e1rm(b.w, b.r), 1) + ' kg' : '–'}</span></div>
      <span class="pill ${s.status === 'up' ? 'up' : ''}">${s.status === 'up' ? '⬆ ' : ''}${fmt(s.w, 2)} kg × ${s.reps[0]}</span></div>`;
  }).join('')}</div>` : ''}

  <h3>Verlauf</h3>
  ${hist.length ? `<div class="list">${hist.slice(0, 30).map(w => {
    const vol = w.entries.reduce((a, e) => a + WK(e.sets).reduce((b, s) => b + (s.w || 0) * s.r, 0), 0);
    const nSets = w.entries.reduce((a, e) => a + WK(e.sets).length, 0);
    return `<div class="item tap" data-act="openWorkout" data-id="${w.id}"><div class="t"><b>${esc(w.name)}</b>
      <span>${fmtDate(w.date, { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${mmss((w.end - w.start) / 1000)} · ${nSets} Sätze · ${fmt(vol)} kg Volumen</span></div><span class="muted">›</span></div>`;
  }).join('')}</div>` : '<div class="empty">Noch keine Trainings. Starte deinen ersten Plan!</div>'}`;
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
    <div class="muted small"><span data-elapsed>${mmss((Date.now() - a.start) / 1000)}</span> · ${done}/${total} Sätze erledigt</div>
    <button class="btn block gym-btn" data-act="gymOpen">${ic('screen')} Gym-Modus starten</button>
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
        <span class="muted small">${RR(ex).min}–${RR(ex).max} Wdh · ${mmss(ex.rest)} Pause</span></div>
      <input class="note-in" data-exnote="${ex.id}" value="${esc(ex.note || '')}" placeholder="+ Notiz (z.B. Sitz Stufe 4)" autocomplete="off">
      ${progBox(s)}
      ${pl ? `<div class="plates">${pl}</div>` : ''}
      <table class="sets"><tr><th>Satz</th><th>Vorher</th><th>kg</th><th>Wdh</th><th>✓</th></tr>
      ${e.sets.map((x, si) => { const wi = workIdx(e, si), pp = x.type === 'warm' ? null : prev?.sets[wi]; return `<tr class="${x.done ? 'done' : ''} ${x.type === 'warm' ? 'warm' : ''}">
        <td><button class="stype ${x.type || ''}" data-act="setType" data-e="${ei}" data-s="${si}" aria-label="${SET_TYPE_NAME[x.type || '']}">${setLabel(x, wi)}</button></td>
        <td class="prev">${pp ? `${fmt(pp.w, 2)}×${pp.r}` : x.type === 'warm' ? 'Aufw.' : '–'}<div id="lv_${ei}_${si}">${liveDelta(x, pp)}</div></td>
        <td><input inputmode="decimal" data-bind="w" data-e="${ei}" data-s="${si}" value="${x.w ?? ''}"></td>
        <td><input inputmode="numeric" data-bind="r" data-e="${ei}" data-s="${si}" value="${x.r ?? ''}" placeholder="${x.t ?? ''}"></td>
        <td><button class="chk" data-act="toggleSet" data-e="${ei}" data-s="${si}">✓</button></td></tr>`; }).join('')}
      </table>
      <div class="lv-sum" id="lvs_${ei}">${liveSummary(e, prev)}</div>
      <div class="row" style="margin-top:8px">
        <button class="btn sm" data-act="addSet" data-e="${ei}">+ Satz</button>
        <button class="btn sm" data-act="removeSet" data-e="${ei}">− Satz</button>
        ${(e.sets.find(x => x.type !== 'warm')?.w || 0) > 0 ? `<button class="btn sm ${e.sets.some(x => x.type === 'warm') ? 'ghost' : ''}" data-act="addWarmup" data-e="${ei}">${e.sets.some(x => x.type === 'warm') ? '− Aufwärmen' : '+ Aufwärmen'}</button>` : ''}
        <span class="grow"></span>
        ${ei > 0 ? `<button class="btn sm ghost" data-act="moveEntry" data-e="${ei}">↑</button>` : ''}
        <button class="btn sm ghost danger" data-act="removeEntry" data-e="${ei}">Entfernen</button>
      </div>
    </div>`;
  }).join('')}
  <button class="btn block" data-act="addEntry">+ Übung hinzufügen</button>`;
}

VIEWS.body = () => {
  const seg = `<div class="seg">${[['body', 'Körper'], ['muscles', 'Muskeln'], ['photos', 'Fotos'], ['prs', 'PRs']].map(([k, l]) =>
    `<button class="${UI.prog === k ? 'on' : ''}" data-act="progSeg" data-k="${k}">${l}</button>`).join('')}</div>`;
  return `<div class="row" style="justify-content:space-between;align-items:flex-start"><h1>Progress</h1><button class="btn sm" data-act="openStats" data-mode="month" style="margin-top:6px">Rückblick</button></div><div class="sub">Körper, Muskel-Volumen, Fotos und Rekorde – dein Fortschritt auf einen Blick.</div>${seg}
    ${UI.prog === 'muscles' ? progMuscles() : UI.prog === 'photos' ? progPhotos() : UI.prog === 'prs' ? progPRs() : progBody()}`;
};

function progBody() {
  const st = S.settings;
  const ws = [...S.weights].sort((a, b) => a.date.localeCompare(b.date));
  const from = UI.bodyRange ? addDays(today(), -UI.bodyRange) : '0000';
  const shown = ws.filter(w => w.date >= from);
  const first = ws[0], last = ws.at(-1), rate = weightTrend();
  const bmi = last ? last.kg / (st.height / 100) ** 2 : null;
  const ms = [...S.measures].sort((a, b) => b.date.localeCompare(a.date));
  const MF = [['waist', 'Bauch'], ['chest', 'Brust'], ['shoulders', 'Schultern'], ['arm', 'Arm'], ['thigh', 'Oberschenkel'], ['calf', 'Wade'], ['hip', 'Hüfte'], ['bf', 'KFA %']];
  const nxt = nextWeighSlot();
  return `
  <div class="card">
    <div class="card-head"><h2>Gewicht</h2><button class="btn sm primary" data-act="addWeight">+ Wiegen</button></div>
    <div class="small muted" style="margin:-4px 0 10px">Nächster Wiege-Termin: ${weighDue() ? '<b style="color:var(--orange)">jetzt fällig</b>' : `${DAYS[nxt.getDay()]}, ${nxt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${S.settings.weighTime} Uhr`}</div>
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
    ${st.goalWeight && last && rate && Math.sign(st.goalWeight - last.kg) === Math.sign(rate) ? `<div class="small muted" style="margin-top:8px">Bei aktuellem Tempo erreichst du dein Ziel in ca. <b>${fmt(Math.abs((st.goalWeight - last.kg) / rate))} Wochen</b>.</div>` : ''}
  </div>
  ${ws.length ? `<div class="list">${ws.slice().reverse().slice(0, 20).map((w, i, arr) => {
    const p = arr[i + 1];
    return `<div class="item"><div class="t"><b>${fmt(w.kg, 1)} kg</b><span>${fmtDate(w.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })}${w.note ? ' · ' + esc(w.note) : ''}</span></div>
      ${p ? `<span class="pill">${sgn(w.kg - p.kg)}</span>` : ''}<button class="x" data-act="delWeight" data-id="${w.id}">×</button></div>`;
  }).join('')}</div>` : ''}

  ${checkinCard()}
  ${bodyCompareCard()}

  <h3>Körpermaße</h3>
  <div class="card">
    <div class="card-head"><h2>Maße</h2><button class="btn sm" data-act="addMeasure">+ Messen</button></div>
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
}

function progPhotos() {
  const a = PH.list.at(-1), b = PH.list[0];
  return `
  <div class="card">
    <div class="card-head"><h2>Fortschrittsfotos</h2><button class="btn sm primary" data-act="addPhoto">+ Foto</button></div>
    ${PH.list.length >= 2 ? `<button class="cmp-teaser" data-act="photoCompare">
      <div class="cmp"><img src="${a.url}" alt=""><img src="${b.url}" alt=""></div>
      <div class="row" style="margin-top:6px"><b class="grow">⇆ Erstes vs. neuestes Foto</b>
        <span class="pill acc">${fmt(Math.max(0, daysBetween(a.date, b.date)) / 7)} Wochen${a.kg != null && b.kg != null ? ` · ${sgn(b.kg - a.kg)} kg` : ''}</span></div></button>
      <div class="hr"></div>` : ''}
    ${PH.list.length ? `<div class="photos">${PH.list.map(p => `<button class="ph" data-act="openPhoto" data-id="${p.id}">
      <img src="${p.url}" alt="" loading="lazy"><span>${fmtDate(p.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}${p.kg ? ` · ${fmt(p.kg, 1)} kg` : ''}</span></button>`).join('')}</div>`
    : `<div class="empty small">${PH.ready ? 'Mach alle 2–4 Wochen ein Foto – gleiches Licht, gleiche Pose, gleiche Uhrzeit. Im Vergleich siehst du Fortschritt, den Waage & Spiegel nicht zeigen.' : 'Lade Fotos …'}</div>`}
    <div class="small muted" style="margin-top:8px">Fotos bleiben nur auf diesem Gerät und sind nicht im JSON-Backup enthalten.</div>
  </div>`;
}

function progPRs() {
  const auto = autoPRs(), groups = manualPrGroups();
  const lifts = S.exercises.map(ex => ({ ex, b: liftBest(ex.id, auto) })).filter(x => x.b)
    .sort((x, y) => (y.b.w ? e1rm(y.b.w, y.b.r) : 0) - (x.b.w ? e1rm(x.b.w, x.b.r) : 0));
  const feed = prFeed(auto);
  const month = today().slice(0, 7);
  return `
  <div class="grid3" style="margin-bottom:12px">
    <div class="stat"><b>${feed.filter(f => f.date.startsWith(month)).length}</b><span>PRs diesen Monat</span></div>
    <div class="stat"><b>${feed.length}</b><span>PRs gesamt</span></div>
    <div class="stat"><b>${feed[0] ? daysBetween(feed[0].date, today()) + ' T' : '–'}</b><span>seit letztem PR</span></div>
  </div>
  <button class="btn primary block" data-act="addPr">+ PR eintragen</button>
  <div class="small muted" style="margin:6px 2px 0">Kraft-PRs aus deinen Trainings werden automatisch erkannt. Hier kannst du alles andere festhalten: Laufzeiten, max. Klimmzüge, Plank, 1RM-Tests …</div>

  ${goalsSection()}
  ${standardsCard()}
  ${groups.length ? `<h3>Eigene Rekorde</h3><div class="list">${groups.map(g => `<div class="item tap" data-act="openPrGroup" data-key="${esc(g.key)}">
    <div class="t"><b>${esc(g.best.title)}</b><span>${PR_KINDS[g.best.kind]} · ${g.items.length} Eintr${g.items.length > 1 ? 'äge' : 'ag'} · ${fmtDate(g.best.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}</span></div>
    <b>${prLabel(g.best)}</b><span class="muted">›</span></div>`).join('')}</div>` : ''}

  <h3>Kraft-Bestwerte</h3>
  ${lifts.length ? `<div class="list">${lifts.map(({ ex, b }) => `<div class="item tap" data-act="openExercise" data-id="${ex.id}">
    <div class="t"><b>${esc(ex.name)}</b><span>${b.w ? `e1RM ${fmt(e1rm(b.w, b.r), 1)} kg · ` : ''}${fmtDate(b.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}${b.manual ? ' · eingetragen' : ''}</span></div>
    <b>${prLabel({ kind: 'lift', ...b })}</b><span class="muted">›</span></div>`).join('')}</div>`
  : '<div class="empty small">Noch keine Kraftwerte – nach deinem ersten Training stehen hier deine Bestleistungen.</div>'}

  ${badgesSection()}

  <h3>PR-Timeline</h3>
  ${feed.length ? `<div class="list">${feed.slice(0, UI.allFeed ? 100 : 8).map(f => `<div class="item"><span style="color:var(--accent)">${ic('trophy')}</span><div class="t"><b>${esc(f.title)}</b>
    <span>${fmtDate(f.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })} · ${f.src}</span></div><b>${f.label}</b></div>`).join('')}</div>${feed.length > 8 ? `<button class="btn sm ghost block" style="margin-top:10px" data-act="toggleFeed">${UI.allFeed ? 'Weniger anzeigen' : `Alle ${feed.length} Rekorde anzeigen`}</button>` : ''}`
  : '<div class="empty small">Dein erster PR wartet.</div>'}`;
}

VIEWS.more = () => {
  const st = S.settings;
  const notif = 'Notification' in window ? Notification.permission : 'unsupported';
  return `
  <h1>Einstellungen</h1>
  <div class="sub">Profil, Ziele, Erinnerungen & Daten</div>
  ${accentCard()}
  <div class="card tap-card" data-act="mealsSheet"><div class="card-head" style="margin:0"><h2 style="margin:0">Mahlzeiten</h2><span class="pill acc">${Object.keys(MEALS).length} pro Tag</span></div>
    <div class="small muted" style="margin-top:8px">${Object.values(MEALS).map(esc).join(' · ')}</div></div>

  <div class="card">
    <h2>Profil</h2>
    <label class="f"><span>Name (optional)</span><input id="s_name" value="${esc(st.name || '')}" placeholder="Wie soll ich dich nennen?" autocomplete="given-name"></label>
    <div class="grid2">
      <label class="f"><span>Geschlecht</span><select id="s_sex"><option value="m" ${st.sex === 'm' ? 'selected' : ''}>Männlich</option><option value="f" ${st.sex === 'f' ? 'selected' : ''}>Weiblich</option></select></label>
      <label class="f"><span>Alter</span><input id="s_age" inputmode="numeric" value="${st.age ?? ''}"></label>
      <label class="f"><span>Größe (cm)</span><input id="s_height" inputmode="numeric" value="${st.height ?? ''}"></label>
      <label class="f"><span>Zielgewicht (kg)</span><input id="s_goalWeight" inputmode="decimal" value="${st.goalWeight ?? ''}" placeholder="optional"></label>
    </div>
    <label class="f"><span>Aktivität</span><select id="s_activity">${ACTIVITY.map(([v, l]) => `<option value="${v}" ${+st.activity === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="f"><span>Ziel</span><select id="s_goal">${Object.entries(GOALS).map(([v, l]) => `<option value="${v}" ${st.goal === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <button class="btn block" data-act="calcGoals">Ziele automatisch berechnen</button>
    <div class="small muted" style="margin-top:6px">Nutzt die Mifflin-St-Jeor-Formel und dein letztes Gewicht. Protein: 2 g/kg, Fett: 0,8 g/kg, Rest Kohlenhydrate.</div>
  </div>

  <div class="card">
    <h2>Tagesziele</h2>
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
    <h2>Progression</h2>
    <p class="small muted" style="margin-top:0">Gilt für alle Übungen. Einzelnen Übungen kannst du beim Bearbeiten einen eigenen Bereich geben. Es wird immer gesteigert: erst die Wiederholungen, dann das Gewicht.</p>
    <div class="grid3">
      <label class="f"><span>Wdh. von</span><input id="s_pmin" inputmode="numeric" value="${st.prog.min}"></label>
      <label class="f"><span>Wdh. bis</span><input id="s_pmax" inputmode="numeric" value="${st.prog.max}"></label>
      <label class="f"><span>Gewicht steigern ab</span><input id="s_pup" inputmode="numeric" value="${st.prog.up}"></label>
    </div>
    <div class="prog-ex small" id="s_pex">${progExample(st.prog)}</div>
    <button class="btn primary block" data-act="saveSettings">Speichern</button>
  </div>

  <div class="card">
    <h2>Wöchentliche Wiege-Erinnerung</h2>
    <div class="grid2">
      <label class="f"><span>Tag</span><select id="s_weighDay">${DAYS.map((d, i) => [d, i]).slice(1).concat([[DAYS[0], 0]]).map(([d, i]) => `<option value="${i}" ${+st.weighDay === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label class="f"><span>Uhrzeit</span><input id="s_weighTime" type="time" value="${st.weighTime}"></label>
    </div>
    <button class="btn primary block" data-act="saveSettings">Speichern</button>
    <div class="hr"></div>
    <p class="small muted" style="margin-top:0"><b>Zuverlässigste Variante:</b> Termin in deinen Handy-Kalender übernehmen – dann klingelt es jede Woche, auch wenn die App zu ist.</p>
    <button class="btn block" data-act="downloadIcs">Wöchentlichen Termin zum Kalender hinzufügen</button>
    <p class="small muted">Zusätzlich zeigt die App ein Banner, sobald das Wiegen fällig ist${notif !== 'unsupported' ? ', und schickt eine Benachrichtigung, wenn sie geöffnet ist' : ''}.</p>
    ${notif === 'default' ? '<button class="btn block" data-act="askNotif">Benachrichtigungen erlauben</button>' : notif === 'granted' ? '<div class="small up">Benachrichtigungen sind aktiv.</div>' : notif === 'denied' ? '<div class="small muted">Benachrichtigungen sind im Browser blockiert.</div>' : ''}
  </div>

  ${libraryCard()}

  <div class="card">
    <h2>Daten</h2>
    <p class="small muted" style="margin-top:0">Alles wird nur auf diesem Gerät gespeichert. Mach ab und zu ein Backup!</p>
    <div class="row">
      <button class="btn grow" data-act="exportData">⬇ Backup exportieren</button>
      <button class="btn grow" data-act="importData">⬆ Backup laden</button>
    </div>
    <button class="btn block ghost danger" style="margin-top:8px" data-act="resetAll">Alle Daten löschen</button>
  </div>
  <div class="card">
    <h2>Rechtliches & Hinweise</h2>
    <div class="list">${[['hinweise', 'Gesundheitshinweise', 'Was die App kann – und was nicht'], ['datenschutz', 'Datenschutz', 'Alles bleibt auf deinem Gerät'], ['impressum', 'Impressum', 'Anbieterkennzeichnung'], ['lizenzen', 'Lizenzen', 'Verwendete Open-Source-Software']]
      .map(([p, t, s]) => `<div class="item tap" data-act="openLegal" data-p="${p}"><div class="t"><b>${t}</b><span>${s}</span></div><span class="muted">›</span></div>`).join('')}</div>
  </div>
  <div class="small muted" style="text-align:center">Duty First · ${S.workouts.length} Trainings · ${S.foods.length} Essens-Einträge · ${S.weights.length} Wiegungen</div>`;
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
  if ((UI.tab === 'body' || UI.tab === 'today') && !sheetOpen()) render();
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
  toast('Speichere Foto …');
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
  toast(n ? `✓ ${n} Foto${n > 1 ? 's' : ''} gespeichert` : '⚠ Foto konnte nicht gespeichert werden');
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
    <div class="sheet-actions"><button class="btn" data-act="sharePhotos" data-a="${a.id}" data-b="${b.id}">Teilen</button><button class="btn" data-act="closeSheet">Schließen</button></div>`);
}

/* ---------- Render ---------- */
function render() {
  applyRecurringAll();
  $('#view').innerHTML = VIEWS[UI.tab]();
  $$('.tabbar button').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === UI.tab);
    b.classList.toggle('dot', (b.dataset.tab === 'train' && !!S.active) || (b.dataset.tab === 'body' && weighDue()));
  });
  updateFab();
  document.body.classList.toggle('food-tab', UI.tab === 'food');
  checkAchievements();
}

/* ---------- Sheets ---------- */
function weightSheet() {
  const lw = latestWeight();
  openSheet(`<h2>Gewicht eintragen</h2>
    <div class="grid2"><label class="f"><span>Gewicht (kg)</span><input id="w_kg" inputmode="decimal" value="${lw ? fmt(lw.kg, 1) : ''}" autofocus></label>
    <label class="f"><span>Datum</span><input id="w_date" type="date" value="${today()}" max="${today()}"></label></div>
    <label class="f"><span>Notiz (optional)</span><input id="w_note" placeholder="z.B. nach Cheat Day"></label>
    <div class="small muted">Tipp: Immer gleich wiegen – morgens, nüchtern, nach dem Toilettengang, ohne Kleidung.</div>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="saveWeight">Speichern</button></div>`);
  setTimeout(() => $('#w_kg')?.select(), 50);
}
function measureSheet() {
  const last = [...S.measures].sort((a, b) => b.date.localeCompare(a.date))[0] || {};
  const F = [['waist', 'Bauch (cm)'], ['chest', 'Brust (cm)'], ['shoulders', 'Schultern (cm)'], ['arm', 'Oberarm (cm)'], ['thigh', 'Oberschenkel (cm)'], ['calf', 'Wade (cm)'], ['hip', 'Hüfte (cm)'], ['bf', 'Körperfett (%)']];
  openSheet(`<h2>Körpermaße</h2>
    <label class="f"><span>Datum</span><input id="m_date" type="date" value="${today()}" max="${today()}"></label>
    <div class="grid2">${F.map(([k, l]) => `<label class="f"><span>${l}</span><input id="m_${k}" inputmode="decimal" placeholder="${last[k] != null ? fmt(last[k], 1) : ''}"></label>`).join('')}</div>
    <div class="small muted">Leere Felder werden nicht gespeichert. Grau = letzter Wert.</div>
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="saveMeasure">Speichern</button></div>`);
}

/* ---- Eintrag antippen ---- */
function foodItemSheet(id) {
  const f = S.foods.find(x => x.id === id); if (!f) return;
  const r = f.recId && (S.recurring || []).find(x => x.id === f.recId);
  openSheet(`<h2>${esc(f.name)}</h2>
    <div class="small muted" style="margin-bottom:12px">${f.g ? fmt(f.g) + ' g · ' : ''}${fmt(f.kcal)} kcal · P ${fmt(f.p)} · K ${fmt(f.c)} · F ${fmt(f.f)}${f.planned ? ' · geplant' : ''}</div>
    <div class="fl"><span>Mahlzeit</span><div class="chips">${Object.entries(MEALS).map(([k, l]) => `<button class="chip ${k === f.meal ? 'on' : ''}" data-act="fiMeal" data-id="${f.id}" data-k="${k}">${esc(l)}</button>`).join('')}</div></div>
    ${r ? `<div class="card accent" style="margin-top:6px"><b>${ic('repeat', 'rep-ic')} Regelmäßig: ${daysTxt(r.days)}</b><div class="small muted">${esc(mealName(r.meal))} · ${r.mode === 'auto' ? 'automatisch als gegessen' : 'zum Abhaken'}${r.paused ? ' · pausiert' : ''}</div></div>` : ''}
    <div class="sheet-actions"><button class="btn danger" data-act="delFood" data-id="${f.id}">Löschen</button><button class="btn" data-act="${r ? 'recEdit' : 'recFromFood'}" data-id="${r ? r.id : f.id}">${ic('repeat', 'rep-ic')} ${r ? 'Regel bearbeiten' : 'Regelmäßig'}</button></div>`);
}
let RC2 = null;
function recSheet(r, isNew) {
  RC2 = { ...r, days: [...r.days], isNew };
  openSheet(`<h2>${isNew ? 'Regelmäßig einplanen' : 'Regelmäßige Mahlzeit'}</h2>
    <div class="card"><b>${esc(r.name)}</b><div class="small muted">${r.g ? fmt(r.g) + ' g · ' : ''}${fmt(r.kcal)} kcal · P ${fmt(r.p)} · K ${fmt(r.c)} · F ${fmt(r.f)}</div></div>
    <div id="rec_days">${repDaysHtml(RC2.days, 'Wochentage')}</div>
    <div class="fl"><span>Mahlzeit</span><div class="chips" id="rec_meal">${Object.entries(MEALS).map(([k, l]) => `<button class="chip ${k === RC2.meal ? 'on' : ''}" data-act="recMeal" data-k="${k}">${esc(l)}</button>`).join('')}</div></div>
    <div class="fl"><span>Eintragen als</span><div class="seg" id="rec_mode">${[['plan', 'Geplant – zum Abhaken'], ['auto', 'Automatisch gegessen']].map(([k, l]) => `<button class="${(RC2.mode || 'plan') === k ? 'on' : ''}" data-act="recMode" data-k="${k}">${l}</button>`).join('')}</div></div>
    ${!isNew ? `<label class="row" style="margin:8px 0"><input type="checkbox" id="rec_pause" ${r.paused ? 'checked' : ''}> <span>Pausieren</span></label>` : ''}
    <div class="sheet-actions">${!isNew ? `<button class="btn danger" data-act="recDel" data-id="${r.id}">Löschen</button>` : '<button class="btn" data-act="closeSheet">Abbrechen</button>'}<button class="btn primary" data-act="recSave">Speichern</button></div>`);
}
function recListSheet() {
  const L = S.recurring || [];
  openSheet(`<h2>Regelmäßige Mahlzeiten</h2>
    <div class="small muted" style="margin-bottom:12px">Tragen sich an den gewählten Wochentagen automatisch ein – als geplant zum Abhaken oder direkt als gegessen.</div>
    ${L.length ? `<div class="list">${L.map(r => `<div class="item tap" data-act="recEdit" data-id="${r.id}"><div class="t"><b>${esc(r.name)}${r.paused ? ' <span class="muted">· pausiert</span>' : ''}</b><span>${daysTxt(r.days)} · ${esc(mealName(r.meal))} · ${fmt(r.kcal)} kcal${r.mode === 'auto' ? ' · automatisch' : ''}</span></div><span class="muted">›</span></div>`).join('')}</div>`
      : '<div class="empty small">Noch keine. Füge ein Lebensmittel hinzu und wähle unten „Regelmäßig einplanen“ – oder tippe im Essen-Tab einen Eintrag an.</div>'}
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Schließen</button><button class="btn primary" data-act="recNew">+ Neu</button></div>`);
}

/* ---- Essen hinzufügen ---- */
let FC = null;
function foodSheet(meal) {
  if (!meal) meal = mealForNow();
  FC = { meal, date: UI.tab === 'food' ? UI.foodDate : today(), mode: 'search', list: [], picked: null };
  FC.plan = FC.date > today();
  openSheet(`<h2>${FC.date > today() ? `Planen · ${dayLabel(FC.date)}` : 'Essen eintragen'}</h2>
    ${FC.date === today() ? `<div class="seg plan-seg" id="fcPlan"><button data-act="fcPlan" data-v="0" class="${FC.plan ? '' : 'on'}">✓ Gegessen</button><button data-act="fcPlan" data-v="1" class="${FC.plan ? 'on' : ''}">📋 Nur planen</button></div>` : ''}
    <div class="chips lb-chips meal-pick" id="fcMeals" style="margin:0 0 14px">${Object.entries(MEALS).map(([k, l]) => `<button class="chip ${k === meal ? 'on' : ''}" data-act="fcMeal" data-k="${k}">${esc(l)}</button>`).join('')}</div>
    <div class="seg" id="foodSeg">${[['search', 'Suchen'], ['saved', 'Gespeichert'], ['manual', 'Manuell'], ['label', 'Etikett']].map(([m, l]) => `<button data-act="foodMode" data-m="${m}" class="${m === 'search' ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="foodBody"></div>`);
  renderFoodBody();
}
function renderFoodBody() {
  const b = $('#foodBody'); if (!b) return;
  $$('#foodSeg button').forEach(x => x.classList.toggle('on', x.dataset.m === FC.mode));
  if (FC.picked) return FC.picked.recipe ? renderRecipeAmount() : renderAmount();
  if (FC.mode === 'saved') return renderSaved(b);
  if (FC.mode === 'search') {
    b.innerHTML = `<input id="fq" type="search" placeholder="z.B. Haferflocken, Skyr, Hähnchen …" autocomplete="off">
      <div class="chips lb-chips" id="fcats"></div>
      <div id="fres" style="margin-top:10px"></div>
      <button class="btn block ghost" style="margin-top:10px" data-act="newCustomFood">+ Eigenes Lebensmittel anlegen</button>`;
    renderFoodResults();
  } else if (FC.mode === 'manual') {
    b.innerHTML = `<label class="f"><span>Name</span><input id="fm_name" placeholder="z.B. Mensa Pasta"></label>
      <div class="grid2"><label class="f"><span>Kalorien (kcal)</span><input id="fm_kcal" inputmode="decimal"></label>
      <label class="f"><span>Protein (g)</span><input id="fm_p" inputmode="decimal"></label>
      <label class="f"><span>Kohlenhydrate (g)</span><input id="fm_c" inputmode="decimal"></label>
      <label class="f"><span>Fett (g)</span><input id="fm_f" inputmode="decimal"></label></div>
      <label class="row" style="margin-bottom:10px"><input type="checkbox" id="fm_fav"> <span>Als Favorit speichern ★</span></label>
      <button class="btn primary block" data-act="addManual">Hinzufügen</button>`;
  } else {
    b.innerHTML = `<div class="ocr-box"><p class="small muted" style="margin:0">Fotografiere die Nährwerttabelle einer Verpackung – die App liest die Werte direkt auf dem Handy aus (nichts wird hochgeladen) und speichert das Produkt in deiner Bibliothek.</p>
      <button class="btn primary block" data-act="cfScanNew">${ic('camera')} Nährwerttabelle scannen</button>
      <button class="btn block ghost" data-act="newCustomFood">Werte selbst eintippen</button></div>`;
  }
}
function renderFoodResults() {
  const box = $('#fres'); if (!box) return;
  const q = ($('#fq')?.value || '').trim();
  const seen = new Set(), recents = [];
  for (const f of [...S.foods].sort((a, b) => b.ts - a.ts)) {
    const k = f.name.toLowerCase() + '|' + Math.round(f.kcal);
    if (!seen.has(k)) { seen.add(k); recents.push(f); } if (recents.length >= 40) break;
  }
  const m = x => !q || foodScore(x.name, q) >= 0;
  const cats = $('#fcats');
  if (cats) cats.innerHTML = q ? '' : [...((S.customFoods || []).length ? ['Eigene'] : []), ...Object.keys(FOOD_CATS)].map(c => `<button class="chip ${FC.cat === c ? 'on' : ''}" data-act="foodCat" data-c="${esc(c)}">${c}</button>`).join('');
  let list;
  if (!q && FC.cat) list = foodAll().filter(x => (FC.cat === 'Eigene' ? x.own : x.cat === FC.cat)).map(x => ({ ...x, kind: 'per100', tag: x.own ? '★ Eigenes · pro 100 g' : 'pro 100 g' }));
  else list = [
    ...S.favFoods.filter(m).map(x => ({ ...x, kind: 'abs', tag: '★' })),
    ...recents.filter(m).slice(0, q ? 10 : 8).map(x => ({ ...x, kind: 'abs', tag: 'Zuletzt' })),
    ...(q ? S.recipes.filter(m).map(r => ({ ...perPortion(r), name: r.name, kind: 'recipe', rid: r.id, tag: 'Rezept · pro Portion' })) : []),
    ...(q ? foodSearch(q, foodAll()).slice(0, 40).map(x => ({ ...x, kind: 'per100', tag: `${x.own ? '★ Eigenes' : x.cat} · pro 100 g` })) : []),
  ];
  FC.list = list;
  box.innerHTML = list.length ? `${!q && FC.cat ? `<h3 style="margin-top:4px">${esc(FC.cat)} · ${list.length}</h3>` : ''}<div class="list">${list.map((x, i) => `<div class="item tap" data-act="pickFood" data-i="${i}">
    <div class="t"><b>${esc(x.name)}</b><span>${x.tag} · ${fmt(x.kcal)} kcal · P ${fmt(x.p)} · K ${fmt(x.c)} · F ${fmt(x.f)}</span></div>
    ${x.id && x.tag === '★' ? `<button class="x" data-act="delFav" data-id="${x.id}">×</button>` : ''}<span class="muted">${x.kind === 'abs' ? '+' : '›'}</span></div>`).join('')}</div>`
    : `<div class="empty small">${q ? `Nichts gefunden.<br>Leg es einmal mit den Werten vom Etikett an – danach findest du es immer sofort.<br><button class="btn sm" style="margin-top:10px" data-act="cfFromName">+ „${esc(q)}“ anlegen</button>` : `Suche unter ${foodAll().length} Lebensmitteln oder stöbere in den Kategorien. Zuletzt Gegessenes erscheint hier für 1-Tap-Logging.`}</div>`;
}
function renderAmount() {
  const x = FC.picked, g0 = x.portion?.g || 100;
  $('#foodBody').innerHTML = `<div class="card"><b>${esc(x.name)}</b><div class="small muted">pro 100 g: ${fmt(x.kcal)} kcal · P ${fmt(x.p, 1)} · K ${fmt(x.c, 1)} · F ${fmt(x.f, 1)}</div></div>
    <label class="f"><span>Menge (g / ml)</span><input id="fa_g" inputmode="decimal" value="${g0}"></label>
    <div class="row" style="margin-bottom:10px">${x.portion ? `<button class="btn sm" data-act="setAmt" data-g="${x.portion.g}">${esc(x.portion.l)} (${x.portion.g} g)</button>` : ''}
      ${[50, 100, 150, 200].map(g => `<button class="btn sm" data-act="setAmt" data-g="${g}">${g} g</button>`).join('')}</div>
    <div class="card" id="fa_prev"></div>
    <div class="rep-box">${repDaysHtml(FC.rep || [])}</div>
    <div class="sheet-actions"><button class="btn" data-act="foodBack">Zurück</button><button class="btn primary" data-act="addAmount">Hinzufügen</button></div>`;
  updateAmountPreview();
}
function repDaysHtml(days, title = 'Regelmäßig einplanen (optional)') {
  return `<div class="fl"><span>${title}</span><div class="wd-chips">${WD_ORDER.map(d => `<button class="chip ${days.includes(d) ? 'on' : ''}" data-act="repDay" data-d="${d}">${WD_SHORT[d]}</button>`).join('')}</div>
    <div class="row" style="gap:6px;margin-top:8px">${[['all', 'Täglich'], ['wk', 'Mo–Fr'], ['we', 'Wochenende'], ['none', 'Keine']].map(([k, l]) => `<button class="btn sm ghost" data-act="repPreset" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="small muted" id="rep_hint" style="margin-top:6px">${days.length ? `${daysTxt(days)} – wird automatisch als geplant eingetragen.` : 'Wähle Wochentage, dann trägt sich das automatisch ein.'}</div></div>`;
}
function repRefresh(el, days) {
  const box = el.closest('.fl')?.parentElement || el.closest('.rep-box');
  box.querySelectorAll('[data-act=repDay]').forEach(c => c.classList.toggle('on', days.includes(+c.dataset.d)));
  const h = box.querySelector('#rep_hint'); if (h) h.textContent = days.length ? `${daysTxt(days)} – wird automatisch eingetragen.` : 'Keine Wochentage gewählt.';
}
function updateAmountPreview() {
  const x = FC.picked, g = num($('#fa_g')?.value) || 0, k = g / 100;
  const el = $('#fa_prev'); if (el) el.innerHTML = `<div class="grid2"><div class="stat"><b>${fmt(x.kcal * k)} kcal</b><span>${fmt(g)} g</span></div>
    <div class="stat"><b style="font-size:14px">P ${fmt(x.p * k)} · K ${fmt(x.c * k)} · F ${fmt(x.f * k)}</b><span>Makros (g)</span></div></div>`;
}
// Regel aus einem Eintrag; der Eintrag zählt als Vorkommen für seinen Tag (keine Doppelung)
function makeRecurring(f, days, meal, mode) {
  const r = { id: uid(), name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, g: f.g || null, days: [...days], meal: meal || f.meal, mode: mode || 'plan' };
  (S.recurring ||= []).push(r);
  if (f.date >= today() && days.includes(parseYmd(f.date).getDay())) { f.recId = r.id; ((S.recApplied ||= {})[f.date] ||= []).push(r.id); }
  return r;
}
function addFoodEntry(x) {
  const e = { id: uid(), date: FC.date, meal: FC.meal, name: x.name, kcal: +x.kcal || 0, p: +x.p || 0, c: +x.c || 0, f: +x.f || 0, g: x.g || null, ts: Date.now() };
  pushFood(e, FC.plan);
  if (FC.rep?.length) { const r = makeRecurring(S.foods.at(-1), FC.rep, FC.meal, 'plan'); FC.rep = []; save(); render(); return toast(`${x.name} · ${daysTxt(r.days)} eingeplant`); }
  save(); render(); toast(`${FC.plan ? '📋 Geplant' : '✓'} ${x.name} (${fmt(x.kcal)} kcal)`);
}
/* ---- Nährwerttabelle scannen: Texterkennung offline auf dem Gerät (tesseract.js in vendor/ocr) ---- */
let OCR_LIB = null;
const ocrUrl = p => new URL('vendor/ocr/' + p, location.href).href;
function ocrLoadLib() {
  if (window.Tesseract) return Promise.resolve();
  return OCR_LIB ||= new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = ocrUrl('tesseract.min.js');
    s.onload = ok; s.onerror = () => { OCR_LIB = null; fail(new Error('OCR nicht geladen')); };
    document.head.appendChild(s);
  });
}
async function ocrPrep(file) { // verkleinern, Graustufen, Kontrast strecken
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data, hist = new Uint32Array(256), n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0; d[i] = y; hist[y]++; }
  let lo = 0, hi = 255, acc = 0; while (lo < 255 && (acc += hist[lo]) < n * 0.01) lo++; acc = 0; while (hi > 0 && (acc += hist[hi]) < n * 0.01) hi--;
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) { const v = Math.max(0, Math.min(255, (d[i] - lo) * 255 / span)); d[i] = d[i + 1] = d[i + 2] = v; }
  g.putImageData(im, 0, 0);
  return c;
}
const ocrSay = h => { const el = $('#cf_ocr'); if (el) el.innerHTML = h; };
async function ocrScan(file) {
  ocrSay('Bereite Foto vor …');
  let w = null;
  try {
    const [img] = await Promise.all([ocrPrep(file), ocrLoadLib()]);
    ocrSay('Texterkennung startet … <span class="muted">(beim ersten Mal wird sie geladen)</span>');
    w = await Tesseract.createWorker('deu', 1, {
      workerPath: ocrUrl('worker.min.js'), corePath: ocrUrl('core'), langPath: ocrUrl('lang'),
      logger: m => { if (m.status === 'recognizing text') ocrSay(`Lese Tabelle … ${Math.round(m.progress * 100)} %`); },
    });
    await w.setParameters({ tessedit_pageseg_mode: String(window.OCR_PSM || 6), preserve_interword_spaces: '1' });
    const { data } = await w.recognize(img);
    window.OCR_LAST = data.text;
    ocrApply(data.text);
  } catch (e) {
    ocrSay('⚠ Das hat nicht geklappt. Probier ein schärferes, gerades Foto – oder füge den Text ein.');
  } finally { w?.terminate(); }
}
// Liest kcal, Fett, Kohlenhydrate und Eiweiß (pro 100 g = erste Spalte) aus dem Text einer Nährwerttabelle
function parseLabel(raw) {
  const low = s => s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
  const lines = String(raw || '').replace(/\r/g, '').split('\n').map(l => low(l).replace(/[|©®"'`*_]/g, ' ').replace(/(\d)\s*[,.]\s*(\d)/g, '$1,$2').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const all = lines.join('\n');
  const toN = s => parseFloat(String(s).replace(',', '.'));
  // Zahlen-Token einer Zeile; „g“ wird von der Texterkennung oft als „9“ gelesen → mehrere Lesarten
  const tokens = s => [...s.replace(/(^|\s)o(?=,\d)/g, '$10').matchAll(/(\d{1,4}(?:,\d{1,3})?)(\s*g\b)?/g)].map(m => ({ t: m[1], g: !!m[2] }));
  const reads = tok => {
    const t = tok.t, alt = [];
    if (/,\d9$/.test(t)) alt.push(toN(t.slice(0, -1)));                                      // 7,09 → 7,0
    else if (!t.includes(',') && /.9$/.test(t)) { const s = t.slice(0, -1); alt.push(toN(s)); if (s.length >= 2) alt.push(toN(s.slice(0, -1) + ',' + s.slice(-1))); } // 459 → 45 / 4,5
    const out = tok.g ? [toN(t), ...alt] : [...alt, toN(t)];                                  // mit „g“ zuerst wörtlich (179g → 17 als Ausweichlesart)
    return [...new Set(out)].filter(x => x <= 100);
  };
  const find = (re, not) => { // erste Zahl hinter dem Begriff = Spalte „pro 100 g“
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], m = l.match(re); if (!m || (not && not.test(l))) continue;
      let tk = tokens(l.slice(m.index + m[0].length))[0];
      if (!tk && lines[i + 1] && /^<?\s*\d/.test(lines[i + 1])) tk = tokens(lines[i + 1])[0];
      const rs = tk ? reads(tk) : [];
      if (rs.length) return rs;
    }
    return null;
  };
  // Energie: „362 kcal“; sonst kJ/kcal-Paar im Brennwert-Zeile; sonst kJ ÷ 4,184
  let kcal = null, m = all.match(/(\d{1,4}(?:,\d)?)\s*k\s?c\s?a\s?l/);
  if (m) kcal = toN(m[1]);
  if (kcal == null) for (const l of lines) {
    if (!/brennwert|energie|energy|kcal|kj/.test(l)) continue;
    const ns = (l.match(/\d{1,4}(?:,\d)?/g) || []).map(toN);
    for (let i = 0; i + 1 < ns.length && kcal == null; i++) if (ns[i] / ns[i + 1] > 4.0 && ns[i] / ns[i + 1] < 4.35) kcal = ns[i + 1];
    if (kcal != null) break;
    const kj = l.match(/(\d{2,4})\s*kj/); if (kj) { kcal = Math.round(toN(kj[1]) / 4.184); break; }
  }
  if (kcal != null && kcal > 950) kcal = null;
  const NOT = /^[-–\s]*(davon|of which|dont)/;
  const F = find(/(^|\s)(fett|fat|lipides?)\b/, NOT);
  const C = find(/kohlen\s?hydrat|carbo\s?hydrat|glucides/, NOT);
  const Pr = find(/(^|\s)(e[il1]?we[il1][sb8]|protein)/);
  // beste Kombination der Lesarten: passt am besten zu den Kalorien (4/4/9), sonst die wahrscheinlichste Lesart
  let best = null;
  for (const [fi, f] of (F || [null]).entries()) for (const [ci, c] of (C || [null]).entries()) for (const [pi, p] of (Pr || [null]).entries()) {
    let sc = 0.02 * (fi + ci + pi);
    if ((f || 0) + (c || 0) + (p || 0) > 100) sc += 10;
    if (kcal != null && f != null && c != null && p != null) sc += Math.abs(kcal - (4 * p + 4 * c + 9 * f)) / Math.max(kcal, 50);
    if (!best || sc < best.sc) best = { sc, f, c, p };
  }
  const r = { kcal, f: best.f, c: best.c, p: best.p };
  r.n = ['kcal', 'f', 'c', 'p'].filter(k => r[k] != null).length;
  if (r.kcal == null && r.f != null && r.c != null && r.p != null) { r.kcal = Math.round(4 * r.p + 4 * r.c + 9 * r.f); r.est = true; }
  const pm = all.match(/(portion|serving|riegel|stuck|flasche|becher|scheibe|packung|dose|glas|beutel)\s*[(=:]?\s*(?:a\s)?(\d{1,4}(?:,\d)?)\s*(g|9|ml)\b/);
  if (pm && toN(pm[2]) > 0 && toN(pm[2]) <= 2000) { const w = { serving: 'portion', stuck: 'Stück' }[pm[1]] || pm[1]; r.portion = { l: '1 ' + w[0].toUpperCase() + w.slice(1), g: toN(pm[2]), u: pm[3] === 'ml' ? 'ml' : 'g' }; }
  return r;
}
function ocrApply(text) {
  const r = parseLabel(text);
  if (!r.n) return ocrSay('⚠ Keine Nährwerte erkannt. Fotografiere die Tabelle gerade und formatfüllend – oder füge den Text ein.');
  CF.basis = '100'; $$('#cf_basis button').forEach(b => b.classList.toggle('on', b.dataset.b === '100'));
  const dec = v => String(Math.round(v * 10) / 10).replace('.', ',');
  for (const [k, id] of [['kcal', 'cf_kcal'], ['p', 'cf_p'], ['c', 'cf_c'], ['f', 'cf_f']]) {
    const el = $('#' + id); if (!el || r[k] == null) continue;
    el.value = dec(r[k]); el.classList.remove('ocr-hit'); void el.offsetWidth; el.classList.add('ocr-hit');
  }
  if (r.portion && $('#cf_pg') && ['', '100'].includes($('#cf_pg').value.trim()) && ['', '1 Portion'].includes($('#cf_pl').value.trim())) {
    $('#cf_pg').value = String(r.portion.g).replace('.', ','); $('#cf_pl').value = r.portion.l;
    for (const id of ['cf_pg', 'cf_pl']) { const el = $('#' + id); el.classList.remove('ocr-hit'); void el.offsetWidth; el.classList.add('ocr-hit'); }
  }
  const at = r.p != null && r.c != null && r.f != null ? 4 * r.p + 4 * r.c + 9 * r.f : null;
  const ok = at != null && r.kcal != null && !r.est && Math.abs(r.kcal - at) <= Math.max(20, r.kcal * 0.12);
  const miss = [['kcal', 'Kalorien'], ['f', 'Fett'], ['c', 'Kohlenhydrate'], ['p', 'Eiweiß']].filter(([k]) => r[k] == null).map(([, l]) => l);
  ocrSay(`<b style="color:var(--text)">Erkannt pro 100 g:</b> ${r.kcal != null ? fmt(r.kcal) + ' kcal' : '–'} · F ${r.f != null ? dec(r.f) : '–'} · KH ${r.c != null ? dec(r.c) : '–'} · E ${r.p != null ? dec(r.p) : '–'}${r.portion ? ` · Portion ${esc(r.portion.l)} = ${dec(r.portion.g)} ${r.portion.u}` : ''}<br>
    ${ok ? '<span style="color:var(--ok)">✓ Werte passen zusammen</span> – kurz prüfen, Name eintragen, fertig.' : miss.length ? `⚠ Nicht erkannt: ${miss.join(', ')} – bitte ergänzen.` : r.est ? '⚠ Kalorien aus den Makros berechnet – bitte prüfen.' : '⚠ Werte passen nicht ganz zusammen – bitte mit dem Etikett vergleichen.'}`);
  if (!$('#cf_name')?.value) $('#cf_name')?.focus({ preventScroll: true });
}

/* ---- Übungen ---- */
function exercisePicker() { exLibrary('workout'); }
function renderExPicker() {
  const q = ($('#exq')?.value || '').toLowerCase();
  $('#exres').innerHTML = `<div class="list">${S.exercises.filter(e => !q || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q) || (e.pm || []).some(m => mName(m).toLowerCase().includes(q)))
    .sort((a, b) => a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name))
    .map(e => `<div class="item tap" data-act="pickExercise" data-id="${e.id}"><div class="t"><b>${esc(e.name)}</b><span>${(e.pm || []).map(mName).join(', ') || esc(e.muscle)}</span></div><span class="muted">+</span></div>`).join('')}</div>`;
}
function exerciseSheet(id) {
  const ex = exById(id); if (!ex) return;
  const h = exHistory(id), s = suggest(ex);
  const best = bestSet(h.flatMap(x => x.sets));
  openSheet(`<div class="card-head"><h2 style="margin:0">${esc(ex.name)}</h2><button class="btn sm" data-act="editExercise" data-id="${ex.id}">✎ Bearbeiten</button></div>
    <div class="small muted" style="margin-bottom:10px">${muscleText(ex)} · ${ex.sets} Sätze × ${RR(ex).min}–${RR(ex).max} Wdh · Steigern ab ${RR(ex).up} Wdh · +${fmt(ex.inc, 2)} kg · Pause ${mmss(ex.rest)}</div>
    ${ex.note ? `<div class="small" style="margin-bottom:8px"><span class="muted">Notiz:</span> ${esc(ex.note)}</div>` : ''}
    <span class="label">Nächstes Training</span>${progBox(s)}<div class="small muted" style="margin:-4px 0 8px">${s.text}</div>
    <div class="grid3" style="margin:10px 0">
      <div class="stat"><b>${best ? fmt(best.w, 2) + '×' + best.r : '–'}</b><span>Bester Satz</span></div>
      <div class="stat"><b>${best?.w ? fmt(e1rm(best.w, best.r), 1) : '–'}</b><span>e1RM (kg)</span></div>
      <div class="stat"><b>${h.length}</b><span>Einheiten</span></div>
    </div>
    <h3>Fortschritt</h3>
    <div id="exProg">${exProgHtml(id)}</div>
    <h3>Verlauf</h3>
    ${h.length ? `<div class="list">${h.slice(0, 15).map(x => `<div class="item"><div class="t"><b>${fmtDate(x.date, { weekday: 'short', day: '2-digit', month: '2-digit' })}</b>
      <span>${x.sets.map(z => `${fmt(z.w, 2)}×${z.r}`).join(' · ')}</span></div></div>`).join('')}</div>` : '<div class="empty small">Noch nicht trainiert.</div>'}
    <div class="sheet-actions"><button class="btn" data-act="closeSheet">Schließen</button></div>`);
}
function exerciseEditSheet(id, fromPicker) {
  const ex = exById(id) || { name: '', muscle: 'Brust', repMin: 8, repMax: 12, inc: 2.5, sets: 3, rest: 90, barbell: false, start: 20, pm: [], sm: [], ownRange: false };
  EC = { pm: new Set(ex.pm || []), sm: new Set(ex.sm || []) };
  openSheet(`<h2>${id ? 'Übung bearbeiten' : 'Neue Übung'}</h2>
    <label class="f"><span>Name</span><input id="e_name" value="${esc(ex.name)}"></label>
    <div class="fl"><span>Hauptmuskeln (zählen 1 Satz)</span><div class="chips" id="em_pm"></div></div>
    <div class="fl"><span>Hilfsmuskeln (zählen ½ Satz)</span><div class="chips" id="em_sm"></div></div>
    <label class="f"><span>Gerät</span><select id="e_eq">${Object.entries(EQ).map(([k, l]) => `<option value="${k}" ${(ex.eq || 'other') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="grid2">
      <label class="f"><span>Ziel-Sätze</span><input id="e_sets" inputmode="numeric" value="${ex.sets}"></label>
      <label class="f"><span>Steigerung (kg)</span><input id="e_inc" inputmode="decimal" value="${ex.inc}"></label>
      <label class="f"><span>Pause (Sek.)</span><input id="e_rest" inputmode="numeric" value="${ex.rest}"></label>
      <label class="f"><span>Startgewicht (kg)</span><input id="e_start" inputmode="decimal" value="${ex.start}"></label>
      <label class="f row" style="margin-top:22px"><input type="checkbox" id="e_barbell" ${ex.barbell ? 'checked' : ''}> <span style="display:inline;margin:0">Langhantel</span></label>
    </div>
    <label class="row" style="margin:4px 0 10px"><input type="checkbox" id="e_own" ${ex.ownRange ? 'checked' : ''}> <span>Eigener Wdh-Bereich für diese Übung <span class="muted">(sonst ${S.settings.prog.min}–${S.settings.prog.max}, steigern ab ${S.settings.prog.up} – aus den Einstellungen)</span></span></label>
    <div class="grid3 ${ex.ownRange ? '' : 'hidden'}" id="e_range">
      <label class="f"><span>Wdh. von</span><input id="e_repMin" inputmode="numeric" value="${ex.ownRange ? ex.repMin : S.settings.prog.min}"></label>
      <label class="f"><span>Wdh. bis</span><input id="e_repMax" inputmode="numeric" value="${ex.ownRange ? ex.repMax : S.settings.prog.max}"></label>
      <label class="f"><span>Steigern ab</span><input id="e_upAt" inputmode="numeric" value="${ex.ownRange ? ex.upAt || ex.repMax : S.settings.prog.up}"></label>
    </div>
    <div class="small muted">So funktioniert die Progression: Schaffst du in <b>allen</b> Sätzen die Steiger-Wdh., gibt's beim nächsten Mal mehr Gewicht (+ Steigerung) und du startest wieder unten im Bereich. Sonst peilst du je Satz +1 Wdh. an. Es geht immer vorwärts – kein Deload.</div>
    <div class="sheet-actions">${id && !exHistory(id).length && !S.routines.some(r => r.exIds.includes(id)) ? `<button class="btn danger" data-act="delExercise" data-id="${id}">Löschen</button>` : ''}
      <button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="saveExercise" data-id="${id || ''}" data-pick="${fromPicker ? 1 : ''}">Speichern</button></div>`);
  emChips();
}

/* ---- Pläne ---- */
let RC = null;
function routineSheet(id, back) {
  const r = S.routines.find(x => x.id === id);
  RC = { id: r?.id || null, name: r?.name || '', exIds: r ? [...r.exIds] : [], sets: { ...(r?.sets || {}) }, warm: { ...(r?.warm || {}) }, back: back || null };
  renderRoutineSheet();
}
function renderRoutineSheet(keep) {
  const name = $('#r_name')?.value ?? RC.name; RC.name = name;
  const vol = emptyVol();
  RC.exIds.forEach(id => { const ex = exById(id); if (ex) addVol(vol, ex, RC.sets[id] ?? ex.sets); });
  const top = Object.entries(vol).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const scroll = keep ? $('#sheet .sheet-panel').scrollTop : 0;
  openSheet(`<h2>${RC.id ? 'Trainingstag bearbeiten' : 'Neuer Trainingstag'}</h2>
    <label class="f"><span>Name</span><input id="r_name" value="${esc(RC.name)}" placeholder="z.B. Oberkörper A"></label>
    <h3>Übungen & Sätze</h3>
    ${RC.exIds.length ? `<div class="list">${RC.exIds.map((id, i) => { const ex = exById(id), n = RC.sets[id] ?? ex?.sets ?? 3; return `<div class="item">
      <div class="t"><b>${i + 1}. ${esc(ex?.name || '?')}</b><span>${(ex?.pm || []).map(mName).join(', ')}</span></div>
      <button class="wbtn ${RC.warm?.[id] ? 'on' : ''}" data-act="rWarm" data-i="${i}" aria-label="Aufwärmsätze">W</button>
      <div class="stepper"><button data-act="rSets" data-i="${i}" data-d="-1">−</button><b>${n}</b><button data-act="rSets" data-i="${i}" data-d="1">+</button></div>
      ${i ? `<button class="x" data-act="rMove" data-i="${i}">↑</button>` : ''}<button class="x" data-act="rDel" data-i="${i}">×</button></div>`; }).join('')}</div>` : '<div class="empty small">Noch keine Übungen.</div>'}
    ${RC.exIds.length ? '<div class="small muted" style="margin-top:8px"><b style="color:var(--accent)">W</b> = startet automatisch mit Aufwärmsätzen (Rampe zum Arbeitsgewicht).</div>' : ''}
    <button class="btn block" style="margin-top:12px" data-act="rAddLib">+ Übung aus der Bibliothek</button>
    ${top.length ? `<h3>Volumen dieses Tages (Sätze)</h3><div class="chips">${top.map(([m, v]) => `<span class="chip">${mName(m)} ${fmt(v, 1)}</span>`).join('')}</div>` : ''}
    <div class="sheet-actions">${RC.id ? '<button class="btn danger" data-act="delRoutine">Löschen</button>' : ''}<button class="btn" data-act="${RC.back ? 'rBack' : 'closeSheet'}">${RC.back ? '‹ Zurück' : 'Abbrechen'}</button><button class="btn primary" data-act="saveRoutine">Speichern</button></div>`);
  $('#sheet .sheet-panel').scrollTop = scroll;
}

function workoutSheet(id) {
  const w = S.workouts.find(x => x.id === id); if (!w) return;
  const vol = w.entries.reduce((a, e) => a + WK(e.sets).reduce((b, s) => b + (s.w || 0) * s.r, 0), 0);
  openSheet(`<h2>${esc(w.name)}</h2>
    <div class="small muted">${fmtDate(w.date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · ${mmss((w.end - w.start) / 1000)} · ${fmt(vol)} kg Volumen</div>
    ${w.entries.map(e => `<h3>${esc(exById(e.exId)?.name || 'Gelöschte Übung')}</h3><div class="small">${e.sets.map((s, i) => `${s.type ? setLabel(s, 0) : workIdx(e, i) + 1}. ${fmt(s.w, 2)} kg × ${s.r}${s.type === 'warm' ? ' <span class="muted">· Aufwärmen</span>' : s.type ? ` <span class="muted">· ${SET_TYPE_NAME[s.type]}</span>` : ''}`).join('<br>')}</div>`).join('')}
    <div class="sheet-actions"><button class="btn danger" data-act="delWorkout" data-id="${w.id}">Löschen</button><button class="btn" data-act="shareWorkout" data-id="${w.id}">Teilen</button><button class="btn" data-act="closeSheet">Schließen</button></div>`);
}

function finishWorkout() {
  const a = S.active;
  const entries = a.entries.map(e => ({ exId: e.exId, target: WK(e.sets).length, sets: e.sets.filter(s => s.done && s.r > 0).map(s => ({ w: s.w || 0, r: s.r, ...(s.type ? { type: s.type } : {}) })) })).filter(e => e.sets.length);
  if (!entries.length) {
    if (confirm('Du hast noch keinen Satz abgehakt. Training verwerfen?')) { S.active = null; UI.rest = null; save(); render(); }
    return;
  }
  const open = a.entries.reduce((n, e) => n + e.sets.filter(s => !s.done).length, 0);
  if (open && !confirm(`${open} Sätze sind nicht abgehakt und werden nicht gespeichert. Trotzdem beenden?`)) return;
  // PRs prüfen (vor dem Speichern)
  const prs = [];
  for (const e of entries) {
    if (!WK(e.sets).length) continue;
    const prev = bestSet(exHistory(e.exId).flatMap(x => x.sets)), now = bestSet(WK(e.sets));
    if (!prev || setScore(now) > setScore(prev) + 1e-6) prs.push({ ex: exById(e.exId), now, first: !prev });
  }
  const w = { id: a.id, name: a.name, routineId: a.routineId, date: a.date, start: a.start, end: Date.now(), entries };
  S.workouts.push(w); S.active = null; UI.rest = null; save();
  const vol = entries.reduce((s, e) => s + WK(e.sets).reduce((b, x) => b + x.w * x.r, 0), 0);
  const ups = entries.map(e => ({ ex: exById(e.exId) })).filter(x => x.ex).map(x => ({ ...x, s: suggest(x.ex) }));
  render();
  openSheet(`<div style="text-align:center"><div style="color:var(--accent);margin:6px 0 10px">${ic('trophy').replace('class="ic ', 'style="width:44px;height:44px" class="ic ')}</div><h2>Starkes Training</h2>
    <div class="grid3" style="margin:12px 0"><div class="stat"><b>${mmss((w.end - w.start) / 1000)}</b><span>Dauer</span></div>
    <div class="stat"><b>${entries.reduce((n, e) => n + WK(e.sets).length, 0)}</b><span>Sätze</span></div><div class="stat"><b>${fmt(vol)}</b><span>kg Volumen</span></div></div></div>
    ${prs.filter(p => !p.first).length ? `<h3>Neue Bestleistungen</h3><ul class="prlist">${prs.filter(p => !p.first).map(p => `<li><b>${esc(p.ex?.name)}</b>: ${fmt(p.now.w, 2)} kg × ${p.now.r}${p.now.w ? ` (e1RM ${fmt(e1rm(p.now.w, p.now.r), 1)} kg)` : ''}</li>`).join('')}</ul>` : ''}
    ${ups.length ? `<h3>Nächstes Mal</h3><div class="list next-list">${ups.map(x => `<div class="item"><div class="t"><b>${esc(x.ex.name)}</b><span>${x.s.bw && !x.s.w ? 'KG' : fmt(x.s.w, 2) + ' kg'} · ${repsTxt(x.s.reps)}</span></div><span class="pill ${x.s.status === 'up' ? 'up' : ''}">${x.s.status === 'up' ? '⬆ ' : ''}${x.s.badge}</span></div>`).join('')}</div>` : ''}
    <div class="sheet-actions"><button class="btn" data-act="shareWorkout" data-id="${w.id}">Teilen</button><button class="btn primary" data-act="closeSheet">Stark</button></div>`);
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
    if (document.hidden) notify('Pause vorbei!', 'Nächster Satz – los geht\'s');
    else if (!GM) toast('Pause vorbei – nächster Satz!');
    gymRestEnded();
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
  notify('Zeit zum Wiegen!', 'Dein wöchentlicher Check-in steht an. Kurz wiegen und eintragen.');
}
function downloadIcs() {
  const st = S.settings, [hh, mm] = st.weighTime.split(':');
  const first = nextWeighSlot(), lastSlot = lastWeighSlot();
  const start = weighDue() ? first : (lastSlot > new Date() ? lastSlot : first);
  const dt = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${hh}${mm}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DutyFirst//DE', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:weighin-${uid()}@dutyfirst`, `DTSTAMP:${stamp}`, `DTSTART:${dt}`, 'DURATION:PT10M',
    `RRULE:FREQ=WEEKLY;BYDAY=${DAY_ICS[st.weighDay]}`, 'SUMMARY:Wiegen – Duty First',
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
  applyUpdate,
  fcPlan: el => { FC.plan = el.dataset.v === '1'; $$('#fcPlan button').forEach(b => b.classList.toggle('on', b.dataset.v === el.dataset.v)); },
  fcMeal: el => { FC.meal = el.dataset.k; $$('#fcMeals .chip').forEach(c => c.classList.toggle('on', c.dataset.k === FC.meal)); },
  mealsSheet: () => mealsSheet(),
  msPreset: el => { MS = presetMeals(+el.dataset.k); renderMealsSheet(); },
  msUp: el => { syncMS(); const i = +el.dataset.i; [MS[i - 1], MS[i]] = [MS[i], MS[i - 1]]; renderMealsSheet(); },
  msDel: el => { syncMS(); MS.splice(+el.dataset.i, 1); renderMealsSheet(); },
  msAdd: () => { syncMS(); MS.push({ id: 'm_' + uid(), name: 'Neue Mahlzeit' }); renderMealsSheet(); setTimeout(() => { const l = $$('[data-ms]').at(-1); l?.focus(); l?.select(); }, 50); },
  msSave: () => {
    syncMS();
    const list = MS.map(m => ({ id: m.id, name: m.name.trim() || MEAL_BASE[m.id] || 'Mahlzeit' }));
    if (!list.length) return toast('Mindestens eine Mahlzeit');
    S.settings.meals = list; save(); applyMeals(); closeSheet(); render(); toast(`✓ ${list.length} Mahlzeiten pro Tag`);
  },
  // Satz-Typen & Aufwärmen
  setType: el => {
    const e = S.active.entries[+el.dataset.e], x = e.sets[+el.dataset.s];
    const nt = SET_TYPES[(SET_TYPES.indexOf(x.type || '') + 1) % SET_TYPES.length];
    if (nt) x.type = nt; else delete x.type;
    save(); render(); toast(SET_TYPE_NAME[nt]);
  },
  addWarmup: el => {
    const e = S.active.entries[+el.dataset.e], ex = exById(e.exId);
    if (e.sets.some(x => x.type === 'warm')) { e.sets = e.sets.filter(x => x.type !== 'warm' || x.done); save(); render(); return; }
    const ws = warmupSets(ex, e.sets.find(x => x.type !== 'warm')?.w);
    if (!ws.length) return toast('Kein Arbeitsgewicht – erst Gewicht eintragen');
    e.sets.unshift(...ws); save(); render(); toast(`${ws.length} Aufwärmsätze eingeplant`);
  },
  rWarm: el => { const id = RC.exIds[+el.dataset.i]; RC.warm ||= {}; RC.warm[id] = !RC.warm[id]; renderRoutineSheet(true); },
  // Was passt noch?
  fitSheet: () => fitSheet(),
  fitAdd: el => {
    const c = FIT[+el.dataset.i]; if (!c) return;
    const date = UI.tab === 'food' ? UI.foodDate : today(), h = new Date().getHours();
    const meal = fitMeal(c.kind !== 'food' && c.r.meal === 'breakfast' ? 'breakfast' : c.kind !== 'food' && c.r.meal === 'snack' ? 'snack' : date !== today() ? 'dinner' : autoMeal());
    const name = c.kind === 'food' ? c.name : c.name + (c.q !== 1 ? ` (${fmt(c.q, 2)} Port.)` : '');
    const g = c.kind === 'food' ? c.g * c.q : Math.round((c.kind === 'idea' ? ideaPer(c.r).g : perPortion(c.r).g) * c.q) || null;
    pushFood({ id: uid(), date, meal, name, kcal: c.kcal, p: c.p, c: c.c, f: c.f, g, ts: Date.now() });
    save(); render(); if (sheetOpen() && $('#sheet h2')?.textContent === 'Was passt noch?') fitSheet();
    toast(`✓ ${name} · ${fmt(c.kcal)} kcal`);
  },
  // Wochenplan
  wpCreate: () => {
    S.weekPlan = genWeekPlan(ID.pgoal, ID.kcal, (S.weekPlan?.seed || Date.now() % 100000) + 7);
    save(); renderIdeas(true); toast('✓ Wochenplan erstellt');
  },
  wpSwap: el => {
    const plan = wpCurrent(); if (!plan) return;
    const d = +el.dataset.d, j = +el.dataset.m, [meal, cur] = plan.days[d].meals[j];
    const type = meal === 'lunch' || meal === 'dinner' ? 'main' : meal;
    const pool = wpPool(plan.goal, type), used = plan.days[d].meals.map(m => m[1]);
    const idx = pool.findIndex(r => r.id === cur);
    for (let t = 1; t <= pool.length; t++) { const r = pool[(idx + t) % pool.length]; if (!used.includes(r.id)) { plan.days[d].meals[j] = [meal, r.id]; break; } }
    save(); renderIdeas(true);
  },
  wpLog: el => { wpLogDay(+el.dataset.d); render(); renderIdeas(true); },
  wpLogToday: () => { wpLogDay((new Date().getDay() + 6) % 7); UI.tab = 'food'; UI.foodDate = today(); render(); window.scrollTo(0, 0); },
  wpShop: () => {
    const plan = wpCurrent(); if (!plan) return;
    plan.days.forEach((_, i) => wpDay(plan, i).meals.forEach(m => addToShopping(ingredientsOf({ portions: m.r.portions, items: ideaItems(m.r) }, m.portions))));
    save(); toast('✓ Zutaten für die ganze Woche auf der Einkaufsliste');
  },
  wpPrep: () => {
    const plan = wpCurrent(); if (!plan) return;
    let n = 0;
    for (const x of wpPrep(plan)) {
      let rec = S.recipes.find(r => r.src === x.r.id);
      if (!rec) { rec = { id: uid(), src: x.r.id, name: x.r.name, portions: x.r.portions, items: ideaItems(x.r) }; S.recipes.push(rec); }
      const portions = Math.max(1, Math.ceil(x.portions));
      S.prep.push({ id: uid(), rid: rec.id, portions, left: portions, status: 'planned', date: today() }); n++;
    }
    save(); render(); toast(`✓ ${n} Gericht${n === 1 ? '' : 'e'} im Meal-Prep eingeplant`);
  },
  // Eigene Lebensmittel
  newCustomFood: () => customFoodSheet(null, null, $('#foodBody') ? 'food' : null),
  editCustomFood: el => customFoodSheet(el.dataset.id),
  cfBasis: el => { CF.basis = el.dataset.b; $$('#cf_basis button').forEach(b => b.classList.toggle('on', b.dataset.b === CF.basis)); },
  cfBack: () => { const meal = FC?.meal, date = FC?.date; foodSheet(meal); if (date) FC.date = date; },
  cfScanNew: () => { customFoodSheet(null, null, 'food'); $('#labelFile').click(); },
  ocrPick: () => $('#labelFile').click(),
  ocrPaste: () => { ocrSay(`<textarea id="cf_ocrtxt" rows="6" placeholder="Text der Nährwerttabelle hier einfügen.&#10;iPhone: Foto in der Fotos-App öffnen, Text gedrückt halten → Alle auswählen → Kopieren."></textarea><button class="btn sm" style="margin-top:8px" data-act="ocrParse">Werte übernehmen</button>`); $('#cf_ocrtxt')?.focus(); },
  ocrParse: () => ocrApply($('#cf_ocrtxt')?.value || ''),
  cfFromName: () => customFoodSheet(null, { name: ($('#fq')?.value || '').trim() }, 'food'),
  saveCustomFood: () => {
    const name = $('#cf_name').value.trim(); if (!name) return toast('Name eingeben');
    const pg = Math.max(1, num($('#cf_pg').value) || 100), k = CF.basis === 'portion' ? 100 / pg : 1;
    const v = id => Math.round((num($('#' + id).value) || 0) * k * 10) / 10;
    const kcal = v('cf_kcal'); if (!kcal) return toast('Kalorien eingeben');
    const item = { name, cat: $('#cf_cat').value, kcal, p: v('cf_p'), c: v('cf_c'), f: v('cf_f'), portion: { l: $('#cf_pl').value.trim() || '1 Portion', g: pg } };
    let id = CF.id;
    if (id) Object.assign(S.customFoods.find(x => x.id === id), item); else { id = uid(); S.customFoods.push({ id, ...item }); }
    save(); toast(`✓ ${name} gespeichert`);
    if (CF.back === 'food' && FC) { const meal = FC.meal, date = FC.date; foodSheet(meal); FC.date = date; FC.picked = { ...item, id, own: true }; renderFoodBody(); }
    else { closeSheet(); render(); }
  },
  delCustomFood: el => { if (!confirm('Lebensmittel löschen?')) return; S.customFoods = S.customFoods.filter(x => x.id !== el.dataset.id); save(); closeSheet(); render(); },
  // Rezeptideen & Tagespläne
  ideas: () => ideasSheet(),
  idTab: el => { ID.tab = el.dataset.k; renderIdeas(); },
  idGoal: el => { ID.goal = el.dataset.k; renderIdeas(true); },
  idMeal: el => { ID.meal = el.dataset.k; renderIdeas(true); },
  idPGoal: el => { ID.pgoal = el.dataset.k; ID.tpl = 0; renderIdeas(true); },
  idKcal: el => { ID.kcal = +el.dataset.v; renderIdeas(true); },
  idTpl: el => { ID.tpl = +el.dataset.i; renderIdeas(true); },
  idDays: el => { ID.days = +el.dataset.d; renderIdeas(true); },
  ideaOpen: el => ideaSheet(el.dataset.id),
  ideasBack: () => (ID ? renderIdeas() : ideasSheet()),
  ideaLog: el => {
    const r = ideaById(el.dataset.id), sp = ideaPer(r), h = new Date().getHours();
    const meal = fitMeal(r.meal === 'main' ? (h < 16 ? 'lunch' : 'dinner') : r.meal);
    pushFood({ id: uid(), date: UI.tab === 'food' ? UI.foodDate : today(), meal, name: r.name, kcal: sp.kcal, p: sp.p, c: sp.c, f: sp.f, g: Math.round(sp.g) || null, ts: Date.now() });
    save(); render(); toast(`✓ ${r.name} · ${fmt(sp.kcal)} kcal · ${fmt(sp.p)} g Protein`);
  },
  ideaCopy: el => {
    const r = ideaById(el.dataset.id);
    if (S.recipes.some(x => x.src === r.id)) return toast('Ist schon in deinen Rezepten');
    S.recipes.push({ id: uid(), src: r.id, name: r.name, portions: r.portions, items: ideaItems(r) });
    save(); render(); toast(`✓ In „Meine Rezepte“ – auch für Meal-Prep nutzbar`);
  },
  ideaShop: el => { const r = ideaById(el.dataset.id); addToShopping(ideaItems(r).map(i => ({ name: i.name, g: i.g }))); save(); toast('✓ Zutaten auf der Einkaufsliste'); },
  planLog: () => {
    const plan = buildPlan(ID.pgoal, ID.tpl, ID.kcal), d = today();
    if (S.foods.some(f => f.date === d) && !confirm(`${dayLabel(d)} ist schon Essen eingetragen. Plan zusätzlich eintragen?`)) return;
    plan.meals.forEach((m, i) => { const sp = ideaPer(m.r); pushFood({ id: uid(), date: d, meal: fitMeal(m.meal), name: m.r.name + (m.portions !== 1 ? ` (${fmt(m.portions, 2)} Port.)` : ''), kcal: m.kcal, p: m.p, c: m.c, f: m.f, g: Math.round(sp.g * m.portions) || null, ts: Date.now() + i }); });
    save(); closeSheet(); UI.tab = 'food'; UI.foodDate = d; render(); window.scrollTo(0, 0);
    toast(`✓ Tagesplan eingetragen · ${fmt(plan.tot.kcal)} kcal`);
  },
  planShop: () => {
    const plan = buildPlan(ID.pgoal, ID.tpl, ID.kcal);
    plan.meals.forEach(m => addToShopping(ingredientsOf({ portions: m.r.portions, items: ideaItems(m.r) }, m.portions * ID.days)));
    save(); toast(`✓ Zutaten für ${ID.days} ${ID.days === 1 ? 'Tag' : 'Tage'} auf der Einkaufsliste`);
  },
  setAccent: el => { S.settings.accent = el.dataset.k; save(); applyAccent(); render(); },
  foodCat: el => { FC.cat = FC.cat === el.dataset.c ? null : el.dataset.c; renderFoodResults(); },
  // Bibliothek
  openLibrary: () => exLibrary('manage'),
  lbReg: el => { LB.region = el.dataset.r; LB.muscle = null; renderLib(); },
  lbMus: el => { LB.muscle = el.dataset.m || null; renderLib(); },
  lbEq: el => { LB.eq = el.dataset.k; renderLib(); },
  lbPick: el => {
    const id = el.dataset.id;
    if (LB.mode === 'workout') {
      if (!S.active) return;
      S.active.entries.push(newEntry(exById(id))); save(); closeSheet(); render();
      if (GM) { GM.ei = S.active.entries.length - 1; renderGym(); } else window.scrollTo(0, document.body.scrollHeight);
      toast(`✓ ${exById(id).name} hinzugefügt`);
    } else if (LB.mode === 'routine') {
      if (!RC.exIds.includes(id)) RC.exIds.push(id);
      renderRoutineSheet();
    } else exerciseSheet(id);
  },
  lbBack: () => renderRoutineSheet(),
  rAddLib: () => { RC.name = $('#r_name')?.value ?? RC.name; exLibrary('routine'); },
  // Gym-Modus
  gymOpen: () => gymOpen(),
  gymClose: () => gymClose(),
  gymVoice: () => {
    S.settings.gymVoice = !S.settings.gymVoice; save(); renderGym();
    if (S.settings.gymVoice) { if ('speechSynthesis' in window && localVoice()) speak('Sprachansage an'); else toast('Keine deutsche Offline-Stimme auf diesem Gerät – Ansage bleibt stumm'); }
  },
  gymGoto: el => { const i = +el.dataset.i; if (i >= 0 && i < S.active.entries.length) { GM.ei = i; renderGym(); } },
  gymAdj: el => {
    const e = S.active.entries[GM.ei], ex = exById(e.exId), x = e.sets.find(s => !s.done); if (!x) return;
    const d = +el.dataset.d;
    if (el.dataset.f === 'w') x.w = Math.max(0, roundTo((x.w || 0) + d * (ex.inc || 2.5), 0.25));
    else x.r = Math.max(0, (x.r ?? x.t ?? RR(ex).min) + d);
    navigator.vibrate?.(10); save(); renderGym();
  },
  gymDone: () => {
    const e = S.active.entries[GM.ei], ex = exById(e.exId), si = e.sets.findIndex(s => !s.done); if (si < 0) return;
    const x = e.sets[si];
    x.r = x.r ?? x.t ?? RR(ex).min; x.w = x.w ?? 0; x.done = true;
    if (x.type !== 'warm') e.sets.slice(si + 1).forEach(n => { if (!n.done && n.type !== 'warm') n.w = x.w; });
    navigator.vibrate?.(30); save();
    if (!e.sets.some(s => !s.done)) { const nx = gymFirstOpen(GM.ei); if (nx != null) GM.ei = nx; }
    if (gymFirstOpen() == null) { UI.rest = null; tickRest(); renderGym(); speak('Stark! Alle Sätze erledigt.'); return; }
    const restS = x.type === 'warm' ? 45 : ex.rest || 90;
    startRest(restS); GM.warned = false; renderGym();
    speak(`Satz geschafft. ${restS >= 60 ? `${fmt(Math.round(restS / 30) / 2, 1).replace(',', ' Komma ')} Minuten` : `${restS} Sekunden`} Pause.`);
  },
  gymFinish: () => { gymClose(); finishWorkout(); },
  // Kalorienbedarf
  energySheet: () => energySheet(),
  applyKcal: () => {
    const r = kcalRecommendation(); if (!r) return;
    const old = S.settings.kcal; applyKcalGoal(r.kcal); save(); closeSheet(); render();
    toast(`Kalorienziel: ${fmt(old)} → ${fmt(r.kcal)} kcal`);
  },
  setPace: el => { S.settings.pace = +el.dataset.v; save(); render(); energySheet(); },
  // Gewohnheiten
  habitSheet: () => habitSheet(),
  habitToggle: el => {
    const d = today(), id = el.dataset.id; S.habitLog[d] ||= {};
    if (S.habitLog[d][id]) delete S.habitLog[d][id]; else { S.habitLog[d][id] = true; navigator.vibrate?.(20); }
    save(); render();
  },
  habitAdd: () => { const v = $('#hb_in')?.value.trim(); if (!v) return; S.habits.push({ id: uid(), name: v }); save(); render(); habitSheet(); },
  habitPreset: el => { S.habits.push({ id: uid(), name: el.dataset.n }); save(); render(); habitSheet(); },
  habitDel: el => { if (!confirm('Gewohnheit entfernen?')) return; S.habits = S.habits.filter(h => h.id !== el.dataset.id); save(); render(); habitSheet(); },
  habitUp: el => { const i = +el.dataset.i; [S.habits[i - 1], S.habits[i]] = [S.habits[i], S.habits[i - 1]]; save(); render(); habitSheet(); },
  // Meal-Prep & Einkauf
  prepSheet: () => prepSheet(),
  prepAdd: () => { const rid = $('#mp_r').value, n = Math.max(1, Math.round(num($('#mp_n').value) || 1)); S.prep.push({ id: uid(), rid, portions: n, left: n, status: 'planned', date: today() }); save(); render(); prepSheet(); },
  prepCooked: el => { const pp = S.prep.find(x => x.id === el.dataset.id); Object.assign(pp, { status: 'ready', left: pp.portions, date: today() }); save(); render(); prepSheet(); toast('✓ Ab in den Vorrat'); },
  prepDel: el => { S.prep = S.prep.filter(x => x.id !== el.dataset.id); save(); render(); prepSheet(); },
  prepEat: el => {
    const pp = S.prep.find(x => x.id === el.dataset.id), r = recipeById(pp?.rid); if (!r || pp.left <= 0) return;
    const sp = perPortion(r);
    pushFood({ id: uid(), date: UI.tab === 'food' ? UI.foodDate : today(), meal: autoMeal(), name: r.name, kcal: sp.kcal, p: sp.p, c: sp.c, f: sp.f, g: Math.round(sp.g) || null, ts: Date.now() });
    pp.left--; save(); render(); toast(`✓ ${r.name} · noch ${pp.left} Portion${pp.left === 1 ? '' : 'en'}`);
  },
  shopping: () => shoppingSheet(),
  shAdd: () => { const v = $('#sh_in')?.value.trim(); if (!v) return; S.shopping.push({ id: uid(), name: v, g: null, done: false }); save(); shoppingSheet(); setTimeout(() => $('#sh_in')?.focus(), 30); },
  shToggle: (el, ev) => { if (ev.target.closest('[data-act="shDel"]')) return; const it = S.shopping.find(x => x.id === el.dataset.id); it.done = !it.done; save(); shoppingSheet(); },
  shDel: el => { S.shopping = S.shopping.filter(x => x.id !== el.dataset.id); save(); shoppingSheet(); },
  shClear: () => { S.shopping = S.shopping.filter(x => !x.done); save(); shoppingSheet(); },
  shFromRecipe: () => shFromRecipeSheet(),
  shRecipeAdd: () => { const r = recipeById($('#sr_r').value), n = num($('#sr_n').value) || r.portions; const k = addToShopping(ingredientsOf(r, n)); save(); shoppingSheet(); toast(`✓ ${r.name}: Zutaten übernommen${k ? ` (${k} neu)` : ''}`); },
  shFromPrep: () => {
    const planned = S.prep.filter(x => x.status === 'planned' && recipeById(x.rid));
    if (!planned.length) return toast('Nichts eingeplant – plane zuerst ein Rezept');
    planned.forEach(x => addToShopping(ingredientsOf(recipeById(x.rid), x.portions)));
    save(); shoppingSheet(); toast('✓ Zutaten aus Meal-Prep übernommen');
  },
  shShare: async () => {
    const open = S.shopping.filter(x => !x.done); if (!open.length) return toast('Liste ist leer');
    const text = 'Einkaufsliste\n' + open.map(x => `• ${x.name}${x.g ? ` – ${fmtQty(x.g)}` : ''}`).join('\n');
    try { if (navigator.share) await navigator.share({ title: 'Einkaufsliste', text }); else { await navigator.clipboard.writeText(text); toast('✓ In die Zwischenablage kopiert'); } } catch {}
  },
  // Check-in
  checkin: () => checkinSheet(),
  ciSet: el => { CI[el.dataset.k] = +el.dataset.v; $$(`[data-ci="${el.dataset.k}"] button`).forEach(b => b.classList.toggle('on', +b.dataset.v === CI[el.dataset.k])); },
  ciSave: () => {
    const kg = num($('#ci_kg').value);
    if (kg && kg > 20 && kg < 400) { S.weights = S.weights.filter(w => w.date !== today()); S.weights.push({ id: uid(), date: today(), kg, note: 'Check-in' }); }
    const c = { id: uid(), date: today(), ...CI, note: $('#ci_note').value.trim() };
    S.checkins.push(c); save(); render();
    openSheet(`<h2>Danke für deinen Check-in</h2><div class="small muted" style="margin-bottom:14px">Das sagt der Coach zu deiner Woche:</div>
      ${checkinAdvice(c).map(t => `<div class="card" style="margin-bottom:10px"><div class="coach">${ic('sparkle')}<div class="small">${t}</div></div></div>`).join('')}
      <div class="sheet-actions"><button class="btn primary" data-act="closeSheet">Alles klar</button></div>`);
  },
  // Teilen
  shareWorkout: el => { const sp = workoutShareSpec(el.dataset.id); if (sp) openShare(sp, 'workout.png'); },
  shareStats: () => openShare(statsShareSpec(), 'rueckblick.png'),
  sharePhotos: el => {
    const a = PH.list.find(x => x.id === el.dataset.a), b = PH.list.find(x => x.id === el.dataset.b); if (!a || !b) return;
    const dk = a.kg != null && b.kg != null ? b.kg - a.kg : null, days = Math.abs(daysBetween(a.date, b.date));
    openShare({ eyebrow: 'Vorher · Nachher', title: days >= 14 ? `${fmt(days / 7)} Wochen Progress` : `${days} Tage Progress`, sub: dk != null ? `${sgn(dk)} kg` : '',
      photos: [{ url: a.url, label: 'Vorher', sub: `${fmtDate(a.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}${a.kg ? ` · ${fmt(a.kg, 1)} kg` : ''}` },
        { url: b.url, label: 'Nachher', sub: `${fmtDate(b.date, { day: '2-digit', month: '2-digit', year: '2-digit' })}${b.kg ? ` · ${fmt(b.kg, 1)} kg` : ''}` }] }, 'progress.png');
  },
  shareSend: async () => {
    if (!SHARE) return;
    const file = new File([SHARE.blob], SHARE.name, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Duty First' });
      else { download(SHARE.blob, SHARE.name); toast('Bild gespeichert'); }
    } catch {}
  },
  shareSave: () => { if (SHARE) { download(SHARE.blob, SHARE.name); toast('Bild gespeichert'); } },
  // Tipps
  nextTip: () => { UI.tipOff = (UI.tipOff || 0) + 1; render(); },
  // Cardio
  addCardio: () => cardioSheet(),
  editCardio: el => cardioSheet(el.dataset.id),
  cdType: el => { CD.type = el.dataset.k; $$('#cd_types .chip').forEach(b => b.classList.toggle('on', b.dataset.k === CD.type)); cdPreview(); },
  saveCardio: el => {
    const min = num($('#cd_min').value); if (!min || min <= 0) return toast('Dauer eingeben');
    const c = { type: CD.type, min, km: num($('#cd_km').value), kcal: num($('#cd_kcal').value), hr: num($('#cd_hr').value), date: $('#cd_date').value || today(), note: $('#cd_note').value.trim() };
    const id = el.dataset.id;
    if (id) Object.assign(S.cardio.find(x => x.id === id), c); else S.cardio.push({ id: uid(), ts: Date.now(), ...c });
    save(); closeSheet(); render(); toast(`✓ ${CARDIO[c.type][0]} · ${fmt(c.min)} min gespeichert`);
  },
  delCardio: el => { if (!confirm('Cardio-Eintrag löschen?')) return; S.cardio = S.cardio.filter(c => c.id !== el.dataset.id); save(); closeSheet(); render(); },
  // Vorlagen & Rezepte
  library: () => librarySheet(),
  saveTemplate: el => templateSheet(el.dataset.meal),
  saveTpl: el => {
    const name = $('#tp_name').value.trim(); if (!name) return toast('Name eingeben');
    const items = S.foods.filter(f => f.date === UI.foodDate && f.meal === el.dataset.meal).map(({ name, kcal, p, c, f, g }) => ({ name, kcal, p, c, f, g: g || null }));
    S.mealTemplates.push({ id: uid(), name, items }); save(); closeSheet(); toast(`✓ Vorlage „${name}“ gespeichert`);
  },
  delTemplate: el => { if (!confirm('Vorlage löschen?')) return; S.mealTemplates = S.mealTemplates.filter(t => t.id !== el.dataset.id); save(); librarySheet(); },
  useTemplate: el => {
    const t = S.mealTemplates.find(x => x.id === el.dataset.id); if (!t) return;
    t.items.forEach((i, k) => pushFood({ id: uid(), date: FC.date, meal: FC.meal, ...i, ts: Date.now() + k }, FC.plan));
    save(); render(); toast(`✓ ${t.name} · ${fmt(tplTotals(t).kcal)} kcal`);
  },
  pickRecipe: el => { FC.picked = { recipe: el.dataset.id }; renderFoodBody(); },
  setPortions: el => { $('#fr_n').value = el.dataset.n; updateRecipePreview(); },
  addRecipe: () => {
    const r = S.recipes.find(x => x.id === FC.picked.recipe), n = num($('#fr_n').value);
    if (!r || !n || n <= 0) return toast('Portionen eingeben');
    const s = perPortion(r);
    addFoodEntry({ name: r.name + (n !== 1 ? ` (${fmt(n, 1)} Port.)` : ''), kcal: s.kcal * n, p: s.p * n, c: s.c * n, f: s.f * n, g: Math.round(s.g * n) || null });
    FC.picked = null; FC.mode = 'saved'; renderFoodBody();
  },
  newRecipe: () => recipeSheet(),
  editRecipe: el => recipeSheet(el.dataset.id),
  reAdd: el => {
    syncRE(); const x = RE.list[+el.dataset.i]; if (!x) return;
    RE.items.push({ name: x.name, kcal: x.kcal, p: x.p, c: x.c, f: x.f, g: x.portion?.g || 100 });
    RE_EXTRA = []; renderRecipeSheet(true);
  },
  reDel: el => { syncRE(); RE.items.splice(+el.dataset.i, 1); renderRecipeSheet(true); },
  reSave: () => {
    syncRE(); const name = RE.name.trim(); if (!name) return toast('Name eingeben');
    if (!RE.items.length) return toast('Mindestens eine Zutat hinzufügen');
    const data = { name, portions: RE.portions, items: RE.items };
    if (RE.id) Object.assign(S.recipes.find(r => r.id === RE.id), data); else S.recipes.push({ id: uid(), ...data });
    save(); closeSheet(); render(); toast(`✓ Rezept „${name}“ gespeichert`);
  },
  reDelete: () => { if (!confirm('Rezept löschen?')) return; S.recipes = S.recipes.filter(r => r.id !== RE.id); save(); closeSheet(); render(); },
  // Rückblick
  openStats: el => { UI.statsFrom = UI.tab === 'stats' ? UI.statsFrom : UI.tab; UI.statsMode = el.dataset.mode || 'week'; UI.statsOff = +el.dataset.off || 0; UI.tab = 'stats'; render(); window.scrollTo(0, 0); },
  statsMode: el => { UI.statsMode = el.dataset.k; UI.statsOff = 0; render(); },
  statsNav: el => { UI.statsOff = Math.max(0, UI.statsOff + +el.dataset.n); render(); },
  statsBack: () => { UI.tab = UI.statsFrom || 'today'; render(); window.scrollTo(0, 0); },
  // Abzeichen & Ziele
  toggleBadges: () => { UI.allBadges = !UI.allBadges; render(); },
  toggleFeed: () => { UI.allFeed = !UI.allFeed; render(); },
  badgeInfo: el => { const b = badgeList().find(x => x.id === el.dataset.id); if (b) toast(b.done ? `${b.title}: ${b.desc}` : `${b.desc} (${fmt(Math.min(b.v, b.max), b.max < 2 ? 2 : 0)} / ${fmt(b.max)})`); },
  addGoal: () => goalSheet(),
  editGoal: el => goalSheet(el.dataset.id),
  glKind: el => { GL.kind = el.dataset.k; glFields(); },
  glDl: el => { $('#gl_dl').value = addDays(today(), 7 * +el.dataset.w); },
  saveGoal: el => {
    const kind = GL.kind, deadline = $('#gl_dl').value;
    if (!deadline || deadline <= today()) return toast('Deadline in der Zukunft wählen');
    let g;
    if (kind === 'lift') {
      const exId = $('#gl_ex').value, w = num($('#gl_w').value), r = Math.max(1, Math.round(num($('#gl_r').value) || 1));
      if (!w || w <= 0) return toast('Zielgewicht eingeben');
      g = { kind, exId, title: `${exById(exId).name} ${fmt(w, 2)} kg${r > 1 ? ` × ${r}` : ''}`, w, r, deadline };
    } else {
      const title = $('#gl_title').value.trim(); if (!title) return toast('Angeben, was du erreichen willst');
      const raw = $('#gl_val').value, val = kind === 'time' ? parseTime(raw) : num(raw);
      if (!val || val <= 0) return toast('Zielwert eingeben');
      const prev = S.prs.find(x => x.kind === kind && x.title.trim().toLowerCase() === title.toLowerCase());
      g = { kind, title: prev ? prev.title : title, val, more: kind === 'time' && $('#gl_more').checked, deadline };
    }
    const id = el.dataset.id;
    if (id) { const o = S.goals.find(x => x.id === id); Object.assign(o, g); if (o.done && !goalProgress(o).reached) o.done = null; }
    else {
      const ng = { id: uid(), created: today(), done: null, ...g }; ng.start = goalCurrent(ng);
      if (ng.start != null && ng.start >= goalTarget(ng) - 1e-9) return toast(`Schon geschafft (aktuell ${goalFmt(ng, ng.start)}) – setz dir ein höheres Ziel`);
      S.goals.push(ng);
    }
    save(); closeSheet(); UI.tab = 'body'; UI.prog = 'prs'; render(); toast('✓ Ziel gespeichert');
  },
  delGoal: el => { if (!confirm('Ziel löschen?')) return; S.goals = S.goals.filter(g => g.id !== el.dataset.id); save(); closeSheet(); render(); },
  // Kamera
  camFlip: () => { if (!CAM) return; CAM.facing = CAM.facing === 'user' ? 'environment' : 'user'; camStart(); },
  camTimer: () => { if (!CAM) return; CAM.timer = { 0: 3, 3: 10, 10: 0 }[CAM.timer]; $('#camT').textContent = CAM.timer + 's'; },
  camShot: () => {
    if (!CAM) return;
    if (!CAM.timer) return camCapture();
    let n = CAM.timer; const el = $('#camCount'); el.textContent = n; el.classList.remove('hidden');
    clearInterval(CAM.cd);
    CAM.cd = setInterval(() => { n--; if (n <= 0) { clearInterval(CAM.cd); el.classList.add('hidden'); camCapture(); } else { el.textContent = n; navigator.vibrate?.(15); } }, 1000);
  },
  camGallery: () => { closeSheet(); $('#photoFile').click(); },
  bodyShape: () => bodyShapeSheet(),
  bsMode: el => {
    S.settings.body = { ...bodyCfg(), mode: el.dataset.k }; save();
    $$('#bs_mode button').forEach(b => b.classList.toggle('on', b.dataset.k === el.dataset.k));
    renderBsBody(); renderBsPrev();
  },
  bsPreset: el => { S.settings.body = { ...bodyCfg(), mode: 'preset', preset: el.dataset.k }; save(); renderBsBody(); renderBsPrev(); },
  bsReset: () => {
    S.settings.body = { ...bodyCfg(), adj: {}, bfAdj: 0 }; save();
    $$('[data-bs]').forEach(i => { i.value = i.dataset.bs === 'bf' ? 0 : 100; });
    BODY_SLIDERS.forEach(([k]) => { $('#bsv_' + k).textContent = '100 %'; }); $('#bsv_bf').textContent = '0';
    renderBsPrev();
  },
  bsDone: () => { closeSheet(); render(); },
  tab: el => { UI.tab = el.dataset.tab; closeSheet(); render(); window.scrollTo(0, 0); },
  closeSheet,
  water: el => { const d = today(); S.water[d] = Math.max(0, (S.water[d] || 0) + +el.dataset.ml); save(); render(); },
  quickFood: () => foodSheet(),
  addFood: el => foodSheet(el.dataset.meal),
  delFood: el => { S.foods = S.foods.filter(f => f.id !== el.dataset.id); save(); if (sheetOpen() && $('#sheet [data-act=fiMeal]')) closeSheet(); render(); },
  foodItem: el => foodItemSheet(el.dataset.id),
  fiMeal: el => { const f = S.foods.find(x => x.id === el.dataset.id); if (!f) return; f.meal = el.dataset.k; save(); render(); foodItemSheet(f.id); },
  recFromFood: el => { const f = S.foods.find(x => x.id === el.dataset.id); if (!f) return; RC2 = null; recSheet({ id: null, name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, g: f.g || null, days: [parseYmd(f.date).getDay()], meal: f.meal, mode: 'plan', fromFood: f.id }, true); },
  recEdit: el => { const r = (S.recurring || []).find(x => x.id === el.dataset.id); if (r) recSheet(r, false); },
  recList: () => recListSheet(),
  recNew: () => { closeSheet(); foodSheet(); FC.rep = [new Date().getDay()]; toast('Lebensmittel wählen – unten Wochentage festlegen'); },
  repDay: el => {
    const d = +el.dataset.d, box = el.closest('#rec_days') ? RC2 : FC; if (!box) return;
    const days = box === RC2 ? RC2.days : (FC.rep ||= []);
    const i = days.indexOf(d); if (i >= 0) days.splice(i, 1); else days.push(d);
    repRefresh(el, days);
  },
  repPreset: el => {
    const box = el.closest('#rec_days') ? RC2 : FC; if (!box) return;
    const v = { all: [0, 1, 2, 3, 4, 5, 6], wk: [1, 2, 3, 4, 5], we: [0, 6], none: [] }[el.dataset.k];
    if (box === RC2) RC2.days = [...v]; else FC.rep = [...v];
    repRefresh(el, box === RC2 ? RC2.days : FC.rep);
  },
  recMeal: el => { RC2.meal = el.dataset.k; $$('#rec_meal .chip').forEach(c => c.classList.toggle('on', c === el)); },
  recMode: el => { RC2.mode = el.dataset.k; $$('#rec_mode button').forEach(b => b.classList.toggle('on', b === el)); },
  recSave: () => {
    if (!RC2?.days.length) return toast('Mindestens einen Wochentag wählen');
    if (RC2.isNew) {
      const f = S.foods.find(x => x.id === RC2.fromFood);
      const r = makeRecurring(f || { ...RC2, date: '0000' }, RC2.days, RC2.meal, RC2.mode);
      toast(`✓ ${r.name} · ${daysTxt(r.days)}`);
    } else {
      const r = S.recurring.find(x => x.id === RC2.id); if (!r) return;
      Object.assign(r, { days: [...RC2.days], meal: RC2.meal, mode: RC2.mode, paused: !!$('#rec_pause')?.checked });
      resetRecurring(r.id); toast('✓ Gespeichert');
    }
    save(); closeSheet(); render();
  },
  recDel: el => {
    if (!confirm('Regelmäßige Mahlzeit löschen? Bereits abgehakte Einträge bleiben erhalten.')) return;
    const id = el.dataset.id; resetRecurring(id); S.recurring = S.recurring.filter(r => r.id !== id);
    S.foods.forEach(f => { if (f.recId === id) delete f.recId; });
    save(); closeSheet(); render(); toast('Gelöscht');
  },
  foodDay: el => { const n = UI.foodDate = addDays(UI.foodDate, +el.dataset.n); if (n > addDays(today(), PLAN_DAYS)) UI.foodDate = addDays(today(), PLAN_DAYS); render(); },
  planDay: el => { UI.tab = 'food'; UI.foodDate = el.dataset.d || addDays(today(), 1); render(); window.scrollTo(0, 0); },
  copyDay: () => {
    const fut = UI.foodDate > today(), src = S.foods.filter(f => f.date === addDays(UI.foodDate, -1) && (fut || !f.planned));
    src.forEach((f, i) => pushFood({ ...f, id: uid(), date: UI.foodDate, ts: Date.now() + i }));
    save(); render(); toast(`${src.length} Einträge ${fut ? 'eingeplant' : 'kopiert'}`);
  },
  eatFood: el => {
    const f = S.foods.find(x => x.id === el.dataset.id); if (!f || f.date > today()) return;
    if (f.planned) { delete f.planned; f.fromPlan = true; toast(`✓ ${f.name} gegessen · ${fmt(f.kcal)} kcal`); } else f.planned = true;
    save(); render();
  },
  eatAll: el => {
    const d = el.dataset.d || today(), list = plannedOpen(d).filter(f => !el.dataset.meal || f.meal === el.dataset.meal);
    if (!list.length || d > today()) return;
    list.forEach(f => delete f.planned); save(); render();
    toast(`✓ ${list.length} ${list.length === 1 ? 'Eintrag' : 'Einträge'} abgehakt · ${fmt(list.reduce((a, f) => a + f.kcal, 0))} kcal`);
  },
  foodMode: el => { FC.mode = el.dataset.m; FC.picked = null; renderFoodBody(); },
  pickFood: (el, ev) => {
    if (ev.target.closest('[data-act="delFav"]')) return;
    const x = FC.list[+el.dataset.i]; if (!x) return;
    if (x.kind === 'recipe') { FC.picked = { recipe: x.rid }; renderFoodBody(); }
    else if (x.kind === 'abs') addFoodEntry(x);
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
    for (const k of ['waist', 'chest', 'shoulders', 'arm', 'thigh', 'calf', 'hip', 'bf']) { const v = num($('#m_' + k).value); if (v != null) { m[k] = v; any = true; } }
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
      if (s.type !== 'warm') e.sets.slice(+el.dataset.s + 1).forEach(n => { if (!n.done && n.type !== 'warm') n.w = s.w; });
      startRest(s.type === 'warm' ? 45 : exById(e.exId)?.rest || 90);
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
    if (!EC.pm.size) return toast('Mindestens einen Hauptmuskel wählen');
    const v = {
      name, muscle: MUSCLE[[...EC.pm][0]].region, pm: [...EC.pm], sm: [...EC.sm], sets: Math.max(1, num($('#e_sets').value) || 3),
      ownRange: $('#e_own').checked, repMin: Math.max(1, num($('#e_repMin').value) || 8), repMax: Math.max(1, num($('#e_repMax').value) || 12), upAt: num($('#e_upAt').value) || null,
      inc: Math.max(0.25, num($('#e_inc').value) || 2.5), rest: Math.max(0, num($('#e_rest').value) || 90),
      start: num($('#e_start').value) || 0, barbell: $('#e_barbell').checked, eq: $('#e_eq').value,
    };
    if (v.repMax < v.repMin) [v.repMin, v.repMax] = [v.repMax, v.repMin];
    v.upAt = Math.min(v.repMax, Math.max(v.repMin, v.upAt || v.repMax));
    let id = el.dataset.id;
    if (id) Object.assign(exById(id), v); else { id = uid(); S.exercises.push({ id, ...v }); }
    save();
    if (el.dataset.pick && S.active) { S.active.entries.push(newEntry(exById(id))); save(); closeSheet(); render(); if (GM) renderGym(); }
    else { render(); exerciseSheet(id); }
  },
  delExercise: el => { if (confirm('Übung löschen?')) { S.exercises = S.exercises.filter(e => e.id !== el.dataset.id); save(); closeSheet(); render(); } },
  editRoutine: el => routineSheet(el.dataset.id),
  rMove: el => { const i = +el.dataset.i; [RC.exIds[i - 1], RC.exIds[i]] = [RC.exIds[i], RC.exIds[i - 1]]; renderRoutineSheet(true); },
  rDel: el => { RC.exIds.splice(+el.dataset.i, 1); renderRoutineSheet(true); },
  rSets: el => { const id = RC.exIds[+el.dataset.i], ex = exById(id); RC.sets[id] = Math.max(1, Math.min(10, (RC.sets[id] ?? ex?.sets ?? 3) + +el.dataset.d)); renderRoutineSheet(true); },
  rBack: () => renderProgramSheet(),
  saveRoutine: () => {
    const name = $('#r_name').value.trim(); if (!name) return toast('Name eingeben');
    if (!RC.exIds.length) return toast('Mindestens eine Übung hinzufügen');
    const sets = Object.fromEntries(RC.exIds.filter(id => RC.sets[id] != null && RC.sets[id] !== exById(id)?.sets).map(id => [id, RC.sets[id]]));
    const warm = Object.fromEntries(RC.exIds.filter(id => RC.warm?.[id]).map(id => [id, true]));
    let id = RC.id;
    if (id) Object.assign(S.routines.find(r => r.id === id), { name, exIds: RC.exIds, sets, warm });
    else { id = uid(); S.routines.push({ id, name, exIds: RC.exIds, sets, warm }); }
    save(); render();
    if (RC.back) { if (!PB.days.some(d => d.rid === id)) PB.days.push({ rid: id, wd: null }); renderProgramSheet(); }
    else { closeSheet(); toast('✓ Trainingstag gespeichert'); }
  },
  delRoutine: () => {
    if (!confirm('Trainingstag löschen? (Verlauf bleibt erhalten)')) return;
    S.routines = S.routines.filter(r => r.id !== RC.id);
    S.programs.forEach(p => { p.days = p.days.filter(d => d.rid !== RC.id); });
    save(); render();
    if (RC.back) renderProgramSheet(); else closeSheet();
  },
  editProgram: el => programSheet(el.dataset.id),
  setActiveProgram: el => { S.activeProgram = el.dataset.id; save(); render(); toast('✓ Plan aktiviert'); },
  pbNewDay: () => { syncPB(); routineSheet(null, 'pb'); },
  pbEditDay: el => { syncPB(); routineSheet(PB.days[+el.dataset.i].rid, 'pb'); },
  pbMove: el => { syncPB(); const i = +el.dataset.i; [PB.days[i - 1], PB.days[i]] = [PB.days[i], PB.days[i - 1]]; renderProgramSheet(true); },
  pbDel: el => { syncPB(); PB.days.splice(+el.dataset.i, 1); renderProgramSheet(true); },
  pbSave: () => {
    syncPB();
    const name = PB.name.trim(); if (!name) return toast('Name eingeben');
    if (!PB.days.length) return toast('Mindestens einen Trainingstag hinzufügen');
    const data = { name, perWeek: PB.perWeek, days: PB.days.map(d => ({ rid: d.rid, wd: d.wd })) };
    let id = PB.id;
    if (id) Object.assign(S.programs.find(p => p.id === id), data); else { id = uid(); S.programs.push({ id, ...data }); }
    if (PB.active) S.activeProgram = id; else if (S.activeProgram === id) S.activeProgram = null;
    save(); closeSheet(); render(); toast('✓ Plan gespeichert');
  },
  pbDelete: () => {
    if (!confirm('Plan löschen? Trainingstage & Verlauf bleiben erhalten.')) return;
    S.programs = S.programs.filter(p => p.id !== PB.id);
    if (S.activeProgram === PB.id) S.activeProgram = S.programs[0]?.id || null;
    save(); closeSheet(); render();
  },
  openMuscle: el => muscleSheet(el.dataset.m),
  toggleFocus: el => {
    const m = el.dataset.m, f = new Set(S.settings.focus || []);
    if (f.has(m)) f.delete(m); else f.add(m);
    S.settings.focus = [...f]; save(); render(); muscleSheet(m);
  },
  saveTarget: el => {
    const mn = num($('#mt_min').value), mx = num($('#mt_max').value);
    if (mn == null || mx == null || mn < 0 || mx < mn) return toast('Bitte Minimum ≤ Maximum eingeben');
    (S.settings.vol ||= {})[el.dataset.m] = [mn, mx]; save(); render(); muscleSheet(el.dataset.m); toast('✓ Ziel gespeichert');
  },
  resetTarget: el => { if (S.settings.vol) delete S.settings.vol[el.dataset.m]; save(); render(); muscleSheet(el.dataset.m); },
  resetTargets: () => { if (!confirm('Alle Muskel-Ziele und Fokus zurücksetzen?')) return; S.settings.vol = {}; S.settings.focus = []; save(); render(); },
  addToDay: el => {
    const exId = $('#mx_ex').value, r = S.routines.find(x => x.id === $('#mx_day').value);
    const n = Math.max(1, Math.min(10, num($('#mx_sets').value) || 3));
    if (!r || !exById(exId)) return;
    if (!r.exIds.includes(exId)) r.exIds.push(exId);
    r.sets = { ...(r.sets || {}), [exId]: n };
    save(); render(); muscleSheet(el.dataset.m); toast(`✓ ${exById(exId).name} (${n} Sätze) → ${r.name}`);
  },
  volWeek: el => { UI.volWeek = Math.max(0, UI.volWeek + +el.dataset.n); render(); },
  goBody: () => { UI.tab = 'body'; UI.prog = 'body'; render(); window.scrollTo(0, 0); },
  goPhotos: () => { UI.tab = 'body'; UI.prog = 'photos'; render(); window.scrollTo(0, 0); },
  goMuscles: () => { UI.tab = 'body'; UI.prog = 'muscles'; closeSheet(); render(); window.scrollTo(0, 0); },
  emToggle: el => {
    const t = el.dataset.t, o = t === 'pm' ? 'sm' : 'pm', m = el.dataset.m;
    if (EC[t].has(m)) EC[t].delete(m); else { EC[t].add(m); EC[o].delete(m); }
    emChips();
  },
  openWorkout: el => workoutSheet(el.dataset.id),
  delWorkout: el => { if (confirm('Training aus dem Verlauf löschen?')) { S.workouts = S.workouts.filter(w => w.id !== el.dataset.id); save(); closeSheet(); render(); } },
  restAdd: el => { if (UI.rest) { UI.rest.end += +el.dataset.s * 1000; UI.rest.total = Math.max(1, UI.rest.total + +el.dataset.s); tickRest(); } },
  restSkip: () => { UI.rest = null; tickRest(); if (GM) { GM.warned = false; renderGym(); } },

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
  saveSettings: () => {
    readSettingsForm(); S.meta.onboarded = true; save(); render();
    toast(S.settings.kcal < 1200 ? '⚠ Unter 1.200 kcal/Tag – bitte nur mit ärztlicher Begleitung' : '✓ Gespeichert');
  },
  prgRange: el => { UI.prgRange = el.dataset.k; render(); },
  prgAll: () => { UI.prgAll = !UI.prgAll; render(); },
  exRange: el => { UI.prgRange = el.dataset.k; const b = $('#exProg'); if (b) b.innerHTML = exProgHtml(el.dataset.id); },
  exMetric: el => { UI.exMetric = el.dataset.k; const b = $('#exProg'); if (b) b.innerHTML = exProgHtml(el.dataset.id); },
  openLegal: el => openSheet(`<iframe class="legal-frame" src="${el.dataset.p}.html" title="${el.dataset.p}"></iframe><div class="sheet-actions"><button class="btn primary" data-act="closeSheet">Schließen</button></div>`),
  welcomeOk: () => { S.meta.welcomeOk = true; save(); render(); },
  askNotif: async () => { await Notification.requestPermission(); render(); if (Notification.permission === 'granted') notify('Benachrichtigungen aktiv', 'Du wirst ans Wiegen und ans Pausenende erinnert.'); },
  downloadIcs,
  exportData: () => download(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), `gym-tracker-backup-${today()}.json`),
  importData: () => $('#importFile').click(),
  resetAll: async () => {
    if (!(confirm('Wirklich ALLE Daten löschen (inkl. Fotos)? Das kann nicht rückgängig gemacht werden.') && confirm('Ganz sicher?'))) return;
    S = DEFAULTS(); save(); applyAccent(); applyMeals(); UI.tab = 'today';
    try { await idbTx('readwrite', st => st.clear()); } catch {}
    await loadPhotos(); render();
  },
  addPhoto: () => photoCamera(),
  progSeg: el => { UI.prog = el.dataset.k; render(); },
  goPrs: () => { UI.tab = 'body'; UI.prog = 'prs'; render(); window.scrollTo(0, 0); },
  addPr: el => prSheet({ kind: el.dataset.kind, title: el.dataset.title, more: !!el.dataset.more }),
  openPrGroup: el => prGroupSheet(el.dataset.key),
  delPr: el => {
    if (!confirm('Eintrag löschen?')) return;
    S.prs = S.prs.filter(p => p.id !== el.dataset.id); save(); render(); prGroupSheet(el.dataset.key);
  },
  savePr: () => {
    const kind = $('#pr_kind').value, title = $('#pr_title').value.trim();
    if (!title) return toast('Bitte angeben, was du geschafft hast');
    const ex = S.exercises.find(e => e.name.toLowerCase() === title.toLowerCase());
    const p = { id: uid(), kind, title: ex ? ex.name : title, exId: ex && kind === 'lift' ? ex.id : null, date: $('#pr_date').value || today(), note: $('#pr_note').value.trim() };
    if (kind === 'lift') { p.w = num($('#pr_w').value) ?? 0; p.r = Math.round(num($('#pr_r').value) || 0); if (p.r < 1) return toast('Wiederholungen eingeben (Gewicht leer = Körpergewicht)'); }
    else if (kind === 'reps') { p.r = Math.round(num($('#pr_reps').value) || 0); if (p.r < 1) return toast('Wiederholungen eingeben'); }
    else if (kind === 'time') { p.sec = parseTime($('#pr_time').value); p.more = $('#pr_more').checked; if (!p.sec) return toast('Zeit eingeben, z.B. 24:30'); }
    else if (kind === 'dist') { p.km = num($('#pr_km').value); if (!p.km) return toast('Distanz eingeben'); }
    else { p.text = $('#pr_text').value.trim(); if (!p.text) return toast('Ergebnis eingeben'); }
    const prev = S.prs.filter(x => prKey(x) === prKey(p));
    if (prev.length) p.title = prev[0].title; // einheitliche Schreibweise
    p.ts = Date.now();
    let prevBest = prev.length ? Math.max(...prev.map(prScore)) : -Infinity;
    if (p.exId) { const a = autoPRs().best[p.exId]; if (a) prevBest = Math.max(prevBest, setScore(a.set)); }
    p.isPr = kind === 'other' || prScore(p) > prevBest + 1e-9;
    S.prs.push(p); save(); closeSheet();
    UI.tab = 'body'; UI.prog = 'prs'; render(); window.scrollTo(0, 0);
    if (p.isPr) { toast(`Neuer PR: ${p.title}!`); navigator.vibrate?.([60, 40, 60, 40, 120]); }
    else toast('✓ Eingetragen – knapp dran am Bestwert!');
  },
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
    } catch { return toast('⚠ Speichern fehlgeschlagen'); }
    closeSheet(); await loadPhotos(); toast('✓ Gespeichert');
  },
  delPhoto: async el => {
    if (!confirm('Foto löschen?')) return;
    try { await idbTx('readwrite', st => st.delete(el.dataset.id)); } catch {}
    closeSheet(); await loadPhotos();
  },
};

function progExample(p) {
  const steps = []; for (let r = p.min; r <= p.up && steps.length < 6; r++) steps.push(`60 kg × ${r}`);
  return `<span class="muted">Beispiel (3 Sätze):</span> ${steps.join(' → ')}${p.up - p.min > 5 ? ' → …' : ''} → <b style="color:var(--accent)">62,5 kg × ${p.min}</b><br><span class="muted">Gesteigert wird, sobald du in <b>allen</b> Sätzen ${p.up} Wdh. schaffst.</span>`;
}
function readProgForm() {
  if (!$('#s_pmin')) return;
  let min = Math.round(num($('#s_pmin').value) || 8), max = Math.round(num($('#s_pmax').value) || 12);
  min = Math.max(1, Math.min(min, 50)); max = Math.max(1, Math.min(max, 50)); if (max < min) [min, max] = [max, min];
  const up = Math.min(max, Math.max(min, Math.round(num($('#s_pup').value) || max)));
  S.settings.prog = { min, max, up };
}
function readSettingsForm() {
  const st = S.settings, n = (id, min = 0) => { const v = num($('#s_' + id)?.value); return v != null && v >= min ? v : st[id]; };
  if (!$('#s_kcal')) return;
  Object.assign(st, {
    name: $('#s_name').value.trim(), sex: $('#s_sex').value, age: n('age', 10), height: n('height', 100), activity: +$('#s_activity').value, goal: $('#s_goal').value,
    goalWeight: num($('#s_goalWeight').value), kcal: n('kcal', 500), protein: n('protein'), carbs: n('carbs'), fat: n('fat'),
    water: n('water', 250), weeklyWorkouts: Math.max(1, n('weeklyWorkouts', 1)), bar: n('bar'),
    weighDay: +$('#s_weighDay').value, weighTime: $('#s_weighTime').value || '08:00',
  });
  readProgForm();
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
  else if (t.id === 'cd_min' || t.id === 'cd_km') cdPreview();
  else if (t.dataset.exnote) { const ex = exById(t.dataset.exnote); if (ex) { ex.note = t.value.trim(); save(); } }
  else if (t.id === 'fr_n') updateRecipePreview();
  else if (t.id === 'rq') { RE_EXTRA = []; renderRecipeSearch(); }
  else if (['s_pmin', 's_pmax', 's_pup'].includes(t.id)) { const p = { min: Math.round(num($('#s_pmin').value) || 1), max: Math.round(num($('#s_pmax').value) || 1), up: Math.round(num($('#s_pup').value) || 1) }; if (p.min <= p.up && p.up <= p.max && p.max <= 50) $('#s_pex').innerHTML = progExample(p); }
  else if (t.id === 'lq') renderLib();
  else if (t.dataset.rig) { RE.items[+t.dataset.rig].g = num(t.value) || 0; reTotals(); }
  else if (t.id === 're_por') reTotals();
  else if (t.id === 'camOp') { const g = $('#camG'); if (g) g.style.opacity = t.value / 100; $('#camOpV').textContent = t.value + ' %'; }
  else if (['gl_w', 'gl_r', 'gl_title', 'gl_val'].includes(t.id)) glHint();
  else if (t.id === 'pr_title') prHint();
  else if (t.dataset.bs) {
    const b = bodyCfg(), k = t.dataset.bs, v = +t.value;
    if (k === 'bf') { b.bfAdj = -v; $('#bsv_bf').textContent = (v > 0 ? '+' : '') + v; }
    else { b.adj = { ...b.adj, [k]: v / 100 }; $('#bsv_' + k).textContent = v + ' %'; }
    S.settings.body = b; save(); renderBsPrev();
  }
  else if (t.dataset.bind && S.active) {
    if (t.dataset.bind === 'name') S.active.name = t.value;
    else { S.active.entries[+t.dataset.e].sets[+t.dataset.s][t.dataset.bind] = num(t.value); updateLive(+t.dataset.e); }
    save();
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'r_add' && e.target.value) { if (!RC.exIds.includes(e.target.value)) RC.exIds.push(e.target.value); renderRoutineSheet(true); }
  if (e.target.id === 'pb_addday' && e.target.value) { syncPB(); PB.days.push({ rid: e.target.value, wd: null }); renderProgramSheet(true); }
  if (e.target.dataset?.pbwd != null || e.target.id === 'pb_per' || e.target.id === 'pb_active') { syncPB(); renderProgramSheet(true); }
  if (e.target.id === 'pr_kind') prKindFields();
  if (e.target.id === 'gl_ex') glHint();
  if (e.target.id === 'ek_auto') { S.settings.autoKcal = e.target.checked; save(); render(); if (e.target.checked) { S.meta.autoKcalWeek = null; autoKcalCheck(); } }
  if (e.target.id === 'photoFile' && e.target.files.length) { addPhotos([...e.target.files]); e.target.value = ''; }
  if (e.target.id === 'e_own') $('#e_range')?.classList.toggle('hidden', !e.target.checked);
  if (e.target.id === 'labelFile' && e.target.files[0]) { ocrScan(e.target.files[0]); e.target.value = ''; }
  if (e.target.id === 'cmp_a' || e.target.id === 'cmp_b') compareSheet($('#cmp_a').value, $('#cmp_b').value);
  if (e.target.id === 'importFile' && e.target.files[0]) {
    e.target.files[0].text().then(txt => {
      const d = JSON.parse(txt);
      if (!d || !d.settings || !Array.isArray(d.workouts)) throw new Error();
      if (!confirm('Backup laden? Aktuelle Daten werden ersetzt.')) return;
      localStorage.setItem(KEY, JSON.stringify(d)); S = load(); applyAccent(); applyMeals(); render(); toast('✓ Backup geladen');
    }).catch(() => toast('⚠ Ungültige Backup-Datei'));
    e.target.value = '';
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheetOpen()) closeSheet();
  if (e.key === 'Enter' && e.target.id === 'fq') e.target.blur();
  if (e.key === 'Enter' && e.target.id === 'sh_in') A.shAdd();
  if (e.key === 'Enter' && e.target.id === 'hb_in') A.habitAdd();
  if (e.key === 'Enter' && e.target.id === 'fa_g') A.addAmount();
});

/* Sekundentakt: Timer, Erinnerungen */
setInterval(() => {
  $$('[data-elapsed]').forEach(el => { if (S.active) el.textContent = mmss((Date.now() - S.active.start) / 1000); });
  if (UI.rest) tickRest();
  if (GM) gymTick();
  if (new Date().getSeconds() === 0) checkWeighReminder();
}, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { checkUpdate(); if (GM) gymWake(); if (UI.foodDate > addDays(today(), PLAN_DAYS)) UI.foodDate = today(); tickRest(); if (!sheetOpen()) render(); checkWeighReminder(); }
});

/* ---------- App-Updates ---------- */
let lastUpdateCheck = 0;
function setupUpdates() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(() => checkUpdate(true)).catch(() => {});
  navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'UPDATE_READY') showUpdateBar(); });
  // neue sw.js übernommen → ebenfalls neu laden lassen
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) showUpdateBar(); });
  try { if (sessionStorage.getItem('gt.updated')) { sessionStorage.removeItem('gt.updated'); setTimeout(() => toast('App aktualisiert'), 400); } } catch {}
}
async function checkUpdate(force) {
  if (!('serviceWorker' in navigator) || (!force && Date.now() - lastUpdateCheck < 60e3)) return;
  lastUpdateCheck = Date.now();
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'CHECK' });
    reg.update().catch(() => {});
  } catch {}
}
function showUpdateBar() { $('#updbar').classList.remove('hidden'); }
function applyUpdate() {
  try { sessionStorage.setItem('gt.updated', '1'); } catch {}
  location.reload();
}

/* ---------- Start (nachdem alle Skripte geladen sind) ---------- */
function startApp() {
  applyAccent();
  applyMeals();
  render();
  checkWeighReminder();
  loadPhotos();
  recordTdee();
  autoKcalCheck();
  setupUpdates();
  navigator.storage?.persist?.();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApp); else startApp();
