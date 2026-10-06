import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { resetDb } from '../mocks/db'
import { getScenario, isScenario, SCENARIOS, setScenario } from '../mocks/scenarios'

export function ScenarioPanel() {
  const queryClient = useQueryClient()
  const [scenario, setCurrent] = useState(getScenario)

  return (
    <details>
      <summary>Network scenarios</summary>
      <div className="field">
        <label htmlFor="scenario">Mock API scenario</label>
        <select
          id="scenario"
          value={scenario}
          onChange={(e) => {
            if (!isScenario(e.target.value)) return
            setScenario(e.target.value)
            setCurrent(e.target.value)
            void queryClient.invalidateQueries()
          }}
        >
          {Object.entries(SCENARIOS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => {
          setScenario('success')
          setCurrent('success')
          resetDb()
          queryClient.clear()
        }}
      >
        Reset mock data
      </button>
    </details>
  )
}
