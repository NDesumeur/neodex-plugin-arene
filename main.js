// NeoBestiary Arène, volet système : lit (sans jamais les modifier) les créatures de NeoBestiary Studio, rangées dans
// Documents\NeoBestiary Studio\creatures\<créature>\arene.json, sert leurs images sur neoplugin://neobase.arene/lib/
// et garde le palmarès des combats.
const { app } = require('electron');
const fs = require('fs'), path = require('path');

const UI = path.join(__dirname, 'ui');
const CREATURES = () => path.join(app.getPath('documents'), 'NeoBestiary Studio', 'creatures');
const TYPES = { '.css': 'text/css; charset=utf-8', '.woff': 'font/woff', '.png': 'image/png', '.json': 'application/json' };
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
  out.sort((a, b) => (b.mis_a_jour || 0) - (a.mis_a_jour || 0));
  return { studio: true, creatures: out };
}

module.exports = ({ ipcMain, protocol, serveFile, readDoc, writeDoc }) => {
  ipcMain.handle('roster', () => roster());
  ipcMain.handle('records', () => readDoc('palmares') || {});
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

  // neoplugin://neobase.arene/ui/<fichier> | lib/<créature>/<chemin>
  protocol(async req => {
    const u = new URL(req.url), [, kind, ...rest] = u.pathname.split('/'), rel = decodeURIComponent(rest.join('/'));
    const file = kind === 'ui' ? inside(UI, rel) : kind === 'lib' ? inside(CREATURES(), rel) : null;
    if (!file || !fs.existsSync(file)) return new Response('', { status: 404 });
    return serveFile(file, req, TYPES[path.extname(file).toLowerCase()]);
  });
};
