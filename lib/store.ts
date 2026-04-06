// Simple in-memory store — resets on redeploy
// For persistence use Vercel KV or Supabase

export type SlideData = {
  index: number
  imageUrl: string // hcti.io URL
}

export type PostData = {
  id: string
  createdAt: number
  status: 'pending' | 'approved' | 'rejected'
  linkedinPost: string
  articleTitle: string
  articleUrl: string
  ogImage?: string
  slides: SlideData[]
  n8nResumeUrl?: string // webhook URL to resume n8n execution
}

// Global store (persists across requests in the same process)
declare global {
  // eslint-disable-next-line no-var
  var __postStore: Map<string, PostData> | undefined
}

export const postStore: Map<string, PostData> =
  global.__postStore ?? (global.__postStore = new Map())

export function getPendingPosts(): PostData[] {
  return Array.from(postStore.values())
    .filter(p => p.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function getAllPosts(): PostData[] {
  return Array.from(postStore.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20)
}
