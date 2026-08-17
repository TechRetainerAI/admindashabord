import { useCallback, useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
  /** Patch the loaded value in place after a mutation, avoiding a full refetch. */
  setData: (updater: (current: T) => T) => void
}

/**
 * Runs `fn` on mount and whenever `deps` change. Late responses from superseded
 * runs are discarded so a slow request can't overwrite a newer one.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataRaw] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  // `fn` is intentionally not a dependency: callers pass inline closures, which
  // would change identity every render. `deps` is the explicit contract.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    run()
      .then((value) => {
        if (!cancelled) setDataRaw(value)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [run, nonce])

  const setData = useCallback((updater: (current: T) => T) => {
    setDataRaw((current) => (current === null ? current : updater(current)))
  }, [])

  return { data, loading, error, reload: () => setNonce((n) => n + 1), setData }
}
