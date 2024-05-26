import { Room } from '@/app/boards/[roomId]/room'
import { liveblocks } from '@/lib/liveblocks'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'

export default async function RoomPage({
  params: { roomId: slug },
}: {
  params: { roomId: string }
}) {
  const { userId, orgId } = auth()
  if (!userId) auth().redirectToSignIn()

  const roomPrefix = orgId ?? userId

  const roomId = `${roomPrefix}:${decodeURIComponent(slug)}`

  let boardTitle: string
  try {
    const room = await liveblocks.getRoom(roomId)
    boardTitle = String(room.metadata.title)
  } catch {
    notFound()
  }

  return <Room roomId={roomId} boardTitle={boardTitle} />
}
