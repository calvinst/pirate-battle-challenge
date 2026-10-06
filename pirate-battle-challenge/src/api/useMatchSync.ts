import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { loadPending, savePending } from '../storage'
import type { MatchRecord } from './contracts'
import { submitMatch } from './matchApi'
import { HISTORY_KEY, RANKING_KEY } from './queries'

export type Registration = 'saving' | 'saved' | 'failed'

/** Registra partidas concluídas; as não confirmadas ficam no localStorage e são reenviadas. */
export const useMatchSync = () => {
  const queryClient = useQueryClient()
  const { mutateAsync } = useMutation({
    mutationFn: submitMatch,
    retry: 2,
    retryDelay: (attempt) => 500 * 2 ** attempt,
  })

  const [initialPending] = useState(loadPending)
  const pendingRef = useRef<MatchRecord[]>(initialPending)
  const sendingRef = useRef(new Set<string>())
  const [pendingIds, setPendingIds] = useState(() => new Set(initialPending.map((r) => r.id)))
  const [sendingIds, setSendingIds] = useState<ReadonlySet<string>>(() => new Set())

  const setPending = useCallback((next: MatchRecord[]) => {
    pendingRef.current = next
    savePending(next)
    setPendingIds(new Set(next.map((r) => r.id)))
  }, [])

  const submit = useCallback(
    async (record: MatchRecord) => {
      if (sendingRef.current.has(record.id)) return
      sendingRef.current.add(record.id)
      setSendingIds(new Set(sendingRef.current))
      try {
        await mutateAsync(record)
        setPending(pendingRef.current.filter((r) => r.id !== record.id))
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [RANKING_KEY] }),
          queryClient.invalidateQueries({ queryKey: [HISTORY_KEY] }),
        ])
      } catch {
        // continua pendente; novo envio por retry ou na próxima carga
      } finally {
        sendingRef.current.delete(record.id)
        setSendingIds(new Set(sendingRef.current))
      }
    },
    [mutateAsync, queryClient, setPending],
  )

  const enqueue = useCallback(
    (record: MatchRecord) => {
      if (!pendingRef.current.some((r) => r.id === record.id)) {
        setPending([...pendingRef.current, record])
      }
      void submit(record)
    },
    [setPending, submit],
  )

  const retryPending = useCallback(() => {
    pendingRef.current.forEach((r) => void submit(r))
  }, [submit])

  useEffect(() => {
    retryPending()
  }, [retryPending])

  const registrationOf = (id: string): Registration => {
    if (sendingIds.has(id)) return 'saving'
    return pendingIds.has(id) ? 'failed' : 'saved'
  }

  return { enqueue, retryPending, registrationOf }
}
