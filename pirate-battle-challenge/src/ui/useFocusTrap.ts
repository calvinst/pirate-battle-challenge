import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)'

/** Mantém o foco dentro do contêiner enquanto ativo e o devolve ao elemento anterior ao sair. */
export const useFocusTrap = (ref: RefObject<HTMLElement | null>, active: boolean) => {
  useEffect(() => {
    const node = ref.current
    if (!active || !node) return

    const previous = document.activeElement
    const items = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
    items()[0]?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = items()
      const first = list[0]
      const last = list[list.length - 1]
      if (!first || !last) return
      const current = document.activeElement
      if (!node.contains(current)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && current === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [ref, active])
}
