// manning-qh 回归：从 index 抽出 computeManning / computeWeirQ，对比 baseline
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
const api = new Function(html.slice(start, end) + '\nreturn {getZ, computeManning, computeWeirQ};')();

function parseSectionText(raw){
  const lines=String(raw).trim().split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
  const pts=[];
  for(const line of lines){
    const parts=line.split(/[\s,;]+/).map(Number).filter(n=>!isNaN(n));
    if(parts.length>=2) pts.push({x:parts[0],z:parts[1]});
  }
  pts.sort((a,b)=>a.x-b.x);
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

// series points at wse 43..48
const keys=['area','wetPerimeter','hydraulicRadius','velocity','discharge'];
let ok=true;
for(const exp of expected.series){
  const r=api.computeManning(ptsU, exp.wse, 0.0005, 0.035);
  if(!r){console.error('FAIL null at', exp.wse);ok=false;continue}
  for(const k of keys){
    if(!near(r[k], exp[k])){console.error(`FAIL wse=${exp.wse}.${k}: got ${r[k]} exp ${exp[k]}`);ok=false}
  }
}
const s45=api.computeManning(ptsU,45,0.0005,0.035);
if(!s45||!near(s45.discharge, expected.singleH45.discharge)){console.error('FAIL singleH45');ok=false}

const wb=api.computeWeirQ(45,42,50,0.36,'broad');
const wp=api.computeWeirQ(45,42,50,0.45,'practical');
if(!near(wb, expected.weirBroadH3)){console.error('FAIL weirBroad',wb);ok=false}
if(!near(wp, expected.weirPracH3)){console.error('FAIL weirPrac',wp);ok=false}

if(ok){
  console.log('PASS: manning-qh calc 与基准完全一致');
  console.log('  H=45 Q =', s45.discharge);
  console.log('  堰流 H=3 Q =', wb);
  process.exit(0);
}else{
  console.error('REGRESSION FAILED');
  process.exit(1);
}
