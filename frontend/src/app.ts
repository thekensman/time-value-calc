/**
 * What Is My Time Worth? — Frontend Application
 *
 * Wires DOM inputs to the calculation engine with live recalculation.
 */

import {
  calculateRealWage,
  calculateDecision,
  compareJobs,
  STATE_TAX_RATES,
  DECISION_PRESETS,
  fmtCurrency,
  fmtPercent,
  fmtHoursMinutes,
  fmtNumber,
  type WageInputs,
  type DecisionInputs,
  type JobInputs,
} from "./engine";

// ─── Helpers ─────────────────────────────────────────────────

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el;
}

function numVal(id: string): number {
  return parseFloat(($(id) as HTMLInputElement).value) || 0;
}

function strVal(id: string): string {
  const el = $(id) as HTMLInputElement | HTMLSelectElement;
  return el.value;
}

function setText(id: string, text: string): void {
  $(id).textContent = text;
}

// Module-level shared state
let calculatedRealWage: number = 0;
let decisionWageManuallyEdited: boolean = false;

// ─── State Dropdowns ─────────────────────────────────────────

function populateStates(): void {
  const selects = document.querySelectorAll<HTMLSelectElement>(
    "#w-state, #ja-state, #jb-state"
  );
  selects.forEach((sel) => {
    STATE_TAX_RATES.forEach((state) => {
      const opt = document.createElement("option");
      opt.value = state.id;
      opt.textContent =
        state.rate > 0
          ? `${state.name} (${(state.rate * 100).toFixed(1)}%)`
          : state.name;
      if (state.id === "IL") opt.selected = true;
      sel.appendChild(opt);
    });
  });
  // Job B defaults: TX (no tax, for remote comparison)
  const jbState = document.getElementById("jb-state") as HTMLSelectElement;
  if (jbState) jbState.value = "TX";
}

// ─── Tab Switching ───────────────────────────────────────────

function initTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
  const panels = document.querySelectorAll<HTMLElement>(".panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      if (!target) return;

      tabs.forEach((t) => {
        t.classList.remove("tab--active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("tab--active");
      tab.setAttribute("aria-selected", "true");

      panels.forEach((p) => {
        p.hidden = true;
        p.classList.remove("panel--active");
      });
      const panel = $(`panel-${target}`);
      panel.hidden = false;
      panel.classList.add("panel--active");

      // Cross-tab state: push real wage to decision tab
      if (target === "decision" && calculatedRealWage > 0 && !decisionWageManuallyEdited) {
        ($(  "d-wage") as HTMLInputElement).value = calculatedRealWage.toFixed(2);
      }

      recalculate(target);
    });
  });
}

// ─── Preset Tiles ────────────────────────────────────────────

function renderPresets(): void {
  const grid = $("preset-grid");
  grid.innerHTML = DECISION_PRESETS.map(
    (p) => `
    <button class="preset-tile" data-preset="${p.id}">
      <span class="preset-tile__icon">${p.icon}</span>
      ${p.label}
    </button>`
  ).join("");

  grid.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-preset]");
    if (!btn) return;
    const preset = DECISION_PRESETS.find((p) => p.id === btn.dataset.preset);
    if (!preset) return;

    ($(  "d-hours") as HTMLInputElement).value = String(preset.hours);
    ($(  "d-cost") as HTMLInputElement).value = String(preset.cost);
    ($(  "d-task") as HTMLInputElement).value = preset.label;
    ($(  "d-enjoyment") as HTMLSelectElement).value = preset.defaultEnjoyment;

    recalculate("decision");
  });
}

// ─── Tab 1: Real Wage ────────────────────────────────────────

function updateWage(): void {
  const stateId = strVal("w-state");
  const stateRate = STATE_TAX_RATES.find((s) => s.id === stateId)?.rate ?? 0;

  const inputs: WageInputs = {
    annualGrossSalary: numVal("w-salary"),
    filingStatus: strVal("w-filing") as "single" | "mfj",
    stateTaxRate: stateRate,
    dailyCommuteCost: numVal("w-commute-cost"),
    monthlyClothing: numVal("w-clothing"),
    dailyMealCost: numVal("w-meals"),
    monthlyChildcare: numVal("w-childcare"),
    monthlyOtherCosts: numVal("w-other-cost"),
    dailyCommuteMinutes: numVal("w-commute-time"),
    dailyGetReadyMinutes: numVal("w-ready-time"),
    dailyDecompressionMinutes: numVal("w-decomp-time"),
    weeklyUnpaidOvertime: numVal("w-overtime"),
    workDaysPerWeek: numVal("w-workdays"),
    vacationDays: numVal("w-vacation"),
    holidays: numVal("w-holidays"),
    sickDays: numVal("w-sick"),
  };

  const r = calculateRealWage(inputs);
  calculatedRealWage = r.realHourlyWage;

  // Hero
  setText("res-real-wage", fmtCurrency(r.realHourlyWage, 2));
  setText(
    "res-wage-gap-note",
    `vs. ${fmtCurrency(r.advertisedHourlyWage, 2)} advertised — you're losing ${fmtPercent(r.wageGapPercent)} to hidden costs`
  );

  // Gap bar
  const pct =
    r.advertisedHourlyWage > 0
      ? Math.min(100, (r.realHourlyWage / r.advertisedHourlyWage) * 100)
      : 0;
  ($("gap-bar-real") as HTMLElement).style.width = `${pct}%`;
  setText("gap-label-real", `Real: ${fmtCurrency(r.realHourlyWage, 2)}/hr`);
  setText("gap-label-adv", `Advertised: ${fmtCurrency(r.advertisedHourlyWage, 2)}/hr`);

  // Insights
  setText("res-commute-total", fmtCurrency(r.totalCommuteCostWithTime));
  setText("res-commute-hours", `${fmtNumber(r.commuteHoursPerYear)} hours of life energy`);
  setText("res-100-hours", fmtHoursMinutes(r.hoursPer100Dollars));
  setText("res-remote-boost", `+${fmtCurrency(r.remoteWageBoost, 2)}/hr`);

  // Breakdown
  setText("bd-gross", fmtCurrency(r.grossAnnual));
  setText("bd-fed", `-${fmtCurrency(r.federalTax)}`);
  setText("bd-state", `-${fmtCurrency(r.stateTax)}`);
  setText("bd-fica", `-${fmtCurrency(r.ficaTax)}`);
  setText("bd-tax-total", `-${fmtCurrency(r.totalTax)}`);
  setText("bd-takehome", fmtCurrency(r.annualTakeHome));
  setText("bd-commute", `-${fmtCurrency(r.annualCommuteCost)}/yr`);
  setText("bd-clothing", `-${fmtCurrency(r.annualClothingCost)}/yr`);
  setText("bd-meals", `-${fmtCurrency(r.annualMealCost)}/yr`);
  setText("bd-childcare", `-${fmtCurrency(r.annualChildcareCost)}/yr`);
  setText("bd-other", `-${fmtCurrency(r.annualOtherCost)}/yr`);
  setText("bd-costs-total", `-${fmtCurrency(r.totalAnnualWorkCosts)}`);
  setText("bd-actual", fmtCurrency(r.actualAnnualEarnings));
  setText("bd-contracted-hrs", `${fmtNumber(r.contractedHoursPerYear)} hrs`);
  setText("bd-commute-hrs", `+${fmtNumber(r.commuteHoursPerYear)} hrs`);
  setText("bd-ready-hrs", `+${fmtNumber(r.getReadyHoursPerYear)} hrs`);
  setText("bd-decomp-hrs", `+${fmtNumber(r.decompressionHoursPerYear)} hrs`);
  setText("bd-ot-hrs", `+${fmtNumber(r.overtimeHoursPerYear)} hrs`);
  setText("bd-total-hrs", `${fmtNumber(r.totalWorkHoursPerYear)} hrs`);
}

// ─── Tab 2: Decision ─────────────────────────────────────────

function updateDecision(): void {
  const wage = numVal("d-wage");
  if (wage <= 0) {
    setText("res-verdict", "Enter your wage");
    return;
  }

  const inputs: DecisionInputs = {
    realHourlyWage: wage,
    taskDescription: strVal("d-task"),
    hoursToComplete: numVal("d-hours"),
    costToHire: numVal("d-cost"),
    enjoyment: strVal("d-enjoyment") as DecisionInputs["enjoyment"],
  };

  const r = calculateDecision(inputs);
  const heroEl = $("decision-hero");

  // Verdict
  heroEl.className = "result-card result-card--hero";
  if (r.verdict === "hire") {
    setText("res-verdict", "Hire someone");
    heroEl.classList.add("verdict-hire");
  } else {
    setText("res-verdict", "Do it yourself");
    heroEl.classList.add("verdict-diy");
  }
  setText("res-verdict-savings", `You save ${fmtCurrency(r.savings, 2)} by ${r.verdict === "hire" ? "hiring" : "doing it yourself"}`);

  // Comparison
  setText("res-diy-time-cost", fmtCurrency(r.diyTimeCost, 2));
  setText("res-diy-multiplier", `×${r.enjoymentMultiplier}`);
  setText("res-diy-adjusted", fmtCurrency(r.adjustedTimeCost, 2));
  setText("res-hire-cost", fmtCurrency(r.hireCost, 2));
  setText("res-hire-time-saved", fmtHoursMinutes(inputs.hoursToComplete));
  setText("res-hire-total", fmtCurrency(r.hireCost, 2));

  // Explanation
  setText("res-explanation", r.explanation);
}

// ─── Tab 3: Compare ──────────────────────────────────────────

function readJobInputs(prefix: string): JobInputs {
  const stateId = strVal(`${prefix}-state`);
  const stateRate = STATE_TAX_RATES.find((s) => s.id === stateId)?.rate ?? 0;
  return {
    label: strVal(`${prefix}-label`),
    annualSalary: numVal(`${prefix}-salary`),
    stateTaxRate: stateRate,
    dailyCommuteCost: numVal(`${prefix}-commute-cost`),
    dailyCommuteMinutes: numVal(`${prefix}-commute-time`),
    monthlyClothing: numVal(`${prefix}-clothing`),
    dailyMealCost: numVal(`${prefix}-meals`),
    monthlyChildcare: numVal(`${prefix}-childcare`),
    monthlyOtherCosts: numVal(`${prefix}-other`),
    dailyGetReadyMinutes: numVal(`${prefix}-ready`),
    dailyDecompressionMinutes: numVal(`${prefix}-decomp`),
    weeklyUnpaidOvertime: numVal(`${prefix}-overtime`),
    workDaysPerWeek: numVal(`${prefix}-workdays`) || 5,
    vacationDays: numVal(`${prefix}-vacation`),
    holidays: numVal(`${prefix}-holidays`),
    sickDays: numVal(`${prefix}-sick`),
  };
}

function updateCompare(): void {
  const jobA = readJobInputs("ja");
  const jobB = readJobInputs("jb");
  const r = compareJobs(jobA, jobB);

  // Labels
  setText("ct-label-a", jobA.label || "Job A");
  setText("ct-label-b", jobB.label || "Job B");

  // Hero
  const heroEl = $("compare-hero");
  heroEl.className = "result-card result-card--hero";

  if (r.winner === "tie") {
    setText("res-compare-winner", "It's a tie");
    setText("res-compare-note", "Both jobs pay roughly the same per hour of life energy");
  } else {
    const winnerJob = r.winner === "a" ? jobA : jobB;
    const loserJob = r.winner === "a" ? jobB : jobA;
    const salaryDiff = loserJob.annualSalary - winnerJob.annualSalary;

    setText("res-compare-winner", winnerJob.label || (r.winner === "a" ? "Job A" : "Job B"));
    if (salaryDiff > 0) {
      setText(
        "res-compare-note",
        `Pays ${fmtCurrency(Math.abs(r.wageDifference), 2)} more per hour of life energy despite a ${fmtCurrency(salaryDiff)} lower salary`
      );
    } else {
      setText(
        "res-compare-note",
        `Pays ${fmtCurrency(Math.abs(r.wageDifference), 2)} more per hour of life energy`
      );
    }
    heroEl.classList.add("verdict-hire");
  }

  // Table
  setText("ct-salary-a", fmtCurrency(r.jobA.grossAnnual));
  setText("ct-salary-b", fmtCurrency(r.jobB.grossAnnual));
  setText("ct-takehome-a", fmtCurrency(r.jobA.annualTakeHome));
  setText("ct-takehome-b", fmtCurrency(r.jobB.annualTakeHome));
  setText("ct-costs-a", `-${fmtCurrency(r.jobA.totalAnnualWorkCosts)}`);
  setText("ct-costs-b", `-${fmtCurrency(r.jobB.totalAnnualWorkCosts)}`);
  setText("ct-actual-a", fmtCurrency(r.jobA.actualAnnualEarnings));
  setText("ct-actual-b", fmtCurrency(r.jobB.actualAnnualEarnings));
  setText("ct-hours-a", fmtNumber(r.jobA.totalWorkHoursPerYear));
  setText("ct-hours-b", fmtNumber(r.jobB.totalWorkHoursPerYear));
  setText("ct-wage-a", fmtCurrency(r.jobA.realHourlyWage, 2));
  setText("ct-wage-b", fmtCurrency(r.jobB.realHourlyWage, 2));

  // Winner highlight on table row
  const highlightRow = document.querySelector(".compare-table__row--highlight");
  if (highlightRow) {
    highlightRow.classList.remove("winner-a", "winner-b");
    if (r.winner === "a") highlightRow.classList.add("winner-a");
    if (r.winner === "b") highlightRow.classList.add("winner-b");
  }

  // Insight
  if (r.winner !== "tie") {
    const winResult = r.winner === "a" ? r.jobA : r.jobB;
    const loseResult = r.winner === "a" ? r.jobB : r.jobA;
    const hoursSaved = loseResult.totalWorkHoursPerYear - winResult.totalWorkHoursPerYear;
    if (hoursSaved > 0) {
      setText(
        "res-compare-insight",
        `The winning job gives you back ${fmtNumber(hoursSaved)} hours per year. That's ${fmtNumber(hoursSaved / 8)} full days you get to live instead of work or commute.`
      );
    } else {
      setText(
        "res-compare-insight",
        `The winning job earns ${fmtCurrency(Math.abs(r.annualEarningsDifference))} more in actual take-home after all hidden costs.`
      );
    }
  } else {
    setText("res-compare-insight", "These jobs are functionally equivalent in terms of real hourly compensation.");
  }
}

// ─── Dispatcher ──────────────────────────────────────────────

function recalculate(tab?: string): void {
  const active =
    tab ||
    document.querySelector<HTMLButtonElement>(".tab--active")?.dataset.tab ||
    "wage";

  switch (active) {
    case "wage":
      updateWage();
      break;
    case "decision":
      updateDecision();
      break;
    case "compare":
      updateCompare();
      break;
  }
}

// ─── Event Binding ───────────────────────────────────────────

function initInputListeners(): void {
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    "[data-calc]"
  ).forEach((el) => {
    const events = el.tagName === "SELECT" ? ["change"] : ["input", "change"];
    events.forEach((evt) => {
      el.addEventListener(evt, () => {
        // Track manual edits to the decision wage field
        if (el.id === "d-wage") decisionWageManuallyEdited = true;
        recalculate(el.dataset.calc);
      });
    });
  });
}

// ─── Init ────────────────────────────────────────────────────

function init(): void {
  populateStates();
  initTabs();
  renderPresets();
  initInputListeners();
  recalculate("wage");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
