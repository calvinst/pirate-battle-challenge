import type { PointerEvent } from 'react'
import type { TouchControl, TouchInput } from '../game/input/touch'
import { icons } from './icons'

interface TouchControlsProps {
  input: TouchInput
}

interface PadButton {
  control: TouchControl
  label: string
  icon: string
}

const MOVE_PAD: PadButton[] = [
  { control: 'left', label: 'Turn left', icon: icons.turnLeft },
  { control: 'forward', label: 'Sail forward', icon: icons.forward },
  { control: 'reverse', label: 'Reverse', icon: icons.forward },
  { control: 'right', label: 'Turn right', icon: icons.turnRight },
]

const FIRE_PAD: PadButton[] = [
  { control: 'fireLeft', label: 'Fire left broadside', icon: icons.fireLeft },
  { control: 'fireFront', label: 'Fire forward', icon: icons.fireFront },
  { control: 'fireRight', label: 'Fire right broadside', icon: icons.fireRight },
]

export function TouchControls({ input }: TouchControlsProps) {
  const renderButton = ({ control, label, icon }: PadButton) => {
    const press = (e: PointerEvent<HTMLButtonElement>) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Ponteiro sintético ou já encerrado: o botão ainda responde, só sem captura.
      }
      input.set(control, true)
    }
    const release = () => {
      input.set(control, false)
    }
    return (
      <button
        key={control}
        type="button"
        className={`btn-round touch-btn touch-${control}`}
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
        <img src={icon} alt="" draggable={false} />
      </button>
    )
  }

  return (
    <div className="touch-controls">
      <div className="touch-pad touch-pad-move">{MOVE_PAD.map(renderButton)}</div>
      <div className="touch-pad touch-pad-fire">{FIRE_PAD.map(renderButton)}</div>
    </div>
  )
}
