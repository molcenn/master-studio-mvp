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
    // Gateway /tools/invoke endpoint'i ile doğrudan sessions_spawn çağır
    const response = await fetch(`${OPENCLAW_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'sessions_spawn',
        args: {
          task,
          model: model || 'moonshot/kimi-k2.5',
          label: label || 'Dashboard Task',
          agentId: 'main',
          runTimeoutSeconds: 300,
        },
      }),
    })

    const data = await response.json()
    
    if (data.ok) {
      const details = data.result?.details || data.result
      return NextResponse.json({
        success: true,
        message: 'Sub-agent başlatıldı',
        sessionKey: details?.childSessionKey,
        runId: details?.runId,
        model: model || 'moonshot/kimi-k2.5',
      })
    } else {
      return NextResponse.json({ 
        error: data.error?.message || 'Spawn failed',
        details: data 
      }, { status: 400 })
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
