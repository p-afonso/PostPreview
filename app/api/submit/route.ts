import { NextRequest, NextResponse } from 'next/server'
import { postStore } from '@/lib/store'
import { randomUUID } from 'crypto'

// n8n calls this endpoint with the generated post + slides before approval
// Body: { linkedinPost, articleTitle, articleUrl, ogImage?, slides: [{index, imageUrl}], n8nResumeUrl }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { linkedinPost, articleTitle, articleUrl, ogImage, slides, n8nResumeUrl } = body

    if (!linkedinPost || !articleTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const id = randomUUID()
    postStore.set(id, {
      id,
      createdAt: Date.now(),
      status: 'pending',
      linkedinPost,
      articleTitle,
      articleUrl: articleUrl || '',
      ogImage,
      slides: slides || [],
      n8nResumeUrl,
    })

    return NextResponse.json({ id, message: 'Post queued for preview' })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
