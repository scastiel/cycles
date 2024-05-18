import { Room } from '@/app/rooms/[roomId]/room'

export default function RoomPage({
  params: { roomId },
}: {
  params: { roomId: string }
}) {
  return <Room roomId={roomId} />
}
