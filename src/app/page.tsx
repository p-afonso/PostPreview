'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Post {
  id: string
  linkedinText: string
  articleTitle: string
  articleLink: string
  ogImage?: string
  slides?: string[]
  slidesHtml?: string[]
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  decidedAt?: string
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Aguardando',  color: '#e87040' },
  approved: { label: 'Aprovado',    color: '#4ade80' },
  rejected: { label: 'Rejeitado',   color: '#f87171' },
}

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/post')
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
    const interval = setInterval(fetchPosts, 8000)
    return () => clearInterval(interval)
  }, [])

  const pending = posts.filter(p => p.status === 'pending')
  const decided = posts.filter(p => p.status !== 'pending')

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <span className={styles.brandDot} />
            <span className={styles.brandName}>Post Preview</span>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.pulse} />
            <span className={styles.liveLabel}>ao vivo</span>
            {pending.length > 0 && (
              <span className={styles.badge}>{pending.length}</span>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.empty}>
            <div className={styles.spinner} />
            <p>carregando posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>◎</div>
            <p className={styles.emptyTitle}>Nenhum post ainda</p>
            <p className={styles.emptyBody}>
              Quando o n8n gerar um post, ele vai aparecer aqui.
            </p>
            <code className={styles.webhookHint}>
              POST /api/post
            </code>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionDot} style={{ background: '#e87040' }} />
                  Aguardando aprovação
                </h2>
                <div className={styles.grid}>
                  {pending.map(post => (
                    <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
                  ))}
                </div>
              </section>
            )}

            {decided.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionDot} style={{ background: '#555' }} />
                  Histórico
                </h2>
                <div className={styles.grid}>
                  {decided.map(post => (
                    <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function PostCard({ post, onUpdate }: { post: Post; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false)
  const status = statusLabel[post.status]
  const preview = post.linkedinText?.slice(0, 120) + '...'

  const decide = async (action: 'approve' | 'reject') => {
    setLoading(true)
    await fetch('/api/post', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, action })
    })
    onUpdate()
    setLoading(false)
  }

  return (
    <div className={styles.card}>
      {/* Thumbnail */}
      {post.ogImage ? (
        <div className={styles.cardThumb}>
          <img src={post.ogImage} alt="" className={styles.thumbImg} />
          <div className={styles.thumbOverlay} />
        </div>
      ) : post.slides?.[0] ? (
        <div className={styles.cardThumb}>
          <img 
            src={typeof post.slides[0] === 'string' 
              ? (post.slides[0] as unknown as string) 
              : (post.slides[0] as any).imageUrl
            } 
            alt="" 
            className={styles.thumbImg} 
          />
          <div className={styles.thumbOverlay} />
        </div>
      ) : post.slidesHtml?.[0] ? (
        <div className={styles.cardThumb}>
          <iframe
            srcDoc={post.slidesHtml[0]}
            className={styles.thumbIframe}
            scrolling="no"
            width="1080"
            height="1080"
          />
          <div className={styles.thumbOverlay} />
        </div>
      ) : (
        <div className={styles.cardThumbEmpty}>
          <span>sem imagem</span>
        </div>
      )}

      {/* Content */}
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span
            className={styles.statusBadge}
            style={{ color: status.color, borderColor: `${status.color}33`, background: `${status.color}11` }}
          >
            {status.label}
          </span>
          <span className={styles.cardTime}>
            {new Date(post.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <p className={styles.cardTitle}>{post.articleTitle || 'Post sem título'}</p>
        <p className={styles.cardPreview}>{preview}</p>

        <div className={styles.cardFooter}>
          <Link href={`/preview/${post.id}`} className={styles.viewBtn}>
            ver completo →
          </Link>

          {post.status === 'pending' && (
            <div className={styles.cardActions}>
              <button
                className={`${styles.actionBtn} ${styles.rejectBtn}`}
                onClick={() => decide('reject')}
                disabled={loading}
              >
                ✕
              </button>
              <button
                className={`${styles.actionBtn} ${styles.approveBtn}`}
                onClick={() => decide('approve')}
                disabled={loading}
              >
                ✓
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
