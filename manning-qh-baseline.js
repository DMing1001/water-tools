// manning-qh — 基准生成
// 计算函数从 manning-qh.html 的 calc 区抽取（单一事实来源，避免副本漂移）
// 用法: node manning-qh-baseline.js  > manning-qh-baseline-expected.json
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'manning-qh.html'), 'utf8');
const start = html.indexOf('function getZ');
const end = html.indexOf('/* ========== UI ==========');
if (start < 0 || end < 0) { console.error('cannot locate calc block'); process.exit(1); }
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

function pick(r){
  return {
    wse: r.wse, depth: r.depth,
    area: r.area, wetPerimeter: r.wetPerimeter,
    hydraulicRadius: r.hydraulicRadius,
    velocity: r.velocity, discharge: r.discharge
  };
}

// —— 工况1：全断面单一 n 系列（U 形，S=0.0005，n=0.035，H=43~48 步长1）——
const series = [];
for (let w = 43.0; w <= 48.0 + 0.001; w += 1.0){
  const r = api.computeManning(ptsU, w, 0.0005, 0.035);
  if (r) series.push(pick({wse: w, depth: w - 42, ...r}));
}

// —— 工况2：单点 H=45 ——
const single = api.computeManning(ptsU, 45.0, 0.0005, 0.035);

// —— 工况3：堰流 ——
const weirBroad = api.computeWeirQ(45.0, 42.0, 50, 0.36, 'broad');
const weirPrac = api.computeWeirQ(45.0, 42.0, 50, 0.45, 'practical');

// —— 工况4：三分区糙率（左滩 n=0.045 / 主槽 n=0.030 / 右滩 n=0.045，分界 20/100，H=45）——
const part = api.computeManningPartitioned(ptsU, 45.0, 0.0005, 0.045, 0.030, 0.045, 20, 100);

// —— 工况5：堰+天然复合（堰段 40~80，堰顶 42，m=0.36 宽顶堰，n左=n右=0.04，H=44）——
// 复合汇总与 calcCompound 同一约定：Q总 = Q堰 + Q左 + Q右
const cWse = 44.0, cSlope = 0.0005, cNL = 0.04, cNR = 0.04, cX0 = 40, cX1 = 80, cCrest = 42, cM = 0.36;
const cl = api.computeManningSubsection(ptsU, cWse, cSlope, cNL, 0, cX0);
const cr = api.computeManningSubsection(ptsU, cWse, cSlope, cNR, cX1, 120);
const cqw = api.computeWeirQ(cWse, cCrest, cX1 - cX0, cM, 'broad');
const compound = {
  wse: cWse,
  qWeir: cqw,
  qLeft: cl ? cl.discharge : 0,
  qRight: cr ? cr.discharge : 0,
  qTotal: cqw + (cl ? cl.discharge : 0) + (cr ? cr.discharge : 0)
};

// —— 工况6：互查插值（基于工况1系列，H 范围 43~48）——
const q435 = api.interpQByH(series, 43.5);
const qMid = (series[0].discharge + series[1].discharge) / 2;
const hMid = api.interpHByQ(series, qMid);
const interp = { qAtH43_5: q435, qMidLow: qMid, hAtQMid: hMid };

console.log(JSON.stringify({
  note: 'manning-qh baseline（生成源：manning-qh.html calc 区）',
  cases: ['seriesU', 'singleH45', 'weir', 'partition3', 'compound', 'interp'],
  nPoints: series.length,
  series,
  singleH45: single ? pick({wse: 45, depth: 45 - 42, ...single}) : null,
  weirBroadH3: weirBroad,
  weirPracH3: weirPrac,
  partitionH45: part ? {
    qLeft: part.qLeft, qMain: part.qMain, qRight: part.qRight,
    area: part.area, wetPerimeter: part.wetPerimeter,
    hydraulicRadius: part.hydraulicRadius, velocity: part.velocity, discharge: part.discharge
  } : null,
  compoundH44: compound,
  interp
}, null, 2));
