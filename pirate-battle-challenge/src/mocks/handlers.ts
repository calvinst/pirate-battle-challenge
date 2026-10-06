import { delay, http, HttpResponse } from 'msw'
import { PAGE_SIZE, type MatchRecord, type Page } from '../api/contracts'
import { asMatchRecord } from '../storage'
import { allRecords, findRecord, insertRecord } from './db'
import { getScenario } from './scenarios'

const latency = () => delay(getScenario() === 'slow' ? 3000 : 250)

const serverError = () => HttpResponse.json({ message: 'Internal server error' }, { status: 500 })

const intParam = (url: URL, name: string, fallback: number): number => {
  const n = Number(url.searchParams.get(name))
  return Number.isInteger(n) && n >= 1 ? n : fallback
}

const paginate = <T>(items: T[], url: URL): Page<T> => {
  const pageSize = Math.min(intParam(url, 'pageSize', PAGE_SIZE), 50)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(intParam(url, 'page', 1), totalPages)
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages,
  }
}

/** Maior pontuação; empate: menor duração, partida mais antiga, depois id. */
const byRank = (a: MatchRecord, b: MatchRecord): number =>
  b.score - a.score ||
  a.duration - b.duration ||
  a.playedAt.localeCompare(b.playedAt) ||
  a.id.localeCompare(b.id)

export const handlers = [
  http.get('/api/ranking', async ({ request }) => {
    await latency()
    const scenario = getScenario()
    if (scenario === 'server-error') return serverError()

    const url = new URL(request.url)
    const matchDuration = Number(url.searchParams.get('matchDuration'))
    const spawnInterval = Number(url.searchParams.get('spawnInterval'))
    const ranked =
      scenario === 'empty'
        ? []
        : allRecords()
            .filter(
              (r) =>
                r.options.matchDuration === matchDuration &&
                r.options.spawnInterval === spawnInterval,
            )
            .sort(byRank)
    const result = paginate(ranked, url)
    const offset = (result.page - 1) * result.pageSize
    return HttpResponse.json({
      ...result,
      items: result.items.map((r, i) => ({ ...r, rank: offset + i + 1 })),
    })
  }),

  http.get('/api/history', async ({ request }) => {
    await latency()
    const scenario = getScenario()
    if (scenario === 'server-error') return serverError()

    const url = new URL(request.url)
    const playerId = url.searchParams.get('playerId')
    const mine =
      scenario === 'empty'
        ? []
        : allRecords()
            .filter((r) => r.playerId === playerId)
            .sort((a, b) => b.playedAt.localeCompare(a.playedAt) || a.id.localeCompare(b.id))
    return HttpResponse.json(paginate(mine, url))
  }),

  http.post('/api/matches', async ({ request }) => {
    await latency()
    const scenario = getScenario()
    if (scenario === 'server-error' || scenario === 'submit-unavailable') {
      return HttpResponse.json({ message: 'Service unavailable' }, { status: 503 })
    }

    const record = asMatchRecord(await request.json())
    if (!record) return HttpResponse.json({ message: 'Invalid match' }, { status: 400 })

    const existing = findRecord(record.id)
    if (existing) return HttpResponse.json(existing, { status: 200 })

    insertRecord(record)
    // O registro foi salvo, mas a resposta se perde; o reenvio recupera sem duplicar.
    if (scenario === 'submit-timeout') return HttpResponse.error()
    return HttpResponse.json(record, { status: 201 })
  }),
]
