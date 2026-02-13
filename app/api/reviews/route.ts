import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

interface Review {
  id: string
  title: string
  description: string
  agent: string
  project: string
  status: 'pending' | 'approved' | 'rejected'
  type: 'code' | 'feature' | 'design' | 'decision'
  created_at: string
  diff: string | null
}

const REVIEWS_FILE = join(process.cwd(), '.reviews.json')

const DEFAULT_REVIEWS: Review[] = [
  {
    id: '1',
    title: 'Dashboard layout refactoring',
    description: 'Sidebar navigasyon + view routing eklendi',
    agent: 'Kimi K2.5',
    project: 'AI Agent Dashboard',
    status: 'pending',
    type: 'code',
    created_at: new Date().toISOString(),
    diff: `- gridTemplateColumns: "260px 1fr 380px"\n+ gridTemplateColumns: \`260px 1fr 4px \${chatWidth}px\``
  },
  {
    id: '2',
    title: 'Model selector entegrasyonu',
    description: '/model komutu ile gerçek model değişimi',
    agent: 'Kimi K2.5',
    project: 'AI Agent Dashboard',
    status: 'pending',
    type: 'feature',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    diff: null
  },
  {
    id: '3',
    title: 'Glass morphism card component',
    description: 'Yeni glass morphism kart tasarımı uygulandı',
    agent: 'Claude Sonnet',
    project: 'AI Agent Dashboard',
    status: 'approved',
    type: 'design',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    diff: null
  },
  {
    id: '4',
    title: 'API endpoint security update',
    description: 'JWT token validation eklendi',
    agent: 'Claude Opus',
    project: 'AI Agent Dashboard',
    status: 'rejected',
    type: 'code',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    diff: `- if (user) return true\n+ if (user && user.token === validToken) return true`
  }
]

function loadReviews(): Review[] {
  try {
    if (existsSync(REVIEWS_FILE)) {
      const data = readFileSync(REVIEWS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Error loading reviews:', e)
  }
  // İlk kez: default reviews'ı dosyaya yaz
  saveReviews(DEFAULT_REVIEWS)
  return DEFAULT_REVIEWS
}

function saveReviews(reviews: Review[]) {
  try {
    writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf-8')
  } catch (e) {
    console.error('Error saving reviews:', e)
  }
}

// GET: Tüm review'ları getir
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  
  let reviews = loadReviews()
  
  if (status && status !== 'all') {
    reviews = reviews.filter(r => r.status === status)
  }
  
  reviews.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  
  return NextResponse.json({ reviews })
}

// POST: Yeni review oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const reviews = loadReviews()
    
    const newReview: Review = {
      id: Date.now().toString(),
      title: body.title,
      description: body.description,
      agent: body.agent || 'Kimi K2.5',
      project: body.project || 'AI Agent Dashboard',
      status: 'pending',
      type: body.type || 'code',
      created_at: new Date().toISOString(),
      diff: body.diff || null
    }
    
    reviews.unshift(newReview)
    saveReviews(reviews)
    
    return NextResponse.json({ review: newReview }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// PATCH: Review durumunu güncelle
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body
    
    if (!id || !status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 })
    }
    
    const reviews = loadReviews()
    const reviewIndex = reviews.findIndex(r => r.id === id)
    
    if (reviewIndex === -1) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    
    reviews[reviewIndex].status = status as 'pending' | 'approved' | 'rejected'
    saveReviews(reviews)
    
    return NextResponse.json({ review: reviews[reviewIndex] })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
