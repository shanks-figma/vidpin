'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pin, ChatMessage } from '@/lib/types'
import { getPin, deletePin, getThread, appendMessage } from '@/lib/pins'
import { chatWithPin } from '@/lib/ai'
import { TAG_COLORS, PLATFORM_LABELS } from '@/lib/ai'

const QUICK_PROMPTS = [
  'Turn this into step-by-step instructions',
  'What tools or resources are mentioned?',
  'Summarize in one sentence',
  'Give me action items',
]

export default function PinDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [pin, setPin] = useState<Pin | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const p = getPin(id)
    if (!p) { router.replace('/'); return }
    setPin(p)
    setMessages(getThread(id).messages)
  }, [id, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    if (!pin || !text.trim() || loading) return
    const userMsg: ChatMessage = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    appendMessage(pin.id, userMsg)
    setLoading(true)
    try {
      const response = await chatWithPin(
        pin.summary,
        pin.transcript,
        messages.map((m) => ({ role: m.role, content: m.content })),
        text.trim()
      )
      const aiMsg: ChatMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() }
      setMessages((prev) => [...prev, aiMsg])
      appendMessage(pin.id, aiMsg)
    } catch {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  function handleDelete() {
    if (!pin) return
    if (confirm('Delete this pin?')) {
      deletePin(pin.id)
      router.replace('/')
    }
  }

  if (!pin) return null

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
            ← Back
          </Link>
          <span className="font-bold text-lg text-gray-900 tracking-tight">📌 VidPin</span>
          <button
            onClick={handleDelete}
            className="text-sm text-red-400 hover:text-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col lg:flex-row gap-6">

        {/* Left: Pin info */}
        <aside className="lg:w-80 xl:w-96 flex-shrink-0 space-y-4">
          {/* Thumbnail */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
            {pin.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pin.thumbnailUrl} alt={pin.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No thumbnail</div>
            )}
          </div>

          {/* Info card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-bold text-gray-900 leading-snug text-base">{pin.title}</h1>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                {PLATFORM_LABELS[pin.sourcePlatform]}
              </span>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">{pin.summary}</p>

            {pin.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pin.tags.map((tag) => (
                  <span key={tag} className={`text-xs px-2.5 py-1 rounded-full font-medium ${TAG_COLORS[tag]}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <a
              href={pin.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              View original ↗
            </a>
          </div>
        </aside>

        {/* Right: Chat */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">Chat with this pin</h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-sm text-gray-400 text-center">
                  Ask anything about this video — steps, tools, recipes, summaries...
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-full border border-gray-200 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble key={i} message={msg} />
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Quick prompts (when there are messages) */}
          {messages.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-50 flex gap-2 overflow-x-auto no-scrollbar">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  disabled={loading}
                  className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full border border-gray-200 whitespace-nowrap transition-colors disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input) }}
            className="p-3 border-t border-gray-100 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this pin..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent placeholder:text-gray-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-red-500 text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-800 rounded-tl-sm'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}
