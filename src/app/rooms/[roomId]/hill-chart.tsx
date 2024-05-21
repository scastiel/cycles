import { ScopeIcon } from '@/app/rooms/[roomId]/scope-icon'
import { useMutation, useStorage } from '@/liveblocks.config'
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
import { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

export function HillChart({ pitchId }: { pitchId: string }) {
  const scopes = useStorage((root) =>
    root.scopes.filter((scope) => scope.pitchId === pitchId && !scope.archived)
  )

  return (
    <HillChartDndContext>
      <div className="w-full max-w-[400px] aspect-video border relative">
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
                      .map((scope) => (
                        <DraggableScopeIcon scopeId={scope.id} key={scope.id}>
                          <ScopeIcon scope={scope} />
                        </DraggableScopeIcon>
                      ))}
                  </div>
                </DroppableProgressBox>
              </div>
            ))}
        </div>
      </div>
    </HillChartDndContext>
  )
}

function HillBackground() {
  return (
    <>
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
