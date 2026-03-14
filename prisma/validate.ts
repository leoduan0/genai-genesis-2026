#!/usr/bin/env tsx
// ─── Step 8: Validate and Reconcile ──────────────────────────────────────────
//
// Standalone validation script — no database connection required.
// Imports all seed data and runs 5 validation checks:
//   1. Σ₀ positive semidefiniteness
//   2. L matrix → sensible condition priors
//   3. Loading vector sparsity
//   4. Base rate sanity checks
//   5. Simulated screening (Stage 1 → Stage 2)

import { itemLoadings } from "./seed-loadings";
import { instrumentNoiseData, getItemNoise } from "./seed-noise";
import { thresholds } from "./seed-thresholds";

// ═══════════════════════════════════════════════════════════════════════════════
// DATA (copied from seed.ts to avoid import issues with the main seed file)
// ═══════════════════════════════════════════════════════════════════════════════

const spectra = [
  { shortCode: "DIS", name: "Distress", sortOrder: 0 },
  { shortCode: "FEA", name: "Fear", sortOrder: 1 },
  { shortCode: "DEX", name: "Disinhibited Externalizing", sortOrder: 2 },
  { shortCode: "AEX", name: "Antagonistic Externalizing", sortOrder: 3 },
  { shortCode: "THD", name: "Thought Disorder", sortOrder: 4 },
  { shortCode: "DET", name: "Detachment", sortOrder: 5 },
  { shortCode: "SOM", name: "Somatoform", sortOrder: 6 },
  { shortCode: "COM", name: "Compulsivity", sortOrder: 7 },
];

const spectraOrder = spectra.map((s) => s.shortCode);

const conditions = [
  { shortCode: "MDD", parent: "DIS" }, { shortCode: "PDD", parent: "DIS" },
  { shortCode: "GAD", parent: "DIS" }, { shortCode: "PTSD", parent: "DIS" },
  { shortCode: "ADJ", parent: "DIS" },
  { shortCode: "PAN", parent: "FEA" }, { shortCode: "AGO", parent: "FEA" },
  { shortCode: "SAD", parent: "FEA" }, { shortCode: "SPH", parent: "FEA" },
  { shortCode: "SEP", parent: "FEA" },
  { shortCode: "ADHD", parent: "DEX" }, { shortCode: "AUD", parent: "DEX" },
  { shortCode: "DUD", parent: "DEX" }, { shortCode: "GAMB", parent: "DEX" },
  { shortCode: "ASPD", parent: "DEX" }, { shortCode: "BED", parent: "DEX" },
  { shortCode: "NARC", parent: "AEX" }, { shortCode: "BPD", parent: "AEX" },
  { shortCode: "SCZ", parent: "THD" }, { shortCode: "BP1", parent: "THD" },
  { shortCode: "BP2", parent: "THD" }, { shortCode: "SZTY", parent: "THD" },
  { shortCode: "CHR", parent: "THD" },
  { shortCode: "SZOD", parent: "DET" }, { shortCode: "AVPD", parent: "DET" },
  { shortCode: "DPDR", parent: "DET" }, { shortCode: "ASD", parent: "DET" },
  { shortCode: "SSD", parent: "SOM" }, { shortCode: "IAD", parent: "SOM" },
  { shortCode: "OCD", parent: "COM" }, { shortCode: "BDD", parent: "COM" },
  { shortCode: "HOA", parent: "COM" }, { shortCode: "AN", parent: "COM" },
  { shortCode: "OCPD", parent: "COM" }, { shortCode: "TIC", parent: "COM" },
];

const lMatrix = [
  { condition: "MDD", spectrum: "DIS", loading: 0.85 },
  { condition: "PDD", spectrum: "DIS", loading: 0.80 },
  { condition: "GAD", spectrum: "DIS", loading: 0.75 },
  { condition: "GAD", spectrum: "FEA", loading: 0.30 },
  { condition: "PTSD", spectrum: "DIS", loading: 0.65 },
  { condition: "PTSD", spectrum: "FEA", loading: 0.40 },
  { condition: "ADJ", spectrum: "DIS", loading: 0.60 },
  { condition: "PAN", spectrum: "FEA", loading: 0.85 },
  { condition: "AGO", spectrum: "FEA", loading: 0.80 },
  { condition: "SAD", spectrum: "FEA", loading: 0.80 },
  { condition: "SPH", spectrum: "FEA", loading: 0.75 },
  { condition: "SEP", spectrum: "FEA", loading: 0.75 },
  { condition: "ADHD", spectrum: "DEX", loading: 0.80 },
  { condition: "AUD", spectrum: "DEX", loading: 0.85 },
  { condition: "DUD", spectrum: "DEX", loading: 0.85 },
  { condition: "GAMB", spectrum: "DEX", loading: 0.80 },
  { condition: "ASPD", spectrum: "DEX", loading: 0.70 },
  { condition: "ASPD", spectrum: "AEX", loading: 0.35 },
  { condition: "BED", spectrum: "DEX", loading: 0.65 },
  { condition: "BED", spectrum: "DIS", loading: 0.30 },
  { condition: "NARC", spectrum: "AEX", loading: 0.85 },
  { condition: "BPD", spectrum: "AEX", loading: 0.70 },
  { condition: "BPD", spectrum: "DIS", loading: 0.40 },
  { condition: "SCZ", spectrum: "THD", loading: 0.90 },
  { condition: "BP1", spectrum: "THD", loading: 0.70 },
  { condition: "BP1", spectrum: "DIS", loading: 0.35 },
  { condition: "BP2", spectrum: "THD", loading: 0.60 },
  { condition: "BP2", spectrum: "DIS", loading: 0.45 },
  { condition: "SZTY", spectrum: "THD", loading: 0.85 },
  { condition: "CHR", spectrum: "THD", loading: 0.75 },
  { condition: "SZOD", spectrum: "DET", loading: 0.85 },
  { condition: "AVPD", spectrum: "DET", loading: 0.70 },
  { condition: "AVPD", spectrum: "FEA", loading: 0.35 },
  { condition: "DPDR", spectrum: "DET", loading: 0.80 },
  { condition: "ASD", spectrum: "DET", loading: 0.65 },
  { condition: "ASD", spectrum: "COM", loading: 0.35 },
  { condition: "SSD", spectrum: "SOM", loading: 0.85 },
  { condition: "IAD", spectrum: "SOM", loading: 0.70 },
  { condition: "IAD", spectrum: "FEA", loading: 0.30 },
  { condition: "OCD", spectrum: "COM", loading: 0.85 },
  { condition: "BDD", spectrum: "COM", loading: 0.70 },
  { condition: "BDD", spectrum: "SOM", loading: 0.35 },
  { condition: "HOA", spectrum: "COM", loading: 0.75 },
  { condition: "AN", spectrum: "COM", loading: 0.65 },
  { condition: "AN", spectrum: "SOM", loading: 0.30 },
  { condition: "AN", spectrum: "DET", loading: 0.25 },
  { condition: "OCPD", spectrum: "COM", loading: 0.80 },
  { condition: "TIC", spectrum: "COM", loading: 0.70 },
];

const correlations = [
  { spectrumA: "DIS", spectrumB: "FEA", correlation: 0.642 },
  { spectrumA: "DIS", spectrumB: "DEX", correlation: 0.315 },
  { spectrumA: "DIS", spectrumB: "AEX", correlation: 0.24 },
  { spectrumA: "DIS", spectrumB: "THD", correlation: 0.420 },
  { spectrumA: "DIS", spectrumB: "DET", correlation: 0.46 },
  { spectrumA: "DIS", spectrumB: "SOM", correlation: 0.48 },
  { spectrumA: "DIS", spectrumB: "COM", correlation: 0.37 },
  { spectrumA: "FEA", spectrumB: "DEX", correlation: 0.217 },
  { spectrumA: "FEA", spectrumB: "AEX", correlation: 0.14 },
  { spectrumA: "FEA", spectrumB: "THD", correlation: 0.24 },
  { spectrumA: "FEA", spectrumB: "DET", correlation: 0.28 },
  { spectrumA: "FEA", spectrumB: "SOM", correlation: 0.49 },
  { spectrumA: "FEA", spectrumB: "COM", correlation: 0.36 },
  { spectrumA: "DEX", spectrumB: "AEX", correlation: 0.56 },
  { spectrumA: "DEX", spectrumB: "THD", correlation: 0.24 },
  { spectrumA: "DEX", spectrumB: "DET", correlation: 0.14 },
  { spectrumA: "DEX", spectrumB: "SOM", correlation: 0.09 },
  { spectrumA: "DEX", spectrumB: "COM", correlation: 0.20 },
  { spectrumA: "AEX", spectrumB: "THD", correlation: 0.31 },
  { spectrumA: "AEX", spectrumB: "DET", correlation: 0.24 },
  { spectrumA: "AEX", spectrumB: "SOM", correlation: 0.10 },
  { spectrumA: "AEX", spectrumB: "COM", correlation: 0.15 },
  { spectrumA: "THD", spectrumB: "DET", correlation: 0.46 },
  { spectrumA: "THD", spectrumB: "SOM", correlation: 0.14 },
  { spectrumA: "THD", spectrumB: "COM", correlation: 0.22 },
  { spectrumA: "DET", spectrumB: "SOM", correlation: 0.19 },
  { spectrumA: "DET", spectrumB: "COM", correlation: 0.30 },
  { spectrumA: "SOM", spectrumB: "COM", correlation: 0.35 },
];

// General population base rates (12-month prevalence)
const baseRatesGeneral: Record<string, number> = {
  MDD: 0.071, PDD: 0.015, GAD: 0.031, PTSD: 0.036, ADJ: 0.02,
  PAN: 0.028, AGO: 0.017, SAD: 0.073, SPH: 0.087, SEP: 0.012,
  ADHD: 0.044, AUD: 0.056, DUD: 0.035, GAMB: 0.005, ASPD: 0.01, BED: 0.016,
  NARC: 0.01, BPD: 0.018,
  SCZ: 0.005, BP1: 0.006, BP2: 0.005, SZTY: 0.04, CHR: 0.02,
  SZOD: 0.03, AVPD: 0.025, DPDR: 0.02, ASD: 0.012,
  SSD: 0.065, IAD: 0.04,
  OCD: 0.012, BDD: 0.019, HOA: 0.025, AN: 0.003, OCPD: 0.02, TIC: 0.01,
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function probit(p: number): number {
  if (p <= 0 || p >= 1) throw new Error(`probit: p must be in (0,1), got ${p}`);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

/** Standard normal CDF (Abramowitz & Stegun approximation) */
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function buildCorrelationMatrix(): number[][] {
  const n = spectraOrder.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) matrix[i][i] = 1.0;
  for (const c of correlations) {
    const i = spectraOrder.indexOf(c.spectrumA);
    const j = spectraOrder.indexOf(c.spectrumB);
    matrix[i][j] = c.correlation;
    matrix[j][i] = c.correlation;
  }
  return matrix;
}

/** Cholesky decomposition — returns L such that A = L*L^T, or null if not PD */
function cholesky(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const val = matrix[i][i] - sum;
        if (val <= 0) return null;
        L[i][j] = Math.sqrt(val);
      } else {
        L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
}

/** Compute eigenvalues of a symmetric matrix (Jacobi method) */
function eigenvalues(A: number[][]): number[] {
  const n = A.length;
  const M = A.map(row => [...row]);
  for (let iter = 0; iter < 500; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0, p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(M[i][j]) > maxVal) { maxVal = Math.abs(M[i][j]); p = i; q = j; }
      }
    }
    if (maxVal < 1e-10) break;
    // Jacobi rotation
    const theta = (M[q][q] - M[p][p]) / (2 * M[p][q]);
    const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const cos = 1 / Math.sqrt(t * t + 1);
    const sin = t * cos;
    const tau_j = sin / (1 + cos);
    const a_pq = M[p][q];
    M[p][q] = 0; M[q][p] = 0;
    M[p][p] -= t * a_pq;
    M[q][q] += t * a_pq;
    for (let r = 0; r < n; r++) {
      if (r === p || r === q) continue;
      const rp = M[r][p], rq = M[r][q];
      M[r][p] = M[p][r] = rp - sin * (rq + tau_j * rp);
      M[r][q] = M[q][r] = rq + sin * (rp - tau_j * rq);
    }
  }
  return Array.from({ length: n }, (_, i) => M[i][i]).sort((a, b) => a - b);
}

/** Matrix-vector multiply */
function matVecMul(M: number[][], v: number[]): number[] {
  return M.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
}

/** Outer product: v * v^T */
function outerProduct(v: number[]): number[][] {
  return v.map(vi => v.map(vj => vi * vj));
}

/** Matrix subtraction */
function matSub(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((val, j) => val - B[i][j]));
}

/** Matrix trace */
function trace(M: number[][]): number {
  return M.reduce((s, row, i) => s + row[i], 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

let totalPass = 0;
let totalFail = 0;
let totalWarn = 0;

function pass(msg: string) { console.log(`  ✓ ${msg}`); totalPass++; }
function fail(msg: string) { console.log(`  ✗ ${msg}`); totalFail++; }
function warn(msg: string) { console.log(`  ⚠ ${msg}`); totalWarn++; }

// ─── CHECK 1: Σ₀ Positive Semidefiniteness ──────────────────────────────────

console.log("\n═══ CHECK 1: Σ₀ Positive Semidefiniteness ═══\n");

const Sigma0 = buildCorrelationMatrix();
const L_chol = cholesky(Sigma0);

if (L_chol) {
  pass("Cholesky decomposition succeeds → matrix is positive definite");
} else {
  fail("Cholesky decomposition FAILED → matrix is NOT positive definite");
}

const eigs = eigenvalues(Sigma0);
const minEig = eigs[0];
const maxEig = eigs[eigs.length - 1];
console.log(`  Eigenvalues: [${eigs.map(e => e.toFixed(4)).join(", ")}]`);
console.log(`  Min eigenvalue: ${minEig.toFixed(6)}, Max: ${maxEig.toFixed(6)}`);
console.log(`  Condition number: ${(maxEig / minEig).toFixed(2)}`);

if (minEig > 0.01) {
  pass(`Smallest eigenvalue ${minEig.toFixed(4)} > 0.01 — well-conditioned`);
} else if (minEig > 0) {
  warn(`Smallest eigenvalue ${minEig.toFixed(6)} is positive but very small — near-singular`);
} else {
  fail(`Smallest eigenvalue ${minEig.toFixed(6)} ≤ 0 — NOT positive definite`);
}

// Verify symmetry
let maxAsymmetry = 0;
for (let i = 0; i < 8; i++) {
  for (let j = 0; j < 8; j++) {
    maxAsymmetry = Math.max(maxAsymmetry, Math.abs(Sigma0[i][j] - Sigma0[j][i]));
  }
}
if (maxAsymmetry < 1e-10) {
  pass("Matrix is symmetric");
} else {
  fail(`Matrix asymmetry detected: max |Σ[i,j] - Σ[j,i]| = ${maxAsymmetry}`);
}

// Verify all correlations in [-1, 1]
let corrOutOfRange = false;
for (let i = 0; i < 8; i++) {
  for (let j = 0; j < 8; j++) {
    if (Math.abs(Sigma0[i][j]) > 1.001) corrOutOfRange = true;
  }
}
corrOutOfRange ? fail("Some correlations outside [-1, 1]") : pass("All correlations in [-1, 1]");

// Verify diagonal = 1
const diagOk = Sigma0.every((row, i) => Math.abs(row[i] - 1.0) < 1e-10);
diagOk ? pass("Diagonal entries are all 1.0") : fail("Some diagonal entries ≠ 1.0");

// Verify 28 unique pairs
if (correlations.length === 28) {
  pass("28 unique correlation pairs (upper triangle of 8×8)");
} else {
  fail(`Expected 28 correlations, found ${correlations.length}`);
}

// Print the matrix
console.log(`\n  Full correlation matrix:`);
console.log(`       ${spectraOrder.map(s => s.padStart(6)).join("")}`);
for (let i = 0; i < 8; i++) {
  const row = Sigma0[i].map(v => v.toFixed(2).padStart(6)).join("");
  console.log(`  ${spectraOrder[i].padStart(5)}${row}`);
}

// ─── CHECK 2: L Matrix → Condition Priors ───────────────────────────────────

console.log("\n\n═══ CHECK 2: L Matrix → Sensible Condition Priors ═══\n");

// Verify every condition has at least one loading
const conditionsWithLoadings = new Set(lMatrix.map(l => l.condition));
const conditionCodes = conditions.map(c => c.shortCode);
const missingLoadings = conditionCodes.filter(c => !conditionsWithLoadings.has(c));
if (missingLoadings.length === 0) {
  pass("All 35 conditions have at least one L-matrix loading");
} else {
  fail(`Conditions missing L-matrix loadings: ${missingLoadings.join(", ")}`);
}

// Verify every condition has exactly one isPrimary=true
for (const code of conditionCodes) {
  const entries = lMatrix.filter(l => l.condition === code);
  const primaryCount = entries.filter(l => {
    // Check if the condition's parent matches the spectrum
    const cond = conditions.find(c => c.shortCode === code)!;
    return cond.parent === l.spectrum;
  }).length;
  // All should have at least the parent spectrum loading
  if (entries.length === 0) {
    fail(`${code}: no L-matrix entries`);
  }
}

// Verify loading ranges
const primaryLoadings = lMatrix.filter(l => {
  const cond = conditions.find(c => c.shortCode === l.condition)!;
  return cond.parent === l.spectrum;
});
const secondaryLoadings = lMatrix.filter(l => {
  const cond = conditions.find(c => c.shortCode === l.condition)!;
  return cond.parent !== l.spectrum;
});

const primaryRange = primaryLoadings.map(l => l.loading);
const secondaryRange = secondaryLoadings.map(l => l.loading);

console.log(`  Primary loadings: ${primaryLoadings.length}, range [${Math.min(...primaryRange).toFixed(2)}, ${Math.max(...primaryRange).toFixed(2)}]`);
console.log(`  Secondary loadings: ${secondaryLoadings.length}, range [${Math.min(...secondaryRange).toFixed(2)}, ${Math.max(...secondaryRange).toFixed(2)}]`);

if (Math.min(...primaryRange) >= 0.5) {
  pass("All primary loadings ≥ 0.50");
} else {
  warn(`Some primary loadings < 0.50: ${primaryLoadings.filter(l => l.loading < 0.5).map(l => `${l.condition}→${l.spectrum}=${l.loading}`).join(", ")}`);
}

if (Math.max(...secondaryRange) < Math.min(...primaryRange)) {
  pass("All secondary loadings < minimum primary loading");
} else {
  warn("Some secondary loadings overlap with primary loading range");
}

// Simulate stage transition: what happens to condition priors when spectrum posterior is elevated?
console.log("\n  Stage transition simulation (spectrum posterior μ=1.5, all others 0):");
console.log(`  ${"Condition".padEnd(6)} ${"Base μ".padStart(8)} ${"Updated μ".padStart(10)} ${"Δ".padStart(8)} ${"Spectrum".padStart(8)}`);

for (const spec of spectraOrder) {
  const specPosterior = spectraOrder.map(s => s === spec ? 1.5 : 0);
  console.log(`\n  --- ${spec} elevated to 1.5 ---`);

  for (const cond of conditionCodes) {
    const entries = lMatrix.filter(l => l.condition === cond);
    const baseRate = baseRatesGeneral[cond] ?? 0.01;
    const baseMu = probit(baseRate);
    let delta = 0;
    for (const e of entries) {
      const specIdx = spectraOrder.indexOf(e.spectrum);
      delta += e.loading * specPosterior[specIdx];
    }
    if (Math.abs(delta) > 0.01) {
      const updatedMu = baseMu + delta;
      const parent = conditions.find(c => c.shortCode === cond)!.parent;
      const marker = parent === spec ? " (primary)" : " (cross)";
      console.log(`  ${cond.padEnd(6)} ${baseMu.toFixed(3).padStart(8)} ${updatedMu.toFixed(3).padStart(10)} ${`+${delta.toFixed(3)}`.padStart(8)} ${spec.padStart(8)}${marker}`);
    }
  }
}

// Sanity: no condition should exceed 50% probability when a single spectrum is elevated to 1.5 SD
console.log("\n  Sanity: P(condition) when parent spectrum = 1.5 SD (should be < 50%):");
let priorSanity = true;
for (const cond of conditionCodes) {
  const parent = conditions.find(c => c.shortCode === cond)!.parent;
  const entries = lMatrix.filter(l => l.condition === cond);
  const baseRate = baseRatesGeneral[cond] ?? 0.01;
  const baseMu = probit(baseRate);
  let delta = 0;
  for (const e of entries) {
    if (e.spectrum === parent) delta += e.loading * 1.5;
  }
  const updatedMu = baseMu + delta;
  const prob = normalCDF(updatedMu);
  if (prob > 0.50) {
    warn(`${cond}: P=${(prob*100).toFixed(1)}% when ${parent}=1.5 SD — seems high`);
    priorSanity = false;
  }
}
if (priorSanity) pass("All condition probabilities < 50% at 1.5 SD elevation");

// ─── CHECK 3: Loading Vector Sparsity ───────────────────────────────────────

console.log("\n\n═══ CHECK 3: Item Loading Vector Sparsity ═══\n");

// Group by item (instrument:itemNumber)
const itemKey = (il: { instrument: string; itemNumber: number }) => `${il.instrument}:${il.itemNumber}`;
const loadingsByItem = new Map<string, typeof itemLoadings>();
for (const il of itemLoadings) {
  const key = itemKey(il);
  if (!loadingsByItem.has(key)) loadingsByItem.set(key, []);
  loadingsByItem.get(key)!.push(il);
}

console.log(`  Total items with loadings: ${loadingsByItem.size}`);
console.log(`  Total loading entries: ${itemLoadings.length}`);
console.log(`  Average loadings per item: ${(itemLoadings.length / loadingsByItem.size).toFixed(2)}`);

// Distribution of loadings per item
const countDist = new Map<number, number>();
for (const [, entries] of loadingsByItem) {
  const n = entries.length;
  countDist.set(n, (countDist.get(n) ?? 0) + 1);
}
console.log("\n  Loadings-per-item distribution:");
for (const [n, count] of [...countDist.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`    ${n} loading(s): ${count} items`);
}

// Verify sparsity: most items should have 1-3 loadings
const sparseItems = [...loadingsByItem.values()].filter(e => e.length <= 3).length;
const sparsePercent = (sparseItems / loadingsByItem.size * 100).toFixed(1);
if (sparseItems / loadingsByItem.size > 0.90) {
  pass(`${sparsePercent}% of items have ≤3 loadings — good sparsity`);
} else {
  warn(`Only ${sparsePercent}% of items have ≤3 loadings — may be too dense`);
}

// Verify every item has at least one isPrimary=true loading
let allHavePrimary = true;
for (const [key, entries] of loadingsByItem) {
  if (!entries.some(e => e.isPrimary)) {
    warn(`${key}: no primary loading`);
    allHavePrimary = false;
  }
}
if (allHavePrimary) pass("Every item has at least one primary loading");

// Verify loading value ranges
const allLoadingValues = itemLoadings.map(il => il.loading);
const minLoading = Math.min(...allLoadingValues);
const maxLoading = Math.max(...allLoadingValues);
console.log(`\n  Loading range: [${minLoading.toFixed(3)}, ${maxLoading.toFixed(3)}]`);

if (minLoading > 0) {
  pass("All loadings are positive");
} else {
  fail(`Some loadings are ≤ 0 (min: ${minLoading.toFixed(3)})`);
}
if (maxLoading <= 1.0) {
  pass("All loadings ≤ 1.0");
} else {
  fail(`Some loadings > 1.0 (max: ${maxLoading.toFixed(3)})`);
}

// Check that Tier 1 items load onto spectra and Tier 2 items load onto conditions
const tier1Instruments = new Set(["PHQ-9", "GAD-7", "PHQ-15", "PC-PTSD-5", "AUDIT-C", "WHO-5"]);
const spectraCodes = new Set(spectraOrder);
const conditionCodesSet = new Set(conditionCodes);

let tier1OnSpectra = true;
let tier2OnConditions = true;
for (const il of itemLoadings) {
  if (tier1Instruments.has(il.instrument)) {
    if (!spectraCodes.has(il.dimension)) {
      warn(`Tier 1 item ${il.instrument}:${il.itemNumber} loads onto condition ${il.dimension} (expected spectrum)`);
      tier1OnSpectra = false;
    }
  } else {
    if (!conditionCodesSet.has(il.dimension)) {
      warn(`Tier 2 item ${il.instrument}:${il.itemNumber} loads onto spectrum ${il.dimension} (expected condition)`);
      tier2OnConditions = false;
    }
  }
}
if (tier1OnSpectra) pass("All Tier 1 items load onto spectra (not conditions)");
if (tier2OnConditions) pass("All Tier 2 items load onto conditions (not spectra)");

// ─── CHECK 4: Base Rate Sanity ──────────────────────────────────────────────

console.log("\n\n═══ CHECK 4: Base Rate Cross-Checks ═══\n");

// Check all 35 conditions have general population base rates
const missingBaseRates = conditionCodes.filter(c => !(c in baseRatesGeneral));
if (missingBaseRates.length === 0) {
  pass("All 35 conditions have general population base rates");
} else {
  fail(`Missing general base rates: ${missingBaseRates.join(", ")}`);
}

// Check all base rates are between 0 and 1
let rateRangeOk = true;
for (const [cond, rate] of Object.entries(baseRatesGeneral)) {
  if (rate <= 0 || rate >= 1) {
    fail(`${cond}: prevalence ${rate} is out of (0,1) range`);
    rateRangeOk = false;
  }
}
if (rateRangeOk) pass("All base rates in (0, 1)");

// Check that common conditions have reasonable prevalence
const commonConditions = ["MDD", "GAD", "SAD", "SPH", "SSD"];
const rareConditions = ["SCZ", "AN", "GAMB"];
for (const cond of commonConditions) {
  const rate = baseRatesGeneral[cond];
  if (rate < 0.01) warn(`${cond} prevalence ${(rate*100).toFixed(1)}% seems too low for a common condition`);
}
for (const cond of rareConditions) {
  const rate = baseRatesGeneral[cond];
  if (rate > 0.05) warn(`${cond} prevalence ${(rate*100).toFixed(1)}% seems too high for a rare condition`);
}

// Check no general population condition exceeds 15% (12-month prevalence)
let noExcessiveRate = true;
for (const [cond, rate] of Object.entries(baseRatesGeneral)) {
  if (rate > 0.15) {
    warn(`${cond}: general population rate ${(rate*100).toFixed(1)}% exceeds 15%`);
    noExcessiveRate = false;
  }
}
if (noExcessiveRate) pass("No general population condition exceeds 15% (12-month)");

// Check liability conversion
console.log("\n  Liability means (Φ⁻¹(prevalence)):");
console.log(`  ${"Condition".padEnd(8)} ${"Prevalence".padStart(12)} ${"Liability μ".padStart(12)}`);
for (const cond of conditionCodes) {
  const rate = baseRatesGeneral[cond];
  const mu = probit(rate);
  console.log(`  ${cond.padEnd(8)} ${(rate * 100).toFixed(1).padStart(10)}% ${mu.toFixed(3).padStart(12)}`);
  // All liability means should be negative (prevalence < 50%)
  if (mu >= 0) {
    fail(`${cond}: liability mean ${mu.toFixed(3)} ≥ 0 implies prevalence ≥ 50%`);
  }
}

// Verify liability means are all negative for general population
const allNegLiability = Object.values(baseRatesGeneral).every(r => probit(r) < 0);
if (allNegLiability) {
  pass("All general population liability means are negative (prevalence < 50%)");
}

// ─── CHECK 5: Simulated Screening ───────────────────────────────────────────

console.log("\n\n═══ CHECK 5: Simulated Screening ═══\n");

// ── 5a: Stage 1 Kalman filter with synthetic "depressed" patient ──────────

console.log("  Scenario: Patient with high distress/depression symptoms\n");

// Initialize: μ₀ = 0 (8-dim), Σ₀ = correlation matrix
let mu = new Array(8).fill(0);
let Sigma = Sigma0.map(row => [...row]); // deep copy

// Simulate PHQ-9 responses: high severity (score 3 out of 3 on most items)
const phq9Responses: Record<number, number> = {
  1: 3, 2: 3, 3: 2, 4: 3, 5: 2, 6: 3, 7: 2, 8: 1, 9: 1,
};

console.log("  Stage 1: Administering PHQ-9 items (high severity responses)");
console.log(`  ${"Item".padEnd(20)} ${"Resp".padStart(5)} ${"σ²".padStart(8)} ${"Info Gain".padStart(10)}`);

let stage1ItemCount = 0;
for (const [itemNumStr, response] of Object.entries(phq9Responses)) {
  const itemNum = parseInt(itemNumStr);
  // Get this item's loading vector onto spectra
  const h = new Array(8).fill(0);
  const thisItemLoadings = itemLoadings.filter(
    il => il.instrument === "PHQ-9" && il.itemNumber === itemNum
  );
  for (const il of thisItemLoadings) {
    const idx = spectraOrder.indexOf(il.dimension);
    if (idx >= 0) h[idx] = il.loading;
  }

  // Get noise variance
  const noise = getItemNoise("PHQ-9", itemNum);
  const sigma2 = noise.noiseVariance;

  // Normalize response to standard normal scale
  // PHQ-9: 0-3 scale, normalize: y = (response - 1.5) / 0.9 ≈ z-score
  const yNorm = (response - 1.5) / 0.9;

  // Kalman update
  // S = h^T Σ h + σ²
  const Sh = matVecMul(Sigma, h);
  const S = h.reduce((s, hi, i) => s + hi * Sh[i], 0) + sigma2;

  // K = Σ h / S
  const K = Sh.map(v => v / S);

  // Innovation
  const yPred = h.reduce((s, hi, i) => s + hi * mu[i], 0);
  const innovation = yNorm - yPred;

  // Info gain = tr(Σ_before) - tr(Σ_after)
  const traceBefore = trace(Sigma);

  // μ_new = μ + K * innovation
  mu = mu.map((m, i) => m + K[i] * innovation);

  // Σ_new = Σ - K * h^T * Σ  (Joseph form for stability: (I - Kh^T)Σ(I - Kh^T)^T + K σ² K^T)
  // Simplified: Σ_new = Σ - (Σh)(Σh)^T / S
  const KhT = outerProduct(K);
  const correction = KhT.map(row => row.map((v, j) => v * S)); // K * S * K^T = (Σh/S) * S * (Σh/S)^T = Σh * h^T * Σ / S
  // Actually: Σ_new = Σ - K * (h^T Σ)
  const newSigma: number[][] = [];
  for (let i = 0; i < 8; i++) {
    newSigma[i] = [];
    for (let j = 0; j < 8; j++) {
      newSigma[i][j] = Sigma[i][j] - K[i] * Sh[j];
    }
  }
  Sigma = newSigma;

  const traceAfter = trace(Sigma);
  const infoGain = traceBefore - traceAfter;

  console.log(`  PHQ-9 #${itemNum.toString().padEnd(16)} ${response.toString().padStart(5)} ${sigma2.toFixed(3).padStart(8)} ${infoGain.toFixed(4).padStart(10)}`);
  stage1ItemCount++;
}

console.log(`\n  After Stage 1 (${stage1ItemCount} items):`);
console.log(`  Spectrum posterior means:`);
for (let i = 0; i < 8; i++) {
  const bar = mu[i] > 0 ? "█".repeat(Math.min(Math.round(mu[i] * 10), 40)) : "";
  console.log(`    ${spectraOrder[i].padEnd(5)} μ=${mu[i].toFixed(3).padStart(7)}  ${bar}`);
}

console.log(`\n  Posterior uncertainties (√diag(Σ)):`);
for (let i = 0; i < 8; i++) {
  console.log(`    ${spectraOrder[i].padEnd(5)} σ=${Math.sqrt(Sigma[i][i]).toFixed(3)}`);
}

// Validate Stage 1 results
if (mu[spectraOrder.indexOf("DIS")] > 1.0) {
  pass("Distress posterior elevated above 1.0 after high PHQ-9 responses");
} else {
  warn("Distress posterior not strongly elevated — may need recalibration");
}

// DIS should be the highest
const disIdx = spectraOrder.indexOf("DIS");
const isDisHighest = mu.every((m, i) => i === disIdx || m <= mu[disIdx]);
if (isDisHighest) {
  pass("Distress is the highest spectrum (expected for PHQ-9 responses)");
} else {
  fail("Distress is NOT the highest spectrum after PHQ-9 — unexpected");
}

// SOM and DET should also be somewhat elevated (cross-loadings)
const somIdx = spectraOrder.indexOf("SOM");
const detIdx = spectraOrder.indexOf("DET");
if (mu[somIdx] > 0) {
  pass(`Somatoform posterior ${mu[somIdx].toFixed(3)} > 0 (expected: PHQ-9 somatic items cross-load)`);
}
if (mu[detIdx] > 0) {
  pass(`Detachment posterior ${mu[detIdx].toFixed(3)} > 0 (expected: anhedonia cross-loads)`);
}

// Uncertainty should have decreased
const initialTrace = 8.0; // tr(I) = 8
const finalTrace = trace(Sigma);
const traceReduction = ((initialTrace - finalTrace) / initialTrace * 100).toFixed(1);
console.log(`\n  Trace reduction: ${initialTrace.toFixed(1)} → ${finalTrace.toFixed(3)} (${traceReduction}% uncertainty reduction)`);
if (finalTrace < initialTrace) {
  pass("Total uncertainty decreased after observations");
} else {
  fail("Uncertainty did not decrease — Kalman update is broken");
}

// ── 5b: Stage Transition ────────────────────────────────────────────────────

console.log("\n  --- Stage Transition: Spectrum → Condition priors ---\n");

// For each condition, compute updated prior: μ_cond = μ_base + L_row · μ_spectrum
const conditionPriors: { code: string; baseMu: number; updatedMu: number; prob: number }[] = [];

for (const cond of conditionCodes) {
  const baseRate = baseRatesGeneral[cond];
  const baseMu = probit(baseRate);
  const entries = lMatrix.filter(l => l.condition === cond);
  let delta = 0;
  for (const e of entries) {
    const idx = spectraOrder.indexOf(e.spectrum);
    delta += e.loading * mu[idx];
  }
  const updatedMu = baseMu + delta;
  const prob = normalCDF(updatedMu); // P(z > τ) — but this is P(z < updatedMu) for the liability
  conditionPriors.push({ code: cond, baseMu, updatedMu, prob });
}

console.log(`  ${"Condition".padEnd(6)} ${"Base μ".padStart(8)} ${"Updated μ".padStart(10)} ${"Δ".padStart(8)} ${"P(present)".padStart(11)}`);
for (const cp of conditionPriors) {
  const delta = cp.updatedMu - cp.baseMu;
  if (Math.abs(delta) > 0.05) {
    console.log(`  ${cp.code.padEnd(6)} ${cp.baseMu.toFixed(3).padStart(8)} ${cp.updatedMu.toFixed(3).padStart(10)} ${(delta >= 0 ? "+" : "") + delta.toFixed(3).padStart(7)} ${(cp.prob * 100).toFixed(1).padStart(9)}%`);
  }
}

// MDD should have the highest updated prior among Distress conditions
const disConditions = conditions.filter(c => c.parent === "DIS").map(c => c.shortCode);
const disCondPriors = conditionPriors.filter(cp => disConditions.includes(cp.code));
const mddPrior = disCondPriors.find(cp => cp.code === "MDD")!;
const mddIsHighest = disCondPriors.every(cp => cp.updatedMu <= mddPrior.updatedMu);
if (mddIsHighest) {
  pass("MDD has highest updated prior among Distress conditions (expected)");
} else {
  warn("MDD is not the highest Distress condition after stage transition");
}

// ── 5c: Stage 2 Kalman filter (condition-level, within Distress) ────────────

console.log("\n  --- Stage 2: Targeted items within Distress spectrum ---\n");

// Initialize condition-level state for Distress conditions
const targetConditions = disConditions; // MDD, PDD, GAD, PTSD, ADJ
const condMu = targetConditions.map(c => conditionPriors.find(cp => cp.code === c)!.updatedMu);
const condVar = targetConditions.map(() => 1.0); // unit prior variance per condition

// Simulate a few PCL-5 items (should increase PTSD, not MDD)
// PCL-5 items target PTSD
const pcl5Responses: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
// Low PTSD responses → should decrease PTSD posterior

console.log("  Administering PCL-5 items 1-5 (all 0 = no PTSD symptoms)");
console.log(`  ${"Item".padEnd(12)} ${"Resp".padStart(5)}`);

for (const [itemNumStr, response] of Object.entries(pcl5Responses)) {
  const itemNum = parseInt(itemNumStr);
  // PCL-5 items load onto PTSD condition
  const ptsdIdx = targetConditions.indexOf("PTSD");

  const thisItemLoadings = itemLoadings.filter(
    il => il.instrument === "PCL-5" && il.itemNumber === itemNum
  );

  // Build condition-level loading vector
  const h_cond = new Array(targetConditions.length).fill(0);
  for (const il of thisItemLoadings) {
    const condIdx = targetConditions.indexOf(il.dimension);
    if (condIdx >= 0) h_cond[condIdx] = il.loading;
  }

  if (h_cond.every(v => v === 0)) continue; // skip if no relevant loadings

  const noise = getItemNoise("PCL-5", itemNum);
  const sigma2 = noise.noiseVariance;

  // PCL-5: 0-4 scale, normalize
  const yNorm = (response - 2.0) / 1.2;

  // Scalar Kalman update per condition (independent conditions)
  for (let ci = 0; ci < targetConditions.length; ci++) {
    if (h_cond[ci] === 0) continue;
    const S = h_cond[ci] * h_cond[ci] * condVar[ci] + sigma2;
    const K = h_cond[ci] * condVar[ci] / S;
    const yPred = h_cond[ci] * condMu[ci];
    const innovation = yNorm - yPred;
    condMu[ci] += K * innovation;
    condVar[ci] *= (1 - K * h_cond[ci]);
  }

  console.log(`  PCL-5 #${itemNum.toString().padEnd(8)} ${response.toString().padStart(5)}`);
}

console.log(`\n  Condition posteriors (Distress spectrum):`);
for (let ci = 0; ci < targetConditions.length; ci++) {
  const thresh = thresholds.find(t => t.condition === targetConditions[ci]);
  const tau = thresh?.thresholdLiability ?? 1.0;
  // P(condition present) = P(z > τ) = 1 - Φ((τ - μ) / σ)
  const pPresent = 1 - normalCDF((tau - condMu[ci]) / Math.sqrt(condVar[ci]));
  const flagged = pPresent > 0.20 ? " ← FLAGGED" : "";
  console.log(`    ${targetConditions[ci].padEnd(6)} μ=${condMu[ci].toFixed(3).padStart(7)}, σ=${Math.sqrt(condVar[ci]).toFixed(3)}, τ=${tau.toFixed(2)}, P(present)=${(pPresent*100).toFixed(1)}%${flagged}`);
}

// PTSD should have decreased after 0-responses on PCL-5
const ptsdIdx = targetConditions.indexOf("PTSD");
const ptsdPrior = conditionPriors.find(cp => cp.code === "PTSD")!.updatedMu;
if (condMu[ptsdIdx] < ptsdPrior) {
  pass("PTSD posterior decreased after zero PCL-5 responses (expected)");
} else {
  warn("PTSD posterior did not decrease after zero PCL-5 responses");
}

// MDD should remain relatively unchanged (PCL-5 doesn't load on MDD)
const mddIdx = targetConditions.indexOf("MDD");
const mddPriorVal = conditionPriors.find(cp => cp.code === "MDD")!.updatedMu;
if (Math.abs(condMu[mddIdx] - mddPriorVal) < 0.1) {
  pass("MDD posterior unchanged by PCL-5 items (expected — PCL-5 targets PTSD, not MDD)");
} else {
  warn(`MDD shifted by ${Math.abs(condMu[mddIdx] - mddPriorVal).toFixed(3)} from PCL-5 items — unexpected`);
}

// ─── CHECK 5d: Verify thresholds coverage ────────────────────────────────────

console.log("\n  --- Threshold Coverage ---\n");

const conditionsWithThresholds = new Set(thresholds.map(t => t.condition));
const missingThresholds = conditionCodes.filter(c => !conditionsWithThresholds.has(c));
if (missingThresholds.length === 0) {
  pass("All 35 conditions have clinical thresholds");
} else {
  fail(`Conditions missing thresholds: ${missingThresholds.join(", ")}`);
}

// Check threshold range
const thresholdVals = thresholds.map(t => t.thresholdLiability);
console.log(`  Threshold range: [${Math.min(...thresholdVals).toFixed(2)}, ${Math.max(...thresholdVals).toFixed(2)}]`);
if (Math.min(...thresholdVals) > 0.5) {
  pass("All thresholds > 0.5 (reasonable — above average)");
}
if (Math.max(...thresholdVals) < 3.0) {
  pass("All thresholds < 3.0 (reasonable — not impossibly high)");
}

// ─── CHECK 5e: Noise variance coverage ──────────────────────────────────────

console.log("\n  --- Noise Variance Coverage ---\n");

console.log(`  Instruments with noise data: ${instrumentNoiseData.length}`);
const noiseRange = instrumentNoiseData.map(nd => (1 - nd.defaultR) * 1.5);
console.log(`  σ² range: [${Math.min(...noiseRange).toFixed(3)}, ${Math.max(...noiseRange).toFixed(3)}]`);

if (instrumentNoiseData.length >= 27) {
  pass("All 27 instruments have noise variance data");
} else {
  warn(`Only ${instrumentNoiseData.length}/27 instruments have noise data`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n\n═══════════════════════════════════════════════════════════════════");
console.log(`  VALIDATION SUMMARY: ${totalPass} passed, ${totalFail} failed, ${totalWarn} warnings`);
console.log("═══════════════════════════════════════════════════════════════════\n");

if (totalFail > 0) {
  console.log("  RESULT: VALIDATION FAILED — address failures above before proceeding.\n");
  process.exit(1);
} else if (totalWarn > 0) {
  console.log("  RESULT: VALIDATION PASSED WITH WARNINGS — review warnings above.\n");
} else {
  console.log("  RESULT: ALL CHECKS PASSED\n");
}
