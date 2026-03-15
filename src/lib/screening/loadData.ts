import { prisma } from "@/lib/prisma";
import type { PopulationType, InstrumentTier } from "@/generated/prisma/enums";
import type {
  ReferenceData,
  SpectrumRef,
  ConditionRef,
  ConditionSpectrumLoadingRef,
  BaseRateRef,
  ItemRef,
  ItemLoadingRef,
  ItemOverlapRef,
  ThresholdRef,
} from "./types";

// ─── Individual Loaders ─────────────────────────────────────────────────────

/** Load all spectra (level = SPECTRUM), ordered by sortOrder. */
export async function loadSpectra(): Promise<SpectrumRef[]> {
  const rows = await prisma.dimension.findMany({
    where: { level: "SPECTRUM" },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, shortCode: true, sortOrder: true },
  });
  return rows;
}

/** Load conditions, optionally filtered to specific parent spectra. */
export async function loadConditions(spectrumIds?: string[]): Promise<ConditionRef[]> {
  const rows = await prisma.dimension.findMany({
    where: {
      level: "CONDITION",
      ...(spectrumIds ? { parentId: { in: spectrumIds } } : {}),
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, shortCode: true, parentId: true, sortOrder: true },
  });
  // parentId is guaranteed non-null for CONDITIONS
  return rows as ConditionRef[];
}

/** Load the spectrum correlation matrix as a Map<"idA:idB", correlation>. */
export async function loadCorrelationMatrix(): Promise<Map<string, number>> {
  const rows = await prisma.dimensionCorrelation.findMany({
    select: { dimensionAId: true, dimensionBId: true, correlation: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(`${r.dimensionAId}:${r.dimensionBId}`, r.correlation);
  }
  return map;
}

/** Load condition-spectrum loadings. */
export async function loadConditionSpectrumLoadings(): Promise<ConditionSpectrumLoadingRef[]> {
  const rows = await prisma.conditionSpectrumLoading.findMany({
    select: {
      conditionId: true,
      spectrumId: true,
      loading: true,
      isPrimary: true,
    },
  });
  return rows;
}

/** Load base rates for a given population type. */
export async function loadBaseRates(populationType: PopulationType): Promise<BaseRateRef[]> {
  const rows = await prisma.baseRate.findMany({
    where: { populationType },
    select: {
      dimensionId: true,
      populationType: true,
      prevalence: true,
      liabilityMean: true,
    },
  });
  return rows;
}

/** Load items with their instrument tier, optionally filtered by tier. */
export async function loadItems(tier?: InstrumentTier): Promise<ItemRef[]> {
  const rows = await prisma.item.findMany({
    where: tier ? { instrument: { tier } } : {},
    include: { instrument: { select: { tier: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    instrumentId: r.instrumentId,
    itemNumber: r.itemNumber,
    text: r.text,
    responseMin: r.responseMin,
    responseMax: r.responseMax,
    responseLabels: r.responseLabels as Record<string, string>,
    isReverseCoded: r.isReverseCoded,
    noiseVariance: r.noiseVariance,
    noiseInflationFactor: r.noiseInflationFactor,
    tags: r.tags,
    tier: r.instrument.tier,
    normativeMean: r.normativeMean ?? undefined,
    normativeSD: r.normativeSD ?? undefined,
    normativeResponseDist: r.normativeResponseDist.length > 0 ? r.normativeResponseDist : undefined,
  }));
}

/** Load item loadings, optionally filtered to specific items. */
export async function loadItemLoadings(itemIds?: string[]): Promise<ItemLoadingRef[]> {
  const rows = await prisma.itemLoading.findMany({
    where: itemIds ? { itemId: { in: itemIds } } : {},
    select: {
      itemId: true,
      dimensionId: true,
      loading: true,
      isPrimary: true,
    },
  });
  return rows;
}

/** Load item overlaps, optionally filtered to items in the given set. */
export async function loadItemOverlaps(itemIds?: string[]): Promise<ItemOverlapRef[]> {
  const rows = await prisma.itemOverlap.findMany({
    where: itemIds
      ? { OR: [{ itemAId: { in: itemIds } }, { itemBId: { in: itemIds } }] }
      : {},
    select: {
      itemAId: true,
      itemBId: true,
      overlapStrength: true,
      noiseInflationMultiplier: true,
    },
  });
  return rows;
}

/** Load all clinical thresholds. */
export async function loadThresholds(): Promise<ThresholdRef[]> {
  const rows = await prisma.clinicalThreshold.findMany({
    select: {
      dimensionId: true,
      thresholdLiability: true,
      sensitivity: true,
      specificity: true,
    },
  });
  return rows;
}

// ─── Reference Data Cache ───────────────────────────────────────────────────

/**
 * Module-level cache for reference data, keyed by populationType.
 * Reference data (spectra, conditions, items, loadings, thresholds, etc.) is
 * static for the lifetime of the server process — it never changes during a
 * screening session. Caching avoids 9 DB round-trips per patient response.
 */
const refDataCache = new Map<
  PopulationType,
  { referenceData: ReferenceData; correlations: Map<string, number> }
>();

/** Clear the cache (useful for tests or after seeding new data). */
export function clearReferenceDataCache(): void {
  refDataCache.clear();
}

// ─── Full Reference Data Bundle ─────────────────────────────────────────────

/**
 * Load all reference data needed for a screening session.
 * Returns the ReferenceData bundle with pre-built lookup indices,
 * plus the correlation map needed by initState().
 *
 * Results are cached in-memory by populationType — subsequent calls for the
 * same population return instantly without hitting the database.
 */
export async function loadFullReferenceData(populationType: PopulationType): Promise<{
  referenceData: ReferenceData;
  correlations: Map<string, number>;
}> {
  const cached = refDataCache.get(populationType);
  if (cached) return cached;
  // Load everything in parallel
  const [spectra, conditions, conditionSpectrumLoadings, baseRates, items, itemLoadings, itemOverlaps, thresholds, correlations] =
    await Promise.all([
      loadSpectra(),
      loadConditions(),
      loadConditionSpectrumLoadings(),
      loadBaseRates(populationType),
      loadItems(),
      loadItemLoadings(),
      loadItemOverlaps(),
      loadThresholds(),
      loadCorrelationMatrix(),
    ]);

  // Build derived indices
  const spectrumIndex = new Map<string, number>();
  spectra.forEach((s, i) => spectrumIndex.set(s.id, i));

  const conditionIndex = new Map<string, number>();
  conditions.forEach((c, i) => conditionIndex.set(c.id, i));

  const itemLoadingsByItem = new Map<string, ItemLoadingRef[]>();
  for (const il of itemLoadings) {
    const existing = itemLoadingsByItem.get(il.itemId);
    if (existing) {
      existing.push(il);
    } else {
      itemLoadingsByItem.set(il.itemId, [il]);
    }
  }

  const itemOverlapsByItem = new Map<string, ItemOverlapRef[]>();
  for (const io of itemOverlaps) {
    // Index both directions
    for (const id of [io.itemAId, io.itemBId]) {
      const existing = itemOverlapsByItem.get(id);
      if (existing) {
        existing.push(io);
      } else {
        itemOverlapsByItem.set(id, [io]);
      }
    }
  }

  const thresholdByCondition = new Map<string, ThresholdRef>();
  for (const t of thresholds) {
    thresholdByCondition.set(t.dimensionId, t);
  }

  const conditionsBySpectrum = new Map<string, ConditionRef[]>();
  for (const c of conditions) {
    const existing = conditionsBySpectrum.get(c.parentId);
    if (existing) {
      existing.push(c);
    } else {
      conditionsBySpectrum.set(c.parentId, [c]);
    }
  }

  const referenceData: ReferenceData = {
    spectra,
    conditions,
    conditionSpectrumLoadings,
    baseRates,
    items,
    itemLoadings,
    itemOverlaps,
    thresholds,
    spectrumIndex,
    conditionIndex,
    itemLoadingsByItem,
    itemOverlapsByItem,
    thresholdByCondition,
    conditionsBySpectrum,
  };

  const result = { referenceData, correlations };
  refDataCache.set(populationType, result);
  return result;
}
