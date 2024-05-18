'use client'
import { ClientSideSuspense } from '@liveblocks/react'
import {
  Pitch,
  RoomProvider,
  Storage,
  useMutation,
  useOthers,
  useSelf,
  useStorage,
} from '../../../liveblocks.config'
import { LiveList, LiveObject } from '@liveblocks/client'
import { PropsWithChildren, ReactNode, useState } from 'react'
import { nanoid } from 'nanoid'

export function Room({ roomId }: { roomId: string }) {
  return (
    <RoomProvider
      id={decodeURIComponent(roomId)}
      initialPresence={{}}
      initialStorage={{
        info: new LiveObject({ name: 'New board' }),
        pitches: new LiveList(),
      }}
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

  return (
    <>
      <div className="p-2">
        <p>There are {others.length} other user(s) online.</p>
        <p>
          You are: <strong>{self.info.fullName}</strong>
        </p>
      </div>
      <div className="p-2 border-t">
        <div className="flex gap-2 items-baseline">
          <span>Board name:</span> <BoardName />
        </div>
        <PitchList />
      </div>
      <div className="p-2 border-t">
        <h3>Archived pitches</h3>
        <ArchivedPitchList />
      </div>
    </>
  )
}

function PitchList() {
  const pitches = useStorage((root) =>
    root.pitches.filter((pitch) => !pitch.archived)
  )
  return pitches.length > 0 ? (
    <ul className="flex flex-col gap-1">
      {pitches.map((pitch) => (
        <PitchListItem key={pitch.id} pitch={pitch} />
      ))}
      <li>
        <CreatePitchButton>Create new</CreatePitchButton>
      </li>
    </ul>
  ) : (
    <p>
      No pitch yet. <CreatePitchButton>Create the first one</CreatePitchButton>
    </p>
  )
}

function ArchivedPitchList() {
  const pitches = useStorage((root) =>
    root.pitches.filter((pitch) => pitch.archived)
  )
  return pitches.length > 0 ? (
    <ul className="flex flex-col gap-1">
      {pitches.map((pitch) => (
        <PitchListItem key={pitch.id} pitch={pitch} />
      ))}
    </ul>
  ) : (
    <p>No archived pitch yet.</p>
  )
}

function PitchListItem({ pitch }: { pitch: Pitch }) {
  const updatePitchTitle = useMutation(({ storage }, title: string) => {
    storage
      .get('pitches')
      .find((p) => p.get('id') === pitch.id)
      ?.set('title', title)
  }, [])

  return (
    <li className="flex gap-2 items-center">
      <StringViewAndEditor value={pitch.title} updateValue={updatePitchTitle} />
      <ArchivePitchButton pitchId={pitch.id} archived={pitch.archived ?? false}>
        Archive
      </ArchivePitchButton>
    </li>
  )
}

function ArchivePitchButton({
  pitchId,
  archived,
  children,
}: PropsWithChildren<{ pitchId: string; archived: boolean }>) {
  const archivePitch = useMutation(({ storage }) => {
    storage
      .get('pitches')
      .find((pitch) => pitch.get('id') === pitchId)
      ?.set('archived', !archived)
  }, [])

  return (
    <button
      className="px-2 py-1 border rounded"
      type="button"
      onClick={archivePitch}
    >
      {archived ? 'Restore' : 'Archive'}
    </button>
  )
}

function CreatePitchButton({ children }: PropsWithChildren<{}>) {
  const createPitch = useMutation(({ storage }) => {
    storage
      .get('pitches')
      .push(new LiveObject({ id: nanoid(), title: 'New pitch' }))
  }, [])

  return (
    <button
      className="px-2 py-1 border rounded"
      type="button"
      onClick={createPitch}
    >
      {children}
    </button>
  )
}

function StringViewAndEditor({
  value,
  updateValue,
}: {
  value: string
  updateValue: (value: string) => void
}) {
  const [editMode, setEditMode] = useState(false)

  if (editMode) {
    return (
      <BoardNameEditor
        name={value}
        updateName={updateValue}
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
      {value}
    </h2>
  )
}

function BoardName() {
  const name = useStorage((root) => root.info.name)
  const updateName = useMutation(({ storage }, name: string) => {
    storage.get('info').set('name', name)
  }, [])

  return <StringViewAndEditor value={name} updateValue={updateName} />
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
