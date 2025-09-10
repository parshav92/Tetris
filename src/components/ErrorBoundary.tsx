'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('Tetris game error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center px-4 justify-center min-h-screen bg-[#0A0A1F] text-white">
          <div className="arcade-frame p-8 rounded-lg shadow-2xl max-w-md">
            <h1 className="text-3xl font-bold mb-4 text-center retro-text glow-text text-red-700">
              Game Error!
            </h1>
            <p className="text-center mb-6 retro-text">
              Something went wrong with the game. Please refresh to restart.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="retro-button w-full p-4"
            >
              Restart Game
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
