import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ReactNode, useState } from 'react'

export function StringViewAndEditor({
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
      <StringEditor
        value={value}
        updateValue={updateValue}
        cancel={() => setEditMode(false)}
      />
    )
  }

  return children?.(() => setEditMode(true))
}

function StringEditor({
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
      className="flex gap-2 z-10"
      onSubmit={() => {
        updateValue(draftName)
        cancel()
      }}
    >
      <Input
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        autoFocus
      />
      <Button type="submit">Save</Button>
      <Button type="button" onClick={() => cancel()}>
        Cancel
      </Button>
    </form>
  )
}
