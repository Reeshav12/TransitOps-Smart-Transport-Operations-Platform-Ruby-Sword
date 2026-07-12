import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaClient: PrismaClient

const url = process.env.DATABASE_URL || ''

if (url.startsWith('libsql://') || url.startsWith('http://') || url.startsWith('https://')) {
  const adapter = new PrismaLibSql({
    url: url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
  
  // Set to dummy SQLite file path so the query engine validation succeeds
  process.env.DATABASE_URL = 'file:./dev.db'
  
  prismaClient = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  })
} else {
  prismaClient = new PrismaClient({
    log: ['error', 'warn'],
  })
}

export const db = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
