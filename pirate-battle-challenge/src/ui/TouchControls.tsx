import type { PointerEvent } from 'react'
import type { TouchControl, TouchInput } from '../game/input/touch'

interface TouchControlsProps {
  input: TouchInput
}

const LEFT_PAD: { control: TouchControl; label: string; text: string }[] = [
  { control: 'left', label: 'Turn left', text: '◀' },
  { control: 'forward', label: 'Sail forward', text: '▲' },
  { control: 'reverse', label: 'Reverse', text: '▼' },
  { control: 'right', label: 'Turn right', text: '▶' },
]

const RIGHT_PAD: { control: TouchControl; label: string; text: string }[] = [
  { control: 'fireLeft', label: 'Fire left broadside', text: 'L' },
  { control: 'fireFront', label: 'Fire forward', text: '●' },
  { control: 'fireRight', label: 'Fire right broadside', text: 'R' },
]

export function TouchControls({ input }: TouchControlsProps) {
  const renderButton = ({ control, label, text }: (typeof LEFT_PAD)[number]) => {
    const press = (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      input.set(control, true)
    }
    const release = () => {
      input.set(control, false)
    }
    return (
      <button
        key={control}
        type="button"
        className={`touch-btn touch-${control}`}
        aria-label={label}
        tabIndex={-1}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onContextMenu={(e) => {
          e.preventDefault()
        }}
      >
        {text}
      </button>
    )
  }

  return (
    <div className="touch-controls">
      <div className="touch-pad touch-pad-move">{LEFT_PAD.map(renderButton)}</div>
      <div className="touch-pad touch-pad-fire">{RIGHT_PAD.map(renderButton)}</div>
    </div>
  )
}
