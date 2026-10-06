import { useCallback, useEffect, useState } from 'react'
import { loadGameTextures, type GameTextures } from '../game/render/assets'

export type TexturesState =
  | { status: 'loading'; progress: number }
  | { status: 'ready'; textures: GameTextures }
  | { status: 'error' }

export const useGameTextures = () => {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<TexturesState>({ status: 'loading', progress: 0 })

  useEffect(() => {
    let cancelled = false
    loadGameTextures((progress) => {
      if (!cancelled) setState({ status: 'loading', progress })
    })
      .then((textures) => {
        if (!cancelled) setState({ status: 'ready', textures })
      })
      .catch((error: unknown) => {
        console.error('Failed to load game assets', error)
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading', progress: 0 })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
