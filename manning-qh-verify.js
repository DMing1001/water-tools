// manning-qh 回归：从 manning-qh.html 抽出 calc 区函数，对比 baseline
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'manning-qh.html'), 'utf8');
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'manning-qh-baseline-expected.json'), 'utf8'));

const start = html.indexOf('function getZ');
const end = html.indexOf('/* ========== UI ==========');
if (start < 0 || end < 0) {
  console.error('FAIL: cannot locate calc block');
  process.exit(1);
}
const api = new Function(html.slice(start, end) + '\nreturn {getZ, computeManning, computeManningSubsection, sliceSection, computeManningPartitioned, computeWeirQ, interpQByH, interpHByQ};')();

function parseSectionText(raw){
  const lines = String(raw).trim().split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const pts = [];
  for (const line of lines){
    const parts = line.split(/[\s,;]+/).map(Number).filter(n => !isNaN(n));
    if (parts.length >= 2) pts.push({x: parts[0], z: parts[1]});
  }
  pts.sort((a, b) => a.x - b.x);
  return pts;
}

const U = `0    52.0
5    48.0
10   45.5
20   43.0
40   42.0
60   42.0
80   42.2
90   43.5
100  46.0
110  50.0
120  52.0`;
const ptsU = parseSectionText(U);

function near(a,b){return Math.abs(a-b)<=1e-9}

let ok = true;

// 工况1：series
const keys = ['area','wetPerimeter','hydraulicRadius','velocity','discharge'];
for (const exp of expected.series){
  const r = api.computeManning(ptsU, exp.wse, 0.0005, 0.035);
  if (!r){ console.error('FAIL null at', exp.wse); ok = false; continue; }
  for (const k of keys){
    if (!near(r[k], exp[k])){ console.error(`FAIL wse=${exp.wse}.${k}: got ${r[k]} exp ${exp[k]}`); ok = false; }
  }
}

// 工况2：singleH45
const s45 = api.computeManning(ptsU, 45, 0.0005, 0.035);
if (!s45 || !near(s45.discharge, expected.singleH45.discharge)){ console.error('FAIL singleH45'); ok = false; }

// 工况3：堰流
const wb = api.computeWeirQ(45, 42, 50, 0.36, 'broad');
const wp = api.computeWeirQ(45, 42, 50, 0.45, 'practical');
if (!near(wb, expected.weirBroadH3)){ console.error('FAIL weirBroad', wb); ok = false; }
if (!near(wp, expected.weirPracH3)){ console.error('FAIL weirPrac', wp); ok = false; }

// 工况4：三分区糙率
if (expected.partitionH45){
  const p = api.computeManningPartitioned(ptsU, 45, 0.0005, 0.045, 0.030, 0.045, 20, 100);
  if (!p){ console.error('FAIL partition null'); ok = false; }
  else {
    for (const k of ['qLeft','qMain','qRight','area','wetPerimeter','hydraulicRadius','velocity','discharge']){
      if (!near(p[k], expected.partitionH45[k])){ console.error(`FAIL partition.${k}: got ${p[k]} exp ${expected.partitionH45[k]}`); ok = false; }
    }
  }
}

// 工况5：堰+天然复合
if (expected.compoundH44){
  const e = expected.compoundH44;
  const cl = api.computeManningSubsection(ptsU, e.wse, 0.0005, 0.04, 0, 40);
  const cr = api.computeManningSubsection(ptsU, e.wse, 0.0005, 0.04, 80, 120);
  const cqw = api.computeWeirQ(e.wse, 42, 40, 0.36, 'broad');
  const ql = cl ? cl.discharge : 0, qr = cr ? cr.discharge : 0;
  if (!near(cqw, e.qWeir)){ console.error('FAIL compound.qWeir', cqw); ok = false; }
  if (!near(ql, e.qLeft)){ console.error('FAIL compound.qLeft', ql); ok = false; }
  if (!near(qr, e.qRight)){ console.error('FAIL compound.qRight', qr); ok = false; }
  if (!near(cqw + ql + qr, e.qTotal)){ console.error('FAIL compound.qTotal'); ok = false; }
}

// 工况6：互查插值
if (expected.interp){
  const series = [];
  for (let w = 43.0; w <= 48.0 + 0.001; w += 1.0){
    const r = api.computeManning(ptsU, w, 0.0005, 0.035);
    if (r) series.push({wse: w, depth: w - 42, ...r});
  }
  const q435 = api.interpQByH(series, 43.5);
  if (q435 == null || !near(q435, expected.interp.qAtH43_5)){ console.error('FAIL interp.qAtH43_5', q435); ok = false; }
  const qMid = (series[0].discharge + series[1].discharge) / 2;
  if (!near(qMid, expected.interp.qMidLow)){ console.error('FAIL interp.qMidLow'); ok = false; }
  const hMid = api.interpHByQ(series, qMid);
  if (hMid == null || !near(hMid, expected.interp.hAtQMid)){ console.error('FAIL interp.hAtQMid', hMid); ok = false; }
}

if (ok){
  console.log('PASS: manning-qh calc 与基准完全一致');
  console.log('  H=45 Q =', s45.discharge);
  console.log('  堰流 H=3 Q =', wb);
  if (expected.partitionH45) console.log('  三分区 H=45 Q =', expected.partitionH45.discharge);
  if (expected.compoundH44) console.log('  复合 H=44 Q =', expected.compoundH44.qTotal);
  if (expected.interp) console.log('  插值 H=43.5→Q =', expected.interp.qAtH43_5);
  process.exit(0);
} else {
  console.error('REGRESSION FAILED');
  process.exit(1);
}
