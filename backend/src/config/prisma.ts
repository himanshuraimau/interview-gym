import { PrismaClient } from '../generated/prisma/index.js'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Create the adapter with your database connection string
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

// Pass the adapter to PrismaClient
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
