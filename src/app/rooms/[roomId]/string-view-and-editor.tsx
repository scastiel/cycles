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
      className="flex gap-1"
      onSubmit={() => {
        updateValue(draftName)
        cancel()
      }}
    >
      <input
        className="px-2 py-1 border rounded"
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        autoFocus
      />
      <button type="submit">Save</button>
      <button type="button" onClick={() => cancel()}>
        Cancel
      </button>
    </form>
  )
}
