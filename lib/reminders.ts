import { Reminder } from './types'

const KEY = 'vidpin_reminders'

export function getReminders(): Reminder[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveReminder(reminder: Reminder): void {
  const all = getReminders()
  const idx = all.findIndex((r) => r.id === reminder.id)
  if (idx >= 0) all[idx] = reminder
  else all.push(reminder)
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function deleteReminder(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getReminders().filter((r) => r.id !== id)))
}

export function getRemindersForPin(pinId: string): Reminder[] {
  return getReminders().filter((r) => r.pinId === pinId)
}

export function markFired(id: string): void {
  const all = getReminders()
  const r = all.find((r) => r.id === id)
  if (r) { r.fired = true; localStorage.setItem(KEY, JSON.stringify(all)) }
}

/** Request permission + schedule a browser notification for a reminder */
export async function scheduleNotification(reminder: Reminder): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  if (Notification.permission !== 'granted') return

  const delay = new Date(reminder.scheduledAt).getTime() - Date.now()
  if (delay <= 0) return // already past

  setTimeout(() => {
    new Notification(`⏰ ${reminder.title}`, {
      body: reminder.description || `Time to review: ${reminder.pinTitle}`,
      icon: '/icons/icon-192.png',
      tag: reminder.id,
      data: { pinId: reminder.pinId },
    })
    markFired(reminder.id)
  }, delay)
}

/** On app load — fire any overdue unfired reminders as notifications */
export function checkOverdueReminders(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const now = Date.now()
  getReminders()
    .filter((r) => !r.fired && new Date(r.scheduledAt).getTime() <= now)
    .forEach((r) => {
      new Notification(`⏰ ${r.title}`, {
        body: r.description || `Time to review: ${r.pinTitle}`,
        icon: '/icons/icon-192.png',
        tag: r.id,
        data: { pinId: r.pinId },
      })
      markFired(r.id)
    })
}
