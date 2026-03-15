/**
 * Fix script: Set all clinical thresholds to 0 and add condition-level loadings
 * for broad screening instruments.
 *
 * Threshold fix: The liability model uses μ = Φ⁻¹(prevalence) as the condition
 * prior mean. For the prior probability to recover the base rate, the threshold
 * must be 0: P(z > 0 | z ~ N(Φ⁻¹(prev), 1)) = 1 - Φ(-Φ⁻¹(prev)) = prev. ✓
 *
 * Dual-tier fix: PHQ-9 items load on DIS spectrum but not on MDD condition,
 * so MDD can never be updated in stage 2. Add condition-level loadings so
 * remaining PHQ-9 items (not used in stage 1) can update MDD directly in stage 2.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ═══════════════════════════════════════════════════════════════════════════
  // FIX 1: Set all thresholds to 0
  // ═══════════════════════════════════════════════════════════════════════════

  const updated = await prisma.clinicalThreshold.updateMany({
    data: { thresholdLiability: 0.0 },
  });
  console.log(`Updated ${updated.count} thresholds to 0.0`);

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX 2: Add condition-level loadings for broad screening instruments
  // ═══════════════════════════════════════════════════════════════════════════

  // Get condition IDs
  const conditions = await prisma.dimension.findMany({
    where: { level: "CONDITION" },
    select: { id: true, shortCode: true },
  });
  const condMap = new Map(conditions.map((c) => [c.shortCode, c.id]));

  const mddId = condMap.get("MDD")!;
  const pddId = condMap.get("PDD")!;
  const gadId = condMap.get("GAD")!;
  const ptsdId = condMap.get("PTSD")!;

  // Get instruments
  const phq9 = await prisma.instrument.findFirst({ where: { name: "PHQ-9" } });
  const gad7 = await prisma.instrument.findFirst({ where: { name: "GAD-7" } });
  const pcPtsd5 = await prisma.instrument.findFirst({ where: { name: "PC-PTSD-5" } });

  if (!phq9 || !gad7 || !pcPtsd5) {
    throw new Error("Missing instruments: PHQ-9, GAD-7, or PC-PTSD-5");
  }

  // Get items for each instrument
  const phq9Items = await prisma.item.findMany({
    where: { instrumentId: phq9.id },
    include: { loadings: true },
    orderBy: { itemNumber: "asc" },
  });
  const gad7Items = await prisma.item.findMany({
    where: { instrumentId: gad7.id },
    include: { loadings: true },
    orderBy: { itemNumber: "asc" },
  });
  const pcPtsd5Items = await prisma.item.findMany({
    where: { instrumentId: pcPtsd5.id },
    include: { loadings: true },
    orderBy: { itemNumber: "asc" },
  });

  // Get DIS spectrum ID for finding spectrum loadings
  const disSpectrum = await prisma.dimension.findFirst({
    where: { shortCode: "DIS", level: "SPECTRUM" },
  });
  if (!disSpectrum) throw new Error("DIS spectrum not found");

  let created = 0;

  // PHQ-9 → MDD: use DIS loading as MDD loading (PHQ-9 IS a depression measure)
  // PHQ-9 → PDD: use 0.8× DIS loading (PHQ-9 measures acute MDD better than chronic PDD)
  for (const item of phq9Items) {
    const disLoading = item.loadings.find((l) => l.dimensionId === disSpectrum.id);
    if (!disLoading) continue;

    // Check if condition loading already exists
    const existingMDD = item.loadings.find((l) => l.dimensionId === mddId);
    if (!existingMDD) {
      await prisma.itemLoading.create({
        data: {
          itemId: item.id,
          dimensionId: mddId,
          loading: disLoading.loading,
          isPrimary: true,
          derivationMethod: "CHAINED",
          withinInstrumentLoading: disLoading.loading,
          sourceQuality: "DERIVED",
          sources: [{ note: "PHQ-9 DIS loading used as MDD condition loading" }],
        },
      });
      created++;
    }

    const existingPDD = item.loadings.find((l) => l.dimensionId === pddId);
    if (!existingPDD) {
      await prisma.itemLoading.create({
        data: {
          itemId: item.id,
          dimensionId: pddId,
          loading: disLoading.loading * 0.8,
          isPrimary: false,
          derivationMethod: "CHAINED",
          withinInstrumentLoading: disLoading.loading,
          sourceQuality: "DERIVED",
          sources: [{ note: "PHQ-9 DIS loading × 0.8 for PDD (acute vs chronic)" }],
        },
      });
      created++;
    }
  }
  console.log(`PHQ-9: added condition loadings (${created} so far)`);

  // GAD-7 → GAD: use DIS loading as GAD loading (GAD-7 IS an anxiety measure)
  for (const item of gad7Items) {
    const disLoading = item.loadings.find((l) => l.dimensionId === disSpectrum.id);
    if (!disLoading) continue;

    const existing = item.loadings.find((l) => l.dimensionId === gadId);
    if (!existing) {
      await prisma.itemLoading.create({
        data: {
          itemId: item.id,
          dimensionId: gadId,
          loading: disLoading.loading,
          isPrimary: true,
          derivationMethod: "CHAINED",
          withinInstrumentLoading: disLoading.loading,
          sourceQuality: "DERIVED",
          sources: [{ note: "GAD-7 DIS loading used as GAD condition loading" }],
        },
      });
      created++;
    }
  }
  console.log(`GAD-7: added condition loadings (${created} so far)`);

  // PC-PTSD-5 → PTSD: use DIS loading as PTSD loading
  for (const item of pcPtsd5Items) {
    const disLoading = item.loadings.find((l) => l.dimensionId === disSpectrum.id);
    if (!disLoading) continue;

    const existing = item.loadings.find((l) => l.dimensionId === ptsdId);
    if (!existing) {
      await prisma.itemLoading.create({
        data: {
          itemId: item.id,
          dimensionId: ptsdId,
          loading: disLoading.loading,
          isPrimary: true,
          derivationMethod: "CHAINED",
          withinInstrumentLoading: disLoading.loading,
          sourceQuality: "DERIVED",
          sources: [{ note: "PC-PTSD-5 DIS loading used as PTSD condition loading" }],
        },
      });
      created++;
    }
  }
  console.log(`PC-PTSD-5: added condition loadings (${created} total)`);

  // Verify
  const totalLoadings = await prisma.itemLoading.count();
  console.log(`\nTotal item loadings in DB: ${totalLoadings}`);

  // Verify threshold fix
  const sampleThreshold = await prisma.clinicalThreshold.findFirst({
    include: { dimension: { select: { shortCode: true } } },
  });
  console.log(`Sample threshold check: ${sampleThreshold?.dimension.shortCode} = ${sampleThreshold?.thresholdLiability}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
