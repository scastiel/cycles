import React from 'react'

type Props = {
  name: string
  x: number
  y: number
}

export default function Cursor({ name, x, y }: Props) {
  return (
    <div
      className="absolute left-0 top-0 z-20"
      style={{
        transform: `translateX(${x}px) translateY(${y}px)`,
      }}
    >
      <svg
        width="24"
        height="36"
        viewBox="0 0 24 36"
        className="-mb-4"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          className="fill-slate-600"
        />
      </svg>
      <div className="text-xs bg-slate-600 px-2 text-background rounded-full">
        {name}
      </div>
    </div>
  )
}
