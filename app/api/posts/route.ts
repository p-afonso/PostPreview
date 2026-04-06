import { NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/store'

export async function GET() {
  return NextResponse.json(getAllPosts())
}

// Force dynamic — don't cache
export const dynamic = 'force-dynamic'
