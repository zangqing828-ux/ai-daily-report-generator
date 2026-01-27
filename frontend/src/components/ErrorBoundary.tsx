import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-gray-900 flex items-center justify-center px-4">
          <div className="text-white text-center max-w-md">
            <h2 className="text-3xl mb-4">出错了</h2>
            <p className="text-gray-400 mb-6">{this.state.error?.message || '未知错误'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
