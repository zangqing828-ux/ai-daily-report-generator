import CallScreen from './components/CallScreen'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <CallScreen />
    </ErrorBoundary>
  )
}

export default App
