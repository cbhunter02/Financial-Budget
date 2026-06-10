const STORE_KEY = "financialRecoveryDashboardV4";

const defaultState = {
  scenario: "jeff",
  scenarios: [
    { id: "jeff", name: "Jeff Co", hourly: 20.82, hours: 40, deductionRate: 25, manualNetOn: "no", manualBiweeklyNet: 1250 },
    { id: "thrivent", name: "Thrivent", hourly: 27, hours: 40, deductionRate: 27, manualNetOn: "no", manualBiweeklyNet: 1575 },
    { id: "misc", name: "Misc Job", hourly: 25, hours: 40, deductionRate: 25, manualNetOn: "no", manualBiweeklyNet: 1450 }
  ],
  expenses: [
    { name: "Mom Debt", amount: 650, timing: "split", category: "mom" },
    { name: "Personal Debt", amount: 250, timing: "split", category: "personal" },
    { name: "Emergency Savings", amount: 250, timing: "split", category: "emergency" },
    { name: "Travel Fund", amount: 0, timing: "split", category: "travel" },
    { name: "Car Fund", amount: 0, timing: "split", category: "carfund" },
    { name: "Move Fund", amount: 0, timing: "split", category: "move" },
    { name: "Car Insurance Hold", amount: 400, timing: "split", category: "carfund" },
    { name: "Storage", amount: 125, timing: "check1", category: "bill" },
    { name: "Gym", amount: 25, timing: "check1", category: "bill" },
    { name: "Nails", amount: 130, timing: "check1", category: "bill" },
    { name: "TradingView", amount: 45, timing: "check1", category: "bill" },
    { name: "Wax", amount: 165, timing: "check2", category: "bill" },
    { name: "Dog Grooming", amount: 88, timing: "check2", category: "bill" },
    { name: "Apple", amount: 75, timing: "check2", category: "bill" },
    { name: "Gas/Food/Misc", amount: 200, timing: "split", category: "bill" }
  ],
  inputs: {
    tradingOn: "no", profitDay: 300, tradeDays: 4, winRate: 75, payoutSplit: 80, haircut: 20,
    payoutAmount: 0, splitMom: 50, splitPersonal: 25, splitEmergency: 15, splitTravel: 5, splitCar: 5,
    partTimeOn: "no", ptRate: 20, ptHours: 12, ptFlat: 1000,
    momDebtStart: 25000, personalDebtStart: 5000, emergencyStart: 0, travelStart: 0, carStart: 0, moveStart: 0, closingCushion: 440,
    momGoal: 12000, personalGoal: 3000, emergencyGoal: 5000, moveGoal: 10000
  }
};

let state = loadState();

const $ = id => document.getElementById(id);
const num = v => Number(v || 0);
const money = n => "$" + Math.round(Number(n || 0)).toLocaleString();
const clone = obj => JSON.parse(JSON.stringify(obj));

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || clone(defaultState); }
  catch { return clone(defaultState); }
}
function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function currentJob() { return state.scenarios.find(s => s.id === state.scenario); }
function estimatedBiweekly(job) {
  const grossBiweekly = job.hourly * job.hours * 2;
  const estimated = grossBiweekly * (1 - job.deductionRate / 100);
  return job.manualNetOn === "yes" ? num(job.manualBiweeklyNet) : estimated;
}
function estimatedGrossMonthly(job) { return job.hourly * job.hours * 52 / 12; }

function renderScenarioStrip() {
  const strip = $("scenarioStrip");
  strip.innerHTML = "";
  state.scenarios.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "scenario-btn" + (s.id === state.scenario ? " active" : "");
    btn.textContent = s.name;
    btn.onclick = () => { state.scenario = s.id; saveState(); renderAll(); };
    strip.appendChild(btn);
  });
}

function setJobFields() {
  const job = currentJob();
  $("jobName").value = job.name;
  $("hourlyPay").value = job.hourly;
  $("hoursWeek").value = job.hours;
  $("deductionRate").value = job.deductionRate;
  $("manualNetOn").value = job.manualNetOn;
  $("manualBiweeklyNet").value = Math.round(job.manualBiweeklyNet);
  $("homeHourly").value = job.hourly;
  $("homeHours").value = job.hours;
  $("homeDeduction").value = job.deductionRate;
  $("homeBiweeklyNet").value = Math.round(estimatedBiweekly(job));
}

function syncJobFields(source="pay") {
  const job = currentJob();
  if (source === "home") {
    job.hourly = num($("homeHourly").value);
    job.hours = num($("homeHours").value);
    job.deductionRate = num($("homeDeduction").value);
    job.manualBiweeklyNet = num($("homeBiweeklyNet").value);
    job.manualNetOn = "yes";
  } else {
    job.name = $("jobName").value || job.name;
    job.hourly = num($("hourlyPay").value);
    job.hours = num($("hoursWeek").value);
    job.deductionRate = num($("deductionRate").value);
    job.manualNetOn = $("manualNetOn").value;
    job.manualBiweeklyNet = num($("manualBiweeklyNet").value);
  }
  saveState();
}

function setOtherInputs() {
  Object.keys(state.inputs).forEach(k => { if ($(k)) $(k).value = state.inputs[k]; });
}
function syncOtherInputs() {
  Object.keys(state.inputs).forEach(k => {
    if ($(k)) state.inputs[k] = $(k).type === "number" ? num($(k).value) : $(k).value;
  });
  saveState();
}

function renderExpenses() {
  const list = $("expenseList");
  list.innerHTML = "";
  state.expenses.forEach((ex, i) => {
    const item = document.createElement("div");
    item.className = "expense-item";
    item.innerHTML = `
      <input value="${ex.name}" aria-label="Expense name">
      <div class="money-input"><span>$</span><input type="number" value="${ex.amount}" aria-label="Amount"></div>
      <button class="remove">×</button>
      <select>
        <option value="split" ${ex.timing==="split"?"selected":""}>Split</option>
        <option value="check1" ${ex.timing==="check1"?"selected":""}>Check 1</option>
        <option value="check2" ${ex.timing==="check2"?"selected":""}>Check 2</option>
      </select>
      <select>
        <option value="bill" ${ex.category==="bill"?"selected":""}>Bill</option>
        <option value="mom" ${ex.category==="mom"?"selected":""}>Mom Debt</option>
        <option value="personal" ${ex.category==="personal"?"selected":""}>Personal Debt</option>
        <option value="emergency" ${ex.category==="emergency"?"selected":""}>Emergency</option>
        <option value="travel" ${ex.category==="travel"?"selected":""}>Travel</option>
        <option value="carfund" ${ex.category==="carfund"?"selected":""}>Car Fund</option>
        <option value="move" ${ex.category==="move"?"selected":""}>Move Fund</option>
      </select>
    `;
    const inputs = item.querySelectorAll("input");
    const selects = item.querySelectorAll("select");
    inputs[0].oninput = e => { state.expenses[i].name = e.target.value; saveState(); calculate(); };
    inputs[1].oninput = e => { state.expenses[i].amount = num(e.target.value); saveState(); calculate(); };
    selects[0].onchange = e => { state.expenses[i].timing = e.target.value; saveState(); calculate(); };
    selects[1].onchange = e => { state.expenses[i].category = e.target.value; saveState(); calculate(); };
    item.querySelector(".remove").onclick = () => { state.expenses.splice(i, 1); saveState(); renderExpenses(); calculate(); };
    list.appendChild(item);
  });
}

function tableRow(a,b) { return `<div class="table-row"><div>${a}</div><div>${b}</div></div>`; }
function monthsTo(balance, monthly) {
  if (balance <= 0) return "Paid";
  if (monthly <= 0) return "No payoff";
  return Math.ceil(balance / monthly) + " mo";
}
function bar(label, value, goal) {
  const pct = goal > 0 ? Math.min(100, Math.max(0, value / goal * 100)) : 0;
  return `<div class="progress-block"><div class="progress-label"><span>${label}</span><span>${Math.round(pct)}%</span></div><div class="progress"><div class="fill" style="width:${pct}%"></div></div></div>`;
}
function categoryMonthly(cat) {
  return state.expenses.filter(e => e.category === cat).reduce((sum,e)=>sum+num(e.amount),0);
}

function calculate() {
  syncOtherInputs();
  const job = currentJob();
  const grossMonthly = estimatedGrossMonthly(job);
  const biweeklyNet = estimatedBiweekly(job);
  const jobMonthly = biweeklyNet * 26 / 12;
  const baseExpenses = state.expenses.reduce((sum, ex) => sum + num(ex.amount), 0);

  let tradingMonthly = 0;
  if (state.inputs.tradingOn === "yes") {
    const gross = state.inputs.profitDay * state.inputs.tradeDays * 4.333;
    const afterPayout = gross * (state.inputs.payoutSplit / 100);
    const afterWinRate = afterPayout * (state.inputs.winRate / 100);
    tradingMonthly = afterWinRate * (1 - state.inputs.haircut / 100);
  }

  let ptMonthly = 0;
  if (state.inputs.partTimeOn === "yes") {
    ptMonthly = state.inputs.ptFlat > 0 ? state.inputs.ptFlat : state.inputs.ptRate * state.inputs.ptHours * 4.333;
  }

  const totalIncome = jobMonthly + tradingMonthly + ptMonthly;
  const surplus = totalIncome - baseExpenses;
  const extra = Math.max(0, surplus);

  const momMonthly = categoryMonthly("mom") + extra * 0.50;
  const personalMonthly = categoryMonthly("personal") + extra * 0.25;
  const emergencyMonthly = categoryMonthly("emergency") + extra * 0.15;
  const travelMonthly = categoryMonthly("travel") + extra * 0.05;
  const carMonthly = categoryMonthly("carfund") + extra * 0.05;
  const moveMonthly = categoryMonthly("move");

  const momPaid6 = momMonthly * 6;
  const personalPaid6 = personalMonthly * 6;
  const emergency6 = state.inputs.emergencyStart + state.inputs.closingCushion + emergencyMonthly * 6;
  const travel6 = state.inputs.travelStart + travelMonthly * 6;
  const car6 = state.inputs.carStart + carMonthly * 6;
  const move6 = state.inputs.moveStart + moveMonthly * 6 + emergency6;

  const momLeft6 = Math.max(0, state.inputs.momDebtStart - momPaid6);
  const personalLeft6 = Math.max(0, state.inputs.personalDebtStart - personalPaid6);

  $("activeScenarioLabel").textContent = job.name;
  $("monthlyIncome").textContent = money(totalIncome);
  $("monthlyExpenses").textContent = money(baseExpenses);
  $("monthlySurplus").textContent = money(surplus);
  $("expenseTotalLabel").textContent = money(baseExpenses);
  $("biweeklyAmount").textContent = money(biweeklyNet) + "/check";

  const safety = surplus >= 250 ? "Safe" : surplus >= 0 ? "Tight" : "Negative";
  $("safetyStatus").textContent = safety;
  const status = $("statusCard");
  status.className = "status " + (surplus >= 250 ? "good" : surplus >= 0 ? "tight" : "bad");
  status.textContent = surplus >= 250
    ? "Safe. Buffer is available for Navy Federal transfer and future extra debt/savings allocation."
    : surplus >= 0
    ? "Tight. Covered, but keep the buffer untouched."
    : "Negative. Adjust bills or add income before increasing payments.";

  $("momDebt6").textContent = money(momLeft6);
  $("personalDebt6").textContent = money(personalLeft6);
  $("emergency6").textContent = money(emergency6);
  $("moveCushion6").textContent = money(move6);
  $("travel6").textContent = money(travel6);
  $("car6").textContent = money(car6);

  $("goalBars").innerHTML =
    bar("Mom debt paid", momPaid6, state.inputs.momGoal) +
    bar("Personal debt paid", personalPaid6, state.inputs.personalGoal) +
    bar("Emergency savings", emergency6, state.inputs.emergencyGoal) +
    bar("Move cushion", move6, state.inputs.moveGoal);

  $("timelineTable").innerHTML =
    tableRow("Mom payoff timeline", monthsTo(state.inputs.momDebtStart, momMonthly)) +
    tableRow("Personal debt payoff timeline", monthsTo(state.inputs.personalDebtStart, personalMonthly)) +
    tableRow("Emergency goal timeline", monthsTo(Math.max(0, state.inputs.emergencyGoal - state.inputs.emergencyStart), emergencyMonthly)) +
    tableRow("Move cushion timeline", monthsTo(Math.max(0, state.inputs.moveGoal - state.inputs.moveStart), moveMonthly + emergencyMonthly));

  const check1 = [], check2 = [];
  state.expenses.forEach(ex => {
    const amount = num(ex.amount);
    if (ex.timing === "check1") check1.push([ex.name, amount]);
    else if (ex.timing === "check2") check2.push([ex.name, amount]);
    else { check1.push([ex.name, amount/2]); check2.push([ex.name, amount/2]); }
  });
  const c1Total = check1.reduce((s,r)=>s+r[1],0);
  const c2Total = check2.reduce((s,r)=>s+r[1],0);
  const c1Remain = biweeklyNet - c1Total;
  const c2Remain = biweeklyNet - c2Total;

  $("checkOneTable").innerHTML = tableRow("Check 1 total", money(c1Total)) + check1.map(r=>tableRow(r[0], money(r[1]))).join("") + tableRow("Navy Federal Buffer", money(Math.max(0,c1Remain)));
  $("checkTwoTable").innerHTML = tableRow("Check 2 total", money(c2Total)) + check2.map(r=>tableRow(r[0], money(r[1]))).join("") + tableRow("Navy Federal Buffer", money(Math.max(0,c2Remain)));
  $("navyNote").textContent = "Navy Federal note: deposit biweekly leftover buffer here. Until car insurance begins, keep the $400/month car insurance hold in this account too.";

  const readinessParts = [
    Math.min(100, momPaid6 / Math.max(1,state.inputs.momGoal) * 100),
    Math.min(100, personalPaid6 / Math.max(1,state.inputs.personalGoal) * 100),
    Math.min(100, emergency6 / Math.max(1,state.inputs.emergencyGoal) * 100),
    Math.min(100, move6 / Math.max(1,state.inputs.moveGoal) * 100)
  ];
  const readiness = Math.round(readinessParts.reduce((a,b)=>a+b,0)/readinessParts.length);
  $("readiness").textContent = readiness + "%";
  $("readinessSmall").textContent = readiness + "%";
  $("readinessText").textContent = readiness >= 75 ? "Move-ready energy. Debt, savings, and cushion are lining up." : readiness >= 45 ? "Momentum is real. Stay boring and consistent." : "Foundation phase. Keep income stable and protect the buffer.";

  $("predictionTable").innerHTML =
    tableRow("Mom paid in 6 months", money(momPaid6)) +
    tableRow("Personal debt paid in 6 months", money(personalPaid6)) +
    tableRow("Emergency in 6 months", money(emergency6)) +
    tableRow("Travel fund in 6 months", money(travel6)) +
    tableRow("Car fund in 6 months", money(car6)) +
    tableRow("Move cushion in 6 months", money(move6)) +
    tableRow("Trading add-on / month", money(tradingMonthly)) +
    tableRow("Part-time add-on / month", money(ptMonthly));

  const payout = state.inputs.payoutAmount;
  $("payoutSplitTable").innerHTML =
    tableRow("Mom Debt", money(payout * state.inputs.splitMom / 100)) +
    tableRow("Personal Debt", money(payout * state.inputs.splitPersonal / 100)) +
    tableRow("Emergency", money(payout * state.inputs.splitEmergency / 100)) +
    tableRow("Travel", money(payout * state.inputs.splitTravel / 100)) +
    tableRow("Car Fund", money(payout * state.inputs.splitCar / 100));
}

function setJobFields() {
  const job = currentJob();
  $("jobName").value = job.name;
  $("hourlyPay").value = job.hourly;
  $("hoursWeek").value = job.hours;
  $("deductionRate").value = job.deductionRate;
  $("manualNetOn").value = job.manualNetOn;
  $("manualBiweeklyNet").value = Math.round(job.manualBiweeklyNet);
  $("homeHourly").value = job.hourly;
  $("homeHours").value = job.hours;
  $("homeDeduction").value = job.deductionRate;
  $("homeBiweeklyNet").value = Math.round(estimatedBiweekly(job));
}

function syncJobFields(source="pay") {
  const job = currentJob();
  if (source === "home") {
    job.hourly = num($("homeHourly").value);
    job.hours = num($("homeHours").value);
    job.deductionRate = num($("homeDeduction").value);
    job.manualBiweeklyNet = num($("homeBiweeklyNet").value);
    job.manualNetOn = "yes";
  } else {
    job.name = $("jobName").value || job.name;
    job.hourly = num($("hourlyPay").value);
    job.hours = num($("hoursWeek").value);
    job.deductionRate = num($("deductionRate").value);
    job.manualNetOn = $("manualNetOn").value;
    job.manualBiweeklyNet = num($("manualBiweeklyNet").value);
  }
  saveState();
}

function setOtherInputs() { Object.keys(state.inputs).forEach(k => { if ($(k)) $(k).value = state.inputs[k]; }); }
function syncOtherInputs() { Object.keys(state.inputs).forEach(k => { if ($(k)) state.inputs[k] = $(k).type === "number" ? num($(k).value) : $(k).value; }); saveState(); }

function renderAll() {
  renderScenarioStrip();
  renderExpenses();
  setJobFields();
  setOtherInputs();
  calculate();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  document.querySelectorAll(".nav").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
      document.getElementById("view-" + btn.dataset.view).classList.add("active");
    });
  });

  ["homeHourly","homeHours","homeDeduction","homeBiweeklyNet"].forEach(id => {
    $(id).addEventListener("input", () => { syncJobFields("home"); setJobFields(); calculate(); });
  });
  ["jobName","hourlyPay","hoursWeek","deductionRate","manualNetOn","manualBiweeklyNet"].forEach(id => {
    $(id).addEventListener("input", () => { syncJobFields("pay"); renderScenarioStrip(); setJobFields(); calculate(); });
    $(id).addEventListener("change", () => { syncJobFields("pay"); renderScenarioStrip(); setJobFields(); calculate(); });
  });
  document.querySelectorAll("main input, main select").forEach(el => {
    if (!["homeHourly","homeHours","homeDeduction","homeBiweeklyNet","jobName","hourlyPay","hoursWeek","deductionRate","manualNetOn","manualBiweeklyNet"].includes(el.id)) {
      el.addEventListener("input", calculate);
      el.addEventListener("change", calculate);
    }
  });

  $("addExpenseBtn").addEventListener("click", () => {
    state.expenses.push({ name: "New Expense", amount: 0, timing: "split", category: "bill" });
    saveState(); renderExpenses(); calculate();
  });
  document.querySelectorAll(".mini-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset;
      const map = {
        bill: { name: "New Bill", amount: 0, timing: "split", category: "bill" },
        debt: { name: "New Debt Payment", amount: 0, timing: "split", category: "personal" },
        savings: { name: "New Savings Fund", amount: 0, timing: "split", category: "emergency" },
        car: { name: "New Car Expense", amount: 0, timing: "split", category: "carfund" }
      };
      state.expenses.push(map[preset]); saveState(); renderExpenses(); calculate();
    });
  });
  $("resetBtn").addEventListener("click", () => {
    if (confirm("Reset the dashboard to the default plan?")) {
      localStorage.removeItem(STORE_KEY);
      state = loadState();
      renderAll();
    }
  });
});