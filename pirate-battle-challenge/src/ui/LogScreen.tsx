import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { Page } from '../api/contracts'
import { useHistory, useRanking } from '../api/queries'
import { getPlayer } from '../api/player'
import type { GameOptions } from '../game/simulation/config'
import { icons } from './icons'
import type { LogTab } from './MainMenu'

const TABS: { id: LogTab; label: string }[] = [
  { id: 'ranking', label: 'Ranking' },
  { id: 'history', label: 'Match History' },
]

const REASONS = { time: 'Time', death: 'Destroyed' } as const

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

interface Query<T> {
  data: Page<T> | undefined
  isPending: boolean
  isError: boolean
  isFetching: boolean
  isPlaceholderData: boolean
  refetch: () => unknown
}

interface Row {
  key: string
  cells: ReactNode[]
  highlight?: boolean
}

function QueryState<T>({
  query,
  page,
  setPage,
  emptyText,
  header,
  row,
}: {
  query: Query<T>
  page: number
  setPage: (page: number) => void
  emptyText: string
  header: string[]
  row: (item: T) => Row
}) {
  if (query.isPending) {
    return (
      <p className="state" role="status">
        Loading…
      </p>
    )
  }
  if (query.isError && !query.data) {
    return (
      <div className="state" role="alert">
        <p>Could not load the data.</p>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => {
            void query.refetch()
          }}
        >
          Try again
        </button>
      </div>
    )
  }
  const data = query.data
  if (!data || data.total === 0) {
    return (
      <p className="state" role="status">
        {emptyText}
      </p>
    )
  }

  return (
    <>
      {query.isError && (
        <p role="alert">Could not refresh the data. Showing the last loaded page.</p>
      )}
      <div className="table-wrap">
        <table className="log-table" aria-busy={query.isFetching}>
          <thead>
            <tr>
              {header.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => {
              const { key, cells, highlight } = row(item)
              return (
                <tr key={key} className={highlight ? 'is-you' : undefined}>
                  {cells.map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <button
          type="button"
          className="btn-round"
          aria-label="Previous"
          disabled={page <= 1}
          onClick={() => {
            setPage(page - 1)
          }}
        >
          <img src={icons.turnLeft} alt="" />
        </button>
        <span role="status">
          Page {data.page} of {data.totalPages}
        </span>
        <button
          type="button"
          className="btn-round"
          aria-label="Next"
          disabled={page >= data.totalPages || query.isPlaceholderData}
          onClick={() => {
            setPage(page + 1)
          }}
        >
          <img src={icons.turnRight} alt="" />
        </button>
      </div>
    </>
  )
}

function RankingPanel({ options }: { options: GameOptions }) {
  const [page, setPage] = useState(1)
  const query = useRanking(options, page)
  const { id: playerId } = getPlayer()
  return (
    <>
      <p className="subtitle">
        {options.matchDuration} second battles · {options.spawnInterval} second spawn interval
      </p>
      <QueryState
        query={query}
        page={page}
        setPage={setPage}
        emptyText="No ranked matches yet for these options."
        header={['Rank', 'Captain', 'Points', 'Played']}
        row={(e) => ({
          key: e.id,
          highlight: e.playerId === playerId,
          cells: [
            String(e.rank).padStart(2, '0'),
            <>
              {e.playerName}
              {e.playerId === playerId && <span className="badge-you">You</span>}
            </>,
            e.score,
            formatDate(e.playedAt),
          ],
        })}
      />
    </>
  )
}

function HistoryPanel() {
  const [page, setPage] = useState(1)
  const query = useHistory(page)
  return (
    <QueryState
      query={query}
      page={page}
      setPage={setPage}
      emptyText="You have not finished any matches yet."
      header={['Played', 'Points', 'Duration', 'Ended by']}
      row={(r) => ({
        key: r.id,
        cells: [formatDate(r.playedAt), r.score, `${r.duration.toFixed(1)}s`, REASONS[r.reason]],
      })}
    />
  )
}

interface LogScreenProps {
  initialTab: LogTab
  options: GameOptions
  onBack: () => void
}

export function LogScreen({ initialTab, options, onBack }: LogScreenProps) {
  const [tab, setTab] = useState<LogTab>(initialTab)
  const tabRefs = useRef<Partial<Record<LogTab, HTMLButtonElement | null>>>({})

  const move = (e: KeyboardEvent, from: number) => {
    const last = TABS.length - 1
    const target =
      e.key === 'ArrowRight' ? (from + 1) % TABS.length
      : e.key === 'ArrowLeft' ? (from + last) % TABS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    const next = target === null ? undefined : TABS[target]
    if (!next) return
    e.preventDefault()
    setTab(next.id)
    tabRefs.current[next.id]?.focus()
  }

  return (
    <main className="screen">
      <div className="panel panel-wide">
        <h1>Captain&rsquo;s Log</h1>
        <div role="tablist" aria-label="Ranking and match history" className="row">
          {TABS.map(({ id, label }, i) => (
            <button
              key={id}
              ref={(node) => {
                tabRefs.current[id] = node
              }}
              type="button"
              role="tab"
              className="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => {
                setTab(id)
              }}
              onKeyDown={(e) => {
                move(e, i)
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'ranking' ? <RankingPanel options={options} /> : <HistoryPanel />}
        </div>

        <button type="button" className="btn btn-sm" onClick={onBack}>
          Main Menu
        </button>
      </div>
    </main>
  )
}
