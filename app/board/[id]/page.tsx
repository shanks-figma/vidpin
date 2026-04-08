'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pin, Board } from '@/lib/types'
import { getPin } from '@/lib/pins'
import { getBoard, removePinFromBoard, deleteBoard, addPinToBoard } from '@/lib/boards'
import PinCard from '@/components/PinCard'
import AddPinModal from '@/components/AddPinModal'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [board, setBoard] = useState<Board | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [showAddPin, setShowAddPin] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const b = getBoard(id)
    if (!b) { router.replace('/'); return }
    setBoard(b)
    setPins(b.pinIds.map((pid) => getPin(pid)).filter(Boolean) as Pin[])
  }, [id, router])

  function handleAdded(pin: Pin) {
    // pin already saved by AddPinModal; just link it to this board
    addPinToBoard(id, pin.id)
    setPins((prev) => [pin, ...prev])
    setBoard((prev) => prev ? { ...prev, pinIds: [pin.id, ...prev.pinIds] } : null)
    setShowAddPin(false)
  }

  function handleRemove(pinId: string) {
    removePinFromBoard(id, pinId)
    setPins((prev) => prev.filter((p) => p.id !== pinId))
    setBoard((prev) => prev ? { ...prev, pinIds: prev.pinIds.filter((i) => i !== pinId) } : null)
  }

  function handleDeleteBoard() {
    if (!board) return
    if (confirm(`Delete board "${board.name}"?`)) {
      deleteBoard(id)
      router.replace('/')
    }
  }

  if (!mounted || !board) return null

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
            ← Back
          </Link>
          <span className="font-bold text-lg text-gray-900 tracking-tight">📌 VidPin</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddPin(true)}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              + Add Pin
            </button>
            <button
              onClick={handleDeleteBoard}
              className="text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {pins.length} pin{pins.length !== 1 ? 's' : ''}
          </p>
        </div>

        {pins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Board is empty</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-xs">
              Add your first pin to this board.
            </p>
            <button
              onClick={() => setShowAddPin(true)}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Add a pin
            </button>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
            {pins.map((pin) => (
              <div key={pin.id} className="mb-4 break-inside-avoid relative group/item">
                <PinCard pin={pin} />
                <button
                  onClick={() => handleRemove(pin.id)}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white text-xs w-6 h-6 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center z-10"
                  title="Remove from board"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddPin && (
        <AddPinModal onClose={() => setShowAddPin(false)} onAdded={handleAdded} />
      )}
    </div>
  )
}
