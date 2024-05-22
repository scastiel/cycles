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
import {
  CSSProperties,
  PropsWithChildren,
  ReactNode,
  createContext,
  forwardRef,
  useContext,
  useState,
} from 'react'
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
import { PitchView } from '@/app/boards/[roomId]/pitch-view'
import { StringViewAndEditor } from './string-view-and-editor'
import { Button } from '@/components/ui/button'
import { Dot, Ellipsis, GripVertical, Menu, PlusIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { ArchiveCollapsible } from './archive-collapsible'

export function Room({ roomId }: { roomId: string }) {
  return (
    <RoomProvider
      id={'demo:' + decodeURIComponent(roomId)}
      initialPresence={{}}
      initialStorage={{
        info: new LiveObject({ name: 'New board' }),
        pitches: new LiveList(),
        scopes: new LiveList(),
        tasks: new LiveList(),
      }}
    >
      <ClientSideSuspense fallback={<div className="p-2">Loading…</div>}>
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
  const { selectedPitchId } = useSelectedPitchContext()

  return (
    <ResizablePanelGroup direction="horizontal" className="flex flex-1">
      <ResizablePanel defaultSize={25}>
        <SidePanel />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={75}>
        {selectedPitchId && <PitchView pitchId={selectedPitchId} />}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function SidePanel() {
  const others = useOthers()

  return (
    <div className="h-[calc(100dvh-2.5rem)] fixed top-10 left-0 flex flex-col">
      <div className="flex-1 p-2 flex flex-col gap-2">
        <div className="flex gap-2 items-baseline">
          <BoardName />
        </div>
        <div className="flex-1">
          <PitchList />
        </div>
        <div className="mt-6">
          <ArchivedPitches />
        </div>
      </div>
      <div className="p-2">
        <p className="text-center text-xs text-muted-foreground">
          {others.length} other user(s) online.
        </p>
      </div>
    </div>
  )
}

function ArchivedPitches() {
  return (
    <ArchiveCollapsible label="Archived pitches">
      <ArchivedPitchList />
    </ArchiveCollapsible>
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

  const createPitch = useCreatePitch()

  return pitches.length > 0 ? (
    <ul className="flex flex-col">
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
    </ul>
  ) : (
    <div>
      <span className="text-sm">No pitch yet.</span>
      <Button onClick={createPitch} variant="link">
        Create the first one
      </Button>
    </div>
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
    <PitchListItem
      ref={setNodeRef}
      style={style}
      grip={
        <div className="flex cursor-move pl-2" {...listeners} {...attributes}>
          <GripVertical className="size-4" />
        </div>
      }
      pitch={pitch}
    />
  )
}

function ArchivedPitchList() {
  const pitches = useStorage((root) =>
    root.pitches.filter((pitch) => pitch.archived)
  )
  return pitches.length > 0 ? (
    <ul className="flex flex-col">
      {pitches.map((pitch) => (
        <PitchListItem key={pitch.id} pitch={pitch} />
      ))}
    </ul>
  ) : (
    <p>No archived pitch yet.</p>
  )
}

const PitchListItem = forwardRef<
  HTMLLIElement,
  { pitch: Pitch; grip?: ReactNode; style?: CSSProperties }
>(({ pitch, grip, style }, forwardedRef) => {
  const updatePitchTitle = useMutation(({ storage }, title: string) => {
    storage
      .get('pitches')
      .find((p) => p.get('id') === pitch.id)
      ?.set('title', title)
  }, [])

  const { selectedPitchId, setSelectedPitchId } = useSelectedPitchContext()
  const archivePitch = useArchivePitchMutation(pitch)

  return (
    <li
      ref={forwardedRef}
      className="flex-1 flex items-center bg-background hover:bg-slate-100 rounded"
      style={style}
    >
      {grip}
      <StringViewAndEditor value={pitch.title} updateValue={updatePitchTitle}>
        {(edit) => (
          <div className="flex-1 flex gap-1 items-center">
            <Button
              variant="link"
              onClick={() => setSelectedPitchId(pitch.id)}
              className={
                (selectedPitchId === pitch.id ? 'font-bold' : '') +
                ' flex-1 text-left justify-start'
              }
            >
              {pitch.title}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={edit}>Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={archivePitch}>
                  {pitch.archived ? 'Restore' : 'Archive'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </StringViewAndEditor>
    </li>
  )
})
PitchListItem.displayName = 'PitchListItem'

function useArchivePitchMutation(pitch: Pitch) {
  return useMutation(
    ({ storage }) => {
      storage
        .get('pitches')
        .find((p) => p.get('id') === pitch.id)
        ?.set('archived', !pitch.archived)
    },
    [pitch]
  )
}

function useCreatePitch() {
  return useMutation(({ storage }) => {
    storage
      .get('pitches')
      .push(new LiveObject({ id: nanoid(), title: 'New pitch' }))
  }, [])
}

function BoardName() {
  const name = useStorage((root) => root.info.name)
  const updateName = useMutation(({ storage }, name: string) => {
    storage.get('info').set('name', name)
  }, [])
  const createPitch = useCreatePitch()

  return (
    <div className="w-full flex items-center">
      <StringViewAndEditor value={name} updateValue={updateName}>
        {(edit) => (
          <>
            <h2 className="flex-1 font-bold text-lg">{name}</h2>
            <Button size="icon" variant="ghost" onClick={createPitch}>
              <PlusIcon className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={edit}>Rename</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </StringViewAndEditor>
    </div>
  )
}
