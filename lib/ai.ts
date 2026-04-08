import { Pin, PlatformType, TagType } from './types'

export function detectPlatform(url: string): PlatformType {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  return 'other'
}

export function getYoutubeThumbnail(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  if (match) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
  }
  return ''
}

export async function summarizeUrl(url: string): Promise<Omit<Pin, 'id' | 'createdAt' | 'updatedAt'>> {
  const res = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to summarize')
  }
  return res.json()
}

export async function chatWithPin(
  summary: string,
  transcript: string | undefined,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary, transcript, history, userMessage }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to get response')
  }
  const data = await res.json()
  return data.response
}

export const TAG_COLORS: Record<TagType, string> = {
  recipe: 'bg-orange-100 text-orange-700',
  editing: 'bg-purple-100 text-purple-700',
  fitness: 'bg-green-100 text-green-700',
  ideas: 'bg-yellow-100 text-yellow-700',
  workflow: 'bg-blue-100 text-blue-700',
  pointer: 'bg-pink-100 text-pink-700',
}

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  other: 'Video',
}
