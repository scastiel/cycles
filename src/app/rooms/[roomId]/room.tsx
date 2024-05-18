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
import { PropsWithChildren, createContext, useContext, useState } from 'react'
import { nanoid } from 'nanoid'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import assert from 'assert'
import { PitchView } from '@/app/rooms/[roomId]/pitch-view'
import { StringViewAndEditor } from './string-view-and-editor'

export function Room({ roomId }: { roomId: string }) {
  return (
    <RoomProvider
      id={decodeURIComponent(roomId)}
      initialPresence={{}}
      initialStorage={{
        info: new LiveObject({ name: 'New board' }),
        pitches: new LiveList(),
        scopes: new LiveList(),
        tasks: new LiveList(),
      }}
    >
      <ClientSideSuspense fallback={<div>Loading…</div>}>
        {() => (
          <SelectedPitchContextProvider>
            <RoomContent />
          </SelectedPitchContextProvider>
        )}
      </ClientSideSuspense>
    </RoomProvider>
  )
}

const SelectedPitchContext = createContext<{
  selectedPitchId: string | undefined
  setSelectedPitchId: (pitchId: string | undefined) => void
} | null>(null)

const useSelectedPitchContext = () => {
  const context = useContext(SelectedPitchContext)
  assert(
    context,
    'useSelectedContext must be used inside a SelectedPitchContextProvider'
  )
  return context
}

function SelectedPitchContextProvider({
  initialSelectedPitchId,
  children,
}: PropsWithChildren<{ initialSelectedPitchId?: string }>) {
  const [selectedPitchId, setSelectedPitchId] = useState<string | undefined>(
    initialSelectedPitchId
  )

  return (
    <SelectedPitchContext.Provider
      value={{ selectedPitchId, setSelectedPitchId }}
    >
      {children}
    </SelectedPitchContext.Provider>
  )
}

function RoomContent() {
  const others = useOthers()
  const self = useSelf()
  const { selectedPitchId } = useSelectedPitchContext()

  return (
    <div className="flex flex-1">
      <div className="flex-grow-0 flex-shrink-0 border-r">
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
      </div>
      {selectedPitchId && <PitchView pitchId={selectedPitchId} />}
    </div>
  )
}

function PitchList() {
  const pitches = useStorage((root) =>
    root.pitches.filter((pitch) => !pitch.archived)
  )
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const movePitch = useMutation(
    ({ storage }, activeId: string, overId: string) => {
      if (activeId !== overId) {
        const getPitchIndex = (id: string) =>
          storage.get('pitches').findIndex((pitch) => pitch.get('id') === id)
        const activeIndex = getPitchIndex(activeId)
        const overIndex = getPitchIndex(overId)
        storage.get('pitches').move(activeIndex, overIndex)
      }
    },
    []
  )

  return pitches.length > 0 ? (
    <ul className="flex flex-col gap-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event
          if (over && active.id !== over.id) {
            movePitch(String(active.id), String(over.id))
          }
        }}
      >
        <SortableContext items={pitches} strategy={verticalListSortingStrategy}>
          {pitches.map((pitch) => (
            <SortablePitchListItem key={pitch.id} pitch={pitch} />
          ))}
        </SortableContext>
      </DndContext>
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

function SortablePitchListItem({ pitch }: { pitch: Pitch }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: pitch.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div className="flex gap-2 items-baseline" ref={setNodeRef} style={style}>
      <div className="cursor-move" {...listeners} {...attributes}>
        ...
      </div>{' '}
      <PitchListItem pitch={pitch} />
    </div>
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

  const { selectedPitchId, setSelectedPitchId } = useSelectedPitchContext()

  return (
    <li className="flex gap-2 items-center">
      <StringViewAndEditor value={pitch.title} updateValue={updatePitchTitle}>
        {(edit) => (
          <div className="flex gap-1 items-baseline">
            <span className={selectedPitchId === pitch.id ? 'font-bold' : ''}>
              {pitch.title}
            </span>
            <button onClick={edit} type="button">
              Rename
            </button>
            <ArchivePitchButton
              pitchId={pitch.id}
              archived={pitch.archived ?? false}
            />
            <button onClick={() => setSelectedPitchId(pitch.id)}>Open</button>
          </div>
        )}
      </StringViewAndEditor>
    </li>
  )
}

function ArchivePitchButton({
  pitchId,
  archived,
}: {
  pitchId: string
  archived: boolean
}) {
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

function BoardName() {
  const name = useStorage((root) => root.info.name)
  const updateName = useMutation(({ storage }, name: string) => {
    storage.get('info').set('name', name)
  }, [])

  return (
    <StringViewAndEditor value={name} updateValue={updateName}>
      {(edit) => (
        <h2
          role="button"
          onClick={edit}
          className="hover:bg-slate-50 p-1 rounded border border-transparent"
        >
          {name}
        </h2>
      )}
    </StringViewAndEditor>
  )
}
