import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

function mapRow(row: any) {
  return {
    id: row.id,
    linkedinText: row.linkedin_text,
    articleTitle: row.article_title,
    articleLink: row.article_link,
    ogImage: row.og_image,
    slides: row.slides || [],
    slidesHtml: row.slides_html || [],
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  }
}

// n8n (Workflow A) sends post data here
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = body.id || Date.now().toString()

    const { error } = await supabase.from('preview_posts').upsert({
      id,
      linkedin_text: body.linkedinText || '',
      article_title: body.articleTitle || '',
      article_link: body.articleLink || '',
      og_image: body.ogImage || null,
      slides: body.slides || [],
      slides_html: body.slidesHtml || [],
      resume_webhook_url: body.resumeWebhookUrl || null,
      status: 'pending',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const previewUrl = `https://post-preview-lyart.vercel.app/preview/${id}`
    return NextResponse.json({ ok: true, id, previewUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// Frontend polls this to get post data
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')

  if (id) {
    const { data, error } = await supabase
      .from('preview_posts')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(mapRow(data))
  }

  const { data } = await supabase
    .from('preview_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json((data || []).map(mapRow))
}

// User clicks Approve/Reject in preview app
export async function PATCH(req: NextRequest) {
  try {
    const { id, action } = await req.json()

    const { data: post } = await supabase
      .from('preview_posts')
      .select('resume_webhook_url')
      .eq('id', id)
      .single()

    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    await supabase
      .from('preview_posts')
      .update({ status: newStatus, decided_at: new Date().toISOString() })
      .eq('id', id)

    // Calls n8n Workflow B webhook
    if (post.resume_webhook_url) {
      await fetch(post.resume_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: action === 'approve', id }),
      })
    }

    return NextResponse.json({ ok: true, status: newStatus })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
