'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { HOME_SLIDES, SLIDE_INTERVAL, type HomeSlide } from '@/lib/home-slides'

function SlideLink({ slide, children }: { slide: HomeSlide; children: React.ReactNode }) {
  if (!slide.href.startsWith('/')) {
    return (
      <a href={slide.href} target="_blank" rel="noopener noreferrer" className="home-slide-link">
        {children}
      </a>
    )
  }
  return (
    <Link href={slide.href} className="home-slide-link">
      {children}
    </Link>
  )
}

export function HomeCarousel() {
  // A slide whose image 404s is dropped rather than left as a broken
  // frame — this lets the carousel ship before the artwork does, and
  // means a mistyped filename degrades quietly instead of defacing the
  // busiest page on the site.
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const slides = HOME_SLIDES.filter((slide) => !broken.has(slide.image))
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  // Set while a programmatic scroll is animating, so the scroll events it
  // fires don't fight the index we just set.
  const scrollingTo = useRef<number | null>(null)

  const goTo = useCallback((next: number) => {
    const track = trackRef.current
    if (!track) return

    const count = track.children.length
    if (count === 0) return

    // Wrap, so the arrows and the timer both loop rather than dead-end.
    const target = ((next % count) + count) % count
    const slide = track.children[target] as HTMLElement | undefined
    if (!slide) return

    setIndex(target)
    scrollingTo.current = target
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' })
  }, [])

  // Swiping writes the position back so the dots follow the image.
  const handleScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const centre = track.scrollLeft + track.clientWidth / 2
    let nearest = 0
    let smallest = Infinity

    for (let i = 0; i < track.children.length; i++) {
      const slide = track.children[i] as HTMLElement
      const slideCentre = slide.offsetLeft - track.offsetLeft + slide.clientWidth / 2
      const distance = Math.abs(slideCentre - centre)
      if (distance < smallest) {
        smallest = distance
        nearest = i
      }
    }

    if (scrollingTo.current !== null) {
      if (scrollingTo.current === nearest) scrollingTo.current = null
      return
    }

    setIndex((current) => (current === nearest ? current : nearest))
  }, [])

  // Auto-advance. Pauses on hover/focus, while the tab is hidden, and for
  // anyone who has asked for reduced motion.
  useEffect(() => {
    if (slides.length < 2 || paused) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const timer = setInterval(() => {
      if (document.hidden) return
      goTo(index + 1)
    }, SLIDE_INTERVAL)

    return () => clearInterval(timer)
  }, [index, paused, slides.length, goTo])

  if (slides.length === 0) return null

  // Dropping a broken slide can leave the index past the end.
  const active = Math.min(index, slides.length - 1)

  return (
    <section
      className="home-carousel"
      aria-roledescription="carrousel"
      aria-label="À la une"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="home-carousel-track" ref={trackRef} onScroll={handleScroll}>
        {slides.map((slide, i) => (
          <div
            className="home-slide"
            key={slide.image + i}
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${slides.length}`}
          >
            <SlideLink slide={slide}>
              <Image
                src={slide.image}
                alt={slide.alt}
                width={1920}
                height={1080}
                sizes="100vw"
                priority={i === 0}
                onError={() =>
                  setBroken((current) => {
                    if (current.has(slide.image)) return current
                    const next = new Set(current)
                    next.add(slide.image)
                    return next
                  })
                }
              />
            </SlideLink>
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            className="home-carousel-arrow prev"
            aria-label="Diapositive précédente"
            onClick={() => goTo(active - 1)}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            className="home-carousel-arrow next"
            aria-label="Diapositive suivante"
            onClick={() => goTo(active + 1)}
          >
            <ChevronRight size={22} />
          </button>

          <div className="home-carousel-dots">
            {slides.map((slide, i) => (
              <button
                key={slide.image + i}
                type="button"
                className={i === active ? 'active' : ''}
                aria-label={`Aller à la diapositive ${i + 1}`}
                aria-current={i === active}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
