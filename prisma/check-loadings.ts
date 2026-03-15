import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter } as any);

async function main() {
  const condLoadings = await p.itemLoading.count({ where: { dimension: { level: 'CONDITION' } } });
  const specLoadings = await p.itemLoading.count({ where: { dimension: { level: 'SPECTRUM' } } });
  console.log('Item loadings onto CONDITIONS:', condLoadings);
  console.log('Item loadings onto SPECTRA:', specLoadings);

  const targetedItems = await p.item.count({ where: { instrument: { tier: 'TARGETED' } } });
  const broadItems = await p.item.count({ where: { instrument: { tier: 'BROAD_SCREENING' } } });
  console.log('Targeted items:', targetedItems);
  console.log('Broad items:', broadItems);

  await p.$disconnect();
  await pool.end();
}
main();
