"use strict";

/* ===== Simple runtime error banner (helps debug on GH Pages) ===== */
(function attachErrorTrap(){
  window.addEventListener("error", function(e){
    try{
      var banner = document.createElement("div");
      banner.style.cssText = "position:fixed;left:0;right:0;bottom:0;background:#7f1d1d;color:#fff;padding:8px 12px;font:14px system-ui;z-index:99999";
      banner.textContent = "Script error: " + (e.message || "unknown") + " @ " + (e.filename||"") + ":" + (e.lineno||"");
      document.body.appendChild(banner);
    }catch(_){}
  });
})();

/* ===== Catalog (injectables removed; oral & patches allowed) ===== */
var CATALOG = {
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
var HALVABLE = {
  has: function(med){ return ({
    "Diazepam":1,"Oxazepam":1,"Nitrazepam":1,"Temazepam":1,"Alprazolam":1,"Clonazepam":1,"Lorazepam":1,"Flunitrazepam":1,
    "Haloperidol":1,"Olanzapine":1,"Zopiclone":1,"Zolpidem":1
  })[med] === 1; }
};

/* Guidance text & defaults */
var GUIDANCE = {
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
    preset: null // set dynamically from duration
  }
};

/* ===== Utilities ===== */
function $(id){ return document.getElementById(id); }
function toNum(s){ if(!s) return 0; var m = String(s).match(/([\d.]+)/); return m ? parseFloat(m[1]) : 0; }
function unitOf(s){ if(!s) return ""; return String(s).replace(/^[\d.\s/]+/,"").trim(); }
function fmtDate(d){ return new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }
function fmtDateTime(d){ return new Date(d).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }
function addDays(d,n){ var x=new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfWeek(d){ var dt=new Date(d), day=dt.getDay(), diff=(day===0?6:day-1); dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); return dt; }

/* ===== Populate UI ===== */
function populateClasses(){
  var cSel = $("classSelect"); if(!cSel) return;
  cSel.innerHTML = "";
  Object.keys(CATALOG).forEach(function(cls){
    var o=document.createElement("option"); o.value=cls; o.textContent=cls; cSel.appendChild(o);
  });
}
function populateMedicines(){
  var cls = ($("classSelect")||{}).value || "";
  var mSel = $("medicineSelect"); if(!mSel || !cls) return;
  mSel.innerHTML = "";
  Object.keys(CATALOG[cls]||{}).forEach(function(m){
    var o=document.createElement("option"); o.value=m; o.textContent=m; mSel.appendChild(o);
  });
}
function populateForms(){
  var cls = ($("classSelect")||{}).value || "";
  var med = ($("medicineSelect")||{}).value || "";
  var fSel = $("formSelect"); if(!fSel || !cls || !med) return;
  fSel.innerHTML = "";
  var obj = (CATALOG[cls] && CATALOG[cls][med]) ? CATALOG[cls][med] : {};
  Object.keys(obj).forEach(function(f){
    var o=document.createElement("option"); o.value=f; o.textContent=f; fSel.appendChild(o);
  });
  var form = ($("formSelect")||{}).value || "";
  var wrap = $("applyTimeWrap"); if(wrap) wrap.style.display = (form==="Patch") ? "" : "none";
}
function populateStrengths(){
  var cls = ($("classSelect")||{}).value || "";
  var med = ($("medicineSelect")||{}).value || "";
  var form = ($("formSelect")||{}).value || "";
  var sSel = $("strengthSelect"); if(!sSel || !cls || !med || !form) return;
  sSel.innerHTML = "";
  var list = (((CATALOG[cls]||{})[med]||{})[form]||[]);
  for(var i=0;i<list.length;i++){
    var o=document.createElement("option"); o.value=list[i]; o.textContent=list[i]; sSel.appendChild(o);
  }
}

/* Duration visibility: only for Opioid */
function updateDurationVisibility(){
  var wrap = $("durationWrap");
  if(!wrap) return;
  wrap.style.display = (($("classSelect")||{}).value === "Opioid") ? "" : "none";
}

/* Best-practice + prefill controls */
function updateBestPracticeAndPrefill(){
  var cls = ($("classSelect")||{}).value || "";
  var med = ($("medicineSelect")||{}).value || "";
  var form = ($("formSelect")||{}).value || "";
  var duration = ($("durationSelect")||{}).value || "";
  var box = $("bestPracticeBox"); if(!box) return;

  var g = GUIDANCE[cls] || null;
  var text = g ? g.text : "";
  var preset = g && g.preset ? g.preset : {};

  if(cls==="Opioid"){
    if(duration === "<3"){
      preset = { p1Percent:25, p1Interval:7, p2Percent:10, p2Interval:7 };
      text += " Prefill: 25% every 1 week for 3 cycles, then 10% weekly.";
      if($("p1StopWeek")) $("p1StopWeek").value = 3;
    } else if(duration === ">3"){
      preset = { p1Percent:25, p1Interval:28, p2Percent:10, p2Interval:28 };
      text += " Prefill: 25% every 4 weeks for 3 cycles, then 10% every 4 weeks.";
      if($("p1StopWeek")) $("p1StopWeek").value = 3;
    } else {
      if($("p1StopWeek")) $("p1StopWeek").value = "";
    }
  }

  box.innerHTML = "<strong>Best-practice for " + (med || cls) + "</strong><br>" + (text || "");

  function setVal(id, v){ var el=$(id); if(el && (v!==null && v!==undefined)) el.value = v; }
  if(preset){
    setVal("p1Percent", preset.p1Percent);
    setVal("p1Interval", preset.p1Interval);
    setVal("p2Percent", preset.p2Percent);
    setVal("p2Interval", preset.p2Interval);
  }

  var wrap = $("applyTimeWrap"); if(wrap) wrap.style.display = (form==="Patch") ? "" : "none";
}

/* Special instructions */
function specialInstructionFor(med, form){
  if(form === "Patch") return "Patches: apply to intact skin as directed. Do not cut patches.";
  if(med==="Zolpidem" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  if(med==="Quetiapine" && /Slow Release/i.test(form)) return "Swallow whole, do not halve or crush";
  if(HALVABLE.has(med)) return "May be halved. If quartering is required, check brand-specific guidance.";
  return "Swallow whole, do not halve or crush";
}

/* ===== Build plan ===== */
function buildPlan(){
  var cls = ($("classSelect")||{}).value || "";
  var med = ($("medicineSelect")||{}).value || "";
  var form= ($("formSelect")||{}).value || "";
  var strengthStr = ($("strengthSelect")||{}).value || "";
  var baseDose = toNum(strengthStr);
  var freqMode = ($("frequencySelect")||{}).value || "AM";

  if(!baseDose){ alert("Please select a strength."); return; }

  var startDate = $("startDate") && $("startDate").value ? new Date($("startDate").value) : new Date();
  var reviewDate = $("reviewDate") && $("reviewDate").value ? new Date($("reviewDate").value) : null;
  var stopAtReview = $("taperUntilReview") && $("taperUntilReview").checked;

  var p1Percent = parseFloat(($("p1Percent")&&$("p1Percent").value)||"0");
  var p1Interval = parseInt(($("p1Interval")&&$("p1Interval").value)||"0",10);
  var p1StopDose = parseFloat(($("p1StopDose")&&$("p1StopDose").value)||"0");
  var p1StopWeek = parseInt(($("p1StopWeek")&&$("p1StopWeek").value)||"0",10);
  var p2Percent = parseFloat(($("p2Percent")&&$("p2Percent").value)||"0");
  var p2Interval = parseInt(($("p2Interval")&&$("p2Interval").value)||"0",10);

  if(!p1Percent || !p1Interval){ alert("Please set Phase 1 % and interval."); return; }
  if(p2Percent && !p2Interval){ alert("Please set Phase 2 interval."); return; }

  // Header badges
  if($("hdrPatient")) $("hdrPatient").textContent   = "Patient: " + (($("patientName")&&$("patientName").value)||"–");
  if($("hdrAllergies")) $("hdrAllergies").textContent = "Allergies: " + (($("allergies")&&$("allergies").value)||"–");
  if($("hdrHcp")) $("hdrHcp").textContent       = "HCP: " + (($("hcpName")&&$("hcpName").value)||"–");
  if($("hdrMedicine")) $("hdrMedicine").textContent  = "Medicine: " + med + " " + form;
  if($("hdrSpecial")) $("hdrSpecial").textContent   = "Special instructions: " + specialInstructionFor(med, form);

  // Build week rows (target per-dose amount)
  var rowsByWeek = [];
  var target = baseDose, week = 1;
  var date = startOfWeek(startDate);

  function pushWeekRow(tDose){ rowsByWeek.push({ date: fmtDate(date), targetDose: tDose }); }

  while(target > 0){
    pushWeekRow(target);
    if((p1StopDose && target <= p1StopDose) || (p1StopWeek && week >= p1StopWeek)) break;
    date = addDays(date, p1Interval); week += 1;
    target = +(target * (1 - p1Percent/100)).toFixed(3);
    if(stopAtReview && reviewDate && date >= reviewDate) break;
    if(target <= 0.0001) break;
  }

  if(target > 0 && p2Percent){
    while(target > 0.0001){
      date = addDays(date, p2Interval); week += 1;
      target = +(target * (1 - p2Percent/100)).toFixed(3);
      rowsByWeek.push({ date: fmtDate(date), targetDose: target });
      if(stopAtReview && reviewDate && date >= reviewDate) break;
      if(target <= 0.0001) break;
    }
  }

  // End row logic
  var endEligible = (cls==="Benzodiazepines / Z-drugs" || cls==="Proton Pump Inhibitor" || cls==="Antipsychotic");
  date = addDays(date, (p2Percent? p2Interval : p1Interval));
  var endRow = { date: fmtDate(date), targetDose: 0, endNote: null };
  if(endEligible){
    endRow.endNote = (cls==="Proton Pump Inhibitor")
      ? "Use on demand for symptoms; consider alternate days / lowest effective dose."
      : "Take as required (PRN); consider alternate days before stopping.";
  }
  rowsByWeek.push(endRow);

  // Standard vs patch charts
  var isFentanylPatch = (form==="Patch" && med==="Fentanyl");
  var isBupePatch = (form==="Patch" && med==="Buprenorphine");
  if(isFentanylPatch || isBupePatch){
    var intervalDays = isFentanylPatch ? 3 : 7;
    var timeStr = ($("applyTime") && $("applyTime").value) || "09:00";
    renderPatchTable(rowsByWeek, intervalDays, startDate, timeStr, { med:med, form:form });
  } else {
    renderStandardTable(rowsByWeek, freqMode, { med:med, form:form, strengthStr:strengthStr });
  }
}

/* ===== Decomposition for standard doses ===== */
function decomposeDose(cls, med, form, targetDose){
  var list = (((CATALOG[cls]||{})[med]||{})[form]||[]);
  var strengths = [];
  for(var i=0;i<list.length;i++){ strengths.push({label:list[i], val:toNum(list[i])}); }
  strengths.sort(function(a,b){ return b.val - a.val; });

  var components = [];
  var remaining = targetDose;

  var canSplitTablet = (form!=="Patch") && HALVABLE.has(med) &&
    !(med==="Zolpidem" && /Slow Release/i.test(form)) &&
    !(med==="Quetiapine" && /Slow Release/i.test(form));

  for(var j=0;j<strengths.length;j++){
    if(remaining <= 0.0001) break;
    var s = strengths[j];
    var count = Math.floor(remaining / s.val);
    remaining = +(remaining - count*s.val).toFixed(3);
    if(canSplitTablet && remaining >= s.val*0.5 - 1e-6){
      count += 0.5;
      remaining = +(remaining - s.val*0.5).toFixed(3);
    }
    if(count>0){ components.push({ strengthLabel:s.label, countPerDose:count }); }
  }
  if(remaining > 0.0001 && strengths.length){
    var smallest = strengths[strengths.length-1];
    components.push({ strengthLabel: smallest.label, countPerDose: (canSplitTablet ? 0.5 : 1) });
  }
  return components;
}

/* ===== Standard table ===== */
function renderStandardTable(weeks, freqMode, meta){
  var patchBlock = $("patchBlock"); if(patchBlock) patchBlock.style.display = "none";
  var wrap = $("scheduleBlock"); if(!wrap){ return; }
  wrap.style.display = ""; wrap.innerHTML = "";

  var table = document.createElement("table"); table.className="table";
  var thead = document.createElement("thead");
  var hr = document.createElement("tr");
  ["Week Beginning","Instructions","Strength","Morning","Midday","Dinner","Night","Special Instruction","Your tablet may look like"].forEach(function(h){
    var th=document.createElement("th"); th.textContent=h; hr.appendChild(th);
  });
  thead.appendChild(hr); table.appendChild(thead);

  var tbody = document.createElement("tbody");
  for(var i=0;i<weeks.length;i++){
    var week = weeks[i];
    if(week.targetDose<=0){
      var tr0=document.createElement("tr");
      tr0.appendChild(td(week.date));
      tr0.appendChild(td(week.endNote || "Stop. Drug-free days; use non-drug strategies and monitoring as agreed."));
      tr0.appendChild(td("–"));
      for(var k=0;k<4;k++) tr0.appendChild(td("—","center"));
      tr0.appendChild(td("—"));
      tr0.appendChild(imageCell(null));
      tbody.appendChild(tr0);
      continue;
    }
    var comps = decomposeDose(($("classSelect")||{}).value, meta.med, meta.form, week.targetDose);
    if(comps.length===0){
      tbody.appendChild(makeStdRow(week.date, meta, {strengthLabel:"—",countPerDose:1}, freqMode));
    } else {
      for(var c=0;c<comps.length;c++){
        tbody.appendChild(makeStdRow(c===0?week.date:"", meta, comps[c], freqMode));
      }
    }
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
}
function makeStdRow(dateTxt, meta, cmp, freqMode){
  var tr=document.createElement("tr");
  tr.appendChild(td(dateTxt || " "));
  var countStr = formatCount(cmp.countPerDose, meta.form);
  var instr = buildPlainDose(countStr, cmp.strengthLabel, freqMode, meta.form);
  tr.appendChild(td(instr));
  tr.appendChild(td(cmp.strengthLabel));
  var marks = marksFor(freqMode);
  for(var i=0;i<4;i++){ tr.appendChild(td(marks[i]?"X":"","center")); }
  tr.appendChild(td(specialInstructionFor(meta.med, meta.form)));
  tr.appendChild(imageCell({ med: meta.med, strength: cmp.strengthLabel }));
  return tr;
}

/* ===== Patch table (fentanyl q3d; bupe q7d) ===== */
function renderPatchTable(weeks, intervalDays, startDate, timeStr, meta){
  var wrapStd = $("scheduleBlock"); if(wrapStd) wrapStd.style.display = "none";
  var wrap = $("patchBlock"); if(!wrap){ return; }
  wrap.style.display = ""; wrap.innerHTML = "";

  var parts = String(timeStr||"09:00").split(":"); var hh=parseInt(parts[0]||"9",10), mm=parseInt(parts[1]||"0",10);
  var startDT = new Date(startDate); startDT.setHours(hh, mm, 0, 0);

  var lastWeek = weeks[weeks.length-1];
  var endDT = addDays(new Date(lastWeek.date), intervalDays);

  var events = [];
  for(var t=new Date(startDT); t<=endDT; t=addDays(t, intervalDays)){
    var wk = findActiveWeek(weeks, t);
    var comps = (wk && wk.targetDose>0) ? decomposeDose(($("classSelect")||{}).value, meta.med, meta.form, wk.targetDose) : [];
    events.push({ apply:new Date(t), remove:addDays(new Date(t), intervalDays), comps:comps });
  }

  var table = document.createElement("table"); table.className="table";
  var thead = document.createElement("thead");
  var hr = document.createElement("tr");
  ["Apply on","Remove on","Patch strength(s)","Notes","Image"].forEach(function(h){ var th=document.createElement("th"); th.textContent=h; hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);

  var tbody = document.createElement("tbody");
  for(var i=0;i<events.length;i++){
    var ev = events[i];
    var tr=document.createElement("tr");
    tr.appendChild(td(fmtDateTime(ev.apply)));
    tr.appendChild(td(fmtDateTime(ev.remove)));
    var strengthText = ev.comps.length ? ev.comps.map(function(c){ return (formatCount(c.countPerDose,"Patch")+" of "+c.strengthLabel); }).join(" + ") : "—";
    tr.appendChild(td(strengthText));
    tr.appendChild(td("Replace every " + intervalDays + " days. Rotate sites."));
    var first = ev.comps[0] || null;
    tr.appendChild(imageCell(first ? { med: meta.med, strength: first.strengthLabel } : null));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
}
function findActiveWeek(weeks, dateTime){
  var d = new Date(dateTime);
  for(var i=weeks.length-1;i>=0;i--){
    var wkDate = new Date(weeks[i].date);
    if(wkDate <= d) return weeks[i];
  }
  return weeks[0];
}

/* ===== Shared helpers ===== */
function marksFor(mode){ var map={ AM:[1,0,0,0], PM:[0,0,0,1], BID:[1,0,0,1], TID:[1,1,0,1], QID:[1,1,1,1] }; return map[mode]||[1,0,0,1]; }
function td(text, cls){ var el=document.createElement("td"); if(cls) el.className=cls; el.textContent=String(text||""); return el; }
function imageCell(info){
  var tdEl=document.createElement("td"); tdEl.className="image-cell";
  if(!info){ tdEl.textContent=""; return tdEl; }
  var cont=document.createElement("div"); var img=new Image();
  var slugMed=String(info.med||"").toLowerCase().replace(/[\s\/\\\+]+/g,"_").replace(/[^\w_]/g,"");
  var slugStrength=String(info.strength||"").toLowerCase().replace(/[\s\/\\\+]+/g,"").replace(/[^\w]/g,"");
  img.onload=function(){ cont.appendChild(img); }; img.onerror=function(){};
  img.src="images/"+slugMed+"_"+slugStrength+".jpg";
  tdEl.appendChild(cont); return tdEl;
}
function formatCount(count, form){
  if(form==="Patch"){ if(count===1) return "1 patch"; if(count===0.5) return "½ patch"; if(Math.floor(count)===count) return count+" patches"; return count+" patch(es)"; }
  if(Math.floor(count)===count) return (count===1) ? "1 tablet" : (count+" tablets");
  if((count%1)===0.5) return "½ tablet";
  return count+" tablet(s)";
}
function buildPlainDose(countStr, strengthLabel, mode, form){
  if(form==="Patch") return "Apply " + countStr + " of " + strengthLabel + " as directed. Do not cut patches.";
  var map = { AM:["in the morning"], PM:["at night"], BID:["in the morning","at night"], TID:["in the morning","at midday","at night"], QID:["in the morning","at midday","at dinner","at night"] };
  var when = map[mode] || ["in the morning","at night"];
  var out = []; for(var i=0;i<when.length;i++){ out.push("Take " + countStr + " of " + strengthLabel + " " + when[i]); }
  return out.join(". ");
}

/* ===== Init ===== */
function init(){
  if(!$("classSelect")) return; // page not ready
  populateClasses(); populateMedicines(); populateForms(); populateStrengths();
  updateDurationVisibility(); updateBestPracticeAndPrefill();

  $("classSelect").addEventListener("change", function(){ populateMedicines(); populateForms(); populateStrengths(); updateDurationVisibility(); updateBestPracticeAndPrefill(); });
  $("medicineSelect").addEventListener("change", function(){ populateForms(); populateStrengths(); updateBestPracticeAndPrefill(); });
  $("formSelect").addEventListener("change", function(){ populateStrengths(); updateBestPracticeAndPrefill(); });
  if($("durationSelect")) $("durationSelect").addEventListener("change", updateBestPracticeAndPrefill);

  if($("generateBtn")) $("generateBtn").addEventListener("click", buildPlan);
  if($("resetBtn")) $("resetBtn").addEventListener("click", function(){ location.reload(); });
  if($("printBtn")) $("printBtn").addEventListener("click", function(){ window.print(); });
  if($("savePdfBtn")) $("savePdfBtn").addEventListener("click", function(){
    var element = $("outputCard");
    if(typeof html2pdf==="function" && element){
      html2pdf().set({ filename:'taper_plan.pdf', margin:10, image:{ type:'jpeg', quality:0.95 }, html2canvas:{ scale:2, useCORS:true }, jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' } }).from(element).save();
    } else { alert("PDF library not loaded."); }
  });
}
document.addEventListener("DOMContentLoaded", init);
