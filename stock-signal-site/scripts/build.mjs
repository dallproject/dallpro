// build.mjs — 매일 GitHub Actions에서 실행 → data.json 생성
// 출처: Stooq + Yahoo 직접 수집(서버사이드). 미국은 S&P500 구성종목을 자동 로드.
// 실행: node scripts/build.mjs   (테스트: node scripts/build.mjs --selftest)
import { writeFileSync } from "node:fs";

//============ GICS → 한글 섹터 ============
const GICS = {
  "Information Technology":"IT","Health Care":"헬스케어","Financials":"금융",
  "Consumer Discretionary":"경기소비재","Communication Services":"커뮤니케이션",
  "Industrials":"산업재","Consumer Staples":"필수소비재","Energy":"에너지",
  "Utilities":"유틸리티","Real Estate":"부동산","Materials":"소재"
};

//============ 한국 주요주(큐레이션, 섹터 포함) ============
const KR = {
 "005930.kr":["삼성전자","IT"],"000660.kr":["SK하이닉스","IT"],"009150.kr":["삼성전기","IT"],
 "011070.kr":["LG이노텍","IT"],"066570.kr":["LG전자","IT"],"018260.kr":["삼성SDS","IT"],
 "042700.kr":["한미반도체","IT"],"000990.kr":["DB하이텍","IT"],"058470.kr":["리노공업","IT"],
 "240810.kr":["원익IPS","IT"],"357780.kr":["솔브레인","IT"],"039030.kr":["이오테크닉스","IT"],
 "036930.kr":["주성엔지니어링","IT"],"108320.kr":["LX세미콘","IT"],"095340.kr":["ISC","IT"],
 "373220.kr":["LG에너지솔루션","2차전지"],"006400.kr":["삼성SDI","2차전지"],"003670.kr":["포스코퓨처엠","2차전지"],
 "247540.kr":["에코프로비엠","2차전지"],"086520.kr":["에코프로","2차전지"],"066970.kr":["엘앤에프","2차전지"],
 "278280.kr":["천보","2차전지"],"348370.kr":["엔켐","2차전지"],"005070.kr":["코스모신소재","2차전지"],
 "207940.kr":["삼성바이오로직스","헬스케어"],"068270.kr":["셀트리온","헬스케어"],"000100.kr":["유한양행","헬스케어"],
 "128940.kr":["한미약품","헬스케어"],"326030.kr":["SK바이오팜","헬스케어"],"302440.kr":["SK바이오사이언스","헬스케어"],
 "196170.kr":["알테오젠","헬스케어"],"328130.kr":["루닛","헬스케어"],"145020.kr":["휴젤","헬스케어"],
 "214150.kr":["클래시스","헬스케어"],"145720.kr":["덴티움","헬스케어"],
 "005380.kr":["현대차","경기소비재"],"000270.kr":["기아","경기소비재"],"012330.kr":["현대모비스","경기소비재"],
 "161390.kr":["한국타이어","경기소비재"],"023530.kr":["롯데쇼핑","경기소비재"],
 "105560.kr":["KB금융","금융"],"055550.kr":["신한지주","금융"],"086790.kr":["하나금융지주","금융"],
 "316140.kr":["우리금융지주","금융"],"024110.kr":["기업은행","금융"],"032830.kr":["삼성생명","금융"],
 "000810.kr":["삼성화재","금융"],"138040.kr":["메리츠금융지주","금융"],"034730.kr":["SK","금융"],"003550.kr":["LG","금융"],
 "005490.kr":["POSCO홀딩스","소재"],"051910.kr":["LG화학","소재"],"010130.kr":["고려아연","소재"],"009830.kr":["한화솔루션","소재"],
 "035420.kr":["NAVER","커뮤니케이션"],"035720.kr":["카카오","커뮤니케이션"],"017670.kr":["SK텔레콤","커뮤니케이션"],
 "030200.kr":["KT","커뮤니케이션"],"259960.kr":["크래프톤","커뮤니케이션"],"036570.kr":["엔씨소프트","커뮤니케이션"],
 "251270.kr":["넷마블","커뮤니케이션"],"352820.kr":["하이브","커뮤니케이션"],"041510.kr":["에스엠","커뮤니케이션"],
 "035900.kr":["JYP Ent.","커뮤니케이션"],"293490.kr":["카카오게임즈","커뮤니케이션"],"263750.kr":["펄어비스","커뮤니케이션"],
 "011200.kr":["HMM","산업재"],"010140.kr":["삼성중공업","산업재"],"028260.kr":["삼성물산","산업재"],
 "042660.kr":["한화오션","산업재"],"009540.kr":["HD한국조선해양","산업재"],"329180.kr":["HD현대중공업","산업재"],
 "267260.kr":["HD현대일렉트릭","산업재"],"064350.kr":["현대로템","산업재"],"047810.kr":["한국항공우주","산업재"],
 "012450.kr":["한화에어로스페이스","산업재"],"272210.kr":["한화시스템","산업재"],"034020.kr":["두산에너빌리티","산업재"],
 "241560.kr":["두산밥캣","산업재"],
 "015760.kr":["한국전력","유틸리티"],"096770.kr":["SK이노베이션","에너지"],
 "033780.kr":["KT&G","필수소비재"],"051900.kr":["LG생활건강","필수소비재"],"090430.kr":["아모레퍼시픽","필수소비재"],
 "097950.kr":["CJ제일제당","필수소비재"],"271560.kr":["오리온","필수소비재"],"139480.kr":["이마트","필수소비재"]
};
//============ 미국 추가(ETF·ADR·비S&P 성장주) — S&P500은 자동 로드 ============
const USX = {
 "spy.us":["S&P500 ETF","지수","etf"],"qqq.us":["나스닥100 ETF","지수","etf"],"dia.us":["다우 ETF","지수","etf"],"iwm.us":["러셀2000 ETF","지수","etf"],
 "tsm.us":["TSMC","IT"],"asml.us":["ASML","IT"],"arm.us":["ARM","IT"],"smci.us":["Super Micro","IT"],
 "crwd.us":["CrowdStrike","IT"],"ddog.us":["Datadog","IT"],"net.us":["Cloudflare","IT"],"snow.us":["Snowflake","IT"],
 "mdb.us":["MongoDB","IT"],"coin.us":["Coinbase","금융"],"sofi.us":["SoFi","금융"],"hood.us":["Robinhood","금융"],
 "rblx.us":["Roblox","커뮤니케이션"],"abnb.us":["Airbnb","경기소비재"],"u.us":["Unity","IT"],
 "pdd.us":["PDD","경기소비재"],"meli.us":["MercadoLibre","경기소비재"],"nu.us":["Nubank","금융"],
 "shop.us":["Shopify","IT"],"baba.us":["Alibaba","경기소비재"],"mstr.us":["MicroStrategy","IT"]
};
//============ 일본 주요주(.jp, 섹터 포함) ============
const JP = {
 "7203.jp":["Toyota","자동차"],"7267.jp":["Honda","자동차"],"7201.jp":["Nissan","자동차"],"7269.jp":["Suzuki","자동차"],"7270.jp":["Subaru","자동차"],"6902.jp":["Denso","자동차"],"5108.jp":["Bridgestone","자동차"],
 "6758.jp":["Sony","IT"],"6861.jp":["Keyence","IT"],"6981.jp":["Murata","IT"],"6594.jp":["Nidec","IT"],"7741.jp":["Hoya","IT"],
 "8035.jp":["TokyoElectron","반도체"],"6857.jp":["Advantest","반도체"],"6920.jp":["Lasertec","반도체"],"6723.jp":["Renesas","반도체"],"6146.jp":["Disco","반도체"],
 "8306.jp":["MitsubishiUFJ","금융"],"8316.jp":["SumitomoMitsui","금융"],"8411.jp":["Mizuho","금융"],"8766.jp":["TokioMarine","금융"],
 "8058.jp":["Mitsubishi상사","상사"],"8001.jp":["Itochu","상사"],"8031.jp":["Mitsui","상사"],"8053.jp":["Sumitomo상사","상사"],"8002.jp":["Marubeni","상사"],
 "7011.jp":["MitsubishiHeavy","산업재"],"7013.jp":["IHI","산업재"],"7012.jp":["KawasakiHeavy","산업재"],"6301.jp":["Komatsu","산업재"],"6367.jp":["Daikin","산업재"],"6954.jp":["Fanuc","산업재"],"6501.jp":["Hitachi","산업재"],"9020.jp":["JR동일본","산업재"],
 "4502.jp":["Takeda","헬스케어"],"4568.jp":["DaiichiSankyo","헬스케어"],"4503.jp":["Astellas","헬스케어"],"4523.jp":["Eisai","헬스케어"],"4901.jp":["Fujifilm","헬스케어"],
 "9983.jp":["FastRetailing","소비재"],"4661.jp":["OrientalLand","소비재"],"3382.jp":["Seven&i","소비재"],
 "7974.jp":["Nintendo","커뮤니케이션"],"9984.jp":["SoftBankG","커뮤니케이션"],"9433.jp":["KDDI","커뮤니케이션"],"9432.jp":["NTT","커뮤니케이션"],"6098.jp":["Recruit","커뮤니케이션"],
 "4063.jp":["ShinEtsu","소재"]
};

const countryOf = s => s.endsWith(".kr") ? "kr" : s.endsWith(".jp") ? "jp" : "us";

//============ 데이터 수집 ============
const UA = { "User-Agent":"Mozilla/5.0 (compatible; signalbot/1.0)" };
function toYahoo(sym){
  if(sym.startsWith("^")) return ({ "^kospi":"%5EKS11","^spx":"%5EGSPC","^nkx":"%5EN225" })[sym]||null;
  if(sym.endsWith(".kr")) return sym.replace(".kr","")+".KS";
  if(sym.endsWith(".jp")) return sym.replace(".jp","")+".T";
  if(sym.endsWith(".us")) return sym.replace(".us","").toUpperCase();
  return sym;
}
async function getText(url){
  for(let attempt=0; attempt<2; attempt++){
    try{ const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),20000);
      const r=await fetch(url,{headers:UA,signal:ctrl.signal}); clearTimeout(t);
      if(r.ok){ const txt=await r.text(); if(txt && txt.length>150) return txt; }
    }catch(e){}
    await new Promise(z=>setTimeout(z,400));
  }
  return null;
}
function parseStooq(txt){
  if(!txt||!txt.includes("Date")||!txt.includes("Close")) return null;
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
async function fetchMany(syms,label){
  const POOL=4; let i=0, done=0; const out={}, src={};
  async function worker(){ while(i<syms.length){ const k=i++; const s=syms[k];
    const r=await fetchHistory(s); out[s]=r?r.data:null; if(r)src[s]=r.src; done++;
    if(done%50===0) console.log(`  ${label}: ${done}/${syms.length}`);
    await new Promise(z=>setTimeout(z,80)); } }
  await Promise.all(Array.from({length:POOL},worker));
  return { out, src };
}

//============ S&P500 구성종목 동적 로드 ============
function parseCsvLine(line){ const out=[]; let cur="",q=false;
  for(let i=0;i<line.length;i++){ const ch=line[i];
    if(q){ if(ch=='"'){ if(line[i+1]=='"'){cur+='"';i++;} else q=false; } else cur+=ch; }
    else { if(ch=='"')q=true; else if(ch==','){out.push(cur);cur="";} else cur+=ch; } }
  out.push(cur); return out; }
async function loadSP500(){
  const urls=[
    "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv",
    "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv"
  ];
  let txt=null; for(const u of urls){ txt=await getText(u); if(txt&&txt.includes("Symbol"))break; txt=null; }
  if(!txt){ console.log("  ⚠ S&P500 리스트 로드 실패 → 큐레이션만 사용"); return {}; }
  const out={}; const lines=txt.trim().split(/\r?\n/);
  const head=parseCsvLine(lines[0]).map(s=>s.trim().toLowerCase());
  const iSym=head.indexOf("symbol"), iName=head.findIndex(h=>h==="security"||h==="name"), iSec=head.findIndex(h=>h.includes("sector"));
  for(let i=1;i<lines.length;i++){ const f=parseCsvLine(lines[i]); if(f.length<=iSym)continue;
    let raw=(f[iSym]||"").trim(); if(!raw)continue; const name=(iName>=0?f[iName]:raw).trim();
    const sec=GICS[(iSec>=0?f[iSec]:"").trim()]||"기타";
    const st=raw.replace(/\./g,"-").toLowerCase()+".us"; out[st]=[name,sec,"stock"]; }
  console.log(`  S&P500 구성종목 ${Object.keys(out).length}개 로드`);
  return out;
}

//============ 지표 / 백테스트 ============
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

function analyzeStock(sym,meta,data){
  if(!data||data.length<260) return null;
  const closes=data.map(d=>d.c), times=data.map(d=>d.t), last=closes.length-1, lastT=times[last], price=closes[last];
  const m50=sma(closes,50), m200=sma(closes,200);
  const hi252=priorMax(closes,252,last), lo252=priorMin(closes,252,last);
  const above200=m200[last]!=null && price>m200[last];
  const above50 =m50[last]!=null && price>m50[last];
  const newHigh = price>=hi252, newLow = price<=lo252;
  const longOK = above200 && m200[last]>m200[Math.max(0,last-105)];
  const rk=k=>{const j=last-k;return j>=0?price/closes[j]-1:0;};
  const rsRaw=0.4*rk(21)+0.2*rk(63)+0.2*rk(126)+0.2*rk(252);
  const slim=arr=>arr.slice(-220);
  const sigs=[];
  const maDefs=[["SMA",10,sma],["EMA",10,ema],["SMA",20,sma],["EMA",20,ema],["SMA",40,sma],["EMA",40,ema],["SMA",60,sma],["EMA",60,ema]];
  for(const [typ,len,fn] of maDefs){ const arr=fn(closes,len); const ev=pullbackEvents(closes,arr,m200); if(ev.length<20)continue;
    const st=aggregate(ev,closes,times,lastT); const bh=bestHP(st); if(bh===null)continue; const ma=arr[last]; if(ma==null)continue;
    const lo=ma*0.98,hi=ma*1.03; const status=price<lo?"below":price>hi?"above":"in";
    if(longOK) sigs.push({type:"ema",badge:"이평",desc:`${typ}${len} ${bh<=20?"단기":"장기"} 근접 · ${bh}일 보유`,zoneLo:lo,zoneHi:hi,status,st,bh,arr:slim(arr)}); }
  if(longOK){ const ev=boxEvents(closes); if(ev.length>=20){const st=aggregate(ev,closes,times,lastT);const bh=bestHP(st);
    if(bh!==null){const top=priorMax(closes,60,last);const lo=top,hi=top*1.05;const status=price<lo?"below":price>hi?"above":"in";
      sigs.push({type:"box",badge:"박스",desc:`박스돌파 ${bh<=20?"단기":"장기"} · ${bh}일 보유`,zoneLo:lo,zoneHi:hi,status,st,bh});}}}
  if(longOK){ for(const [n,nm] of [[20,"20일신고가"],[55,"55일신고가"],[252,"252일신고가"]]){ const ev=highEvents(closes,n); if(ev.length<20)continue;
    const st=aggregate(ev,closes,times,lastT);const bh=bestHP(st);if(bh===null)continue;const top=priorMax(closes,n,last);const lo=top,hi=top*1.05;const status=price<lo?"below":price>hi?"above":"in";
    sigs.push({type:"high",badge:"신고가",desc:`${nm} 돌파 · ${bh}일 보유`,zoneLo:lo,zoneHi:hi,status,st,bh}); }
   const ev=athEvents(closes); if(ev.length>=20){const st=aggregate(ev,closes,times,lastT);const bh=bestHP(st);
    if(bh!==null){const top=priorMax(closes,closes.length,last);const lo=top,hi=top*1.05;const status=price<lo?"below":price>hi?"above":"in";
      sigs.push({type:"high",badge:"신고가",desc:`역대최고 돌파 · ${bh}일 보유`,zoneLo:lo,zoneHi:hi,status,st,bh});}} }
  return { sym, name:meta[0], sector:meta[1], asset:meta[2]||"stock", country:countryOf(sym),
    price, rsRaw, rs:50, longOK, above200, above50, newHigh, newLow, closes:slim(closes), sigs };
}
function regime(data){ if(!data||data.length<40)return {ok:false,have:false};
  const c=data.map(d=>d.c); const m10=sma(c,10),m20=sma(c,20); const i=c.length-1;
  return { ok:(m10[i]>m10[i-3])&&(m20[i]>m20[i-3])&&(m10[i]>m20[i]), have:true }; }

//============ 계절성 ============
function doy(t){const d=new Date(t);return Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);}
function seasonal(sym,meta,data){
  if(!data||data.length<2600)return null;
  const closes=data.map(d=>d.c),times=data.map(d=>d.t); const todayDoY=doy(Date.now()); let best=null;
  for(let sd=todayDoY-5; sd<=todayDoY+2; sd++){ const start=((sd-1+366)%366)+1;
    for(const hold of [5,10,20]){ const byYear={};
      for(let i=0;i<times.length;i++){ const y=new Date(times[i]).getFullYear(); if(byYear[y]==null && doy(times[i])>=start) byYear[y]=i; }
      const rets=[]; for(const e of Object.values(byYear)){ if(e+hold<closes.length) rets.push(closes[e+hold]/closes[e]-1); }
      if(rets.length<10)continue;
      const wr=rets.filter(r=>r>0).length/rets.length; const avg=rets.reduce((s,r)=>s+r,0)/rets.length;
      if(wr>=0.80){ const score=avg*wr; if(!best||score>best.score)
        best={sym,name:meta[0],sector:meta[1],country:countryOf(sym),start,hold,wr,avg,years:rets.length,score}; } } }
  return best;
}

//============ 합성 데이터(테스트) ============
function synth(drift,years,seed){ let r=seed; const rnd=()=>{r=(r*1103515245+12345)&0x7fffffff;return r/0x7fffffff;};
  const d=[]; let p=100; const start=Date.UTC(2013,0,1); const n=Math.round(years*252);
  for(let i=0;i<n;i++){ p=p*(1+drift+(rnd()-0.5)*0.025); d.push({t:start+Math.round(i*864e5*365/252),c:p,h:p*1.01,l:p*0.99}); } return d; }

//============ 메인 ============
const SELFTEST = process.argv.includes("--selftest");

// 1) 유니버스 구성
let UNIV = {}; // sym -> [name, sector, asset]
for(const s in KR) UNIV[s]=[KR[s][0],KR[s][1],"stock"];
for(const s in JP) UNIV[s]=[JP[s][0],JP[s][1],"stock"];
for(const s in USX) UNIV[s]=USX[s].length===3?USX[s]:[USX[s][0],USX[s][1],"stock"];
if(!SELFTEST){ const sp=await loadSP500(); for(const s in sp) UNIV[s]=sp[s]; }
const syms = Object.keys(UNIV);
console.log(`유니버스: ${syms.length}종목 (KR ${syms.filter(s=>s.endsWith(".kr")).length} · US ${syms.filter(s=>s.endsWith(".us")).length} · JP ${syms.filter(s=>s.endsWith(".jp")).length})`);

// 2) 데이터 수집
let data={}, src={};
if(SELFTEST){
  let i=0; for(const s of syms){ data[s]=synth([0.0016,0.0009,0.0004,-0.001][i%4],12,7+i*13); src[s]="Synthetic"; i++; }
  data["^kospi"]=synth(0.0012,12,3); data["^spx"]=synth(-0.0006,12,5); data["^nkx"]=synth(0.0011,12,9);
}else{
  console.log("지수 수집…"); const idx=await fetchMany(["^kospi","^spx","^nkx"],"지수"); Object.assign(data,idx.out);
  console.log("종목 수집 시작…"); const r=await fetchMany(syms,"종목"); Object.assign(data,r.out); src=r.src;
}

// 3) 분석
const analyzed = syms.map(s=>analyzeStock(s,UNIV[s],data[s])).filter(Boolean);
// 4) RS 백분위(국가별)
for(const ctry of ["kr","us","jp"]){ const g=analyzed.filter(a=>a.country===ctry && isFinite(a.rsRaw)).sort((a,b)=>a.rsRaw-b.rsRaw);
  g.forEach((a,i)=>a.rs=g.length>1?Math.round(1+i/(g.length-1)*98):50); }

// 5) 시장 breadth + 레짐 + 지수 스파크라인
function breadth(ctry){ const g=analyzed.filter(a=>a.country===ctry); const n=g.length||1;
  return { count:g.length, above200:g.filter(a=>a.above200).length/n, above50:g.filter(a=>a.above50).length/n,
    newHigh:g.filter(a=>a.newHigh).length, newLow:g.filter(a=>a.newLow).length }; }
function spark(idx){ const d=data[idx]; if(!d||!d.length)return []; return d.slice(-20).map(x=>Math.round(x.c*100)/100); }
const market = {
  us:{...regime(data["^spx"]),   ...breadth("us"), spark:spark("^spx")},
  kr:{...regime(data["^kospi"]), ...breadth("kr"), spark:spark("^kospi")},
  jp:{...regime(data["^nkx"]),   ...breadth("jp"), spark:spark("^nkx")}
};

// 6) 섹터 강도(국가별)
const sectors=[];
for(const ctry of ["kr","us","jp"]){ const g=analyzed.filter(a=>a.country===ctry);
  const by={}; for(const a of g){ (by[a.sector]=by[a.sector]||[]).push(a); }
  for(const name in by){ const arr=by[name]; if(arr.length<3)continue;
    const avgRS=Math.round(arr.reduce((s,a)=>s+a.rs,0)/arr.length);
    const pct200=arr.filter(a=>a.above200).length/arr.length;
    sectors.push({country:ctry,name,count:arr.length,avgRS,pctAbove200:pct200,score:avgRS}); } }
sectors.sort((a,b)=>b.avgRS-a.avgRS);

// 7) 신호 기준일
let maxT=0; for(const s of syms){ const d=data[s]; if(d&&d.length){ const t=d[d.length-1].t; if(t>maxT)maxT=t; } }
const signdate = maxT? new Date(maxT).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);

// 8) 계절성
const season = syms.map(s=>seasonal(s,UNIV[s],data[s])).filter(Boolean).sort((a,b)=>b.wr-a.wr||b.avg-a.avg).map(({score,...r})=>r);

// 9) 출력 — 신호 있는 종목만(시장폭·섹터는 위에서 전체로 계산 완료) → 파일 경량화
const trend = analyzed.filter(a=>a.sigs.length).map(a=>({sym:a.sym,name:a.name,sector:a.sector,asset:a.asset,country:a.country,
  price:a.price,rs:a.rs,longOK:a.longOK,above200:a.above200,closes:a.closes,sigs:a.sigs}));
// 히트맵용 — 분석된 전체 종목 경량 목록
const stocks = analyzed.map(a=>({sym:a.sym,name:a.name,sector:a.sector,country:a.country,rs:a.rs,above200:a.above200,sig:a.sigs.length>0}));
const out = { signdate, builtAt:new Date().toISOString(), coverage:{universe:syms.length,analyzed:analyzed.length},
  market, sectors, stocks, sources:src, trend, season };
writeFileSync(new URL("../data.json", import.meta.url), JSON.stringify(out));
console.log(`\n✅ data.json · 분석 ${analyzed.length}/${syms.length} · 섹터 ${sectors.length} · 계절성 ${season.length} · 기준일 ${signdate}`);
console.log(`   KOSPI ${market.kr.ok?"상승장":"약세"} (200일선위 ${(market.kr.above200*100).toFixed(0)}%) · S&P500 ${market.us.ok?"상승장":"약세"} (200일선위 ${(market.us.above200*100).toFixed(0)}%)`);
