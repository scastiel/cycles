'use server'

import { liveblocks } from '@/lib/liveblocks'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function archiveBoard(roomId: string) {
  const { orgId, userId } = await auth()
  if (!roomId.startsWith(`${orgId ?? userId}:`)) throw new Error('Unauthorized')

  await liveblocks.updateRoom(roomId, { metadata: { archived: 'yes' } })
  revalidatePath('/boards')
}

export async function restoreBoard(roomId: string) {
  const { orgId, userId } = await auth()
  if (!roomId.startsWith(`${orgId ?? userId}:`)) throw new Error('Unauthorized')

  await liveblocks.updateRoom(roomId, { metadata: { archived: null } })
  revalidatePath('/boards')
}
