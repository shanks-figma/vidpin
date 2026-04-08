'use client'

import { useState, useEffect } from 'react'
import { Pin, Board } from '@/lib/types'
import { getPins } from '@/lib/pins'
import { getBoards } from '@/lib/boards'
import PinCard from '@/components/PinCard'
import BoardCard from '@/components/BoardCard'
import AddPinModal from '@/components/AddPinModal'
import CreateBoardModal from '@/components/CreateBoardModal'

type Tab = 'pins' | 'boards'

export default function HomePage() {
  const [pins, setPins] = useState<Pin[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [tab, setTab] = useState<Tab>('pins')
  const [showAddPin, setShowAddPin] = useState(false)
  const [showCreateBoard, setShowCreateBoard] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setPins(getPins())
    setBoards(getBoards())
  }, [])

  function handleAdded(pin: Pin) {
    setPins((prev) => [pin, ...prev])
    setShowAddPin(false)
  }

  function handleBoardCreated(board: Board) {
    setBoards((prev) => [board, ...prev])
    setShowCreateBoard(false)
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg text-gray-900 tracking-tight">📌 VidPin</span>
          <div className="flex gap-2">
            {tab === 'boards' && (
              <button
                onClick={() => setShowCreateBoard(true)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
              >
                + Board
              </button>
            )}
            <button
              onClick={() => setShowAddPin(true)}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
            >
              <span className="text-base leading-none">+</span> Add Pin
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-5 flex gap-1">
        {(['pins', 'boards'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'pins' ? `Pins${mounted ? ` (${pins.length})` : ''}` : `Boards${mounted ? ` (${boards.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {!mounted ? null : tab === 'pins' ? (
          pins.length === 0 ? (
            <EmptyPins onAdd={() => setShowAddPin(true)} />
          ) : (
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
              {pins.map((pin) => (
                <div key={pin.id} className="mb-4 break-inside-avoid">
                  <PinCard pin={pin} />
                </div>
              ))}
            </div>
          )
        ) : boards.length === 0 ? (
          <EmptyBoards onCreate={() => setShowCreateBoard(true)} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </main>

      {/* Floating + button (mobile) */}
      <button
        onClick={() => setShowAddPin(true)}
        className="fixed bottom-6 right-6 bg-red-500 hover:bg-red-600 text-white w-14 h-14 rounded-full shadow-lg text-2xl flex items-center justify-center transition-colors sm:hidden"
        aria-label="Add pin"
      >
        +
      </button>

      {showAddPin && (
        <AddPinModal onClose={() => setShowAddPin(false)} onAdded={handleAdded} />
      )}
      {showCreateBoard && (
        <CreateBoardModal onClose={() => setShowCreateBoard(false)} onCreated={handleBoardCreated} />
      )}
    </div>
  )
}

function EmptyPins({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-6xl mb-4">📌</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Your board is empty</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        Save a video URL to get an instant AI summary and start chatting with your content.
      </p>
      <button
        onClick={onAdd}
        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
      >
        Add your first pin
      </button>
    </div>
  )
}

function EmptyBoards({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-6xl mb-4">📋</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">No boards yet</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        Create a board to organise your pins by topic.
      </p>
      <button
        onClick={onCreate}
        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
      >
        Create your first board
      </button>
    </div>
  )
}
