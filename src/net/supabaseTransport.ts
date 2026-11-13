import type { Difficulty } from '../engine/types'
import type { Transport } from './transport'

// Filled in by Phase 7.
export async function createHostTransport(_opts: { difficulty: Difficulty; name: string }): Promise<Transport & { code: string }> {
  throw new Error('online play not available yet')
}
export async function createClientTransport(_opts: { code: string; name: string }): Promise<Transport> {
  throw new Error('online play not available yet')
}
