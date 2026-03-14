-- Step 4a: Create enums, Instrument, Item, and related tables
-- Run via: npx tsx prisma/run-migration.ts

-- Create all enums needed by the schema (IF NOT EXISTS via DO blocks)
DO $$ BEGIN CREATE TYPE "DimensionLevel" AS ENUM ('SPECTRUM', 'CONDITION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SourceQuality" AS ENUM ('META_ANALYSIS', 'LARGE_STUDY', 'SMALL_STUDY', 'DERIVED', 'ESTIMATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PopulationType" AS ENUM ('GENERAL', 'CLINICAL', 'COLLEGE', 'PRIMARY_CARE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InstrumentTier" AS ENUM ('BROAD_SCREENING', 'TARGETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DerivationMethod" AS ENUM ('DIRECT', 'CHAINED', 'ESTIMATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OverlapStrength" AS ENUM ('HIGH', 'MODERATE', 'LOW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ContentTag" AS ENUM (
  'SLEEP', 'APPETITE', 'WEIGHT', 'FATIGUE', 'CONCENTRATION', 'PSYCHOMOTOR',
  'ANHEDONIA', 'DEPRESSED_MOOD', 'WORTHLESSNESS', 'SUICIDALITY',
  'WORRY', 'RESTLESSNESS', 'IRRITABILITY', 'MUSCLE_TENSION',
  'PANIC', 'AVOIDANCE', 'HYPERAROUSAL', 'INTRUSIONS', 'NUMBING', 'DISSOCIATION', 'FLASHBACKS',
  'SOMATIC_PAIN', 'SOMATIC_GI', 'SOMATIC_CARDIO', 'SOMATIC_NEURO',
  'ALCOHOL_USE', 'DRUG_USE', 'GAMBLING', 'IMPULSIVITY', 'AGGRESSION', 'RULE_BREAKING',
  'GRANDIOSITY', 'MANIPULATIVENESS', 'CALLOUSNESS',
  'HALLUCINATIONS', 'DELUSIONS', 'PARANOIA', 'DISORGANIZED_THOUGHT', 'MANIA', 'HYPOMANIA',
  'SOCIAL_WITHDRAWAL', 'EMOTIONAL_DETACHMENT', 'DEPERSONALIZATION', 'DEREALIZATION',
  'OBSESSIONS', 'COMPULSIONS', 'HOARDING', 'BODY_IMAGE', 'RESTRICTED_EATING', 'BINGE_EATING',
  'TICS', 'PERFECTIONISM', 'RIGIDITY', 'SENSORY_SENSITIVITY', 'INATTENTION', 'HYPERACTIVITY',
  'MAGICAL_THINKING', 'ECCENTRIC_BEHAVIOR', 'HEALTH_ANXIETY', 'PURGING',
  'RISK_TAKING', 'TALKATIVENESS', 'EMOTIONAL_LABILITY', 'HOSTILITY',
  'IRRESPONSIBILITY', 'WITHDRAWAL'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create Dimension table if not exists (needed for foreign keys)
CREATE TABLE IF NOT EXISTS "Dimension" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shortCode" TEXT NOT NULL,
  "level" "DimensionLevel" NOT NULL,
  "parentId" TEXT,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "Dimension_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Dimension_shortCode_key" ON "Dimension"("shortCode");
CREATE INDEX IF NOT EXISTS "Dimension_level_idx" ON "Dimension"("level");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Dimension_parentId_fkey'
  ) THEN
    ALTER TABLE "Dimension"
      ADD CONSTRAINT "Dimension_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "Dimension"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Create DimensionCorrelation table if not exists
CREATE TABLE IF NOT EXISTS "DimensionCorrelation" (
  "id" TEXT NOT NULL,
  "dimensionAId" TEXT NOT NULL,
  "dimensionBId" TEXT NOT NULL,
  "correlation" DOUBLE PRECISION NOT NULL,
  "sourceQuality" "SourceQuality" NOT NULL,
  "sources" JSONB NOT NULL,
  "notes" TEXT,
  CONSTRAINT "DimensionCorrelation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DimensionCorrelation_dimensionAId_dimensionBId_key" ON "DimensionCorrelation"("dimensionAId", "dimensionBId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'DimensionCorrelation_dimensionAId_fkey') THEN
    ALTER TABLE "DimensionCorrelation" ADD CONSTRAINT "DimensionCorrelation_dimensionAId_fkey" FOREIGN KEY ("dimensionAId") REFERENCES "Dimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'DimensionCorrelation_dimensionBId_fkey') THEN
    ALTER TABLE "DimensionCorrelation" ADD CONSTRAINT "DimensionCorrelation_dimensionBId_fkey" FOREIGN KEY ("dimensionBId") REFERENCES "Dimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Create ConditionSpectrumLoading table if not exists
CREATE TABLE IF NOT EXISTS "ConditionSpectrumLoading" (
  "id" TEXT NOT NULL,
  "conditionId" TEXT NOT NULL,
  "spectrumId" TEXT NOT NULL,
  "loading" DOUBLE PRECISION NOT NULL,
  "isPrimary" BOOLEAN NOT NULL,
  "sourceQuality" "SourceQuality" NOT NULL,
  "sources" JSONB NOT NULL,
  "notes" TEXT,
  CONSTRAINT "ConditionSpectrumLoading_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ConditionSpectrumLoading_conditionId_spectrumId_key" ON "ConditionSpectrumLoading"("conditionId", "spectrumId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ConditionSpectrumLoading_conditionId_fkey') THEN
    ALTER TABLE "ConditionSpectrumLoading" ADD CONSTRAINT "ConditionSpectrumLoading_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Dimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ConditionSpectrumLoading_spectrumId_fkey') THEN
    ALTER TABLE "ConditionSpectrumLoading" ADD CONSTRAINT "ConditionSpectrumLoading_spectrumId_fkey" FOREIGN KEY ("spectrumId") REFERENCES "Dimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Create BaseRate table if not exists
CREATE TABLE IF NOT EXISTS "BaseRate" (
  "id" TEXT NOT NULL,
  "dimensionId" TEXT NOT NULL,
  "populationType" "PopulationType" NOT NULL,
  "prevalence" DOUBLE PRECISION NOT NULL,
  "liabilityMean" DOUBLE PRECISION NOT NULL,
  "sourceQuality" "SourceQuality" NOT NULL,
  "sources" JSONB NOT NULL,
  "notes" TEXT,
  CONSTRAINT "BaseRate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BaseRate_dimensionId_populationType_key" ON "BaseRate"("dimensionId", "populationType");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'BaseRate_dimensionId_fkey') THEN
    ALTER TABLE "BaseRate" ADD CONSTRAINT "BaseRate_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "Dimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Create Instrument table if not exists
CREATE TABLE IF NOT EXISTS "Instrument" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "tier" "InstrumentTier" NOT NULL,
  "itemCount" INTEGER NOT NULL,
  "responseScale" JSONB NOT NULL,
  "scaleReliabilityIcc" DOUBLE PRECISION,
  "retestIntervalDays" INTEGER,
  "citation" TEXT NOT NULL,
  CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

-- Drop license column from Instrument if it exists
ALTER TABLE "Instrument" DROP COLUMN IF EXISTS "license";

-- Create unique index on Instrument.name
CREATE UNIQUE INDEX IF NOT EXISTS "Instrument_name_key" ON "Instrument"("name");

-- Create Item table if not exists
CREATE TABLE IF NOT EXISTS "Item" (
  "id" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "itemNumber" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "responseMin" INTEGER NOT NULL,
  "responseMax" INTEGER NOT NULL,
  "responseLabels" JSONB NOT NULL,
  "isReverseCoded" BOOLEAN NOT NULL DEFAULT false,
  "testRetestR" DOUBLE PRECISION,
  "noiseVariance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "noiseInflationFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
  "sourceQuality" "SourceQuality" NOT NULL DEFAULT 'ESTIMATED',
  "tags" "ContentTag"[] DEFAULT ARRAY[]::"ContentTag"[],
  CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Item(instrumentId, itemNumber)
CREATE UNIQUE INDEX IF NOT EXISTS "Item_instrumentId_itemNumber_key" ON "Item"("instrumentId", "itemNumber");

-- Add foreign key from Item to Instrument
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Item_instrumentId_fkey'
  ) THEN
    ALTER TABLE "Item"
      ADD CONSTRAINT "Item_instrumentId_fkey"
      FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Create ItemLoading table if not exists
CREATE TABLE IF NOT EXISTS "ItemLoading" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "dimensionId" TEXT NOT NULL,
  "loading" DOUBLE PRECISION NOT NULL,
  "isPrimary" BOOLEAN NOT NULL,
  "derivationMethod" "DerivationMethod" NOT NULL,
  "withinInstrumentLoading" DOUBLE PRECISION,
  "instrumentToDimensionLoading" DOUBLE PRECISION,
  "sourceQuality" "SourceQuality" NOT NULL,
  "sources" JSONB NOT NULL,
  "notes" TEXT,
  CONSTRAINT "ItemLoading_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItemLoading_itemId_dimensionId_key" ON "ItemLoading"("itemId", "dimensionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ItemLoading_itemId_fkey'
  ) THEN
    ALTER TABLE "ItemLoading"
      ADD CONSTRAINT "ItemLoading_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "Item"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ItemLoading_dimensionId_fkey'
  ) THEN
    ALTER TABLE "ItemLoading"
      ADD CONSTRAINT "ItemLoading_dimensionId_fkey"
      FOREIGN KEY ("dimensionId") REFERENCES "Dimension"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Create ItemOverlap table if not exists
CREATE TABLE IF NOT EXISTS "ItemOverlap" (
  "id" TEXT NOT NULL,
  "itemAId" TEXT NOT NULL,
  "itemBId" TEXT NOT NULL,
  "overlapStrength" "OverlapStrength" NOT NULL,
  "sharedTags" "ContentTag"[] DEFAULT ARRAY[]::"ContentTag"[],
  "description" TEXT NOT NULL,
  "noiseInflationMultiplier" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "ItemOverlap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItemOverlap_itemAId_itemBId_key" ON "ItemOverlap"("itemAId", "itemBId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ItemOverlap_itemAId_fkey'
  ) THEN
    ALTER TABLE "ItemOverlap"
      ADD CONSTRAINT "ItemOverlap_itemAId_fkey"
      FOREIGN KEY ("itemAId") REFERENCES "Item"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ItemOverlap_itemBId_fkey'
  ) THEN
    ALTER TABLE "ItemOverlap"
      ADD CONSTRAINT "ItemOverlap_itemBId_fkey"
      FOREIGN KEY ("itemBId") REFERENCES "Item"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Create ClinicalThreshold table if not exists
CREATE TABLE IF NOT EXISTS "ClinicalThreshold" (
  "id" TEXT NOT NULL,
  "dimensionId" TEXT NOT NULL,
  "thresholdLiability" DOUBLE PRECISION NOT NULL,
  "sensitivity" DOUBLE PRECISION NOT NULL,
  "specificity" DOUBLE PRECISION NOT NULL,
  "sourceInstrument" TEXT,
  "sourceCutoff" TEXT,
  "sources" JSONB NOT NULL,
  "notes" TEXT,
  CONSTRAINT "ClinicalThreshold_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ClinicalThreshold_dimensionId_fkey'
  ) THEN
    ALTER TABLE "ClinicalThreshold"
      ADD CONSTRAINT "ClinicalThreshold_dimensionId_fkey"
      FOREIGN KEY ("dimensionId") REFERENCES "Dimension"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
