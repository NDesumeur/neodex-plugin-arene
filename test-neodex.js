// lancé par le test « local » de NeoDex : un combat en équipes de 3 contre l'ordinateur ; les pastilles d'équipe, le bouton
// Changer, la réserve, puis l'entrée de la remplaçante (avec NEO_SHOTS : des images du combat)
module.exports = async ({ pj, js, sleep, shot = async () => {} }) => {
  const run = async c => { try { return await pj(c); } catch (e) { if (/pas de cadre/.test(e.message)) return js(c); throw e; } };
  const q = code => run(`(() => { const v = document.querySelector('.ar'); if (!v) return null; const $ = s => v.querySelector(s), $$ = s => [...v.querySelectorAll(s)]; ${code} })()`);
  for (let i = 0; i < 40 && !await q("return !!$('#mCpu') && !$('#mCpu').disabled"); i++) await sleep(500);
  if (!await q("return !!$('#mCpu') && !$('#mCpu').disabled")) return 'pas de créature du Studio sur ce PC : combat non essayé';
  await q("const s = $('#mTeam'); s.value = '3'; s.dispatchEvent(new Event('change')); return 0"); await sleep(600);
  await q("$('#mCpu').click(); return 0"); await sleep(500);
  for (let k = 0; k < 3; k++) { await q("$$('#grid .ar-cell')[" + k + "].click(); $('#sGo').click(); return 0"); await sleep(400); }
  for (let i = 0; i < 60 && !await q("return !!$('#acts [data-a=\"chg\"]')"); i++) await sleep(500);
  const dots = await q("return $$('.ar-team s').length");
  if (dots !== 6) throw new Error('6 pastilles d\'équipe attendues : ' + dots);
  await shot('1-equipes');
  await q("$('#acts [data-a=\"chg\"]').click(); return 0"); await sleep(300);
  const n = await q("return $$('#acts [data-b]').length");
  if (n !== 2) throw new Error('2 créatures en réserve attendues : ' + n);
  await shot('2-reserve');
  const who = await q("const b = $('#acts [data-b]'); const n = b.querySelector('b').textContent.replace(/^\\d+\\. /, ''); b.click(); return n");
  for (let i = 0; i < 40 && !await q("return !!$('#acts [data-a]')"); i++) await sleep(300);
  const on = await q("return $$('.ar-hp')[0].querySelector('.ar-hpname b').textContent");
  if (on !== who) throw new Error('la remplaçante devait entrer : ' + on + ' au lieu de ' + who);
  await shot('3-changee');
  // les talents : un par créature, affiché dans la barre de vie
  const tal = await q("return $$('.ar-hp .ar-chip.tal').map(x => x.textContent)");
  if (tal.length !== 2 || tal.some(x => !x)) throw new Error('talents attendus dans les barres de vie : ' + JSON.stringify(tal));
  // le Draft : Échap ramène au menu ; 9 créatures, 3 chacun à tour de rôle, l'ordinateur prend les siennes tout seul
  await q("v.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); return 0");
  for (let i = 0; i < 30 && !await q("return !!$('#mTeam') && !$('#mCpu').disabled"); i++) await sleep(300);
  await q("const s = $('#mTeam'); s.value = '9'; s.dispatchEvent(new Event('change')); return 0"); await sleep(600);
  await q("$('#mCpu').click(); return 0"); await sleep(500);
  const cells = await q("return $$('#grid .ar-cell').length");
  if (cells !== 9) throw new Error('9 créatures attendues dans le draft : ' + cells);
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 20 && !await q("return !!$('#sGo')"); i++) await sleep(300);
    if (k === 1) await shot('4-draft');
    await q("$$('#grid .ar-cell:not(.taken)')[0].click(); $('#sGo').click(); return 0"); await sleep(300);
  }
  for (let i = 0; i < 60 && !await q("return !!$('#acts [data-a]')"); i++) await sleep(500);
  const dd = await q("return $$('.ar-team s').length");
  if (dd !== 6) throw new Error('le draft devait finir sur un combat à 3 contre 3 : ' + dd);
  // un tour d'attaque entier (son, recul, éclair, statuts dessinés) : les boutons doivent revenir
  await q("$('#acts [data-a=\"0\"]').click(); return 0");
  let back = false;
  for (let i = 0; i < 80 && !(back = await q("return !!$('#acts [data-a]') || !!$('.ar-result, #rAgain')")); i++) await sleep(250);
  if (!back) throw new Error("le tour d'attaque ne s'est pas terminé");
  await shot('5-attaque');
  return 'équipes de 3, réserve et changement ok (' + who + ') · talents ' + tal.join(', ') + ' · draft ok · tour d’attaque ok';
};
