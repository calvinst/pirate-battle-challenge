import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const startMocking = async (): Promise<void> => {
  await setupWorker(...handlers).start({
    onUnhandledFrame: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}
