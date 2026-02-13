import { NextRequest, NextResponse } from 'next/server'

// This API route is kept for backwards compatibility
// All stats data is now calculated from localStorage on the client side
// See /lib/localStorage.ts for the actual implementation

// GET /api/stats - Returns mock stats (client uses localStorage)
export async function GET(req: NextRequest) {
  // Client-side localStorage handles this
  return NextResponse.json({
    stats: {
      projectCount: 0,
      activeAgents: 4,
      pendingReviews: 2,
      todayMessageCount: 0,
      fileCount: 0
    },
    recentProjects: [],
    source: 'localStorage'
  })
}
