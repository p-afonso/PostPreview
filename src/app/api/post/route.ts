import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )
}

function toClient(row: any) {
  return {
    id: row.id,
    linkedinText: row.linkedin_text,
    articleTitle: row.article_title,
    articleLink: row.article_link,
    ogImage: row.og_image,
    slidesHtml: row.slides_html || [],
    resumeWebhookUrl: row.resume_webhook_url,
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = body.id || crypto.randomUUID()
    const supabase = getSupabase()

    const { error } = await supabase.from('preview_posts').upsert({
      id,
      linkedin_text: body.linkedinText || '',
      article_title: body.articleTitle || '',
      article_link: body.articleLink || '',
      og_image: body.ogImage || null,
      slides_html: body.slidesHtml || [],
      resume_webhook_url: body.resumeWebhookUrl || null,
      status: 'pending',
    })

    if (error) {
      console.error('Supabase upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const previewUrl = `https://post-preview-lyart.vercel.app/preview/${id}`
    return NextResponse.json({ ok: true, id, previewUrl })
  } catch (e: any) {
    console.error('POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const supabase = getSupabase()

  if (!id) {
    const { data, error } = await supabase
      .from('preview_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json((data || []).map(toClient))
  }

  const { data, error } = await supabase
    .from('preview_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(toClient(data))
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, action } = await req.json()
    const supabase = getSupabase()

    const { data: post, error: fetchErr } = await supabase
      .from('preview_posts')
      .select('resume_webhook_url')
      .eq('id', id)
      .single()

    if (fetchErr || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const status = action === 'approve' ? 'approved' : 'rejected'
    await supabase
      .from('preview_posts')
      .update({ status, decided_at: new Date().toISOString() })
      .eq('id', id)

    if (post.resume_webhook_url) {
      await fetch(post.resume_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: action === 'approve', id }),
      }).catch(console.error)
    }

    return NextResponse.json({ ok: true, status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
