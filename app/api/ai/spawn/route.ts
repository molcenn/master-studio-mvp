import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:18789'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { task, model, label } = await req.json()
  
  if (!task) {
    return NextResponse.json({ error: 'Task required' }, { status: 400 })
  }

  try {
    // Gateway chat endpoint'ine "sub-agent başlat" komutu gönder
    const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        'x-openclaw-agent-id': 'main',
      },
      body: JSON.stringify({
        model: model || 'moonshot/kimi-k2.5',
        messages: [
          { role: 'system', content: 'Sen Master Studio Dashboard\'un agent swarm yöneticisisin. Kullanıcı sana bir görev verdiğinde, sessions_spawn tool\'unu kullanarak sub-agent başlat. Görev tamamlandığında sonucu bildir.' },
          { role: 'user', content: `Bu görevi bir sub-agent ile çalıştır:\n\n${task}\n\nModel: ${model || 'moonshot/kimi-k2.5'}` }
        ],
        stream: false,
      }),
    })

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Sub-agent görevi başlatıldı',
      response: data.choices?.[0]?.message?.content || 'Görev gönderildi'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
