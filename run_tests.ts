import {
  calcFederalIncomeTax,
  calcStateTax,
  calcFICA,
  calculateRealWage,
  calculateDecision,
  compareJobs,
  fmtCurrency,
  fmtPercent,
  fmtHoursMinutes,
  fmtNumber,
  STATE_TAX_RATES,
  DECISION_PRESETS,
} from "./frontend/src/engine";

let passed = 0, failed = 0;
const failures: string[] = [];
function ok(cond: boolean, name: string) {
  if (cond) { passed++; } else { failed++; failures.push(name); console.error(`  ✗ ${name}`); }
}
function section(t: string) { console.log(`\n── ${t} ──`); }

const base = {
  annualGrossSalary: 65000, filingStatus: "single" as const, stateTaxRate: 0.0495,
  dailyCommuteCost: 15, monthlyClothing: 50, dailyMealCost: 8, monthlyChildcare: 0, monthlyOtherCosts: 0,
  dailyCommuteMinutes: 50, dailyGetReadyMinutes: 30, dailyDecompressionMinutes: 45,
  weeklyUnpaidOvertime: 3, workDaysPerWeek: 5, vacationDays: 10, holidays: 8, sickDays: 5,
};

section("Federal Tax");
ok(calcFederalIncomeTax(10000, "single") === 0, "Below std deduction → $0");
ok(calcFederalIncomeTax(0, "single") === 0, "Zero income → $0");
ok(calcFederalIncomeTax(25000, "single") === 1040, "$25k single → $1,040");
ok(calcFederalIncomeTax(100000, "mfj") < calcFederalIncomeTax(100000, "single"), "MFJ < single");
ok(calcFederalIncomeTax(25000, "mfj") === 0, "$25k MFJ below deduction");
ok(calcFederalIncomeTax(-5000, "single") === 0, "Negative → $0");
const highTax = calcFederalIncomeTax(1000000, "single");
ok(highTax > 300000, `$1M tax: ${highTax}`);

section("State Tax");
ok(calcStateTax(100000, 0) === 0, "Zero rate → $0");
ok(calcStateTax(100000, -0.05) === 0, "Negative rate → $0");
ok(calcStateTax(0, 0.05) === 0, "Zero income → $0");
ok(calcStateTax(100000, 0.0495) === 4950, "IL flat tax");

section("FICA");
ok(calcFICA(0) === 0, "Zero income → $0");
ok(calcFICA(-5000) === 0, "Negative → $0");
const fica65 = calcFICA(65000);
ok(Math.abs(fica65 - 65000 * 0.0765) < 5, `$65k FICA: ${fica65}`);
const diff300 = calcFICA(300000) - calcFICA(200000);
ok(diff300 < 3000, "SS capped at wage base");
const diff250 = calcFICA(250000) - calcFICA(200000);
ok(diff250 > 1100, "Additional Medicare above $200k");

section("Real Wage");
const r = calculateRealWage(base);
ok(r.realHourlyWage > 10 && r.realHourlyWage < 30, `Real wage: $${r.realHourlyWage.toFixed(2)}`);
ok(r.realHourlyWage < r.advertisedHourlyWage, "Real < advertised");
ok(Math.abs(r.advertisedHourlyWage - 65000 / 2080) < 0.1, "Advertised = salary/2080");
ok(r.wageGapDollars > 0, "Positive gap");
ok(r.wageGapPercent > 0, "Positive gap %");

const noCommute = calculateRealWage({ ...base, dailyCommuteCost: 0, dailyCommuteMinutes: 0 });
ok(noCommute.realHourlyWage > r.realHourlyWage, "No commute → higher wage");

const highDecomp = calculateRealWage({ ...base, dailyDecompressionMinutes: 120 });
const lowDecomp = calculateRealWage({ ...base, dailyDecompressionMinutes: 0 });
ok(highDecomp.realHourlyWage < lowDecomp.realHourlyWage, "More decomp → lower wage");

ok(r.workingDaysPerYear === 237, `Working days: ${r.workingDaysPerYear}`);
ok(r.totalWorkHoursPerYear > r.contractedHoursPerYear, "Total hrs > contracted");
ok(r.remoteWageBoost > 0, "Remote boost positive");
ok(r.hoursPer100Dollars > 3 && r.hoursPer100Dollars < 10, `Hrs/$100: ${r.hoursPer100Dollars.toFixed(1)}`);

const zeroSalary = calculateRealWage({ ...base, annualGrossSalary: 0 });
ok(zeroSalary.realHourlyWage <= 0, "Zero salary → zero or negative wage");

// Property tests
const moreCost = calculateRealWage({ ...base, monthlyOtherCosts: 200 });
ok(moreCost.realHourlyWage <= r.realHourlyWage, "More cost → lower wage");
const moreTime = calculateRealWage({ ...base, weeklyUnpaidOvertime: 10 });
ok(moreTime.realHourlyWage <= r.realHourlyWage, "More time → lower wage");

section("Decision Calculator");
const d1 = calculateDecision({ realHourlyWage: 30, taskDescription: "", hoursToComplete: 3, costToHire: 60, enjoyment: "neutral" });
ok(d1.verdict === "hire", "3hrs×$30=$90 vs $60 → hire");
ok(Math.abs(d1.savings - 30) < 1, `Savings: ${d1.savings}`);

const d2 = calculateDecision({ realHourlyWage: 15, taskDescription: "", hoursToComplete: 1, costToHire: 50, enjoyment: "neutral" });
ok(d2.verdict === "diy", "1hr×$15=$15 vs $50 → diy");

const d3 = calculateDecision({ realHourlyWage: 20, taskDescription: "", hoursToComplete: 8, costToHire: 250, enjoyment: "hate" });
ok(d3.enjoymentMultiplier === 1.5, "Hate → 1.5x");
ok(Math.abs(d3.adjustedTimeCost - 240) < 1, `Adjusted: ${d3.adjustedTimeCost}`);

const d4 = calculateDecision({ realHourlyWage: 30, taskDescription: "", hoursToComplete: 1.5, costToHire: 35, enjoyment: "love" });
ok(d4.verdict === "diy", "Love it → DIY even when time cost would suggest hire");
ok(Math.abs(d4.adjustedTimeCost - 13.5) < 1, `Love adjusted: ${d4.adjustedTimeCost}`);

const d5 = calculateDecision({ realHourlyWage: 25, taskDescription: "", hoursToComplete: 0, costToHire: 50, enjoyment: "neutral" });
ok(d5.diyTimeCost === 0, "Zero time → $0 cost");

const d6 = calculateDecision({ realHourlyWage: 25, taskDescription: "", hoursToComplete: 2, costToHire: 0, enjoyment: "neutral" });
ok(d6.verdict === "hire", "Free hire → hire");

section("Job Comparison");
const jobA = { label: "Office", annualSalary: 65000, stateTaxRate: 0.0495, dailyCommuteCost: 15, dailyCommuteMinutes: 50, monthlyClothing: 50, dailyMealCost: 8, monthlyChildcare: 0, monthlyOtherCosts: 0, dailyGetReadyMinutes: 30, dailyDecompressionMinutes: 45, weeklyUnpaidOvertime: 3, vacationDays: 10, holidays: 8, sickDays: 5 };
const jobB = { label: "Remote", annualSalary: 60000, stateTaxRate: 0, dailyCommuteCost: 0, dailyCommuteMinutes: 0, monthlyClothing: 0, dailyMealCost: 5, monthlyChildcare: 0, monthlyOtherCosts: 50, dailyGetReadyMinutes: 10, dailyDecompressionMinutes: 20, weeklyUnpaidOvertime: 1, vacationDays: 15, holidays: 10, sickDays: 5 };

const cmp = compareJobs(jobA, jobB);
ok(cmp.jobB.realHourlyWage > cmp.jobA.realHourlyWage, "Remote beats office on real wage");
ok(cmp.winner === "b", "Remote wins");

const tie = compareJobs(jobA, { ...jobA, label: "Same" });
ok(tie.winner === "tie", "Identical → tie");

ok(cmp.hoursDifference > 100, `Hours diff: ${cmp.hoursDifference}`);
ok(Math.abs(cmp.daysDifference - cmp.hoursDifference / 8) < 1, "Days = hours/8");

const mfj = compareJobs(jobA, jobB, "mfj");
ok(mfj.jobA.realHourlyWage > cmp.jobA.realHourlyWage, "MFJ → higher real wage");

section("Formatting");
ok(fmtCurrency(1234) === "$1,234", `fmtCurrency: ${fmtCurrency(1234)}`);
ok(fmtCurrency(24.53, 2) === "$24.53", `fmtCurrency decimals: ${fmtCurrency(24.53, 2)}`);
ok(fmtCurrency(Infinity) === "—", "Infinity → —");
ok(fmtPercent(0.35) === "35.0%", `fmtPercent: ${fmtPercent(0.35)}`);
ok(fmtHoursMinutes(3) === "3hrs", `fmtHM(3): ${fmtHoursMinutes(3)}`);
ok(fmtHoursMinutes(1) === "1hr", `fmtHM(1): ${fmtHoursMinutes(1)}`);
ok(fmtHoursMinutes(2.5) === "2hr 30min", `fmtHM(2.5): ${fmtHoursMinutes(2.5)}`);
ok(fmtHoursMinutes(0.75) === "45min", `fmtHM(0.75): ${fmtHoursMinutes(0.75)}`);
ok(fmtNumber(1896) === "1,896", `fmtNumber: ${fmtNumber(1896)}`);

section("Data");
ok(STATE_TAX_RATES.length === 51, `States: ${STATE_TAX_RATES.length}`);
ok(STATE_TAX_RATES.every(s => s.rate >= 0 && s.rate < 0.15), "All rates valid");
ok(DECISION_PRESETS.length === 6, `Presets: ${DECISION_PRESETS.length}`);

console.log(`\n${"═".repeat(50)}`);
console.log(`  ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${"═".repeat(50)}`);
if (failures.length > 0) { console.log("\nFailed:"); failures.forEach(f => console.log(`  ✗ ${f}`)); }
else { console.log("\n✓ All tests passed."); }
// @ts-ignore
process.exit(failed > 0 ? 1 : 0);
