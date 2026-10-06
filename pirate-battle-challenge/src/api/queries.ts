import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { GameOptions } from '../game/simulation/config'
import { fetchHistory, fetchRanking } from './matchApi'
import { getPlayer } from './player'

export const RANKING_KEY = 'ranking'
export const HISTORY_KEY = 'history'

export const useRanking = (options: GameOptions, page: number) =>
  useQuery({
    queryKey: [RANKING_KEY, options.matchDuration, options.spawnInterval, page],
    queryFn: ({ signal }) => fetchRanking(options, page, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  })

export const useHistory = (page: number) => {
  const { id } = getPlayer()
  return useQuery({
    queryKey: [HISTORY_KEY, id, page],
    queryFn: ({ signal }) => fetchHistory(id, page, signal),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  })
}
