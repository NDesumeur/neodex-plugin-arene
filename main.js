// NeoBestiary Arène, volet système : lit (sans jamais les modifier) les créatures de NeoBestiary Studio, rangées dans
// Documents\NeoBestiary Studio\creatures\<créature>\arene.json, sert leurs images sur neoplugin://neodex.arene/lib/
// et garde le palmarès des combats.
const { app } = require('electron');
const fs = require('fs'), path = require('path');

const UI = path.join(__dirname, 'ui');
const STUDIO = () => path.join(app.getPath('documents'), 'NeoBestiary Studio'), CREATURES = () => path.join(STUDIO(), 'creatures');
const TYPES = { '.css': 'text/css; charset=utf-8', '.woff': 'font/woff', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg' };
// les créations du Studio : ses musiques (jouées pendant le combat) et ses objets de combat (le sac), lus sans les modifier
function studioList(dir, keep) {
  const d = path.join(STUDIO(), dir), out = [];
  try { for (const slug of fs.readdirSync(d)) { try { const m = JSON.parse(fs.readFileSync(path.join(d, slug, 'item.json'), 'utf8')); const x = keep(m, path.join(d, slug)); if (x) out.push({ slug, ...x }); } catch {} } } catch {}
  return out;
}
const musics = () => studioList('musiques', (m, d) => fs.existsSync(path.join(d, 'musique.mp3')) && { nom: m.nom, ambiance: m.ambiance || '' });
const items = () => studioList('objets', m => m.combat && { nom: m.nom, rarete: m.rarete, combat: m.combat, icone: 'icone_' + (m.version || 0) + '.png' });
const inside = (base, rel) => { const p = path.resolve(base, rel); return p.startsWith(path.resolve(base) + path.sep) ? p : null; };
const key = v => String(v || '').slice(0, 80);

function roster() {
  const dir = CREATURES();
  if (!fs.existsSync(dir)) return { studio: false, creatures: [] };
  const out = [];
  for (const slug of fs.readdirSync(dir)) {
    const f = path.join(dir, slug, 'arene.json');
    try {
      const m = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (m.format === 1 && Array.isArray(m.formes) && m.formes.length) out.push({ ...m, slug });
    } catch { /* créature pas encore prête pour le combat (pas de fiche) */ }
  }
  out.sort((a, b) => (a.numero ?? 1e9) - (b.numero ?? 1e9) || (b.mis_a_jour || 0) - (a.mis_a_jour || 0));  // n° 0 (NeoMe) en tête
  return { studio: true, creatures: out };
}

module.exports = ({ ipcMain, protocol, serveFile, readDoc, writeDoc }) => {
  ipcMain.handle('roster', () => roster());
  ipcMain.handle('records', () => readDoc('palmares') || {});
  ipcMain.handle('studio', () => ({ musics: musics(), items: items(), prefs: readDoc('reglages') || {} }));
  ipcMain.handle('prefs', async (_e, p) => { const o = { ...(readDoc('reglages') || {}), music: String(p?.music ?? '').slice(0, 80) }; await writeDoc('reglages', o); return o; });
  ipcMain.handle('result', async (_e, r) => {  // r = { winner: {slug, form}, loser: {slug, form} }
    const p = readDoc('palmares') || {};
    for (const [who, field] of [[r?.winner, 'v'], [r?.loser, 'd']]) {
      if (!who?.slug) continue;
      const k = key(who.slug) + '/' + key(who.form || 'base');
      p[k] = { v: 0, d: 0, ...(p[k] || {}) };
      p[k][field]++;
    }
    await writeDoc('palmares', p);
    return p;
  });

  // neoplugin://neodex.arene/ui/<fichier> | lib/<créature>/<chemin>
  protocol(async req => {
    const u = new URL(req.url), [, kind, ...rest] = u.pathname.split('/'), rel = decodeURIComponent(rest.join('/'));
    const file = kind === 'ui' ? inside(UI, rel) : kind === 'lib' ? inside(CREATURES(), rel)
      : kind === 'mus' ? inside(path.join(STUDIO(), 'musiques'), rel) : kind === 'obj' ? inside(path.join(STUDIO(), 'objets'), rel) : null;
    if (!file || !fs.existsSync(file)) return new Response('', { status: 404 });
    return serveFile(file, req, TYPES[path.extname(file).toLowerCase()]);
  });
};
