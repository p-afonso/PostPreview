'use client'

import { useEffect, useState, useCallback } from 'react'

type Slide = { index: number; imageUrl: string }
type Post = {
  id: string
  createdAt: number
  status: 'pending' | 'approved' | 'rejected'
  linkedinPost: string
  articleTitle: string
  articleUrl: string
  ogImage?: string
  slides: Slide[]
  slidesHtml?: string[]
}

type Tab = 'pending' | 'all'
type View = 'linkedin' | 'instagram'

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pending')
  const [selected, setSelected] = useState<Post | null>(null)
  const [view, setView] = useState<View>('linkedin')
  const [activeSlide, setActiveSlide] = useState(0)
  const [actioning, setActioning] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/posts', { cache: 'no-store' })
      const data: Post[] = await res.json()
      setPosts(data)
      setLastUpdated(new Date())
    } catch {
      // silently fail on background polls
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
    const interval = setInterval(fetchPosts, 8000) // poll every 8s
    return () => clearInterval(interval)
  }, [fetchPosts])

  // When a post in the list is updated, sync selected state
  useEffect(() => {
    if (selected) {
      const updated = posts.find(p => p.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [posts, selected])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActioning(id + action)
    try {
      await fetch('/api/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      await fetchPosts()
      if (selected?.id === id && action === 'reject') setSelected(null)
    } finally {
      setActioning(null)
    }
  }

  const displayed = tab === 'pending' ? posts.filter(p => p.status === 'pending') : posts
  const pendingCount = posts.filter(p => p.status === 'pending').length

  const openPost = (post: Post) => {
    setSelected(post)
    setActiveSlide(0)
    const hasSlides = (post.slides?.length > 0) || (post.slidesHtml?.length > 0)
    setView(hasSlides ? 'instagram' : 'linkedin')
  }

  return (
    <div style={styles.root}>
      {/* ── SIDEBAR ── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>
            <span style={styles.logoDot} />
            <span style={styles.logoText}>Preview</span>
          </div>
          <div style={styles.liveIndicator}>
            <span style={styles.liveDot} />
            <span style={styles.liveLabel}>live</span>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tabBtn, ...(tab === 'pending' ? styles.tabBtnActive : {}) }}
            onClick={() => setTab('pending')}
          >
            Pendentes
            {pendingCount > 0 && <span style={styles.badge}>{pendingCount}</span>}
          </button>
          <button
            style={{ ...styles.tabBtn, ...(tab === 'all' ? styles.tabBtnActive : {}) }}
            onClick={() => setTab('all')}
          >
            Todos
          </button>
        </div>

        <div style={styles.postList}>
          {loading ? (
            <div style={styles.emptyState}>
              <div style={styles.spinner} />
            </div>
          ) : displayed.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                {tab === 'pending' ? 'Nenhum post aguardando.' : 'Nenhum post ainda.'}
              </p>
              <p style={styles.emptySubtext}>O n8n enviará posts aqui automaticamente.</p>
            </div>
          ) : (
            displayed.map((post, i) => (
              <button
                key={post.id}
                style={{
                  ...styles.postCard,
                  ...(selected?.id === post.id ? styles.postCardActive : {}),
                  animationDelay: `${i * 60}ms`,
                }}
                onClick={() => openPost(post)}
              >
                <div style={styles.postCardTop}>
                  <span style={{
                    ...styles.statusDot,
                    background: post.status === 'pending' ? '#e87040'
                      : post.status === 'approved' ? '#4caf7d' : '#666',
                  }} />
                  <span style={styles.postCardStatus}>
                    {post.status === 'pending' ? 'pendente'
                      : post.status === 'approved' ? 'aprovado' : 'rejeitado'}
                  </span>
                  <span style={styles.postCardTime}>
                    {formatTime(post.createdAt)}
                  </span>
                </div>
                <p style={styles.postCardTitle}>{post.articleTitle}</p>
                <div style={styles.postCardMeta}>
                  {((post.slides?.length || 0) > 0 || (post.slidesHtml?.length || 0) > 0) && (
                    <span style={styles.chip}>
                      {(post.slidesHtml?.length || post.slides?.length || 0)} slides
                    </span>
                  )}
                  {post.ogImage && <span style={styles.chip}>imagem</span>}
                </div>
              </button>
            ))
          )}
        </div>

        {lastUpdated && (
          <div style={styles.sidebarFooter}>
            Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}
      </aside>

      {/* ── MAIN PANEL ── */}
      <main style={styles.main}>
        {!selected ? (
          <div style={styles.emptyMain}>
            <div style={styles.emptyMainIcon}>◈</div>
            <p style={styles.emptyMainTitle}>Selecione um post para revisar</p>
            <p style={styles.emptyMainSub}>Os posts enviados pelo n8n aparecem no painel esquerdo.</p>
          </div>
        ) : (
          <div style={styles.detail}>
            {/* Header */}
            <div style={styles.detailHeader}>
              <div>
                <p style={styles.detailSource}>
                  <a href={selected.articleUrl} target="_blank" rel="noreferrer" style={styles.articleLink}>
                    ↗ {selected.articleTitle}
                  </a>
                </p>
              </div>
              {selected.status === 'pending' && (
                <div style={styles.actionRow}>
                  <button
                    style={styles.rejectBtn}
                    onClick={() => handleAction(selected.id, 'reject')}
                    disabled={!!actioning}
                  >
                    {actioning === selected.id + 'reject' ? '...' : '✕ Rejeitar'}
                  </button>
                  <button
                    style={styles.approveBtn}
                    onClick={() => handleAction(selected.id, 'approve')}
                    disabled={!!actioning}
                  >
                    {actioning === selected.id + 'approve' ? '...' : '✓ Aprovar'}
                  </button>
                </div>
              )}
              {selected.status !== 'pending' && (
                <div style={{
                  ...styles.statusBadge,
                  background: selected.status === 'approved' ? 'var(--green-dim)' : 'rgba(80,80,80,0.2)',
                  color: selected.status === 'approved' ? 'var(--green)' : 'var(--text-muted)',
                  border: `1px solid ${selected.status === 'approved' ? 'rgba(76,175,125,0.3)' : 'var(--border)'}`,
                }}>
                  {selected.status === 'approved' ? '✓ Aprovado' : '✕ Rejeitado'}
                </div>
              )}
            </div>

            {/* View toggle */}
            <div style={styles.viewToggle}>
              <button
                style={{ ...styles.viewBtn, ...(view === 'linkedin' ? styles.viewBtnActive : {}) }}
                onClick={() => setView('linkedin')}
              >
                LinkedIn
              </button>
              {((selected.slides?.length > 0) || (selected.slidesHtml?.length > 0)) && (
                <button
                  style={{ ...styles.viewBtn, ...(view === 'instagram' ? styles.viewBtnActive : {}) }}
                  onClick={() => setView('instagram')}
                >
                  Instagram
                </button>
              )}
            </div>

            {/* LinkedIn preview */}
            {view === 'linkedin' && (
              <div style={styles.linkedinPreview}>
                <div style={styles.linkedinCard}>
                  <div style={styles.linkedinHeader}>
                    <div style={styles.avatarCircle}>PA</div>
                    <div>
                      <p style={styles.linkedinName}>Pedro Afonso</p>
                      <p style={styles.linkedinSub}>AI Automation Engineer · agora</p>
                    </div>
                  </div>
                  {selected.ogImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.ogImage} alt="og" style={styles.ogImage} />
                  )}
                  <p style={styles.linkedinBody}>{selected.linkedinPost}</p>
                </div>
              </div>
            )}

            {/* Instagram carousel preview */}
            {view === 'instagram' && ((selected.slides?.length > 0) || (selected.slidesHtml?.length > 0)) && (
              <div style={styles.instagramPreview}>
                <div style={styles.carouselWrap}>
                  {selected.slidesHtml && selected.slidesHtml[activeSlide] ? (
                    <div style={styles.slideFrame}>
                      <iframe
                        srcDoc={selected.slidesHtml[activeSlide]}
                        style={styles.slideIframe}
                        title={`Slide ${activeSlide + 1}`}
                        width="1080"
                        height="1080"
                        scrolling="no"
                      />
                    </div>
                  ) : (
                    <img
                      src={selected.slides[activeSlide]?.imageUrl}
                      alt={`Slide ${activeSlide + 1}`}
                      style={styles.slideImg}
                    />
                  )}
                  <div style={styles.slideDots}>
                    {(selected.slidesHtml?.length ? selected.slidesHtml : selected.slides).map((_, i) => (
                      <button
                        key={i}
                        style={{
                          ...styles.slideDot,
                          ...(i === activeSlide ? styles.slideDotActive : {}),
                        }}
                        onClick={() => setActiveSlide(i)}
                      />
                    ))}
                  </div>
                  <div style={styles.slideNav}>
                    <button
                      style={styles.navBtn}
                      onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                      disabled={activeSlide === 0}
                    >←</button>
                    <span style={styles.slideCounter}>
                      {activeSlide + 1} / {(selected.slidesHtml?.length ? selected.slidesHtml : selected.slides).length}
                    </span>
                    <button
                      style={styles.navBtn}
                      onClick={() => setActiveSlide(Math.min((selected.slidesHtml?.length ? selected.slidesHtml : selected.slides).length - 1, activeSlide + 1))}
                      disabled={activeSlide === (selected.slidesHtml?.length ? selected.slidesHtml : selected.slides).length - 1}
                    >→</button>
                  </div>
                </div>

                {/* Caption preview */}
                <div style={styles.captionBox}>
                  <p style={styles.captionLabel}>Caption</p>
                  <p style={styles.captionText}>{selected.linkedinPost.split('\n').slice(0, 4).join('\n')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diff = Math.floor((now - ts) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ── STYLES ──
const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--bg)',
  },
  sidebar: {
    width: 320,
    minWidth: 320,
    background: 'var(--bg2)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '24px 24px 16px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--accent)',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 18,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(76,175,125,0.1)',
    border: '1px solid rgba(76,175,125,0.2)',
    borderRadius: 20,
    padding: '3px 10px',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#4caf7d',
    animation: 'pulse-dot 2s ease-in-out infinite',
  },
  liveLabel: {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    color: '#4caf7d',
    letterSpacing: '0.05em',
  },
  tabs: {
    display: 'flex',
    padding: '12px 16px',
    gap: 6,
    borderBottom: '1px solid var(--border)',
  },
  tabBtn: {
    flex: 1,
    padding: '7px 12px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-dim)',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabBtnActive: {
    background: 'var(--accent-dim)',
    borderColor: 'rgba(232,112,64,0.3)',
    color: 'var(--accent)',
  },
  badge: {
    background: 'var(--accent)',
    color: '#111',
    borderRadius: 20,
    padding: '1px 7px',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  postList: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  postCard: {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '14px 16px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s',
    animation: 'fadeUp 0.3s ease both',
    width: '100%',
  },
  postCardActive: {
    borderColor: 'rgba(232,112,64,0.4)',
    background: 'var(--accent-dim2)',
  },
  postCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },
  postCardStatus: {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
    flex: 1,
  },
  postCardTime: {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  postCardTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text)',
    lineHeight: 1.45,
    marginBottom: 10,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  postCardMeta: {
    display: 'flex',
    gap: 6,
  },
  chip: {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '2px 8px',
  },
  sidebarFooter: {
    padding: '12px 24px',
    borderTop: '1px solid var(--border)',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'var(--text-dim)',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  spinner: {
    width: 24,
    height: 24,
    border: '2px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  emptyMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyMainIcon: {
    fontSize: 40,
    color: 'var(--border)',
    marginBottom: 8,
  },
  emptyMainTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-dim)',
  },
  emptyMainSub: {
    fontSize: 14,
    color: 'var(--text-muted)',
    maxWidth: 320,
    textAlign: 'center',
  },
  detail: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  detailHeader: {
    padding: '20px 32px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  detailSource: {
    fontSize: 13,
    color: 'var(--text-dim)',
  },
  articleLink: {
    color: 'var(--accent)',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    transition: 'opacity 0.15s',
  },
  actionRow: {
    display: 'flex',
    gap: 10,
  },
  approveBtn: {
    padding: '9px 20px',
    background: 'var(--green-dim)',
    border: '1px solid rgba(76,175,125,0.3)',
    borderRadius: 8,
    color: 'var(--green)',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  rejectBtn: {
    padding: '9px 20px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-dim)',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  statusBadge: {
    padding: '7px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  },
  viewToggle: {
    display: 'flex',
    gap: 6,
    padding: '16px 32px',
    borderBottom: '1px solid var(--border)',
  },
  viewBtn: {
    padding: '7px 18px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-dim)',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  viewBtnActive: {
    background: 'var(--accent-dim)',
    borderColor: 'rgba(232,112,64,0.3)',
    color: 'var(--accent)',
    fontWeight: 600,
  },
  linkedinPreview: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
    display: 'flex',
    justifyContent: 'center',
  },
  linkedinCard: {
    width: '100%',
    maxWidth: 560,
    background: '#1b1b1b',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  linkedinHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 20px 16px',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 800,
    fontFamily: 'var(--font-display)',
    color: '#111',
    flexShrink: 0,
  },
  linkedinName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
  },
  linkedinSub: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  ogImage: {
    width: '100%',
    aspectRatio: '1200/630',
    objectFit: 'cover',
    display: 'block',
  },
  linkedinBody: {
    padding: '20px',
    fontSize: 14,
    color: '#d0d0d0',
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap',
    fontFamily: 'var(--font-body)',
  },
  instagramPreview: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
    display: 'flex',
    gap: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  carouselWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  slideImg: {
    width: 350,
    height: 350,
    objectFit: 'cover',
    borderRadius: 12,
    border: '1px solid var(--border)',
    display: 'block',
  },
  slideFrame: {
    width: 350,
    height: 350,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid var(--border)',
    background: '#111',
    position: 'relative',
  },
  slideIframe: {
    width: 1080,
    height: 1080,
    border: 'none',
    transform: 'scale(0.324)',
    transformOrigin: 'top left',
    pointerEvents: 'none',
  },
  slideDots: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
  },
  slideDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--border)',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.15s',
  },
  slideDotActive: {
    background: 'var(--accent)',
  },
  slideNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  },
  slideCounter: {
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  captionBox: {
    width: 320,
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '20px',
    alignSelf: 'flex-start',
  },
  captionLabel: {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  captionText: {
    fontSize: 13,
    color: '#bbb',
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap',
  },
}
