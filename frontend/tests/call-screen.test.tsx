import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CallScreen from '../src/components/CallScreen'

describe('CallScreen', () => {
  it('displays call screen with correct initial state', () => {
    render(<CallScreen />)

    // 检查项目名称显示
    expect(screen.getByText('项目 A')).toBeInTheDocument()

    // 检查开始按钮存在
    const startButton = screen.getByRole('button', { name: /📞/ })
    expect(startButton).toBeInTheDocument()
  })

  it('toggles pause state when pause button clicked', async () => {
    render(<CallScreen />)

    // 先开始通话
    const startButton = screen.getByRole('button', { name: /📞/ })
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /⏸️/ })).toBeInTheDocument()
    })

    // 点击暂停按钮
    const pauseButton = screen.getByRole('button', { name: /⏸️/ })
    fireEvent.click(pauseButton)

    // 应该显示播放按钮
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /▶️/ })).toBeInTheDocument()
    })
  })

  it('displays AI state correctly', () => {
    render(<CallScreen />)

    // 初始状态应该显示准备就绪
    expect(screen.getByText('准备就绪')).toBeInTheDocument()
  })

  it('shows correct initial duration', () => {
    render(<CallScreen />)

    expect(screen.getByText('通话时长: 0:00')).toBeInTheDocument()
  })
})
