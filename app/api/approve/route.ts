import { NextRequest, NextResponse } from 'next/server'
import { postStore } from '@/lib/store'

// PATCH /api/approve  body: { id, action: 'approve' | 'reject' }
export async function PATCH(req: NextRequest) {
  try {
    const { id, action } = await req.json()

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const post = postStore.get(id)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    post.status = action === 'approve' ? 'approved' : 'rejected'
    postStore.set(id, post)

    // Resume n8n execution if webhook URL was provided
    if (post.n8nResumeUrl) {
      try {
        await fetch(post.n8nResumeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: action === 'approve', postId: id }),
        })
      } catch (e) {
        console.error('Failed to resume n8n:', e)
        // Don't fail the request — post was already marked
      }
    }

    return NextResponse.json({ id, status: post.status })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
