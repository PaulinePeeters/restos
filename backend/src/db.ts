import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
console.log(
  "DEBUG: connectionString:",
  connectionString
    ? connectionString.replace(/:[^:]*@/, ":****@")
    : "UNDEFINED",
);

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
