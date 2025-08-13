/* --------------------------
   Catalog (injectables removed; oral & patches allowed)
   -------------------------- */
const CATALOG = {
  "Opioid": {
    "Morphine": {
      "Tablet": ["5 mg","10 mg","15 mg","30 mg","60 mg","100 mg","200 mg"],
      "Capsule": ["10 mg","20 mg","50 mg","100 mg"],
      "Oral Liquid": ["1 mg/mL"],
      "Patch": [] // uncommon; placeholder to keep Form list consistent
    },
    "Oxycodone": { "Tablet": ["5 mg","10 mg","15 mg","20 mg","30 mg","40 mg","80 mg"] },
    "Oxycodone / Naloxone": { "Tablet": ["2.5/1.25 mg","5/2.5 mg","10/5 mg","15/7.5 mg","20/10 mg","30/15 mg","40/20 mg","60/30 mg","80/40 mg"] },
    "Tapentadol": { "Tablet": ["50 mg","100 mg","150 mg","200 mg","250 mg"] },
    "Tramadol": { "Tablet": ["50 mg","100 mg","150 mg","200 mg"] },
    "Fentanyl": { "Patch": ["12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr"] },
    "Buprenorphine": { "Patch": ["5 mcg/hr","10 mcg/hr","15 mcg/hr","20 mcg/hr","25 mcg/hr","30 mcg/hr","40 mcg/hr"] }
  },
  "Benzodiazepine": {
    "Diazepam": { "Tablet": ["2 mg","5 mg"], "Oral Liquid": ["1 mg/mL"] },
    "Oxazepam": { "Tablet": ["15 mg","30 mg"] },
    "Nitrazepam": { "Tablet": ["5 mg"] },
    "Temazepam": { "Tablet": ["10 mg"] },
    "Alprazolam": { "Tablet": ["0.25 mg","0.5 mg","1 mg","2 mg"] },
    "Clonazepam": { "Tablet": ["0.5 mg","2 mg"], "Oral Liquid": ["2.5 mg/mL"] },
    "Lorazepam": { "Tablet": ["0.5 mg","1 mg","2.5 mg"] },
    "Flunitrazepam": { "Tablet": ["1 mg"] }
  },
  "Proton Pump Inhibitor": {
    "Pantoprazole": { "Tablet": ["20 mg","40 mg"] },
    "Esomeprazole": { "Tablet": ["10 mg","20 mg"] },
    "Lansoprazole": { "Tablet": ["15 mg","30 mg"], "Wafer": ["15 mg","30 mg"] },
    "Omeprazole": { "Tablet": ["10 mg","20 mg"], "Capsule": ["10 mg","20 mg"] },
    "Rabeprazole": { "Tablet": ["10 mg","20 mg"] }
  },
  "Antipsychotic": {
    "Haloperidol": { "Tablet": ["0.5 mg","1 mg","2 mg","5 mg","10 mg","20 mg"], "Oral Liquid": ["2 mg/mL"] }, // injectables removed
    "Olanzapine": { "Tablet": ["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"], "Wafer": ["5 mg","10 mg","15 mg","20 mg"] },
    "Quetiapine": { "Immediate Release Tablet": ["25 mg","100 mg","200 mg","300 mg"], "Slow Release Tablet": ["50 mg","150 mg","200 mg","300 mg","400 mg"] },
    "Risperidone": { "Tablet": ["0.5 mg","1 mg","2 mg","3 mg","4 mg"], "Oral Liquid": ["1 mg/mL"] }
  }
};

/* Which tablets can be split? (conservative default = false) */
const HALVABLE = new Set([
  "Diazepam","Oxazepam","Nitrazepam","Temazepam","Alprazolam","Clonazepam","Lorazepam","Flunitrazepam",
  "Haloperidol","Olanzapine" // IR quetiapine sometimes; SR generally not
]);

/* --------------------------
   Class info (guidance text only; does not alter inputs)
   -------------------------- */
const CLASS_INFO = {
  "Benzodiazepine": {
    guidance: "Many adults taper comfortably by about 25% every 2 weeks, then slow to about 12.5% every 2 weeks near the end. Monitor how you feel and slow down if needed."
  },
  "Antipsychotic": {
    guidance: "Consider dose reductions of about 25–50% every 1–2 weeks, with close monitoring for symptom return. Slower tapers are reasonable."
  },
  "Proton Pump Inhibitor": {
    guidance: "Either step down the dose (e.g., to the lowest effective dose or every-other-day) or stop and use on-demand. Review at 4 and 12 weeks."
  },
  "Opioid": {
    guidance: "Percentage tapers vary. Choose a reduction and interval that are safe for the person, slowing down if withdrawal symptoms occur."
  }
};

/* --------------------------
   Helpers
   -------------------------- */
const $ = id => document.getElementById(id);
const toNum = s => s ? parseFloat(String(s).match(/([\d.]+)/)?.[1] || "0") : 0;
const unitOf = s => s?.replace(/^[\d.\s/]+/,'').trim(); // e.g., "mg", "mcg/hr", "mg/mL"
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }

/* Special instruction per form/medicine */
function specialInstructionFor(med, form){
  if(form === "Patch") return "Patches: apply to intact skin as directed. Do not cut patches.";
  if(HALVABLE.has(med)) return "May be halved. If quartering is required, check brand-specific guidance.";
  return "Swallow whole, do not halve or crush";
}

/* Dependent selects */
function populateClasses(){
  const cSel = $("classSelect");
  cSel.innerHTML = "";
  Object.keys(CATALOG).forEach(cls=>{
    const o=document.createElement("option"); o.value=cls; o.textContent=cls; cSel.appendChild(o);
  });
}
function populateMedicines(){
  const cls = $("classSelect").value;
  const mSel = $("medicineSelect");
  mSel.innerHTML = "";
  Object.keys(CATALOG[cls]).forEach(m=>{
    const o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o);
  });
}
function populateForms(){
  const cls=$("classSelect").value;
  const med=$("medicineSelect").value;
  const fSel=$("formSelect");
  fSel.innerHTML = "";
  Object.keys(CATALOG[cls][med]).forEach(f=>{
    if(f==="IM/IV") return; // ensure injectables are removed
    const strengths = CATALOG[cls][med][f];
    if(Array.isArray(strengths)) {
      const o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o);
    }
  });
}
function populateStrengths(){
  const cls=$("classSelect").value;
  const med=$("medicineSelect").value;
  const form=$("formSelect").value;
  const sSel=$("strengthSelect");
  sSel.innerHTML = "";
  (CATALOG[cls][med][form]||[]).forEach(s=>{
    const o=document.createElement("option"); o.value=s; o.textContent=s; sSel.appendChild(o);
  });
}

/* Best practice box (display only; no prefill) */
function updateBestPracticeBox(){
  const cls = $("classSelect").value;
  const duration = $("durationSelect").value;
  const msg = CLASS_INFO[cls]?.guidance || "";
  const box = $("bestPracticeBox");
  if(duration){
    box.innerHTML = `<strong>Best-practice guidance for ${cls}</strong><br>${msg}<br><span class="muted">This text is guidance only. Set your taper values above to suit the person.</span>`;
  } else {
    box.innerHTML = "";
  }
}

/* --------------------------
   Dose plan and table building
   -------------------------- */
function buildPlan(){
  const cls = $("classSelect").value;
  const med = $("medicineSelect").value;
  const form= $("formSelect").value;
  const strengthStr = $("strengthSelect").value;
  const baseUnit = unitOf(strengthStr); // e.g., "mg"
  const baseDose = toNum(strengthStr);  // e.g., 20
  const freq = parseInt($("frequencySelect").value,10);

  const startDate = $("startDate").value ? new Date($("startDate").value) : new Date();
  const reviewDate = $("reviewDate").value ? new Date($("reviewDate").value) : null;

  const p1Percent = parseFloat($("p1Percent").value || "0");
  const p1Interval = parseInt($("p1Interval").value || "0",10);
  const p1StopDose = parseFloat($("p1StopDose").value || "0");
  const p1StopWeek = parseInt($("p1StopWeek").value || "0",10);

  const p2Percent = parseFloat($("p2Percent").value || "0");
  const p2Interval = parseInt($("p2Interval").value || "0",10);

  if(!baseDose){ alert("Please select a strength."); return; }
  if(!p1Percent || !p1Interval){ alert("Please set Phase 1 % and interval."); return; }
  if(p2Percent && !p2Interval){ alert("Please set Phase 2 interval."); return; }

  // Header badges & special instructions
  $("hdrPatient").textContent   = "Patient: " + ($("patientName").value || "–");
  $("hdrAllergies").textContent = "Allergies: " + ($("allergies").value || "–");
  $("hdrHcp").textContent       = "HCP: " + ($("hcpName").value || "–");
  $("hdrMedicine").textContent  = "Medicine: " + med + " " + form;
  $("hdrSpecial").textContent   = "Special instructions: " + specialInstructionFor(med, form);

  // Build taper timeline of target per-dose amounts
  const rowsByWeek = []; // [{date, components:[{strengthLabel, countPerDose}], targetDose}]
  let target = baseDose; // start from selected strength as the initial per-dose amount
  let week = 1;
  let date = startOfWeek(startDate);

  function pushWeek(targetDose){
    const components = decomposeDose(cls, med, form, targetDose);
    rowsByWeek.push({ date: fmtDate(date), components, targetDose });
  }

  // Phase 1
  while(target > 0){
    pushWeek(target);
    if((p1StopDose && target <= p1StopDose) || (p1StopWeek && week >= p1StopWeek)) break;
    date = addDays(date, p1Interval);
    week += 1;
    target = +(target * (1 - p1Percent/100)).toFixed(3);
    if(reviewDate && date >= reviewDate) break;
    if(target <= 0.0001) break;
  }

  // Phase 2 (optional)
  if(target > 0 && p2Percent){
    while(target > 0.0001){
      date = (rowsByWeek.length===0) ? startOfWeek(startDate) : addDays(date, p2Interval);
      week += 1;
      target = +(target * (1 - p2Percent/100)).toFixed(3);
      rowsByWeek.push({ date: fmtDate(date), components: decomposeDose(cls, med, form, target), targetDose: target });
      if(reviewDate && date >= reviewDate) break;
      if(target <= 0.0001) break;
    }
  }

  // Final stop row
  date = addDays(date, (p2Percent ? p2Interval : p1Interval));
  rowsByWeek.push({ date: fmtDate(date), components: [], targetDose: 0 });

  renderTable(rowsByWeek, freq, { med, form });
}

/* Convert a target dose into strength components (multiple rows per week).
   Greedy: use largest strength first; allow halves if tablet is splittable. */
function decomposeDose(cls, med, form, targetDose){
  const strengths = (CATALOG[cls][med][form]||[]).map(s=>({label:s, val:toNum(s)}))
    .filter(x=>x.val>0)
    .sort((a,b)=>b.val-a.val);

  const components = [];
  let remaining = targetDose;

  const canSplit = form !== "Patch" && HALVABLE.has(med); // patches not splittable
  for(const s of strengths){
    if(remaining <= 0.0001) break;

    // whole tablets first
    let count = Math.floor(remaining / s.val);
    remaining = +(remaining - count*s.val).toFixed(3);

    // try half-tablet if allowed and helpful
    if(canSplit && remaining >= s.val*0.5 - 1e-6){
      count += 0.5;
      remaining = +(remaining - s.val*0.5).toFixed(3);
    }

    if(count>0){
      components.push({ strengthLabel: s.label, countPerDose: count });
    }
  }

  // if tiny remainder, round up with smallest strength (half if allowed)
  if(remaining > 0.0001 && strengths.length){
    const smallest = strengths[strengths.length-1];
    const addCount = (canSplit ? 0.5 : 1);
    components.push({ strengthLabel: smallest.label, countPerDose: addCount });
  }

  return components;
}

/* Render the table to match required layout */
function renderTable(weeks, freq, meta){
  const wrap = $("scheduleBlock");
  wrap.innerHTML = "";

  const table = document.createElement("table");
  table.className = "table";

  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  ["Week Beginning","Instructions","Strength","Morning","Midday","Dinner","Night","Special Instruction","Your tablet may look like"].forEach(h=>{
    const th=document.createElement("th"); th.textContent=h; hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  weeks.forEach(week=>{
    if(week.targetDose<=0){
      const tr=document.createElement("tr");
      tr.appendChild(td(week.date));
      tr.appendChild(td("Stop. Drug-free days; use non-drug strategies and monitoring as agreed."));
      tr.appendChild(td("–"));
      for(let i=0;i<4;i++){ tr.appendChild(td("—","center")); }
      tr.appendChild(td("—"));
      tr.appendChild(imageCell(null));
      tbody.appendChild(tr);
      return;
    }

    if(week.components.length===0){
      // fallback single row
      tbody.appendChild(makeRow(week.date, meta, {strengthLabel: "—", countPerDose: 1}, freq, true));
    } else {
      week.components.forEach((cmp, idx)=>{
        tbody.appendChild(makeRow(idx===0 ? week.date : "", meta, cmp, freq, false));
      });
    }
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

/* Build one row */
function makeRow(dateTxt, meta, cmp, freq, isFallback){
  const tr=document.createElement("tr");

  // Week beginning
  tr.appendChild(td(dateTxt || " "));

  // Instructions (plain English)
  const countStr = formatCount(cmp.countPerDose, meta.form);
  const instr = buildPlainEnglishDose(countStr, cmp.strengthLabel, freq, meta.form);
  tr.appendChild(td(instr));

  // Strength
  tr.appendChild(td(cmp.strengthLabel));

  // Time-of-day cells with X
  for(let i=0;i<4;i++){
    tr.appendChild(td(i<freq ? "X" : "","center"));
  }

  // Special instruction (outside header version remains too)
  tr.appendChild(td(specialInstructionFor(meta.med || "", meta.form)));

  // Image cell
  tr.appendChild(imageCell({ med: meta.med, strength: cmp.strengthLabel }));

  return tr;
}

/* Cells & images */
function td(text, cls){
  const el=document.createElement("td");
  if(cls) el.className = cls;
  el.textContent = text;
  return el;
}
function imageCell(info){
  const tdEl = document.createElement("td");
  tdEl.className="image-cell";
  if(!info){ tdEl.textContent=""; return tdEl; }
  const cont = document.createElement("div");
  const img = new Image();
  const slugMed = (info.med||"").toLowerCase().replace(/\s+|\/|\\|\+/g,'_').replace(/[^\w_]/g,'');
  const slugStrength = info.strength.toLowerCase().replace(/\s+|\/|\\|\+/g,'').replace(/[^\w]/g,'');
  img.onload = ()=>{ cont.appendChild(img); };
  img.onerror = ()=>{ /* no image available */ };
  img.src = `images/${slugMed}_${slugStrength}.jpg`;
  tdEl.appendChild(cont);
  return tdEl;
}

/* Wording helpers */
function formatCount(count, form){
  if(form==="Patch"){
    if(count===1) return "1 patch";
    if(count===0.5) return "½ patch";
    if(Number.isInteger(count)) return `${count} patches`;
    return `${count} patch(es)`;
  }
  if(count===Math.floor(count)){
    return count===1 ? "1 tablet" : `${count} tablets`;
  }
  if(count%1===0.5) return "½ tablet";
  return `${count} tablet(s)`;
}
function buildPlainEnglishDose(countStr, strengthLabel, freq, form){
  if(form==="Patch"){
    // keep frequency text simple for patches
    return `Apply ${countStr} of ${strengthLabel} as directed. Do not cut patches.`;
  }
  const parts = [];
  const when = ["in the morning","at midday","at dinner","at night"];
  for(let i=0;i<freq;i++){
    parts.push(`Take ${countStr} of ${strengthLabel} ${when[i]}`);
  }
  return parts.join(". ");
}

/* --------------------------
   Events & init
   -------------------------- */
function init(){
  populateClasses();
  populateMedicines();
  populateForms();
  populateStrengths();

  $("classSelect").addEventListener("change", ()=>{ populateMedicines(); populateForms(); populateStrengths(); updateBestPracticeBox(); });
  $("medicineSelect").addEventListener("change", ()=>{ populateForms(); populateStrengths(); updateBestPracticeBox(); });
  $("formSelect").addEventListener("change", ()=>{ populateStrengths(); updateBestPracticeBox(); });

  $("durationSelect").addEventListener("change", updateBestPracticeBox);

  $("generateBtn").addEventListener("click", buildPlan);
  $("resetBtn").addEventListener("click", ()=>location.reload());
  $("printBtn").addEventListener("click", ()=>window.print());
  $("savePdfBtn").addEventListener("click", ()=>{
    const element = document.getElementById("outputCard");
    if(typeof html2pdf === "function"){
      html2pdf().set({
        filename: 'taper_plan.pdf',
        margin: 10,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(element).save();
    } else {
      alert("PDF library not loaded. Please check your internet connection and try again.");
    }
  });
}
document.addEventListener("DOMContentLoaded", init);
