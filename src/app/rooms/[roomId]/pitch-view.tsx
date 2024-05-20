import {
  Scope,
  Task,
  TaskStatus,
  useMutation,
  useStorage,
} from '@/liveblocks.config'
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
import { PropsWithChildren, ReactNode, useState } from 'react'
import { StringViewAndEditor } from './string-view-and-editor'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Ellipsis } from 'lucide-react'

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
      <div className="flex items-baseline gap-2">
        <StringViewAndEditor value={pitch.title} updateValue={updateTitle}>
          {(edit) => (
            <div className="flex items-center gap-4">
              <h2 className="font-bold">{pitch.title}</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <Ellipsis className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={edit}>
                    Rename pitch
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </StringViewAndEditor>
      </div>

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
        if (activeIndex !== -1) {
          const overIndex = getScopeIndex(overId)
          storage.get('scopes').move(activeIndex, overIndex)
        }
      }
    },
    []
  )

  const updateTaskStatus = useUpdateTaskStatus()

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event

          switch (over?.data.current?.type) {
            case 'scope-status': {
              if (active.data.current?.type === 'task') {
                const taskId = active.id as string
                const { scopeId, status } = over.data.current as {
                  scopeId: string
                  status: TaskStatus
                }
                updateTaskStatus(taskId, scopeId, status)
              }
              break
            }
            case 'scope': {
              if (
                active.data.current?.type === 'scope' &&
                over &&
                active.id !== over.id
              ) {
                moveScope(String(active.id), String(over.id))
              }
            }
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
    useSortable({
      id: scope.id,
      data: {
        type: 'scope',
        scopeId: scope.id,
      },
    })

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
        <StringViewAndEditor value={scope.title} updateValue={updateTitle}>
          {(edit) => (
            <>
              {scope.title} <button onClick={edit}>Rename</button>
            </>
          )}
        </StringViewAndEditor>
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
  const updateTaskStatus = useUpdateTaskStatus()

  return (
    // <DndContext
    //   onDragEnd={(event) => {
    //     const taskId = event.active.id as string
    //     const [scopeId, status] = (event.over?.id as string)?.split('/') as [
    //       string,
    //       TaskStatus | undefined
    //     ]
    //     if (status) {
    //       updateTaskStatus(taskId, scopeId, status)
    //     }
    //   }}
    // >
    <div className="flex gap-2">
      <ScopeStatusTaskList colCount={3} scopeId={scopeId} status="todo">
        {tasks
          .filter((t) => t.status === 'todo')
          .map((task) => (
            <TaskView key={task.id} task={task} />
          ))}
        <div>
          <div className="border rounded p-2">
            <button onClick={createTask}>Create</button>
          </div>
        </div>
      </ScopeStatusTaskList>
      <ScopeStatusTaskList colCount={2} scopeId={scopeId} status="in_progress">
        {tasks
          .filter((t) => t.status === 'in_progress')
          .map((task) => (
            <TaskView key={task.id} task={task} />
          ))}
      </ScopeStatusTaskList>
      <ScopeStatusTaskList colCount={3} scopeId={scopeId} status="done">
        {tasks
          .filter((t) => t.status === 'done')
          .map((task) => (
            <TaskView key={task.id} task={task} />
          ))}
      </ScopeStatusTaskList>
    </div>
    // </DndContext>
  )
}

function ScopeStatusTaskList({
  children,
  colCount,
  scopeId,
  status,
}: PropsWithChildren<{
  colCount: number
  scopeId: string
  status: TaskStatus
}>) {
  const taskWidth = 120
  const gap = 8
  const width = taskWidth * colCount + gap * (colCount - 1)

  const { isOver, active, setNodeRef } = useDroppable({
    id: `${scopeId}/${status}`,
    data: {
      type: 'scope-status',
      scopeId,
      status,
    },
  })
  const accepts = active?.data.current?.type === 'task'
  const droppableHoverClass1 = accepts
    ? 'border-slate-200'
    : 'border-transparent'
  const droppableHoverClass2 = accepts && isOver ? 'border-slate-500' : ''

  return (
    <div
      ref={setNodeRef}
      className={`grid border-2 border-dashed ${droppableHoverClass1} ${droppableHoverClass2}`}
      style={{
        width,
        gap,
        gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
      }}
    >
      {children}
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
          status: 'todo',
        })
      )
    },
    [scopeId]
  )
}

function useUpdateTaskStatus() {
  return useMutation(
    ({ storage }, taskId: string, scopeId: string, status: TaskStatus) => {
      storage
        .get('tasks')
        .find((t) => t.get('id') === taskId)
        ?.update({ status, scopeId })
      const taskIndex = storage
        .get('tasks')
        .findIndex((t) => t.get('id') === taskId)
      const newTaskIndex = storage.get('tasks').length - 1
      storage.get('tasks').move(taskIndex, newTaskIndex)
    },
    []
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

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: {
      type: 'task',
      taskId: task.id,
    },
  })
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div>
      <div
        className="border rounded p-2 text-sm bg-white"
        ref={setNodeRef}
        style={style}
      >
        <TaskTitleViewAndEditor
          value={task.title}
          updateValue={updateTaskTitle}
        >
          {(edit) => (
            <div className="flex flex-col gap-1">
              <div>
                <span {...listeners} {...attributes}>
                  ...
                </span>
                {task.title}
              </div>
              <div className="flex gap-1">
                <button onClick={edit}>Edit</button>
                <button onClick={archiveTask}>Delete</button>
              </div>
            </div>
          )}
        </TaskTitleViewAndEditor>
      </div>
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
