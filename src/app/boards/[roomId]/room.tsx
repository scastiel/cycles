'use client'
import { ClientSideSuspense } from '@liveblocks/react'
import {
  Pitch,
  RoomProvider,
  useLostConnectionListener,
  useMutation,
  useOthers,
  useStorage,
  useUpdateMyPresence,
} from '../../../liveblocks.config'
import { LiveList, LiveObject } from '@liveblocks/client'
import {
  CSSProperties,
  PropsWithChildren,
  ReactNode,
  createContext,
  forwardRef,
  useContext,
  useEffect,
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
import { Button } from '@/components/ui/button'
import { CircleAlert, GripVertical, PlusIcon } from 'lucide-react'
import { ArchiveCollapsible } from './archive-collapsible'
import { cn } from '@/lib/utils'
import { OrganizationUser } from '@/lib/users'
import { OrganizationUsersProvider } from '@/components/organization-users-context'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import { match } from 'ts-pattern'

export function Room({
  roomId,
  boardTitle,
  organizationUsers,
}: {
  roomId: string
  boardTitle: string
  organizationUsers: OrganizationUser[]
}) {
  return (
    <TooltipProvider>
      <OrganizationUsersProvider organizationUsers={organizationUsers}>
        <RoomProvider
          id={roomId}
          initialPresence={{}}
          initialStorage={{
            pitches: new LiveList(),
            scopes: new LiveList(),
            tasks: new LiveList(),
          }}
        >
          <ClientSideSuspense
            fallback={
              <main className="mt-16 w-full max-w-screen-md mx-auto">
                Loading…
              </main>
            }
          >
            {() => (
              <>
                <ConnectionState />
                <SelectedPitchRoomContent boardTitle={boardTitle} />
              </>
            )}
          </ClientSideSuspense>
        </RoomProvider>
      </OrganizationUsersProvider>
    </TooltipProvider>
  )
}

function ConnectionState() {
  const { toast } = useToast()
  const [status, setStatus] = useState<'online' | 'reconnecting' | 'offline'>(
    'online'
  )

  useLostConnectionListener((event) => {
    match(event)
      .with('lost', () => {
        setStatus('reconnecting')
        toast({
          title: 'Warning: Connection lost',
          description: <>We are still trying to reconnect…</>,
        })
      })
      .with('restored', () => {
        setStatus('online')
        toast({ title: 'Successfully reconnected again!' })
      })
      .with('failed', () => {
        setStatus('offline')
        toast({
          title: 'Warning: Connection lost',
          description: <>Your changes might not be saved.</>,
          variant: 'destructive',
        })
      })
  })

  if (status === 'online') return null

  return (
    <div
      className={cn(
        // status === 'online' && 'bg-green-600',
        status === 'reconnecting' && 'bg-orange-600',
        status === 'offline' && 'bg-red-600',
        'absolute top-0 left-1/2 -translate-x-1/2 z-20 text-white text-xs px-3 py-1 rounded-b-lg flex flex-row gap-2 items-center'
      )}
    >
      <CircleAlert className="size-4" />
      <div>
        {match(status)
          .with('reconnecting', () => <>Connection lost. Reconnecting…</>)
          .with('offline', () => <>Connection lost</>)
          // .with('online', () => <>Online</>)
          .exhaustive()}
      </div>
    </div>
  )
}

function SelectedPitchRoomContent({ boardTitle }: { boardTitle: string }) {
  const firstPitchId = useStorage(
    (root) => root.pitches.filter((pitch) => !pitch.archived).at(0)?.id ?? ''
  )
  const [selectedPitchId, setSelectedPitchId] = useState<
    string | undefined | null
  >(null)

  useEffect(() => {
    const hash = document.location.hash
    if (hash) {
      setSelectedPitchId(hash.replace(/^#/, ''))
    } else {
      if (firstPitchId) {
        history.replaceState(undefined, '', `#${firstPitchId}`)
      }
      setSelectedPitchId(firstPitchId)
    }
  }, [firstPitchId])

  if (selectedPitchId === null) return null

  return (
    <SelectedPitchContextProvider initialSelectedPitchId={selectedPitchId}>
      <RoomContent boardTitle={boardTitle} />
    </SelectedPitchContextProvider>
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
  const [selectedPitchId, _setSelectedPitchId] = useState<string | undefined>(
    initialSelectedPitchId
  )
  const updateMyPresence = useUpdateMyPresence()

  const setSelectedPitchId = (id: string | undefined) => {
    updateMyPresence({ activePitchId: id ?? null })
    _setSelectedPitchId(id)
    history.pushState(undefined, '', `#${id}`)
  }

  return (
    <SelectedPitchContext.Provider
      value={{ selectedPitchId, setSelectedPitchId }}
    >
      {children}
    </SelectedPitchContext.Provider>
  )
}

function RoomContent({ boardTitle }: { boardTitle: string }) {
  const { selectedPitchId } = useSelectedPitchContext()

  return (
    <div className="flex-1">
      <div className="fixed top-10 left-0 bottom-0 w-[300px] border-r">
        <SidePanel boardTitle={boardTitle} />
      </div>
      <div className="ml-[300px] min-h-[100dvh] flex flex-col">
        {selectedPitchId && <PitchView pitchId={selectedPitchId} />}
      </div>
    </div>
  )
}

function SidePanel({ boardTitle }: { boardTitle: string }) {
  const others = useOthers()
  const createPitch = useCreatePitch()
  const archivePitchesCount = useStorage(
    (root) => root.pitches.filter((p) => p.archived).length
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-2 flex flex-col gap-2">
        <div className="flex gap-2 items-baseline">
          <div className="w-full flex items-center">
            <h2 className="flex-1 font-bold text-lg">{boardTitle}</h2>
            <Button size="icon" variant="ghost" onClick={createPitch}>
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1">
          <PitchList />
        </div>
        {archivePitchesCount > 0 && (
          <div className="mt-6">
            <ArchivedPitches count={archivePitchesCount} />
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-center text-xs text-muted-foreground">
          {others.length} other user(s) online.
        </p>
      </div>
    </div>
  )
}

function ArchivedPitches({ count }: { count: number }) {
  return (
    <ArchiveCollapsible label={<>Archived pitches ({count})</>}>
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
  const { selectedPitchId, setSelectedPitchId } = useSelectedPitchContext()

  return (
    <li
      ref={forwardedRef}
      className="flex-1 flex items-center bg-background hover:bg-muted rounded w-full"
      style={style}
    >
      {grip}
      <div className="flex-1 flex gap-1 items-center overflow-hidden">
        <Button
          variant="link"
          onClick={() => setSelectedPitchId(pitch.id)}
          className={cn(
            selectedPitchId === pitch.id && 'font-bold',
            'flex-1 text-left justify-start overflow-hidden pr-0'
          )}
        >
          <span className="overflow-hidden text-ellipsis">{pitch.title}</span>
        </Button>
      </div>
    </li>
  )
})
PitchListItem.displayName = 'PitchListItem'

function useCreatePitch() {
  return useMutation(({ storage }) => {
    storage
      .get('pitches')
      .push(new LiveObject({ id: nanoid(), title: 'New pitch' }))
  }, [])
}
