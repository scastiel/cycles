'use client'
import { ClientSideSuspense } from '@liveblocks/react'
import {
  RoomProvider,
  useMutation,
  useOthers,
  useSelf,
  useStorage,
} from '../../../liveblocks.config'
import { LiveObject } from '@liveblocks/client'
import { useState } from 'react'

export function Room({ roomId }: { roomId: string }) {
  return (
    <RoomProvider
      id={decodeURIComponent(roomId)}
      initialPresence={{}}
      initialStorage={{ info: new LiveObject({ name: 'New board' }) }}
    >
      <ClientSideSuspense fallback={<div>Loading…</div>}>
        {() => <RoomContent />}
      </ClientSideSuspense>
    </RoomProvider>
  )
}

function RoomContent() {
  const others = useOthers()
  const self = useSelf()

  const info = useStorage((root) => root.info)

  const updateName = useMutation(({ storage }, name: string) => {
    storage.get('info').set('name', name)
  }, [])

  return (
    <>
      <div className="p-2">
        <p>There are {others.length} other user(s) online.</p>
        <p>
          You are: <strong>{self.info.fullName}</strong>
        </p>
      </div>
      <div className="p-2 border-t">
        <BoardName name={info.name} updateName={updateName} />
      </div>
    </>
  )
}

function BoardName({
  name,
  updateName,
}: {
  name: string
  updateName: (name: string) => void
}) {
  const [editMode, setEditMode] = useState(false)

  if (editMode) {
    return (
      <BoardNameEditor
        name={name}
        updateName={updateName}
        cancel={() => setEditMode(false)}
      />
    )
  }

  return (
    <h2
      role="button"
      onClick={() => {
        setEditMode(true)
      }}
      className="hover:bg-slate-50 p-1 rounded border border-transparent"
    >
      {name}
    </h2>
  )
}

function BoardNameEditor({
  name,
  updateName,
  cancel,
}: {
  name: string
  updateName: (name: string) => void
  cancel: () => void
}) {
  const [draftName, setDraftName] = useState(name)

  return (
    <form
      className="flex gap-1"
      onSubmit={() => {
        updateName(draftName)
        cancel()
      }}
    >
      <input
        className="px-2 py-1 border rounded"
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
      />
      <button className="px-2 py-1 border rounded" type="submit">
        Save
      </button>
      <button
        type="button"
        className="px-2 py-1 border rounded"
        onClick={() => cancel()}
      >
        Cancel
      </button>
    </form>
  )
}
