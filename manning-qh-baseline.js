// manning-qh — 基准（计算逻辑与原 manning-qh.html 一致）
// 用法: node baseline.js

function getZ(pts,x){
  if(x<=pts[0].x)return pts[0].z;
  if(x>=pts[pts.length-1].x)return pts[pts.length-1].z;
  for(let i=0;i<pts.length-1;i++){
    if(x>=pts[i].x&&x<=pts[i+1].x){const t=(x-pts[i].x)/(pts[i+1].x-pts[i].x);return pts[i].z+t*(pts[i+1].z-pts[i].z);}
  }
  return pts[pts.length-1].z;
}

function computeManning(pts,wse,slopeVal,nVal){
  const zMin=Math.min(...pts.map(p=>p.z));
  if(wse<=zMin)return null;
  const xMin=pts[0].x,xMax=pts[pts.length-1].x,dx=0.05;
  const ints=[];
  for(let i=0;i<pts.length-1;i++){
    if((pts[i].z-wse)*(pts[i+1].z-wse)<0){
      const t=(wse-pts[i].z)/(pts[i+1].z-pts[i].z);
      ints.push(pts[i].x+t*(pts[i+1].x-pts[i].x));
    }
  }
  const ui=[...new Set(ints.map(v=>v.toFixed(6)))].map(Number).sort((a,b)=>a-b);
  const xCuts=[xMin];for(const xi of ui){if(xi>xMin&&xi<xMax)xCuts.push(xi);}xCuts.push(xMax);xCuts.sort((a,b)=>a-b);
  let A=0,Pw=0;
  for(let ci=0;ci<xCuts.length-1;ci++){
    const xa=xCuts[ci],xb=xCuts[ci+1];
    if(getZ(pts,(xa+xb)/2)>=wse)continue;
    const ns=Math.max(2,Math.ceil((xb-xa)/dx)),sd=(xb-xa)/ns;
    for(let s=0;s<ns;s++){
      const x0=xa+s*sd,x1=x0+sd,z0=getZ(pts,x0),z1=getZ(pts,x1);
      const d0=Math.max(0,wse-z0),d1=Math.max(0,wse-z1);
      A+=(d0+d1)/2*sd;Pw+=Math.sqrt(sd*sd+(z1-z0)*(z1-z0));
    }
  }
  if(A<=0)return null;
  const R=A/Pw;
  const V=(1/nVal)*Math.pow(R,2/3)*Math.sqrt(slopeVal);
  return{area:A,wetPerimeter:Pw,hydraulicRadius:R,velocity:V,discharge:V*A,n:nVal};
}

function computeWeirQ(wse,crestZ,B,m,wt){
  if(wse<=crestZ)return 0;
  const H=wse-crestZ,g=9.81;
  if(wt==='broad') return m*B*Math.sqrt(2*g)*Math.pow(H,1.5);
  if(wt==='practical') return m*B*Math.sqrt(2*g)*Math.pow(H+0.003,1.5);
  return m*B*Math.sqrt(2*g)*Math.pow(H,1.5);
}

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

function calcNormalSeries(pts, slope, nVal, wS, wE, step){
  const res=[];
  const zMin=Math.min(...pts.map(p=>p.z));
  for(let w=wS;w<=wE+step*0.001;w+=step){
    const r=computeManning(pts,w,slope,nVal);
    if(r)res.push({wse:w,depth:w-zMin,...r});
  }
  return res;
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
const series = calcNormalSeries(ptsU, 0.0005, 0.035, 42.0, 48.0, 1.0);

// 选取关键点用于基准
const pick = r => ({
  wse: r.wse, depth: r.depth,
  area: r.area, wetPerimeter: r.wetPerimeter,
  hydraulicRadius: r.hydraulicRadius,
  velocity: r.velocity, discharge: r.discharge
});

// 单点验算（与序列中同水位一致）
const single = computeManning(ptsU, 45.0, 0.0005, 0.035);

// 堰流验算
const weirBroad = computeWeirQ(45.0, 42.0, 50, 0.36, 'broad');
const weirPrac = computeWeirQ(45.0, 42.0, 50, 0.45, 'practical');

console.log(JSON.stringify({
  note:'manning-qh baseline',
  nPoints: series.length,
  series: series.map(pick),
  singleH45: single ? pick({wse:45, depth:45-42, ...single}) : null,
  weirBroadH3: weirBroad,
  weirPracH3: weirPrac
}, null, 2));
