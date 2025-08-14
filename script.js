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
const CLASS_ORDER = ["Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"];
const CLASSES_WITH_SLOT_ORDER = new Set(CLASS_ORDER);

/* ===== catalog (no oral liquids) ===== */
const CATALOG = {
  "Opioid": {
    "Morphine": { "Tablet":["5 mg","10 mg","15 mg","30 mg","60 mg","100 mg","200 mg"], "Capsule":["10 mg","20 mg","50 mg","100 mg"] },
    "Oxycodone": { "Tablet":["5 mg","10 mg","15 mg","20 mg","30 mg","40 mg","80 mg"] },
    "Oxycodone / Naloxone": { "Tablet":["2.5/1.25 mg","5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg"] },
    "Tapentadol": { "Tablet":["50 mg","100 mg","150 mg","200 mg","250 mg"] },
    "Tramadol": { "Tablet":["50 mg","100 mg","150 mg","200 mg"] },
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
const CLASS_ORDERED = ["Opioid","Benzodiazepines / Z-Drug (BZRA)","Antipsychotic","Proton Pump Inhibitor"];

/* ===== splitting rules ===== */
// allow halves for IR/non-SR tablets; never for SR/wafer/capsule unless explicitly allowed
function isSR(form){ return /slow\s*release|modified|cr/i.test(form); }
function canHalf(med, form){
  if(form==="Patch") return false;
  if(/Slow Release/i.test(form) || /Capsule/i.test(form) || /Wafer/i.test(form)) return false;
  return true; // default: IR tablets can be halved
}
function canQuarter(med, form, strengthMg, cls){
  // Conservative: diazepam IR only (2 mg & 5 mg). Extend if you want others.
  if(med==="Diazepam" && /Tablet/i.test(form) && (strengthMg===2 || strengthMg===5)) return true;
  return false;
}

/* ===== parsing utils ===== */
function parseMgFromStrength(str, med){
  // "10 mg" -> 10; "2.5/1.25 mg" (oxycodone/naloxone) -> 2.5 (ignore naloxone)
  if(!str) return 0;
  const slash = String(str).split("/")[0]; // before "/"
  const m = slash.match(/([\d.]+)\s*mg/i);
  return m ? parseFloat(m[1]) : 0;
}
function parsePatchRate(str){
  const m = String(str).match(/([\d.]+)\s*mcg\/hr/i);
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

/* ===== dose lines ===== */
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

/* ===== special instructions & recommended ===== */
function specialInstructionFor(med, form){
  if(form==="Patch") return "Apply to intact skin as directed. Do not cut patches. Rotate site of application.";
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
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

/* ===== mg model ===== */
// Build initial per-slot mg totals from the entered dose lines
function baseSlotMg(){
  const med = $("medicineSelect")?.value, form = $("formSelect")?.value;
  let slot = { AM:0, MID:0, DIN:0, PM:0 };
  doseLines.forEach(ln=>{
    const mg = parseMgFromStrength(ln.strengthStr, med);
    slotsForFreq(ln.freqMode).forEach(k=> slot[k] += mg);
  });
  return slot;
}
function totalMg(slot){ return SLOT_KEYS.reduce((a,k)=>a+(slot[k]||0),0); }

// Reduce total mg by percent using slot order: DIN -> MID -> (AM & PM equally)
function reduceByPercent(slot, percent){
  let remaining = { ...slot };
  let drop = totalMg(slot) * (percent/100);
  const step = 0.01; // work in 0.01 mg steps to avoid FP noise (virtual granularity)

  // helper to remove mg from a key up to amount
  const take = (key, amt)=>{
    const takeAmt = Math.min(remaining[key], amt);
    remaining[key] = +(remaining[key] - takeAmt).toFixed(4);
    return amt - takeAmt;
  };

  // DIN first
  drop = take("DIN", drop);
  // MID next
  if(drop>0) drop = take("MID", drop);
  // AM & PM equally
  while(drop > step && (remaining.AM>0 || remaining.PM>0)){
    const half = drop/2;
    drop = take("AM", half);
    if(drop>0) drop = take("PM", half);
  }
  // If a tiny residue remains, shave from AM then PM
  if(drop>0){
    drop = take("AM", drop);
    if(drop>0) drop = take("PM", drop);
  }
  return remaining;
}

/* ===== strength packer ===== */
// Build the allowed piece sizes (mg) for a medicine/form (includes halves/quarters if allowed)
function allowedPiecesMg(med, form){
  const strengths = strengthsForSelected()
    .map(s=>parseMgFromStrength(s, med))
    .filter(v=>v>0);
  const uniq = Array.from(new Set(strengths)).sort((a,b)=>a-b);

  let pieces = uniq.slice(); // whole tablets
  if(canHalf(med, form)){
    uniq.forEach(v => pieces.push(v/2));
  }
  // conservative quarters: diazepam only (2 mg & 5 mg)
  uniq.forEach(v=>{
    if(canQuarter(med, form, v)) pieces.push(v/4);
  });

  // round to 0.01 and unique
  pieces = Array.from(new Set(pieces.map(v=>+v.toFixed(2)))).sort((a,b)=>a-b);
  return pieces;
}

// Greedy packer: choose pieces from largest to smallest to not exceed target mg (round down)
function packSlot(targetMg, med, form){
  const pieces = allowedPiecesMg(med, form).slice().sort((a,b)=>b-a); // desc
  let remaining = +targetMg.toFixed(2);
  const used = {};
  for(const p of pieces){
    if(remaining <= 0) break;
    const n = Math.floor( (remaining + 1e-9) / p );
    if(n>0){
      used[p] = (used[p]||0) + n;
      remaining = +(remaining - n * p).toFixed(2);
    }
  }
  // result mg we actually achieved
  const achieved = Object.entries(used).reduce((sum,[mg,count])=>sum + parseFloat(mg)*count, 0);
  return { used, achieved: +achieved.toFixed(2) };
}

// Turn packed pieces into friendly text & strength labels
function packToTextAndLabels(pack, med, form){
  // instruction text: “Take 1 tablet + 1/2 tablet in the morning”
  // We don’t print strengths in the instruction; they go in the Strength column.
  const entries = Object.entries(pack.used).sort((a,b)=>parseFloat(b[0])-parseFloat(a[0])); // big to small
  let totalTablets = 0, halves=0, quarters=0, wholes=0;

  // for Strength column, list distinct “med X mg tablet” items used
  const strengthLabels = [];

  entries.forEach(([mgStr, n])=>{
    const mg = parseFloat(mgStr);
    // classify as whole/half/quarter relative to any base tablet sizes
    // We'll derive labels from mg amount itself.
    // Strength label (single piece)
    const label = `${med} ${mg} mg ${form.toLowerCase()}`;
    strengthLabels.push(label);
    // Count into tablets/fractions by comparing against allowed whole sizes.
    // Simpler: treat each piece as "tablet" if equals a whole strength, else "half/quarter".
    // We can detect halves/quarters by checking if piece is exactly half or quarter of any whole.
    totalTablets += n;
  });

  // For text, we only mention number of “tablets” (not mg), but include halves/quarters words when piece < min whole.
  // Build a human phrase from pieces
  const piecePhrases = [];
  entries.forEach(([mgStr, n])=>{
    const mg = parseFloat(mgStr);
    // try to detect half/quarter by seeing if any whole equals 2x or 4x this piece
    const wholesList = strengthsForSelected().map(s=>parseMgFromStrength(s));
    const isHalf = wholesList.some(w=>Math.abs(w/2 - mg) < 0.01);
    const isQuarter = wholesList.some(w=>Math.abs(w/4 - mg) < 0.01);
    let name = "tablet";
    if(isQuarter) name = "quarter tablet";
    else if(isHalf) name = "half tablet";
    else name = "tablet";
    if(n===1) piecePhrases.push(`1 ${name}`);
    else piecePhrases.push(`${n} ${name}s`);
  });

  return {
    instructionFragment: piecePhrases.join(" + "),
    strengthLabels: Array.from(new Set(strengthLabels)) // unique
  };
}

/* ===== build plan ===== */
function buildPlan(){
  try{
    const classSelect=$("classSelect"), medicineSelect=$("medicineSelect"), formSelect=$("formSelect");
    if(!classSelect || !medicineSelect || !formSelect){ banner("Missing inputs. Reload the page."); return; }
    const cls = classSelect.value, med = medicineSelect.value, form = formSelect.value;

    // Header badges
    const hdrMed = $("hdrMedicine"); if(hdrMed) hdrMed.textContent = "Medicine: " + med + " " + form;
    const hdrSpec = $("hdrSpecial"); if(hdrSpec) hdrSpec.textContent = "Special instructions: " + specialInstructionFor(med, form);

    const startDate = $("startDate")? ($("startDate")._flatpickr?.selectedDates?.[0] || new Date()) : new Date();
    const reviewDate = $("reviewDate")? ($("reviewDate")._flatpickr?.selectedDates?.[0] || null) : null;

    const p1Percent  = Math.max(1, parseFloat($("p1Percent")?.value || "0"));
    const p1Interval = Math.max(1, parseInt($("p1Interval")?.value || "0",10));
    const p1StopWeek = parseInt($("p1StopWeek")?.value || "0",10) || 0;
    const p2Percent  = Math.max(0, parseFloat($("p2Percent")?.value || "0"));
    const p2Interval = p2Percent ? Math.max(1, parseInt($("p2Interval")?.value || "0",10)) : 0;

    if(!p1Percent || !p1Interval){ alert("Please set Phase 1 % and interval."); return; }
    if(p2Percent && !p2Interval){ alert("Please set Phase 2 interval."); return; }

    if(!doseLines.length) addDoseLine();

    // PATCH medicines: separate path
    if(form==="Patch"){
      const rows = [];
      let date = startOfWeek(startDate);
      rows.push({ date: fmtDate(date), strengths:[`${med} X mcg/hr ${form.toLowerCase()}`], instructions:`Apply 1 patch to the skin every ${med==="Fentanyl" ? 3 : 7} days. Rotate sites.`, am:0,mid:0,din:0,pm:0 });
      const isF = (med==="Fentanyl"); const interval = isF?3:7;
      const end = addDays(date, 90);
      while(date <= end){
        date = addDays(date, interval);
        rows.push({ date: fmtDate(date), strengths:[`${med} X mcg/hr ${form.toLowerCase()}`], instructions:`Apply 1 patch to the skin every ${interval} days. Rotate sites.`, am:0,mid:0,din:0,pm:0 });
        if(reviewDate && date >= reviewDate) break;
      }
      renderPatchTable(rows, (med==="Fentanyl")?3:7);
      setFooterText(cls);
      return;
    }

    // TABLET/CAPSULE path
    // 1) compute baseline per-slot mg
    let slotMg = baseSlotMg();
    // Safety: if everything is zero (e.g., user picked a form/strength but didn’t add lines), force 1 high-strength AM line
    if(totalMg(slotMg)===0){
      const sList = strengthsForSelected().sort((a,b)=>parseMgFromStrength(a)-parseMgFromStrength(b));
      const mg = parseMgFromStrength(sList[sList.length-1], med);
      slotMg.AM = mg;
    }

    const rows = [];
    let date = startOfWeek(startDate);
    let week = 1;

    // Helper to render one week from current slotMg
    function pushWeek(note=null){
      // Pack each slot to available pieces
      const packAM = packSlot(slotMg.AM, med, form);
      const packMID= packSlot(slotMg.MID, med, form);
      const packDIN= packSlot(slotMg.DIN, med, form);
      const packPM = packSlot(slotMg.PM, med, form);

      // Build instruction lines (Morning → Midday → Dinner → Night)
      const instrLines = [];
      if(packAM.achieved>0){ instrLines.push(`${packToTextAndLabels(packAM, med, form).instructionFragment} in the morning`); }
      if(packMID.achieved>0){ instrLines.push(`${packToTextAndLabels(packMID, med, form).instructionFragment} at midday`); }
      if(packDIN.achieved>0){ instrLines.push(`${packToTextAndLabels(packDIN, med, form).instructionFragment} at dinner`); }
      if(packPM.achieved>0){ instrLines.push(`${packToTextAndLabels(packPM, med, form).instructionFragment} at night`); }
      if(note) instrLines.push(note);

      // Collect all strength labels used this week
      const labels = new Set();
      packToTextAndLabels(packAM, med, form).strengthLabels.forEach(s=>labels.add(s));
      packToTextAndLabels(packMID, med, form).strengthLabels.forEach(s=>labels.add(s));
      packToTextAndLabels(packDIN, med, form).strengthLabels.forEach(s=>labels.add(s));
      packToTextAndLabels(packPM, med, form).strengthLabels.forEach(s=>labels.add(s));

      rows.push({
        date: fmtDate(date),
        strengths: Array.from(labels),
        instructions: instrLines.join("\n"),
        am: countPieces(packAM), mid: countPieces(packMID), din: countPieces(packDIN), pm: countPieces(packPM)
      });
    }

    function countPieces(pack){
      // total number of pieces used in that slot (whole/half/quarter all count as “1 piece” in the table cells)
      return Object.values(pack.used).reduce((a,b)=>a+b,0);
    }

    // === Phase 1: start at second step (apply first reduction before first row) ===
    slotMg = reduceByPercent(slotMg, p1Percent);
    pushWeek();
    while(totalMg(slotMg) > 0.01){
      if(p1StopWeek && week >= p1StopWeek) break;
      date = addDays(date, p1Interval); week += 1;
      slotMg = reduceByPercent(slotMg, p1Percent);
      // clamp negatives
      SLOT_KEYS.forEach(k=>{ if(slotMg[k]<0) slotMg[k]=0; });
      pushWeek();
      if(reviewDate && date >= reviewDate) break;
      if((+date - +startDate) >= THREE_MONTHS_MS) break;
      if(rows.length >= MAX_WEEKS) break;
    }

    // === Phase 2 ===
    if(totalMg(slotMg) > 0.01 && p2Percent){
      while(totalMg(slotMg) > 0.01){
        date = addDays(date, p2Interval); week += 1;
        slotMg = reduceByPercent(slotMg, p2Percent);
        SLOT_KEYS.forEach(k=>{ if(slotMg[k]<0) slotMg[k]=0; });
        pushWeek();
        if(reviewDate && date >= reviewDate) break;
        if((+date - +startDate) >= THREE_MONTHS_MS) break;
        if(rows.length >= MAX_WEEKS) break;
      }
    }

    // End advice
    let endNote = null;
    if($("classSelect").value==="Proton Pump Inhibitor"){
      endNote = "Use on demand for symptoms; consider alternate days / lowest effective dose.";
    } else if(["Benzodiazepines / Z-Drug (BZRA)","Antipsychotic"].includes($("classSelect").value)){
      endNote = "Take as required (PRN); consider alternate days before stopping.";
    }
    date = addDays(date, (p2Percent? Math.max(1,p2Interval) : Math.max(1,p1Interval)));
    rows.push({
      date: fmtDate(date),
      strengths: rows.length ? rows[rows.length-1].strengths : [],
      instructions: endNote || "Stop.",
      am:0, mid:0, din:0, pm:0
    });

    renderStandardTable(rows, med, form);
    setFooterText(cls);
  } catch(err){
    console.error(err); banner("Error: " + (err?.message || String(err)));
  }
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
    // If multiple distinct strengths appear this week, we’ll render each on its own line and rowspan the date.
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
  // calendars
  document.querySelectorAll(".datepick").forEach(el=>{
    if(window.flatpickr){ flatpickr(el,{dateFormat:"Y-m-d",allowInput:true}); }
    else { el.type="date"; }
  });

  populateClasses();
  populateMedicines();
  populateForms();

  // pre-populate one dose line
  doseLines = [];
  addDoseLine();

  // listeners
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
