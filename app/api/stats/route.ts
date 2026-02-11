import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// GET /api/stats - Get dashboard statistics
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get project count
    const { count: projectCount, error: projectError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    if (projectError) throw projectError

    // Get message count (from today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayMessageCount, error: messageError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    if (messageError) throw messageError

    // Get file count
    const { count: fileCount, error: fileError } = await supabase
      .from('files')
      .select('*', { count: 'exact', head: true })

    if (fileError) throw fileError

    // Get recent projects with message counts
    const { data: recentProjects, error: recentError } = await supabase
      .from('projects')
      .select(`
        *,
        messages:messages(count)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) throw recentError

    // Mock active agents (until real agent tracking implemented)
    const activeAgents = 4

    // Mock pending reviews
    const pendingReviews = 3

    return NextResponse.json({
      stats: {
        projectCount: projectCount || 0,
        activeAgents,
        pendingReviews,
        todayMessageCount: todayMessageCount || 0,
        fileCount: fileCount || 0,
      },
      recentProjects: recentProjects || [],
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
