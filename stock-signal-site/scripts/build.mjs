// build.mjs — 매일 서버(GitHub Actions)에서 실행되어 data.json 을 생성합니다.
// Stooq + Yahoo 두 곳에서 주가를 직접 수집(서버사이드 → CORS/프록시 불필요).
// 실행: node scripts/build.mjs   (테스트: node scripts/build.mjs --selftest)
import { writeFileSync, mkdirSync } from "node:fs";

//============ 유니버스 ============
const KR = {
 "005930.kr":["삼성전자","IT","stock"],"000660.kr":["SK하이닉스","IT","stock"],"373220.kr":["LG에너지솔루션","2차전지","stock"],
 "207940.kr":["삼성바이오로직스","바이오","stock"],"005380.kr":["현대차","자동차","stock"],"000270.kr":["기아","자동차","stock"],
 "068270.kr":["셀트리온","바이오","stock"],"005490.kr":["POSCO홀딩스","소재","stock"],"035420.kr":["NAVER","IT","stock"],
 "035720.kr":["카카오","IT","stock"],"105560.kr":["KB금융","금융","stock"],"055550.kr":["신한지주","금융","stock"],
 "051910.kr":["LG화학","화학","stock"],"006400.kr":["삼성SDI","2차전지","stock"],"012330.kr":["현대모비스","자동차","stock"],
 "009150.kr":["삼성전기","IT","stock"],"011200.kr":["HMM","운송","stock"],"015760.kr":["한국전력","유틸","stock"],
 "032830.kr":["삼성생명","금융","stock"],"096770.kr":["SK이노베이션","에너지","stock"],"011070.kr":["LG이노텍","IT","stock"],
 "066570.kr":["LG전자","IT","stock"],"010130.kr":["고려아연","소재","stock"],"086790.kr":["하나금융지주","금융","stock"],
 "018260.kr":["삼성SDS","IT","stock"],"034730.kr":["SK","지주","stock"],"010140.kr":["삼성중공업","조선","stock"],
 "042700.kr":["한미반도체","IT","stock"]
};
const US = {
 "aapl.us":["Apple","IT","stock"],"msft.us":["Microsoft","IT","stock"],"nvda.us":["NVIDIA","IT","stock"],
 "googl.us":["Alphabet","IT","stock"],"amzn.us":["Amazon","소비재","stock"],"meta.us":["Meta","IT","stock"],
 "tsla.us":["Tesla","자동차","stock"],"avgo.us":["Broadcom","IT","stock"],"amd.us":["AMD","IT","stock"],
 "jpm.us":["JPMorgan","금융","stock"],"v.us":["Visa","금융","stock"],"lly.us":["Eli Lilly","바이오","stock"],
 "cost.us":["Costco","소비재","stock"],"nflx.us":["Netflix","미디어","stock"],"crm.us":["Salesforce","IT","stock"],
 "now.us":["ServiceNow","IT","stock"],"panw.us":["Palo Alto","IT","stock"],"anet.us":["Arista","IT","stock"],
 "pltr.us":["Palantir","IT","stock"],"vrt.us":["Vertiv","산업재","stock"],"smci.us":["Super Micro","IT","stock"],
 "mu.us":["Micron","IT","stock"],"orcl.us":["Oracle","IT","stock"],"dell.us":["Dell","IT","stock"],
 "spy.us":["S&P500 ETF","지수","etf"],"qqq.us":["나스닥100 ETF","지수","etf"]
};
const ALL = { ...KR, ...US };
const IDX = { kr:"^kospi", us:"^spx" };
const META = s => ALL[s] || [s.replace(/\.(kr|us)$/,'').toUpperCase(),"기타","stock"];
const countryOf = s => s.endsWith(".kr") ? "kr" : "us";

//============ 데이터 수집 (Stooq → Yahoo) ============
const UA = { "User-Agent":"Mozilla/5.0 (compatible; stock-signal-bot/1.0)" };
function toYahoo(sym){
  if(sym.startsWith("^")) return ({ "^kospi":"%5EKS11","^kosdaq":"%5EKQ11","^spx":"%5EGSPC","^ndq":"%5ENDX" })[sym]||null;
  if(sym.endsWith(".kr")) return sym.replace(".kr","")+".KS";
  if(sym.endsWith(".us")) return sym.replace(".us","").toUpperCase();
  return sym;
}
async function getText(url){
  try{
    const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),20000);
    const r=await fetch(url,{headers:UA,signal:ctrl.signal}); clearTimeout(t);
    if(!r.ok) return null; const txt=await r.text();
    return (txt && txt.length>150) ? txt : null;
  }catch(e){ return null; }
}
function parseStooq(txt){
  if(!txt || !txt.includes("Date") || !txt.includes("Close")) return null;
  const rows=txt.trim().split(/\r?\n/); const o=[];
  for(let i=1;i<rows.length;i++){ const c=rows[i].split(","); const cl=parseFloat(c[4]);
    if(!isFinite(cl))continue; o.push({t:Date.parse(c[0]),c:cl,h:parseFloat(c[2])||cl,l:parseFloat(c[3])||cl}); }
  return o.length>=260?o:null;
}
function parseYahoo(txt){
  let j; try{ j=JSON.parse(txt); }catch(e){ return null; }
  const r=j?.chart?.result?.[0]; if(!r||!r.timestamp) return null;
  const q=r.indicators.quote[0]; const o=[];
  for(let i=0;i<r.timestamp.length;i++){ const cl=q.close[i]; if(cl==null||!isFinite(cl))continue;
    o.push({t:r.timestamp[i]*1000,c:cl,h:q.high[i]||cl,l:q.low[i]||cl}); }
  return o.length>=260?o:null;
}
async function fetchHistory(sym){
  let d=parseStooq(await getText("https://stooq.com/q/d/l/?s="+encodeURIComponent(sym)+"&i=d"));
  if(d) return { data:d, src:"Stooq" };
  const y=toYahoo(sym);
  if(y){ d=parseYahoo(await getText("https://query1.finance.yahoo.com/v8/finance/chart/"+y+"?range=max&interval=1d"));
    if(d) return { data:d, src:"Yahoo" };
    if(sym.endsWith(".kr")){ d=parseYahoo(await getText("https://query1.finance.yahoo.com/v8/finance/chart/"+sym.replace(".kr","")+".KQ?range=max&interval=1d"));
      if(d) return { data:d, src:"Yahoo" }; } }
  return null;
}
async function fetchMany(syms){
  const POOL=3; let i=0; const out={}; const src={};
  async function worker(){ while(i<syms.length){ const k=i++; const s=syms[k];
    const r=await fetchHistory(s); out[s]=r?r.data:null; if(r)src[s]=r.src;
    process.stdout.write(`  · ${s}: ${r?r.src+" "+r.data.length+"행":"실패"}\n`);
    await new Promise(z=>setTimeout(z,120)); } }
  await Promise.all(Array.from({length:POOL},worker));
  return { out, src };
}

//============ 지표 / 백테스트 (앱과 동일, 검증된 로직) ============
function sma(c,n){const o=Array(c.length).fill(null);let s=0;for(let i=0;i<c.length;i++){s+=c[i];if(i>=n)s-=c[i-n];if(i>=n-1)o[i]=s/n;}return o;}
function ema(c,n){const o=Array(c.length).fill(null);const k=2/(n+1);let e=c[0];o[0]=e;for(let i=1;i<c.length;i++){e=c[i]*k+e*(1-k);o[i]=e;}return o;}
function priorMax(a,n,i){let m=-Infinity;const s=Math.max(0,i-n);for(let k=s;k<i;k++)if(a[k]>m)m=a[k];return m;}
function priorMin(a,n,i){let m=Infinity;const s=Math.max(0,i-n);for(let k=s;k<i;k++)if(a[k]<m)m=a[k];return m;}
const HP=[2,3,5,10,20,60,126,252];
function aggregate(events,closes,times,last){const out={};for(const h of HP){let sw=0,swW=0,wr=0,ww=0,lr=0,lw=0,n=0;
  for(const e of events){if(e+h>=closes.length)continue;const ret=closes[e+h]/closes[e]-1;const ageY=(last-times[e])/(365.25*864e5);const w=Math.pow(0.5,ageY/3);
    n++;sw+=w;if(ret>0){swW+=w;wr+=ret*w;ww+=w;}else{lr+=(-ret)*w;lw+=w;}}
  const winRate=sw>0?swW/sw:0,avgWin=ww>0?wr/ww:0,avgLoss=lw>0?lr/lw:0;const payoff=avgLoss>0?avgWin/avgLoss:(avgWin>0?99:0);
  out[h]={winRate,avgWin,avgLoss,payoff,ev:winRate*payoff-(1-winRate),n};}return out;}
function bestHP(st){let b=null;for(const h of HP){const s=st[h];if(s.n>=20){if(b===null||s.ev>st[b].ev)b=h;}}return b;}
function pullbackEvents(closes,maArr,ma200){const ev=[];let p=false;for(let i=0;i<closes.length;i++){const ma=maArr[i];if(ma==null){p=false;continue;}
  const dev=closes[i]/ma-1;const inB=dev>=-0.02&&dev<=0.03;const up=ma200[i]!=null&&closes[i]>ma200[i];if(inB&&up&&!p)ev.push(i);p=inB;}return ev;}
function highEvents(closes,n){const ev=[];let p=false;for(let i=n;i<closes.length;i++){const pm=priorMax(closes,n,i);const br=closes[i]>=pm;if(br&&!p)ev.push(i);p=br;}return ev;}
function athEvents(closes){const ev=[];let p=false;for(let i=20;i<closes.length;i++){const pm=priorMax(closes,i,i);const br=closes[i]>=pm;if(br&&!p)ev.push(i);p=br;}return ev;}
function boxEvents(closes){const ev=[];let p=false;const W=60;for(let i=W;i<closes.length;i++){const hi=priorMax(closes,W,i),lo=priorMin(closes,W,i);const tight=(hi-lo)/lo<0.20;const br=closes[i]>hi&&tight;if(br&&!p)ev.push(i);p=closes[i]>hi;}return ev;}

function analyzeStock(sym,data){
  if(!data||data.length<260) return null;
  const closes=data.map(d=>d.c), times=data.map(d=>d.t), last=closes.length-1, lastT=times[last], price=closes[last];
  const m200=sma(closes,200);
  const longOK = m200[last]!=null && price>m200[last] && m200[last]>m200[Math.max(0,last-105)];
  const rk=k=>{const j=last-k;return j>=0?price/closes[j]-1:0;};
  const rsRaw=0.4*rk(21)+0.2*rk(63)+0.2*rk(126)+0.2*rk(252);
  const sigs=[]; const slim=(arr)=>arr.slice(-220);
  const maDefs=[["SMA",10,sma],["EMA",10,ema],["SMA",20,sma],["EMA",20,ema],["SMA",40,sma],["EMA",40,ema],["SMA",60,sma],["EMA",60,ema]];
  for(const [typ,len,fn] of maDefs){ const arr=fn(closes,len); const ev=pullbackEvents(closes,arr,m200); if(ev.length<20)continue;
    const st=aggregate(ev,closes,times,lastT); const bh=bestHP(st); if(bh===null)continue; const ma=arr[last]; if(ma==null)continue;
    const lo=ma*0.98,hi=ma*1.03; const status=price<lo?"below":price>hi?"above":"in";
    sigs.push({type:"ema",badge:"이평",desc:`${typ}${len} ${bh<=20?"단기":"장기"} 근접 · ${bh}일 보유`,zoneLo:lo,zoneHi:hi,status,st,bh,longOK,arr:slim(arr)}); }
  { const ev=boxEvents(closes); if(ev.length>=20){const st=aggregate(ev,closes,times,lastT);const bh=bestHP(st);
    if(bh!==null){const top=priorMax(closes,60,last);const lo=top,hi=top*1.05;const status=price<lo?"below":price>hi?"above":"in";
      sigs.push({type:"box",badge:"박스",desc:`박스돌파 ${bh<=20?"단기":"장기"} · ${bh}일 보유`,zoneLo:lo,zoneHi:hi,status,st,bh,longOK});}}}
  for(const [n,nm] of [[20,"20일신고가"],[55,"55일신고가"],[252,"252일신고가"]]){ const ev=highEvents(closes,n); if(ev.length<20)continue;
    const st=aggregate(ev,closes,times,lastT);const bh=bestHP(st);if(bh===null)continue;const top=priorMax(closes,n,last);const lo=top,hi=top*1.05;const status=price<lo?"below":price>hi?"above":"in";
    sigs.push({type:"high",badge:"신고가",desc:`${nm} 돌파 · ${bh}일 보유`,zoneLo:lo,zoneHi:hi,status,st,bh,longOK}); }
  { const ev=athEvents(closes); if(ev.length>=20){const st=aggregate(ev,closes,times,lastT);const bh=bestHP(st);
    if(bh!==null){const top=priorMax(closes,closes.length,last);const lo=top,hi=top*1.05;const status=price<lo?"below":price>hi?"above":"in";
      sigs.push({type:"high",badge:"신고가",desc:`역대최고 돌파 · ${bh}일 보유`,zoneLo:lo,zoneHi:hi,status,st,bh,longOK});}}}
  const m=META(sym);
  return { sym, name:m[0], sector:m[1], asset:m[2], country:countryOf(sym),
    price, rsRaw, rs:50, longOK, closes:slim(closes), sigs:sigs.filter(s=>s.longOK) };
}
function regime(data){ if(!data||data.length<40)return {ok:false,have:false};
  const c=data.map(d=>d.c); const m10=sma(c,10),m20=sma(c,20); const i=c.length-1;
  return { ok:(m10[i]>m10[i-3])&&(m20[i]>m20[i-3])&&(m10[i]>m20[i]), have:true }; }

//============ 계절성 (승률 80%+ 까지 저장 → 화면에서 80/90 필터) ============
function doy(t){const d=new Date(t);return Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);}
function seasonal(sym,data){
  if(!data||data.length<2600)return null;
  const closes=data.map(d=>d.c),times=data.map(d=>d.t); const todayDoY=doy(Date.now()); let best=null;
  for(let sd=todayDoY-5; sd<=todayDoY+2; sd++){ const start=((sd-1+366)%366)+1;
    for(const hold of [5,10,20]){ const byYear={};
      for(let i=0;i<times.length;i++){ const y=new Date(times[i]).getFullYear(); if(byYear[y]==null && doy(times[i])>=start) byYear[y]=i; }
      const idxs=Object.values(byYear); const rets=[];
      for(const e of idxs){ if(e+hold<closes.length) rets.push(closes[e+hold]/closes[e]-1); }
      if(rets.length<10)continue;
      const wr=rets.filter(r=>r>0).length/rets.length; const avg=rets.reduce((s,r)=>s+r,0)/rets.length;
      if(wr>=0.80){ const score=avg*wr; if(!best||score>best.score){ const m=META(sym);
        best={sym,name:m[0],sector:m[1],country:countryOf(sym),start,hold,wr,avg,years:rets.length,score}; } } }
  }
  return best;
}

//============ 합성 데이터(테스트용) ============
function synth(drift,years,seed){ let r=seed; const rnd=()=>{r=(r*1103515245+12345)&0x7fffffff;return r/0x7fffffff;};
  const d=[]; let p=100; const start=Date.UTC(2013,0,1); const n=Math.round(years*252);
  for(let i=0;i<n;i++){ p=p*(1+drift+(rnd()-0.5)*0.025); d.push({t:start+Math.round(i*864e5*365/252),c:p,h:p*1.01,l:p*0.99}); } return d; }

//============ 메인 ============
const SELFTEST = process.argv.includes("--selftest");
const syms = Object.keys(ALL);
let data={}, src={};

if(SELFTEST){
  console.log("[selftest] 합성 데이터로 빌드 검증 (네트워크 미사용)");
  let i=0; for(const s of syms){ const drift=[0.0016,0.0009,0.0003,-0.001][i%4]; data[s]=synth(drift,12,7+i*13); src[s]="Synthetic"; i++; }
  data["^kospi"]=synth(0.0012,12,3); data["^spx"]=synth(0.0014,12,5);
}else{
  console.log("주가 수집 시작 (Stooq → Yahoo) …");
  const idx=await fetchMany([IDX.kr,IDX.us]); Object.assign(data,idx.out);
  const r=await fetchMany(syms); data=Object.assign(data,r.out); src=r.src;
}

const market={ kr:regime(data["^kospi"]), us:regime(data["^spx"]) };
const analyzed = syms.map(s=>analyzeStock(s,data[s])).filter(Boolean);
// RS 백분위
const valid=analyzed.filter(a=>isFinite(a.rsRaw)).sort((a,b)=>a.rsRaw-b.rsRaw);
valid.forEach((a,i)=>a.rs=valid.length>1?Math.round(1+i/(valid.length-1)*98):50);
analyzed.forEach(a=>{ delete a.rsRaw; });
// 신호 기준일
let maxT=0; for(const s of syms){ const d=data[s]; if(d&&d.length){ const t=d[d.length-1].t; if(t>maxT)maxT=t; } }
const signdate = maxT? new Date(maxT).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
// 계절성
const season = syms.map(s=>seasonal(s,data[s])).filter(Boolean).sort((a,b)=>b.wr-a.wr||b.avg-a.avg)
  .map(({score,...r})=>r);

const out = {
  signdate,
  builtAt: new Date().toISOString(),
  market,
  sources: src,
  trend: analyzed,
  season
};
mkdirSync(new URL("../",import.meta.url), { recursive:true });
const path = new URL("../data.json", import.meta.url);
writeFileSync(path, JSON.stringify(out));
console.log(`\n✅ data.json 생성 완료 · 분석 ${analyzed.length}종목 · 계절성 ${season.length}건 · 기준일 ${signdate}`);
console.log(`   시장: KOSPI ${market.kr.ok?"상승장":"약세"} / S&P500 ${market.us.ok?"상승장":"약세"}`);
