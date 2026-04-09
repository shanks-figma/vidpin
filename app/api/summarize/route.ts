import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { unlink, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { PlatformType, TagType } from '@/lib/types'

const execAsync = promisify(exec)
const YTDLP = '/opt/homebrew/bin/yt-dlp'
const EXEC_ENV = { ...process.env, PATH: `/opt/homebrew/bin:${process.env.PATH}` }

const GEMINI_PROMPT = `You are a knowledge extractor. Watch this video and provide a structured response.

Respond with a JSON object (no markdown, no code blocks) with these exact fields:
- title: string (concise title, max 60 chars)
- summary: string (2-3 sentences — a short tagline capturing the core value of the video, shown on the card)
- breakdown: string (a rich markdown deep-dive shown in the chat. Use ## headings and bullet points. Include sections relevant to the video such as: Key Insights, Step-by-Step, Tools & Resources, Action Items, Notable Quotes. Minimum 150 words.)
- quickPrompts: array of exactly 4 short follow-up questions a viewer would naturally ask about THIS specific video. Make them specific to the actual content — e.g. if it's a recipe, ask about substitutions or serving size; if it's a finance video, ask about specific strategies mentioned; if it's a workout, ask about difficulty or equipment. Each prompt max 8 words.
- tags: array of 1-2 tags from this list only: ["recipe", "editing", "fitness", "ideas", "workflow", "pointer"]

Example:
{"title":"10 Morning Yoga Poses","summary":"A beginner-friendly 10-minute morning yoga flow focusing on gentle stretches and breathwork to energize the day.","breakdown":"## Key Insights\\n- Morning yoga activates the parasympathetic nervous system...\\n## Step-by-Step\\n1. Start in child's pose...\\n## Action Items\\n- [ ] Practice for 10 minutes each morning","quickPrompts":["Can I do this with back pain?","How long until I see results?","What mat and props do I need?","Is there a harder version of this?"],"tags":["fitness"]}`

// ─── Helpers ────────────────────────────────────────────────────────────────

function detectPlatform(url: string): PlatformType {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  return 'other'
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&/\s]+)/,
    /youtu\.be\/([^?&/\s]+)/,
    /\/shorts\/([^?&/\s]+)/,
    /\/embed\/([^?&/\s]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

async function fetchThumbnailAsDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    if (!res.ok) return url
    const buf = await res.arrayBuffer()
    const ct = res.headers.get('content-type') || 'image/jpeg'
    return `data:${ct};base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return url
  }
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

async function callGemini(apiKey: string, parts: object[]): Promise<{ title: string; summary: string; breakdown: string; quickPrompts: string[]; tags: TagType[] }> {
  let lastError = ''
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    )
    if (res.status === 503 || res.status === 429) {
      lastError = `${model} unavailable (${res.status})`
      continue // try next model
    }
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty Gemini response')
    return JSON.parse(text)
  }
  throw new Error(`All Gemini models unavailable: ${lastError}`)
}

// ─── YouTube path (Vercel-compatible — Gemini reads YouTube URLs natively) ──

async function summarizeYouTube(url: string, apiKey: string) {
  const videoId = extractYouTubeId(url)

  // 1. Title + thumbnail via YouTube oEmbed (free, no key)
  let title = ''
  let thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : 'https://placehold.co/640x360/1a1a2e/ffffff?text=Video'

  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    )
    if (oembed.ok) {
      const d = await oembed.json()
      title = d.title || ''
      // Prefer maxresdefault, fall back to hqdefault
      if (videoId) {
        const maxres = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        const check = await fetch(maxres, { method: 'HEAD' })
        thumbnailUrl = check.ok ? maxres : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  } catch { /* fall through */ }

  const thumbnailData = await fetchThumbnailAsDataUrl(thumbnailUrl)

  // 2. Pass YouTube URL directly to Gemini (no download needed)
  const parsed = await callGemini(apiKey, [
    { file_data: { mime_type: 'video/mp4', file_uri: url } },
    { text: GEMINI_PROMPT },
  ])

  return { title: parsed.title || title, summary: parsed.summary, breakdown: parsed.breakdown, quickPrompts: parsed.quickPrompts, tags: parsed.tags, thumbnailData }
}

// ─── Non-YouTube path (uses yt-dlp, works locally) ──────────────────────────

async function uploadToGemini(apiKey: string, filePath: string, mimeType: string): Promise<string> {
  const fileData = await readFile(filePath)
  const fileSize = fileData.length

  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(fileSize),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: 'vidpin_video' } }),
    }
  )
  const uploadUrl = initRes.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('Failed to get upload URL')

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Type': mimeType,
    },
    body: fileData,
  })
  const uploadData = await uploadRes.json()
  return uploadData.file?.uri
}

async function waitForFileActive(apiKey: string, fileUri: string): Promise<void> {
  const fileName = fileUri.split('/').pop()
  for (let i = 0; i < 60; i++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`
    )
    const data = await res.json()
    if (data.state === 'ACTIVE') return
    if (data.state === 'FAILED') throw new Error('File processing failed')
    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error('File processing timed out')
}

async function summarizeWithYtdlp(url: string, apiKey: string) {
  // Metadata
  const { stdout } = await execAsync(
    `${YTDLP} --no-playlist -j --no-warnings "${url}"`,
    { timeout: 30000, env: EXEC_ENV }
  )
  const meta = JSON.parse(stdout)
  const metaTitle = (meta.title as string) || ''
  const rawThumb = (meta.thumbnail as string) || ''
  const thumbnailData = rawThumb ? await fetchThumbnailAsDataUrl(rawThumb) : ''

  // Download
  const tmpFile = join(tmpdir(), `vidpin_${Date.now()}.mp4`)
  try {
    await execAsync(
      `${YTDLP} --no-playlist -f "best[ext=mp4]/best" --merge-output-format mp4 -o "${tmpFile}" "${url}"`,
      { timeout: 120000, env: EXEC_ENV }
    )
    const fileUri = await uploadToGemini(apiKey, tmpFile, 'video/mp4')
    await waitForFileActive(apiKey, fileUri)
    const parsed = await callGemini(apiKey, [
      { file_data: { mime_type: 'video/mp4', file_uri: fileUri } },
      { text: GEMINI_PROMPT },
    ])
    return { title: parsed.title || metaTitle, summary: parsed.summary, breakdown: parsed.breakdown, quickPrompts: parsed.quickPrompts, tags: parsed.tags, thumbnailData }
  } finally {
    try { await unlink(tmpFile) } catch { /* ignore */ }
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  const platform = detectPlatform(url)

  if (!apiKey) {
    return NextResponse.json({
      url, platform,
      title: 'Sample Video Pin',
      summary: 'Add a GEMINI_API_KEY to your environment to enable AI summaries.',
      thumbnailUrl: 'https://placehold.co/640x360/1a1a2e/ffffff?text=Video',
      sourcePlatform: platform,
      tags: ['ideas'] as TagType[],
    })
  }

  try {
    let result: { title: string; summary: string; breakdown: string; quickPrompts: string[]; tags: TagType[]; thumbnailData: string }

    if (platform === 'youtube') {
      // Vercel-compatible: Gemini reads YouTube URLs natively
      result = await summarizeYouTube(url, apiKey)
    } else {
      // Local only: requires yt-dlp
      result = await summarizeWithYtdlp(url, apiKey)
    }

    return NextResponse.json({
      url,
      title: result.title || 'Untitled',
      summary: result.summary || '',
      breakdown: result.breakdown || '',
      quickPrompts: result.quickPrompts || [],
      thumbnailUrl: result.thumbnailData,
      sourcePlatform: platform,
      tags: result.tags || [],
    })
  } catch (err) {
    console.error('Summarize error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
