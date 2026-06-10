const STORE_KEY = "financialRecoveryDashboardV2";

const defaultState = {
  scenario: "jeff",
  scenarios: [
    { id: "jeff", name: "Jeff Co @ $20.82", biweekly: 1250 },
    { id: "t25", name: "Thrivent @ $25", biweekly: 1470 },
    { id: "t26", name: "Thrivent @ $26", biweekly: 1525 },
    { id: "t27", name: "Thrivent @ $27", biweekly: 1575 }
  ],
  expenses: [
    { name: "Mom Debt", amount: 650, timing: "split", category: "mom" },
    { name: "Personal Debt", amount: 250, timing: "split", category: "personal" },
    { name: "Savings", amount: 250, timing: "split", category: "savings" },
    { name: "Car Insurance Hold", amount: 400, timing: "split", category: "bill" },
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
    tradingOn: "no", profitDay: 300, tradeDays: 4, tradesWeek: 4, winRate: 75, payoutSplit: 80, haircut: 20,
    partTimeOn: "no", ptRate: 20, ptHours: 12, ptFlat: 1000,
    momDebtStart: 25000, personalDebtStart: 5000, savingsStart: 0, closingCushion: 440,
    momGoal: 12000, personalGoal: 3000, savingsGoal: 5000, moveGoal: 10000
  }
};

let state = loadState();

const $ = id => document.getElementById(id);
const money = n => "$" + Math.round(Number(n || 0)).toLocaleString();
const num = v => Number(v || 0);

function loadState() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(defaultState);
  } catch {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function renderScenarioStrip() {
  const strip = $("scenarioStrip");
  strip.innerHTML = "";
  state.scenarios.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "scenario-btn" + (s.id === state.scenario ? " active" : "");
    btn.textContent = s.name;
    btn.onclick = () => {
      state.scenario = s.id;
      $("biweeklyNet").value = s.biweekly;
      saveState();
      renderAll();
    };
    strip.appendChild(btn);
  });
}

function renderExpenses() {
  const list = $("expenseList");
  list.innerHTML = "";
  state.expenses.forEach((ex, i) => {
    const item = document.createElement("div");
    item.className = "expense-item";
    item.innerHTML = `
      <input value="${ex.name}" aria-label="Expense name">
      <input type="number" value="${ex.amount}" aria-label="Expense amount">
      <button class="remove" aria-label="Remove expense">×</button>
      <select aria-label="Timing">
        <option value="split" ${ex.timing==="split"?"selected":""}>Split</option>
        <option value="check1" ${ex.timing==="check1"?"selected":""}>Check 1</option>
        <option value="check2" ${ex.timing==="check2"?"selected":""}>Check 2</option>
      </select>
      <select aria-label="Category">
        <option value="bill" ${ex.category==="bill"?"selected":""}>Bill</option>
        <option value="mom" ${ex.category==="mom"?"selected":""}>Mom Debt</option>
        <option value="personal" ${ex.category==="personal"?"selected":""}>Personal Debt</option>
        <option value="savings" ${ex.category==="savings"?"selected":""}>Savings</option>
      </select>
    `;

    const inputs = item.querySelectorAll("input");
    const selects = item.querySelectorAll("select");

    inputs[0].oninput = e => { state.expenses[i].name = e.target.value; saveState(); calculate(); };
    inputs[1].oninput = e => { state.expenses[i].amount = num(e.target.value); saveState(); calculate(); };
    item.querySelector(".remove").onclick = () => { state.expenses.splice(i, 1); saveState(); renderExpenses(); calculate(); };
    selects[0].onchange = e => { state.expenses[i].timing = e.target.value; saveState(); calculate(); };
    selects[1].onchange = e => { state.expenses[i].category = e.target.value; saveState(); calculate(); };

    list.appendChild(item);
  });
}

function setInputsFromState() {
  Object.keys(state.inputs).forEach(k => {
    if ($(k)) $(k).value = state.inputs[k];
  });
  const s = state.scenarios.find(x => x.id === state.scenario);
  $("biweeklyNet").value = s.biweekly;
}

function syncInputsToState() {
  Object.keys(state.inputs).forEach(k => {
    if ($(k)) state.inputs[k] = $(k).type === "number" ? num($(k).value) : $(k).value;
  });
  const s = state.scenarios.find(x => x.id === state.scenario);
  s.biweekly = num($("biweeklyNet").value);
  saveState();
}

function tableRow(a,b) {
  return `<div class="table-row"><div>${a}</div><div>${b}</div></div>`;
}

function bar(label, value, goal) {
  const pct = goal > 0 ? Math.min(100, Math.max(0, value / goal * 100)) : 0;
  return `<div class="progress-block"><div class="progress-label"><span>${label}</span><span>${Math.round(pct)}%</span></div><div class="progress"><div class="fill" style="width:${pct}%"></div></div></div>`;
}

function calculate() {
  syncInputsToState();

  const s = state.scenarios.find(x => x.id === state.scenario);
  $("activeScenarioLabel").textContent = s.name;

  const biweekly = num(s.biweekly);
  const jobMonthly = biweekly * 26 / 12;
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

  const momBase = state.expenses.filter(e => e.category === "mom").reduce((sum,e)=>sum+num(e.amount),0);
  const personalBase = state.expenses.filter(e => e.category === "personal").reduce((sum,e)=>sum+num(e.amount),0);
  const savingsBase = state.expenses.filter(e => e.category === "savings").reduce((sum,e)=>sum+num(e.amount),0);

  const extra = Math.max(0, surplus);
  const extraMom = extra * 0.50;
  const extraPersonal = extra * 0.25;
  const extraSavings = extra * 0.25;

  const momMonthly = momBase + extraMom;
  const personalMonthly = personalBase + extraPersonal;
  const savingsMonthly = savingsBase + extraSavings;

  const momPaid6 = momMonthly * 6;
  const personalPaid6 = personalMonthly * 6;
  const savings6 = state.inputs.savingsStart + state.inputs.closingCushion + savingsMonthly * 6;

  const momLeft6 = Math.max(0, state.inputs.momDebtStart - momPaid6);
  const personalLeft6 = Math.max(0, state.inputs.personalDebtStart - personalPaid6);

  $("monthlyIncome").textContent = money(totalIncome);
  $("monthlyExpenses").textContent = money(baseExpenses);
  $("monthlySurplus").textContent = money(surplus);
  $("weeklySurplus").textContent = money(surplus / 4.333);
  $("expenseTotalLabel").textContent = money(baseExpenses);

  const status = $("statusCard");
  status.className = "status " + (surplus >= 250 ? "good" : surplus >= 0 ? "tight" : "bad");
  status.textContent = surplus >= 250
    ? "Covered with breathing room. Extra income is projected into debt payoff and savings."
    : surplus >= 0
    ? "Covered, but tight. Keep a cash cushion before increasing payments."
    : "Negative. Reduce expenses or turn on a job/trading/part-time add-on.";

  $("momDebt6").textContent = money(momLeft6);
  $("personalDebt6").textContent = money(personalLeft6);
  $("savings6").textContent = money(savings6);
  $("moveCushion6").textContent = money(savings6);

  $("goalBars").innerHTML =
    bar("Mom debt paid", momPaid6, state.inputs.momGoal) +
    bar("Personal debt paid", personalPaid6, state.inputs.personalGoal) +
    bar("Savings built", savings6, state.inputs.savingsGoal) +
    bar("Move cushion", savings6, state.inputs.moveGoal);

  const check1 = [], check2 = [];
  state.expenses.forEach(ex => {
    const amount = num(ex.amount);
    if (ex.timing === "check1") check1.push([ex.name, amount]);
    else if (ex.timing === "check2") check2.push([ex.name, amount]);
    else {
      check1.push([ex.name, amount / 2]);
      check2.push([ex.name, amount / 2]);
    }
  });

  const c1Total = check1.reduce((sum,r)=>sum+r[1],0);
  const c2Total = check2.reduce((sum,r)=>sum+r[1],0);

  $("biweeklyAmount").textContent = money(biweekly) + "/check";
  $("checkOneTable").innerHTML =
    tableRow("Check 1 total", money(c1Total)) +
    check1.map(r => tableRow(r[0], money(r[1]))).join("") +
    tableRow("Remaining", money(biweekly - c1Total));

  $("checkTwoTable").innerHTML =
    tableRow("Check 2 total", money(c2Total)) +
    check2.map(r => tableRow(r[0], money(r[1]))).join("") +
    tableRow("Remaining", money(biweekly - c2Total));

  const parts = [
    Math.min(100, momPaid6 / Math.max(1, state.inputs.momGoal) * 100),
    Math.min(100, personalPaid6 / Math.max(1, state.inputs.personalGoal) * 100),
    Math.min(100, savings6 / Math.max(1, state.inputs.savingsGoal) * 100),
    Math.min(100, savings6 / Math.max(1, state.inputs.moveGoal) * 100)
  ];
  const readiness = Math.round(parts.reduce((a,b)=>a+b,0)/parts.length);
  $("readiness").textContent = readiness + "%";
  $("readinessSmall").textContent = readiness + "%";
  $("readinessText").textContent = readiness >= 75
    ? "Strong trajectory. This plan is moving toward apartment-ready territory."
    : readiness >= 45
    ? "Real momentum. Keep the system boring, consistent, and funded."
    : "Foundation mode. Job income covers the floor; add-ons accelerate the climb.";

  $("predictionTable").innerHTML =
    tableRow("Mom paid in 6 months", money(momPaid6)) +
    tableRow("Personal debt paid in 6 months", money(personalPaid6)) +
    tableRow("Savings in 6 months", money(savings6)) +
    tableRow("Trading add-on / month", money(tradingMonthly)) +
    tableRow("Part-time add-on / month", money(ptMonthly)) +
    tableRow("Extra to Mom / month", money(extraMom)) +
    tableRow("Extra to Personal / month", money(extraPersonal)) +
    tableRow("Extra to Savings / month", money(extraSavings));
}

function renderAll() {
  renderScenarioStrip();
  renderExpenses();
  setInputsFromState();
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

  document.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("input", calculate);
    el.addEventListener("change", calculate);
  });

  $("addExpenseBtn").addEventListener("click", () => {
    state.expenses.push({ name: "New Expense", amount: 0, timing: "split", category: "bill" });
    saveState();
    renderExpenses();
    calculate();
  });

  $("resetBtn").addEventListener("click", () => {
    if (confirm("Reset the dashboard to the default plan?")) {
      localStorage.removeItem(STORE_KEY);
      state = loadState();
      renderAll();
    }
  });
});