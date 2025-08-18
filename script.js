"use strict";

/* =============== utils =============== */
const $ = id => document.getElementById(id);
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function banner(msg){ const b=document.createElement("div"); b.style.cssText="position:fixed;left:0;right:0;bottom:0;background:#7f1d1d;color:#fff;padding:8px 12px;font:14px system-ui;z-index:999999"; b.textContent=msg; document.body.appendChild(b); }

const SLOT_KEYS = ["AM","MID","DIN","PM"];
const MAX_WEEKS = 60;
const THREE_MONTHS_MS = 90 * 24 * 3600 * 1000;

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
    "Zolpidem": { "Tablet":["10 mg"], "Slow Release Tablet":["6.25 mg","12.5 mg"] }, // SR cannot split
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
function isMR(form){ return /slow\s*release|modified|controlled|extended|sustained/i.test(form) || /\b(SR|MR|CR|ER|XR|PR|CD)\b/i.test(form); }
function canHalf(med, form){
  const cls = currentClass();
  if(cls==="Opioid" || cls==="Proton Pump Inhibitor") return false;
  if(isMR(form)) return false;
  if(/Capsule|Wafer|Patch/i.test(form)) return false;
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return false;
  return true;
}
function canQuarter(med, form){
  const cls = currentClass();
  if(cls==="Opioid" || cls==="Proton Pump Inhibitor") return false;
  if(isMR(form)) return false;
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return false;
  return true; // IR BZRA/Antipsychotics only
}

/* =============== parsing & dropdowns =============== */
function parseMgFromStrength(str){
  if(!str) return 0;
  const lead = String(str).split("/")[0]; // use first number if combo (e.g., oxycodone/naloxone)
  const m = lead.match(/([\d.]+)\s*mg/i);
  return m ? parseFloat(m[1]) : 0;
}
function parsePatchRate(str){ const m=String(str).match(/([\d.]+)\s*mcg\/hr/i); return m?parseFloat(m[1]):0; }

function populateClasses(){ const el=$("classSelect"); if(!el) return; el.innerHTML=""; CLASS_ORDER.forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=c; el.appendChild(o); }); }
function populateMedicines(){
  const mSel=$("medicineSelect"), cls=$("classSelect")?.value;
  if(!mSel || !cls) return;
  mSel.innerHTML="";
  const meds=Object.keys(CATALOG[cls]||{});
  const ordered=(cls==="Opioid")?["Morphine","Oxycodone","Oxycodone / Naloxone","Tapentadol","Tramadol","Buprenorphine","Fentanyl"]:meds.slice().sort();
  ordered.forEach(m=>{ if(meds.includes(m)){ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); }});
}
function populateForms(){
  const fSel=$("formSelect"), cls=$("classSelect")?.value, med=$("medicineSelect")?.value;
  if(!fSel || !cls || !med) return;
  fSel.innerHTML="";
  const forms=Object.keys((CATALOG[cls]||{})[med]||[]);
  forms.sort((a,b)=>{ const at=/tablet/i.test(a)?0:1, bt=/tablet/i.test(b)?0:1; return at!==bt?at-bt:a.localeCompare(b); });
  forms.forEach(f=>{ const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o); });
}
function strengthsForSelected(){
  const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value;
  return (CATALOG[cls]?.[med]?.[form]||[]).slice();
}

/* =============== dose lines =============== */
let doseLines=[]; let nextLineId=1;
function slotsForFreq(mode){
  switch(mode){
    case "AM": return ["AM"];
    case "MID": return ["MID"];
    case "DIN": return ["DIN"];
    case "PM": return ["PM"];
    case "BID": return ["AM","PM"];
    case "TID": return ["AM","MID","PM"];
    case "QID": return ["AM","MID","DIN","PM"];
    default: return ["AM"];
  }
}
function renderDoseLines(){
  const box=$("doseLinesContainer"); if(!box) return;
  box.innerHTML="";
  if(doseLines.length===0){
    const p=document.createElement("p"); p.textContent="(No dose lines)"; p.style.color="#9ca3af"; box.appendChild(p); return;
  }
  doseLines.forEach((ln,idx)=>{
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0";
    row.innerHTML=`<span class="badge">Line ${idx+1}</span>
      <span>Strength:</span><select data-id="${ln.id}" class="dl-strength"></select>
      <span>Frequency:</span><select data-id="${ln.id}" class="dl-freq">
        <option value="AM">Daily in the morning</option>
        <option value="MID">Daily at midday</option>
        <option value="DIN">Daily at dinner</option>
        <option value="PM">Daily at night</option>
        <option value="BID">Twice daily (morning & night)</option>
        <option value="TID">Three times daily</option>
        <option value="QID">Four times daily</option>
      </select>
      <button type="button" data-id="${ln.id}" class="secondary dl-remove">Remove</button>`;
    box.appendChild(row);

    const sSel=row.querySelector(".dl-strength");
    const sList=strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
    sSel.innerHTML=""; sList.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
    sSel.value=ln.strengthStr || sList[sList.length-1];

    const fSel=row.querySelector(".dl-freq"); fSel.value=ln.freqMode || "AM";

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

/* =============== best practice & headers =============== */
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
  $("bestPracticeBox").innerHTML=`<strong>Recommended Practice for ${cls||""}</strong><ul style="margin:6px 0 0 18px">${(RECOMMEND[cls]||[]).map(t=>`<li>${t}</li>`).join("")}</ul>`;
  const med=$("medicineSelect")?.value, form=$("formSelect")?.value;
  $("hdrMedicine").textContent=`Medicine: ${med} ${form}`;
  $("hdrSpecial").textContent=`Special instructions: ${specialInstructionFor(med, form)}`;
  ["hdrPatient","hdrAllergies","hdrHcp"].forEach(id=>{ const el=$(id); if(el) el.style.display="none"; });
}

/* =============== tablet-piece engine =============== */
function allowedPiecesMg(med, form){
  const strengths=strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0);
  const uniq=Array.from(new Set(strengths)).sort((a,b)=>a-b);
  let pieces=uniq.slice(); // whole tablets always
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
function packTotalMg(pack){ return Object.entries(pack).reduce((s,[mg,c])=>s + parseFloat(mg)*c, 0); }
function packsTotalMg(packs){ return packTotalMg(packs.AM)+packTotalMg(packs.MID)+packTotalMg(packs.DIN)+packTotalMg(packs.PM); }
function removeFromPackByMg(pack, amount){
  let toDrop=+amount.toFixed(4);
  const sizes=Object.keys(pack).map(parseFloat).sort((a,b)=>b-a);
  for(const p of sizes){
    while(toDrop>0 && pack[p]>0){
      pack[p]-=1; if(pack[p]===0) delete pack[p];
      toDrop=+(toDrop-p).toFixed(4);
    }
    if(toDrop<=0) break;
  }
  return Math.max(0,toDrop);
}
function countPieces(pack){ return Object.values(pack).reduce((a,b)=>a+b,0); }
function smallestPiece(med, form){ return allowedPiecesMg(med, form)[0] || 0; }

/* =============== BID split & opioid step (FIXED) =============== */
// Build AM/PM exactly from whole SR tablets, PM ≥ AM, fewest pieces.
function splitDailyToBID_exact(totalDailyMg, med, form) {
  const strengths = strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0).sort((a,b)=>b-a); // e.g., [30,20,15,10,5]

  function composeExact(target){
    // greedy exact (works for canonical SR sets like 30/20/15/10/5)
    let rem = target, used = {};
    for (const s of strengths){
      const n = Math.floor(rem / s);
      if(n>0){ used[s]=(used[s]||0)+n; rem = +(rem - n*s).toFixed(2); }
    }
    return (rem===0) ? {sum: target, used} : null;
  }

  // Aim for an even split; if not possible, bias PM upward.
  const half = Math.floor(totalDailyMg/2);
  for(let amTarget = half; amTarget >= 0; amTarget -= 1){
    const pmTarget = totalDailyMg - amTarget;
    const am = composeExact(amTarget);
    if(!am) continue;
    const pm = composeExact(pmTarget);
    if(pm && pmTarget >= amTarget){
      return { AM: am.used, PM: pm.used };
    }
  }
  // Fallback: everything nocte if we can't split (very rare for these sets)
  const fallback = composeExact(totalDailyMg) || {used:{[strengths[strengths.length-1]]:1}};
  return { AM: {}, PM: fallback.used };
}

function opioidStep(packs, percent, med, form){
  const current = packsTotalMg(packs);
  if(current <= 0.01) return packs;

  // 1) compute new total daily
  let targetDaily = Math.round(current * (1 - percent/100));
  if(targetDaily < 0) targetDaily = 0;

  // If any MID/DIN exists, strip them first toward the needed drop
  const dropNeeded = current - targetDaily;
  if(packTotalMg(packs.MID)>0 || packTotalMg(packs.DIN)>0){
    let rem = dropNeeded;
    rem = removeFromPackByMg(packs.DIN, rem);
    rem = removeFromPackByMg(packs.MID, rem);
    // Recompute actual target after removing MID/DIN
    targetDaily = Math.round(packsTotalMg(packs) - rem);
  }

  // 2) split to BID using whole SR tablets only
  const bid = splitDailyToBID_exact(targetDaily, med, form);

  const toPack = k => {
    const obj = {};
    Object.entries(k).forEach(([mg,count])=>{
      const m = parseFloat(mg);
      obj[m] = (obj[m]||0) + count;
    });
    return obj;
  };
  return { AM: toPack(bid.AM), MID: {}, DIN: {}, PM: toPack(bid.PM) };
}

/* =============== reduction order for other classes =============== */
function reduceByPercentWithOrder(packs, percent, order){
  const total=packsTotalMg(packs);
  let rem=+(total*(percent/100)).toFixed(4);
  for(const key of order){
    if(rem<=0) break;
    rem = removeFromPackByMg(packs[key], rem);
  }
}

/* =============== instruction & strength labels =============== */
function formatFormLabel(form){
  // Ensure "SR" capitalised
  return form.replace(/\bsr\b/ig,"SR").replace(/Slow Release/ig,"Slow Release");
}
function buildInstructionLine(pack, tail){
  if(countPieces(pack)===0) return null;
  const cls=currentClass();
  const entries=Object.entries(pack).map(([mg,c])=>({mg:parseFloat(mg),c})).sort((a,b)=>b.mg-a.mg);
  const wholeSizes=strengthsForSelected().map(parseMgFromStrength);

  const parts=[];
  entries.forEach(({mg,c})=>{
    let name="tablet";
    if(!(cls==="Opioid" || cls==="Proton Pump Inhibitor" || isMR($("formSelect").value))){
      const isWhole = wholeSizes.some(w=>Math.abs(w-mg)<0.01);
      const isHalfOnly = !isWhole && wholeSizes.some(w=>Math.abs(w/2 - mg)<0.01);
      const isQuarterOnly = !isWhole && wholeSizes.some(w=>Math.abs(w/4 - mg)<0.01);
      if(isQuarterOnly) name="quarter tablet";
      else if(isHalfOnly) name="half tablet";
    }
    parts.push(c===1 ? `1 ${name}` : `${c} ${name}s`);
  });
  return `Take ${parts.join(" + ")} ${tail}`;
}

// Keep multiple strength rows; capitalise SR in labels
function strengthLabelsFromPacks(packs, med, form){
  const labels=new Set();
  const formLabel = formatFormLabel(form.toLowerCase());
  const addFrom = pack => Object.keys(pack).forEach(mgStr=>{
    const mg = (+parseFloat(mgStr).toFixed(2)).toString().replace(/\.00$/,'');
    labels.add(`${med} ${mg} mg ${formLabel}`);
  });
  addFrom(packs.AM); addFrom(packs.MID); addFrom(packs.DIN); addFrom(packs.PM);
  return Array.from(labels);
}

/* =============== builders: tablets vs patches =============== */
function buildPlanTablets(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value;
  const p1Percent=Math.max(1, parseFloat($("p1Percent")?.value||"0"));
  const p1Interval=Math.max(1, parseInt($("p1Interval")?.value||"0",10));
  const p1StopWeek=parseInt($("p1StopWeek")?.value||"0",10)||0;
  const p2Percent=Math.max(0, parseFloat($("p2Percent")?.value||"0"));
  const p2Interval=p2Percent?Math.max(1, parseInt($("p2Interval")?.value||"0",10)):0;

  const startDate=$("startDate")?($("startDate")._flatpickr?.selectedDates?.[0]||new Date()):new Date();
  const reviewDate=$("reviewDate")?($("reviewDate")._flatpickr?.selectedDates?.[0]||null):null;

  let packs=buildPacksFromDoseLines();
  if(packsTotalMg(packs)===0){ const max=allowedPiecesMg(med, form).slice(-1)[0]; packs.AM[max]=1; }

  const rows=[]; let date=startOfWeek(startDate); let week=1;
  const pushRow=(note=null)=>{
    const instr=[];
    const am=buildInstructionLine(packs.AM,"in the morning"); if(am) instr.push(am);
    const md=buildInstructionLine(packs.MID,"at midday");     if(md) instr.push(md);
    const dn=buildInstructionLine(packs.DIN,"at dinner");     if(dn) instr.push(dn);
    const pm=buildInstructionLine(packs.PM,"at night");       if(pm) instr.push(pm);
    if(note) instr.push(note);
    rows.push({
      date: fmtDate(date),
      strengths: strengthLabelsFromPacks(packs, med, form),
      instructions: instr.join("\n"),
      am: countPieces(packs.AM), mid: countPieces(packs.MID), din: countPieces(packs.DIN), pm: countPieces(packs.PM)
    });
  };

  const doOneStep=(percent)=>{
    if(cls==="Opioid"){ packs = opioidStep(packs, percent, med, form); }
    else if(cls==="Benzodiazepines / Z-Drug (BZRA)"){ reduceByPercentWithOrder(packs, percent, ["MID","DIN","AM","PM"]); }
    else if(cls==="Antipsychotic"){ reduceByPercentWithOrder(packs, percent, ["MID","DIN","AM","PM"]); }
    else if(cls==="Proton Pump Inhibitor"){ reduceByPercentWithOrder(packs, percent, ["MID","AM","PM"]); }
  };

  // First reduction before first printed week
  doOneStep(p1Percent);
  pushRow();

  while(packsTotalMg(packs)>0.01){
    if(p1StopWeek && week>=p1StopWeek) break;
    date=addDays(date, p1Interval); week+=1;
    doOneStep(p1Percent);
    pushRow();
    if(reviewDate && date>=reviewDate) break;
    if((+date - +startDate) >= THREE_MONTHS_MS) break;
    if(rows.length>=MAX_WEEKS) break;
  }

  if(p2Percent && packsTotalMg(packs)>0.01){
    while(packsTotalMg(packs)>0.01){
      date=addDays(date, p2Interval); week+=1;
      doOneStep(p2Percent);
      pushRow();
      if(reviewDate && date>=reviewDate) break;
      if((+date - +startDate) >= THREE_MONTHS_MS) break;
      if(rows.length>=MAX_WEEKS) break;
    }
  }

  // Terminal pattern
  const min=smallestPiece(med, form);
  if(min){
    if(cls==="Proton Pump Inhibitor"){
      date=addDays(date, p1Interval);
      packs={ AM:{}, MID:{}, DIN:{[min]:1}, PM:{} }; pushRow();
      date=addDays(date, p1Interval);
      rows.push({ date: fmtDate(date), strengths: [], instructions: "Stop.", am:0, mid:0, din:0, pm:0 });
    } else if(cls==="Opioid"){
      date=addDays(date, p1Interval);
      packs={ AM:{[min]:1}, MID:{}, DIN:{}, PM:{[min]:1} }; pushRow(); // BID at lowest tablet
      date=addDays(date, p1Interval);
      packs={ AM:{}, MID:{}, DIN:{}, PM:{[min]:1} };       pushRow(); // nocte lowest
      date=addDays(date, p1Interval);
      rows.push({ date: fmtDate(date), strengths: [], instructions: "Stop.", am:0, mid:0, din:0, pm:0 });
    } else {
      date=addDays(date, p1Interval);
      packs={ AM:{}, MID:{}, DIN:{}, PM:{[min]:1} }; pushRow();
      date=addDays(date, p1Interval);
      rows.push({ date: fmtDate(date), strengths: [], instructions: "Stop.", am:0, mid:0, din:0, pm:0 });
    }
  } else {
    date=addDays(date, p1Interval);
    rows.push({ date: fmtDate(date), strengths: [], instructions: "Stop.", am:0, mid:0, din:0, pm:0 });
  }

  return rows;
}

function buildPlanPatch(){
  const med=$("medicineSelect").value;
  const startDate=$("startDate")?($("startDate")._flatpickr?.selectedDates?.[0]||new Date()):new Date();
  const reviewDate=$("reviewDate")?($("reviewDate")._flatpickr?.selectedDates?.[0]||null):null;
  const p1Percent=Math.max(1, parseFloat($("p1Percent")?.value||"0"));
  const p1Interval=Math.max(1, parseInt($("p1Interval")?.value||"0",10));
  const everyDays=(med==="Fentanyl")?3:7;

  const strengths=strengthsForSelected().map(parsePatchRate).filter(v=>v>0).sort((a,b)=>b-a);
  let total=0; doseLines.forEach(ln=>{ total += parsePatchRate(ln.strengthStr)||0; });
  if(total<=0) total=strengths[strengths.length-1];

  function nextDose(curr){
    const tgtUp=Math.ceil(curr*(1 - p1Percent/100));
    let remaining=tgtUp, used=[];
    for(const s of strengths){
      while(remaining>=s){ used.push(s); remaining-=s; }
    }
    while(remaining>0){ const s=strengths[strengths.length-1]; used.push(s); remaining-=s; }
    return { value: used.reduce((a,b)=>a+b,0), used };
  }

  const rows=[]; let date=startOfWeek(startDate);
  let step=nextDose(total);
  rows.push({ date: fmtDate(date), patches: step.used, instructions: `Apply patches every ${everyDays} days.` });

  const smallest=strengths[strengths.length-1];
  let curr=step.value;
  const endDate=addDays(startDate,90);
  while(curr>smallest){
    date=addDays(date,p1Interval);
    const nxt=nextDose(curr); curr=nxt.value;
    rows.push({ date: fmtDate(date), patches: nxt.used, instructions: `Apply patches every ${everyDays} days.` });
    if(reviewDate && date>=reviewDate) break;
    if(date>endDate) break;
    if(rows.length>=MAX_WEEKS) break;
  }
  // Hold smallest for one interval, then stop
  date=addDays(date,p1Interval);
  rows.push({ date: fmtDate(date), patches: [smallest], instructions: `Apply patches every ${everyDays} days.` });
  date=addDays(date,p1Interval);
  rows.push({ date: fmtDate(date), patches: [], instructions: "Stop." });
  return rows;
}

/* =============== rendering =============== */
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text||""); return el; }

function renderStandardTable(rows){
  const patchBlock=$("patchBlock"), scheduleBlock=$("scheduleBlock");
  if(patchBlock) patchBlock.style.display="none";
  if(!scheduleBlock) return;
  scheduleBlock.style.display=""; scheduleBlock.innerHTML="";

  const table=document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  ["Week beginning","Strength","Instructions","Morning","Midday","Dinner","Night"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody=document.createElement("tbody");
  rows.forEach(r=>{
    const strengths=(r.strengths && r.strengths.length)?r.strengths:[""];
    strengths.forEach((s,idx)=>{
      const tr=document.createElement("tr");
      if(idx===0){ const d=td(r.date); if(strengths.length>1) d.rowSpan=strengths.length; tr.appendChild(d); }
      tr.appendChild(td(s));
      tr.appendChild(td(r.instructions,"instructions-pre"));
      tr.appendChild(td(r.am,"center"));
      tr.appendChild(td(r.mid,"center"));
      tr.appendChild(td(r.din,"center"));
      tr.appendChild(td(r.pm,"center"));
      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
  scheduleBlock.appendChild(table);
}

function renderPatchTable(rows){
  const scheduleBlock=$("scheduleBlock"), patchBlock=$("patchBlock");
  if(!patchBlock) return;
  scheduleBlock.style.display="none"; patchBlock.style.display=""; patchBlock.innerHTML="";

  const table=document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  ["Apply on","Remove on","Patch strength(s)","Instructions"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody=document.createElement("tbody");
  const everyDays=($("medicineSelect").value==="Fentanyl")?3:7;
  rows.forEach(r=>{
    const tr=document.createElement("tr");
    tr.appendChild(td(r.date));
    tr.appendChild(td(fmtDate(addDays(new Date(r.date), everyDays))));
    tr.appendChild(td((r.patches||[]).map(v=>`${v} mcg/hr`).join(" + ")));
    tr.appendChild(td(r.instructions));
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
  $("expBenefits").textContent = exp;
  $("withdrawalInfo").textContent = wdr;
}

/* =============== build & init =============== */
function buildPlan(){
  try{
    const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value;
    if(!cls || !med || !form){ banner("Please select medicine class, medicine, and form."); return; }

    $("hdrMedicine").textContent=`Medicine: ${med} ${form}`;
    $("hdrSpecial").textContent=`Special instructions: ${specialInstructionFor(med, form)}`;
    ["hdrPatient","hdrAllergies","hdrHcp"].forEach(id=>{ const el=$(id); if(el) el.style.display="none"; });

    const isPatch=(form==="Patch");
    const rows=isPatch?buildPlanPatch():buildPlanTablets();
    if(isPatch) renderPatchTable(rows); else renderStandardTable(rows);
    setFooterText(cls);
  } catch(err){ console.error(err); banner("Error: " + (err?.message||String(err))); }
}

function init(){
  document.querySelectorAll(".datepick").forEach(el=>{
    if(window.flatpickr){ flatpickr(el,{dateFormat:"Y-m-d",allowInput:true}); }
    else { el.type="date"; }
  });

  populateClasses(); populateMedicines(); populateForms();

  // Pre-populate one dose line
  doseLines=[]; addDoseLine();

  $("classSelect")?.addEventListener("change", ()=>{
    populateMedicines(); populateForms(); updateRecommended(); doseLines=[]; addDoseLine();
  });
  $("medicineSelect")?.addEventListener("change", ()=>{
    populateForms(); updateRecommended(); doseLines=[]; addDoseLine();
  });
  $("formSelect")?.addEventListener("change", ()=>{
    updateRecommended(); doseLines=[]; addDoseLine();
  });

  $("addDoseLineBtn")?.addEventListener("click", addDoseLine);
  $("generateBtn")?.addEventListener("click", buildPlan);
  $("resetBtn")?.addEventListener("click", ()=>location.reload());
  $("printBtn")?.addEventListener("click", ()=>window.print());
  $("savePdfBtn")?.addEventListener("click", ()=>{
    const el = $("outputCard");
    if(typeof html2pdf==="function"){
      html2pdf().set({
        filename:'taper_plan.pdf',
        margin:10,
        image:{ type:'jpeg', quality:0.95 },
        html2canvas:{ scale:2, useCORS:true },
        jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' }
      }).from(el).save();
    } else { alert("PDF library not loaded."); }
  });

  updateRecommended();
}
document.addEventListener("DOMContentLoaded", ()=>{ try{ init(); } catch(e){ console.error(e); banner("Init error: " + (e?.message||String(e))); }});
