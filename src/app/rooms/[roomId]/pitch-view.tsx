import { Scope, Task, useMutation, useStorage } from '@/liveblocks.config'
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
import { ReactNode, useState } from 'react'
import { StringViewAndEditor } from './string-view-and-editor'

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
      <div className="flex flex-col gap-2">
        {scopes.length > 0 ? (
          <>
            <ScopeList scopes={scopes} />
            <div>
              <button type="button" onClick={createScope}>
                Create new
              </button>
            </div>
          </>
        ) : (
          <div>
            No scope yet.{' '}
            <button type="button" onClick={createScope}>
              Create the first one
            </button>
          </div>
        )}
      </div>
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
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex items-baseline gap-1">
        <TaskTitleViewAndEditor value={scope.title} updateValue={updateTitle}>
          {(edit) => (
            <>
              {scope.title} <button onClick={edit}>Rename</button>
            </>
          )}
        </TaskTitleViewAndEditor>
        {scope.archived ? (
          <button onClick={restoreScope}>Restore</button>
        ) : (
          <button onClick={archiveScope}>Archive</button>
        )}
      </div>
      <ScopeTasksList scopeId={scope.id} />
    </div>
  )
}

function ScopeTasksList({ scopeId }: { scopeId: string }) {
  const tasks = useStorage((root) =>
    root.tasks.filter((task) => task.scopeId === scopeId && !task.archived)
  )
  const createTask = useCreateTaskMutation(scopeId)

  return (
    <div className="grid grid-cols-8 gap-2 w-full text-sm">
      {tasks.map((task) => (
        <TaskView key={task.id} task={task} />
      ))}
      <div className="border rounded p-2">
        <button onClick={createTask}>Create</button>
      </div>
    </div>
  )
}

function useCreateTaskMutation(scopeId: string) {
  return useMutation(
    ({ storage }) => {
      storage.get('tasks').push(
        new LiveObject({
          id: nanoid(),
          title: 'New task',
          scopeId,
        })
      )
    },
    [scopeId]
  )
}

function TaskView({ task }: { task: Task }) {
  const updateTaskTitle = useMutation(
    ({ storage }, title: string) => {
      storage
        .get('tasks')
        .find((t) => t.get('id') === task.id)
        ?.set('title', title)
    },
    [task.id]
  )
  const archiveTask = useMutation(
    ({ storage }) => {
      storage
        .get('tasks')
        .find((t) => t.get('id') === task.id)
        ?.set('archived', true)
    },
    [task.id]
  )

  return (
    <div className="border rounded p-2">
      <TaskTitleViewAndEditor value={task.title} updateValue={updateTaskTitle}>
        {(edit) => (
          <div>
            {task.title}{' '}
            <div className="flex gap-1">
              <button onClick={edit}>Edit</button>
              <button onClick={archiveTask}>Delete</button>
            </div>
          </div>
        )}
      </TaskTitleViewAndEditor>
    </div>
  )
}

function TaskTitleViewAndEditor({
  value,
  updateValue,
  children,
}: {
  value: string
  updateValue: (value: string) => void
  children?: (edit: () => void) => ReactNode
}) {
  const [editMode, setEditMode] = useState(false)

  if (editMode) {
    return (
      <TaskTitleEditor
        value={value}
        updateValue={updateValue}
        cancel={() => setEditMode(false)}
      />
    )
  }

  return children?.(() => setEditMode(true))
}

function TaskTitleEditor({
  value,
  updateValue,
  cancel,
}: {
  value: string
  updateValue: (name: string) => void
  cancel: () => void
}) {
  const [draftName, setDraftName] = useState(value)

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={() => {
        updateValue(draftName)
        cancel()
      }}
    >
      <textarea
        className="px-2 py-1 border rounded"
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        autoFocus
      />
      <div className="flex justify-center gap-1">
        <button type="submit">Save</button>
        <button type="button" onClick={() => cancel()}>
          Cancel
        </button>
      </div>
    </form>
  )
}
