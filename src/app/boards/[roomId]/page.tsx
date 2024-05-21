import { Room } from '@/app/boards/[roomId]/room'

export default function RoomPage({
  params: { roomId },
}: {
  params: { roomId: string }
}) {
  return <Room roomId={roomId} />
}
