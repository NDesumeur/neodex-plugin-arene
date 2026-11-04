// NeoBestiary Arène : les créatures de NeoBestiary Studio s'affrontent au tour par tour dans une arène en pixel art.
// La scène est un canevas 320x180 agrandi sans lissage ; les textes et boutons sont posés par-dessus (640x360 virtuels).
const ID = 'neodex.arene', U = 'neoplugin://' + ID + '/';
const W = 320, H = 180, GROUND = 124;
const RAR = ['commun', 'peu commun', 'rare', 'épique', 'légendaire'];
const ELEMENTS = ['feu', 'eau', 'plante', 'vent', 'roche', 'glace', 'foudre', 'lumière', 'ombre', 'esprit', 'acier', 'poison'];
const GENRE = { griffe: 'griffes', morsure: 'morsure', charge: 'charge', fouet: 'fouet', corne: 'corne', dard: 'dard', etreinte: 'étreinte',
  projectile: 'projectile', souffle: 'souffle', rayon: 'rayon', cri: 'cri', rafale: 'rafale', pluie: 'pluie', onde: 'onde',
  explosion: 'explosion', soin: 'soin', renfort: 'renfort' };
// statuts : brûlure (perd 1/16 des PV par tour, frappe moins fort), poison (1/10 par tour), gel (ne joue pas, peut
// dégeler), paralysie (1 chance sur 4 de ne pas jouer, deux fois plus lente)
const STATUS = { 'brûlure': { tick: 1 / 16, verb: 'brûle', turns: 4, on: n => `${n} prend feu !` },
  poison: { tick: 1 / 10, verb: 'empoisonne', turns: 5, on: n => `Le poison atteint ${n} !` },
  gel: { verb: 'gèle', turns: 3, on: n => `La glace saisit ${n} !` },
  paralysie: { verb: 'paralyse', turns: 4, on: n => `La paralysie frappe ${n} !` },
  saignement: { tick: 1 / 12, verb: 'fait saigner', turns: 4, on: n => `${n} saigne !` },
  sommeil: { verb: 'endort', turns: () => 1 + Math.floor(Math.random() * 3), on: n => `${n} s'endort…` },
  confusion: { verb: 'embrouille', turns: () => 2 + Math.floor(Math.random() * 3), on: n => `${n} ne sait plus où il en est !` },
  'éblouissement': { verb: 'éblouit', turns: 3, on: n => `${n} est ébloui !` },
  peur: { verb: 'effraie', flinch: true } };  // peur : la cible perd son action si elle n'a pas encore joué
// crans de statistiques (-3..+3) : attaque, défense, vitesse, précision
const STAGE = s => s >= 0 ? 1 + .25 * s : 1 / (1 - .25 * s);
const stage = (F, k) => STAGE(F.st?.[k] || 0);
const STAT_SHORT = { attaque: 'atq', defense: 'déf', vitesse: 'vit', precision: 'pré' };
const STAT_FR = { attaque: "L'attaque", defense: 'La défense', vitesse: 'La vitesse', precision: 'La précision' };
const reach = mv => mv.portee || (['onde', 'explosion'].includes(mv.genre) ? 'zone' : ['projectile', 'souffle', 'rayon'].includes(mv.genre) ? 'distance' : 'contact');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);

const HTML = `<link rel="stylesheet" href="${U}ui/arena.css">
<div class="ar" tabindex="0">
  <div class="ar-stage" id="stage">
    <canvas id="cv" width="${W}" height="${H}"></canvas>
    <div class="ar-ui" id="ui"></div>
    <div class="ar-fx" id="fx"></div>
  </div>
</div>`;

// ------------------------------------------------------------------ règles du combat
const hpMax = c => c.stats.pv * 2 + 60;
const typeOf = (m, f) => ELEMENTS.includes(f.id) ? f.id : m.type;
function effect(move, target) {  // multiplicateur d'élément contre la créature visée
  if (target.card.faiblesses.includes(move.element)) return 1.5;
  if (target.card.resistances.includes(move.element)) return .67;
  return 1;
}
const atkOf = F => F.card.stats.attaque * stage(F, 'attaque') * (F.status?.nom === 'brûlure' ? .75 : 1);
const defOf = F => F.card.stats.defense * stage(F, 'defense');
const speedOf = F => F.card.stats.vitesse * stage(F, 'vitesse') * (F.status?.nom === 'paralysie' ? .5 : 1);
// chance de toucher (0..1) : précision de l'attaque, crans de précision, éblouissement
const hitChance = (F, mv) => Math.min(1, (mv.precision || 100) / 100 * stage(F, 'precision') * (F.status?.nom === 'éblouissement' ? 2 / 3 : 1));
function damage(att, move, def, roll = Math.random(), critRoll = Math.random()) {
  const stab = move.element === att.type ? 1.2 : 1;
  const crit = critRoll < (move.critique || 1) / 16 ? 1.5 : 1;
  const base = move.puissance * (atkOf(att) / Math.max(1, defOf(def))) * .45;
  const dmg = Math.max(1, Math.round(base * stab * effect(move, def) * (.9 + .15 * roll) * crit * (def.guard ? .5 : 1)));
  return { dmg, crit: crit > 1, eff: effect(move, def) };
}
function cpuChoice(me, foe, rnd = Math.random) {  // l'ordinateur : le coup le plus fort, un soin ou un renfort à propos
  const moves = me.card.attaques, find = g => moves.findIndex(a => a.genre === g);
  if (find('soin') >= 0 && me.hp < me.max * .45 && rnd() < .5) return find('soin');
  if (me.hp < me.max * .3 && rnd() < .3) return 'garde';
  if (find('renfort') >= 0 && (me.st?.attaque || 0) + (me.st?.defense || 0) < 3 && me.hp > me.max * .6 && rnd() < .3) return find('renfort');
  const hits = moves.map((a, i) => i).filter(i => !moves[i].effet);
  if (!hits.length) return 'garde';
  if (rnd() < .15) return hits[Math.floor(rnd() * hits.length)];
  let best = hits[0], score = -1;
  hits.forEach(i => {
    const a = moves[i], st = a.statut && !foe.status ? a.statut.chance / 100 * 8 : 0;  // un statut vaut quelques dégâts
    const fx = (a.effets || []).reduce((v, e) => v + e.chance / 100 * 3, 0) + (a.drain && me.hp < me.max * .6 ? 4 : 0);
    const hits = a.coups ? (a.coups[0] + a.coups[1]) / 2 : 1;
    const s = damage(me, a, { ...foe, guard: false }, .5, 1).dmg * hits * hitChance(me, a) + st + fx;
    if (s > score) { score = s; best = i; }
  });
  return best;
}

export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  view.innerHTML = HTML;
  const $ = s => view.querySelector(s), $$ = s => [...view.querySelectorAll(s)];
  const call = (n, ...a) => ctx.neo.pluginMain(ID, n, ...a);
  const cv = $('#cv'), g = cv.getContext('2d'), ui = $('#ui');
  g.imageSmoothingEnabled = false;

  // ---------------------------------------------------------------- images
  const cache = {};
  const lib = (m, p) => `${U}lib/${encodeURIComponent(m.slug)}/${p}?v=${m.mis_a_jour || 0}`;
  const img = url => {
    if (!cache[url]) {
      const im = new Image();
      im.ready = new Promise(ok => { im.onload = ok; im.onerror = ok; });
      im.src = url; cache[url] = im;
    }
    return cache[url];
  };
  const loaded = im => im.complete && im.naturalWidth > 0;

  // ---------------------------------------------------------------- mise à l'échelle (pixels entiers pour la scène)
  function fit() {
    const r = view.getBoundingClientRect();
    const k = Math.max(.5, Math.floor(Math.min(r.width / 640, r.height / 360) * 2) / 2);
    $('#stage').style.transform = `scale(${k})`;
    $('#stage').style.left = Math.round((r.width - 640 * k) / 2) + 'px';
    $('#stage').style.top = Math.round((r.height - 360 * k) / 2) + 'px';
  }
  const ro = new ResizeObserver(fit); ro.observe(view); fit();

  // ---------------------------------------------------------------- décor de l'arène (dessiné une fois)
  const deco = document.createElement('canvas'); deco.width = W; deco.height = H;
  const crowd = [];
  (function paint() {
    const d = deco.getContext('2d');
    let seed = 7;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const px = (x, y, w, h, c) => { d.fillStyle = c; d.fillRect(x, y, w, h); };
    // ciel du soir en bandes
    ['#1b1030', '#2a1640', '#3f1d4f', '#5c2752', '#83354f', '#b04e45', '#d9783f'].forEach((c, i) => px(0, i * 6, W, 6, c));
    // gradins : mur de pierre, arches, foule
    px(0, 40, W, 58, '#3a2c3f');
    for (let y = 40; y < 98; y += 6) for (let x = (y / 6) % 2 ? 0 : -8; x < W; x += 16) {
      px(x, y, 15, 5, ['#4a3a4f', '#45364b', '#503f55'][Math.floor(r() * 3)]);
    }
    px(0, 40, W, 2, '#1a1220'); px(0, 62, W, 3, '#1a1220'); px(0, 95, W, 3, '#140c1c');
    for (let x = 10; x < W; x += 40) {  // arches sombres
      px(x, 70, 20, 25, '#140c1c'); px(x + 2, 68, 16, 2, '#140c1c'); px(x + 5, 66, 10, 2, '#140c1c');
      px(x - 2, 66, 2, 29, '#5c4a62'); px(x + 20, 66, 2, 29, '#5c4a62');
    }
    for (let y = 44; y < 61; y += 4) for (let x = 2; x < W; x += 4) {  // la foule (têtes animées ensuite)
      if (r() < .85) crowd.push({ x: x + Math.floor(r() * 2), y, c: ['#d9a07a', '#8a5a3c', '#f2c9a0', '#5a3a2a', '#c48a6a'][Math.floor(r() * 5)], s: ['#7a4f9a', '#2f6fd6', '#e0525c', '#3d8a3d', '#c48a2c', '#4a2f5c'][Math.floor(r() * 6)], p: r() * 6 });
    }
    // bannières
    [[40, '#e0525c'], [120, '#2f6fd6'], [200, '#3d8a3d'], [280, '#7a4f9a']].forEach(([x, c]) => {
      px(x, 62, 12, 16, c); px(x + 2, 78, 8, 2, c); px(x + 4, 80, 4, 2, c); px(x + 4, 66, 4, 4, '#f2c25b'); px(x, 62, 12, 1, '#1a1220');
    });
    // sable en bandes, grain, cercle de l'arène
    ['#8a6a3e', '#9a7848', '#a88552', '#b4905a', '#bf9a62', '#c6a36a'].forEach((c, i) => px(0, 98 + i * 4, W, 4, c));
    px(0, 122, W, 58, '#c9a66c');
    for (let i = 0; i < 900; i++) px(Math.floor(r() * W), 98 + Math.floor(r() * 82), 1, 1, r() < .5 ? '#d6b47a' : '#a8844f');
    d.fillStyle = '#b8945c';
    for (let a = 0; a < 360; a += 1) {
      const t = a * Math.PI / 180;
      d.fillRect(Math.round(160 + Math.cos(t) * 110), Math.round(126 + Math.sin(t) * 22), 2, 1);
      d.fillRect(Math.round(160 + Math.cos(t) * 30), Math.round(126 + Math.sin(t) * 6), 1, 1);
    }
    px(0, 98, W, 1, '#5a4228');
  })();
  function drawDeco(t) {
    g.drawImage(deco, 0, 0);
    for (const c of crowd) {  // la foule se lève et s'assoit
      const up = Math.sin(t / 300 + c.p) > .7 ? 1 : 0;
      g.fillStyle = c.s; g.fillRect(c.x, c.y + 2 - up, 3, 2);
      g.fillStyle = c.c; g.fillRect(c.x + 1, c.y - up, 1, 2);
    }
    for (const x of [8, 306]) {  // torches
      g.fillStyle = '#3a2614'; g.fillRect(x + 2, 70, 2, 26);
      g.fillStyle = '#5a4228'; g.fillRect(x, 68, 6, 3);
      const f = Math.floor(t / 110 + x) % 3;
      g.fillStyle = '#e0461f'; g.fillRect(x, 61 - f, 6, 7 + f);
      g.fillStyle = '#ffa22b'; g.fillRect(x + 1, 63 - f, 4, 5 + f);
      g.fillStyle = '#fff3a0'; g.fillRect(x + 2, 65, 2, 2);
    }
  }
  function shadow(x, w = 36) {
    g.fillStyle = 'rgba(40,24,16,.35)';
    for (let i = -2; i <= 2; i++) { const half = Math.round(w / 2 * Math.sqrt(1 - (i / 3) ** 2)); g.fillRect(Math.round(x - half), GROUND + i, half * 2, 1); }
  }

  // ---------------------------------------------------------------- combattants
  function fighter(m, f, side) {
    const card = f.combat, max = hpMax(card);
    return { m, f, card, side, type: typeOf(m, f), name: f.nom, hp: max, max, show: max, guard: false, status: null, st: {},
      x: side ? W + 40 : -40, home: side ? 248 : 72, dir: side ? 'gauche' : 'droite', anim: { name: 'attente', t0: 0 }, fx: null, alpha: 1 };
  }
  const row = (F, d) => F.m.directions.indexOf(d || F.dir);
  function frameOf(F, t) {  // l'image en cours : planche, colonne, ligne (+ effet éventuel)
    const a = F.anim, dt = t - a.t0, dossier = F.f.dossier;
    if (a.name === 'marche') {
      const k = F.m.marche.ordre[Math.floor(dt / F.m.marche.ms) % F.m.marche.ordre.length];
      return { sheet: lib(F.m, dossier + F.m.marche.image), col: F.m.marche.images.indexOf(k) };
    }
    if (a.name.startsWith('attaque')) {
      const n = +a.name.slice(7), mv = F.f.attaques[n - 1];
      let i = 0, acc = 0;
      while (i < mv.ms.length - 1 && dt >= acc + mv.ms[i]) acc += mv.ms[i++];
      const dec = mv.decalages[F.dir]?.[i];
      return { sheet: lib(F.m, dossier + mv.image), col: i, fx: dec?.visible && !a.noFx?.includes(i) ? { sheet: lib(F.m, dossier + mv.effet), x: dec.x, y: dec.y } : null };
    }
    const an = F.m.animations[a.name], ms = an.ms;
    let k = dt;
    if (a.name === 'attente') k = dt % ms.reduce((x, y) => x + y, 0);
    let i = 0;
    while (i < ms.length - 1 && k >= ms[i]) k -= ms[i++];
    return { sheet: lib(F.m, dossier + an.image), col: i };
  }
  function drawFighter(F, t) {
    if (!F) return;
    const fr = frameOf(F, t), sx = Math.round(F.x - 32), sy = GROUND - 62, r = row(F);
    shadow(F.x);
    const im = img(fr.sheet);
    g.globalAlpha = F.alpha;
    if (loaded(im)) g.drawImage(im, fr.col * 64, r * 64, 64, 64, sx, sy, 64, 64);
    if (fr.fx) { const e = img(fr.fx.sheet); if (loaded(e)) g.drawImage(e, fr.col * 64, r * 64, 64, 64, sx + fr.fx.x, sy + fr.fx.y, 64, 64); }
    g.globalAlpha = 1;
    if (F.guard) {  // garde : un bouclier de lumière
      g.fillStyle = 'rgba(125,255,176,.55)';
      const fx = F.side ? sx + 6 : sx + 54;
      for (let y = 0; y < 30; y += 2) g.fillRect(fx, sy + 24 + y, 3, 1);
    }
  }
  const play = (F, name, extra = {}) => { F.anim = { name, t0: performance.now(), ...extra }; };
  const animMs = (F, name) => name.startsWith('attaque') ? F.f.attaques[+name.slice(7) - 1].ms.reduce((a, b) => a + b, 0)
    : F.m.animations[name].ms.reduce((a, b) => a + b, 0);
  async function walk(F, to, ms) {
    const from = F.x, t0 = performance.now(), back = Math.sign(to - from) !== (F.side ? -1 : 1);
    play(F, 'marche');
    if (back) F.dir = F.side ? 'droite' : 'gauche';
    while (true) {
      const k = Math.min(1, (performance.now() - t0) / ms);
      F.x = from + (to - from) * k;
      if (k >= 1) break;
      await sleep(16);
    }
    F.dir = F.side ? 'gauche' : 'droite';
    play(F, 'attente');
  }

  // ---------------------------------------------------------------- scène : boucle de dessin
  const S = { screen: 'menu', roster: [], records: {}, fighters: [], shake: 0, bolts: [], walkers: [], mode: 'cpu', pick: [] };
  let alive = true;
  function frame(t) {
    if (!view.isConnected) { alive = false; ro.disconnect(); return; }
    g.save();
    if (S.shake > t) g.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-1, 1)));
    drawDeco(t);
    for (const w of S.walkers) {  // menu : des créatures traversent l'arène
      w.F.x += w.v;
      if (w.F.x > W + 40 || w.F.x < -40) S.walkers = S.walkers.filter(x => x !== w);
      drawFighter(w.F, t);
    }
    if (S.screen === 'select' && S.preview) drawFighter(S.preview, t);
    if (S.screen === 'battle' || S.screen === 'result') S.fighters.forEach(F => drawFighter(F, t));
    for (const b of S.bolts) {  // projectiles en vol
      const k = Math.min(1, (t - b.t0) / b.ms), x = b.x0 + (b.x1 - b.x0) * k, e = img(b.sheet);
      if (loaded(e)) g.drawImage(e, b.col * 64, b.row * 64, 64, 64, Math.round(x - 32), b.y, 64, 64);
    }
    if (S.screen !== 'battle' && S.screen !== 'select') { g.fillStyle = 'rgba(13,10,20,.35)'; g.fillRect(0, 0, W, H); }
    g.restore();
    if (alive) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function spawnWalker() {
    if (S.screen !== 'menu' || !S.roster.length || S.walkers.length >= 2) return;
    const m = S.roster[Math.floor(Math.random() * S.roster.length)], f = m.formes[Math.floor(Math.random() * m.formes.length)];
    const left = Math.random() < .5, F = fighter(m, f, left ? 0 : 1);
    F.x = left ? -36 : W + 36; F.dir = left ? 'droite' : 'gauche'; play(F, 'marche');
    S.walkers.push({ F, v: left ? .45 : -.45 });
  }
  const wi = setInterval(() => view.isConnected ? spawnWalker() : clearInterval(wi), 2600);

  // ---------------------------------------------------------------- textes flottants (dégâts, efficacité)
  function pop(x, y, text, cls = '') {
    const el = document.createElement('div');
    el.className = 'ar-pop ' + cls; el.textContent = text;
    el.style.left = x * 2 + 'px'; el.style.top = y * 2 + 'px';
    $('#fx').appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // ---------------------------------------------------------------- écrans
  const btn = (id, label, cls = 'dark') => `<button class="ar-btn ${cls}" id="${id}">${label}</button>`;
  async function menu() {
    S.screen = 'menu'; S.fighters = []; S.bolts = [];
    try { S.roster = (await call('roster')).creatures; S.studio = true; } catch (e) { S.roster = []; S.err = e.message; }
    const n = S.roster.length;
    ui.innerHTML = `<div class="ar-menu">
      <div class="ar-logo"><small>NeoBestiary</small><b>Arène</b></div>
      <div class="ar-col">
        ${btn('mCpu', 'Combat contre l\'ordinateur', 'go')}
        ${btn('mDuel', 'Duel à deux joueurs')}
        ${btn('mRec', 'Palmarès')}
      </div>
      <div class="ar-hint">${n ? `${n} créature${n > 1 ? 's' : ''} prête${n > 1 ? 's' : ''} au combat` :
        'Aucune créature prête : crées-en dans NeoBestiary Studio (avec leur fiche de combat).'}</div></div>`;
    $('#mCpu').disabled = $('#mDuel').disabled = !n;
    $('#mCpu').onclick = () => select('cpu');
    $('#mDuel').onclick = () => select('duel');
    $('#mRec').onclick = records;
    spawnWalker();
  }

  const moveInfo = a => a.effet_texte ? (a.puissance ? `${a.puissance} · ` : '') + a.effet_texte  // fiches du Studio 1.4+
    : a.effet?.soin ? `soin ${a.effet.soin} %` : a.effet?.attaque ? 'attaque +1'
    : `${a.puissance}${a.statut ? ` · ${STATUS[a.statut.nom]?.verb || a.statut.nom} ${a.statut.chance} %` : ''}`;
  function cardHtml(m, f) {
    const k = f.combat, r = RAR.indexOf(k.rarete), chips = (l, cls) => l.map(t => `<span class="ar-chip ${cls}">${esc(t)}</span>`).join(' ') || '—';
    return `<div class="ar-detail">
      <div class="ar-dhead"><b>${esc(f.nom)}</b><span class="ar-rare r${r}">${esc(k.rarete)}</span><span class="ar-chip">${esc(typeOf(m, f))}</span></div>
      <div class="ar-stats">${[['pv', 'PV'], ['attaque', 'Attaque'], ['defense', 'Défense'], ['vitesse', 'Vitesse']].map(([s, l]) =>
        `<span>${l}</span><i><b style="width:${Math.min(100, k.stats[s])}%"></b></i><em>${k.stats[s]}</em>`).join('')}</div>
      <div class="ar-weak">Faible : ${chips(k.faiblesses, 'bad')}<br>Résiste : ${chips(k.resistances, 'good')}</div>
      ${k.attaques.map((a, i) => `<div class="ar-move"><b>${i + 1}. ${esc(a.nom)}</b> <span class="ar-chip">${esc(a.element)}</span> <span class="ar-chip">${GENRE[a.genre] || esc(a.genre)}</span> <em>${moveInfo(a)}</em></div>`).join('')}
    </div>`;
  }

  function select(mode) {
    S.mode = mode; S.pick = []; S.screen = 'select'; S.walkers = [];
    pickScreen();
  }
  function pickScreen() {
    const who = S.pick.length === 0 ? (S.mode === 'duel' ? 'Joueur 1' : 'Ta créature') : (S.mode === 'duel' ? 'Joueur 2' : 'L\'adversaire');
    S.cur = S.cur && S.roster.includes(S.cur.m) ? S.cur : { m: S.roster[0], f: S.roster[0].formes[0] };
    ui.innerHTML = `<div class="ar-select">
      <div class="ar-top"><span class="ar-who">${who} : choisis une créature</span>${btn('sBack', 'Retour')}</div>
      <div class="ar-grid" id="grid">${S.roster.map((m, i) => m.formes.map((f, j) => `<button class="ar-cell r${RAR.indexOf(f.combat.rarete)}" data-i="${i}" data-j="${j}" title="${esc(f.nom)}">
        <img src="${lib(m, f.dossier + 'sheet.png')}" style="object-position:-64px 0" alt=""><span>${esc(f.nom)}</span></button>`).join('')).join('')}</div>
      <div class="ar-side" id="side"></div>
      <div class="ar-bottom">${btn('sRand', 'Au hasard')}${btn('sGo', 'Choisir', 'go')}</div></div>`;
    $$('#grid .ar-cell').forEach(b => b.onclick = () => { const m = S.roster[+b.dataset.i]; S.cur = { m, f: m.formes[+b.dataset.j] }; showCur(); });
    $('#sBack').onclick = () => S.pick.length ? (S.pick.pop(), pickScreen()) : menu();
    $('#sRand').onclick = () => { const m = S.roster[Math.floor(Math.random() * S.roster.length)]; S.cur = { m, f: m.formes[Math.floor(Math.random() * m.formes.length)] }; showCur(); };
    $('#sGo').onclick = () => {
      S.pick.push(S.cur);
      if (S.pick.length === 2) return battle();
      if (S.mode === 'cpu') { $('#sRand').click(); }
      pickScreen();
    };
    showCur();
  }
  function showCur() {
    const { m, f } = S.cur;
    $$('#grid .ar-cell').forEach(b => b.classList.toggle('on', S.roster[+b.dataset.i] === m && m.formes[+b.dataset.j] === f));
    const portrait = m.portrait ? `<img class="ar-portrait" src="${lib(m, f.dossier + 'portrait.png')}" alt="">` : '';
    $('#side').innerHTML = portrait + cardHtml(m, f);
    S.preview = fighter(m, f, 0); S.preview.x = 160; S.preview.dir = 'bas';
  }

  // ---------------------------------------------------------------- combat
  function hud() {
    const [a, b] = S.fighters, bar = (F, i) => `<div class="ar-hp ${i ? 'right' : ''}">
      <div class="ar-hpname"><b>${esc(F.name)}</b><span class="ar-rare r${RAR.indexOf(F.card.rarete)}">${esc(F.card.rarete)}</span><span class="ar-chip">${esc(F.type)}</span>${F.status ? `<span class="ar-chip bad">${esc(F.status.nom)}</span>` : ''}${Object.entries(F.st).filter(([, v]) => v).map(([k, v]) => `<span class="ar-chip ${v > 0 ? 'good' : 'bad'}">${STAT_SHORT[k]} ${v > 0 ? '+' : ''}${v}</span>`).join('')}</div>
      <i><b class="${F.show / F.max < .25 ? 'low' : F.show / F.max < .5 ? 'mid' : ''}" style="width:${Math.max(0, F.show / F.max * 100)}%"></b></i>
      <em>${Math.max(0, Math.ceil(F.show))} / ${F.max}</em></div>`;
    $('#hud').innerHTML = bar(a, 0) + bar(b, 1);
  }
  async function drain(F, to) {  // la barre de vie descend doucement
    const from = F.show, t0 = performance.now();
    while (true) {
      const k = Math.min(1, (performance.now() - t0) / 450);
      F.show = from + (to - from) * k; hud();
      if (k >= 1) break;
      await sleep(16);
    }
  }
  const say = text => { $('#log').textContent = text; };

  async function battle() {
    S.screen = 'battle'; S.preview = null;
    const [p1, p2] = S.pick;
    S.fighters = [fighter(p1.m, p1.f, 0), fighter(p2.m, p2.f, 1)];
    const needs = S.fighters.flatMap(F => [F.m.marche.image, ...Object.values(F.m.animations).map(a => a.image),
      ...F.f.attaques.flatMap(a => [a.image, a.effet])].map(p => img(lib(F.m, F.f.dossier + p)).ready));
    ui.innerHTML = `<div class="ar-battle"><div class="ar-hudrow" id="hud"></div>
      <div class="ar-box"><div class="ar-log" id="log">Les créatures entrent dans l'arène…</div><div class="ar-acts" id="acts"></div></div></div>`;
    hud();
    await Promise.all(needs);
    await Promise.all(S.fighters.map(F => walk(F, F.home, 900)));
    say(`${S.fighters[0].name} affronte ${S.fighters[1].name} !`);
    await sleep(700);
    loop();
  }
  function chooseAction(F, label) {
    return new Promise(done => {
      const acts = $('#acts');
      say(label);
      const n = F.card.attaques.length;
      acts.classList.toggle('many', n > 2);
      acts.innerHTML = F.card.attaques.map((a, i) => {
        const foe = S.fighters[1 - F.side], e = a.effet ? 1 : effect(a, foe);
        return `<button class="ar-btn dark ar-act" data-a="${i}"><b>${i + 1}. ${esc(a.nom)}</b><small>${esc(a.element)} · ${GENRE[a.genre] || esc(a.genre)} · ${moveInfo(a)}${e > 1 ? ' · efficace' : e < 1 ? ' · peu efficace' : ''}</small></button>`;
      }).join('') + `<button class="ar-btn dark ar-act" data-a="garde"><b>${n + 1}. Garde</b><small>moitié moins de dégâts</small></button>`;
      const pickIt = v => { acts.innerHTML = ''; view.removeEventListener('keydown', key); done(v); };
      const key = e => { const k = +e.key; if (k >= 1 && k <= n) pickIt(k - 1); if (k === n + 1) pickIt('garde'); };
      view.addEventListener('keydown', key);
      $$('#acts [data-a]').forEach(b => b.onclick = () => pickIt(b.dataset.a === 'garde' ? 'garde' : +b.dataset.a));
      view.querySelector('.ar').focus();
    });
  }
  async function loop() {
    const [a, b] = S.fighters;
    while (S.screen === 'battle' && a.hp > 0 && b.hp > 0) {
      const ca = await chooseAction(a, S.mode === 'duel' ? `Joueur 1 · ${a.name}` : `Que fait ${a.name} ?`);
      if (S.screen !== 'battle') return;
      const cb = S.mode === 'duel' ? await chooseAction(b, `Joueur 2 · ${b.name}`) : cpuChoice(b, a);
      if (S.screen !== 'battle') return;
      a.guard = ca === 'garde'; b.guard = cb === 'garde';
      const pri = (F, act) => F.card.attaques[act]?.priorite || 0;  // une rafale part avant tout le reste
      const sa = speedOf(a) + 1000 * pri(a, ca), sb = speedOf(b) + 1000 * pri(b, cb);
      const order = sa > sb || (sa === sb && Math.random() < .5) ? [[a, ca, b], [b, cb, a]] : [[b, cb, a], [a, ca, b]];
      a.acted = b.acted = a.flinch = b.flinch = false;
      for (const [F, act, T] of order) {
        if (F.hp <= 0 || T.hp <= 0) continue;
        F.acted = true;
        if (await blocked(F)) { if (F.hp <= 0) { await knockOut(F, T); return; } continue; }
        if (act === 'garde') { say(`${F.name} se met en garde.`); await sleep(650); continue; }
        await attack(F, act, T);
        if (T.hp <= 0) { await knockOut(T, F); return; }
        if (F.hp <= 0) { await knockOut(F, T); return; }  // le contrecoup
      }
      a.guard = b.guard = false;
      for (const [F, O] of [[a, b], [b, a]]) {  // fin du tour : brûlure et poison rongent les PV
        if (!(await tick(F))) continue;
        await knockOut(F, O);
        return;
      }
    }
  }
  async function blocked(F) {  // peur, gel, sommeil, paralysie, confusion : le tour peut sauter
    if (F.flinch) { say(`${F.name} recule de peur et n'attaque pas !`); await sleep(750); return true; }
    const st = F.status;
    if (!st) return false;
    if (st.nom === 'sommeil') { say(`${F.name} dort profondément.`); await sleep(750); return true; }
    if (st.nom === 'confusion' && Math.random() < 1 / 3) {
      const d = damage(F, { puissance: 40, element: '' }, { ...F, guard: false }, .5, 1).dmg;
      F.hp = Math.max(0, F.hp - d);
      play(F, 'degats');
      pop(F.x - 8, GROUND - 76, '-' + d, 'weak');
      say(`${F.name}, confus, se blesse tout seul (-${d} PV) !`);
      await drain(F, F.hp);
      await sleep(600);
      if (F.hp > 0) play(F, 'attente');
      return true;
    }
    if (st.nom === 'gel') {
      if (Math.random() < .3 || st.turns <= 0) { F.status = null; hud(); say(`La glace qui retenait ${F.name} fond !`); await sleep(650); return false; }
      st.turns--; say(`${F.name}, pris dans la glace, ne peut pas bouger.`); await sleep(750); return true;
    }
    if (st.nom === 'paralysie' && Math.random() < .25) { say(`La paralysie empêche ${F.name} d'agir !`); await sleep(750); return true; }
    return false;
  }
  async function tick(F) {  // rend vrai si la créature tombe K.O.
    const st = F.status;
    if (!st || F.hp <= 0) return false;
    const rule = STATUS[st.nom] || {};
    if (rule.tick) {
      const d = Math.max(1, Math.round(F.max * rule.tick));
      F.hp = Math.max(0, F.hp - d);
      pop(F.x - 8, GROUND - 76, '-' + d, 'weak');
      say(`${F.name} souffre de ${st.nom} (-${d} PV).`);
      await drain(F, F.hp);
      await sleep(350);
    }
    const back = { sommeil: `${F.name} se réveille !`, confusion: `${F.name} retrouve ses esprits.`,
      'éblouissement': `${F.name} y voit de nouveau clair.`, saignement: `La plaie de ${F.name} se referme.`,
      poison: `${F.name} se remet de la morsure du poison.` }[st.nom] || `${F.name} se remet de la ${st.nom}.`;
    if (--st.turns <= 0 && F.hp > 0) { F.status = null; hud(); say(back); await sleep(500); }
    return F.hp <= 0;
  }
  async function heal(F, pct) {
    const before = F.hp;
    F.hp = Math.min(F.max, F.hp + Math.round(F.max * pct / 100));
    pop(F.x - 8, GROUND - 76, '+' + (F.hp - before), 'good');
    say(F.hp > before ? `${F.name} récupère ${F.hp - before} PV.` : `${F.name} est déjà en pleine forme.`);
    await drain(F, F.hp);
  }
  async function raise(F, k, n) {  // un cran de statistique, de -3 à +3
    const was = F.st[k] || 0, now = Math.max(-3, Math.min(3, was + n));
    F.st[k] = now;
    hud();
    say(now === was ? `${STAT_FR[k]} de ${F.name} ne peut plus ${n > 0 ? 'monter' : 'baisser'}.`
      : `${STAT_FR[k]} de ${F.name} ${n > 0 ? 'augmente' : 'baisse'}${Math.abs(now - was) > 1 ? ' beaucoup' : ''} !`);
    await sleep(550);
  }
  async function effects(F, mv, T, self) {  // baisses et hausses de statistiques, chacune avec sa chance
    for (const e of mv.effets || []) {
      if ((e.cible === 'soi') !== self || (!self && T.hp <= 0)) continue;
      if (Math.random() * 100 < e.chance) await raise(self ? F : T, e.stat, e.niveaux);
    }
  }
  async function support(F, mv) {  // soin ou renfort : sur elle-même
    const pct = mv.soin ?? mv.effet?.soin;
    if (pct) await heal(F, pct);
    if (mv.purge && F.status) { say(`${F.name} n'est plus sous l'effet de ${F.status.nom}.`); F.status = null; hud(); await sleep(500); }
    if (mv.effets) await effects(F, mv, F, true);
    else if (mv.genre === 'renfort') await raise(F, 'attaque', 1);  // ancienne fiche : renfort = attaque
  }
  async function attack(F, n, T) {
    const mv = F.card.attaques[n], anim = F.f.attaques[n], name = 'attaque' + (n + 1), kind = reach(mv);
    const ranged = kind === 'distance', still = kind !== 'contact';  // zone et soutien : sans bouger
    say(`${F.name} lance ${mv.nom} !`);
    const ms = anim.ms, hitAt = ms[0] + ms[1];
    if (kind === 'soi') {
      play(F, name);
      await sleep(hitAt);
      await support(F, mv);
      await sleep(Math.max(0, animMs(F, name) - hitAt));
      play(F, 'attente');
      await sleep(250);
      return;
    }
    if (!still) await walk(F, T.x + (F.side ? 46 : -46), 280);
    play(F, name, ranged ? { noFx: [2, 3] } : {});
    await sleep(ranged ? ms[0] : hitAt);
    if (ranged) {  // le projectile traverse l'arène, puis l'impact éclate sur la cible
      const r = row(F), dec = anim.decalages[F.dir]?.[1] || { x: 0, y: 0 };
      const bolt = { sheet: lib(F.m, F.f.dossier + anim.effet), col: 1, row: r, x0: F.x - 32 + dec.x + 32, x1: T.x, y: GROUND - 62 + dec.y, t0: performance.now(), ms: 320 };
      S.bolts.push(bolt);
      await sleep(320);
      S.bolts = S.bolts.filter(x => x !== bolt);
      const burst = { sheet: bolt.sheet, col: 2, row: r, x0: T.x, x1: T.x, y: GROUND - 62 + dec.y, t0: performance.now(), ms: 1 };
      S.bolts.push(burst);
      setTimeout(() => { S.bolts = S.bolts.filter(x => x !== burst); }, 260);
    }
    await hit(F, mv, T);
    await sleep(Math.max(0, animMs(F, name) - (ranged ? ms[0] : hitAt)));
    play(F, 'attente');
    if (!still) await walk(F, F.home, 320);
    await sleep(250);
  }
  async function hit(F, mv, T) {
    if (Math.random() > hitChance(F, mv)) { say(`${T.name} esquive ${mv.nom} !`); pop(T.x - 14, GROUND - 76, 'raté', 'weak'); await sleep(650); return; }
    const n = mv.coups ? mv.coups[0] + Math.floor(Math.random() * (mv.coups[1] - mv.coups[0] + 1)) : 1;
    let total = 0, r;
    for (let i = 0; i < n && T.hp > 0; i++) {  // coups multiples : chacun peut être critique
      r = damage(F, mv, T);
      total += r.dmg;
      T.hp = Math.max(0, T.hp - r.dmg);
      play(T, 'degats');
      S.shake = performance.now() + (r.crit || r.eff > 1 ? 320 : 180);
      pop(T.x - 8 + 6 * i, GROUND - 76 - 8 * i, '-' + r.dmg, r.crit ? 'crit' : r.eff > 1 ? 'good' : r.eff < 1 ? 'weak' : '');
      if (r.crit) pop(T.x - 18, GROUND - 92, 'Coup critique !', 'crit');
      if (n > 1) await sleep(180);
    }
    r.dmg = total;
    const words = r.eff > 1 ? ' C\'est très efficace !' : r.eff < 1 ? ' Ce n\'est pas très efficace…' : '';
    say(`${mv.nom} inflige ${r.dmg} dégâts${n > 1 ? ` en ${n} coups` : ''}${T.guard ? ' (garde)' : ''}.${words}`);
    await drain(T, T.hp);
    if (mv.drain && F.hp < F.max) {
      const before = F.hp;
      F.hp = Math.min(F.max, F.hp + Math.max(1, Math.round(total * mv.drain / 100)));
      pop(F.x - 8, GROUND - 76, '+' + (F.hp - before), 'good');
      say(`${F.name} absorbe ${F.hp - before} PV.`);
      await drain(F, F.hp);
    }
    if (mv.recul) {
      const d = Math.max(1, Math.round(total * mv.recul / 100));
      F.hp = Math.max(0, F.hp - d);
      pop(F.x - 8, GROUND - 76, '-' + d, 'weak');
      say(`${F.name} subit le contrecoup (-${d} PV).`);
      await drain(F, F.hp);
    }
    const rule = mv.statut && STATUS[mv.statut.nom] || { turns: 3 };
    if (mv.statut && T.hp > 0 && Math.random() * 100 < mv.statut.chance) {
      if (rule.flinch) {
        if (!T.acted) { T.flinch = true; say(`${T.name} est effrayé !`); await sleep(500); }
      } else if (!T.status) {
        T.status = { nom: mv.statut.nom, turns: typeof rule.turns === 'function' ? rule.turns() : rule.turns };
        hud();
        await sleep(500);
        say(rule.on ? rule.on(T.name) : `${T.name} subit ${mv.statut.nom} !`);
        await sleep(600);
        if (mv.statut.nom === 'saignement') await raise(T, 'defense', -1);
      }
    }
    if (F.hp > 0) await effects(F, mv, T, true);
    await effects(F, mv, T, false);
    setTimeout(() => { if (T.anim.name === 'degats' && T.hp > 0) play(T, 'attente'); }, animMs(T, 'degats'));
  }
  async function knockOut(T, winner) {
    await sleep(300);
    play(T, 'ko');
    say(`${T.name} est K.O. !`);
    await sleep(animMs(T, 'ko') + 500);
    T.alpha = 0;
    const w = { slug: winner.m.slug, form: winner.f.id }, l = { slug: T.m.slug, form: T.f.id };
    call('result', { winner: w, loser: l }).then(r => { S.records = r; }).catch(() => {});
    result(winner);
  }
  function result(W2) {
    S.screen = 'result';
    const who = S.mode === 'duel' ? `Joueur ${W2.side + 1} gagne !` : W2.side === 0 ? 'Victoire !' : 'Défaite…';
    const portrait = W2.m.portrait ? `<img class="ar-portrait big" src="${lib(W2.m, W2.f.dossier + 'portrait.png')}" alt="">` : '';
    ui.innerHTML = `<div class="ar-result"><div class="ar-banner ${W2.side === 0 || S.mode === 'duel' ? 'win' : 'lose'}">${who}</div>
      ${portrait}<div class="ar-wname">${esc(W2.name)} remporte le combat avec ${Math.ceil(W2.hp)} PV restants.</div>
      <div class="ar-col row">${btn('rAgain', 'Revanche', 'go')}${btn('rPick', 'Autres créatures')}${btn('rMenu', 'Menu')}</div></div>`;
    $('#rAgain').onclick = () => battle();
    $('#rPick').onclick = () => select(S.mode);
    $('#rMenu').onclick = menu;
  }

  // ---------------------------------------------------------------- palmarès
  async function records() {
    S.screen = 'records';
    try { S.records = await call('records'); } catch { S.records = {}; }
    const rows = [];
    for (const m of S.roster) for (const f of m.formes) {
      const r = S.records[m.slug + '/' + f.id] || { v: 0, d: 0 };
      rows.push({ m, f, ...r, n: r.v + r.d });
    }
    rows.sort((x, y) => y.v - x.v || (y.v / (y.n || 1)) - (x.v / (x.n || 1)));
    ui.innerHTML = `<div class="ar-records"><div class="ar-top"><span class="ar-who">Palmarès</span>${btn('pBack', 'Retour')}</div>
      <div class="ar-rlist">${rows.length ? rows.map((r, i) => `<div class="ar-rrow"><span class="ar-rank">${i + 1}</span>
        <img src="${lib(r.m, r.f.dossier + 'sheet.png')}" style="object-position:-64px 0" alt=""><b>${esc(r.f.nom)}</b>
        <span class="ar-rare r${RAR.indexOf(r.f.combat.rarete)}">${esc(r.f.combat.rarete)}</span>
        <em>${r.v} V · ${r.d} D</em><span class="ar-ratio">${r.n ? Math.round(100 * r.v / r.n) + ' %' : '—'}</span></div>`).join('')
        : '<div class="ar-hint">Aucune créature pour l\'instant.</div>'}</div></div>`;
    $('#pBack').onclick = menu;
  }

  view.addEventListener('keydown', e => { if (e.key === 'Escape' && S.screen !== 'menu') { S.screen = 'menu'; menu(); } });
  menu();
}

export const _test = { damage, effect, hpMax, cpuChoice, typeOf, reach, atkOf, speedOf, STATUS, hitChance, STAGE };
