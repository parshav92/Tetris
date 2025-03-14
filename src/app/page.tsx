"use client"
import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react'
import { Button } from "@/components/ui/button"
import { motion } from 'framer-motion'
import { Music, Pause, Play, ChevronLeft, ChevronRight, ChevronDown, RotateCw } from 'lucide-react'

type TetrominoShape = number[][]
type Tetromino = {
  shape: TetrominoShape
  color: string
}

type Piece = {
  x: number
  y: number
  tetromino: Tetromino
}

type Board = (string | number)[][]

const TETROMINOS: Record<string, Tetromino> = {
  I: { shape: [[1, 1, 1, 1]], color: 'bg-cyan-500' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'bg-blue-500' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'bg-orange-500' },
  O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-500' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-green-500' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'bg-purple-500' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-red-500' },
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_DROP_TIME = 800
const SPEED_INCREASE_FACTOR = 0.95 // Factor to decrease drop time for each level
const POINTS_PER_LEVEL = 500 // Points needed to advance to next level

type BoardAction =
  | { type: 'PLACE_PIECE'; newBoard: Board }
  | { type: 'CLEAR_ROWS'; newBoard: Board }
  | { type: 'RESET' }

const boardReducer = (state: Board, action: BoardAction): Board => {
  switch (action.type) {
    case 'PLACE_PIECE':
      return action.newBoard
    case 'CLEAR_ROWS':
      return action.newBoard
    case 'RESET':
      return createEmptyBoard()
    default:
      return state
  }
}

const createEmptyBoard = (): Board => Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))
const randomTetromino = (): Tetromino => {
  const keys = Object.keys(TETROMINOS)
  const randKey = keys[Math.floor(Math.random() * keys.length)]
  return TETROMINOS[randKey]
}

export default function Tetris() {
  const [board, dispatchBoard] = useReducer(boardReducer, createEmptyBoard())
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME)
  const [level, setLevel] = useState(1)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [completedRows, setCompletedRows] = useState<number[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dropInterval = useRef<NodeJS.Timeout | null>(null)
  const previousDropTime = useRef(INITIAL_DROP_TIME)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const touchStartRef = useRef({ x: 0, y: 0 })

  const checkCollision = (x: number, y: number, shape: TetrominoShape): boolean => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 0) {
          const newX = x + col
          const newY = y + row
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT || (newY >= 0 && board[newY][newX] !== 0)) {
            return true
          }
        }
      }
    }
    return false
  }

  const isValidMove = (x: number, y: number, shape: TetrominoShape): boolean => !checkCollision(x, y, shape)

  const moveLeft = useCallback(() => {
    if (currentPiece && !isPaused && !gameOver && isValidMove(currentPiece.x - 1, currentPiece.y, currentPiece.tetromino.shape)) {
      setCurrentPiece(prev => prev ? ({ ...prev, x: prev.x - 1 }) : prev)
    }
  }, [currentPiece, board, isPaused, gameOver])

  const moveRight = useCallback(() => {
    if (currentPiece && !isPaused && !gameOver && isValidMove(currentPiece.x + 1, currentPiece.y, currentPiece.tetromino.shape)) {
      setCurrentPiece(prev => prev ? ({ ...prev, x: prev.x + 1 }) : prev)
    }
  }, [currentPiece, board, isPaused, gameOver])

  const moveDown = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return
    if (isValidMove(currentPiece.x, currentPiece.y + 1, currentPiece.tetromino.shape)) {
      setCurrentPiece(prev => prev ? ({ ...prev, y: prev.y + 1 }) : prev)
    } else {
      placePiece()
    }
  }, [currentPiece, board, isPaused, gameOver])

  const hardDrop = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return
    
    let newY = currentPiece.y
    while (isValidMove(currentPiece.x, newY + 1, currentPiece.tetromino.shape)) {
      newY += 1
    }
    
    setCurrentPiece(prev => prev ? ({ ...prev, y: newY }) : prev)
    placePiece()
  }, [currentPiece, board, isPaused, gameOver])

  const rotate = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return
    const rotated = currentPiece.tetromino.shape[0].map((_, i) =>
      currentPiece.tetromino.shape.map(row => row[i]).reverse()
    )
    let newX = currentPiece.x
    let newY = currentPiece.y

    // Try to rotate, if not possible, try to adjust position
    if (!isValidMove(newX, newY, rotated)) {
      // Try to move left
      if (isValidMove(newX - 1, newY, rotated)) {
        newX -= 1
      }
      // Try to move right
      else if (isValidMove(newX + 1, newY, rotated)) {
        newX += 1
      }
      // Try to move up
      else if (isValidMove(newX, newY - 1, rotated)) {
        newY -= 1
      }
      // If still not possible, don't rotate
      else {
        return
      }
    }

    setCurrentPiece(prev => prev ? ({
      ...prev,
      x: newX,
      y: newY,
      tetromino: { ...prev.tetromino, shape: rotated }
    }) : prev)
  }, [currentPiece, board, isPaused, gameOver])

  const placePiece = useCallback(() => {
    if (!currentPiece) return
    const newBoard = board.map(row => [...row])
    currentPiece.tetromino.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const boardY = y + currentPiece.y
          const boardX = x + currentPiece.x
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = currentPiece.tetromino.color
          }
        }
      })
    })
    dispatchBoard({ type: 'PLACE_PIECE', newBoard })
    clearLines(newBoard)
    spawnNewPiece()
  }, [currentPiece, board])

  const clearLines = useCallback((newBoard) => {
    let linesCleared = []
    const updatedBoard = newBoard.filter((row, index) => {
      if (row.every(cell => cell !== 0)) {
        linesCleared.push(index)
        return false
      }
      return true
    })
    
    if (linesCleared.length > 0) {
      setCompletedRows(linesCleared)
      setTimeout(() => {
        while (updatedBoard.length < BOARD_HEIGHT) {
          updatedBoard.unshift(Array(BOARD_WIDTH).fill(0))
        }
        dispatchBoard({ type: 'CLEAR_ROWS', newBoard: updatedBoard })
        setCompletedRows([])
        
        // Calculate score based on number of lines cleared
        const linePoints = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4 lines
        const newScore = score + linePoints[Math.min(linesCleared.length, 4)]
        setScore(newScore)
        
        // Level up after reaching points threshold
        const newLevel = Math.floor(newScore / POINTS_PER_LEVEL) + 1
        if (newLevel > level) {
          setLevel(newLevel)
          // Gradually increase speed with each level
          const newDropTime = INITIAL_DROP_TIME * Math.pow(SPEED_INCREASE_FACTOR, newLevel - 1)
          setDropTime(newDropTime)
          previousDropTime.current = newDropTime
        }
      }, 500)
    }
  }, [score, level])

  const spawnNewPiece = useCallback(() => {
    const newPiece = {
      x: Math.floor(BOARD_WIDTH / 2) - 1,
      y: 0,
      tetromino: randomTetromino()
    }
    if (checkCollision(newPiece.x, newPiece.y, newPiece.tetromino.shape)) {
      setGameOver(true)
    } else {
      setCurrentPiece(newPiece)
    }
  }, [board])

  useEffect(() => {
    if (!currentPiece && !gameOver) {
      spawnNewPiece()
    }
  }, [currentPiece, gameOver, spawnNewPiece])

  useEffect(() => {
    if (!gameOver && !isPaused) {
      dropInterval.current = setInterval(moveDown, dropTime)
    }
    return () => clearInterval(dropInterval.current)
  }, [moveDown, gameOver, dropTime, isPaused])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameOver) return
      
      if (e.key === ' ' || e.key === 'Escape') {
        togglePause()
        return
      }
      
      if (isPaused) return
      
      switch (e.key) {
        case 'ArrowLeft':
          moveLeft()
          break
        case 'ArrowRight':
          moveRight()
          break
        case 'ArrowDown':
          moveDown()
          break
        case 'ArrowUp':
          rotate()
          break
        case 'Enter':
          hardDrop()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [moveLeft, moveRight, moveDown, rotate, hardDrop, gameOver, isPaused])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.5
      audioRef.current.loop = true
      if (!gameOver && isMusicPlaying && !isPaused) {
        audioRef.current.play().catch(error => console.error("Audio playback failed:", error))
      } else {
        audioRef.current.pause()
      }
    }
  }, [gameOver, isMusicPlaying, isPaused])

  // Handle touch gestures
  useEffect(() => {
    const handleTouchStart = (e) => {
      if (isPaused || gameOver) return
      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = (e) => {
      if (isPaused || gameOver) return
      if (e.changedTouches.length === 0) return
      
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      
      // Require a minimum distance to consider it a swipe
      const minDistance = 30
      
      // Determine if horizontal or vertical swipe based on which delta is larger
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > minDistance) {
          if (deltaX > 0) {
            moveRight()
          } else {
            moveLeft()
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > minDistance) {
          if (deltaY > 0) {
            hardDrop()
          } else {
            rotate()
          }
        }
      }
    }

    const boardElement = boardRef.current
    if (boardElement) {
      boardElement.addEventListener('touchstart', handleTouchStart)
      boardElement.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        boardElement.removeEventListener('touchstart', handleTouchStart)
        boardElement.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [moveLeft, moveRight, rotate, hardDrop, isPaused, gameOver])

  const resetGame = () => {
    dispatchBoard({ type: 'RESET' })
    setCurrentPiece(null)
    setScore(0)
    setGameOver(false)
    setDropTime(INITIAL_DROP_TIME)
    previousDropTime.current = INITIAL_DROP_TIME
    setLevel(1)
    setCompletedRows([])
    setIsPaused(false)
    clearInterval(dropInterval.current)
  }

  const togglePause = () => {
    if (gameOver) return
    
    setIsPaused(prev => {
      if (!prev) {
        // Pausing the game
        clearInterval(dropInterval.current)
        previousDropTime.current = dropTime
        return true
      } else {
        // Resuming the game
        dropInterval.current = setInterval(moveDown, previousDropTime.current)
        return false
      }
    })
  }

  const renderBoard = () => {
    return board.map((row, y) => 
      row.map((_, x) => {
        // Check if current cell has current piece
        let cellContent = null
        let cellColor = board[y][x] || 'bg-gray-100'
        
        if (
          currentPiece &&
          y >= currentPiece.y &&
          y < currentPiece.y + currentPiece.tetromino.shape.length &&
          x >= currentPiece.x &&
          x < currentPiece.x + currentPiece.tetromino.shape[0].length &&
          currentPiece.tetromino.shape[y - currentPiece.y][x - currentPiece.x]
        ) {
          cellColor = currentPiece.tetromino.color
        }
        
        return (
          <motion.div 
            key={`${y}-${x}`}
            initial={false}
            animate={{
              opacity: completedRows.includes(y) ? 0 : 1,
              scale: completedRows.includes(y) ? 1.1 : 1,
              backgroundColor: completedRows.includes(y) ? '#FFFFFF' : undefined
            }}
            transition={{ duration: 0.3 }}
            className={`w-5 h-5 ${cellColor}`}
            style={{ border: '1px solid #e5e7eb' }}
          />
        )
      })
    )
  }

  const toggleMusic = () => {
    setIsMusicPlaying(!isMusicPlaying)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-4">Tetris</h1>
      
      <div className="bg-white p-4 rounded-lg shadow-lg relative">
        <div 
          ref={boardRef}
          className="grid bg-gray-300 relative" 
          style={{ 
            gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
            width: `${BOARD_WIDTH * 20}px`,
            height: `${BOARD_HEIGHT * 20}px`,
            border: '1px solid #e5e7eb'
          }}
        >
          {renderBoard()}
          
          {/* Pause overlay - fixed positioning */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10 rounded-lg">
              <div className="text-white text-3xl font-bold">PAUSED</div>
            </div>
          )}
          
          {/* Game over overlay */}
          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10 rounded-lg">
              <div className="text-white text-3xl font-bold">GAME OVER</div>
            </div>
          )}
          
          {/* Landing animation for current piece */}
          {currentPiece && (
            <motion.div
              className="absolute w-full h-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </div>
      </div>
      
      <div className="mt-4 flex gap-4 items-center">
        <div className="text-xl font-bold">Score: {score}</div>
        <div className="text-lg">Level: {level}</div>
        <div className="text-lg">Speed: {Math.round((INITIAL_DROP_TIME - dropTime) / INITIAL_DROP_TIME * 100)}%</div>
      </div>
      
      {/* Game controls for desktop */}
      <div className="mt-2 text-sm text-gray-600 hidden md:block">
        Arrow keys to move, Up to rotate, Enter for hard drop, Space/Escape to pause
      </div>
      
      {/* Desktop controls */}
      <div className="flex gap-4 mt-4">
        <Button onClick={resetGame}>
          {gameOver ? 'Play Again' : 'Reset Game'}
        </Button>
        <Button onClick={togglePause} disabled={gameOver}>
          {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
        <Button onClick={toggleMusic}>
          <Music className="w-4 h-4 mr-2" />
          {isMusicPlaying ? 'Stop Music' : 'Play Music'}
        </Button>
      </div>
      
      {/* Mobile controls */}
      <div className="flex flex-col items-center mt-6 md:hidden">
        <div className="text-sm text-gray-600 mb-2">
          Swipe on board: ↑ to rotate, ↓ for hard drop, ← → to move
        </div>
        <Button onClick={rotate} className="w-16 h-16 rounded-full mb-4">
          <RotateCw className="w-8 h-8" />
        </Button>
        <div className="flex gap-4">
          <Button onClick={moveLeft} className="w-16 h-16 rounded-full">
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <Button onClick={hardDrop} className="w-16 h-16 rounded-full">
            <ChevronDown className="w-8 h-8" />
          </Button>
          <Button onClick={moveRight} className="w-16 h-16 rounded-full">
            <ChevronRight className="w-8 h-8" />
          </Button>
        </div>
      </div>
      
      <audio ref={audioRef} src="/Tetris.mp3" />
    </div>
  )
}