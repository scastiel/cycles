import {
  ScopeIcon,
  getScopeColorClasses,
} from '@/app/boards/[roomId]/scope-icon'
import {
  Scope,
  ScopeColor,
  scopeColors,
  useMutation,
} from '@/liveblocks.config'
import { PropsWithChildren, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Circle,
  CircleDashed,
  CircleOff,
  CircleSlash2,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useArchiveScopeMutation,
  useRestoreScopeMutation,
} from '@/app/boards/[roomId]/pitch-view'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { pick } from 'lodash'

export function ScopeDropdownMenu({
  scope,
  children,
}: PropsWithChildren<{ scope: Scope }>) {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        onKeyDown={(e) => e.stopPropagation()}
        onKeyDownCapture={(e) => e.stopPropagation()}
      >
        <ScopeDropdownMenuContent scope={scope} close={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type ScopeDraft = Pick<
  Scope,
  'title' | 'description' | 'core' | 'optional' | 'out' | 'color'
>

function ScopeDropdownMenuContent({
  scope,
  close,
}: {
  scope: Scope
  close: () => void
}) {
  const updateScope = useMutation(({ storage }, draft: ScopeDraft) => {
    storage
      .get('scopes')
      .find((s) => s.get('id') === scope.id)
      ?.update(draft)
  }, [])

  const archiveScope = useArchiveScopeMutation(scope.id)
  const restoreScope = useRestoreScopeMutation(scope.id)

  const [draft, setDraft] = useState<ScopeDraft>(
    pick(scope, ['title', 'description', 'core', 'optional', 'out', 'color'])
  )

  return (
    <>
      <form
        className="p-2 flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          updateScope(draft)
          close()
        }}
      >
        <h4 className="text-sm font-semibold">Update scope</h4>
        <Input
          className="flex-1"
          placeholder="Scope title"
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
        />
        <Textarea
          className="flex-1"
          placeholder="If we only ship this scope, the user will be able to…"
          value={draft.description}
          onChange={(event) =>
            setDraft({ ...draft, description: event.target.value })
          }
        />
        <div className="grid grid-cols-8">
          {[
            [true, false, false],
            [false, false, false],
            [false, true, false],
            [false, false, true],
          ].flatMap(([core, optional, out]) =>
            scopeColors.map((color) => {
              const Icon = core
                ? Star
                : optional
                ? CircleDashed
                : out
                ? CircleOff
                : Circle
              return (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  key={[core, optional, out, color].join('-')}
                  onClick={() =>
                    setDraft({ ...draft, core, optional, out, color })
                  }
                  className="group"
                  title={
                    core
                      ? 'Core'
                      : optional
                      ? 'Optional'
                      : out
                      ? 'Out of scope'
                      : 'Normal'
                  }
                >
                  <ScopeIcon
                    scope={{ core, optional, out, color }}
                    className={cn(
                      'group-hover:opacity-100',
                      (draft.color !== color ||
                        Boolean(draft.core) !== core ||
                        Boolean(draft.optional) !== optional ||
                        Boolean(draft.out) !== out) &&
                        'opacity-40'
                    )}
                  />
                </Button>
              )
            })
          )}
        </div>
        <Button type="submit" className="self-center">
          Save
        </Button>
      </form>
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
    </>
  )
}
