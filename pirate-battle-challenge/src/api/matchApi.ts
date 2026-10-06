import axios from 'axios'
import type { GameOptions } from '../game/simulation/config'
import { PAGE_SIZE, type MatchRecord, type Page, type RankingEntry } from './contracts'

const http = axios.create({ baseURL: '/api', timeout: 5000 })

export const fetchRanking = async (
  options: GameOptions,
  page: number,
  signal?: AbortSignal,
): Promise<Page<RankingEntry>> => {
  const { data } = await http.get<Page<RankingEntry>>('/ranking', {
    params: {
      page,
      pageSize: PAGE_SIZE,
      matchDuration: options.matchDuration,
      spawnInterval: options.spawnInterval,
    },
    signal,
  })
  return data
}

export const fetchHistory = async (
  playerId: string,
  page: number,
  signal?: AbortSignal,
): Promise<Page<MatchRecord>> => {
  const { data } = await http.get<Page<MatchRecord>>('/history', {
    params: { page, pageSize: PAGE_SIZE, playerId },
    signal,
  })
  return data
}

/** Idempotente: reenviar o mesmo `id` devolve o registro existente. */
export const submitMatch = async (record: MatchRecord): Promise<MatchRecord> => {
  const { data } = await http.post<MatchRecord>('/matches', record)
  return data
}
