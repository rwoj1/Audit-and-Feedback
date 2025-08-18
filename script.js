"use strict";

/* =============== utils =============== */
const $ = id => document.getElementById(id);
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function banner(msg){ const b=document.createElement("div"); b.style.cssText="position:fixed;left:0;right:0;bottom:0;background:#7f1d1d;color:#fff;padding:8px 12px;font:14px system-ui;z-index:999999"; b.textContent=msg; document.body.appendChild(b); }
function roundToNearestMultiple(x, step) { return Math.round(x / step) * step; }

const SLOT_KEYS = ["AM","MID","DIN","PM"]; const MAX_WEEKS = 60; const THREE_MONTHS_MS = 90 * 24 * 3600 * 1000;

/* =============== catalog (hard-coded) =============== */
const CATALOG = {
  "Opioid": {
    "Morphine": { "SR Tablet":[ "5 mg","10 mg","15 mg","20 mg","30 mg","60 mg","100 mg","200 mg" ] },
    "Oxycodone": { "SR Tablet":[ "5 mg","10 mg","15 mg","20 mg","30 mg","40 mg","60 mg","80 mg" ] },
    "Oxycodone / Naloxone": { "SR Tablet":[ "2.5/1.25 mg","5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg" ] },
    "Tapentadol": { "SR Tablet":[ "50 mg","100 mg","150 mg","200 mg","250 mg" ] },
    "Tramadol": { "SR Tablet":[ "50 mg","100 mg","150 mg","200 mg" ] },
    "Buprenorphine": { "Patch":[ "5 mcg/hr","10 mcg/hr","15 mcg/hr","20 mcg/hr","25 mcg/hr","30 mcg/hr","40 mcg/hr" ] },
    "Fentanyl": { "Patch":[ "12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr" ] }
  },
  "Benzodiazepines / Z-Drug (BZRA)": {
    "Alprazolam": { "Tablet":["0.25 mg","0.5 mg","1 mg","2 mg"] },
    "Clonazepam": { "Tablet":["0.5 mg","2 mg"] },
    "Diazepam": { "Tablet":["2 mg","5 mg"] },
    "Flunitrazepam": { "Tablet":["1 mg"] },
    "Lorazepam": { "Tablet":["0.5 mg","1 mg","2.5 mg"] },
    "Nitrazepam": { "Tablet":["5 mg"] },
    "Oxazepam": { "Tablet":["15 mg","30 mg"] },
    "Temazepam": { "Tablet":["10 mg"] },
    "Zolpidem": { "Tablet":["10 mg"], "Slow Release Tablet":["6.25 mg","12.5 mg"] },
    "Zopiclone": { "Tablet":["7.5 mg"] }
  },
  "Antipsychotic": {
    "Haloperidol": { "Tablet":["0.5 mg","1 mg","2 mg","5 mg","10 mg","20 mg"] },
    "Olanzapine": { "Tablet":["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"], "Wafer":["5 mg","10 mg","15 mg","20 mg"] },
    "Quetiapine": { "Immediate Release Tablet":["25 mg","100 mg","200 mg","300 mg"], "Slow Release Tablet":["50 mg","150 mg","200 mg","300 mg","400 mg"] },
    "Risperidone": { "Tablet":["0.5 mg","1 mg","2 mg","3 mg","4 mg"] }
  },
  "Proton Pump Inhibitor": {
    "Esomeprazole": { "Tablet":["10 mg","20 mg"] },
    "Lansoprazole": { "Tablet":["15 mg","30 mg"], "Wafer":["15 mg","30 mg"] },
    "Omeprazole": { "Capsule":["10 mg","20 mg"], "Tablet":["10 mg","20 mg"] },
    "Pantoprazole": { "Tablet":["20 mg","40 mg"] },
    "Rabeprazole": { "Tablet":["10 mg","20 mg"] }
  }
};
const CLASS_ORDER = ["Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"];

/* =============== rules =============== */
function currentClass(){ return $("classSelect")?.value || ""; }
function isMR(form){ return /slow\s*release|modified|controlled|extended|sustained/i.test(form) || /(\bSR|MR|CR|ER|XR|PR|CD\b)/i.test(form); }
function canHalf(med, form){
  const cls = currentClass();
  if(cls==="Opioid" || cls==="Proton Pump Inhibitor") return false;
  if(isMR(form)) return false;
  if(/Capsule|Wafer|Patch/i.test(form)) return false;
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return false;
  return true;
}
function canQuarter(med, form){
  // If a tablet can be halved, it can also be quartered (same checks)
  return canHalf(med, form);
}

/* =============== parsing & dropdowns =============== */
function parseMgFromStrength(str){ if(!str) return 0; const lead=String(str).split("/")[0]; const m=lead.match(/([\d.]+)\s*mg/i); return m?parseFloat(m[1]):0; }
function parsePatchRate(str){ const m=String(str).match(/([\d.]+)\s*mcg\/hr/i); return m?parseFloat(m[1]):0; }

function populateClasses(){ const el=$("classSelect"); if(!el) return; el.innerHTML=""; CLASS_ORDER.forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=c; el.appendChild(o); }); }
function populateMedicines(){ const mSel=$("medicineSelect"), cls=$("classSelect")?.value; if(!mSel || !cls) return; mSel.innerHTML=""; const meds=Object.keys(CATALOG[cls]||{}); const ordered=(cls==="Opioid")?["Morphine","Oxycodone","Oxycodone / Naloxone","Tapentadol","Tramadol","Buprenorphine","Fentanyl"]:meds.slice().sort(); ordered.forEach(m=>{ if(meds.includes(m)){ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); }}); }
function populateForms(){ const fSel=$("formSelect"), cls=$("classSelect")?.value, med=$("medicineSelect")?.value; if(!fSel || !cls || !med) return; fSel.innerHTML=""; const forms=Object.keys((CATALOG[cls]||{})[med]||[]); forms.sort((a,b)=>{ const at=/tablet/i.test(a)?0:1, bt=/tablet/i.test(b)?0:1; return at!==bt?at-bt:a.localeCompare(b); }); forms.forEach(f=>{ const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o); }); }
function strengthsForSelected(){ const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value; return (CATALOG[cls]?.[med]?.[form]||[]).slice(); }

/* =============== dose lines =============== */
let doseLines=[]; let nextLineId=1;
function slotsForFreq(mode){ switch(mode){ case "AM":return["AM"]; case "MID":return["MID"]; case "DIN":return["DIN"]; case "PM":return["PM"]; case "BID":return["AM","PM"]; case "TID":return["AM","MID","PM"]; case "QID":return["AM","MID","DIN","PM"]; default:return["AM"]; } }
function patchFreqLabel(med){ return med==="Fentanyl"?"Every 3 days":"Every 7 days"; }
function renderDoseLines(){
  const box=$("doseLinesContainer"); if(!box) return;
  box.innerHTML="";
  if(doseLines.length===0){
    const p=document.createElement("p");
    p.textContent="(No dose lines)";
    p.style.color="#9ca3af";
    box.appendChild(p);
    return;
  }
  const med=$("medicineSelect").value, form=$("formSelect").value;

  doseLines.forEach((ln,idx)=>{
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0";
    row.innerHTML=`<span class="badge">Line ${idx+1}</span>
      <span>Strength:</span><select data-id="${ln.id}" class="dl-strength"></select>
      <span>Frequency:</span><select data-id="${ln.id}" class="dl-freq"></select>
      <button type="button" data-id="${ln.id}" class="secondary dl-remove">Remove</button>`;
    box.appendChild(row);

    const sSel=row.querySelector(".dl-strength");
    const sList=strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
    sSel.innerHTML="";
    sList.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
    sSel.value=ln.strengthStr || sList[sList.length-1];

    const fSel=row.querySelector(".dl-freq");
    fSel.innerHTML="";
    if(form==="Patch"){
      const o=document.createElement("option");
      o.value="PATCH";
      o.textContent=patchFreqLabel(med);
      fSel.appendChild(o);
      fSel.disabled=true;
    } else {
      const opts=[["AM","Daily in the morning"],["MID","Daily at midday"],["DIN","Daily at dinner"],["PM","Daily at night"],["BID","Twice daily (morning & night)"],["TID","Three times daily"],["QID","Four times daily"]];
      opts.forEach(([v,t])=>{ const o=document.createElement("option"); o.value=v; o.textContent=t; fSel.appendChild(o); });
      fSel.value=ln.freqMode || "AM";
      fSel.disabled=false;
    }

    sSel.addEventListener("change", e=>{ const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id); if(l) l.strengthStr=e.target.value; });
    fSel.addEventListener("change", e=>{ const id=+e.target.dataset.id; const l=doseLines.find(x=>x.id===id); if(l) l.freqMode=e.target.value; });
    row.querySelector(".dl-remove").addEventListener("click", e=>{ const id=+e.target.dataset.id; doseLines=doseLines.filter(x=>x.id!==id); renderDoseLines(); });
  });
}
function addDoseLine(){
  const sList=strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
  if(!sList.length){ banner("Select medicine & form first."); return; }
  doseLines.push({ id: nextLineId++, strengthStr: sList[sList.length-1], freqMode: "AM" });
  renderDoseLines();
}

/* =============== Suggested practice & headers =============== */
const RECOMMEND = {
  "Opioid":[
    "Tailor the plan to clinical characteristics, goals and preferences.",
    "< 3 months use: reduce 10–25% every week.",
    "> 3 months use: reduce 10–25% every 4 weeks.",
    "Long-term/high doses: slower taper and frequent monitoring."
  ],
  "Benzodiazepines / Z-Drug (BZRA)":[
    "Taper slowly with the patient; e.g., 25% every 2 weeks.",
    "Near end: consider 12.5% reductions and/or planned drug-free days."
  ],
  "Proton Pump Inhibitor":[
    "Step-down to lowest effective dose, alternate-day dosing, or stop and use on-demand.",
    "Review at 4–12 weeks."
  ],
  "Antipsychotic":[
    "Reduce ~25–50% every 1–2 weeks with close monitoring.",
    "Slower taper may be appropriate depending on symptoms."
  ]
};
function specialInstructionFor(med, form){
  if(form==="Patch") return "Special instruction: apply to intact skin as directed. Do not cut patches.";
  if(isMR(form)) return "Swallow whole, do not halve or crush";
  return "Swallow whole, do not halve or crush";
}
function updateRecommended(){
  const cls=$("classSelect")?.value;
  const bp=$("bestPracticeBox");
  bp.classList.remove("opioid");
  if(cls==="Opioid") bp.classList.add("opioid");
  bp.innerHTML=`<strong>Suggested Practice for ${cls||""}</strong><ul>${(RECOMMEND[cls]||[]).map(t=>`<li>${t}</li>`).join("")}</ul>`;
  const med=$("medicineSelect")?.value, form=$("formSelect")?.value;
  $("hdrMedicine").textContent=`Medicine: ${med} ${form}`;
  $("hdrSpecial").textContent=`Special instructions: ${specialInstructionFor(med, form)}`;
}

/* =============== tablet-piece engine =============== */
function allowedPiecesMg(med, form){
  const strengths=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0);
  const uniq=Array.from(new Set(strengths)).sort((a,b)=>a-b);
  let pieces=uniq.slice();
  if(canHalf(med, form)) uniq.forEach(v=>pieces.push(v/2));
  if(canQuarter(med, form)) uniq.forEach(v=>pieces.push(v/4));
  pieces=Array.from(new Set(pieces.map(v=>+v.toFixed(2)))).sort((a,b)=>a-b);
  return pieces;
}
function buildPacksFromDoseLines(){
  const med=$("medicineSelect").value, form=$("formSelect").value;
  const pieces=allowedPiecesMg(med, form);
  const packs={ AM:{}, MID:{}, DIN:{}, PM:{} };
  const add=(slot,mg,n=1)=>{ packs[slot][mg]=(packs[slot][mg]||0)+n; };
  doseLines.forEach(ln=>{
    const mg=parseMgFromStrength(ln.strengthStr);
    const slots=slotsForFreq(ln.freqMode);
    slots.forEach(sl=>{
      let remaining=+mg.toFixed(2);
      const desc=pieces.slice().sort((a,b)=>b-a);
      for(const p of desc){
        if(remaining<=0) break;
        const n=Math.floor((remaining+1e-9)/p);
        if(n>0){ add(sl,p,n); remaining=+(remaining-n*p).toFixed(2); }
      }
    });
  });
  return packs;
}
function packTotalMg(pack){
  return Object.entries(pack).reduce((s,[mg,c])=>s + parseFloat(mg)*c, 0);
}
function packsTotalMg(packs){
  return packTotalMg(packs.AM)+packTotalMg(packs.MID)+packTotalMg(packs.DIN)+packTotalMg(packs.PM);
}
function removeFromPackByMg(pack, amount){
  let toDrop=+amount.toFixed(4);
  const sizes=Object.keys(pack).map(parseFloat).sort((a,b)=>b-a);
  for(const p of sizes){
    while(toDrop>0 && pack[p]>0){
      pack[p]-=1;
      if(pack[p]===0) delete pack[p];
      toDrop=+(toDrop-p).toFixed(4);
    }
    if(toDrop<=0) break;
  }
  return Math.max(0,toDrop);
}
function smallestPiece(med, form){
  return allowedPiecesMg(med, form)[0] || 0;
}

/* =============== split helpers =============== */
function composeExactWithPieces(target, pieceSet){
  let rem=target, used={};
  const arr=pieceSet.slice().sort((a,b)=>b-a);
  for(const s of arr){
    const n=Math.floor(rem/s + 1e-9);
    if(n>0){ used[s]=(used[s]||0)+n; rem=+(rem - n*s).toFixed(2); }
  }
  return (Math.abs(rem) < 1e-6) ? used : null;
}
function splitDailyToBID_withPieces(totalDailyMg, pieceSet){
  const strengths=pieceSet.slice().sort((a,b)=>b-a);
  const half=Math.floor(totalDailyMg/2);
  for(let amTarget=half; amTarget>=0; amTarget--){
    const pmTarget=totalDailyMg - amTarget;
    const am=composeExactWithPieces(amTarget, strengths);
    if(!am) continue;
    const pm=composeExactWithPieces(pmTarget, strengths);
    if(pm && pmTarget>=amTarget){
      return {AM:am, PM:pm};
    }
  }
  const all=composeExactWithPieces(totalDailyMg, strengths) || {[strengths[strengths.length-1]]:1};
  return {AM:{}, PM:all};
}

/* =============== step functions =============== */
function opioidStep(packs, percent, med, form){
  const current = packsTotalMg(packs);
  if(current <= 0.01) return packs;
  const step = smallestPiece(med, form) || 5;
  const rawTarget = current * (1 - percent/100);
  let targetDaily = roundToNearestMultiple(rawTarget, step);
  if(targetDaily === current && current > 0){
    targetDaily = Math.max(0, current - step);
    targetDaily = roundToNearestMultiple(targetDaily, step);
  }
  const bid = splitDailyToBID_withPieces(targetDaily, strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0));
  return { AM: bid.AM, MID: {}, DIN: {}, PM: bid.PM };
}

function bzraOrAntipsychoticStep(packs, percent, med, form){
  const current=packsTotalMg(packs);
  if(current<=0.01) return packs;
  const step=smallestPiece(med, form) || 0.125;
  const rawTarget=current*(1 - percent/100);
  let target=roundToNearestMultiple(rawTarget, step);
  if(target===current && current>0){
    target=Math.max(0, current - step);
    target=roundToNearestMultiple(target, step);
  }
  const pieces=allowedPiecesMg(med, form);
  const bid=splitDailyToBID_withPieces(target, pieces);
  return { AM: bid.AM, MID: {}, DIN: {}, PM: bid.PM };
}

/* =============== builders =============== */
function deepCopy(obj){ return JSON.parse(JSON.stringify(obj)); }

function buildPlanTablets(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value;
  const p1Percent=Math.max(1, parseFloat($("#p1Percent")?.value||"0"));
  const p1Interval=Math.max(1, parseInt($("#p1Interval")?.value||"0",10));
  const p1StopWeek=parseInt($("#p1StopWeek")?.value||"0",10)||0;
  const p2Percent=Math.max(0, parseFloat($("#p2Percent")?.value||"0"));
  const p2Interval=p2Percent?Math.max(1, parseInt($("#p2Interval")?.value||"0",10)):0;
  const startDate=$("#startDate")?($("#startDate")._flatpickr?.selectedDates?.[0]||new Date()):new Date();
  const reviewDate=$("#reviewDate")?($("#reviewDate")._flatpickr?.selectedDates?.[0]||null):null;

  let packs=buildPacksFromDoseLines();
  if(packsTotalMg(packs)===0){
    const max=allowedPiecesMg(med, form).slice(-1)[0];
    packs.AM[max]=1;
  }

  const rows=[];
  let date=startOfWeek(startDate);
  let week=1;

  const doOneStep=(percent)=>{
    if(cls==="Opioid"){ packs = opioidStep(packs, percent, med, form); }
    else if(cls==="Benzodiazepines / Z-Drug (BZRA)" || cls==="Antipsychotic"){
      packs = bzraOrAntipsychoticStep(packs, percent, med, form);
    } else if(cls==="Proton Pump Inhibitor"){
      // reduce MID, then AM, then PM
      const total=packsTotalMg(packs); let rem=+(total*(percent/100)).toFixed(4);
      ["MID","AM","PM"].forEach(k=>{ if(rem>0) rem=removeFromPackByMg(packs[k], rem); });
    }
  };

  // first week
  doOneStep(p1Percent);
  rows.push({ date: fmtDate(date), packs: deepCopy(packs), med, form });

  // continue phase 1
  while(packsTotalMg(packs)>0.01){
    if(p1StopWeek && week>=p1StopWeek) break;
    date=addDays(date, p1Interval); week+=1;
    doOneStep(p1Percent);
    rows.push({ date: fmtDate(date), packs: deepCopy(packs), med, form });
    if(reviewDate && date>=reviewDate) break;
    if((+date - +startDate) >= THREE_MONTHS_MS) break;
    if(rows.length>=MAX_WEEKS) break;
  }

  // phase 2 (optional)
  if(p2Percent && packsTotalMg(packs)>0.01){
    while(packsTotalMg(packs)>0.01){
      date=addDays(date, p2Interval); week+=1;
      doOneStep(p2Percent);
      rows.push({ date: fmtDate(date), packs: deepCopy(packs), med, form });
      if(reviewDate && date>=reviewDate) break;
      if((+date - +startDate) >= THREE_MONTHS_MS) break;
      if(rows.length>=MAX_WEEKS) break;
    }
  }

  return rows; // no terminal padding rows
}

function buildPlanPatch(){
  const med=$("medicineSelect").value;
  const startDate=$("#startDate")?($("#startDate")._flatpickr?.selectedDates?.[0]||new Date()):new Date();
  const reviewDate=$("#reviewDate")?($("#reviewDate")._flatpickr?.selectedDates?.[0]||null):null;
  const p1Percent=Math.max(1, parseFloat($("#p1Percent")?.value||"0"));
  const p1Interval=Math.max(1, parseInt($("#p1Interval")?.value||"0",10));

  const strengths=strengthsForSelected().map(parsePatchRate).filter(v=>v>0).sort((a,b)=>b-a);
  const everyDays=(med==="Fentanyl")?3:7;

  let total=0;
  doseLines.forEach(ln=>{ total += parsePatchRate(ln.strengthStr)||0; });
  if(total<=0) total=strengths[strengths.length-1];

  function nextDose(curr){
    const tgtUp=Math.ceil(curr*(1 - p1Percent/100));
    let remaining=tgtUp, used=[];
    for(const s of strengths){ while(remaining>=s){ used.push(s); remaining-=s; } }
    while(remaining>0){ const s=strengths[strengths.length-1]; used.push(s); remaining-=s; }
    return { value: used.reduce((a,b)=>a+b,0), used };
  }

  const rows=[];
  let date=startOfWeek(startDate);
  let step=nextDose(total);
  rows.push({ date: fmtDate(date), patches: step.used, med, form:"Patch" });

  let curr=step.value;
  const endDate=addDays(startDate,90);

  while(curr>strengths[strengths.length-1]){
    date=addDays(date,p1Interval);
    const nxt=nextDose(curr);
    curr=nxt.value;
    rows.push({ date: fmtDate(date), patches: nxt.used, med, form:"Patch" });
    if(reviewDate && date>=reviewDate) break;
    if(date>endDate) break;
    if(rows.length>=MAX_WEEKS) break;
  }

  // final week (lowest patch), then stop
  if(curr>0){
    date=addDays(date,p1Interval);
    rows.push({ date: fmtDate(date), patches: [strengths[strengths.length-1]], med, form:"Patch" });
  }
  date=addDays(date,p1Interval);
  rows.push({ date: fmtDate(date), patches: [], med, form:"Patch", stop:true });

  return rows;
}

/* =============== rendering (per-strength rows) =============== */
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text||""); return el; }

function renderStandardTable(rows){
  const patchBlock=$("#patchBlock"), scheduleBlock=$("#scheduleBlock");
  if(patchBlock) patchBlock.style.display="none";
  if(!scheduleBlock) return;
  scheduleBlock.style.display="";
  scheduleBlock.innerHTML="";

  const table=document.createElement("table");
  table.className="table";

  const thead=document.createElement("thead");
  const hr=document.createElement("tr");
  ["Week beginning","Strength","Instructions","Morning","Midday","Dinner","Night"].forEach(h=>{
    const th=document.createElement("th"); th.textContent=h; hr.appendChild(th);
  });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody=document.createElement("tbody");

  rows.forEach(r=>{
    const med=r.med, form=r.form;
    const formLbl = (form||"").replace(/\bsr\b/ig,"SR").toLowerCase();
    const packs=r.packs;

    const allMg = new Set();
    [packs.AM,packs.MID,packs.DIN,packs.PM].forEach(pack=>{
      Object.keys(pack).forEach(mgStr=>allMg.add(+mgStr));
    });
    const mgList = Array.from(allMg).sort((a,b)=>a-b);
    const lines = mgList.length ? mgList : [null];

    lines.forEach((mg, idx)=>{
      const tr=document.createElement("tr");
      if(idx===0){
        const d=td(r.date);
        if(lines.length>1) d.rowSpan=lines.length;
        tr.appendChild(d);
      }
      if(r.stop || mg===null){
        tr.appendChild(td(""));
        tr.appendChild(td(r.stop ? "Stop." : "", "instructions-pre"));
        tr.appendChild(td("", "center"));
        tr.appendChild(td("", "center"));
        tr.appendChild(td("", "center"));
        tr.appendChild(td("", "center"));
        tbody.appendChild(tr);
        return;
      }

      const am = r.packs.AM[mg]||0, mid=r.packs.MID[mg]||0, din=r.packs.DIN[mg]||0, pm=r.packs.PM[mg]||0;
      const linesTxt=[];
      if(am)  linesTxt.push(`Take ${am===1?"1 tablet":am+" tablets"} in the morning`);
      if(mid) linesTxt.push(`Take ${mid===1?"1 tablet":mid+" tablets"} at midday`);
      if(din) linesTxt.push(`Take ${din===1?"1 tablet":din+" tablets"} at dinner`);
      if(pm)  linesTxt.push(`Take ${pm===1?"1 tablet":pm+" tablets"} at night`);

      const strengthLabel = `${med} ${( +mg.toFixed(2) ).toString().replace(/\.00$/,'')} mg ${formLbl}`;
      tr.appendChild(td(strengthLabel));
      tr.appendChild(td(linesTxt.join("\n"), "instructions-pre"));
      tr.appendChild(td(am || "", "center"));
      tr.appendChild(td(mid || "", "center"));
      tr.appendChild(td(din || "", "center"));
      tr.appendChild(td(pm || "", "center"));
      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
  scheduleBlock.appendChild(table);
}

function renderPatchTable(rows){
  const scheduleBlock=$("#scheduleBlock"), patchBlock=$("#patchBlock");
  if(!patchBlock) return;
  scheduleBlock.style.display="none";
  patchBlock.style.display="";
  patchBlock.innerHTML="";

  const table=document.createElement("table");
  table.className="table";
  const thead=document.createElement("thead");
  const hr=document.createElement("tr");
  ["Apply on","Remove on","Patch strength(s)","Instructions"].forEach(h=>{
    const th=document.createElement("th"); th.textContent=h; hr.appendChild(th);
  });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody=document.createElement("tbody");
  const everyDays=($("#medicineSelect").value==="Fentanyl")?3:7;

  rows.forEach(r=>{
    const tr=document.createElement("tr");
    tr.appendChild(td(r.date));
    tr.appendChild(td(fmtDate(addDays(new Date(r.date), everyDays))));
    tr.appendChild(td((r.patches||[]).map(v=>`${v} mcg/hr`).join(" + ")));
    tr.appendChild(td(r.stop ? "Stop." : `Apply patches every ${everyDays} days.`));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  patchBlock.appendChild(table);
}

/* =============== footer =============== */
function setFooterText(cls){
  const exp = {
    "Opioid":"Expected benefits: Improved function and reduced opioid-related harms.",
    "Benzodiazepines / Z-Drug (BZRA)":"Expected benefits: Improved cognition, daytime alertness, and reduced falls.",
    "Proton Pump Inhibitor":"Expected benefits: Reduced pill burden and adverse effects with long-term use.",
    "Antipsychotic":"Expected benefits: Lower risk of metabolic/extrapyramidal adverse effects."
  }[cls] || "—";
  const wdr = {
    "Opioid":"Withdrawal: transient pain flare, cravings, mood changes.",
    "Benzodiazepines / Z-Drug (BZRA)":"Withdrawal: insomnia, anxiety, irritability.",
    "Proton Pump Inhibitor":"Withdrawal: rebound heartburn.",
    "Antipsychotic":"Withdrawal: sleep disturbance, anxiety, return of target symptoms."
  }[cls] || "—";
  $("#expBenefits").textContent = exp;
  $("#withdrawalInfo").textContent = wdr;
}

/* =============== build & init =============== */
function buildPlan(){
  try{
    const cls=$("#classSelect")?.value, med=$("#medicineSelect")?.value, form=$("#formSelect")?.value;
    if(!cls || !med || !form){ banner("Please select medicine class, medicine, and form."); return; }
    $("#hdrMedicine").textContent=`Medicine: ${med} ${form}`;
    $("#hdrSpecial").textContent=`Special instructions: ${specialInstructionFor(med, form)}`;
    const isPatch=(form==="Patch");
    const rows=isPatch?buildPlanPatch():buildPlanTablets();
    if(isPatch) renderPatchTable(rows); else renderStandardTable(rows);
    setFooterText(cls);
  } catch(err){
    console.error(err); banner("Error: " + (err?.message||String(err)));
  }
}

function init(){
  document.querySelectorAll(".datepick").forEach(el=>{
    if(window.flatpickr){ flatpickr(el,{dateFormat:"Y-m-d",allowInput:true}); }
    else { el.type="date"; }
  });

  populateClasses(); populateMedicines(); populateForms();
  doseLines=[]; addDoseLine();

  $("#classSelect")?.addEventListener("change", ()=>{ populateMedicines(); populateForms(); updateRecommended(); doseLines=[]; addDoseLine(); });
  $("#medicineSelect")?.addEventListener("change", ()=>{ populateForms(); updateRecommended(); doseLines=[]; addDoseLine(); });
  $("#formSelect")?.addEventListener("change", ()=>{ updateRecommended(); doseLines=[]; addDoseLine(); });

  $("#addDoseLineBtn")?.addEventListener("click", addDoseLine);
  $("#generateBtn")?.addEventListener("click", buildPlan);
  $("#resetBtn")?.addEventListener("click", ()=>location.reload());
  $("#printBtn")?.addEventListener("click", ()=>window.print());
  $("#savePdfBtn")?.addEventListener("click", ()=>{
    const el = $("#outputCard");
    if(typeof html2pdf==="function"){
      html2pdf().set({
        filename:'taper_plan.pdf',
        margin:10,
        image:{ type:'jpeg', quality:0.95 },
        html2canvas:{ scale:2, useCORS:true },
        jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' }
      }).from(el).save();
    } else {
      alert("PDF library not loaded.");
    }
  });

  updateRecommended();
}

document.addEventListener("DOMContentLoaded", ()=>{ try{ init(); } catch(e){ console.error(e); banner("Init error: " + (e?.message||String(e))); }});
