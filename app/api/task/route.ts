import { NextRequest, NextResponse } from 'next/server'

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

export async function POST(req: NextRequest) {
  const { summary, breakdown, prompt } = await req.json()

  if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ output: `**Demo output for:** ${prompt}\n\nAdd a GEMINI_API_KEY to enable real task generation.` })
  }

  const context = `You are a creative content assistant. Here is a video's content:

${summary}
${breakdown ? `\n${breakdown}` : ''}

---
Task: ${prompt}

Generate the output for this task. Use rich markdown formatting — headings, bullet points, bold, numbered lists as appropriate for the task type. Be thorough and specific to this video's actual content. Do not add preamble like "Sure!" or "Here is your..." — just output the content directly.`

  try {
    let output = ''
    for (const model of MODELS) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: context }] }],
          }),
        }
      )
      if (res.status === 503 || res.status === 429) continue
      if (!res.ok) throw new Error(`Gemini error ${res.status}`)
      const data = await res.json()
      output = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (output) break
    }
    if (!output) throw new Error('No response from Gemini')
    return NextResponse.json({ output })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate' }, { status: 500 })
  }
}
