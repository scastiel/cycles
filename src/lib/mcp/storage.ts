import { liveblocks } from '@/lib/liveblocks'
import type { JsonObject } from '@liveblocks/node'

/**
 * Read room storage as plain JSON (pitches, scopes, tasks become arrays).
 */
export async function getStorage(roomId: string): Promise<JsonObject> {
  return liveblocks.getStorageDocument(roomId, 'json')
}

/**
 * Read room storage as LSON (preserves LiveObject/LiveList type metadata).
 */
export async function getStorageLson(roomId: string) {
  return liveblocks.getStorageDocument(roomId, 'plain-lson')
}

/**
 * Write storage by reinitializing with modified LSON.
 * This briefly disconnects live users (they auto-reconnect).
 *
 * Steps: delete existing storage, then initialize with new data.
 */
export async function writeStorageLson(
  roomId: string,
  lson: Record<string, unknown>
) {
  await liveblocks.deleteStorageDocument(roomId)
  await liveblocks.initializeStorageDocument(
    roomId,
    lson as Parameters<typeof liveblocks.initializeStorageDocument>[1]
  )
}
