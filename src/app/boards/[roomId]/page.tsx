import { Room } from '@/app/boards/[roomId]/room'
import { Suspense } from 'react'

export default function RoomPage({
  params: { roomId },
}: {
  params: { roomId: string }
}) {
  return <Room roomId={roomId} />
}
