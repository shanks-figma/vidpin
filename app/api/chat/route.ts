import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { summary, transcript, history, userMessage } = await req.json()

  if (!userMessage) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    // Demo mode
    const demos: Record<string, string> = {
      step: '1. Start with the basics outlined in the video\n2. Practice the technique shown\n3. Apply it to your own context\n4. Iterate and refine\n5. Share your results',
      recipe: 'Here\'s the recipe from the video:\n\n**Ingredients:**\n- Key ingredient 1\n- Key ingredient 2\n\n**Steps:**\n1. Prepare your ingredients\n2. Follow the method shown\n3. Taste and adjust\n\n*(Add your Gemini API key for real extraction)*',
      tool: 'Tools mentioned in this video:\n- Primary tool/app\n- Supporting resources\n\n*(Add your Gemini API key for real extraction)*',
    }
    const lower = userMessage.toLowerCase()
    let response = 'I can help you extract knowledge from this pin! Add a Gemini API key to `GEMINI_API_KEY` in your `.env.local` for real AI responses.\n\nIn the meantime, try asking about steps, recipes, or tools.'
    if (lower.includes('step') || lower.includes('guide') || lower.includes('how')) {
      response = demos.step
    } else if (lower.includes('recipe') || lower.includes('ingredient')) {
      response = demos.recipe
    } else if (lower.includes('tool') || lower.includes('app') || lower.includes('software')) {
      response = demos.tool
    }
    return NextResponse.json({ response })
  }

  try {
    const systemContext = `You are a helpful knowledge assistant. You help users extract actionable insights from video content.

Here is the video summary:
${summary}
${transcript ? `\nTranscript:\n${transcript}` : ''}

Answer questions based on this content. Be concise, practical, and format responses with markdown when helpful (lists, bold, etc.).`

    const contents = [
      { role: 'user', parts: [{ text: systemContext }] },
      { role: 'model', parts: [{ text: 'I have the video summary loaded and ready to help you extract insights.' }] },
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ]

    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
    let text = ''
    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        }
      )
      if (response.status === 503 || response.status === 429) continue
      if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
      const data = await response.json()
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (text) break
    }
    if (!text) throw new Error('No response from Gemini')

    return NextResponse.json({ response: text })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
