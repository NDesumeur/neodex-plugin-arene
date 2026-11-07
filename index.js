// NeoBestiary Arène : les créatures de NeoBestiary Studio s'affrontent au tour par tour dans une arène en pixel art.
// La scène est un canevas 320x180 agrandi sans lissage ; les textes et boutons sont posés par-dessus (640x360 virtuels).
const ID = 'neodex.arene', U = 'neoplugin://' + ID + '/';
const W = 320, H = 180, GROUND = 124;
const RAR = ['commun', 'peu commun', 'rare', 'épique', 'légendaire', '???'];  // ??? : la créature unique, n° 0
const ELEMENTS = ['feu', 'eau', 'plante', 'vent', 'roche', 'glace', 'foudre', 'lumière', 'ombre', 'esprit', 'acier', 'poison', 'insecte', 'fée', 'son'];
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
const typeChips = t => String(t || '').split(' et ').map(x => `<span class="ar-chip">${esc(x)}</span>`).join('');  // un badge par type (« feu et vent »)
const XM = { 4: '×4', 2: '×2', .5: '×½', .25: '×¼', 0: '×0' };
function effect(move, target) {  // multiplicateur d'élément contre la créature visée : table des types du Studio (×4 à ×0)
  const m = target.card.multiplicateurs;
  if (m) return m[move.element] ?? 1;
  if (target.card.faiblesses.includes(move.element)) return 1.5;  // fiches d'avant la table des types
  if (target.card.resistances.includes(move.element)) return .67;
  return 1;
}
const atkOf = F => F.card.stats.attaque * stage(F, 'attaque') * (F.status?.nom === 'brûlure' ? .75 : 1);
const defOf = F => F.card.stats.defense * stage(F, 'defense');
const speedOf = F => F.card.stats.vitesse * stage(F, 'vitesse') * (F.status?.nom === 'paralysie' ? .5 : 1);
// chance de toucher (0..1) : précision de l'attaque, crans de précision, éblouissement
const hitChance = (F, mv) => Math.min(1, (mv.precision || 100) / 100 * stage(F, 'precision') * (F.status?.nom === 'éblouissement' ? 2 / 3 : 1));
function damage(att, move, def, roll = Math.random(), critRoll = Math.random()) {
  const stab = String(att.type || '').split(' et ').includes(move.element) ? 1.2 : 1;  // un type double (« ombre et lumière ») compte ses deux éléments
  const crit = critRoll < (move.critique || 1) / 16 ? 1.5 : 1;
  const base = move.puissance * (atkOf(att) / Math.max(1, defOf(def))) * .45;
  const dmg = effect(move, def) === 0 ? 0 : Math.max(1, Math.round(base * stab * effect(move, def) * (.9 + .15 * roll) * crit * (def.guard ? .5 : 1)));
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
    // une créature qui flotte (arene.json : marche.flotte) : la même image, un lent va-et-vient vertical, sauf K.O.
    const bob = F.m.marche?.flotte && F.anim.name !== 'ko' ? Math.round(Math.sin(t / 290) * 3) - 3 : 0;
    const fr = frameOf(F, t), sx = Math.round(F.x - 32), sy = GROUND - 62 + bob, r = row(F);
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
  const S = { screen: 'menu', roster: [], records: {}, fighters: [], shake: 0, bolts: [], walkers: [], mode: 'cpu', pick: [], sig: [], dim: 0, flash: 0, parts: [], rings: [], zoom: null, lt: 0, flashC: '255,236,255' };
  let alive = true;
  function frame(t) {
    if (!view.isConnected) { alive = false; ro.disconnect(); stopMusic(); return; }
    g.save();
    if (S.shake > t) g.translate(Math.round(rnd(-3, 3)), Math.round(rnd(-2, 2)));
    const z = S.zoom;  // coup de zoom sur l'impact d'une attaque signature
    if (z && t < z.t0 + z.ms && t > z.t0) { const k = 1 + z.k * Math.sin(Math.PI * (t - z.t0) / z.ms); g.translate(z.x, z.y); g.scale(k, k); g.translate(-z.x, -z.y); }
    drawDeco(t);
    if (S.dim) { g.fillStyle = `rgba(10,4,24,${S.dim})`; g.fillRect(0, 0, W, H); }  // attaque signature : l'arène s'assombrit
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
    for (const o of S.sig) {  // attaques signature de NeoMe : planches de 10 images de 128 px (ui/neome)
      const e = img(o.sheet), dt = t - o.t0;
      if (!loaded(e) || dt < 0) continue;
      const i = o.loop ? Math.floor(dt / o.ms) % 10 : Math.min(9, Math.floor(dt / o.ms)), k = o.travel ? Math.min(1, dt / o.travel) : 0;
      g.save(); g.translate(Math.round(o.x + ((o.x1 ?? o.x) - o.x) * k), Math.round(o.y)); if (o.flip) g.scale(-1, 1);
      for (const glow of o.crisp ? [0] : [0, 1]) {  // l'effet, puis son halo (couleurs additionnées) ; pas de halo pour une planche créée : il brûle les détails
        if (glow) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = .55; }
        if (o.beam) g.drawImage(e, i * 128, o.row * 128, 128, 128, 0, -o.size / 2, o.beam, o.size);
        else g.drawImage(e, i * 128, o.row * 128, 128, 128, -o.size / 2, -o.size / 2, o.size, o.size);
      }
      g.restore();
    }
    // ondes de choc et particules des attaques signature
    const dt = Math.min(50, t - (S.lt || t)); S.lt = t;
    S.rings = S.rings.filter(r => t - r.t0 < r.ms);
    for (const r of S.rings) {
      const k = (t - r.t0) / r.ms; if (k < 0) continue;
      const rad = r.r0 + (r.r1 - r.r0) * (1 - (1 - k) ** 3);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k; g.strokeStyle = r.c; g.lineWidth = Math.max(1, r.w * (1 - k));
      g.beginPath(); g.ellipse(r.x, r.y, rad, rad * r.flat, 0, 0, 7); g.stroke(); g.restore();
    }
    S.parts = S.parts.filter(p => t - p.t0 < p.life);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of S.parts) {
      if (t < p.t0) continue;
      if (p.to) { p.vx += (p.to.x - p.x) * .012 * dt / 16; p.vy += (p.to.y - p.y) * .012 * dt / 16; p.vx *= .9; p.vy *= .9; }  // aspirée vers NeoMe
      p.vy += (p.grav || 0) * dt / 16; p.x += p.vx * dt / 16; p.y += p.vy * dt / 16;
      g.globalAlpha = Math.max(0, 1 - (t - p.t0) / p.life); g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    g.restore();
    if (S.flash > t) { g.fillStyle = `rgba(${S.flashC},${Math.min(.7, (S.flash - t) / 260 * .55)})`; g.fillRect(0, 0, W, H); }
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
  // ---------------------------------------------------------------- musique et sac (créations du Studio)
  const COMBAT_MOODS = ['tendue', 'epique', 'épique', 'sombre', 'combat', 'heroique', 'héroïque'];
  function stopMusic() { if (S.audio) { S.audio.pause(); S.audio = null; } }
  function startMusic() {
    stopMusic();
    const pick = S.prefs.music, list = S.musics, fit = list.filter(m => COMBAT_MOODS.some(k => (m.ambiance || '').toLowerCase().includes(k)));
    const m = pick === '' || pick === undefined ? null : pick === '*' ? (fit.length ? fit : list)[Math.floor(Math.random() * (fit.length || list.length))] : list.find(x => x.slug === pick);
    if (!m) return;
    S.audio = new Audio(`${U}mus/${encodeURIComponent(m.slug)}/musique.mp3`); S.audio.loop = true; S.audio.volume = .45;
    S.audio.play().catch(() => {});
  }
  async function useItem(F, it) {
    F.bag.delete(it.slug);
    say(`${F.name} utilise ${it.nom} !`); await sleep(600);
    const c = it.combat;
    if (c.soin) await heal(F, c.soin);
    if (c.purge && F.status) { say(`${F.name} n'est plus sous l'effet de ${F.status.nom}.`); F.status = null; hud(); await sleep(500); }
    if (c.stat) await raise(F, c.stat, c.niveaux || 1);
  }
  async function menu() {
    S.screen = 'menu'; S.fighters = []; S.bolts = []; stopMusic();
    try { S.roster = (await call('roster')).creatures; S.studio = true; } catch (e) { S.roster = []; S.err = e.message; }
    try { const s = await call('studio'); S.musics = s.musics; S.items = s.items; S.prefs = s.prefs; } catch { S.musics = []; S.items = []; S.prefs = {}; }
    const n = S.roster.length;
    ui.innerHTML = `<div class="ar-menu">
      <div class="ar-logo"><small>NeoBestiary</small><b>Arène</b></div>
      <div class="ar-col">
        ${btn('mCpu', 'Combat contre l\'ordinateur', 'go')}
        ${btn('mDuel', 'Duel à deux joueurs')}
        ${btn('mRec', 'Palmarès')}
        <label class="ar-hint">Musique du combat <select id="mMus" class="ar-sel"><option value="">Aucune</option>${S.musics.length ? `<option value="*">Au hasard (tendue ou épique d'abord)</option>` : ''}${S.musics.map(m => `<option value="${esc(m.slug)}">${esc(m.nom)}</option>`).join('')}</select></label>
        <div class="ar-hint">${S.items.length ? `Sac : ${S.items.length} objet${S.items.length > 1 ? 's' : ''} de combat du Studio, chacun utilisable une fois par combat.` : 'Crée de la nourriture, des potions ou des armes dans le Studio : elles iront dans ton sac.'}</div>
      </div>
      <div class="ar-hint">${n ? `${n} créature${n > 1 ? 's' : ''} prête${n > 1 ? 's' : ''} au combat` :
        'Aucune créature prête : crées-en dans NeoBestiary Studio (avec leur fiche de combat).'}</div></div>`;
    $('#mCpu').disabled = $('#mDuel').disabled = !n;
    $('#mCpu').onclick = () => select('cpu');
    $('#mDuel').onclick = () => select('duel');
    $('#mRec').onclick = records;
    $('#mMus').value = S.musics.some(m => m.slug === S.prefs.music) || S.prefs.music === '*' ? S.prefs.music : '';
    $('#mMus').onchange = e => call('prefs', { music: e.target.value }).then(p => { S.prefs = p; }).catch(() => {});
    spawnWalker();
  }

  const moveInfo = a => a.effet_texte ? (a.puissance ? `${a.puissance} · ` : '') + a.effet_texte  // fiches du Studio 1.4+
    : a.effet?.soin ? `soin ${a.effet.soin} %` : a.effet?.attaque ? 'attaque +1'
    : `${a.puissance}${a.statut ? ` · ${STATUS[a.statut.nom]?.verb || a.statut.nom} ${a.statut.chance} %` : ''}`;
  function cardHtml(m, f) {
    const k = f.combat, r = RAR.indexOf(k.rarete), chips = (l, cls) => l.map(t => `<span class="ar-chip ${cls}">${esc(t)}</span>`).join(' ') || '—';
    return `<div class="ar-detail">
      <div class="ar-dhead"><b>${esc(f.nom)}</b><span class="ar-rare r${r}">${esc(k.rarete)}</span>${typeChips(typeOf(m, f))}</div>
      <div class="ar-stats">${[['pv', 'PV'], ['attaque', 'Attaque'], ['defense', 'Défense'], ['vitesse', 'Vitesse']].map(([s, l]) =>
        `<span>${l}</span><i><b style="width:${Math.min(100, k.stats[s])}%"></b></i><em>${k.stats[s]}</em>`).join('')}</div>
      <div class="ar-weak">Faible : ${chips(k.faiblesses.map(e => e + (XM[k.multiplicateurs?.[e]] ? ' ' + XM[k.multiplicateurs[e]] : '')), 'bad')}<br>Résiste : ${chips(k.resistances.map(e => e + (XM[k.multiplicateurs?.[e]] ? ' ' + XM[k.multiplicateurs[e]] : '')), 'good')}${(k.immunites || []).length ? `<br>Immunisé : ${chips(k.immunites, 'good')}` : ''}</div>
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
      <div class="ar-hpname"><b>${esc(F.name)}</b><span class="ar-rare r${RAR.indexOf(F.card.rarete)}">${esc(F.card.rarete)}</span>${typeChips(F.type)}${F.status ? `<span class="ar-chip bad">${esc(F.status.nom)}</span>` : ''}${Object.entries(F.st).filter(([, v]) => v).map(([k, v]) => `<span class="ar-chip ${v > 0 ? 'good' : 'bad'}">${STAT_SHORT[k]} ${v > 0 ? '+' : ''}${v}</span>`).join('')}</div>
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
    for (const F of S.fighters) F.bag = new Set(S.mode === 'duel' || !F.side ? S.items.map(i => i.slug) : []);  // l'ordinateur n'a pas de sac
    startMusic();
    const needs = S.fighters.flatMap(F => [F.m.marche.image, ...Object.values(F.m.animations).map(a => a.image),
      ...F.f.attaques.flatMap(a => [a.image, a.effet])].map(p => img(lib(F.m, F.f.dossier + p)).ready)
      .concat(F.m.slug === 'neome' ? Object.keys(SIG).map(v => img(`${U}ui/neome/${v}.png`).ready) : []));
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
        return `<button class="ar-btn dark ar-act" data-a="${i}"><b>${i + 1}. ${esc(a.nom)}</b><small>${esc(a.element)} · ${GENRE[a.genre] || esc(a.genre)} · ${moveInfo(a)}${e === 0 ? ' · aucun effet' : e >= 4 ? ' · super efficace ×4' : e > 1 ? ' · efficace' : e < 1 ? ' · peu efficace' : ''}</small></button>`;
      }).join('') + `<button class="ar-btn dark ar-act" data-a="garde"><b>${n + 1}. Garde</b><small>moitié moins de dégâts</small></button>`
        + (F.bag.size ? `<button class="ar-btn dark ar-act" data-a="sac"><b>${n + 2}. Sac</b><small>${F.bag.size} objet${F.bag.size > 1 ? 's' : ''}</small></button>` : '');
      acts.classList.toggle('many', n + (F.bag.size ? 2 : 1) > 3);
      const pickIt = v => { acts.innerHTML = ''; view.removeEventListener('keydown', key); done(v); };
      const bag = () => {  // le sac : un objet = le tour de la créature
        const list = S.items.filter(i => F.bag.has(i.slug));
        acts.innerHTML = list.map((it, i) => `<button class="ar-btn dark ar-act ar-item" data-i="${i}"><img src="${U}obj/${encodeURIComponent(it.slug)}/${it.icone}" alt=""><b>${esc(it.nom)}</b><small>${esc(it.combat.texte)}</small></button>`).join('')
          + `<button class="ar-btn dark ar-act" data-back="1"><b>Retour</b></button>`;
        $$('#acts [data-i]').forEach(b => b.onclick = () => pickIt({ item: list[+b.dataset.i] }));
        $('#acts [data-back]').onclick = () => { view.removeEventListener('keydown', key); chooseAction(F, label).then(done); };
      };
      const key = e => { const k = +e.key; if (k >= 1 && k <= n) pickIt(k - 1); if (k === n + 1) pickIt('garde'); if (k === n + 2 && F.bag.size) bag(); };
      view.addEventListener('keydown', key);
      $$('#acts [data-a]').forEach(b => b.onclick = () => b.dataset.a === 'sac' ? bag() : pickIt(b.dataset.a === 'garde' ? 'garde' : +b.dataset.a));
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
        if (act?.item) { await useItem(F, act.item); continue; }
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
  // NeoMe (n° 0) a seul ses attaques signature : dessinées par le modèle du Studio, en grand, avec leur mise en scène
  const SIG = { eclipse: 1, regard: 1, casque: 1, coquille: 1 };
  async function signature(F, T, mv, name, v) {
    const sheet = `${U}ui/neome/${v}.png`, cy = GROUND - 30, dir = F.side ? -1 : 1, now = () => performance.now();
    const add = o => (S.sig.push({ t0: now(), ...o }), S.sig[S.sig.length - 1]), drop = (...o) => { S.sig = S.sig.filter(x => !o.includes(x)); };
    const boom = (ms = 260, c = '255,236,255') => { S.flash = now() + ms; S.flashC = c; S.shake = now() + ms * 2; };
    const NEO = ['#ff4fd8', '#b06bff', '#ffd84a', '#ffffff', '#7a2fd0'], NOTE = ['#ff4fd8', '#5ef0ff', '#ffffff', '#b06bff'];
    // des éclats qui jaillissent, des éclats aspirés vers un point (la charge), une onde de choc, un coup de zoom
    const burst = (x, y, n, cols, sp = 3, life = 700, o = {}) => { for (let k = 0; k < n; k++) { const a = rnd(0, 6.283), v = rnd(.3, 1) * sp; S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), c: cols[k % cols.length], s: Math.random() < .3 ? 2 : 1, life: rnd(.6, 1) * life, t0: now() + (o.delay ? rnd(0, o.delay) : 0), grav: o.grav ?? .05 }); } };
    const suck = (x, y, n, cols, r = 60, life = 520) => { for (let k = 0; k < n; k++) { const a = rnd(0, 6.283), d = rnd(.5, 1) * r; S.parts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * .7, vx: 0, vy: 0, to: { x, y }, c: cols[k % cols.length], s: 1 + (k % 3 === 0), life, t0: now() + rnd(0, life * .5) }); } };
    const ring = (x, y, r1, c, ms = 520, w = 4, o = {}) => S.rings.push({ x, y, r0: o.r0 || 4, r1, c, ms, w, flat: o.flat || .55, t0: now() + (o.delay || 0) });
    const punch = (x, y, k = .12, ms = 260) => { S.zoom = { x, y, k, ms, t0: now() }; };
    S.dim = .72; play(F, name, { noFx: [0, 1, 2, 3] });  // ses petits effets de base laissent la place à la planche signature
    if (v === 'eclipse') {  // l'ombre se forme sur lui, s'embrase et s'ouvre en anneau qui balaie l'arène
      suck(F.x, cy - 8, 70, ['#7a2fd0', '#b06bff', '#ff4fd8'], 90, 560);
      const a = add({ sheet, row: 0, x: F.x, y: cy - 8, ms: 80, size: 210 });
      await sleep(480); boom(320, '255,216,74'); punch(F.x, cy - 8, .16, 320);
      ring(F.x, cy - 6, W, '#ffd84a', 650, 6); ring(F.x, cy - 6, W * .8, '#ff4fd8', 600, 4, { delay: 90 }); ring(F.x, cy - 6, W * .6, '#ffffff', 520, 3, { delay: 160 });
      burst(F.x, cy - 8, 90, NEO, 4.5, 900, { grav: .03 });
      const b = add({ sheet, row: 2, x: T.x, y: cy - 4, ms: 60, size: 180 });
      burst(T.x, cy - 6, 50, ['#ffd84a', '#ffffff', '#7a2fd0'], 3.5, 700, { delay: 120 });
      await hit(F, mv, T); await sleep(220); drop(a, b);
    } else if (v === 'regard') {  // ses yeux se chargent, puis deux rayons traversent l'arène
      suck(F.x + dir * 4, cy - 12, 40, ['#ffd84a', '#ffffff', '#ff4fd8'], 50, 420);
      const a = add({ sheet, row: 0, x: F.x + dir * 4, y: cy - 12, ms: 45, size: 100 });
      await sleep(420); punch(F.x, cy - 12, .08, 200);
      const beam = add({ sheet, row: 1, x: F.x + dir * 10, y: cy - 12, ms: 40, loop: true, size: 64, beam: Math.max(20, Math.abs(T.x - F.x) - 10), flip: !!F.side });
      for (let k = 0; k < 6; k++) burst(F.x + dir * (20 + k * Math.abs(T.x - F.x) / 7), cy - 12, 6, ['#ffd84a', '#ffffff'], 1.2, 420, { delay: 160, grav: 0 });
      const b = add({ sheet, row: 2, x: T.x, y: cy - 8, ms: 55, size: 160, t0: now() + 90 });
      await sleep(200); boom(280, '255,240,200'); punch(T.x, cy - 8, .14, 280);
      ring(T.x, cy - 8, 90, '#ffd84a', 480, 5); burst(T.x, cy - 8, 60, ['#ffd84a', '#ffffff', '#ff4fd8'], 4, 750);
      await hit(F, mv, T); drop(a, beam); await sleep(160); drop(b);
    } else if (v === 'casque') {  // une onde jaillit du casque, les notes filent jusqu'à l'ennemi et éclatent
      const a = add({ sheet, row: 0, x: F.x, y: cy - 6, ms: 40, size: 160 });
      for (let k = 0; k < 4; k++) ring(F.x, cy - 6, 70 + k * 20, k % 2 ? '#5ef0ff' : '#ff4fd8', 480, 3, { delay: k * 110 });
      await sleep(360);
      const notes = add({ sheet, row: 1, x: F.x + dir * 18, x1: T.x, y: cy - 8, travel: 420, ms: 50, loop: true, size: 96 });
      for (let k = 0; k < 8; k++) burst(F.x + dir * 18 + (T.x - F.x - dir * 18) * k / 8, cy - 8, 5, NOTE, 1, 500, { delay: 60 + k * 50, grav: -.02 });
      await sleep(420); drop(a, notes);
      const b = add({ sheet, row: 2, x: T.x, y: cy - 6, ms: 55, size: 190 }); boom(240, '200,120,255'); punch(T.x, cy - 6, .13, 260);
      ring(T.x, cy - 6, 110, '#5ef0ff', 520, 5); ring(T.x, cy - 6, 80, '#ff4fd8', 480, 4, { delay: 80 }); burst(T.x, cy - 6, 70, NOTE, 3.8, 800);
      await hit(F, mv, T); await sleep(140); drop(b);
    } else {  // coquille : un dôme d'éclats se referme sur lui et le soigne
      const a = add({ sheet, row: 0, x: F.x, y: cy - 6, ms: 95, size: 170 });
      burst(F.x, cy + 6, 40, ['#ffffff', '#ffd4ec', '#ff4fd8'], 2.2, 900, { up: 1.6, grav: .06, delay: 300 });
      await sleep(520); boom(220, '255,216,240'); punch(F.x, cy - 6, .1, 260);
      ring(F.x, cy - 6, 70, '#ffd84a', 520, 4); ring(F.x, cy - 6, 50, '#ffffff', 440, 3, { delay: 100 });
      burst(F.x, cy - 30, 36, ['#ffd84a', '#ffffff'], 1.2, 1100, { grav: .04, delay: 200 });
      await support(F, mv); await sleep(250); drop(a);
    }
    S.dim = 0; play(F, 'attente'); await sleep(250);
  }
  // une attaque créée dans le Studio : sa planche (10 images x 3 temps : lancer, trajet, impact) et sa mise en scène (show)
  async function planche(F, T, mv, name) {
    const P = mv.show, sheet = lib(F.m, F.f.dossier + mv.planche), cy = GROUND - 30, dir = F.side ? -1 : 1, X = [F.x, T.x], t0 = performance.now(), mine = [];
    S.dim = .6; play(F, name, { noFx: [0, 1, 2, 3] });
    for (const [at, row, k, size, ms, o] of P.parts) setTimeout(() => {
      const x = X[k] + dir * (o.dx || 0), p = { t0: performance.now(), sheet, row, x: Math.round(x), y: Math.round(cy + (o.dy || 0)), ms, size, loop: !!(o.beam || o.travel), flip: !!F.side, crisp: true };
      if (o.travel) { p.x1 = T.x; p.travel = o.travel; }
      if (o.beam) p.beam = Math.max(20, Math.abs(T.x - x) - 10);
      S.sig.push(p); mine.push(p);
      if (o.until) setTimeout(() => { S.sig = S.sig.filter(q => q !== p); }, o.until - at);
    }, at);
    for (const [at, k, r1, c, ms, w] of P.rings) S.rings.push({ x: X[k], y: cy - 6, r0: 4, r1, c, ms, w, flat: .55, t0: t0 + at });
    await sleep(P.hitAt);
    S.flash = performance.now() + 90; S.flashC = '255,236,255';
    if (reach(mv) === 'soi') await support(F, mv); else await hit(F, mv, T);
    await sleep(Math.max(0, P.len - (performance.now() - t0)));
    S.sig = S.sig.filter(q => !mine.includes(q)); S.dim = 0; play(F, 'attente'); await sleep(250);
  }
  async function attack(F, n, T) {
    const mv = F.card.attaques[n], anim = F.f.attaques[n], name = 'attaque' + (n + 1), kind = reach(mv);
    const ranged = kind === 'distance', still = kind !== 'contact';  // zone et soutien : sans bouger
    say(`${F.name} lance ${mv.nom} !`);
    const sv = mv.visuel || anim.visuel;
    if (F.m.slug === 'neome' && SIG[sv]) return signature(F, T, mv, name, sv);
    if (mv.planche && mv.show) return planche(F, T, mv, name);
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
    if (effect(mv, T) === 0) { say(`Ça n'affecte pas ${T.name}…`); pop(T.x - 14, GROUND - 76, 'immunisé', 'weak'); await sleep(750); return; }  // immunité : ni dégâts ni statut
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
    const words = r.eff === 0 ? ' Ça n\'a aucun effet…' : r.eff >= 4 ? ' C\'est super efficace !' : r.eff > 1 ? ' C\'est très efficace !' : r.eff < 1 ? ' Ce n\'est pas très efficace…' : '';
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
    S.screen = 'result'; stopMusic();
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
