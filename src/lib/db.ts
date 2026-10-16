import postgres from 'postgres'
import type { Env } from '../types'

export type Sql = ReturnType<typeof postgres>

export function createSql(env: Env): Sql {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL
  if (!connectionString) {
    throw new Error('Database is not configured. Set Hyperdrive binding or DATABASE_URL.')
  }

  return postgres(connectionString, {
    max: 5,
    fetch_types: false,
    prepare: false,
  })
}
