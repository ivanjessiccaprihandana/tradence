import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

function Brand() {
  return <a className="landing-brand" href="/" aria-label="Tradence home"><img src="/tradence-icon-v3.png" alt=""/><strong>Tradence<span>.</span></strong></a>
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>
}

function FeatureIcon({ type }: { type: string }) {
  const paths: Record<string, React.ReactNode> = {
    journal: <><path d="M6 3h12a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    analytics: <><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/><path d="M2 20h21"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    rules: <><path d="m5 7 2 2 4-4M13 7h6M5 14l2 2 4-4M13 14h6"/></>,
    mind: <><path d="M9 5a3 3 0 0 1 6 0 3 3 0 0 1 3 3 3 3 0 0 1 0 6 3 3 0 0 1-3 3v3H9v-3a3 3 0 0 1-3-3 3 3 0 0 1 0-6 3 3 0 0 1 3-3Z"/><path d="M9 10h6M12 7v6"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>
}

function ProductPreview() {
  return <div className="product-stage" aria-label="Preview dashboard Tradence">
    <div className="stage-glow"/>
    <div className="floating-chip chip-win"><span>Win rate</span><strong>67.4%</strong><i>+5.2%</i></div>
    <div className="floating-chip chip-risk"><span>Risk status</span><strong>Within plan</strong><i>✓</i></div>
    <div className="product-window">
      <div className="window-bar"><div className="window-dots"><i/><i/><i/></div><span>tradence.app/dashboard</span><b>Live local</b></div>
      <div className="mock-app">
        <aside className="mock-sidebar"><div className="mock-logo"><img src="/tradence-icon-v3.png" alt=""/><span>Tradence</span></div>{['Overview','Journal','Analytics','Calendar'].map((item, index) => <div className={`mock-nav ${index === 0 ? 'active' : ''}`} key={item}><i/>{item}</div>)}</aside>
        <div className="mock-content"><div className="mock-top"><div><small>PERFORMANCE</small><h3>Trading overview</h3></div><button>+ Add trade</button></div>
          <div className="mock-stats"><div><span>Balance</span><strong>$12,840</strong><small>+$2,840 total</small></div><div><span>Net P/L</span><strong className="mint">+$684.20</strong><small>this month</small></div><div><span>Win rate</span><strong>67.4%</strong><small>43 closed trades</small></div></div>
          <div className="mock-chart"><div className="mock-chart-head"><div><span>Equity curve</span><strong>Consistent growth</strong></div><em>30 DAYS</em></div><svg viewBox="0 0 760 250" preserveAspectRatio="none" role="img" aria-label="Animated rising equity curve"><defs><linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00c892" stopOpacity=".3"/><stop offset="1" stopColor="#00c892" stopOpacity="0"/></linearGradient></defs>{[55,120,185,245].map((y) => <path key={y} d={`M0 ${y}H760`} className="hero-grid-line"/>)}<path className="hero-area" d="M0 218 C55 205 75 218 118 187 S190 170 220 183 S283 137 330 151 S395 119 427 126 S492 75 532 95 S601 74 628 56 S704 61 760 24 L760 250 L0 250 Z"/><path className="hero-line-shadow" d="M0 218 C55 205 75 218 118 187 S190 170 220 183 S283 137 330 151 S395 119 427 126 S492 75 532 95 S601 74 628 56 S704 61 760 24"/><path className="hero-line" d="M0 218 C55 205 75 218 118 187 S190 170 220 183 S283 137 330 151 S395 119 427 126 S492 75 532 95 S601 74 628 56 S704 61 760 24"/></svg><div className="chart-axis"><span>Sep 01</span><span>Sep 08</span><span>Sep 15</span><span>Sep 22</span><span>Today</span></div></div>
        </div>
      </div>
    </div>
  </div>
}

const toolSlides = [
  { type: 'journal', eyebrow: 'DECISION LOG', title: 'Trade Journal', copy: 'Keep the setup, execution, screenshots, and lesson connected in one review.' },
  { type: 'analytics', eyebrow: 'PERFORMANCE', title: 'Analytics', copy: 'Compare the sessions, setups, and behaviours that actually shape your results.' },
  { type: 'strategy', eyebrow: 'VALIDATION', title: 'Strategy Lab', copy: 'Test whether an idea holds up before it becomes part of your trading plan.' },
  { type: 'calendar', eyebrow: 'CONSISTENCY', title: 'Calendar', copy: 'See profitable days, difficult streaks, and your monthly rhythm at a glance.' },
  { type: 'psychology', eyebrow: 'SELF-AWARENESS', title: 'Psychology', copy: 'Connect confidence, patience, and impulse with the outcome of each trade.' },
] as const

function ToolSlideVisual({ type }: { type: typeof toolSlides[number]['type'] }) {
  if (type === 'journal') return <div className="carousel-ui journal-ui"><div className="carousel-toolbar"><b>Trade review</b><span>B</span><span>I</span><span>U</span><em>SAVED</em></div><div className="journal-ui-body"><div><small>ENTRY THESIS</small><p>Price swept the Asian low and reclaimed the level with displacement.</p><small>EXECUTION NOTES</small><p>Waited for confirmation. Risk remained inside the daily limit.</p><div className="carousel-tags"><i>Liquidity</i><i>London</i><i>Calm</i></div></div><div className="micro-chart"><span>+2.4R</span><svg viewBox="0 0 280 120"><path d="M0 99 C28 92 38 105 61 79 S101 85 122 58 S165 69 187 42 S228 55 280 17"/></svg></div></div></div>
  if (type === 'analytics') return <div className="carousel-ui analytics-ui"><div className="carousel-ui-head"><b>Performance intelligence</b><em>30 DAYS</em></div><div className="carousel-kpis"><div><small>WIN RATE</small><strong>67.4%</strong><i>+5.2%</i></div><div><small>AVG. R</small><strong>2.14R</strong><i>+0.36</i></div><div><small>NET P/L</small><strong>+$2,184</strong><i>on plan</i></div></div><div className="carousel-bars">{[42,63,48,82,67,92,76,100].map((height, index) => <i key={index} style={{height:`${height}%`}}/>)}</div><div className="carousel-insight"><span>Strongest edge</span><b>London · Sweep + FVG</b></div></div>
  if (type === 'strategy') return <div className="carousel-ui strategy-ui"><div className="carousel-ui-head"><b>EURUSD · London reversal</b><em>TEST 04</em></div><div className="candle-stage"><div className="price-zone"/><div className="strategy-path"/>{[45,70,54,88,63,98,81,112,92,128,106,145,119,160].map((height, index) => <i key={index} className={index % 3 === 0 ? 'down' : ''} style={{height:`${height / 2}px`}}/>)}</div><div className="strategy-result"><div><small>SAMPLE</small><strong>126 trades</strong></div><div><small>EXPECTANCY</small><strong>+0.68R</strong></div><div><small>STATUS</small><strong className="positive">Validated</strong></div></div></div>
  if (type === 'calendar') return <div className="carousel-ui carousel-calendar"><div className="carousel-ui-head"><b>September 2026</b><em>+$2,184</em></div><div className="calendar-weekdays">{['M','T','W','T','F','S','S'].map((day,index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-cells">{Array.from({length:28},(_,index) => <i key={index} className={[2,4,8,11,15,18,23].includes(index) ? 'win' : [6,13,21].includes(index) ? 'loss' : index === 19 ? 'selected' : ''}><b>{index + 1}</b>{[2,4,8,11,15,18,23].includes(index) && <small>+R</small>}</i>)}</div></div>
  return <div className="carousel-ui psychology-ui"><div className="carousel-ui-head"><b>Performance state</b><em>43 REVIEWS</em></div><div className="psychology-score"><div className="psychology-orbit"><strong>8.2</strong><small>CONTROL</small></div><div><h4>Calm traders make clearer decisions.</h4><p>Your best results appear when confidence is high and impulse stays below 3.</p></div></div><div className="psychology-meters">{[['Confidence',82],['Patience',68],['Impulse',24]].map(([name,value]) => <div key={name}><span>{name}</span><i><b style={{width:`${value}%`}}/></i><strong>{value}</strong></div>)}</div></div>
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showcaseStep, setShowcaseStep] = useState(0)
  const [toolSlide, setToolSlide] = useState(1)
  const [carouselPaused, setCarouselPaused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStart = useRef<number | null>(null)

  const changeToolSlide = (direction: number) => setToolSlide((current) => (current + direction + toolSlides.length) % toolSlides.length)
  const startToolDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientX
    setCarouselPaused(true)
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveToolDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return
    setDragOffset(Math.max(-140, Math.min(140, event.clientX - dragStart.current)))
  }
  const finishToolDrag = () => {
    if (dragStart.current === null) return
    if (dragOffset < -55) changeToolSlide(1)
    if (dragOffset > 55) changeToolSlide(-1)
    dragStart.current = null
    setDragOffset(0)
    setIsDragging(false)
    window.setTimeout(() => setCarouselPaused(false), 700)
  }

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('[data-reveal]')
    if (!('IntersectionObserver' in window)) { items.forEach((item) => item.classList.add('is-visible')); return }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) }
    }), { threshold: .14 })
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!window.location.hash) return
    const target = document.querySelector<HTMLElement>(window.location.hash)
    if (target) window.requestAnimationFrame(() => {
      const root = document.documentElement
      const previousBehavior = root.style.scrollBehavior
      root.style.scrollBehavior = 'auto'
      target.scrollIntoView({ block: 'start' })
      window.requestAnimationFrame(() => { root.style.scrollBehavior = previousBehavior })
    })
  }, [])

  useEffect(() => {
    const landing = document.querySelector<HTMLElement>('.landing-page')
    const showcase = document.querySelector<HTMLElement>('.scroll-showcase')
    if (!landing || !showcase || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const update = () => {
      frame = 0
      landing.style.setProperty('--landing-scroll', `${Math.min(window.scrollY, 900)}px`)
      const bounds = showcase.getBoundingClientRect()
      const travel = Math.max(1, bounds.height - window.innerHeight)
      const progress = Math.min(1, Math.max(0, -bounds.top / travel))
      showcase.style.setProperty('--showcase-progress', progress.toFixed(3))
      const nextStep = Math.min(2, Math.floor(progress * 3))
      setShowcaseStep((current) => current === nextStep ? current : nextStep)
    }
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) window.cancelAnimationFrame(frame) }
  }, [])

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('.hero-section')
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const followPointer = (event: PointerEvent) => {
      const bounds = hero.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
      const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
      hero.style.setProperty('--pointer-x', `${x * 100}%`)
      hero.style.setProperty('--pointer-y', `${y * 100}%`)
      hero.style.setProperty('--tilt-x', `${(0.5 - y) * 3.5}deg`)
      hero.style.setProperty('--tilt-y', `${(x - 0.5) * 4.5}deg`)
    }
    const resetPointer = () => {
      hero.style.setProperty('--pointer-x', '70%')
      hero.style.setProperty('--pointer-y', '30%')
      hero.style.setProperty('--tilt-x', '0deg')
      hero.style.setProperty('--tilt-y', '0deg')
    }
    hero.addEventListener('pointermove', followPointer)
    hero.addEventListener('pointerleave', resetPointer)
    return () => { hero.removeEventListener('pointermove', followPointer); hero.removeEventListener('pointerleave', resetPointer) }
  }, [])

  useEffect(() => {
    if (carouselPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => changeToolSlide(1), 5200)
    return () => window.clearInterval(timer)
  }, [carouselPaused])

  return <div className="landing-page">
    <header className="landing-nav"><Brand/><nav className={menuOpen ? 'open' : ''}><a href="#features" onClick={() => setMenuOpen(false)}>Features</a><a href="#workflow" onClick={() => setMenuOpen(false)}>How it works</a><a href="#privacy" onClick={() => setMenuOpen(false)}>Privacy</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a></nav><a className="nav-cta" href="/app">Open journal <ArrowIcon/></a><button className="menu-toggle" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><i/><i/><i/></button></header>

    <main>
      <section className="hero-section"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-grid-bg"/><div className="hero-3d-scene" aria-hidden="true"><div className="hero-3d-ring"><i/></div><div className="hero-cube"><i className="cube-front"/><i className="cube-back"/><i className="cube-right"/><i className="cube-left"/><i className="cube-top"/><i className="cube-bottom"/></div><div className="market-tile tile-one"><span>WIN RATE</span><strong>67.4%</strong><i>↗ 8.2%</i></div><div className="market-tile tile-two"><span>AVG. R</span><strong>2.14R</strong><i>DISCIPLINED</i></div></div><div className="hero-copy" data-reveal><div className="hero-pill"><i/>Your private trading workspace</div><h1><span className="hero-title-main">Build a trading process</span><span className="hero-title-accent">you can <em>repeat.</em></span></h1><p>Plan every trade, review every decision, and turn your trading history into measurable progress—without losing your data to another platform.</p><div className="hero-actions"><a className="landing-button primary" href="/app">Open Tradence <ArrowIcon/></a><a className="landing-button ghost" href="#preview"><span className="play-icon">▶</span> Explore the workspace</a></div><div className="hero-proof"><div><strong>No account</strong><span>Start instantly</span></div><i/><div><strong>Local-first</strong><span>Your data stays yours</span></div><i/><div><strong>Free to use</strong><span>No card required</span></div></div></div><div id="preview" className="hero-visual" data-reveal><ProductPreview/></div></section>

      <div className="market-strip" aria-hidden="true"><div className="market-track">{['EURUSD  +0.42%','XAUUSD  +1.18%','GBPUSD  −0.16%','USDJPY  +0.31%','NAS100  +0.84%','PROCESS  >  IMPULSE','EURUSD  +0.42%','XAUUSD  +1.18%','GBPUSD  −0.16%','USDJPY  +0.31%','NAS100  +0.84%','PROCESS  >  IMPULSE'].map((item, index) => <span key={`${item}-${index}`}>{item}<i/></span>)}</div></div>

      <section className="story-section" data-reveal><div className="section-kicker">THE REAL ADVANTAGE</div><h2>Your strategy is only as good as the process behind it.</h2><p>A winning trade can hide a bad decision. A losing trade can come from a perfect execution. Tradence helps you separate outcome from process.</p><div className="story-numbers"><div><strong>01</strong><h3>Record the context</h3><p>Capture setup, session, risk, psychology, screenshots, and the reason behind the trade.</p></div><div><strong>02</strong><h3>Find the pattern</h3><p>See which pairs, sessions, setups, and behaviours consistently shape your results.</p></div><div><strong>03</strong><h3>Refine the process</h3><p>Turn repeated observations into rules you can measure and execute with discipline.</p></div></div></section>

      <section className="scroll-showcase">
        <div className="showcase-sticky">
          <div className="showcase-copy"><div className="section-kicker">SCROLL THROUGH THE PROCESS</div><h2>From a single trade to a clearer decision.</h2><p>The workspace changes with the way you review. Scroll to move through the Tradence workflow.</p><div className="showcase-progress"><i style={{ height: `${((showcaseStep + 1) / 3) * 100}%` }}/>{[
            ['01','Journal the decision','Keep the plan, execution, psychology, and result connected.'],
            ['02','Read the evidence','Turn closed trades into patterns you can actually compare.'],
            ['03','Protect the process','Measure every trade against the rules you decided beforehand.'],
          ].map(([number, title, copy], index) => <button className={showcaseStep === index ? 'active' : ''} key={number} type="button"><b>{number}</b><span><strong>{title}</strong><small>{copy}</small></span></button>)}</div></div>
          <div className="showcase-visual">
            <div className="showcase-ambient"/>
            <article className={`showcase-screen journal-screen ${showcaseStep === 0 ? 'active' : showcaseStep > 0 ? 'before' : 'after'}`}><div className="screen-top"><span>Trade review</span><em>EURUSD · BUY</em></div><div className="review-score"><div><small>NET P/L</small><strong>+$428.50</strong></div><div><small>ACTUAL R</small><strong>+2.14R</strong></div><div><small>PLAN</small><strong>Followed</strong></div></div><div className="review-chart"><svg viewBox="0 0 620 190" preserveAspectRatio="none"><path d="M0 145 C70 140 86 154 140 123 S214 131 260 96 S336 108 380 69 S458 78 506 42 S574 56 620 18"/><path className="target-line" d="M0 48H620"/><path className="entry-line" d="M0 128H620"/></svg><span className="chart-label target">TP</span><span className="chart-label entry">ENTRY</span></div><div className="review-footer"><span>Liquidity sweep</span><span>London</span><span>Calm</span><b>✓ All rules passed</b></div></article>
            <article className={`showcase-screen analytics-screen ${showcaseStep === 1 ? 'active' : showcaseStep > 1 ? 'before' : 'after'}`}><div className="screen-top"><span>Performance intelligence</span><em>LAST 30 DAYS</em></div><div className="analytics-layout"><div className="donut-card"><div className="donut"><span><strong>67%</strong><small>win rate</small></span></div><p><b>29 wins</b><span>14 losses</span></p></div><div className="session-card"><small>P/L BY SESSION</small>{[['London','84%','+$1,240'],['New York','62%','+$680'],['Asia','31%','−$120']].map(([name,width,value]) => <div key={name}><span>{name}</span><i><b style={{width}}/></i><strong>{value}</strong></div>)}</div></div><div className="insight-ribbon"><i>↗</i><span><small>YOUR STRONGEST PATTERN</small><strong>London session · Sweep + FVG · 2.7 average R</strong></span></div></article>
            <article className={`showcase-screen rules-screen ${showcaseStep === 2 ? 'active' : 'after'}`}><div className="screen-top"><span>Pre-trade discipline</span><em>RULE SET · A</em></div><div className="rules-score"><div className="score-ring"><strong>5/5</strong><span>READY</span></div><div><small>TRADE QUALITY</small><h3>Plan confirmed.</h3><p>Every condition is inside your limits.</p></div></div><div className="rules-checks">{[['Risk per trade','0.75%','≤ 1.00%'],['Planned R:R','1 : 2.40','≥ 1 : 2.00'],['Daily entries','2 trades','≤ 3 trades'],['Confluences','5 confirmed','≥ 4 required']].map(([name,value,limit]) => <div key={name}><i>✓</i><span><small>{name}</small><strong>{value}</strong></span><em>{limit}</em></div>)}</div></article>
          </div>
        </div>
      </section>

      <section className="tools-carousel-section" id="tools" aria-labelledby="tools-title">
        <div className="carousel-heading" data-reveal><div className="section-kicker">THE FULL REVIEW LOOP</div><h2 id="tools-title">One workspace. Every part of the process.</h2><p>Drag, swipe, or use the controls to explore how Tradence connects your trading decisions.</p></div>
        <div className={`tools-carousel ${isDragging ? 'dragging' : ''}`} onPointerDown={startToolDrag} onPointerMove={moveToolDrag} onPointerUp={finishToolDrag} onPointerCancel={finishToolDrag} onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => { if (!isDragging) setCarouselPaused(false) }}>
          <div className="carousel-track">{toolSlides.map((slide, index) => {
            let distance = index - toolSlide
            if (distance > toolSlides.length / 2) distance -= toolSlides.length
            if (distance < -toolSlides.length / 2) distance += toolSlides.length
            const slideStyle = { '--slide-x': `${distance * 72}%`, '--drag-x': `${dragOffset}px` } as CSSProperties
            return <article key={slide.type} className={`tool-slide ${distance === 0 ? 'active' : Math.abs(distance) === 1 ? 'near' : 'far'} ${distance < 0 ? 'left' : 'right'}`} style={slideStyle} aria-hidden={distance !== 0}><ToolSlideVisual type={slide.type}/><div className="tool-slide-caption"><span>{slide.eyebrow}</span><h3>{slide.title}</h3><p>{slide.copy}</p></div></article>
          })}</div>
          <button className="carousel-arrow previous" type="button" aria-label="Previous feature" onPointerDown={(event) => event.stopPropagation()} onClick={() => changeToolSlide(-1)}>←</button>
          <button className="carousel-arrow next" type="button" aria-label="Next feature" onPointerDown={(event) => event.stopPropagation()} onClick={() => changeToolSlide(1)}>→</button>
        </div>
        <div className="carousel-dots" role="tablist" aria-label="Feature slides">{toolSlides.map((slide,index) => <button key={slide.type} className={toolSlide === index ? 'active' : ''} type="button" role="tab" aria-selected={toolSlide === index} aria-label={`Show ${slide.title}`} onClick={() => setToolSlide(index)}/>)}</div>
      </section>

      <section className="features-section" id="features"><div className="section-heading" data-reveal><div><div className="section-kicker">ONE FOCUSED WORKSPACE</div><h2>Everything you need to review the trade—not chase the next one.</h2></div><p>Designed around reflection, discipline, and decisions that can be measured.</p></div><div className="feature-grid">
        <article className="feature-card feature-large" data-reveal><div className="feature-icon"><FeatureIcon type="journal"/></div><span>DEEP REVIEW</span><h3>A journal built around decisions</h3><p>Record the plan, execution, confluences, psychology, mistakes, costs, and result in one structured review.</p><div className="mini-journal"><div><i className="buy">BUY</i><strong>EURUSD</strong><span>London · M15</span></div><div className="journal-line"><span>Setup quality</span><b>Strong</b></div><div className="journal-line"><span>Plan followed</span><b className="green">✓ Yes</b></div><div className="journal-tags"><i>Liquidity sweep</i><i>FVG</i><i>HTF bias</i></div></div></article>
        <article className="feature-card" data-reveal><div className="feature-icon"><FeatureIcon type="analytics"/></div><span>ANALYTICS</span><h3>Patterns, not assumptions</h3><p>Compare performance by symbol, session, and setup using your own closed trades.</p><div className="mini-bars"><i style={{height:'42%'}}/><i style={{height:'66%'}}/><i style={{height:'51%'}}/><i style={{height:'84%'}}/><i style={{height:'72%'}}/><i style={{height:'96%'}}/></div></article>
        <article className="feature-card" data-reveal><div className="feature-icon"><FeatureIcon type="rules"/></div><span>DISCIPLINE</span><h3>Rules before emotion</h3><p>Check risk, planned R:R, daily entries, daily loss, and confluences before saving.</p><div className="rule-preview"><div><i>✓</i><span>Risk within limit</span></div><div><i>✓</i><span>Minimum R:R reached</span></div><div><i>✓</i><span>Confluence confirmed</span></div></div></article>
        <article className="feature-card feature-visual-card" data-reveal><div className="feature-icon"><FeatureIcon type="calendar"/></div><span>CALENDAR</span><h3>See every trading day</h3><p>Review daily realised results and jump straight into the trades behind each number.</p><div className="calendar-preview"><div className="calendar-head">September performance <span>+$2,184</span></div><div className="calendar-grid">{['1','2','3','4','5','6','7','8','9','10','11','12','13','14'].map((day, index) => <i key={day} className={index === 10 ? 'today' : [1,3,7,9,12].includes(index) ? 'profit' : [4,11].includes(index) ? 'loss' : ''}>{day}</i>)}</div></div></article>
        <article className="feature-card feature-visual-card" data-reveal><div className="feature-icon"><FeatureIcon type="mind"/></div><span>PSYCHOLOGY</span><h3>Track the trader, too</h3><p>Log FOMO, fear, confidence, revenge, and recurring mistakes alongside performance.</p><div className="mind-preview"><div className="mind-meter"><span>Confidence</span><i><b style={{width:'82%'}}/></i><strong>8.2</strong></div><div className="mind-meter"><span>Patience</span><i><b style={{width:'68%'}}/></i><strong>6.8</strong></div><div className="mind-meter"><span>Impulse</span><i><b style={{width:'24%'}}/></i><strong>2.4</strong></div><div className="mind-summary"><span>Best state</span><strong>Calm + prepared</strong></div></div></article>
        <article className="feature-card feature-visual-card" data-reveal><div className="feature-icon"><FeatureIcon type="image"/></div><span>SCREENSHOTS</span><h3>Before and after, together</h3><p>Keep your entry thesis and exit review visually connected to the same trade.</p><div className="compare-preview"><div className="compare-chart"><span>BEFORE</span></div><div className="compare-chart after"><span>AFTER · +2.4R</span></div></div></article>
      </div></section>

      <section className="workflow-section" id="workflow"><div className="workflow-copy" data-reveal><div className="section-kicker">A BETTER REVIEW LOOP</div><h2>Four steps. One repeatable rhythm.</h2><p>Tradence keeps the workflow simple enough to use after every session—and structured enough to reveal meaningful patterns.</p><a href="/app">Start your first review <ArrowIcon/></a></div><div className="workflow-steps" data-reveal>{[['01','Plan','Define entry, invalidation, target, and risk.'],['02','Execute','Record what happened without rewriting the plan.'],['03','Review','Compare the decision with the result and your rules.'],['04','Improve','Carry one clear lesson into the next session.']].map(([number, title, copy]) => <div key={number}><strong>{number}</strong><span><b>{title}</b><small>{copy}</small></span></div>)}</div></section>

      <section className="privacy-section" id="privacy" data-reveal><div className="privacy-orbit"><div className="privacy-lock">◆</div><i/><i/><i/></div><div><div className="section-kicker">LOCAL-FIRST BY DESIGN</div><h2>Your journal stays yours.</h2><p>Your trades and screenshots are stored in your browser. Tradence currently requires no account and sends no journal data to a Tradence server.</p><div className="privacy-points"><span>✓ No sign-up required</span><span>✓ JSON backup and restore</span><span>✓ Works without a cloud account</span></div></div></section>

      <section className="faq-section" id="faq"><div className="section-heading" data-reveal><div><div className="section-kicker">QUESTIONS</div><h2>Before you start journaling.</h2></div></div><div className="faq-list" data-reveal>{[
        ['Is Tradence free to use?','Yes. The current local version can be used without a subscription or payment.'],
        ['Where is my trading data stored?','Your journal is stored locally in your browser using IndexedDB. Export a backup before clearing browser data or changing devices.'],
        ['Does Tradence connect to my broker?','Not yet. Trades are currently entered manually so you remain in control of every detail.'],
        ['Can I attach chart screenshots?','Yes. You can keep before-entry and after-exit screenshots with each trade.'],
      ].map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>

      <section className="final-cta" data-reveal><div className="cta-grid"/><div className="section-kicker">BUILD YOUR RHYTHM</div><h2>Your next improvement starts with the trade you review today.</h2><p>Open your private journal and turn the next decision into useful evidence.</p><a className="landing-button primary" href="/app">Open Tradence <ArrowIcon/></a></section>
    </main>

    <footer className="landing-footer"><div><Brand/><p>A focused, local-first trading journal for deliberate improvement.</p></div><div><strong>Product</strong><a href="#features">Features</a><a href="#workflow">How it works</a><a href="/app">Open journal</a></div><div><strong>Principles</strong><a href="#privacy">Privacy</a><a href="#faq">FAQ</a><span>Local-first</span></div><div className="footer-note"><strong>Risk notice</strong><p>Tradence is journaling software, not financial advice or a brokerage. Trading involves substantial risk.</p></div><small>© {new Date().getFullYear()} Tradence. Build rhythm. Measure growth.</small></footer>
  </div>
}

export default LandingPage
