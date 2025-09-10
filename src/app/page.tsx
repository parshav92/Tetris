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
  I: { shape: [[1, 1, 1, 1]], color: 'bg-cyan-400 glow-cyan' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'bg-blue-400 glow-blue' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'bg-orange-400 glow-orange' },
  O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-400 glow-yellow' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-green-400 glow-green' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'bg-purple-400 glow-purple' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-red-400 glow-red' },
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_DROP_TIME = 560 // Reduced from 800 to 560 (30% faster)
const SPEED_INCREASE_FACTOR = 0.92 // Increased from 0.95 for faster progression
const POINTS_PER_LEVEL = 500

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
  const [highScore, setHighScore] = useState(0)
  const [linesCleared, setLinesCleared] = useState(0)
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
  const moveSound = useRef<HTMLAudioElement>(null)
  const rotateSound = useRef<HTMLAudioElement>(null)
  const dropSound = useRef<HTMLAudioElement>(null)
  const clearSound = useRef<HTMLAudioElement>(null)
  const gameOverSound = useRef<HTMLAudioElement>(null)

  // Load high score from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHighScore = localStorage.getItem('tetris-high-score')
      if (savedHighScore) {
        setHighScore(parseInt(savedHighScore, 10))
      }
    }
  }, [])

  // Save high score when game ends
  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score)
      if (typeof window !== 'undefined') {
        localStorage.setItem('tetris-high-score', score.toString())
      }
    }
  }, [gameOver, score, highScore])

  // Initialize sound effects
  useEffect(() => {
    if (!moveSound.current) moveSound.current = new Audio('/sounds/move.mp3')
    if (!rotateSound.current) rotateSound.current = new Audio('/sounds/rotate.mp3')
    if (!dropSound.current) dropSound.current = new Audio('/sounds/drop.mp3')
    if (!clearSound.current) clearSound.current = new Audio('/sounds/clear.mp3')
    if (!gameOverSound.current) gameOverSound.current = new Audio('/sounds/gameover.mp3')

    const sounds = [moveSound, rotateSound, dropSound, clearSound, gameOverSound]
    sounds.forEach(sound => {
      if (sound.current) {
        sound.current.volume = 0.3
      }
    })
  }, [])

  const playSound = useCallback((sound: React.RefObject<HTMLAudioElement | null>) => {
    if (sound.current) {
      sound.current.currentTime = 0
      sound.current.play().catch(error => console.error("Sound playback failed:", error))
    }
  }, [])

  const checkCollision = useCallback((x: number, y: number, shape: TetrominoShape): boolean => {
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
  }, [board])

  const isValidMove = useCallback((x: number, y: number, shape: TetrominoShape): boolean => 
    !checkCollision(x, y, shape), [checkCollision])

  const spawnNewPiece = useCallback(() => {
    const newPiece = {
      x: Math.floor(BOARD_WIDTH / 2) - 1,
      y: 0,
      tetromino: randomTetromino()
    }
    if (checkCollision(newPiece.x, newPiece.y, newPiece.tetromino.shape)) {
      setGameOver(true)
      playSound(gameOverSound)
    } else {
      setCurrentPiece(newPiece)
    }
  }, [checkCollision, playSound])

  const clearLines = useCallback((newBoard: Board) => {
    const getFullLines = (board: Board) =>
      board.reduce<number[]>((acc, row, idx) =>
        row.every(cell => cell !== 0) ? [...acc, idx] : acc, []);

    const clear = (board: Board, accumulatedScore = 0) => {
      const linesCleared = getFullLines(board);
      if (linesCleared.length === 0) {
        if (accumulatedScore > 0) {
          const newScore = score + accumulatedScore;
          setScore(newScore);
          setLinesCleared(prev => prev + Math.min(linesCleared.length, 4));
          const newLevel = Math.floor(newScore / POINTS_PER_LEVEL) + 1;
          if (newLevel > level) {
            setLevel(newLevel);
            const newDropTime = INITIAL_DROP_TIME * Math.pow(SPEED_INCREASE_FACTOR, newLevel - 1);
            setDropTime(newDropTime);
            previousDropTime.current = newDropTime;
          }
        }
        return;
      }
      playSound(clearSound);
      setCompletedRows(linesCleared);
      setTimeout(() => {
        const nextBoard = board.filter((_, idx) => !linesCleared.includes(idx));
        while (nextBoard.length < BOARD_HEIGHT) {
          nextBoard.unshift(Array(BOARD_WIDTH).fill(0));
        }
        dispatchBoard({ type: 'CLEAR_ROWS', newBoard: nextBoard });
        setCompletedRows([]);
        const linePoints = [0, 100, 300, 500, 800];
        const gained = linePoints[Math.min(linesCleared.length, 4)];
        setTimeout(() => clear(nextBoard, accumulatedScore + gained), 50);
      }, 500);
    };
    clear(newBoard);
  }, [score, level, playSound])

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
  }, [currentPiece, board, clearLines, spawnNewPiece])

  const moveLeft = useCallback(() => {
    if (currentPiece && !isPaused && !gameOver && isValidMove(currentPiece.x - 1, currentPiece.y, currentPiece.tetromino.shape)) {
      setCurrentPiece(prev => prev ? ({ ...prev, x: prev.x - 1 }) : prev)
      playSound(moveSound)
    }
  }, [currentPiece, isPaused, gameOver, isValidMove, playSound])

  const moveRight = useCallback(() => {
    if (currentPiece && !isPaused && !gameOver && isValidMove(currentPiece.x + 1, currentPiece.y, currentPiece.tetromino.shape)) {
      setCurrentPiece(prev => prev ? ({ ...prev, x: prev.x + 1 }) : prev)
      playSound(moveSound)
    }
  }, [currentPiece, isPaused, gameOver, isValidMove, playSound])

  const moveDown = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return
    if (isValidMove(currentPiece.x, currentPiece.y + 1, currentPiece.tetromino.shape)) {
      setCurrentPiece(prev => prev ? ({ ...prev, y: prev.y + 1 }) : prev)
    } else {
      placePiece()
    }
  }, [currentPiece, isPaused, gameOver, isValidMove, placePiece])

  const hardDrop = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return

    let newY = currentPiece.y
    while (isValidMove(currentPiece.x, newY + 1, currentPiece.tetromino.shape)) {
      newY += 1
    }

    setCurrentPiece(prev => prev ? ({ ...prev, y: newY }) : prev)
    playSound(dropSound)
    setTimeout(() => placePiece(), 50)
  }, [currentPiece, isPaused, gameOver, isValidMove, playSound, placePiece])

  const rotate = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return
    const rotated = currentPiece.tetromino.shape[0].map((_, i) =>
      currentPiece.tetromino.shape.map(row => row[i]).reverse()
    )
    let newX = currentPiece.x
    let newY = currentPiece.y

    if (!isValidMove(newX, newY, rotated)) {
      if (isValidMove(newX - 1, newY, rotated)) {
        newX -= 1
      } else if (isValidMove(newX + 1, newY, rotated)) {
        newX += 1
      } else if (isValidMove(newX, newY - 1, rotated)) {
        newY -= 1
      } else {
        return
      }
    }

    setCurrentPiece(prev => prev ? ({
      ...prev,
      x: newX,
      y: newY,
      tetromino: { ...prev.tetromino, shape: rotated }
    }) : prev)
    playSound(rotateSound)
  }, [currentPiece, isPaused, gameOver, isValidMove, playSound])

  const togglePause = useCallback(() => {
    if (gameOver) return

    setIsPaused(prev => {
      if (!prev) {
        if (dropInterval.current) {
          clearInterval(dropInterval.current)
        }
        previousDropTime.current = dropTime
        return true
      } else {
        return false
      }
    })
  }, [gameOver, dropTime])

  const resetGame = useCallback(() => {
    dispatchBoard({ type: 'RESET' })
    setCurrentPiece(null)
    setScore(0)
    setLinesCleared(0)
    setGameOver(false)
    setDropTime(INITIAL_DROP_TIME)
    previousDropTime.current = INITIAL_DROP_TIME
    setLevel(1)
    setCompletedRows([])
    setIsPaused(false)
    if (dropInterval.current) {
      clearInterval(dropInterval.current)
    }
  }, [])

  const toggleMusic = useCallback(() => {
    setIsMusicPlaying(!isMusicPlaying)
  }, [isMusicPlaying])

  // Spawn new piece when needed
  useEffect(() => {
    if (!currentPiece && !gameOver) {
      spawnNewPiece()
    }
  }, [currentPiece, gameOver, spawnNewPiece])

  // Drop interval
  useEffect(() => {
    if (!gameOver && !isPaused) {
      dropInterval.current = setInterval(moveDown, dropTime)
    }
    return () => {
      if (dropInterval.current) clearInterval(dropInterval.current)
    }
  }, [moveDown, gameOver, dropTime, isPaused])

  // Resume from pause
  useEffect(() => {
    if (!isPaused && !gameOver && dropInterval.current === null) {
      dropInterval.current = setInterval(moveDown, previousDropTime.current)
    }
  }, [isPaused, gameOver, moveDown])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
  }, [moveLeft, moveRight, moveDown, rotate, hardDrop, gameOver, isPaused, togglePause])

  // Music control
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

  // Touch controls
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isPaused || gameOver) return
      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPaused || gameOver) return
      if (e.changedTouches.length === 0) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y

      const minDistance = 30

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > minDistance) {
          if (deltaX > 0) {
            moveRight()
          } else {
            moveLeft()
          }
        }
      } else {
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

  const renderBoard = () => {
    return board.map((row, y) =>
      row.map((cell, x) => {
        const isCompletedRow = completedRows.includes(y);
        let cellColor = isCompletedRow
          ? (typeof cell === 'string' && cell !== '0' ? cell : 'bg-gray-300')
          : (cell || 'bg-gray-100');
        const linesBelow = completedRows.filter(line => line > y).length;

        if (
          currentPiece &&
          y >= currentPiece.y &&
          y < currentPiece.y + currentPiece.tetromino.shape.length &&
          x >= currentPiece.x &&
          x < currentPiece.x + currentPiece.tetromino.shape[0].length &&
          currentPiece.tetromino.shape[y - currentPiece.y][x - currentPiece.x]
        ) {
          cellColor = currentPiece.tetromino.color;
        }

        return (
          <motion.div
            key={`${y}-${x}`}
            initial={false}
            animate={{
              scale: isCompletedRow ? [1, 1.2, 1] : 1,
              opacity: isCompletedRow ? [1, 0.5, 1] : 1,
              y: linesBelow > 0 ? [0, linesBelow * 25] : 0,
            }}
            transition={{
              duration: isCompletedRow ? 0.3 : linesBelow > 0 ? 0.3 : 0,
              times: isCompletedRow ? [0, 0.5, 1] : [0],
              delay: linesBelow > 0 ? 0.3 : 0
            }}
            className={`w-6 h-6 ${cellColor} ${isCompletedRow ? 'line-clear' : ''}`}
            style={{
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '2px'
            }}
          />
        );
      })
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A1F] text-white retro-container">
      <div className="arcade-frame p-8 rounded-lg shadow-2xl">
        <h1 className="text-5xl font-bold mb-8 text-center retro-text glow-text">TETRIS</h1>

        <div className="game-container flex flex-col md:flex-row gap-8">
          {/* Main game board */}
          <div className="bg-black/50 p-6 rounded-lg shadow-lg relative arcade-screen">
            <div
              ref={boardRef}
              className="grid relative game-board"
              style={{
                gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
                width: `${BOARD_WIDTH * 25}px`,
                height: `${BOARD_HEIGHT * 25}px`,
                border: '2px solid #304050',
                background: 'linear-gradient(to bottom, #0a0a1f 0%, #1a1a3f 100%)'
              }}
            >
              {renderBoard()}

              {/* Pause overlay */}
              {isPaused && !gameOver && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/80 z-10"
                >
                  <div className="text-white text-4xl font-bold retro-text glow-text">PAUSED</div>
                </motion.div>
              )}

              {/* Game over overlay */}
              {gameOver && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/80 z-10"
                >
                  <div className="text-white text-4xl font-bold retro-text glow-text">GAME OVER</div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="flex flex-col gap-6">
            <div className="stats-panel bg-black/50 p-4 rounded-lg">
              <div className="text-2xl font-bold retro-text glow-text">Score: {score}</div>
              <div className="text-lg retro-text">High Score: {highScore}</div>
              <div className="text-xl retro-text">Level: {level}</div>
              <div className="text-lg retro-text">Lines: {linesCleared}</div>
              <div className="text-xl retro-text">Speed: {Math.round((INITIAL_DROP_TIME - dropTime) / INITIAL_DROP_TIME * 100)}%</div>
            </div>

            {/* Controls */}
            <div className="controls-panel bg-black/50 p-4 rounded-lg">
              <div className="flex flex-col gap-4">
                <Button 
                  onClick={resetGame}
                  className="retro-button w-full"
                >
                  {gameOver ? 'Play Again' : 'Reset Game'}
                </Button>
                <Button 
                  onClick={togglePause} 
                  disabled={gameOver}
                  className="retro-button w-full"
                >
                  {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button 
                  onClick={toggleMusic}
                  className="retro-button w-full"
                >
                  <Music className="w-4 h-4 mr-2" />
                  {isMusicPlaying ? 'Stop Music' : 'Play Music'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile controls */}
        <div className="mobile-controls mt-6 md:hidden">
          <div className="grid grid-cols-3 gap-4">
            <Button onClick={moveLeft} className="retro-button h-16">
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button onClick={hardDrop} className="retro-button h-16">
              <ChevronDown className="w-8 h-8" />
            </Button>
            <Button onClick={moveRight} className="retro-button h-16">
              <ChevronRight className="w-8 h-8" />
            </Button>
          </div>
          <Button onClick={rotate} className="retro-button w-full mt-4 h-16">
            <RotateCw className="w-8 h-8" />
          </Button>
        </div>
      </div>

      <audio ref={audioRef} src="/Tetris.mp3" />
    </div>
  )
}
