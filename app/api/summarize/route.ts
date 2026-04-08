import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { PlatformType, TagType } from '@/lib/types'

const execAsync = promisify(exec)
const YTDLP = '/opt/homebrew/bin/yt-dlp'
const EXEC_ENV = { ...process.env, PATH: `/opt/homebrew/bin:${process.env.PATH}` }

function detectPlatform(url: string): PlatformType {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  return 'other'
}

async function getMetadata(url: string) {
  const { stdout } = await execAsync(
    `${YTDLP} --no-playlist -j --no-warnings "${url}"`,
    { timeout: 30000, env: EXEC_ENV }
  )
  return JSON.parse(stdout)
}

async function downloadVideo(url: string, outputPath: string) {
  await execAsync(
    `${YTDLP} --no-playlist -f "best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${url}"`,
    { timeout: 120000, env: EXEC_ENV }
  )
}

async function fetchThumbnailAsDataUrl(thumbnailUrl: string): Promise<string> {
  try {
    const res = await fetch(thumbnailUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    if (!res.ok) return thumbnailUrl
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${base64}`
  } catch {
    return thumbnailUrl
  }
}

async function uploadToGemini(apiKey: string, filePath: string, mimeType: string): Promise<string> {
  const fileData = await readFile(filePath)
  const fileSize = fileData.length

  // Initiate resumable upload
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

  // Upload the file
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

async function summarizeWithGemini(apiKey: string, fileUri: string, url: string) {
  const prompt = `You are a knowledge extractor. Watch this video and provide a structured summary.

Respond with a JSON object (no markdown, no code blocks) with these exact fields:
- title: string (concise title, max 60 chars)
- summary: string (2-3 sentences capturing the core knowledge, tips, or value of the video)
- tags: array of 1-2 tags from this list only: ["recipe", "editing", "fitness", "ideas", "workflow", "pointer"]

Example:
{"title":"10 Morning Yoga Poses for Beginners","summary":"A guided 10-minute morning yoga flow focusing on gentle stretches and breathwork to energize your day. The instructor demonstrates each pose with modifications for beginners.","tags":["fitness"]}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { file_data: { mime_type: 'video/mp4', file_uri: fileUri } },
            { text: prompt },
          ],
        }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  )

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini')
  return JSON.parse(text)
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  const platform = detectPlatform(url)

  // Step 1: Get metadata via /opt/homebrew/bin/yt-dlp
  let metadata: Record<string, unknown> = {}
  let thumbnailUrl = 'https://placehold.co/640x360/1a1a2e/ffffff?text=Video'
  let metaTitle = ''

  try {
    metadata = await getMetadata(url)
    const rawThumbnail = (metadata.thumbnail as string) || ''
    metaTitle = (metadata.title as string) || ''
    if (rawThumbnail) {
      thumbnailUrl = await fetchThumbnailAsDataUrl(rawThumbnail)
    }
  } catch (err) {
    console.error('/opt/homebrew/bin/yt-dlp metadata error:', err)
    // Fall through — will use fallback thumbnail
  }

  if (!apiKey) {
    return NextResponse.json({
      url,
      title: metaTitle || 'Sample Video Pin',
      summary: 'Add a GEMINI_API_KEY to .env.local to get real AI summaries.',
      thumbnailUrl,
      sourcePlatform: platform,
      tags: ['ideas'] as TagType[],
    })
  }

  // Step 2: Download video to temp file
  const tmpFile = join(tmpdir(), `vidpin_${Date.now()}.mp4`)
  let fileUri: string | null = null

  try {
    await downloadVideo(url, tmpFile)

    // Step 3: Upload to Gemini Files API
    fileUri = await uploadToGemini(apiKey, tmpFile, 'video/mp4')
    await waitForFileActive(apiKey, fileUri)

    // Step 4: Summarize with Gemini vision
    const parsed = await summarizeWithGemini(apiKey, fileUri, url)

    return NextResponse.json({
      url,
      title: parsed.title || metaTitle || 'Untitled',
      summary: parsed.summary || '',
      thumbnailUrl,
      sourcePlatform: platform,
      tags: parsed.tags || [],
    })
  } catch (err) {
    console.error('Summarize error:', err)

    // Fallback: summarize from metadata description if video processing failed
    if (apiKey && metaTitle) {
      try {
        const desc = (metadata.description as string) || ''
        const fallbackPrompt = `Summarize this video based on its metadata.
Title: ${metaTitle}
Description: ${desc.slice(0, 1000)}

Respond with JSON only:
{"title":"...","summary":"2-3 sentence summary of what this video is about and its key value","tags":["one of: recipe, editing, fitness, ideas, workflow, pointer"]}`

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fallbackPrompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        )
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          return NextResponse.json({
            url,
            title: parsed.title || metaTitle,
            summary: parsed.summary || '',
            thumbnailUrl,
            sourcePlatform: platform,
            tags: parsed.tags || [],
          })
        }
      } catch (fallbackErr) {
        console.error('Fallback summarize error:', fallbackErr)
      }
    }

    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  } finally {
    // Clean up temp file
    try { await unlink(tmpFile) } catch {}
  }
}
