import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { startMocking } from './mocks/browser'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, retryDelay: 500, refetchOnWindowFocus: false },
  },
})

// Os mocks rodam também no build publicado.
await startMocking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
