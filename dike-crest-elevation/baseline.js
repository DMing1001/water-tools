// 堤顶高程 — 基准回归脚本（计算逻辑从 dike-crest-elevation/index.html 原样抽出，禁止改动）
// 用法: node baseline.js

const gradeFB_noOW={1:1.0,2:0.8,3:0.7,4:0.6,5:0.5};
const gradeFB_ow={1:0.5,2:0.4,3:0.4,4:0.3,5:0.3};

const KpSeg={0.1:[[0,.1,2.97,2.97],[.1,.2,2.97,2.82],[.2,.3,2.82,2.68],[.3,.5,2.68,2.46],[.5,1,2.46,2.13]],
  1:[[0,.1,2.42,2.42],[.1,.2,2.42,2.30],[.2,.3,2.30,2.18],[.3,.5,2.18,2.00],[.5,1,2.00,1.75]],
  2:[[0,.1,2.07,2.07],[.1,.2,2.07,1.96],[.2,.3,1.96,1.86],[.3,.5,1.86,1.70],[.5,1,1.70,1.50]],
  5:[[0,.1,1.64,1.64],[.1,.2,1.64,1.56],[.2,.3,1.56,1.49],[.3,.5,1.49,1.38],[.5,1,1.38,1.24]],
  13:[[0,.1,1.18,1.18],[.1,.2,1.18,1.14],[.2,.3,1.14,1.10],[.3,.5,1.10,1.05],[.5,1,1.05,0.97]]};
const KbB=[0,10,20,30,40,50,60,70,80,90],KbV=[1,.98,.96,.93,.90,.86,.80,.72,.61,.45];
const R0m=[1.0,1.25,1.5,1.75,2.0,2.5,3.0,3.5,4.0,5.0,6.0];
const R0hl=[.001,.005,.01,.02,.05,.1];
const R0d=[[1.40,1.60,1.75,1.90,2.10,2.30],[1.38,1.58,1.73,1.88,2.08,2.28],[1.35,1.55,1.70,1.85,2.05,2.25],[1.33,1.53,1.68,1.83,2.03,2.23],[1.30,1.50,1.65,1.80,2.00,2.20],[1.25,1.45,1.60,1.75,1.95,2.15],[1.20,1.40,1.55,1.70,1.90,2.10],[1.15,1.35,1.50,1.65,1.85,2.05],[1.10,1.30,1.45,1.60,1.80,2.00],[1.00,1.20,1.35,1.50,1.70,1.90],[0.90,1.10,1.25,1.40,1.60,1.80]];

function lerp(xA,yA,x){if(x<=xA[0])return yA[0];if(x>=xA[xA.length-1])return yA[yA.length-1];for(let i=0;i<xA.length-1;i++)if(x>=xA[i]&&x<=xA[i+1])return yA[i]+(x-xA[i])/(xA[i+1]-xA[i])*(yA[i+1]-yA[i]);return yA[yA.length-1];}
function biLerp(xA,yA,z,x,y){
  let xi=0;for(let i=0;i<xA.length-1;i++){if(x>=xA[i]&&x<=xA[i+1]){xi=i;break}if(i===xA.length-2)xi=i}
  let yi=0;for(let j=0;j<yA.length-1;j++){if(y>=yA[j]&&y<=yA[j+1]){yi=j;break}if(j===yA.length-2)yi=j}
  const x0=xA[xi],x1=xA[Math.min(xi+1,xA.length-1)],y0=yA[yi],y1=yA[Math.min(yi+1,yA.length-1)];
  const tx=x1===x0?0:(x-x0)/(x1-x0),ty=y1===y0?0:(y-y0)/(y1-y0);
  return z[xi][yi]*(1-tx)*(1-ty)+z[Math.min(xi+1,xA.length-1)][yi]*tx*(1-ty)+z[xi][Math.min(yi+1,yA.length-1)]*(1-tx)*ty+z[Math.min(xi+1,xA.length-1)][Math.min(yi+1,yA.length-1)]*tx*ty;
}

function calc(r){
  const g=9.81,V=r.V,F=r.F,d=r.d;
  const gV2=g/(V*V),A1=.13*Math.tanh(.7*Math.pow(gV2*d,.7)),B1=.0018*Math.pow(gV2*F,.45);
  const Hbar=A1*Math.tanh(B1/A1)*V*V/g;
  const Tbar=4.438*Math.sqrt(Hbar),L0=g*Tbar*Tbar/(2*Math.PI);
  let Lbar=L0;for(let i=0;i<200;i++){const n=L0*Math.tanh(2*Math.PI*d/Lbar);if(Math.abs(n-Lbar)<1e-8)break;Lbar=n}
  const hl=Hbar/Lbar,Hd=Hbar/d,Kw=V/Math.sqrt(g*d);
  const Kc=3.6e-6,cosb=Math.cos(r.beta*Math.PI/180),e=Kc*V*V*F*cosb/(2*g*d);
  const seg=KpSeg[r.P]||KpSeg[2];let Kp=2.07;
  for(const[lo,hi,kl,kh]of seg)if(Hd>=lo&&Hd<=hi){Kp=(hi-lo)<1e-10?kl:kl+(Hd-lo)/(hi-lo)*(kh-kl);break}
  const Kv=lerp(KbB,KbV,Math.min(r.beta,90));
  const R0=biLerp(R0m,R0hl,R0d,Math.max(1,Math.min(6,r.m)),Math.max(.001,Math.min(.1,hl)));
  const Rp=r.Kd*Kv*Kp*R0*Hbar;
  const crest=r.WL+Rp+(r.useE?e:0)+r.A;
  return{...r,Hbar,Tbar,L0,Lbar,hl,Hd,Kw,e,cosb,Kp,Kv,R0,Rp,crest,tmin:136*F/V};
}

// 工况 A：常规 3 级堤，不允许越浪，砌石护面
const caseA = {
  name: '基准A-常规3级', section: 'K5+200',
  WL: 52.50, A: 0.70, d: 3.50,
  V: 8.5, F: 2200, beta: 0,
  m: 2.5, Kd: 0.85, P: 2, useE: true,
  overtop: false, grade: 3, surfText: '砌石'
};

// 工况 B：1 级重要堤，允许越浪，斜向来波，混凝土板
const caseB = {
  name: '基准B-1级斜向允许越浪', section: 'K12+850',
  WL: 18.20, A: 0.50, d: 5.20,
  V: 12.0, F: 4500, beta: 25,
  m: 3.0, Kd: 0.92, P: 1, useE: true,
  overtop: true, grade: 1, surfText: '混凝土板'
};

const pick = r => ({
  name: r.name, section: r.section,
  Hbar: r.Hbar, Tbar: r.Tbar, L0: r.L0, Lbar: r.Lbar,
  hl: r.hl, Hd: r.Hd, Kw: r.Kw, e: r.e, cosb: r.cosb,
  Kp: r.Kp, Kv: r.Kv, R0: r.R0, Rp: r.Rp, crest: r.crest,
  tmin: r.tmin
});

const out = {
  note: 'dike-crest-elevation baseline — DO NOT modify calc logic',
  caseA: pick(calc(caseA)),
  caseB: pick(calc(caseB))
};

console.log(JSON.stringify(out, null, 2));
