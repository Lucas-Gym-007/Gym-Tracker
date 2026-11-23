/* =====================================================================
   Health: Recovery, Ernährungs-Bewertung, Schlaf, Mobility (Dehnen & Physio)
   Alles lokal auf dem Gerät. Hinweise sind allgemein und keine medizinische Beratung.
   ===================================================================== */

ICONS.heart = 'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7zM3.5 12H9l1.5-3 2.5 6 1.5-3h6';
ICONS.moon = 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z';
ICONS.stretch = 'M12 4.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 9l8 1.5L20 9M12 10.5V15M12 15l-5 7M12 15l5 7';
ICONS.leaf = 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.2-6';
UI.health = 'recovery'; UI.hDate = today(); UI.mobArea = '';
const clamp01 = x => Math.max(0, Math.min(1, x));
const hm = h => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} h`; };

/* ---------------------------------------------------------------------
   Mobility-Bibliothek: [Name, Bereich, Art, Sekunden (pro Seite), beidseitig, Anleitung]
   --------------------------------------------------------------------- */
const MOB = {
  neck_tilt: ['Nacken-Seitneigung', 'Nacken', 'Dehnen', 30, true, 'Schultern tief, Ohr Richtung Schulter sinken lassen. Mit der Hand höchstens ganz leicht nachhelfen. Ruhig atmen.'],
  neck_rot: ['Nackenrotation', 'Nacken', 'Mobilität', 30, false, 'Kopf langsam nach links und rechts drehen, nur so weit es angenehm ist. Schultern bleiben locker.'],
  chin_tuck: ['Kinn-Retraktion', 'Nacken', 'Physio', 40, false, 'Kopf gerade nach hinten schieben („Doppelkinn“), Blick bleibt geradeaus. 2 s halten, lösen. Ca. 10 Wdh.'],
  shoulder_roll: ['Schulterkreisen', 'Schultern', 'Mobilität', 30, false, 'Große, langsame Kreise – erst nach hinten, dann nach vorne.'],
  doorway: ['Brustdehnung im Türrahmen', 'Schultern', 'Dehnen', 30, true, 'Unterarm auf Schulterhöhe an den Türrahmen legen und den Körper sanft wegdrehen. Dehnung in der Brust, nicht im Gelenk.'],
  cross_arm: ['Schulter-Querdehnung', 'Schultern', 'Dehnen', 30, true, 'Arm vor der Brust zur anderen Seite ziehen, Schulter bleibt tief.'],
  tri_stretch: ['Trizepsdehnung über Kopf', 'Schultern', 'Dehnen', 30, true, 'Hand zwischen die Schulterblätter, mit der anderen Hand den Ellbogen sanft nach hinten ziehen.'],
  wall_slide: ['Wall Slides', 'Schultern', 'Physio', 45, false, 'Rücken und Unterarme an der Wand. Arme langsam nach oben und wieder runter schieben, Rippen bleiben unten.'],
  band_er: ['Außenrotation mit Band', 'Schultern', 'Physio', 40, true, 'Ellbogen am Körper, 90° gebeugt. Unterarm gegen das Band nach außen drehen, langsam zurück. 12–15 Wdh., leichtes Band.'],
  band_pull: ['Band Pull-Aparts', 'Schultern', 'Physio', 40, false, 'Band auf Brusthöhe, Arme gestreckt auseinanderziehen und die Schulterblätter zusammenführen. 15 Wdh.'],
  scap_push: ['Schulterblatt-Liegestütz', 'Schultern', 'Physio', 40, false, 'Im Liegestütz (oder an der Wand) die Arme gestreckt lassen und nur die Schulterblätter zusammen- und auseinanderbewegen.'],
  thread_needle: ['Thread the Needle', 'Rücken', 'Mobilität', 40, true, 'Vierfüßlerstand: einen Arm unter dem Körper durchfädeln, dann weit zur Decke aufdrehen. Blick folgt der Hand.'],
  open_book: ['Open Book', 'Rücken', 'Mobilität', 40, true, 'Seitlage, Knie 90° gebeugt. Den oberen Arm wie ein Buch zur anderen Seite öffnen, Knie bleiben zusammen.'],
  cat_cow: ['Katze-Kuh', 'Rücken', 'Mobilität', 45, false, 'Vierfüßlerstand. Mit der Atmung abwechselnd den Rücken rund machen und sanft ins Hohlkreuz gehen.'],
  child: ['Kindhaltung', 'Rücken', 'Dehnen', 45, false, 'Gesäß Richtung Fersen, Arme lang nach vorne, Stirn ablegen. Tief in den Bauch atmen.'],
  knee_hug: ['Knie zur Brust', 'Rücken', 'Dehnen', 30, false, 'Rückenlage, beide Knie mit den Händen sanft zur Brust ziehen, leicht hin und her wiegen.'],
  bird_dog: ['Bird Dog', 'Rücken', 'Physio', 45, true, 'Vierfüßlerstand. Gegengleich Arm und Bein lang strecken, Becken bleibt ruhig. 2 s halten, langsam wechseln.'],
  dead_bug: ['Dead Bug', 'Rücken', 'Physio', 45, false, 'Rückenlage, Arme hoch, Beine 90°. Unterer Rücken bleibt am Boden, gegengleich Arm und Bein langsam absenken.'],
  glute_bridge: ['Glute Bridge', 'Hüfte', 'Physio', 45, false, 'Rückenlage, Füße aufgestellt. Becken anheben, bis Knie, Hüfte und Schultern eine Linie bilden. Oben Po anspannen.'],
  hip_flexor: ['Hüftbeuger-Dehnung', 'Hüfte', 'Dehnen', 40, true, 'Halbkniend. Po anspannen und das Becken leicht nach vorne schieben, Oberkörper aufrecht.'],
  figure4: ['Figur-4-Dehnung', 'Hüfte', 'Dehnen', 40, true, 'Rückenlage, Knöchel auf das andere Knie legen und das untere Bein sanft zur Brust ziehen. Dehnung im Gesäß.'],
  pigeon: ['Taube', 'Hüfte', 'Dehnen', 45, true, 'Ein Bein vorne angewinkelt, das andere lang nach hinten. Oberkörper aufrecht oder nach vorne ablegen. Knie schmerzfrei halten.'],
  hip_9090: ['90/90-Hüftrotation', 'Hüfte', 'Mobilität', 45, false, 'Im Sitzen beide Beine 90° gebeugt. Die Knie langsam von einer Seite zur anderen kippen.'],
  frog: ['Adduktoren-Dehnung', 'Hüfte', 'Dehnen', 40, false, 'Vierfüßlerstand, Knie weit auseinander. Gesäß langsam nach hinten schieben bis zur Dehnung innen.'],
  deep_squat: ['Tiefe Hocke halten', 'Hüfte', 'Mobilität', 45, false, 'Füße schulterbreit, tief in die Hocke, Fersen am Boden (sonst etwas unterlegen). Ellbogen drücken die Knie sanft nach außen.'],
  worlds_greatest: ["World's Greatest Stretch", 'Ganzkörper', 'Mobilität', 45, true, 'Großer Ausfallschritt, hintere Hand am Boden, vorderen Arm zur Decke aufdrehen. Danach Hüfte nach hinten, vorderes Bein strecken.'],
  quad_stretch: ['Oberschenkel-Dehnung', 'Beine', 'Dehnen', 30, true, 'Im Stand die Ferse zum Po ziehen, Knie zeigen nach unten, Becken aufrecht. Zum Festhalten an die Wand.'],
  ham_stretch: ['Beinrückseite (Rückenlage)', 'Beine', 'Dehnen', 40, true, 'Rückenlage, ein Bein gestreckt anheben (mit Handtuch oder Band). Knie fast gestreckt, nicht reißen.'],
  calf_wall: ['Wadendehnung an der Wand', 'Beine', 'Dehnen', 30, true, 'Hände an der Wand, hinteres Bein gestreckt, Ferse am Boden. Danach Knie leicht beugen für die tiefe Wade.'],
  ankle_rock: ['Sprunggelenk-Mobilisation', 'Beine', 'Mobilität', 40, true, 'Halbkniend vor der Wand: vorderes Knie über den Zehen Richtung Wand schieben, Ferse bleibt am Boden.'],
  forward_fold: ['Vorbeuge im Stand', 'Beine', 'Dehnen', 30, false, 'Knie leicht gebeugt, Oberkörper locker nach vorne hängen lassen, Kopf entspannt.'],
  side_leg: ['Seitliches Beinheben', 'Knie', 'Physio', 40, true, 'Seitlage, oberes Bein gestreckt leicht nach hinten anheben und langsam senken. 12–15 Wdh.'],
  wall_sit: ['Wandsitz', 'Knie', 'Physio', 40, false, 'Rücken an der Wand, Knie über den Füßen, nur so tief wie schmerzfrei möglich.'],
  step_down: ['Kontrolliertes Absteigen', 'Knie', 'Physio', 45, true, 'Auf einer Stufe stehen, die freie Ferse langsam Richtung Boden senken. Knie zeigt über den zweiten Zeh. 8–10 Wdh.'],
  calf_raise: ['Langsames Wadenheben', 'Knie', 'Physio', 40, false, '3 Sekunden hoch, 3 Sekunden runter. Zum Festhalten an die Wand.'],
  box_breath: ['Box-Atmung', 'Atmung', 'Entspannung', 60, false, '4 s einatmen, 4 s halten, 4 s ausatmen, 4 s halten. Schultern locker.'],
  breath_478: ['4-7-8-Atmung', 'Atmung', 'Entspannung', 60, false, '4 s durch die Nase ein, 7 s halten, 8 s durch den Mund aus. Wenn dir schwindelig wird: normal weiteratmen.'],
  legs_wall: ['Beine an die Wand', 'Atmung', 'Entspannung', 90, false, 'Auf dem Rücken liegen, Beine entspannt an der Wand ablegen und ruhig atmen.'],
};
const MOB_ROUTINES = [
  { id: 'morning', name: 'Morgen-Mobility', desc: 'Wach werden und einmal alles bewegen.', tags: ['Ganzkörper'], items: ['cat_cow', 'worlds_greatest', 'hip_9090', 'shoulder_roll', 'deep_squat', 'glute_bridge'] },
  { id: 'desk', name: 'Büro-Reset: Nacken & Rücken', desc: 'Gegen Sitzen und Handy-Nacken.', tags: ['Nacken', 'Rücken'], items: ['chin_tuck', 'neck_tilt', 'neck_rot', 'doorway', 'thread_needle', 'cat_cow', 'hip_flexor'] },
  { id: 'hips', name: 'Hüfte öffnen', desc: 'Mehr Beweglichkeit für Kniebeugen & Kreuzheben.', tags: ['Hüfte'], items: ['hip_flexor', 'hip_9090', 'pigeon', 'frog', 'deep_squat', 'glute_bridge'] },
  { id: 'shoulder', name: 'Schulter-Gesundheit', desc: 'Physio-Übungen für stabile, belastbare Schultern – ideal vor dem Oberkörpertraining.', tags: ['Schultern', 'Physio'], items: ['wall_slide', 'band_er', 'band_pull', 'scap_push', 'doorway', 'cross_arm'] },
  { id: 'back', name: 'Unterer Rücken entlasten', desc: 'Sanfte Mobilität und Rumpf-Stabilität.', tags: ['Rücken', 'Physio'], items: ['cat_cow', 'child', 'bird_dog', 'dead_bug', 'glute_bridge', 'knee_hug', 'figure4'] },
  { id: 'knee', name: 'Knie-Stabilität', desc: 'Kräftigt Hüfte und Beine rund ums Knie.', tags: ['Knie', 'Physio'], items: ['side_leg', 'glute_bridge', 'wall_sit', 'step_down', 'calf_raise', 'quad_stretch'] },
  { id: 'post_legs', name: 'Nach dem Training: Beine', desc: 'Runterfahren nach dem Beintag.', tags: ['Beine', 'Cool-down'], items: ['quad_stretch', 'ham_stretch', 'hip_flexor', 'figure4', 'calf_wall', 'child'] },
  { id: 'post_upper', name: 'Nach dem Training: Oberkörper', desc: 'Brust, Schultern und Rücken lockern.', tags: ['Oberkörper', 'Cool-down'], items: ['doorway', 'cross_arm', 'tri_stretch', 'thread_needle', 'child', 'neck_tilt'] },
  { id: 'evening', name: 'Abend-Entspannung', desc: 'Runterkommen für besseren Schlaf.', tags: ['Schlaf', 'Entspannung'], items: ['box_breath', 'child', 'figure4', 'knee_hug', 'legs_wall', 'breath_478'] },
];
const mobEx = id => { const x = MOB[id]; return x && { id, name: x[0], area: x[1], kind: x[2], sec: x[3], sides: x[4], cue: x[5] }; };
const mobRoutine = id => MOB_ROUTINES.find(r => r.id === id) || (MOB[id] ? { id, name: MOB[id][0], desc: MOB[id][5], tags: [MOB[id][1]], items: [id], single: true } : null);
const exSec = e => e.sec * (e.sides ? 2 : 1);
const routineMin = r => Math.max(1, Math.round(r.items.map(mobEx).reduce((a, e) => a + exSec(e) + 5, 0) / 60));
const MOB_AREAS = ['Nacken', 'Schultern', 'Rücken', 'Hüfte', 'Beine', 'Knie', 'Ganzkörper', 'Atmung'];

/* ---------------------------------------------------------------------
   Schlaf
   --------------------------------------------------------------------- */
const sleepGoal = () => S.settings.sleepGoal || 8;
const sleepOf = d => (S.sleep || []).find(x => x.date === d);
const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const sleepHours = (bed, wake) => { let d = toMin(wake) - toMin(bed); if (d <= 0) d += 1440; return d / 60; };
const Q_TXT = ['Schlecht', 'Mäßig', 'Okay', 'Gut', 'Super'];
function sleepStats(days = 7) {
  const list = Array.from({ length: days }, (_, i) => sleepOf(addDays(today(), -i))).filter(Boolean);
  if (!list.length) return null;
  const avg = list.reduce((a, x) => a + x.h, 0) / list.length;
  const debt = list.reduce((a, x) => a + Math.max(0, sleepGoal() - x.h), 0);
  const q = list.reduce((a, x) => a + (x.q || 3), 0) / list.length;
  const beds = list.map(x => { const m = toMin(x.bed); return m < 720 ? m + 1440 : m; }); // nach Mitternacht = spät
  const mean = beds.reduce((a, b) => a + b, 0) / beds.length;
  const sd = Math.sqrt(beds.reduce((a, b) => a + (b - mean) ** 2, 0) / beds.length);
  const bedAvg = `${String(Math.floor(mean / 60) % 24).padStart(2, '0')}:${String(Math.round(mean % 60)).padStart(2, '0')}`;
  return { n: list.length, avg, debt, q, sd, bedAvg };
}
function sleepSheet(date = today()) {
  const x = sleepOf(date), last = [...(S.sleep || [])].sort((a, b) => b.date.localeCompare(a.date))[0];
  const bed = x?.bed || last?.bed || '23:00', wake = x?.wake || last?.wake || '07:00';
  UI.sq = x?.q || 3;
  openSheet(`<h2>Schlaf eintragen</h2>
    <label class="f"><span>Aufgewacht am</span><input id="sl_date" type="date" value="${date}" max="${today()}"></label>
    <div class="grid2">
      <label class="f"><span>Eingeschlafen</span><input id="sl_bed" type="time" value="${bed}"></label>
      <label class="f"><span>Aufgewacht</span><input id="sl_wake" type="time" value="${wake}"></label>
    </div>
    <div class="sl-dur" id="sl_dur"></div>
    <div class="fl"><span>Wie war der Schlaf?</span><div class="chips" id="sl_q">${Q_TXT.map((t, i) => `<button class="chip ${UI.sq === i + 1 ? 'on' : ''}" data-act="slQ" data-q="${i + 1}">${t}</button>`).join('')}</div></div>
    <label class="f"><span>Schlafziel (Stunden)</span><input id="sl_goal" inputmode="decimal" value="${String(sleepGoal()).replace('.', ',')}"></label>
    <div class="sheet-actions">${x ? `<button class="btn danger" data-act="slDel" data-d="${date}">Löschen</button>` : ''}<button class="btn" data-act="closeSheet">Abbrechen</button><button class="btn primary" data-act="slSave">Speichern</button></div>`);
  slPreview();
}
function slPreview() {
  const el = $('#sl_dur'); if (!el) return;
  const h = sleepHours($('#sl_bed').value, $('#sl_wake').value), g = sleepGoal();
  el.innerHTML = `<b>${hm(h)}</b> Schlaf <span class="muted">· Ziel ${hm(g)}${h < g ? ` · ${hm(g - h)} zu wenig` : ' ✓'}</span>`;
}

/* ---------------------------------------------------------------------
   Tages-Check & Recovery
   --------------------------------------------------------------------- */
const CHECK = [['energy', 'Energie', ['leer', '', '', '', 'top']], ['sore', 'Muskelkater', ['keiner', '', '', '', 'stark']], ['stress', 'Stress', ['entspannt', '', '', '', 'hoch']]];
function setsOn(d) { return S.workouts.filter(w => w.date === d).reduce((a, w) => a + w.entries.reduce((b, e) => b + WK(e.sets).length, 0), 0); }
function recovery(d = today()) {
  const parts = [], sl = sleepOf(d), c = S.dayCheck?.[d];
  if (sl) parts.push({ k: 'sleep', l: 'Schlaf', w: 0.4, v: 0.7 * clamp01(1 - (sleepGoal() - sl.h) / 3) + 0.3 * ((sl.q || 3) - 1) / 4, t: `${hm(sl.h)} · ${Q_TXT[(sl.q || 3) - 1]}` });
  const load = setsOn(addDays(d, -1)) + 0.5 * setsOn(addDays(d, -2)) + 0.5 * setsOn(d);
  parts.push({ k: 'load', l: 'Trainingsbelastung', w: 0.3, v: clamp01(1 - load / 40), t: load ? `${fmt(load)} harte Sätze in 48 h` : 'keine harten Sätze in 48 h' });
  if (c) parts.push({ k: 'check', l: 'Tages-Check', w: 0.3, v: ((c.energy - 1) / 4 + (5 - c.sore) / 4 + (5 - c.stress) / 4) / 3, t: `Energie ${c.energy}/5 · Muskelkater ${c.sore}/5 · Stress ${c.stress}/5` });
  const w = parts.reduce((a, p) => a + p.w, 0), score = Math.round(parts.reduce((a, p) => a + p.v * p.w, 0) / w * 100);
  const lvl = score >= 75 ? { k: 'ok', t: 'Bereit für hartes Training', s: 'Gute Erholung – heute darfst du Gas geben.' }
    : score >= 50 ? { k: 'mid', t: 'Normal trainieren', s: 'Solide Basis. Sauber trainieren, nicht bis zum Versagen.' }
      : { k: 'low', t: 'Leichter Tag empfohlen', s: 'Mobility, Spaziergang, viel trinken und früh schlafen.' };
  return { score, parts, lvl, partial: !sl || !c };
}
// Erholung pro Muskel: Zeit seit dem letzten Training vs. benötigte Erholung (je nach Satzzahl)
function muscleRecovery() {
  const now = Date.now(), out = {};
  for (const [m] of MUSCLE_LIST) out[m] = null;
  const recent = S.workouts.filter(w => now - (w.end || w.start) < 5 * 864e5).sort((a, b) => b.start - a.start);
  for (const w of recent) {
    const sets = emptyVol();
    for (const e of w.entries) { const ex = exById(e.exId); if (ex) addVol(sets, ex, WK(e.sets).length); }
    for (const [m, n] of Object.entries(sets)) {
      if (!n || out[m]) continue;
      const need = n >= 6 ? 72 : n >= 3 ? 48 : 24, h = (now - (w.end || w.start)) / 36e5;
      out[m] = { sets: n, h, need, pct: clamp01(h / need), left: Math.max(0, need - h) };
    }
  }
  return out;
}
const recColor = r => (!r ? { fill: 'var(--muscle)' } : r.pct >= 1 ? { fill: 'var(--ok)' } : r.pct >= 0.6 ? { fill: 'var(--high)' } : { fill: 'var(--low)' });
function recoveryTips(d = today()) {
  const tips = [], R = recovery(d), sl = sleepOf(d), c = S.dayCheck?.[d], mr = muscleRecovery(), st = S.settings;
  const tired = MUSCLE_LIST.filter(([m]) => mr[m] && mr[m].pct < 0.6).map(([m]) => m);
  if (!sl) tips.push({ ic: 'moon', t: 'Schlaf eintragen', s: 'Wie lange und wie gut hast du geschlafen? Fließt in deinen Recovery-Score ein.', act: 'sleepAdd' });
  else if (sl.h < sleepGoal() - 1) tips.push({ ic: 'moon', t: `Kurze Nacht (${hm(sl.h)})`, s: 'Heute lieber 1–2 Sätze weniger pro Übung und heute Abend 30–45 min früher ins Bett.' });
  const nx = typeof nextDay === 'function' ? nextDay() : null;
  if (tired.length) {
    const hit = nx?.r ? [...new Set(nx.r.exIds.flatMap(id => exById(id)?.pm || []))].filter(m => tired.includes(m)) : [];
    tips.push({ ic: 'body', t: `Noch in Erholung: ${tired.slice(0, 4).map(mName).join(', ')}`, s: hit.length && nx.inDays === 0 ? `Dein heutiges Training (${esc(nx.r.name)}) belastet ${hit.map(mName).join(', ')} – evtl. leichter trainieren oder einen Tag tauschen.` : 'Diese Muskeln heute nicht schwer belasten – andere Muskelgruppen sind frei.' });
  }
  if (c?.sore >= 4) tips.push({ ic: 'stretch', t: 'Starker Muskelkater', s: 'Lockere Bewegung hilft mehr als komplette Ruhe: Spaziergang + Mobility. Genug Protein und Schlaf.', act: 'mobOpen', id: tired.some(m => ['quads', 'hams', 'glutes', 'calves'].includes(m)) ? 'post_legs' : 'post_upper' });
  if (c?.stress >= 4) tips.push({ ic: 'heart', t: 'Stress ist hoch', s: '5 Minuten Atemübung oder die Abend-Entspannung senken das Stresslevel spürbar.', act: 'mobOpen', id: 'evening' });
  const y = addDays(d, -1), ty = dayTotals(y);
  if (c?.energy <= 2 && ty.kcal && ty.kcal < st.kcal * 0.8) tips.push({ ic: 'utensils', t: 'Wenig Energie', s: `Gestern nur ${fmt(ty.kcal)} von ${fmt(st.kcal)} kcal – zu wenig Essen bremst die Erholung.` });
  if (ty.kcal && ty.p < st.protein * 0.8) tips.push({ ic: 'utensils', t: 'Protein gestern zu niedrig', s: `${fmt(ty.p)} von ${fmt(st.protein)} g. Muskeln brauchen Eiweiß zur Reparatur – heute bewusst eiweißreich essen.` });
  if ((S.water[y] || 0) && (S.water[y] || 0) < st.water * 0.7) tips.push({ ic: 'droplet', t: 'Mehr trinken', s: `Gestern ${fmt(S.water[y])} von ${fmt(st.water)} ml.` });
  if (R.score < 50 && !tips.some(t => t.act === 'mobOpen')) tips.push({ ic: 'stretch', t: 'Aktive Erholung', s: '10 Minuten Mobility statt hartem Training.', act: 'mobOpen', id: 'morning' });
  const sug = suggestedRoutine(d, tired);
  if (!tips.some(t => t.id === sug.id)) tips.push({ ic: 'stretch', t: `Empfohlen: ${sug.name}`, s: `${routineMin(sug)} min · ${sug.desc}`, act: 'mobOpen', id: sug.id });
  return tips;
}
function suggestedRoutine(d = today(), tired = []) {
  const c = S.dayCheck?.[d], h = new Date().getHours(), legs = ['quads', 'hams', 'glutes', 'calves'];
  if (c?.stress >= 4 || h >= 20) return mobRoutine('evening');
  if (tired.some(m => legs.includes(m))) return mobRoutine('post_legs');
  if (tired.length) return mobRoutine('post_upper');
  if (h < 11) return mobRoutine('morning');
  return mobRoutine('desk');
}

/* ---------------------------------------------------------------------
   Ernährungs-Bewertung pro Tag
   --------------------------------------------------------------------- */
const FOOD_BY_NAME = new Map(FOOD_DB.map(x => [x.name, x]));
const VEG_CATS = ['Obst', 'Gemüse', 'Hülsenfrüchte & Tofu'];
const ALC = /bier|wein|sekt|prosecco|radler|cider|spritz|hugo|gin|mojito|cuba|wodka|whisky|rum|likör|glühwein/i;
function catOf(name) { const x = FOOD_BY_NAME.get(name) || (S.customFoods || []).find(c => c.name === name); return x ? { cat: x.cat || 'Eigene', per: x } : null; }
// Zerlegt einen Eintrag in Bestandteile mit Kategorie, Gramm und kcal (Rezepte über ihre Zutaten)
function foodParts(f) {
  const hit = catOf(f.name);
  if (hit) return [{ cat: hit.cat, g: f.g || 0, kcal: f.kcal, name: f.name, per: hit.per }];
  const idea = RECIPE_IDEAS.find(r => f.name === r.name || f.name.startsWith(r.name + ' ('));
  const own = !idea && S.recipes.find(r => f.name === r.name);
  const src = idea ? { items: ideaItems(idea), portions: idea.portions, per: ideaPer(idea) } : own ? { items: own.items, portions: own.portions || 1, per: perPortion(own) } : null;
  if (src && src.per.kcal > 0) {
    const k = f.kcal / src.per.kcal / src.portions;
    return src.items.map(i => { const c = catOf(i.name); return { cat: c?.cat || 'Sonstiges', g: i.g * k, kcal: i.kcal * i.g / 100 * k, name: i.name, per: c?.per }; });
  }
  return [{ cat: 'Sonstiges', g: f.g || 0, kcal: f.kcal, name: f.name }];
}
function dayAnalysis(d) {
  const st = S.settings, items = S.foods.filter(f => f.date === d && !f.planned), t = dayTotals(d);
  const parts = items.flatMap(foodParts), byCat = {};
  for (const p of parts) byCat[p.cat] = (byCat[p.cat] || 0) + p.kcal;
  const veg = parts.filter(p => VEG_CATS.includes(p.cat)).reduce((a, p) => a + p.g, 0);
  const sweet = parts.filter(p => p.cat === 'Süßes & Snacks' || (p.cat === 'Getränke' && (ALC.test(p.name) || (p.per && p.per.p < 2 && p.per.kcal >= 25)))).reduce((a, p) => a + p.kcal, 0);
  const water = S.water[d] || 0, share = t.kcal ? sweet / t.kcal : 0, dev = Math.abs(t.kcal - st.kcal) / st.kcal;
  const comps = [
    { k: 'kcal', l: 'Kalorien', w: 25, v: dev <= 0.1 ? 1 : dev >= 0.4 ? 0 : 1 - (dev - 0.1) / 0.3, t: `${fmt(t.kcal)} von ${fmt(st.kcal)} kcal` },
    { k: 'p', l: 'Protein', w: 25, v: clamp01((t.p / st.protein - 0.5) / 0.5), t: `${fmt(t.p)} von ${fmt(st.protein)} g` },
    { k: 'veg', l: 'Obst & Gemüse', w: 20, v: clamp01(veg / 400), t: `${fmt(veg)} von 400 g` },
    { k: 'sweet', l: 'Wenig Süßes & Alkohol', w: 15, v: share <= 0.1 ? 1 : share >= 0.35 ? 0 : 1 - (share - 0.1) / 0.25, t: `${fmt(share * 100)} % der Kalorien` },
    { k: 'water', l: 'Wasser', w: 15, v: clamp01(water / st.water), t: `${fmt(water)} von ${fmt(st.water)} ml` },
  ];
  const score = Math.round(comps.reduce((a, c) => a + c.v * c.w, 0));
  const enough = t.kcal >= st.kcal * 0.4;
  const grade = score >= 85 ? ['A', 'Sehr gut', 'ok'] : score >= 70 ? ['B', 'Gut', 'acc'] : score >= 55 ? ['C', 'Okay', 'mid'] : score >= 40 ? ['D', 'Ausbaufähig', 'warn'] : ['E', 'Schwach', 'bad'];
  const top = [...items].sort((a, b) => b.kcal - a.kcal).slice(0, 5), topP = [...items].sort((a, b) => b.p - a.p).slice(0, 3);
  // konkrete Tipps aus den schwächsten Bereichen
  const tips = [];
  for (const c of [...comps].sort((a, b) => (a.v - 1) * a.w - (b.v - 1) * b.w)) {
    if (c.v >= 0.9 || tips.length >= 3) continue;
    if (c.k === 'veg') tips.push(`Noch ${fmt(Math.max(0, 400 - veg))} g Obst & Gemüse bis 400 g – z.B. Brokkoli (150 g) zum Essen oder ein Apfel als Snack.`);
    if (c.k === 'p') tips.push(`Protein: ${fmt(st.protein - t.p)} g fehlen – Skyr, Magerquark, Hähnchen oder ein Shake helfen.`);
    if (c.k === 'kcal') tips.push(t.kcal > st.kcal ? `${fmt(t.kcal - st.kcal)} kcal über dem Ziel – oft sind Snacks und Getränke die versteckten Kalorien.` : `${fmt(st.kcal - t.kcal)} kcal unter dem Ziel${st.goal === 'bulk' ? ' – für Muskelaufbau zu wenig' : ''}.`);
    if (c.k === 'sweet') tips.push(`${fmt(share * 100)} % der Kalorien aus Süßem, Snacks & Alkohol – unter 10 % ist ideal.`);
    if (c.k === 'water') tips.push(`Wasser: noch ${fmt(Math.max(0, st.water - water))} ml – stell dir eine Flasche sichtbar hin.`);
  }
  return { d, items, t, byCat, veg, sweet, share, water, comps, score, grade, enough, top, topP, tips };
}

/* ---------------------------------------------------------------------
   Startseiten-Hinweis
   --------------------------------------------------------------------- */
function healthHomeNotice() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12 && !sleepOf(today())) return `<div class="notice" data-act="sleepAdd">${ic('moon')}<div class="t">Wie hast du geschlafen?<span>Schlaf eintragen – für deinen Recovery-Score</span></div>${ic('chev', 'chev')}</div>`;
  if (sleepOf(today())) { const R = recovery(); if (R.score < 50) return `<div class="notice warn" data-act="tab" data-tab="health">${ic('heart')}<div class="t">Recovery ${R.score} – ${R.lvl.t}<span>${R.lvl.s}</span></div>${ic('chev', 'chev')}</div>`; }
  return '';
}

/* ---------------------------------------------------------------------
   Ansichten
   --------------------------------------------------------------------- */
VIEWS.health = () => {
  const seg = `<div class="seg">${[['recovery', 'Recovery'], ['food', 'Ernährung'], ['sleep', 'Schlaf'], ['mobility', 'Mobility']].map(([k, l]) =>
    `<button class="${UI.health === k ? 'on' : ''}" data-act="hSeg" data-k="${k}">${l}</button>`).join('')}</div>`;
  const body = { recovery: hRecovery, food: hFood, sleep: hSleep, mobility: hMobility }[UI.health]();
  return `<h1>Health</h1><div class="sub">Erholung, Ernährung, Schlaf und Beweglichkeit – für optimale Ergebnisse.</div>${seg}${body}
    <div class="small muted h-disc">Allgemeine Hinweise, keine medizinische Beratung. Bei Schmerzen, Beschwerden oder Vorerkrankungen ärztlich bzw. physiotherapeutisch abklären lassen.</div>`;
};
const scoreColor = k => ({ ok: 'var(--ok)', mid: 'var(--accent)', low: 'var(--low)' }[k]);
function hRecovery() {
  const R = recovery(), c = S.dayCheck?.[today()] || {}, mr = muscleRecovery(), tips = recoveryTips(), sl = sleepOf(today()), fa = dayAnalysis(addDays(today(), -1));
  const P = bodyParams(bodySource()), tired = MUSCLE_LIST.filter(([m]) => mr[m] && mr[m].pct < 1).sort((a, b) => mr[a[0]].pct - mr[b[0]].pct);
  return `
  <div class="card h-score">
    ${ring(R.score / 100, scoreColor(R.lvl.k), R.score, 'Recovery')}
    <div class="h-score-t"><span class="label">Heute</span><b style="color:${scoreColor(R.lvl.k)}">${R.lvl.t}</b><span class="small muted">${R.lvl.s}</span>
      ${R.partial ? `<span class="small muted" style="margin-top:6px">${!sl ? 'Schlaf' : ''}${!sl && !S.dayCheck?.[today()] ? ' und ' : ''}${!S.dayCheck?.[today()] ? 'Tages-Check' : ''} fehlt noch – dann wird der Score genauer.</span>` : ''}</div>
  </div>
  <div class="card">
    <div class="card-head"><span class="label">Tages-Check</span><span class="small muted">${S.dayCheck?.[today()] ? '✓ erledigt' : '10 Sekunden'}</span></div>
    ${CHECK.map(([k, l, lab]) => `<div class="hc-row"><span>${l}</span><div class="hc-scale">${[1, 2, 3, 4, 5].map(v => `<button class="${c[k] === v ? 'on' : ''}" data-act="hCheck" data-k="${k}" data-v="${v}">${v}</button>`).join('')}</div><small>${lab[0]} → ${lab[4]}</small></div>`).join('')}
  </div>
  <h3>Vorschläge</h3>
  <div class="list h-tips">${tips.map(t => `<div class="item ${t.act ? 'tap' : ''}" ${t.act ? `data-act="${t.act}" ${t.id ? `data-id="${t.id}"` : ''}` : ''}><span class="h-ic">${ic(t.ic)}</span><div class="t"><b>${t.t}</b><span class="wrap">${t.s}</span></div>${t.act ? '<span class="muted">›</span>' : ''}</div>`).join('')}</div>
  <h3>Muskel-Erholung</h3>
  <div class="card">
    <div class="bodymap">${['front', 'back'].map(v => `<div>${bodySVG(P, v, null, { interactive: false, colorOf: m => recColor(mr[m]) })}<div class="lbl">${v === 'front' ? 'Vorne' : 'Hinten'}</div></div>`).join('')}</div>
    <div class="legend"><span><i style="background:var(--low)"></i>erholt sich</span><span><i style="background:var(--high)"></i>fast erholt</span><span><i style="background:var(--ok)"></i>erholt</span><span><i style="background:var(--muscle)"></i>nicht trainiert</span></div>
    ${tired.length ? `<div class="list" style="margin-top:12px">${tired.map(([m]) => { const r = mr[m]; return `<div class="item"><div class="t"><b>${mName(m)}</b><div class="rbar"><i style="width:${Math.round(r.pct * 100)}%;background:${recColor(r).fill}"></i></div><span>${fmt(r.sets, 1)} Sätze · noch ca. ${Math.ceil(r.left)} h</span></div><span class="pill">${Math.round(r.pct * 100)} %</span></div>`; }).join('')}</div>` : '<div class="small muted" style="margin-top:10px">Alle trainierten Muskeln sind erholt.</div>'}
    <div class="small muted" style="margin-top:8px">Faustregel: je nach Satzzahl 24–72 h Erholung pro Muskel.</div>
  </div>
  <div class="tiles">
    <div class="tile" data-act="hSeg" data-k="sleep"><div class="th"><span class="label">Letzte Nacht</span>${ic('moon')}</div><b class="big">${sl ? hm(sl.h) : '–'}</b><span class="small muted">${sl ? Q_TXT[(sl.q || 3) - 1] : 'noch nicht eingetragen'}</span></div>
    <div class="tile" data-act="hFoodDay" data-d="${addDays(today(), -1)}"><div class="th"><span class="label">Ernährung gestern</span>${ic('leaf')}</div><b class="big">${fa.enough ? `<span class="grade g-${fa.grade[2]}">${fa.grade[0]}</span> ${fa.score}` : '–'}</b><span class="small muted">${fa.enough ? fa.grade[1] : 'zu wenig geloggt'}</span></div>
  </div>`;
}
function hFood() {
  const d = UI.hDate, A2 = dayAnalysis(d), isToday = d === today(), st = S.settings;
  const week = Array.from({ length: 7 }, (_, i) => addDays(d > addDays(today(), -3) ? today() : addDays(d, 3), i - 6)).filter(x => x <= today());
  const catRows = Object.entries(A2.byCat).sort((a, b) => b[1] - a[1]);
  return `
  <div class="datenav"><button class="icon-btn" data-act="hDay" data-n="-1">‹</button><b>${isToday ? 'Heute' : d === addDays(today(), -1) ? 'Gestern' : fmtDate(d, { weekday: 'short', day: '2-digit', month: '2-digit' })}</b>
    <button class="icon-btn" data-act="hDay" data-n="1" ${isToday ? 'disabled style="opacity:.3"' : ''}>›</button></div>
  <div class="h-week">${week.map(x => { const a = dayAnalysis(x); return `<button class="${x === d ? 'on' : ''}" data-act="hFoodDay" data-d="${x}"><small>${DAYS[parseYmd(x).getDay()].slice(0, 2)}</small><span class="grade g-${a.enough ? a.grade[2] : 'none'}">${a.enough ? a.grade[0] : '–'}</span></button>`; }).join('')}</div>
  ${!A2.items.length ? `<div class="empty">An diesem Tag ist nichts geloggt.</div>` : `
  <div class="card h-score">
    ${ring(A2.score / 100, A2.enough ? `var(--${{ ok: 'ok', acc: 'accent', mid: 'accent', warn: 'orange', bad: 'red' }[A2.grade[2]]})` : 'var(--muscle)', A2.enough ? A2.grade[0] : '–', A2.enough ? A2.score + ' / 100' : '')}
    <div class="h-score-t"><span class="label">${isToday ? 'Bisher heute' : 'Tagesbewertung'}</span><b>${A2.enough ? A2.grade[1] : 'Zu wenig geloggt'}</b>
      <span class="small muted">${A2.enough ? (isToday ? 'Vorläufig – der Tag läuft noch.' : `${fmt(A2.t.kcal)} kcal · ${fmt(A2.t.p)} g Protein`) : 'Für eine Bewertung mindestens 40 % des Kalorienziels eintragen.'}</span></div>
  </div>
  <div class="card">${A2.comps.map(c => `<div class="hcomp"><div class="hcomp-h"><span>${c.l}</span><span class="muted">${c.t}</span></div><div class="rbar"><i style="width:${Math.round(c.v * 100)}%;background:${c.v >= 0.8 ? 'var(--ok)' : c.v >= 0.5 ? 'var(--accent)' : 'var(--low)'}"></i></div></div>`).join('')}</div>
  ${A2.tips.length ? `<h3>So wird der Tag besser</h3><div class="list">${A2.tips.map(t => `<div class="item"><span class="h-ic">${ic('sparkle')}</span><div class="t"><span class="wrap" style="color:var(--text);font-size:13.5px">${t}</span></div></div>`).join('')}</div>` : ''}
  <h3>Woher kommen die Kalorien?</h3>
  <div class="card">${catRows.map(([c, k]) => `<div class="hcomp"><div class="hcomp-h"><span>${esc(c)}</span><span class="muted">${fmt(k)} kcal · ${fmt(k / Math.max(1, A2.t.kcal) * 100)} %</span></div><div class="rbar"><i style="width:${Math.round(k / Math.max(1, A2.t.kcal) * 100)}%"></i></div></div>`).join('')}</div>
  <div class="grid2">
    <div class="card"><span class="label">Top-Kalorienquellen</span>${A2.top.map(f => `<div class="h-src"><span>${esc(f.name)}</span><b>${fmt(f.kcal)}</b></div>`).join('')}</div>
    <div class="card"><span class="label">Top-Proteinquellen</span>${A2.topP.map(f => `<div class="h-src"><span>${esc(f.name)}</span><b>${fmt(f.p)} g</b></div>`).join('')}</div>
  </div>`}
  <div class="small muted">Bewertet: Kalorien (25), Protein (25), Obst & Gemüse (20, Ziel 400 g), wenig Süßes & Alkohol (15), Wasser (15). Geplante, nicht abgehakte Einträge zählen nicht.</div>`;
}
function hSleep() {
  const s7 = sleepStats(7), sl = sleepOf(today()), g = sleepGoal();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
  const vals = days.map(d => Math.round((sleepOf(d)?.h || 0) * 10) / 10);
  const tips = [];
  if (s7) {
    if (s7.avg < g - 0.5) tips.push(`Im Schnitt ${hm(g - s7.avg)} unter deinem Ziel. Am einfachsten: jeden Abend 20–30 min früher ins Bett.`);
    if (s7.sd > 60) tips.push(`Deine Einschlafzeit schwankt um ±${Math.round(s7.sd)} min. Feste Zeiten (auch am Wochenende) verbessern die Schlafqualität.`);
    if (s7.q < 3) tips.push('Schlafqualität eher schlecht: Koffein nach 14 Uhr meiden, Zimmer kühl und dunkel, Handy 30 min vorher weglegen.');
    if (!tips.length) tips.push('Starke Schlafwoche – genau so weitermachen!');
  }
  return `
  <div class="card h-score">
    ${ring(sl ? sl.h / g : 0, sl && sl.h >= g ? 'var(--ok)' : 'var(--accent)', sl ? hm(sl.h).replace(' h', '') : '–', 'Letzte Nacht')}
    <div class="h-score-t"><span class="label">Schlafziel ${hm(g)}</span><b>${sl ? `${Q_TXT[(sl.q || 3) - 1]} geschlafen` : 'Noch nicht eingetragen'}</b>
      <span class="small muted">${sl ? `${sl.bed} – ${sl.wake} Uhr` : 'Trag ein, wann du eingeschlafen und aufgewacht bist.'}</span>
      <button class="btn sm ${sl ? '' : 'primary'}" style="margin-top:10px;align-self:flex-start" data-act="sleepAdd">${sl ? 'Bearbeiten' : '+ Schlaf eintragen'}</button></div>
  </div>
  ${s7 ? `<div class="grid3">
    <div class="stat"><b>${hm(s7.avg)}</b><span>Ø ${s7.n} Nächte</span></div>
    <div class="stat"><b class="${s7.debt >= 3 ? 'down' : ''}">${hm(s7.debt)}</b><span>Defizit 7 Tage</span></div>
    <div class="stat"><b>±${Math.round(s7.sd)} min</b><span>Regelmäßigkeit</span></div>
  </div>` : ''}
  <h3>Letzte 14 Nächte</h3>
  <div class="card">${vals.some(Boolean) ? barChart(vals, days.map(d => parseYmd(d).getDate()), { goal: g, color: 'var(--blue)', under: 'var(--low)' }) : '<div class="empty small">Noch keine Einträge.</div>'}
    ${s7 ? `<div class="small muted" style="margin-top:6px">Ø Einschlafzeit ${s7.bedAvg} Uhr · Ø Qualität ${fmt(s7.q, 1)}/5</div>` : ''}</div>
  ${tips.length ? `<h3>Tipps</h3><div class="list">${tips.map(t => `<div class="item"><span class="h-ic">${ic('moon')}</span><div class="t"><span class="wrap" style="color:var(--text);font-size:13.5px">${t}</span></div></div>`).join('')}
    <div class="item tap" data-act="mobOpen" data-id="evening"><span class="h-ic">${ic('stretch')}</span><div class="t"><b>Abend-Entspannung</b><span>${routineMin(mobRoutine('evening'))} min Atmung & sanftes Dehnen vor dem Schlafen</span></div><span class="muted">›</span></div></div>` : ''}
  ${(S.sleep || []).length ? `<h3>Verlauf</h3><div class="list">${[...S.sleep].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14).map(x => `<div class="item tap" data-act="sleepAdd" data-d="${x.date}"><div class="t"><b>${fmtDate(x.date, { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${hm(x.h)}</b><span>${x.bed} – ${x.wake} · ${Q_TXT[(x.q || 3) - 1]}</span></div><span class="muted">›</span></div>`).join('')}</div>` : ''}`;
}
function hMobility() {
  const wk = weekStart(new Date()).getTime(), done = (S.mobility || []).filter(x => parseYmd(x.date).getTime() >= wk);
  const sug = suggestedRoutine(), area = UI.mobArea;
  const exs = Object.keys(MOB).map(mobEx).filter(e => !area || e.area === area);
  return `
  <div class="card accent tap-card" data-act="mobOpen" data-id="${sug.id}">
    <span class="label">Empfohlen für jetzt</span><div class="card-head" style="margin:6px 0 2px"><b style="font-size:17px">${sug.name}</b><span class="pill">${routineMin(sug)} min</span></div>
    <div class="small muted">${sug.desc}</div>
  </div>
  <div class="grid2"><div class="stat"><b>${done.length}</b><span>Einheiten diese Woche</span></div><div class="stat"><b>${fmt(done.reduce((a, x) => a + (x.min || 0), 0))} min</b><span>Mobility diese Woche</span></div></div>
  <h3>Routinen</h3>
  <div class="list">${MOB_ROUTINES.map(r => `<div class="item tap" data-act="mobOpen" data-id="${r.id}"><span class="h-ic">${ic(r.tags.includes('Schlaf') ? 'moon' : r.tags.includes('Physio') ? 'heart' : 'stretch')}</span><div class="t"><b>${r.name}</b><span>${routineMin(r)} min · ${r.items.length} Übungen · ${r.tags.join(', ')}</span></div><span class="muted">›</span></div>`).join('')}</div>
  <h3>Einzelübungen</h3>
  <div class="chips lb-chips">${['', ...MOB_AREAS].map(a => `<button class="chip ${area === a ? 'on' : ''}" data-act="mobArea" data-a="${a}">${a || 'Alle'}</button>`).join('')}</div>
  <div class="list" style="margin-top:10px">${exs.map(e => `<div class="item tap" data-act="mobOpen" data-id="${e.id}"><div class="t"><b>${e.name}</b><span>${e.area} · ${e.kind} · ${e.sides ? `2 × ${e.sec} s` : `${e.sec} s`}</span></div><span class="muted">›</span></div>`).join('')}</div>`;
}

/* ---------------------------------------------------------------------
   Mobility: Routine-Detail & geführter Timer
   --------------------------------------------------------------------- */
let MP = null;
function mobSheet(id) {
  const r = mobRoutine(id); if (!r) return;
  openSheet(`<h2>${r.name}</h2><div class="small muted" style="margin-bottom:12px">${r.single ? `${r.tags[0]} · ${MOB[id][2]}` : `${routineMin(r)} min · ${r.items.length} Übungen · ${r.desc}`}</div>
    <div class="list">${r.items.map(mobEx).map((e, i) => `<div class="item"><span class="mp-n">${i + 1}</span><div class="t"><b>${e.name}${e.sides ? ' <span class="muted">· je Seite</span>' : ''}</b><span class="wrap">${e.cue}</span></div><span class="muted small">${e.sec} s</span></div>`).join('')}</div>
    <div class="small muted" style="margin-top:10px">Langsam und kontrolliert, nur im schmerzfreien Bereich. Bei Schmerzen abbrechen.</div>
    <div class="sheet-actions"><button class="btn" data-act="mobLog" data-id="${r.id}">Nur abhaken</button><button class="btn primary" data-act="mobStart" data-id="${r.id}">${ic('play')} Starten</button></div>`);
}
function mpSteps(r) { return r.items.map(mobEx).flatMap(e => (e.sides ? [{ e, side: 'Links' }, { e, side: 'Rechts' }] : [{ e }])); }
function mobStart(id) {
  const r = mobRoutine(id); if (!r) return;
  clearInterval(MP?.timer);
  MP = { r, steps: mpSteps(r), i: 0, left: 0, paused: false, start: Date.now() };
  MP.left = MP.steps[0].e.sec;
  try { navigator.wakeLock?.request('screen').then(l => { if (MP) MP.lock = l; }).catch(() => {}); } catch {}
  renderMP(true); speak(MP.steps[0].e.name);
  MP.timer = setInterval(mpTick, 1000);
}
function mpTick() {
  if (!MP) return;
  if (!$('#mp')) { mpStop(); return; } // Sheet geschlossen
  if (MP.paused) return;
  MP.left--;
  if (MP.left <= 3 && MP.left > 0) navigator.vibrate?.(15);
  if (MP.left <= 0) return mpNext();
  renderMP();
}
function mpNext(d = 1) {
  if (!MP) return;
  MP.i += d;
  if (MP.i < 0) MP.i = 0;
  if (MP.i >= MP.steps.length) return mpFinish();
  MP.left = MP.steps[MP.i].e.sec; navigator.vibrate?.([40, 40, 40]);
  const s = MP.steps[MP.i]; speak(s.side && s.side === 'Rechts' && MP.steps[MP.i - 1]?.e === s.e ? 'Seite wechseln' : s.e.name);
  renderMP(true);
}
function mpFinish() {
  const min = Math.max(1, Math.round((Date.now() - MP.start) / 60000));
  logMobility(MP.r, min); const name = MP.r.name; mpStop();
  $('.sheet-panel').innerHTML = `<div style="text-align:center;padding:10px 0"><div style="color:var(--accent)">${ic('trophy').replace('class="ic ', 'style="width:44px;height:44px" class="ic ')}</div><h2>Geschafft!</h2>
    <div class="small muted">${esc(name)} · ${min} min Mobility</div></div><div class="sheet-actions"><button class="btn primary" data-act="closeSheet">Fertig</button></div>`;
  speak('Geschafft');
}
function mpStop() { if (!MP) return; clearInterval(MP.timer); try { MP.lock?.release(); } catch {} MP = null; }
function logMobility(r, min) { (S.mobility ||= []).push({ id: uid(), date: today(), rid: r.id, min: min || routineMin(r) }); save(); render(); }
function renderMP(full) {
  const s = MP.steps[MP.i], e = s.e, rest = MP.steps.slice(MP.i + 1).reduce((a, x) => a + x.e.sec, 0) + MP.left;
  const nx = MP.steps[MP.i + 1];
  const t = $('#mp_left'); if (!full && t) { t.textContent = MP.left; $('#mp_ring')?.setAttribute('stroke-dashoffset', (2 * Math.PI * 54 * (1 - MP.left / e.sec)).toFixed(1)); $('#mp_rest').textContent = `noch ca. ${Math.ceil(rest / 60)} min`; return; }
  const c = 2 * Math.PI * 54;
  $('.sheet-panel').innerHTML = `<div id="mp" class="mp">
    <div class="card-head"><span class="label">${esc(MP.r.name)} · ${MP.i + 1}/${MP.steps.length}</span><span class="small muted" id="mp_rest">noch ca. ${Math.ceil(rest / 60)} min</span></div>
    <h2 style="margin:10px 0 2px">${e.name}</h2>${s.side ? `<div class="mp-side">${s.side === 'Links' ? '◀ Linke Seite' : 'Rechte Seite ▶'}</div>` : `<div class="mp-side">${e.area} · ${e.kind}</div>`}
    <div class="mp-timer"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="6"/>
      <circle id="mp_ring" cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" transform="rotate(-90 60 60)" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - MP.left / e.sec)).toFixed(1)}" style="transition:stroke-dashoffset 1s linear"/></svg>
      <b id="mp_left">${MP.left}</b></div>
    <p class="mp-cue">${e.cue}</p>
    ${nx ? `<div class="small muted" style="text-align:center">Als Nächstes: ${nx.e === e ? 'Seite wechseln' : esc(nx.e.name)}</div>` : '<div class="small muted" style="text-align:center">Letzte Übung</div>'}
    <div class="mp-ctrl"><button class="btn" data-act="mpPrev" ${MP.i ? '' : 'disabled'}>‹</button><button class="btn primary grow" data-act="mpPause">${MP.paused ? 'Weiter' : 'Pause'}</button><button class="btn" data-act="mpSkip">›</button></div>
    <button class="btn ghost block" data-act="mpEnd">Beenden</button></div>`;
}

/* ---------------------------------------------------------------------
   Aktionen & Events
   --------------------------------------------------------------------- */
Object.assign(A, {
  hSeg: el => { UI.health = el.dataset.k; render(); window.scrollTo(0, 0); },
  hCheck: el => { const d = today(); S.dayCheck ||= {}; S.dayCheck[d] = { energy: 3, sore: 1, stress: 2, ...S.dayCheck[d], [el.dataset.k]: +el.dataset.v }; save(); render(); },
  hDay: el => { const n = addDays(UI.hDate, +el.dataset.n); UI.hDate = n > today() ? today() : n; render(); },
  hFoodDay: el => { UI.health = 'food'; UI.hDate = el.dataset.d; UI.tab = 'health'; render(); },
  sleepAdd: el => sleepSheet(el?.dataset?.d || today()),
  slQ: el => { UI.sq = +el.dataset.q; $$('#sl_q .chip').forEach(c => c.classList.toggle('on', c === el)); },
  slSave: () => {
    const date = $('#sl_date').value || today(), bed = $('#sl_bed').value, wake = $('#sl_wake').value;
    if (!bed || !wake) return toast('Zeiten eintragen');
    const h = sleepHours(bed, wake); if (h > 16) return toast('Mehr als 16 h? Bitte Zeiten prüfen');
    const g = num($('#sl_goal').value); if (g && g >= 4 && g <= 12) S.settings.sleepGoal = g;
    S.sleep = (S.sleep || []).filter(x => x.date !== date); S.sleep.push({ id: uid(), date, bed, wake, h: Math.round(h * 100) / 100, q: UI.sq || 3 });
    save(); closeSheet(); render(); toast(`✓ ${hm(h)} Schlaf gespeichert`);
  },
  slDel: el => { if (!confirm('Eintrag löschen?')) return; S.sleep = S.sleep.filter(x => x.date !== el.dataset.d); save(); closeSheet(); render(); },
  mobOpen: el => mobSheet(el.dataset.id),
  mobArea: el => { UI.mobArea = el.dataset.a; render(); },
  mobStart: el => mobStart(el.dataset.id),
  mobLog: el => { const r = mobRoutine(el.dataset.id); logMobility(r); closeSheet(); toast(`✓ ${r.name} abgehakt`); },
  mpPause: () => { if (!MP) return; MP.paused = !MP.paused; renderMP(true); },
  mpSkip: () => mpNext(1),
  mpPrev: () => mpNext(-1),
  mpEnd: () => { const m = MP; if (m && Date.now() - m.start > 60000 && confirm('Bisherige Zeit als Einheit speichern?')) logMobility(m.r, Math.round((Date.now() - m.start) / 60000)); mpStop(); closeSheet(); },
});
document.addEventListener('input', e => { if (e.target.id === 'sl_bed' || e.target.id === 'sl_wake') slPreview(); });
