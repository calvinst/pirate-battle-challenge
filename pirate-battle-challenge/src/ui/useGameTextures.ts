import { useCallback, useEffect, useState } from 'react'
import { GAME_SOUNDS, loadSounds } from '../game/audio/audioEngine'
import { loadGameTextures, type GameTextures } from '../game/render/assets'
import { isE2E } from '../game/testHook'

export type TexturesState =
  | { status: 'loading'; progress: number }
  | { status: 'ready'; textures: GameTextures }
  | { status: 'error' }

export const useGameTextures = () => {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<TexturesState>({ status: 'loading', progress: 0 })

  useEffect(() => {
    let cancelled = false
    let texturesProgress = 0
    let soundsProgress = 0
    const report = () => {
      if (!cancelled) {
        setState({ status: 'loading', progress: (texturesProgress + soundsProgress) / 2 })
      }
    }
    // Os sons são opcionais (falhas não bloqueiam) e ficam fora dos testes E2E.
    const sounds = isE2E
      ? Promise.resolve()
      : loadSounds(GAME_SOUNDS, (p) => {
          soundsProgress = p
          report()
        })
    Promise.all([
      loadGameTextures((p) => {
        texturesProgress = p
        report()
      }),
      sounds,
    ])
      .then(([textures]) => {
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
