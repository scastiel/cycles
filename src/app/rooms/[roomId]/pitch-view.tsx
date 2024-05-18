import { StringViewAndEditor } from '@/app/rooms/[roomId]/string-view-and-editor'
import { Scope, useMutation, useStorage } from '@/liveblocks.config'
import { LiveObject } from '@liveblocks/client'
import assert from 'assert'
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

export function PitchView({ pitchId }: { pitchId: string }) {
  const pitch = useStorage((root) =>
    root.pitches.find((pitch) => pitch.id === pitchId)
  )
  assert(pitch, 'Pitch does not exist')

  const updateTitle = useMutation(({ storage }, title: string) => {
    storage
      .get('pitches')
      .find((pitch) => pitch.get('id') === pitchId)
      ?.set('title', title)
  }, [])

  return (
    <div className="flex-1 p-2">
      <h2 className="flex items-baseline gap-2">
        Pitch title:
        <StringViewAndEditor value={pitch.title} updateValue={updateTitle}>
          {(edit) => (
            <span
              role="button"
              onClick={edit}
              className="hover:bg-slate-50 p-1 rounded border border-transparent"
            >
              {pitch.title}
            </span>
          )}
        </StringViewAndEditor>
      </h2>

      <ActiveScopeList pitchId={pitchId} />
    </div>
  )
}

function ActiveScopeList({ pitchId }: { pitchId: string }) {
  const scopes = useStorage((root) =>
    root.scopes.filter((scope) => scope.pitchId === pitchId && !scope.archived)
  )
  const createScope = useCreateScopeMutation(pitchId)

  return (
    <div>
      <ul>
        {scopes.length > 0 ? (
          <>
            <ScopeList scopes={scopes} />
            <li>
              <button type="button" onClick={createScope}>
                Create new
              </button>
            </li>
          </>
        ) : (
          <li>
            No scope yet.{' '}
            <button type="button" onClick={createScope}>
              Create the first one
            </button>
          </li>
        )}
      </ul>
      <h3>Archived scopes</h3>
      <ArchivedScopeList pitchId={pitchId} />
    </div>
  )
}

function ArchivedScopeList({ pitchId }: { pitchId: string }) {
  const scopes = useStorage((root) =>
    root.scopes.filter((scope) => scope.pitchId === pitchId && scope.archived)
  )

  return scopes.length > 0 ? (
    <ul className="flex flex-col gap-1">
      {scopes.map((scope) => (
        <ScopeView key={scope.id} scope={scope} />
      ))}
    </ul>
  ) : (
    <p>No archived scope yet.</p>
  )
}

function ScopeList({ scopes }: { scopes: Scope[] }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const moveScope = useMutation(
    ({ storage }, activeId: string, overId: string) => {
      if (activeId !== overId) {
        const getScopeIndex = (id: string) =>
          storage.get('scopes').findIndex((pitch) => pitch.get('id') === id)
        const activeIndex = getScopeIndex(activeId)
        const overIndex = getScopeIndex(overId)
        storage.get('scopes').move(activeIndex, overIndex)
      }
    },
    []
  )

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event
          if (over && active.id !== over.id) {
            moveScope(String(active.id), String(over.id))
          }
        }}
      >
        <SortableContext items={scopes} strategy={verticalListSortingStrategy}>
          {scopes.map((scope) => (
            <SortableScopeView key={scope.id} scope={scope} />
          ))}
        </SortableContext>
      </DndContext>
    </>
  )
}

function useCreateScopeMutation(pitchId: string) {
  return useMutation(
    ({ storage }) => {
      storage.get('scopes').push(
        new LiveObject<Scope>({
          id: nanoid(),
          pitchId,
          title: 'New scope',
        })
      )
    },
    [pitchId]
  )
}

function createUseChangeScopeArchivedMutation(archived: boolean) {
  return (scopeId: string) => {
    return useMutation(
      ({ storage }) => {
        storage
          .get('scopes')
          .find((scope) => scope.get('id') === scopeId)
          ?.set('archived', archived)
      },
      [scopeId, archived]
    )
  }
}
const useArchiveScopeMutation = createUseChangeScopeArchivedMutation(true)
const useRestoreScopeMutation = createUseChangeScopeArchivedMutation(false)

function SortableScopeView({ scope }: { scope: Scope }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: scope.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div className="flex gap-2 items-baseline" ref={setNodeRef} style={style}>
      <div className="cursor-move" {...listeners} {...attributes}>
        ...
      </div>
      <ScopeView scope={scope} />
    </div>
  )
}

function ScopeView({ scope }: { scope: Scope }) {
  const updateTitle = useMutation(({ storage }, title: string) => {
    storage
      .get('scopes')
      .find((s) => s.get('id') === scope.id)
      ?.set('title', title)
  }, [])

  const archiveScope = useArchiveScopeMutation(scope.id)
  const restoreScope = useRestoreScopeMutation(scope.id)

  return (
    <li>
      <StringViewAndEditor value={scope.title} updateValue={updateTitle}>
        {(edit) => (
          <>
            {scope.title} <button onClick={edit}>Rename</button>{' '}
            {scope.archived ? (
              <button onClick={restoreScope}>Restore</button>
            ) : (
              <button onClick={archiveScope}>Archive</button>
            )}
          </>
        )}
      </StringViewAndEditor>
    </li>
  )
}
