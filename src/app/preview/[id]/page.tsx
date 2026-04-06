'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from './preview.module.css'

interface Post {
  id: string
  linkedinText: string
  articleTitle: string
  articleLink: string
  ogImage?: string
  slides?: string[] // URLs das imagens dos slides (geradas pelo hcti.io)
  slidesHtml?: string[] // HTML raw dos slides (fallback)
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  decidedAt?: string
}

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const [tab, setTab] = useState<'linkedin' | 'instagram'>('linkedin')
  const [copied, setCopied] = useState(false)

  const fetchPost = async () => {
    const res = await fetch(`/api/post?id=${id}`)
    if (res.ok) {
      const data = await res.json()
      setPost(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPost()
  }, [id])

  const decide = async (action: 'approve' | 'reject') => {
    if (!post || post.status !== 'pending') return
    setDeciding(true)
    await fetch('/api/post', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action })
    })
    await fetchPost()
    setDeciding(false)
  }

  const copyText = async () => {
    if (!post) return
    await navigator.clipboard.writeText(post.linkedinText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>carregando preview...</p>
      </div>
    )
  }

  if (!post) {
    return (
      <div className={styles.loading}>
        <p className={styles.notFound}>Post não encontrado</p>
        <button className={styles.backBtn} onClick={() => router.push('/')}>← voltar</button>
      </div>
    )
  }

  const isPending = post.status === 'pending'
  const hasSlides = post.slides && post.slides.length > 0
  const hasHtmlSlides = post.slidesHtml && post.slidesHtml.length > 0

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button className={styles.backLink} onClick={() => router.push('/')}>
            ← voltar
          </button>

          <div className={styles.headerCenter}>
            <span className={styles.articleSource}>
              {new URL(post.articleLink || 'https://x.com').hostname.replace('www.', '')}
            </span>
            <span className={styles.headerDivider}>·</span>
            <span className={styles.headerTime}>
              {new Date(post.createdAt).toLocaleString('pt-BR', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>

          <div className={styles.statusChip} data-status={post.status}>
            {post.status === 'pending' ? '● aguardando' : post.status === 'approved' ? '✓ aprovado' : '✕ rejeitado'}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Article info */}
        <div className={styles.articleBanner}>
          <div className={styles.articleBannerContent}>
            {post.ogImage && (
              <img src={post.ogImage} alt="" className={styles.articleThumb} />
            )}
            <div>
              <p className={styles.articleLabel}>ARTIGO BASE</p>
              <h1 className={styles.articleTitle}>{post.articleTitle}</h1>
              <a href={post.articleLink} target="_blank" rel="noopener noreferrer" className={styles.articleUrl}>
                {post.articleLink}
              </a>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'linkedin' ? styles.tabActive : ''}`}
            onClick={() => setTab('linkedin')}
          >
            <span className={styles.tabIcon}>in</span>
            LinkedIn
          </button>
          {(hasSlides || hasHtmlSlides) && (
            <button
              className={`${styles.tab} ${tab === 'instagram' ? styles.tabActive : ''}`}
              onClick={() => setTab('instagram')}
            >
              <span className={styles.tabIcon}>◈</span>
              Instagram
            </button>
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {tab === 'linkedin' && (
            <div className={styles.linkedinSection}>
              {/* LinkedIn mock */}
              <div className={styles.linkedinCard}>
                <div className={styles.liHeader}>
                  <div className={styles.liAvatar}>PA</div>
                  <div>
                    <p className={styles.liName}>Pedro Afonso</p>
                    <p className={styles.liRole}>AI Automation Engineer · agora</p>
                  </div>
                </div>

                {post.ogImage && (
                  <img src={post.ogImage} alt="" className={styles.liImage} />
                )}

                <div className={styles.liText}>
                  {post.linkedinText?.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < post.linkedinText.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>

                <div className={styles.liActions}>
                  <span>👍 Gostei</span>
                  <span>💬 Comentar</span>
                  <span>🔁 Compartilhar</span>
                </div>
              </div>

              {/* Raw text */}
              <div className={styles.rawSection}>
                <div className={styles.rawHeader}>
                  <span className={styles.rawLabel}>TEXTO COMPLETO</span>
                  <button className={styles.copyBtn} onClick={copyText}>
                    {copied ? '✓ copiado' : 'copiar'}
                  </button>
                </div>
                <pre className={styles.rawText}>{post.linkedinText}</pre>
              </div>
            </div>
          )}

          {tab === 'instagram' && (hasSlides || hasHtmlSlides) && (
            <div className={styles.instagramSection}>
              <div className={styles.carouselWrapper}>
                {/* Slide display */}
                <div className={styles.slideFrame}>
                  {hasHtmlSlides ? (
                    <iframe
                      srcDoc={post.slidesHtml![activeSlide]}
                      className={styles.slideIframe}
                      title={`Slide ${activeSlide + 1}`}
                      width="1080"
                      height="1080"
                      scrolling="no"
                    />
                  ) : hasSlides && (
                    <img
                      src={post.slides![activeSlide]}
                      alt={`Slide ${activeSlide + 1}`}
                      className={styles.slideImg}
                    />
                  )}
                  <div className={styles.slideCounter}>
                    {activeSlide + 1} / {(post.slidesHtml?.length ? post.slidesHtml : post.slides)!.length}
                  </div>
                </div>

                {/* Thumbnails */}
                <div className={styles.thumbnails}>
                  {(post.slidesHtml?.length ? post.slidesHtml : post.slides || []).map((_, i) => (
                    <button
                      key={i}
                      className={`${styles.thumb} ${i === activeSlide ? styles.thumbActive : ''}`}
                      onClick={() => setActiveSlide(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div className={styles.slideNav}>
                  <button
                    className={styles.navBtn}
                    onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                    disabled={activeSlide === 0}
                  >
                    ←
                  </button>
                  <button
                    className={styles.navBtn}
                    onClick={() => setActiveSlide(Math.min((post.slidesHtml?.length ? post.slidesHtml : post.slides)!.length - 1, activeSlide + 1))}
                    disabled={activeSlide === (post.slidesHtml?.length ? post.slidesHtml : post.slides)!.length - 1}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Decision bar */}
        {isPending && (
          <div className={styles.decisionBar}>
            <div className={styles.decisionInner}>
              <p className={styles.decisionLabel}>Publicar esse post?</p>
              <div className={styles.decisionBtns}>
                <button
                  className={`${styles.decisionBtn} ${styles.rejectBtn}`}
                  onClick={() => decide('reject')}
                  disabled={deciding}
                >
                  {deciding ? '...' : '✕ Rejeitar'}
                </button>
                <button
                  className={`${styles.decisionBtn} ${styles.approveBtn}`}
                  onClick={() => decide('approve')}
                  disabled={deciding}
                >
                  {deciding ? '...' : '✓ Aprovar e publicar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {!isPending && (
          <div className={styles.decisionBar}>
            <div className={styles.decisionInner}>
              <p className={styles.decidedMsg} data-status={post.status}>
                {post.status === 'approved'
                  ? `✓ Aprovado e publicado em ${new Date(post.decidedAt!).toLocaleTimeString('pt-BR')}`
                  : `✕ Rejeitado em ${new Date(post.decidedAt!).toLocaleTimeString('pt-BR')}`}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
