'use client'

import { useState } from 'react'
import { Reminder } from '@/lib/types'
import { saveReminder, scheduleNotification } from '@/lib/reminders'

interface Props {
  pinId: string
  pinTitle: string
  onClose: () => void
  onSaved: (reminder: Reminder) => void
}

export default function SetReminderModal({ pinId, pinTitle, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(`Review: ${pinTitle}`)
  const [description, setDescription] = useState('')
  const [datetime, setDatetime] = useState(() => {
    // Default to 1 hour from now
    const d = new Date(Date.now() + 60 * 60 * 1000)
    d.setSeconds(0, 0)
    return d.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:MM"
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !datetime) return
    setSaving(true)

    const reminder: Reminder = {
      id: crypto.randomUUID(),
      pinId,
      pinTitle,
      title: title.trim(),
      description: description.trim(),
      scheduledAt: new Date(datetime).toISOString(),
      fired: false,
      createdAt: new Date().toISOString(),
    }

    saveReminder(reminder)
    await scheduleNotification(reminder)
    onSaved(reminder)
    setSaving(false)
  }

  const isPast = datetime && new Date(datetime) <= new Date()

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            🔔 Set Reminder
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              placeholder="Reminder title"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Note <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
              placeholder="What do you want to focus on?"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              required
            />
            {isPast && (
              <p className="text-xs text-red-400 mt-1">Please pick a future time</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || isPast || !title.trim()}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {saving ? 'Saving…' : 'Set Reminder'}
          </button>
        </form>
      </div>
    </div>
  )
}
