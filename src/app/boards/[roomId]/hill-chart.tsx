import {
  ScopeIcon,
  getScopeColorClasses,
} from '@/app/boards/[roomId]/scope-icon'
import {
  Scope,
  ScopeColor,
  scopeColors,
  useMutation,
  useStorage,
} from '@/liveblocks.config'
import { match } from 'ts-pattern'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import {
  PropsWithChildren,
  createContext,
  useContext,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/utils'
import assert from 'assert'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { Circle, Ellipsis, GripVertical, Plus, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useArchiveScopeMutation,
  useCreateScopeMutation,
  useRestoreScopeMutation,
} from '@/app/boards/[roomId]/pitch-view'
import { Input } from '@/components/ui/input'

const HoveredScopeContext = createContext<{
  hoveredScopeId: string | null
  setHoveredScopeId: (id: string | null) => void
} | null>(null)

export function HoveredScopeContextProvider({ children }: PropsWithChildren) {
  const [hoveredScopeId, setHoveredScopeId] = useState<string | null>(null)
  return (
    <HoveredScopeContext.Provider value={{ hoveredScopeId, setHoveredScopeId }}>
      {children}
    </HoveredScopeContext.Provider>
  )
}

function useHoveredScopeContext() {
  const context = useContext(HoveredScopeContext)
  assert(
    context,
    'useHoveredScopeId must be used inside <HoveredScopeContextProvider>'
  )
  return context
}

export function PitchDashboard({ pitchId }: { pitchId: string }) {
  const scopes = useStorage((root) =>
    root.scopes.filter((scope) => scope.pitchId === pitchId && !scope.archived)
  )

  return (
    <HoveredScopeContextProvider>
      <PitchDashboardView pitchId={pitchId} scopes={scopes} />
    </HoveredScopeContextProvider>
  )
}

export function PitchDashboardView({
  pitchId,
  scopes,
  disableEdit,
}: {
  pitchId: string
  scopes: Scope[]
  disableEdit?: boolean
}) {
  return (
    <div className="w-fit flex gap-2">
      <ScopeList scopes={scopes} pitchId={pitchId} disableEdit={disableEdit} />
      <HillChart scopes={scopes} disableEdit={disableEdit} />
      <PriorityMatrix scopes={scopes} disableEdit={disableEdit} />
    </div>
  )
}

function ScopeListDndContext({
  children,
  scopes,
}: PropsWithChildren<{ scopes: Scope[] }>) {
  const sensors = useSensors(useSensor(PointerSensor))

  const moveScope = useMutation(
    ({ storage }, fromScopeId: string, toScopeId: string) => {
      const fromIndex = storage
        .get('scopes')
        .findIndex((s) => s.get('id') === fromScopeId)
      const toIndex = storage
        .get('scopes')
        .findIndex((s) => s.get('id') === toScopeId)
      if (fromIndex !== -1 && toIndex !== -1) {
        storage.get('scopes').move(fromIndex, toIndex)
      }
    },
    []
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragEnd={(event) => {
        const scopeId = event.active.id as string
        const overScopeId = event.over?.id as string | undefined
        if (overScopeId) {
          moveScope(scopeId, overScopeId)
        }
      }}
    >
      <SortableContext items={scopes}>{children}</SortableContext>
    </DndContext>
  )
}

function SortableScopeItem({
  scope,
  disableEdit,
}: {
  scope: Scope
  disableEdit?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: scope.id })
  const { hoveredScopeId, setHoveredScopeId } = useHoveredScopeContext()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex gap-2 items-center p-1 -m-1 rounded group',
        hoveredScopeId === scope.id && 'bg-slate-100'
      )}
      onMouseEnter={() => setHoveredScopeId(scope.id)}
      onMouseLeave={() => setHoveredScopeId(null)}
    >
      {!disableEdit && (
        <div
          className="hidden group-hover:block cursor-move"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </div>
      )}
      <div className={cn(!disableEdit && 'group-hover:hidden')}>
        <ScopeIcon scope={scope} />
      </div>
      <span className="text-sm flex-1 text-nowrap text-ellipsis overflow-hidden">
        {scope.title}
      </span>
      {!disableEdit && (
        <ScopeDropdownMenu scope={scope}>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 opacity-10 group-hover:opacity-100"
          >
            <Ellipsis className="size-4" />
          </Button>
        </ScopeDropdownMenu>
      )}
    </div>
  )
}

function ScopeDropdownMenu({
  scope,
  children,
}: PropsWithChildren<{ scope: Scope }>) {
  const updateTitle = useMutation(({ storage }, title: string) => {
    storage
      .get('scopes')
      .find((s) => s.get('id') === scope.id)
      ?.set('title', title)
  }, [])
  const updateColorCore = useMutation(
    ({ storage }, color: ScopeColor, core: boolean) => {
      storage
        .get('scopes')
        .find((s) => s.get('id') === scope.id)
        ?.update({ color, core })
    },
    []
  )

  const archiveScope = useArchiveScopeMutation(scope.id)
  const restoreScope = useRestoreScopeMutation(scope.id)

  const [draftTitle, setDraftTitle] = useState(scope.title)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="p-2 flex flex-col gap-1">
          <h4 className="text-sm font-semibold">Scope title</h4>
          <form
            className="flex gap-1"
            onSubmit={(event) => {
              event.preventDefault()
              updateTitle(draftTitle)
            }}
          >
            <Input
              className="flex-1"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
            />
            <Button type="submit">Save</Button>
          </form>
        </div>
        <DropdownMenuSeparator />
        <div>
          <h4 className="text-sm font-semibold px-2 pt-2">Scope icon</h4>
          {[true, false].map((core) => (
            <div key={String(core)} className="grid grid-cols-8">
              {scopeColors.map((color) => {
                const Icon = core ? Star : Circle
                return (
                  <Button
                    variant="ghost"
                    size="icon"
                    key={color}
                    onClick={() => updateColorCore(color, core)}
                    className="group"
                  >
                    <Icon
                      className={cn(
                        'size-4 group-hover:opacity-100',
                        (scope.color !== color ||
                          Boolean(scope.core) !== core) &&
                          'opacity-20',
                        getScopeColorClasses(color)
                      )}
                    />
                  </Button>
                )
              })}
            </div>
          ))}
        </div>
        <DropdownMenuSeparator />
        {scope.archived ? (
          <DropdownMenuItem onClick={restoreScope}>
            Restore scope
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={archiveScope} className="text-red-600">
            Archive scope
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ScopeList({
  scopes,
  pitchId,
  disableEdit,
}: {
  scopes: Scope[]
  pitchId: string
  disableEdit?: boolean
}) {
  const createScope = useCreateScopeMutation(pitchId)

  return (
    <ScopeListDndContext scopes={scopes}>
      <div className="w-[400px] aspect-video border relative p-2 overflow-y-auto flex flex-col gap-1">
        <div className="flex justify-between sticky top-0">
          <h3 className="text-xs uppercase mb-2 text-muted-foreground">
            Scope list
          </h3>
          {!disableEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={createScope}
            >
              <Plus className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        <ul className="flex flex-col gap-2">
          {scopes.map((scope) => (
            <SortableScopeItem
              key={scope.id}
              scope={scope}
              disableEdit={disableEdit}
            />
          ))}
        </ul>
      </div>
    </ScopeListDndContext>
  )
}

function HillChart({
  scopes,
  disableEdit,
}: {
  scopes: Scope[]
  disableEdit?: boolean
}) {
  return (
    <HillChartDndContext>
      <div className="w-[400px] aspect-video border relative">
        <HillBackground />
        <div className="grid grid-cols-9 gap-2 p-2 h-full">
          {Array(9)
            .fill(null)
            .map((_, i) => (
              <div key={i} style={{ height: `${getBoxHeight(i)}%` }}>
                <DroppableProgressBox progress={i}>
                  <div className="h-full flex flex-col flex-wrap justify-end items-center gap-1 p-1 -mx-2">
                    {scopes
                      .filter((scope) => (scope.progress ?? 0) === i)
                      .map((scope) =>
                        disableEdit ? (
                          <ReactiveScopeIcon key={scope.id} scope={scope} />
                        ) : (
                          <DraggableScopeIcon scopeId={scope.id} key={scope.id}>
                            <ReactiveScopeIcon scope={scope} />
                          </DraggableScopeIcon>
                        )
                      )}
                  </div>
                </DroppableProgressBox>
              </div>
            ))}
        </div>
      </div>
    </HillChartDndContext>
  )
}

function ReactiveScopeIcon({ scope }: { scope: Scope }) {
  const { hoveredScopeId, setHoveredScopeId } = useHoveredScopeContext()

  return (
    <div
      className={cn(
        'rounded-full',
        hoveredScopeId === scope.id && 'outline outline-slate-500'
      )}
      onMouseEnter={() => setHoveredScopeId(scope.id)}
      onMouseLeave={() => setHoveredScopeId(null)}
    >
      <ScopeIcon scope={scope} />
    </div>
  )
}

function HillBackground() {
  return (
    <>
      <h3 className="absolute top-0 left-0 p-2 text-xs uppercase mb-2 text-muted-foreground">
        Hill chart
      </h3>
      <svg
        className="absolute inset-0 -z-10"
        viewBox="0 0 160 90"
        preserveAspectRatio="none"
      >
        <path
          d="
          M  0  90
          C  40 80,  50 35,  80 35
          C 110 35, 120 80, 160 90
        "
          className="fill-gray-50 stroke-slate-300 stroke-1"
        />
        <path
          d="
          M  80  35
          V  90
        "
          className="fill-gray-50 stroke-slate-300 stroke-[0.5] stroke-style"
          strokeDasharray="2 1"
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 p-1 gap-4 text-[10px] text-muted-foreground uppercase">
        <div className="text-right">Figuring things out</div>
        <div>Making it happen</div>
      </div>
    </>
  )
}

function HillChartDndContext({ children }: PropsWithChildren) {
  const sensors = useSensors(useSensor(PointerSensor))
  const updateScopeProgress = useMutation(
    ({ storage }, scopeId: string, progress: number) => {
      storage
        .get('scopes')
        .find((scope) => scope.get('id') === scopeId)
        ?.set('progress', progress)
    },
    []
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragEnd={(event) => {
        const progress = event.over?.id as number | undefined
        const scopeId = event.active.id as string
        if (progress !== undefined) {
          updateScopeProgress(scopeId, progress)
        }
      }}
    >
      {children}
    </DndContext>
  )
}

function getBoxHeight(i: number): number {
  return match(i < 5 ? i : 8 - i)
    .with(0, () => 98)
    .with(1, () => 83)
    .with(2, () => 60)
    .with(3, () => 42)
    .with(4, () => 36)
    .otherwise(() => 0)
}

function DroppableProgressBox({
  children,
  progress,
}: PropsWithChildren<{ progress: number }>) {
  const { setNodeRef, active, isOver } = useDroppable({ id: progress })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-full border-2 border-transparent',
        active && 'border-dashed border-slate-200',
        isOver && 'border-slate-300'
      )}
    >
      {children}
    </div>
  )
}

function DraggableScopeIcon({
  scopeId,
  children,
}: PropsWithChildren<{ scopeId: string }>) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: scopeId,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      className="cursor-move"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  )
}

function PriorityMatrix({
  scopes,
  disableEdit,
}: {
  scopes: Scope[]
  disableEdit?: boolean
}) {
  return (
    <div className="border w-[400px] aspect-video flex flex-col relative">
      <PriorityMatrixBackground />
      <h3 className="text-xs uppercase text-muted-foreground p-2">
        Priority matrix
      </h3>
      <PriorityMatrixGrid scopes={scopes} disableEdit={disableEdit} />
    </div>
  )
}

function PriorityMatrixGrid({
  scopes,
  disableEdit,
}: {
  scopes: Scope[]
  disableEdit?: boolean
}) {
  const sensors = useSensors(useSensor(PointerSensor))
  const updateScopeEffortImpact = useMutation(
    ({ storage }, scopeId: string, effort: number, impact: number) => {
      storage
        .get('scopes')
        .find((scope) => scope.get('id') === scopeId)
        ?.update({ effort, impact })
    },
    []
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragEnd={(event) => {
        if (event.over) {
          const scopeId = event.active.id as string
          const { impact, effort } = event.over.data.current ?? {}
          updateScopeEffortImpact(scopeId, effort, impact)
        }
      }}
    >
      <div className="flex-1 ml-6 mt-3 mb-6 mr-4 grid grid-cols-11 grid-rows-11 gap-1">
        {Array(11)
          .fill(null)
          .map((_, impact) =>
            Array(11)
              .fill(null)
              .map((_, effort) => (
                <DroppablePriorityMatrixBox
                  impact={impact}
                  effort={effort}
                  key={`${impact}-${effort}`}
                >
                  {scopes
                    .filter(
                      (scope) =>
                        (scope.impact ?? 5) === impact &&
                        (scope.effort ?? 5) === effort
                    )
                    .map((scope) => (
                      <div
                        key={scope.id}
                        className="w-2 h-0 flex items-center justify-center"
                      >
                        {disableEdit ? (
                          <ReactiveScopeIcon scope={scope} />
                        ) : (
                          <DraggableScopeIcon scopeId={scope.id}>
                            <ReactiveScopeIcon scope={scope} />
                          </DraggableScopeIcon>
                        )}
                      </div>
                    ))}
                </DroppablePriorityMatrixBox>
              ))
          )}
      </div>
    </DndContext>
  )
}

function DroppablePriorityMatrixBox({
  impact,
  effort,
  children,
}: PropsWithChildren<{ impact: number; effort: number }>) {
  const { active, isOver, setNodeRef } = useDroppable({
    id: impact * 100 + effort,
    data: { impact, effort },
  })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex justify-center items-center border-2 border-transparent',
        active && 'border-dashed border-slate-200',
        isOver && 'border-slate-300'
      )}
    >
      {children}
    </div>
  )
}

function PriorityMatrixBackground() {
  return (
    <>
      <svg
        className="absolute inset-0 -z-10"
        viewBox="0 0 160 90"
        preserveAspectRatio="none"
      >
        <path d="M 8 82 L 8 17" className="stroke-border fill-none" />
        <path
          d="M 8 15 L 6 17 L 10 17 L 8 15"
          className="stroke-[0.1px] stroke-border fill-border"
        />
        <path d="M 8 82 L 153 82" className="stroke-border fill-none" />
        <path
          d="M 155 82 L 153 80 L 153 84 L 155 82"
          className="stroke-[0.1px] stroke-border fill-border"
        />
      </svg>
      <div className="absolute left-0 top-10 bottom-5 h-5 w-[160px] text-muted-foreground grid grid-cols-3 uppercase items-end -translate-x-[73px] translate-y-[75px] -rotate-90">
        <div className="text-[8px] text-left">
          <span>Low</span>
        </div>
        <div className="text-[9px] text-center">
          <span>Impact</span>
        </div>
        <div className="text-[8px] text-right">
          <span>High</span>
        </div>
      </div>
      <div className="absolute left-5 bottom-0 h-5 w-[355px] text-muted-foreground grid grid-cols-3 uppercase items-center">
        <div className="text-[8px] text-left">
          <span>Low</span>
        </div>
        <div className="text-[9px] text-center">
          <span>Effort</span>
        </div>
        <div className="text-[8px] text-right">
          <span>High</span>
        </div>
      </div>
    </>
  )
}
