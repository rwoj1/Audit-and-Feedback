"use strict";

/* ===== helpers ===== */
const $ = id => document.getElementById(id);
const safeVal = id => { const el = $(id); return el ? el.value : ""; };
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const fmtDateTime = d => new Date(d).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function banner(msg){ const b=document.createElement("div"); b.style.cssText="position:fixed;left:0;right:0;bottom:0;background:#7f1d1d;color:#fff;padding:8px 12px;font:14px system-ui;z-index:999999"; b.textContent=msg; document.body.appendChild(b); }
const plural = (n, s1, sN)=> (n===1 ? s1 : sN).replace("{n}", String(n));

/* ===== constants ===== */
const MAX_WEEKS = 60;
const THREE_MONTHS_MS = 90 * 24 * 3600 * 1000;
const SLOT_KEYS = ["AM","MID","DIN","PM"];
const CLASS_ORDERED = ["Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"];

/* ===== catalog (no liquids) ===== */
const CATALOG = {
  "Opioid": {
    // CHANGED to SR Tablet (so splits are blocked by SR rule)
    "Morphine": { "SR Tablet":["10 mg","15 mg","30 mg","60 mg","100 mg","200 mg"] },
    "Oxycodone": { "SR Tablet":["10 mg","20 mg","40 mg","80 mg"] },
    "Oxycodone / Naloxone": { "SR Tablet":["5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg"] },
    "Tapentadol": { "SR Tablet":["50 mg","100 mg","150 mg","200 mg","250 mg"] },
    "Tramadol": { "SR Tablet":["50 mg","100 mg","150 mg","200 mg"] },
    "Buprenorphine": { "Patch":["5 mcg/hr","10 mcg/hr","15 mcg/hr","20 mcg/hr","25 mcg/hr","30 mcg/hr","40 mcg/hr"] },
    "Fentanyl": { "Patch":["12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr"] }
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

/* ===== SR detection & split rules ===== */
function isMR(form){
  return /slow\s*release|modified\s*release|controlled\s*release|extended\s*release|sustained\s*release/i.test(form)
      || /\b(SR|MR|CR|ER|XR|PR|CD)\b/i.test(form);
}
function currentClass(){ return $("classSelect")?.value || ""; }

// Halves disabled for: Opioids, PPIs, Zolpidem SR, any MR form, Capsules/Wafers/Patch
function canHalf(med, form){
  const cls = currentClass();
  if(cls==="Opioid") return false;
  if(cls==="Proton Pump Inhibitor") return false;
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return false;
  if(isMR(form)) return false;
  if(/Capsule|Wafer|Patch/i.test(form)) return false;
  return true; // default: IR tablets can be halved
}

// Quarters only for Diazepam IR (2 mg or 5 mg), not if opioid/PPI/Zolpidem SR/MR/etc.
function canQuarter(med, form, strengthMg){
  const cls = currentClass();
  if(cls==="Opioid" || cls==="Proton Pump Inhibitor") return false;
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return false;
  if(isMR(form)) return false;
  if(med==="Diazepam" && /Tablet/i.test(form) && (strengthMg===2 || strengthMg===5)) return true;
  return false;
}

/* ===== parsing utils ===== */
function parseMgFromStrength(str){
  if(!str) return 0;
  const slash = String(str).split("/")[0]; // before slash (ignore naloxone mg)
  const m = slash.match(/([\d.]+)\s*mg/i);
  return m ? parseFloat(m[1]) : 0;
}

/* ===== dropdowns ===== */
function populateClasses(){
  const cSel = $("classSelect"); if(!cSel) return;
  cSel.innerHTML = "";
  CLASS_ORDERED.forEach(cls=>{ const o=document.createElement("option"); o.value=cls; o.textContent=cls; cSel.appendChild(o); });
}
function populateMedicines(){
  const mSel = $("medicineSelect"); const clsEl = $("classSelect");
  if(!mSel || !clsEl) return;
  const cls = clsEl.value;
  mSel.innerHTML = "";
  const meds = Object.keys(CATALOG[cls]||{});
  const ordered = (cls==="Opioid")
    ? ["Morphine","Oxycodone","Oxycodone / Naloxone","Tapentadol","Tramadol","Buprenorphine","Fentanyl"]
    : meds.slice().sort();
  ordered.forEach(m=>{ if(meds.includes(m)){ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); }});
}
function populateForms(){
  const fSel = $("formSelect"); const clsEl=$("classSelect"); const medEl=$("medicineSelect");
  if(!fSel || !clsEl || !medEl) return;
  const cls = clsEl.value, med = medEl.value;
  fSel.innerHTML = "";
  const forms = Object.keys((CATALOG[cls]||{})[med]||[]);
  forms.sort((a,b)=>{
    const at = /tablet/i.test(a) ? 0 : 1;
    const bt = /tablet/i.test(b) ? 0 : 1;
    if(at!==bt) return at-bt;
    return a.localeCompare(b);
  });
  forms.forEach(f=>{ const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o); });
}
function strengthsForSelected(){
  const cls=$("classSelect")?.value, med=$("medicineSelect")?.value, form=$("formSelect")?.value;
  return (CATALOG[cls]?.[med]?.[form]||[]).slice();
}

/* ===== dose lines (input) ===== */
let doseLines = []; // {id,strengthStr,freqMode}
let nextLineId = 1;
function slotsForFreq(mode){
  switch(mode){
    case "AM":  return ["AM"];
    case "MID": return ["MID"];
    case "DIN": return ["DIN"];
    case "PM":  return ["PM"];
    case "BID": return ["AM","PM"];
    case "TID": return ["AM","MID","PM"];
    case "QID": return ["AM","MID","DIN","PM"];
    default:    return ["AM"];
  }
}
function renderDoseLines(){
  const box = $("doseLinesContainer"); if(!box) return;
  box.innerHTML = "";
  if(doseLines.length===0){
    const p=document.createElement("p"); p.textContent="(No dose lines)"; p.style.color="#9ca3af"; box.appendChild(p); return;
  }
  doseLines.forEach((ln,idx)=>{
    const row=document.createElement("div");
    row.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0";
    row.innerHTML =
      `<span class="badge">Line ${idx+1}</span>
       <span>Strength:</span>
       <select data-id="${ln.id}" class="dl-strength"></select>
       <span>Frequency:</span>
       <select data-id="${ln.id}" class="dl-freq">
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
    const sList = strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
    sSel.innerHTML="";
    sList.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
    sSel.value = ln.strengthStr || sList[sList.length-1];

    const fSel=row.querySelector(".dl-freq"); fSel.value = ln.freqMode || "AM";

    sSel.addEventListener("change", e=>{
      const id=parseInt(e.target.getAttribute("data-id"),10);
      const l = doseLines.find(x=>x.id===id); if(l){ l.strengthStr = e.target.value; }
    });
    fSel.addEventListener("change", e=>{
      const id=parseInt(e.target.getAttribute("data-id"),10);
      const l = doseLines.find(x=>x.id===id); if(l){ l.freqMode = e.target.value; }
    });
    row.querySelector(".dl-remove").addEventListener("click", e=>{
      const id=parseInt(e.target.getAttribute("data-id"),10);
      doseLines = doseLines.filter(x=>x.id!==id);
      renderDoseLines();
    });
  });
}
function addDoseLine(){
  const sList = strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
  if(!sList.length){ banner("Select medicine & form first."); return; }
  const defaultStrength = sList[sList.length-1];
  doseLines.push({ id: nextLineId++, strengthStr: defaultStrength, freqMode: "AM" });
  renderDoseLines();
}

/* ===== recommended & instructions ===== */
function specialInstructionFor(med, form){
  if(form==="Patch") return "Apply to intact skin as directed. Do not cut patches. Rotate site of application.";
  if(/Slow Release/i.test(form) || isMR(form)) return "Swallow whole, do not halve or crush";
  if(med==="Quetiapine" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  return "Swallow whole, do not halve or crush";
}
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
function updateRecommended(){
  const cls = $("classSelect")?.value;
  const lines = RECOMMEND[cls] || [];
  const bullets = lines.map(t=>`<li>${t}</li>`).join("");
  const bp = $("bestPracticeBox");
  if(bp) bp.innerHTML = `<strong>Recommended Practice for ${cls||""}</strong><ul style="margin:6px 0 0 18px">${bullets}</ul>`;
  const med = $("medicineSelect")?.value, form = $("formSelect")?.value;
  const s = $("hdrSpecial"); if(s) s.textContent = "Special instructions: " + specialInstructionFor(med, form);
}

/* ===== allowed pieces ===== */
function allowedPiecesMg(med, form){
  const strengths = strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0);
  const uniq = Array.from(new Set(strengths)).sort((a,b)=>a-b);
  let pieces = uniq.slice(); // whole tablets

  if(canHalf(med, form)){ uniq.forEach(v => pieces.push(v/2)); }
  uniq.forEach(v => { if(canQuarter(med, form, v)) pieces.push(v/4); });

  pieces = Array.from(new Set(pieces.map(v=>+v.toFixed(2)))).sort((a,b)=>a-b);
  return pieces;
}

/* ===== baseline packs from user dose lines ===== */
function basePacks(){
  const med = $("medicineSelect")?.value, form = $("formSelect")?.value;
  const pieces = allowedPiecesMg(med, form);
  // convert each dose line to mg, then pack to piece-compliant representation
  const slotPacks = { AM:{}, MID:{}, DIN:{}, PM:{} }; // map pieceMg -> count
  function addPiece(slot, mg){ slotPacks[slot][mg] = (slotPacks[slot][mg]||0) + 1; }

  // For each dose line, place *one piece* per tablet at each scheduled time.
  doseLines.forEach(ln=>{
    const mg = parseMgFromStrength(ln.strengthStr);
    const slots = slotsForFreq(ln.freqMode);
    // Find exact piece if available, else break into descending pieces (greedy)
    slots.forEach(sl=>{
      let remaining = +mg.toFixed(2);
      const desc = pieces.slice().sort((a,b)=>b-a);
      for(const p of desc){
        if(remaining<=0) break;
        const n = Math.floor( (remaining + 1e-9) / p );
        if(n>0){
          addPiece(sl, p); // add n times
          if(n>1){ slotPacks[sl][p] += (n-1); }
          remaining = +(remaining - n*p).toFixed(2);
        }
      }
    });
  });
  return slotPacks;
}
function packTotalMg(pack){ return Object.entries(pack).reduce((s,[mg,c])=>s + parseFloat(mg)*c, 0); }
function packsTotalMg(packs){ return packTotalMg(packs.AM)+packTotalMg(packs.MID)+packTotalMg(packs.DIN)+packTotalMg(packs.PM); }

/* ===== piece-removal taper (DIN → MID → AM/PM equally) ===== */
function removeFromPack(pack, amount){
  // remove up to 'amount' mg by deleting largest pieces first
  let toDrop = +amount.toFixed(4);
  const sizes = Object.keys(pack).map(parseFloat).sort((a,b)=>b-a); // desc
  for(const p of sizes){
    while(toDrop>0 && pack[p]>0){
      pack[p] -= 1;
      if(pack[p]===0) delete pack[p];
      toDrop = +(toDrop - p).toFixed(4);
    }
    if(toDrop<=0) break;
  }
  return Math.max(0, toDrop); // leftover (if any)
}
function removeOnePiece(pack){
  const sizes = Object.keys(pack).map(parseFloat).sort((a,b)=>b-a);
  for(const p of sizes){
    if(pack[p]>0){ pack[p]-=1; if(pack[p]===0) delete pack[p]; return p; }
  }
  return 0;
}
function applyPercentReduction(packs, percent){
  let remainingDrop = +(packsTotalMg(packs) * (percent/100)).toFixed(4);
  if(remainingDrop <= 0) return;

  // DIN first
  remainingDrop = removeFromPack(packs.DIN, remainingDrop);
  // MID next
  if(remainingDrop>0) remainingDrop = removeFromPack(packs.MID, remainingDrop);
  // AM & PM equally: alternate one piece at a time, largest-first within each slot
  let toggle = (packTotalMg(packs.AM) >= packTotalMg(packs.PM)) ? "AM" : "PM";
  while(remainingDrop > 0.0001 && (packTotalMg(packs.AM)>0 || packTotalMg(packs.PM)>0)){
    const took = removeOnePiece(packs[toggle]);
    if(took===0){
      toggle = (toggle==="AM") ? "PM" : "AM";
      const took2 = removeOnePiece(packs[toggle]);
      if(took2===0) break; // nothing left
      remainingDrop = +(remainingDrop - took2).toFixed(4);
      toggle = (toggle==="AM") ? "PM" : "AM";
    } else {
      remainingDrop = +(remainingDrop - took).toFixed(4);
      toggle = (toggle==="AM") ? "PM" : "AM";
    }
  }
}

/* ===== text helpers ===== */
function packToInstruction(pack, tail){
  // Build “1 tablet + 1/2 tablet [in the morning]”
  const wholeSizes = strengthsForSelected().map(parseMgFromStrength);
  const entries = Object.entries(pack).map(([mg,c])=>({mg:parseFloat(mg), c})).sort((a,b)=>b.mg-a.mg);

  const phrases = [];
  entries.forEach(({mg,c})=>{
    const isHalf = wholeSizes.some(w=>Math.abs(w/2 - mg) < 0.01);
    const isQuarter = wholeSizes.some(w=>Math.abs(w/4 - mg) < 0.01);
    let name = "tablet";
    if(isQuarter) name = "quarter tablet";
    else if(isHalf) name = "half tablet";
    if(c===1) phrases.push(`1 ${name}`);
    else phrases.push(`${c} ${name}s`);
  });
  if(phrases.length===0) return null;
  return `${phrases.join(" + ")} ${tail}`;
}
function strengthLabelsFromPacks(packs, med, form){
  const labels = new Set();
  [packs.AM, packs.MID, packs.DIN, packs.PM].forEach(pack=>{
    Object.keys(pack).forEach(mgStr=>{
      labels.add(`${med} ${(+parseFloat(mgStr).toFixed(2)).toString().replace(/\.00$/,'')} mg ${form.toLowerCase()}`);
    });
  });
  return Array.from(labels);
}

/* ===== main build ===== */
function buildPlan(){
  try{
    const classSelect=$("classSelect"), medicineSelect=$("medicineSelect"), formSelect=$("formSelect");
    if(!classSelect || !medicineSelect || !formSelect){ banner("Missing inputs. Reload the page."); return; }
    const cls = classSelect.value, med = medicineSelect.value, form = formSelect.value;

    // Header badges (Details removed in HTML; keep placeholders)
    $("hdrMedicine").textContent = "Medicine: " + med + " " + form;
    $("hdrSpecial").textContent  = "Special instructions: " + specialInstructionFor(med, form);

    const startDate  = $("startDate")? ($("startDate")._flatpickr?.selectedDates?.[0] || new Date()) : new Date();
    const reviewDate = $("reviewDate")? ($("reviewDate")._flatpickr?.selectedDates?.[0] || null) : null;

    const p1Percent  = Math.max(1, parseFloat($("p1Percent")?.value || "0"));
    const p1Interval = Math.max(1, parseInt($("p1Interval")?.value || "0",10));
    const p1StopWeek = parseInt($("p1StopWeek")?.value || "0",10) || 0;
    const p2Percent  = Math.max(0, parseFloat($("p2Percent")?.value || "0"));
    const p2Interval = p2Percent ? Math.max(1, parseInt($("p2Interval")?.value || "0",10)) : 0;

    if(!p1Percent || !p1Interval){ alert("Please set Phase 1 % and interval."); return; }
    if(p2Percent && !p2Interval){ alert("Please set Phase 2 interval."); return; }
    if(!doseLines.length) addDoseLine();

    // PATCH path (unchanged)
    if(form==="Patch"){
      const rows = [];
      let date = startOfWeek(startDate);
      const interval = (med==="Fentanyl")?3:7;
      rows.push({ date: fmtDate(date), strengths:[`${med} X mcg/hr ${form.toLowerCase()}`], instructions:`Apply 1 patch to the skin every ${interval} days. Rotate sites.`, am:0,mid:0,din:0,pm:0 });
      const end = addDays(date, 90);
      while(date <= end){
        date = addDays(date, interval);
        rows.push({ date: fmtDate(date), strengths:[`${med} X mcg/hr ${form.toLowerCase()}`], instructions:`Apply 1 patch to the skin every ${interval} days. Rotate sites.`, am:0,mid:0,din:0,pm:0 });
        if(reviewDate && date >= reviewDate) break;
      }
      renderPatchTable(rows, interval);
      setFooterText(cls);
      return;
    }

    // Build baseline piece packs from the entered dose lines
    let packs = basePacks();
    // If baseline is empty (edge case), create 1 largest tablet in the morning
    if(packsTotalMg(packs) === 0){
      const avail = allowedPiecesMg(med, form);
      const max = avail[avail.length-1];
      packs.AM[max] = 1;
    }

    const rows = [];
    let date = startOfWeek(startDate);
    let week = 1;

    function pushWeek(note=null){
      const instrLines = [];
      const a = packToInstruction(packs.AM, "in the morning"); if(a) instrLines.push(a);
      const m = packToInstruction(packs.MID,"at midday");      if(m) instrLines.push(m);
      const d = packToInstruction(packs.DIN,"at dinner");      if(d) instrLines.push(d);
      const p = packToInstruction(packs.PM, "at night");       if(p) instrLines.push(p);
      if(note) instrLines.push(note);

      rows.push({
        date: fmtDate(date),
        strengths: strengthLabelsFromPacks(packs, med, form),
        instructions: instrLines.join("\n"),
        am: pieceCount(packs.AM), mid: pieceCount(packs.MID), din: pieceCount(packs.DIN), pm: pieceCount(packs.PM)
      });
    }
    function pieceCount(pack){ return Object.values(pack).reduce((a,b)=>a+b,0); }

    // === Phase 1: start at the second step (apply first reduction before first row) ===
    applyPercentReduction(packs, p1Percent);
    pushWeek();

    while(packsTotalMg(packs) > 0.01){
      if(p1StopWeek && week >= p1StopWeek) break;
      date = addDays(date, p1Interval); week += 1;
      applyPercentReduction(packs, p1Percent);
      pushWeek();
      if(reviewDate && date >= reviewDate) break;
      if((+date - +startDate) >= THREE_MONTHS_MS) break;
      if(rows.length >= MAX_WEEKS) break;
    }

    // === Phase 2 ===
    if(packsTotalMg(packs) > 0.01 && p2Percent){
      while(packsTotalMg(packs) > 0.01){
        date = addDays(date, p2Interval); week += 1;
        applyPercentReduction(packs, p2Percent);
        pushWeek();
        if(reviewDate && date >= reviewDate) break;
        if((+date - +startDate) >= THREE_MONTHS_MS) break;
        if(rows.length >= MAX_WEEKS) break;
      }
    }

    // End advice
    let endNote = null;
    if(cls==="Proton Pump Inhibitor"){
      endNote = "Use on demand for symptoms; consider alternate days / lowest effective dose.";
    } else if(cls==="Benzodiazepines / Z-Drug (BZRA)" || cls==="Antipsychotic"){
      endNote = "Take as required (PRN); consider alternate days before stopping.";
    }
    date = addDays(date, (p2Percent? Math.max(1,p2Interval) : Math.max(1,p1Interval)));
    rows.push({ date: fmtDate(date), strengths: strengthLabelsFromPacks(packs, med, form), instructions: endNote || "Stop.", am:0, mid:0, din:0, pm:0 });

    renderStandardTable(rows, med, form);
    setFooterText(cls);
  } catch(err){
    console.error(err); banner("Error: " + (err?.message || String(err))); }
}

/* ===== rendering ===== */
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text||""); return el; }
function imgTd(info){
  const tdEl=document.createElement("td"); tdEl.className="image-cell";
  if(!info){ tdEl.textContent=""; return tdEl; }
  const cont=document.createElement("div"); const img=new Image();
  const slugMed=String(info.med||"").toLowerCase().replace(/[\s\/\\\+]+/g,"_").replace(/[^\w_]/g,"");
  const slugStrength=String(info.strength||"").toLowerCase().replace(/[\s\/\\\+]+/g,"").replace(/[^\w]/g,"");
  img.onload=()=>cont.appendChild(img); img.onerror=()=>{};
  img.src=`images/${slugMed}_${slugStrength}.jpg`;
  tdEl.appendChild(cont); return tdEl;
}
function renderStandardTable(rows, med, form){
  const patchBlock = $("patchBlock"), scheduleBlock = $("scheduleBlock");
  if(patchBlock) patchBlock.style.display="none";
  if(!scheduleBlock) return;
  scheduleBlock.style.display="";
  scheduleBlock.innerHTML="";

  const table = document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  ["Week beginning","Strength","Instructions","Morning","Midday","Dinner","Night","Image"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody=document.createElement("tbody");
  rows.forEach(r=>{
    const strengths = r.strengths && r.strengths.length ? r.strengths : [""];
    strengths.forEach((s,idx)=>{
      const tr=document.createElement("tr");
      if(idx===0){
        const dateTd = td(r.date);
        if(strengths.length>1) dateTd.rowSpan = strengths.length;
        tr.appendChild(dateTd);
      }
      tr.appendChild(td(s));
      const instr=td(r.instructions); instr.className="instructions-pre"; tr.appendChild(instr);
      tr.appendChild(td(r.am,"center"));
      tr.appendChild(td(r.mid,"center"));
      tr.appendChild(td(r.din,"center"));
      tr.appendChild(td(r.pm,"center"));

      const doseMatch = s.match(/([\d.]+(?:\/[\d.]+)?\s*\w+)/i);
      const info = doseMatch ? { med, strength: doseMatch[1] } : null;
      tr.appendChild(imgTd(info));

      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
  scheduleBlock.appendChild(table);
}
function renderPatchTable(rows, everyDays){
  const scheduleBlock = $("scheduleBlock"), patchBlock = $("patchBlock");
  if(scheduleBlock) scheduleBlock.style.display="none";
  if(!patchBlock) return;
  patchBlock.style.display=""; patchBlock.innerHTML="";

  const table=document.createElement("table"); table.className="table";
  const thead=document.createElement("thead"); const hr=document.createElement("tr");
  ["Apply on","Remove on","Patch strength(s)","Instructions"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody=document.createElement("tbody");
  let start = new Date(rows[0].date);
  let end   = new Date(rows[rows.length-1].date);
  for(let t=new Date(start); t<=end; t=addDays(t,everyDays)){
    const tr=document.createElement("tr");
    tr.appendChild(td(fmtDateTime(t)));
    tr.appendChild(td(fmtDateTime(addDays(new Date(t), everyDays))));
    tr.appendChild(td("X mcg/hr"));
    tr.appendChild(td(`Apply 1 patch to the skin every ${everyDays} days. Rotate sites.`));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  patchBlock.appendChild(table);
}

/* ===== footer ===== */
function setFooterText(cls){
  const exp = {
    "Opioid":"Improved function and reduced opioid-related harms.",
    "Benzodiazepines / Z-Drug (BZRA)":"Improved cognition, daytime alertness, and reduced falls.",
    "Proton Pump Inhibitor":"Reduced pill burden and adverse effects with long-term use.",
    "Antipsychotic":"Lower risk of metabolic/extrapyramidal adverse effects."
  }[cls] || "—";
  const wdr = {
    "Opioid":"Transient pain flare, cravings, mood changes; use non-opioid strategies.",
    "Benzodiazepines / Z-Drug (BZRA)":"Insomnia, anxiety, irritability; consider sleep hygiene/CBT and slower taper.",
    "Proton Pump Inhibitor":"Rebound heartburn; manage via step-down or on-demand use.",
    "Antipsychotic":"Sleep disturbance, anxiety, return of target symptoms; taper slowly and monitor."
  }[cls] || "—";
  const eb = $("expBenefits"), wd = $("withdrawalInfo");
  if(eb) eb.textContent = exp;
  if(wd) wd.textContent = wdr;
}

/* ===== init ===== */
function init(){
  document.querySelectorAll(".datepick").forEach(el=>{
    if(window.flatpickr){ flatpickr(el,{dateFormat:"Y-m-d",allowInput:true}); }
    else { el.type="date"; }
  });

  populateClasses();
  populateMedicines();
  populateForms();

  doseLines = [];
  addDoseLine();

  $("classSelect")?.addEventListener("change", ()=>{
    populateMedicines(); populateForms();
    updateRecommended();
    doseLines=[]; addDoseLine();
  });
  $("medicineSelect")?.addEventListener("change", ()=>{
    populateForms(); updateRecommended();
    doseLines=[]; addDoseLine();
  });
  $("formSelect")?.addEventListener("change", ()=>{
    updateRecommended();
    doseLines=[]; addDoseLine();
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
document.addEventListener("DOMContentLoaded", ()=>{ try{ init(); } catch(e){ console.error(e); banner("Init error: " + (e?.message || String(e))); }});
