'use client'

import { useEffect, useState } from 'react'
import { Board } from '@/lib/types'
import { getBoards, addPinToBoard, saveBoard, removePinFromBoard } from '@/lib/boards'

interface Props {
  pinId: string
  onClose: () => void
}

export default function SaveToBoardModal({ pinId, onClose }: Props) {
  const [boards, setBoards] = useState<Board[]>([])
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    const b = getBoards()
    setBoards(b)
    const alreadySaved: Record<string, boolean> = {}
    b.forEach((board) => {
      if (board.pinIds.includes(pinId)) alreadySaved[board.id] = true
    })
    setSaved(alreadySaved)
  }, [pinId])

  function toggle(boardId: string) {
    if (saved[boardId]) {
      removePinFromBoard(boardId, pinId)
      setSaved((prev) => ({ ...prev, [boardId]: false }))
    } else {
      addPinToBoard(boardId, pinId)
      setSaved((prev) => ({ ...prev, [boardId]: true }))
    }
    setBoards(getBoards())
  }

  function createAndSave() {
    if (!newName.trim()) return
    const board: Board = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      pinIds: [pinId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveBoard(board)
    setBoards(getBoards())
    setSaved((prev) => ({ ...prev, [board.id]: true }))
    setNewName('')
    setShowNew(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Save to Board</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {boards.length === 0 && !showNew && (
            <p className="text-sm text-gray-400 text-center py-4">No boards yet. Create one below.</p>
          )}
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => toggle(board.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                saved[board.id] ? 'bg-red-50 text-red-600' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  saved[board.id] ? 'border-red-500 bg-red-500' : 'border-gray-300'
                }`}
              >
                {saved[board.id] && <span className="text-white text-xs leading-none">✓</span>}
              </span>
              <span className="text-left flex-1 font-medium">{board.name}</span>
              <span className="text-xs text-gray-400">{board.pinIds.length}</span>
            </button>
          ))}
        </div>

        {showNew ? (
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createAndSave()}
              placeholder="Board name..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400"
              autoFocus
            />
            <button
              onClick={createAndSave}
              disabled={!newName.trim()}
              className="bg-red-500 disabled:bg-gray-200 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Create
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNew(true)}
            className="w-full mt-4 border border-dashed border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 rounded-xl py-2.5 text-sm transition-colors"
          >
            + New Board
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
