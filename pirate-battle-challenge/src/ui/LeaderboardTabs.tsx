import { useState } from 'react'
import type { Page } from '../api/contracts'
import { useHistory, useRanking } from '../api/queries'
import type { GameOptions } from '../game/simulation/config'

type Tab = 'ranking' | 'history'

const REASONS = { time: 'Time', death: 'Destroyed' } as const

const formatDate = (iso: string) => new Date(iso).toLocaleString()

interface Query<T> {
  data: Page<T> | undefined
  isPending: boolean
  isError: boolean
  isFetching: boolean
  isPlaceholderData: boolean
  refetch: () => unknown
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
  row: (item: T) => { key: string; cells: (string | number)[] }
}) {
  if (query.isPending) return <p role="status">Loading…</p>
  if (query.isError && !query.data) {
    return (
      <div role="alert">
        <p>Could not load the data.</p>
        <button
          type="button"
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
  if (!data || data.total === 0) return <p role="status">{emptyText}</p>

  return (
    <>
      <table aria-busy={query.isFetching}>
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
            const { key, cells } = row(item)
            return (
              <tr key={key}>
                {cells.map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="actions">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => {
            setPage(page - 1)
          }}
        >
          Previous
        </button>
        <span role="status">
          Page {data.page} of {data.totalPages}
        </span>
        <button
          type="button"
          disabled={page >= data.totalPages || query.isPlaceholderData}
          onClick={() => {
            setPage(page + 1)
          }}
        >
          Next
        </button>
      </div>
    </>
  )
}

function RankingPanel({ options }: { options: GameOptions }) {
  const [page, setPage] = useState(1)
  const query = useRanking(options, page)
  return (
    <QueryState
      query={query}
      page={page}
      setPage={setPage}
      emptyText="No ranked matches yet for these options."
      header={['#', 'Player', 'Score', 'Date']}
      row={(e) => ({
        key: e.id,
        cells: [e.rank, e.playerName, e.score, formatDate(e.playedAt)],
      })}
    />
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
      header={['Date', 'Score', 'Duration', 'Ended by']}
      row={(r) => ({
        key: r.id,
        cells: [formatDate(r.playedAt), r.score, `${r.duration.toFixed(1)}s`, REASONS[r.reason]],
      })}
    />
  )
}

export function LeaderboardTabs({ options }: { options: GameOptions }) {
  const [tab, setTab] = useState<Tab>('ranking')
  return (
    <section aria-label="Ranking and match history">
      <div role="tablist" className="actions">
        <button
          type="button"
          role="tab"
          id="tab-ranking"
          aria-selected={tab === 'ranking'}
          aria-controls="panel-ranking"
          onClick={() => {
            setTab('ranking')
          }}
        >
          Ranking
        </button>
        <button
          type="button"
          role="tab"
          id="tab-history"
          aria-selected={tab === 'history'}
          aria-controls="panel-history"
          onClick={() => {
            setTab('history')
          }}
        >
          Match History
        </button>
      </div>
      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'ranking' ? <RankingPanel options={options} /> : <HistoryPanel />}
      </div>
    </section>
  )
}
