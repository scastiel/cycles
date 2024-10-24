import { Pitch, useMutation } from '@/liveblocks.config'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DialogTrigger } from '@/components/ui/dialog'
import { PropsWithChildren, useState } from 'react'
import { pick } from 'lodash'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function PitchDropdownMenu({
  pitch,
  children,
}: PropsWithChildren<{ pitch: Pitch }>) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        onKeyDown={(e) => e.stopPropagation()}
        onKeyDownCapture={(e) => e.stopPropagation()}
      >
        <PitchDropdownMenuContent pitch={pitch} close={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type PitchDraft = Pick<Pitch, 'title' | 'description' | 'link'>

function PitchDropdownMenuContent({
  pitch,
  close,
}: {
  pitch: Pitch
  close: () => void
}) {
  const [draft, setDraft] = useState<PitchDraft>(
    pick(pitch, ['title', 'description', 'link'])
  )

  const updatePitch = useMutation(({ storage }, draft: PitchDraft) => {
    storage
      .get('pitches')
      .find((p) => p.get('id') === pitch.id)
      ?.update(draft)
  }, [])

  const archivePitch = useMutation(
    ({ storage }) => {
      storage
        .get('pitches')
        .find((p) => p.get('id') === pitch.id)
        ?.set('archived', !pitch.archived)
    },
    [pitch]
  )

  return (
    <>
      <form
        className="p-2 flex flex-col gap-2 min-w-72"
        onSubmit={(event) => {
          event.preventDefault()
          updatePitch(draft)
          close()
        }}
      >
        <h4 className="text-sm font-semibold">Update pitch</h4>
        <Input
          className="flex-1"
          placeholder="Scope title"
          value={draft.title ?? ''}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
        />
        <Textarea
          className="flex-1"
          placeholder="When we ship this pitch, the user will be able to…"
          value={draft.description ?? ''}
          onChange={(event) =>
            setDraft({ ...draft, description: event.target.value })
          }
        />
        <Input
          className="flex-1"
          placeholder="https://notclickup.com/link-to-your-pitch"
          type="url"
          value={draft.link ?? ''}
          onChange={(event) => setDraft({ ...draft, link: event.target.value })}
        />
        <Button type="submit" className="self-center">
          Save
        </Button>
      </form>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={archivePitch}
        className={cn(pitch.archived || 'text-destructive')}
      >
        {pitch.archived ? 'Restore pitch' : 'Archive pitch'}
      </DropdownMenuItem>
    </>
  )
}
