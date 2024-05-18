import { StringViewAndEditor } from '@/app/rooms/[roomId]/string-view-and-editor'
import { useMutation, useStorage } from '@/liveblocks.config'
import assert from 'assert'

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
      <StringViewAndEditor value={pitch.title} updateValue={updateTitle}>
        {(edit) => (
          <h2
            role="button"
            onClick={edit}
            className="hover:bg-slate-50 p-1 rounded border border-transparent"
          >
            {pitch.title}
          </h2>
        )}
      </StringViewAndEditor>
    </div>
  )
}
