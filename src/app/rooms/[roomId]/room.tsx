'use client'
import { ClientSideSuspense } from '@liveblocks/react'
import { RoomProvider, useOthers } from '../../../liveblocks.config'

export function Room({ roomId }: { roomId: string }) {
  return (
    <RoomProvider id={decodeURIComponent(roomId)} initialPresence={{}}>
      <ClientSideSuspense fallback={<div>Loading…</div>}>
        {() => <RoomContent />}
      </ClientSideSuspense>
    </RoomProvider>
  )
}

function RoomContent() {
  const others = useOthers()
  const userCount = others.length
  return <div className="p-2">There are {userCount} other user(s) online.</div>
}
