'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Pin, ChatMessage, PinTask, Reminder } from '@/lib/types'
import { getPin, deletePin, getThread, appendMessage } from '@/lib/pins'
import { chatWithPin } from '@/lib/ai'
import { TAG_COLORS, PLATFORM_LABELS } from '@/lib/ai'
import SaveToBoardModal from '@/components/SaveToBoardModal'
import SetReminderModal from '@/components/SetReminderModal'
import { getRemindersForPin, checkOverdueReminders } from '@/lib/reminders'
import { getTasksForPin, saveTask, deleteTask } from '@/lib/tasks'

const TASK_TEMPLATES = [
  'Make a listicle',
  'Write a tweet thread',
  'Create a study guide',
  'Write a blog post intro',
  'Extract key quotes',
  'Make flashcards',
]

const FALLBACK_PROMPTS = [
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
  const [webSearch, setWebSearch] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [rightTab, setRightTab] = useState<'chat' | 'tasks'>('chat')
  const [tasks, setTasks] = useState<PinTask[]>([])
  const [taskPrompt, setTaskPrompt] = useState('')
  const [taskLoading, setTaskLoading] = useState(false)
  const [taskError, setTaskError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const p = getPin(id)
    if (!p) { router.replace('/'); return }
    setPin(p)
    setMessages(getThread(id).messages)
    setReminders(getRemindersForPin(id))
    setTasks(getTasksForPin(id))
    checkOverdueReminders()
  }, [id, router])

  async function runTask(prompt: string) {
    if (!pin || !prompt.trim() || taskLoading) return
    setTaskLoading(true)
    setTaskError('')
    setTaskPrompt('')
    try {
      const res = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: pin.summary, breakdown: pin.breakdown, prompt: prompt.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      const task: PinTask = {
        id: crypto.randomUUID(),
        pinId: pin.id,
        prompt: prompt.trim(),
        output: data.output,
        createdAt: new Date().toISOString(),
      }
      saveTask(task)
      setTasks((prev) => [task, ...prev])
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setTaskLoading(false)
    }
  }

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
      const result = await chatWithPin(
        pin.summary,
        pin.transcript,
        messages.map((m) => ({ role: m.role, content: m.content })),
        text.trim(),
        webSearch
      )
      const aiMsg: ChatMessage = { role: 'assistant', content: result.response, webSearched: result.webSearch, timestamp: new Date().toISOString() }
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
    <>
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
            ← Back
          </Link>
          <span className="font-bold text-lg text-gray-900 tracking-tight">📌 VidPin</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReminderModal(true)}
              className="relative text-gray-400 hover:text-gray-700 transition-colors"
              title="Set reminder"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {reminders.filter(r => !r.fired).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {reminders.filter(r => !r.fired).length}
                </span>
              )}
            </button>
            <button
              onClick={handleDelete}
              className="text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
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

            {/* Upcoming reminders */}
            {reminders.filter(r => !r.fired).length > 0 && (
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                {reminders.filter(r => !r.fired).map(r => (
                  <div key={r.id} className="flex items-start gap-2 text-xs text-gray-500">
                    <span className="mt-0.5">🔔</span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-700 truncate">{r.title}</p>
                      <p className="text-gray-400">{new Date(r.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <a
                href={pin.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors"
              >
                View original ↗
              </a>
              <button
                onClick={() => setShowSaveModal(true)}
                className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1.5 rounded-full transition-colors"
              >
                Save to Board
              </button>
            </div>
          </div>
        </aside>

        {/* Right: Chat / Tasks */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            {(['chat', 'tasks'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  rightTab === tab
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab === 'chat' ? 'Chat' : 'Tasks'}
              </button>
            ))}
          </div>

          {/* ── Chat tab ── */}
          {rightTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {pin.breakdown && <BreakdownBubble breakdown={pin.breakdown} />}
                {messages.length === 0 ? (
                  <div className={`flex flex-col items-center gap-3 py-4 ${pin.breakdown ? '' : 'h-full justify-center'}`}>
                    {!pin.breakdown && (
                      <p className="text-sm text-gray-400 text-center">
                        Ask anything about this video — steps, tools, recipes, summaries...
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(pin.quickPrompts?.length ? pin.quickPrompts : FALLBACK_PROMPTS).map((p) => (
                        <button key={p} onClick={() => send(p)}
                          className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-full border border-gray-200 transition-colors">
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
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

              {messages.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-50 flex gap-2 overflow-x-auto no-scrollbar">
                  {(pin.quickPrompts?.length ? pin.quickPrompts : FALLBACK_PROMPTS).map((p) => (
                    <button key={p} onClick={() => send(p)} disabled={loading}
                      className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full border border-gray-200 whitespace-nowrap transition-colors disabled:opacity-40">
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="p-3 border-t border-gray-100 space-y-2">
                <div className="flex gap-2">
                  <input value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder={webSearch ? 'Ask anything — searching the web too...' : 'Ask about this pin...'}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent placeholder:text-gray-400"
                    disabled={loading} />
                  <button type="submit" disabled={!input.trim() || loading}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    ↑
                  </button>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <button type="button" onClick={() => setWebSearch((v) => !v)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      webSearch ? 'bg-blue-50 border-blue-300 text-blue-600 font-medium' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'
                    }`}>
                    <span>🌐</span>
                    <span>Web search {webSearch ? 'on' : 'off'}</span>
                  </button>
                  {webSearch && <span className="text-xs text-gray-400">Answers pull from the web + video</span>}
                </div>
              </form>
            </>
          )}

          {/* ── Tasks tab ── */}
          {rightTab === 'tasks' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Empty state */}
                {tasks.length === 0 && !taskLoading && (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-8">
                    <p className="text-sm text-gray-400">Give Gemini a task based on this video</p>
                    <p className="text-xs text-gray-300">e.g. "Make a listicle", "Write a tweet thread"</p>
                  </div>
                )}

                {/* Loading state */}
                {taskLoading && (
                  <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-xs text-gray-400">Generating…</span>
                  </div>
                )}

                {/* Task results */}
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} onDelete={() => {
                    deleteTask(task.id)
                    setTasks((prev) => prev.filter((t) => t.id !== task.id))
                  }} />
                ))}

                {taskError && (
                  <p className="text-xs text-red-400 bg-red-50 rounded-xl px-3 py-2">{taskError}</p>
                )}
              </div>

              {/* Task input */}
              <div className="p-3 border-t border-gray-100 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {TASK_TEMPLATES.map((t) => (
                    <button key={t} onClick={() => runTask(t)} disabled={taskLoading}
                      className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full border border-gray-200 transition-colors disabled:opacity-40 whitespace-nowrap">
                      {t}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); runTask(taskPrompt) }} className="flex gap-2">
                  <input value={taskPrompt} onChange={(e) => setTaskPrompt(e.target.value)}
                    placeholder="Custom task — e.g. Write a YouTube description..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent placeholder:text-gray-400"
                    disabled={taskLoading} />
                  <button type="submit" disabled={!taskPrompt.trim() || taskLoading}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    ↑
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {showReminderModal && pin && (
      <SetReminderModal
        pinId={pin.id}
        pinTitle={pin.title}
        onClose={() => setShowReminderModal(false)}
        onSaved={(r) => { setReminders((prev) => [...prev, r]); setShowReminderModal(false) }}
      />
    )}

    {showSaveModal && pin && (
      <SaveToBoardModal pinId={pin.id} onClose={() => setShowSaveModal(false)} />
    )}
    </>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="flex flex-col gap-1 max-w-[85%]">
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-red-500 text-white rounded-tr-sm whitespace-pre-wrap'
              : 'bg-gray-100 text-gray-800 rounded-tl-sm'
          }`}
        >
          {isUser ? message.content : <MarkdownContent content={message.content} />}
        </div>
        {message.webSearched && (
          <span className="text-xs text-blue-400 flex items-center gap-1 px-1">
            🌐 <span>Searched the web</span>
          </span>
        )}
      </div>
    </div>
  )
}

function BreakdownBubble({ breakdown }: { breakdown: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed">
        <MarkdownContent content={breakdown} />
      </div>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children }) => <h2 className="font-bold text-gray-900 text-sm mt-3 mb-1 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="font-semibold text-gray-800 text-sm mt-2 mb-1">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
        li: ({ children }) => <li className="text-gray-700">{children}</li>,
        p: ({ children }) => <p className="my-1">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{children}</a>,
        code: ({ children }) => <code className="bg-gray-200 text-gray-800 rounded px-1 text-xs font-mono">{children}</code>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600 my-1">{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function TaskCard({ task, onDelete }: { task: PinTask; onDelete: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(task.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-700 truncate">{task.prompt}</p>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button onClick={copy}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button onClick={onDelete}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors">
            ✕
          </button>
        </div>
      </div>
      <div className="px-4 py-3 text-sm text-gray-800 leading-relaxed">
        <MarkdownContent content={task.output} />
      </div>
    </div>
  )
}
