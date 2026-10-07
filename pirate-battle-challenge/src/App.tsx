import { useEffect, useState } from 'react'
import { toMatchRecord } from './api/contracts'
import { getPlayer } from './api/player'
import { useMatchSync } from './api/useMatchSync'
import { installUiSounds } from './game/audio/audioEngine'
import type { MatchResult } from './game/matchInfo'
import { loadLastResult, loadOptions, saveLastResult, saveOptions } from './storage'
import { MainMenu, type LogTab } from './ui/MainMenu'
import { LogScreen } from './ui/LogScreen'
import { MatchScreen } from './ui/MatchScreen'
import { OptionsScreen } from './ui/OptionsScreen'
import { ResultScreen } from './ui/ResultScreen'

type Screen = 'menu' | 'options' | 'log' | 'match' | 'result'

function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [logTab, setLogTab] = useState<LogTab>('ranking')
  const [options, setOptions] = useState(loadOptions)
  const [lastResult, setLastResult] = useState(loadLastResult)
  // Muda a cada partida para remontar o combate do zero.
  const [matchId, setMatchId] = useState(0)
  const { enqueue, retryPending, registrationOf } = useMatchSync()

  useEffect(() => installUiSounds(), [])

  const play = () => {
    setMatchId((id) => id + 1)
    setScreen('match')
  }

  const finish = (result: MatchResult) => {
    saveLastResult(result)
    setLastResult(result)
    enqueue(toMatchRecord(result, getPlayer()))
    setScreen('result')
  }

  switch (screen) {
    case 'options':
      return (
        <OptionsScreen
          options={options}
          onSave={(next) => {
            saveOptions(next)
            setOptions(next)
          }}
          onBack={() => {
            setScreen('menu')
          }}
        />
      )
    case 'log':
      return (
        <LogScreen
          initialTab={logTab}
          options={options}
          onBack={() => {
            setScreen('menu')
          }}
        />
      )
    case 'match':
      return (
        <MatchScreen
          key={matchId}
          options={options}
          onFinish={finish}
          onQuit={() => {
            setScreen('menu')
          }}
        />
      )
    case 'result':
      return lastResult ? (
        <ResultScreen
          result={lastResult}
          registration={registrationOf(lastResult.id)}
          onRetry={retryPending}
          onPlayAgain={play}
          onMainMenu={() => {
            setScreen('menu')
          }}
        />
      ) : null
    default:
      return (
        <MainMenu
          lastResult={lastResult}
          onPlay={play}
          onOptions={() => {
            setScreen('options')
          }}
          onOpenLog={(tab) => {
            setLogTab(tab)
            setScreen('log')
          }}
        />
      )
  }
}

export default App
