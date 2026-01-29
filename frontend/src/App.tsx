import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProjectList from './components/ProjectList'
import CreateProject from './components/CreateProject'
import ProjectDetail from './components/ProjectDetail'
import CallScreen from './components/CallScreen'
import ReportPreview from './components/ReportPreview'
import HistoryList from './components/HistoryList'
import HistoryDetail from './components/HistoryDetail'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/projects/create" element={<CreateProject />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/call" element={<CallScreen />} />
          <Route path="/preview" element={<ReportPreview />} />
          <Route path="/history" element={<HistoryList />} />
          <Route path="/history/:id" element={<HistoryDetail />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
