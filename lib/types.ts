export type PlatformType = 'youtube' | 'instagram' | 'tiktok' | 'other'

export type TagType = 'recipe' | 'editing' | 'fitness' | 'ideas' | 'workflow' | 'pointer'

export interface Pin {
  id: string
  url: string
  title: string
  summary: string
  breakdown?: string
  quickPrompts?: string[]
  transcript?: string
  thumbnailUrl: string
  sourcePlatform: PlatformType
  tags: TagType[]
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  webSearched?: boolean
}

export interface ChatThread {
  id: string
  pinId: string
  messages: ChatMessage[]
}

export interface Reminder {
  id: string
  pinId: string
  pinTitle: string
  title: string
  description: string
  scheduledAt: string  // ISO string
  fired: boolean
  createdAt: string
}

export interface Board {
  id: string
  name: string
  pinIds: string[]
  createdAt: string
  updatedAt: string
}
