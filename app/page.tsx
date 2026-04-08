'use client'

import { useState, useEffect } from 'react'
import { Pin } from '@/lib/types'
import { getPins } from '@/lib/pins'
import PinCard from '@/components/PinCard'
import AddPinModal from '@/components/AddPinModal'

export default function HomePage() {
  const [pins, setPins] = useState<Pin[]>([])
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setPins(getPins())
  }, [])

  function handleAdded(pin: Pin) {
    setPins((prev) => [pin, ...prev])
    setShowModal(false)
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg text-gray-900 tracking-tight">
            📌 VidPin
          </span>
          <button
            onClick={() => setShowModal(true)}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span> Add Pin
          </button>
        </div>
      </header>

      {/* Board */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!mounted ? null : pins.length === 0 ? (
          <EmptyState onAdd={() => setShowModal(true)} />
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
            {pins.map((pin) => (
              <div key={pin.id} className="mb-4 break-inside-avoid">
                <PinCard pin={pin} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating + button (mobile) */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 bg-red-500 hover:bg-red-600 text-white w-14 h-14 rounded-full shadow-lg text-2xl flex items-center justify-center transition-colors sm:hidden"
        aria-label="Add pin"
      >
        +
      </button>

      {showModal && (
        <AddPinModal onClose={() => setShowModal(false)} onAdded={handleAdded} />
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
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
