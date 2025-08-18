"use strict";
/* =========================
   Utilities & constants
========================= */
const $ = (id) => document.getElementById(id);
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
function roundToNearest(x, step){ return Math.round(x/step)*step; }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
const THREE_MONTHS_MS = 90*24*3600*1000;
const MAX_WEEKS = 60;
/* Words for tablet fractions */
const WORDS_0_20=["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
function intToWords(n){ if(n>=0 && n<=20) return WORDS_0_20[n]; return String(n); }
function tabletsToWords(q){ // q in quarters (0.25 tablet units)
  const tabs=q/4;
  if (Math.abs(tabs) < 1e-6) return "zero tablets";
  const whole=Math.floor(tabs+1e-6);
  const frac=+(tabs-whole).toFixed(2);
  if(frac===0){
    return (whole===1) ? "one tablet" : `${intToWords(whole)} tablets`;
  }
  if(whole===0){
    if(frac===0.25) return "a quarter of a tablet";
    if(frac===0.5)  return "half a tablet";
    if(frac===0.75) return "three quarters of a tablet";
  }
  const j=(frac===0.25)?"a quarter":(frac===0.5)?"a half":"three quarters";
  return `${intToWords(whole)} and ${j} of a tablet`;
}
function tabletsToWords_noUnit(q){ // for table cell
  const tabs=q/4, whole=Math.floor(tabs+1e-6), frac=+(tabs-whole).toFixed(2);
  if(frac===0) return String(whole);
  if(whole===0){
    if(frac===0.25) return "quarter";
    if(frac===0.5)  return "half";
    if(frac===0.75) return "three quarters";
  }
  const j=(frac===0.25)?"a quarter":(frac===0.5)?"a half":"three quarters";
  return `${intToWords(whole)} and ${j}`;
}

/* Helpers for strength display & cell formatting (whole numbers as digits; partials in words) */
function approxEqual(a,b){ return Math.abs(a-b) < 1e-6; }

function findBaseStrengthMg(pieceMg){
  const bases = strengthsForSelected().map(parseMgFromStrength).filter(v=>v>0);
  return bases.find(b => approxEqual(pieceMg, b) || approxEqual(pieceMg, b/2) || approxEqual(pieceMg, b/4)) || pieceMg;
}

function toQuarterUnitsForBase(pieceMg, count, baseMg){
  if(approxEqual(pieceMg, baseMg))   return count * 4; // whole tablets -> 4 quarters each
  if(approxEqual(pieceMg, baseMg/2)) return count * 2; // halves -> 2 quarters each
  if(approxEqual(pieceMg, baseMg/4)) return count * 1; // quarters -> 1 quarter each
  // fallback
  return Math.round(count * 4 * (pieceMg / baseMg));
}

function formatCell(pieceMg, count){
  if(!count) return "";
  const baseMg = findBaseStrengthMg(pieceMg);
  const qUnits = toQuarterUnitsForBase(pieceMg, count, baseMg);
  return tabletsToWords_noUnit(qUnits);
}

/* =======================
   Medicine config
======================= */
const MEDS = {
  "Benzodiazepine/Z-Drug": {
    forms: ["Tablet"],
    strengths: ["2 mg","5 mg","10 mg","25 mg"],
    minStepPercent: 5,
    maxStepPercent: 25,
    defaultStepPercent: 10,
    defaultIntervalDays: 7
  },
  "PPI": {
    forms: ["Tablet","Capsule"],
    strengths: ["20 mg","40 mg"],
    minStepPercent: 25,
    maxStepPercent: 50,
    defaultStepPercent: 25,
    defaultIntervalDays: 14
  },
  "Antipsychotic": {
    forms: ["Tablet"],
    strengths: ["0.5 mg","1 mg","2 mg","5 mg","10 mg"],
    minStepPercent: 10,
    maxStepPercent: 25,
    defaultStepPercent: 10,
    defaultIntervalDays: 14
  },
  "Opioid": {
    forms: ["Tablet","Patch"],
    strengths: ["2.5 mg","5 mg","10 mg","20 mg","40 mg"],
    minStepPercent: 10,
    maxStepPercent: 25,
    defaultStepPercent: 10,
    defaultIntervalDays: 7
  },
  "Buprenorphine": {
    forms: ["Patch"],
    strengths: ["5 mcg/hr","10 mcg/hr","20 mcg/hr"],
    minStepPercent: 10,
    maxStepPercent: 25,
    defaultStepPercent: 10,
    defaultIntervalDays: 7
  },
  "Fentanyl": {
    forms: ["Patch"],
    strengths: ["12 mcg/hr","25 mcg/hr","50 mcg/hr","75 mcg/hr","100 mcg/hr"],
    minStepPercent: 10,
    maxStepPercent: 25,
    defaultStepPercent: 10,
    defaultIntervalDays: 3
  }
};

function strengthsForSelected(){
  const med = $("medicineSelect").value;
  return MEDS[med]?.strengths || [];
}

/* Parsing helpers */
function parseMgFromStrength(s){ // "10 mg" => 10
  const m = /([\d.]+)\s*mg/i.exec(s||"");
  return m? parseFloat(m[1]) : 0;
}
function parsePatchRate(s){ // "25 mcg/hr" => 25
  const m = /([\d.]+)\s*mcg\/hr/i.exec(s||"");
  return m? parseFloat(m[1]) : 0;
}

/* =======================
   Dose line handling
======================= */
let doseLines = []; // {strengthStr:"10 mg", am:0, mid:0, din:0, pm:0}
function addDoseLine(){
  const strSel = $("strengthSelect");
  const s = strSel.value;
  if(!s) return;
  doseLines.push({ strengthStr: s, am:0, mid:0, din:0, pm:0 });
  renderDoseLines();
}
function removeDoseLine(i){
  doseLines.splice(i,1);
  renderDoseLines();
}
function updateDoseCell(i, field, val){
  const v = Math.max(0, parseFloat(val||"0"));
  doseLines[i][field] = isNaN(v) ? 0 : v;
}
function renderDoseLines(){
  const host = $("doseLines");
  host.innerHTML = "";
  doseLines.forEach((ln,i)=>{
    const row = document.createElement("div");
    row.className="dose-line";
    row.innerHTML = `
      <div class="dose-strength">${ln.strengthStr}</div>
      <input type="number" min="0" step="0.25" value="${ln.am}"  aria-label="Morning"  onchange="updateDoseCell(${i},'am',this.value)" />
      <input type="number" min="0" step="0.25" value="${ln.mid}" aria-label="Midday"   onchange="updateDoseCell(${i},'mid',this.value)" />
      <input type="number" min="0" step="0.25" value="${ln.din}" aria-label="Dinner"   onchange="updateDoseCell(${i},'din',this.value)" />
      <input type="number" min="0" step="0.25" value="${ln.pm}"  aria-label="Night"    onchange="updateDoseCell(${i},'pm',this.value)" />
      <button class="ghost" onclick="removeDoseLine(${i})" title="Remove line">✕</button>
    `;
    host.appendChild(row);
  });
}

/* =======================
   Build plans
======================= */
function buildPlan(){
  const med = $("medicineSelect").value;
  const form = $("formSelect").value;

  if(form==="Patch") return buildPlanPatch();
  return buildPlanTablets();
}

function buildPlanTablets(){
  const startDate = $("startDate") ? ($("startDate")._flatpickr?.selectedDates?.[0] || new Date()) : new Date();
  const reviewDate = $("reviewDate") ? ($("reviewDate")._flatpickr?.selectedDates?.[0] || null) : null;

  const stepPercent = clamp(parseFloat($("tStepPercent")?.value || "10"), 1, 100);
  const stepDays    = Math.max(1, parseInt($("tStepDays")?.value || "7", 10));

  // total baseline per piece mg
  const packs0 = {AM:{}, MID:{}, DIN:{}, PM:{}};
  doseLines.forEach(ln=>{
    const mg = parseMgFromStrength(ln.strengthStr);
    if(mg<=0) return;
    if(ln.am)  packs0.AM[mg]  = (packs0.AM[mg]  || 0) + ln.am;
    if(ln.mid) packs0.MID[mg] = (packs0.MID[mg] || 0) + ln.mid;
    if(ln.din) packs0.DIN[mg] = (packs0.DIN[mg] || 0) + ln.din;
    if(ln.pm)  packs0.PM[mg]  = (packs0.PM[mg]  || 0) + ln.pm;
  });

  // function to scale down all counts by percentage (rounding to nearest quarter)
  function scalePacks(packs, percent){
    const f = (100 - percent)/100;
    const out = {AM:{}, MID:{}, DIN:{}, PM:{}};
    ["AM","MID","DIN","PM"].forEach(slot=>{
      Object.entries(packs[slot]).forEach(([mg,count])=>{
        const c = roundToNearest(count * f, 0.25);
        if(c>0) out[slot][mg]=c;
      });
    });
    return out;
  }

  const rows=[];
  let date = startOfWeek(startDate);
  let week = 1;
  let nextCutDate = date;

  let packs = JSON.parse(JSON.stringify(packs0));

  while(week <= MAX_WEEKS){
    rows.push({ week, date: fmtDate(date), packs, med: $("medicineSelect").value });

    const nextDate = addDays(date, 7);
    const hitReview = (reviewDate && nextDate >= reviewDate);
    const hit3mo = ((+nextDate - +startDate) >= THREE_MONTHS_MS);

    if(hitReview || hit3mo){
      rows.push({ week: week+1, date: fmtDate(nextDate), packs: {AM:{},MID:{},DIN:{},PM:{}}, med: $("medicineSelect").value, review: true });
      break;
    }

    if(+nextDate >= +nextCutDate){
      const scaled = scalePacks(packs, stepPercent);
      // stop when everything is zero -> add explicit stop row
      const anyLeft = ["AM","MID","DIN","PM"].some(slot=>Object.keys(scaled[slot]).length>0);
      if(!anyLeft){
        rows.push({ week: week+1, date: fmtDate(nextDate), packs: {AM:{},MID:{},DIN:{},PM:{}}, med: $("medicineSelect").value, stop: true });
        break;
      }
      packs = scaled;
      nextCutDate = addDays(nextCutDate, stepDays);
    }

    date = nextDate;
    week++;
  }

  return rows;
}

/* PATCH (Buprenorphine/Fentanyl) — fixed end logic */
function buildPlanPatch(){
  const med = $("medicineSelect").value, form = "Patch";
  const startDate = $("startDate") ? ($("startDate")._flatpickr?.selectedDates?.[0] || new Date()) : new Date();
  const reviewDate = $("reviewDate") ? ($("reviewDate")._flatpickr?.selectedDates?.[0] || null) : null;

  const changeDays = (med === "Fentanyl") ? 3 : 7;

  const reduceBy = clamp(parseFloat($("p1Percent")?.value || "0"), 1, 100);
  const reduceEvery = Math.max(1, parseInt($("p1Interval")?.value || "7", 10));

  const strengths = strengthsForSelected().map(parsePatchRate).filter(v=>v>0).sort((a,b)=>b-a);
  const smallest = strengths[strengths.length-1];

  let total = 0; doseLines.forEach(ln => total += parsePatchRate(ln.strengthStr) || 0);
  if(total <= 0) total = smallest;

  function mixDownTo(value){
    let remaining = value, used = [];
    for(const s of strengths){ while(remaining >= s){ used.push(s); remaining -= s; } }
    if(remaining > 0) used.push(smallest);
    return used;
  }

  const rows = [];
  let date = startOfWeek(startDate);
  let week = 1;

  let currentDose = total;
  let nextReductionDate = date;
  let lowestReachedOn = null;

  while(true){
    if(+date >= +nextReductionDate){
      const newDose = Math.max(smallest, Math.ceil(currentDose * (1 - reduceBy/100)));
      if(newDose === smallest && currentDose !== smallest && !lowestReachedOn){
        lowestReachedOn = date;
      }
      currentDose = newDose;
      nextReductionDate = addDays(nextReductionDate, reduceEvery);
    }

    rows.push({ week, date: fmtDate(date), patches: mixDownTo(currentDose), med, form });

    const nextDate = addDays(date, changeDays);
    const hitReview = (reviewDate && nextDate >= reviewDate);
    const hit3mo = ((+nextDate - +startDate) >= THREE_MONTHS_MS);

    if(hitReview || hit3mo){
      rows.push({ week: week+1, date: fmtDate(nextDate), patches: [], med, form, review: true });
      break;
    }

    // Stop exactly after duration set ON the lowest patch (no skipped week)
    if(lowestReachedOn && nextDate >= addDays(lowestReachedOn, reduceEvery)){
      rows.push({ week: week+1, date: fmtDate(nextDate), patches: [], med, form, stop: true });
      break;
    }

    date = nextDate;
    week++;
  }

  return rows;
}

/* =======================
   Rendering
======================= */
function render(results){
  const med = $("medicineSelect").value;
  const form = $("formSelect").value;

  $("outputCard").style.display = "block";
  $("patchBlock").style.display = (form==="Patch") ? "block" : "none";

  if(form==="Patch") renderPatchTable(results);
  else renderStandardTable(results);
}

function renderPatchTable(rows){
  const block = $("patchBlock");
  $("scheduleBlock").innerHTML = "";
  block.innerHTML = "";

  rows.forEach(wk=>{
    const div = document.createElement("div");
    div.className = "patch-row";
    let content = `<h3>Week ${wk.week} – ${wk.date}</h3>`;
    if(wk.review){
      content += `<p class="instructions-pre">Review on ${wk.date}</p>`;
    }else if(wk.stop){
      content += `<p class="instructions-pre">Stop ${wk.med}</p>`;
    }else{
      content += `<p>Apply: ${wk.patches.map(p=>`${p} mcg/hr`).join(", ")}</p>`;
      if(wk.med==="Fentanyl"){
        content += `<p class="muted">Change patch every 3 days</p>`;
      }else{
        content += `<p class="muted">Change patch weekly</p>`;
      }
    }
    div.innerHTML = content;
    block.appendChild(div);
  });
}

function renderStandardTable(rows){
  const block = $("scheduleBlock");
  block.innerHTML = "";
  $("patchBlock").style.display = "none";

  rows.forEach((wk) => {
    const pieces = new Set();
    ["AM","MID","DIN","PM"].forEach(slot=>{
      Object.keys(wk.packs[slot]).forEach(k=>pieces.add(parseFloat(k)));
    });
    const pieceMgs = [...pieces].sort((a,b)=>a-b);

    const tbl = document.createElement("table");
    tbl.className = "table";
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>Week ${wk.week} – ${wk.date}</th>
          <th class="center">Morning</th>
          <th class="center">Midday</th>
          <th class="center">Dinner</th>
          <th class="center">Night</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = tbl.querySelector("tbody");

    if(wk.stop){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${wk.med}</strong></td>
        <td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td>
        <td class="instructions-pre">Stop ${wk.med}</td>
      `;
      tbody.appendChild(tr);
      block.appendChild(tbl);
      return;
    }
    if(wk.review){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${wk.med}</strong></td>
        <td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td>
        <td class="instructions-pre">Review on ${wk.date}</td>
      `;
      tbody.appendChild(tr);
      block.appendChild(tbl);
      return;
    }

    pieceMgs.forEach((mg, idx)=>{
      const baseMg = findBaseStrengthMg(mg);
      const am = wk.packs.AM[mg] || 0;
      const mid= wk.packs.MID[mg]|| 0;
      const din= wk.packs.DIN[mg]|| 0;
      const pm = wk.packs.PM[mg] || 0;

      const amQ = toQuarterUnitsForBase(mg, am,  baseMg);
      const midQ= toQuarterUnitsForBase(mg, mid, baseMg);
      const dinQ= toQuarterUnitsForBase(mg, din, baseMg);
      const pmQ = toQuarterUnitsForBase(mg, pm,  baseMg);

      const instr = [
        amQ ? `Take ${tabletsToWords(amQ)} in the morning` : "",
        midQ? `Take ${tabletsToWords(midQ)} at midday` : "",
        dinQ? `Take ${tabletsToWords(dinQ)} at dinner` : "",
        pmQ ? `Take ${tabletsToWords(pmQ)} at night` : "",
      ].filter(Boolean).join("\n");

      const tr = document.createElement("tr");
      if(idx % 2 === 1) tr.classList.add("week-even");
      tr.innerHTML = `
        <td><strong>${wk.med} ${(+baseMg).toFixed(baseMg % 1 ? 2 : 0)} mg</strong></td>
        <td class="center">${formatCell(mg, am)}</td>
        <td class="center">${formatCell(mg, mid)}</td>
        <td class="center">${formatCell(mg, din)}</td>
        <td class="center">${formatCell(mg, pm)}</td>
        <td class="instructions-pre">${instr}</td>
      `;
      tbody.appendChild(tr);
    });

    block.appendChild(tbl);
  });
}

/* =======================
   Print / Export
======================= */
function printOutputOnly(){
  const el = $("outputCard");
  if(!el){ alert("Nothing to print yet."); return; }

  const w = window.open("", "printWin");
  w.document.write(`
    <!doctype html><html><head><meta charset="utf-8" />
    <title>Print</title>
    <style>
      @page { size: A4; margin: 10mm; }
      html, body { height: auto !important; background: #fff !important; }
      body { margin: 0; padding: 0; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .table thead th{color:#111827}
      .table tbody td{background:#ffffff;border-color:#d1d5db;color:#111827}
      .week-even td{background:#e6e8ee !important}
    </style>
    </head><body>${el.outerHTML}</body></html>
  `);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

/* =======================
   Init & bindings
======================= */
function populateSelectors(){
  const classSel = $("classSelect");
  const medSel   = $("medicineSelect");
  const formSel  = $("formSelect");
  const strSel   = $("strengthSelect");

  // Class/medicine options
  const meds = Object.keys(MEDS);
  medSel.innerHTML = meds.map(m=>`<option value="${m}">${m}</option>`).join("");
  updateFormStrengths();
}
function updateFormStrengths(){
  const med = $("medicineSelect").value;
  const formSel  = $("formSelect");
  const strSel   = $("strengthSelect");
  const forms = MEDS[med]?.forms || [];
  formSel.innerHTML = forms.map(f=>`<option value="${f}">${f}</option>`).join("");
  const strengths = MEDS[med]?.strengths || [];
  strSel.innerHTML = strengths.map(s=>`<option value="${s}">${s}</option>`).join("");

  // defaults for control blocks
  if(forms.includes("Patch")){
    $("patchControls").style.display = "block";
  }else{
    $("patchControls").style.display = "none";
  }
}

function generateSchedule(){
  const results = buildPlan();
  render(results);
}

function resetAll(){
  doseLines = [];
  renderDoseLines();
  $("outputCard").style.display = "none";
  $("scheduleBlock").innerHTML = "";
  $("patchBlock").innerHTML = "";
}

function init(){
  populateSelectors();
  renderDoseLines();

  $("addDoseBtn").addEventListener("click", addDoseLine);
  $("generateBtn").addEventListener("click", generateSchedule);
  $("printBtn").addEventListener("click", printOutputOnly);
  $("resetBtn").addEventListener("click", resetAll);

  $("medicineSelect").addEventListener("change", updateFormStrengths);
  $("formSelect").addEventListener("change", updateFormStrengths);

  // date pickers (optional: if flatpickr is present)
  if(window.flatpickr){
    flatpickr("#startDate",{dateFormat:"Y-m-d"});
    flatpickr("#reviewDate",{dateFormat:"Y-m-d"});
  }
}

document.addEventListener("DOMContentLoaded", init);
