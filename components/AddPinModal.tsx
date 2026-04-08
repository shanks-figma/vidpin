'use client'

import { useState } from 'react'
import { Pin } from '@/lib/types'
import { summarizeUrl } from '@/lib/ai'
import { savePin } from '@/lib/pins'

interface Props {
  onClose: () => void
  onAdded: (pin: Pin) => void
}

export default function AddPinModal({ onClose, onAdded }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await summarizeUrl(url.trim())
      const pin: Pin = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      savePin(pin)
      onAdded(pin)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add a Pin</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube, Instagram, or TikTok URL..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent placeholder:text-gray-400"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={!url.trim() || loading}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generating summary...
              </>
            ) : (
              'Save & Summarize'
            )}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Supports YouTube · Instagram · TikTok · public video URLs
        </p>
      </div>
    </div>
  )
}
