"use strict";

/* ===== Catalog (oral + patches; injectables removed) ===== */
const CATALOG = {
  "Opioid": {
    "Morphine": { "Tablet":["5 mg","10 mg","15 mg","30 mg","60 mg","100 mg","200 mg"], "Capsule":["10 mg","20 mg","50 mg","100 mg"], "Oral Liquid":["1 mg/mL"] },
    "Oxycodone": { "Tablet":["5 mg","10 mg","15 mg","20 mg","30 mg","40 mg","80 mg"] },
    "Oxycodone / Naloxone": { "Tablet":["2.5/1.25 mg","5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg"] },
    "Tapentadol": { "Tablet":["50 mg","100 mg","150 mg","200 mg","250 mg"] },
    "Tramadol": { "Tablet":["50 mg","100 mg","150 mg","200 mg"] },
    "Fentanyl": { "Patch":["12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr"] },  // q3 days
    "Buprenorphine": { "Patch":["5 mcg/hr","10 mcg/hr","15 mcg/hr","20 mcg/hr","25 mcg/hr","30 mcg/hr","40 mcg/hr"] } // q7 days
  },
  "Benzodiazepines / Z-drugs": {
    "Diazepam": { "Tablet":["2 mg","5 mg"], "Oral Liquid":["1 mg/mL"] },
    "Oxazepam": { "Tablet":["15 mg","30 mg"] },
    "Nitrazepam": { "Tablet":["5 mg"] },
    "Temazepam": { "Tablet":["10 mg"] },
    "Alprazolam": { "Tablet":["0.25 mg","0.5 mg","1 mg","2 mg"] },
    "Clonazepam": { "Tablet":["0.5 mg","2 mg"], "Oral Liquid":["2.5 mg/mL"] },
    "Lorazepam": { "Tablet":["0.5 mg","1 mg","2.5 mg"] },
    "Flunitrazepam": { "Tablet":["1 mg"] },
    "Zopiclone": { "Tablet":["7.5 mg"] },
    "Zolpidem": { "Tablet":["10 mg"], "Slow Release Tablet":["6.25 mg","12.5 mg"] }
  },
  "Proton Pump Inhibitor": {
    "Pantoprazole": { "Tablet":["20 mg","40 mg"] },
    "Esomeprazole": { "Tablet":["10 mg","20 mg"] },
    "Lansoprazole": { "Tablet":["15 mg","30 mg"], "Wafer":["15 mg","30 mg"] },
    "Omeprazole": { "Tablet":["10 mg","20 mg"], "Capsule":["10 mg","20 mg"] },
    "Rabeprazole": { "Tablet":["10 mg","20 mg"] }
  },
  "Antipsychotic": {
    "Haloperidol": { "Tablet":["0.5 mg","1 mg","2 mg","5 mg","10 mg","20 mg"], "Oral Liquid":["2 mg/mL"] },
    "Olanzapine": { "Tablet":["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"], "Wafer":["5 mg","10 mg","15 mg","20 mg"] },
    "Quetiapine": { "Immediate Release Tablet":["25 mg","100 mg","200 mg","300 mg"], "Slow Release Tablet":["50 mg","150 mg","200 mg","300 mg","400 mg"] },
    "Risperidone": { "Tablet":["0.5 mg","1 mg","2 mg","3 mg","4 mg"], "Oral Liquid":["1 mg/mL"] }
  }
};

/* Tablets that may be halved (SR not; patches never) */
const HALVABLE = new Set([
  "Diazepam","Oxazepam","Nitrazepam","Temazepam","Alprazolam","Clonazepam","Lorazepam","Flunitrazepam",
  "Haloperidol","Olanzapine","Zopiclone","Zolpidem" // SR handled separately
]);

/* Guidance text & defaults */
const GUIDANCE = {
  "Benzodiazepines / Z-drugs": {
    text: "Typical: reduce ~25% every 2 weeks; near the end, ~12.5% every 2 weeks. Consider sleep hygiene/CBT. Monitor and slow if needed.",
    preset: { p1Percent:25, p1Interval:14, p2Percent:12.5, p2Interval:14 }
  },
  "Antipsychotic": {
    text: "Common: reduce ~25–50% every 1–2 weeks with close monitoring for return of target symptoms; slower taper is reasonable.",
    preset: { p1Percent:33, p1Interval:14, p2Percent:25, p2Interval:14 }
  },
  "Proton Pump Inhibitor": {
    text: "Options: step-down to lowest effective dose, alternate-day dosing, or stop and use on-demand; review at 4–12 weeks.",
    preset: { p1Percent:50, p1Interval:14, p2Percent:0, p2Interval:0 }
  },
  "Opioid": {
    text: "If used < 3 months: reduce 10–25% weekly. If used > 3 months: reduce 10–25% every 4 weeks. Prefill: 25% ×3 cycles, then 10% ongoing.",
    preset: null // based on duration
  }
};

/* ===== Utilities ===== */
const $ = id => document.getElementById(id);
const toNum = s => s ? parseFloat(String(s).match(/([\d.]+)/)?.[1] || "0") : 0;
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const fmtDateTime = d => new Date(d).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }

/* ===== UI population ===== */
function populateClasses(){
  const cSel = $("classSelect"); cSel.innerHTML = "";
  Object.keys(CATALOG).forEach(cls=>{ const o=document.createElement("option"); o.value=cls; o.textContent=cls; cSel.appendChild(o); });
}
function populateMedicines(){
  const cls = $("classSelect").value, mSel = $("medicineSelect");
  mSel.innerHTML = "";
  Object.keys(CATALOG[cls]).forEach(m=>{ const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o); });
}
function populateForms(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, fSel=$("formSelect");
  fSel.innerHTML = "";
  Object.keys(CATALOG[cls][med]).forEach(f=>{ const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o); });
  $("applyTimeWrap").style.display = (fSel.value==="Patch") ? "" : "none";
}
function populateStrengths(){
  const cls=$("classSelect").value, med=$("medicineSelect").value, form=$("formSelect").value, sSel=$("strengthSelect");
  sSel.innerHTML = ""; (CATALOG[cls][med][form]||[]).forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o); });
}

/* Duration only for Opioids (relevant to algorithm) */
function updateDurationVisibility(){
  $("durationWrap").style.display = ($("classSelect").value==="Opioid") ? "" : "none";
}

/* Best-practice + defaults (incl. opioid duration logic) */
function updateBestPracticeAndPrefill(){
  const cls = $("classSelect").value;
  const med = $("medicineSelect").value;
  const form = $("formSelect").value;
  const duration = $("durationSelect").value;

  let text = GUIDANCE[cls]?.text || "";
  let preset = GUIDANCE[cls]?.preset || {};

  if(cls==="Opioid"){
    if(duration==="<3"){
      preset = { p1Percent:25, p1Interval:7, p2Percent:10, p2Interval:7 };
      text += " Prefill: 25% every 1 week for 3 cycles, then 10% weekly.";
      $("p1StopWeek").value = 3;
    } else if(duration===">3"){
      preset = { p1Percent:25, p1Interval:28, p2Percent:10, p2Interval:28 };
      text += " Prefill: 25% every 4 weeks for 3 cycles, then 10% every 4 weeks.";
      $("p1StopWeek").value = 3;
    } else {
      $("p1StopWeek").value = "";
    }
  }

  // show text
  $("bestPracticeBox").innerHTML = `<strong>Best-practice for ${med || cls}</strong><br>${text}`;

  // prefill controls
  if(preset){
    if(preset.p1Percent!=null) $("p1Percent").value = preset.p1Percent;
    if(preset.p1Interval!=null) $("p1Interval").value = preset.p1Interval;
    if(preset.p2Percent!=null) $("p2Percent").value = preset.p2Percent;
    if(preset.p2Interval!=null) $("p2Interval").value = preset.p2Interval;
  }

  // patch apply time visibility
  $("applyTimeWrap").style.display = (form==="Patch") ? "" : "none";
}

/* Special instruction text */
function specialInstructionFor(med, form){
  if(form === "Patch") return "Patches: apply to intact skin as directed. Do not cut patches.";
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  if(med==="Quetiapine" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  if(HALVABLE.has(med)) return "May be halved. If quartering is required, check brand-specific guidance.";
  return "Swallow whole, do not halve or crush";
}

/* ===== Build plan (two-phase; review stop if set & not ‘until complete’) ===== */
function buildPlan(){
  const cls = $("classSelect").value;
  const med = $("medicineSelect").value;
  const form= $("formSelect").value;
  const strengthStr = $("strengthSelect").value;
  const baseDose = toNum(strengthStr);
  const freqMode = $("frequencySelect").value; // AM/PM/BID/TID/QID

  if(!baseDose){ alert("Please select a strength."); return; }

  const startDate = $("startDate")._flatpickr?.selectedDates?.[0] || new Date();
  const reviewDate = $("reviewDate")._flatpickr?.selectedDates?.[0] || null;
  const taperUntilComplete = $("taperUntilComplete").checked;

  const p1Percent = parseFloat($("p1Percent").value || "0");
  const p1Interval = parseInt($("p1Interval").value || "0",10);
  const p1StopWeek = parseInt($("p1StopWeek").value || "0",10);
  const p2Percent = parseFloat($("p2Percent").value || "0");
  const p2Interval = parseInt($("p2Interval").value || "0",10);

  if(!p1Percent || !p1Interval){ alert("Please set Phase 1 % and interval."); return; }
  if(p2Percent && !p2Interval){ alert("Please set Phase 2 interval."); return; }

  // Header badges
  $("hdrPatient").textContent   = "Patient: " + ($("patientName").value || "–");
  $("hdrAllergies").textContent = "Allergies: " + ($("allergies").value || "–");
  $("hdrHcp").textContent       = "HCP: " + ($("hcpName").value || "–");
  $("hdrMedicine").textContent  = "Medicine: " + med + " " + form;
  $("hdrSpecial").textContent   = "Special instructions: " + specialInstructionFor(med, form);

  // Decide whether to stop at review date
  const shouldStopAtReview = (!!reviewDate && !taperUntilComplete);

  // Build weekly targets
  const rowsByWeek = [];
  let target = baseDose, week = 1;
  let date = startOfWeek(startDate);

  function pushWeekRow(tDose){ rowsByWeek.push({ date: fmtDate(date), targetDose: tDose }); }

  // Phase 1 (stop at week if specified)
  while(target > 0){
    pushWeekRow(target);
    if(p1StopWeek && week >= p1StopWeek) break;
    date = addDays(date, p1Interval); week += 1;
    target = +(target * (1 - p1Percent/100)).toFixed(3);
    if(shouldStopAtReview && date >= reviewDate) break;
    if(target <= 0.0001) break;
  }

  // Phase 2
  if(target > 0 && p2Percent){
    while(target > 0.0001){
      date = addDays(date, p2Interval); week += 1;
      target = +(target * (1 - p2Percent/100)).toFixed(3);
      rowsByWeek.push({ date: fmtDate(date), targetDose: target });
      if(shouldStopAtReview && date >= reviewDate) break;
      if(target <= 0.0001) break;
    }
  }

  // End row (alternate days / PRN for BZRA/Z-drugs, PPI, AP; opioids: full stop)
  const endEligible = (cls==="Benzodiazepines / Z-drugs" || cls==="Proton Pump Inhibitor" || cls==="Antipsychotic");
  date = addDays(date, (p2Percent? p2Interval : p1Interval));
  const endRow = { date: fmtDate(date), targetDose: 0, endNote: null };
  if(endEligible){
    endRow.endNote = (cls==="Proton Pump Inhibitor")
      ? "Use on demand for symptoms; consider alternate days / lowest effective dose."
      : "Take as required (PRN); consider alternate days before stopping.";
  }
  rowsByWeek.push(endRow);

  // Render: standard vs patch chart
  const isFentanylPatch = (form==="Patch" && med==="Fentanyl");
  const isBupePatch = (form==="Patch" && med==="Buprenorphine");
  if(isFentanylPatch || isBupePatch){
    const intervalDays = isFentanylPatch ? 3 : 7;
    const timeStr = $("applyTime").value || "09:00";
    renderPatchTable(rowsByWeek, intervalDays, startDate, timeStr, { med, form });
  } else {
    renderStandardTable(rowsByWeek, freqMode, { med, form, strengthStr });
  }
}

/* ===== Dose decomposition for standard table ===== */
function decomposeDose(cls, med, form, targetDose){
  const strengths = (CATALOG[cls][med][form]||[]).map(s=>({label:s, val:toNum(s)}))
    .filter(x=>x.val>0).sort((a,b)=>b.val-a.val);
  const components = [];
  let remaining = targetDose;

  const canSplitTablet = (form!=="Patch") && HALVABLE.has(med) &&
    !(med==="Zolpidem" && /Slow Release/i.test(form)) &&
    !(med==="Quetiapine" && /Slow Release/i.test(form));

  for(const s of strengths){
    if(remaining <= 0.0001) break;
    let count = Math.floor(remaining / s.val);
    remaining = +(remaining - count*s.val).toFixed(3);
    if(canSplitTablet && remaining >= s.val*0.5 - 1e-6){ count += 0.5; remaining = +(remaining - s.val*0.5).toFixed(3); }
    if(count>0) components.push({ strengthLabel: s.label, countPerDose: count });
  }
  if(remaining > 0.0001 && strengths.length){
    const smallest = strengths[strengths.length-1];
    components.push({ strengthLabel: smallest.label, countPerDose: (canSplitTablet ? 0.5 : 1) });
  }
  return components;
}

/* ===== Standard tablet/capsule/liquid table ===== */
function renderStandardTable(weeks, freqMode, meta){
  $("patchBlock").style.display = "none";
  const wrap = $("scheduleBlock"); wrap.style.display = ""; wrap.innerHTML = "";

  const table = document.createElement("table"); table.className="table";
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  ["Week Beginning","Instructions","Strength","Morning","Midday","Dinner","Night","Special Instruction","Your tablet may look like"].forEach(h=>{
    const th=document.createElement("th"); th.textContent=h; hr.appendChild(th);
  });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody = document.createElement("tbody");
  weeks.forEach(week=>{
    if(week.targetDose<=0){
      const tr=document.createElement("tr");
      tr.appendChild(td(week.date));
      tr.appendChild(td(week.endNote || "Stop. Drug-free days; use non-drug strategies and monitoring as agreed."));
      tr.appendChild(td("–"));
      for(let i=0;i<4;i++) tr.appendChild(td("—","center"));
      tr.appendChild(td("—"));
      tr.appendChild(imageCell(null));
      tbody.appendChild(tr);
      return;
    }
    const comps = decomposeDose($("classSelect").value, meta.med, meta.form, week.targetDose);
    if(comps.length===0){
      tbody.appendChild(makeStdRow(week.date, meta, {strengthLabel:"—",countPerDose:1}, freqMode));
    } else {
      comps.forEach((cmp, idx)=>tbody.appendChild(makeStdRow(idx===0?week.date:"", meta, cmp, freqMode)));
    }
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}
function makeStdRow(dateTxt, meta, cmp, freqMode){
  const tr=document.createElement("tr");
  tr.appendChild(td(dateTxt || " "));
  const countStr = formatCount(cmp.countPerDose, meta.form);
  const instr = buildPlainDose(countStr, cmp.strengthLabel, freqMode, meta.form);
  tr.appendChild(td(instr));
  tr.appendChild(td(cmp.strengthLabel));
  const marks = marksFor(freqMode);
  for(let i=0;i<4;i++) tr.appendChild(td(marks[i]?"X":"","center"));
  tr.appendChild(td(specialInstructionFor(meta.med, meta.form)));
  tr.appendChild(imageCell({ med: meta.med, strength: cmp.strengthLabel }));
  return tr;
}

/* ===== Patch schedule (fentanyl q3d, bupe q7d) ===== */
function renderPatchTable(weeks, intervalDays, startDate, timeStr, meta){
  $("scheduleBlock").style.display = "none";
  const wrap = $("patchBlock"); wrap.style.display = ""; wrap.innerHTML = "";

  const [hh,mm] = String(timeStr||"09:00").split(":").map(x=>parseInt(x||"0",10));
  const startDT = new Date(startDate); startDT.setHours(hh||9, mm||0, 0, 0);

  const lastWeek = weeks[weeks.length-1];
  const endDT = addDays(new Date(lastWeek.date), intervalDays);

  const events = [];
  for(let t=new Date(startDT); t<=endDT; t=addDays(t, intervalDays)){
    const wk = findActiveWeek(weeks, t);
    const comps = (wk && wk.targetDose>0)
      ? decomposeDose($("classSelect").value, meta.med, meta.form, wk.targetDose)
      : [];
    events.push({ apply:new Date(t), remove:addDays(new Date(t), intervalDays), comps });
  }

  const table = document.createElement("table"); table.className="table";
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  ["Apply on","Remove on","Patch strength(s)","Notes","Image"].forEach(h=>{ const th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody = document.createElement("tbody");
  events.forEach(ev=>{
    const tr=document.createElement("tr");
    tr.appendChild(td(fmtDateTime(ev.apply)));
    tr.appendChild(td(fmtDateTime(ev.remove)));
    const strengthText = ev.comps.length
      ? ev.comps.map(c=>`${formatCount(c.countPerDose,"Patch")} of ${c.strengthLabel}`).join(" + ")
      : "—";
    tr.appendChild(td(strengthText));
    tr.appendChild(td(`Replace every ${intervalDays} days. Rotate sites.`));
    const first = ev.comps[0] || null;
    tr.appendChild(imageCell(first ? { med: meta.med, strength: first.strengthLabel } : null));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}
function findActiveWeek(weeks, dateTime){
  const d = new Date(dateTime);
  for(let i=weeks.length-1;i>=0;i--){
    const wkDate = new Date(weeks[i].date);
    if(wkDate <= d) return weeks[i];
  }
  return weeks[0];
}

/* ===== Shared helpers ===== */
function marksFor(mode){ return ({ AM:[1,0,0,0], PM:[0,0,0,1], BID:[1,0,0,1], TID:[1,1,0,1], QID:[1,1,1,1] })[mode] || [1,0,0,1]; }
function td(text, cls){ const el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text||""); return el; }
function imageCell(info){
  const tdEl=document.createElement("td"); tdEl.className="image-cell";
  if(!info){ tdEl.textContent=""; return tdEl; }
  const cont=document.createElement("div"); const img=new Image();
  const slugMed=String(info.med||"").toLowerCase().replace(/[\s\/\\\+]+/g,"_").replace(/[^\w_]/g,"");
  const slugStrength=String(info.strength||"").toLowerCase().replace(/[\s\/\\\+]+/g,"").replace(/[^\w]/g,"");
  img.onload=()=>cont.appendChild(img); img.onerror=()=>{};
  img.src=`images/${slugMed}_${slugStrength}.jpg`;
  tdEl.appendChild(cont); return tdEl;
}
function formatCount(count, form){
  if(form==="Patch"){ if(count===1) return "1 patch"; if(count===0.5) return "½ patch"; if(Number.isInteger(count)) return `${count} patches`; return `${count} patch(es)`; }
  if(Number.isInteger(count)) return count===1 ? "1 tablet" : `${count} tablets`;
  if(count%1===0.5) return "½ tablet";
  return `${count} tablet(s)`;
}
function buildPlainDose(countStr, strengthLabel, mode, form){
  if(form==="Patch") return `Apply ${countStr} of ${strengthLabel} as directed. Do not cut patches.`;
  const when = { AM:["in the morning"], PM:["at night"], BID:["in the morning","at night"], TID:["in the morning","at midday","at night"], QID:["in the morning","at midday","at dinner","at night"] }[mode];
  return when.map(t=>`Take ${countStr} of ${strengthLabel} ${t}`).join(". ");
}

/* ===== Init (plus Flatpickr setup) ===== */
function init(){
  // Flatpickr for calendars
  document.querySelectorAll(".datepick").forEach(el=>{
    flatpickr(el, {
      dateFormat: "Y-m-d",
      allowInput: true
    });
  });

  populateClasses(); populateMedicines(); populateForms(); populateStrengths();
  updateDurationVisibility(); updateBestPracticeAndPrefill();

  $("classSelect").addEventListener("change", ()=>{ populateMedicines(); populateForms(); populateStrengths(); updateDurationVisibility(); updateBestPracticeAndPrefill(); });
  $("medicineSelect").addEventListener("change", ()=>{ populateForms(); populateStrengths(); updateBestPracticeAndPrefill(); });
  $("formSelect").addEventListener("change", ()=>{ populateStrengths(); updateBestPracticeAndPrefill(); });
  $("durationSelect").addEventListener("change", updateBestPracticeAndPrefill);

  $("generateBtn").addEventListener("click", buildPlan);
  $("resetBtn").addEventListener("click", ()=>location.reload());
  $("printBtn").addEventListener("click", ()=>window.print());
  $("savePdfBtn").addEventListener("click", ()=>{
    const element = document.getElementById("outputCard");
    if(typeof html2pdf==="function"){
      html2pdf().set({ filename:'taper_plan.pdf', margin:10, image:{type:'jpeg',quality:0.95}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} }).from(element).save();
    } else { alert("PDF library not loaded."); }
  });
}
document.addEventListener("DOMContentLoaded", init);
