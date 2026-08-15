"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { productsHref } from "@/app/lib/product-filters";
import { Icon } from "@/app/ui/nova/nova-icons";
import { Reveal } from "@/app/ui/nova/reveal";

type HeroSlide = {
  src: string;
  mobileSrc?: string;
  alt: string;
  label: string;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
};

const slides: readonly HeroSlide[] = [
  {
    src: "/hero_iphone_17_pro.jpg",
    mobileSrc: "/hero_iphone_17_pro_mobile.png",
    alt: "Orange smartphone camera shown in close detail",
    label: "Nova / New release",
    title: "iPhone 17 Pro",
    subtitle: "Pro. Beyond.",
    href: "/products",
    cta: "Shop now",
  },
  {
    src: "/hero_nova_laptop.png",
    mobileSrc: "/hero_nova_laptop_mobile.png",
    alt: "Dark graphite laptop in a blue-lit studio",
    label: "Nova / Performance",
    title: "Power, refined.",
    subtitle: "Built for your biggest ideas.",
    href: productsHref({ category: "laptops" }),
    cta: "Shop laptops",
  },
  {
    src: "/hero_nova_audio.png",
    mobileSrc: "/hero_nova_audio_mobile.png",
    alt: "Black over-ear headphones under warm studio light",
    label: "Nova / Immersive audio",
    title: "Hear every detail.",
    subtitle: "Your sound, uninterrupted.",
    href: productsHref({ category: "audio" }),
    cta: "Shop audio",
  },
] as const;

const SLIDE_INTERVAL_MS = 7000;

export function CampaignHero() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [paused]);

  const slide = slides[activeSlide];

  return (
    <section className="campaign-hero">
      <div className="campaign-offer">
        <span>Free express delivery &amp; 30-day returns</span>
        <Link href="/products">Shop new arrivals</Link>
      </div>

      <Reveal
        className="campaign-stage"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
        }}
      >
        <div className="campaign-media">
          {slides.map((item, index) => (
            <div
              key={item.src}
              className={`campaign-slide${index === activeSlide ? " is-active" : ""}`}
              aria-hidden={index !== activeSlide}
            >
              <Image
                src={item.src}
                alt={index === activeSlide ? item.alt : ""}
                fill
                className={`campaign-image${item.mobileSrc ? " campaign-image-desktop" : ""}`}
                sizes="100vw"
                priority={index === 0}
              />
              {item.mobileSrc ? (
                <Image
                  src={item.mobileSrc}
                  alt=""
                  fill
                  className="campaign-image campaign-image-mobile"
                  sizes="(max-width: 768px) 100vw, 1px"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          ))}
          <div className="campaign-shade" />
        </div>

        <div className="campaign-content" key={slide.src}>
          <span className="campaign-label">{slide.label}</span>
          <h1>{slide.title}</h1>
          <p>{slide.subtitle}</p>
          <div className="campaign-actions">
            <Link href={slide.href} className="campaign-button campaign-button-light">
              {slide.cta} <Icon name="arrow" size={18} sw={2} />
            </Link>
            <Link
              href={productsHref({ onSale: true })}
              className="campaign-button campaign-button-ghost"
            >
              View offers
            </Link>
          </div>
        </div>

        <div className="campaign-controls" aria-label="Hero slides">
          <div className="campaign-dots">
            {slides.map((item, index) => (
              <button
                key={item.src}
                type="button"
                className={index === activeSlide ? "is-active" : ""}
                onClick={() => setActiveSlide(index)}
                aria-label={`Show slide ${index + 1}`}
                aria-current={index === activeSlide ? "true" : undefined}
              />
            ))}
          </div>
        </div>

        <span className="campaign-edition" aria-hidden="true">
          NOVA - 2026 / 0{activeSlide + 1}
        </span>
      </Reveal>

      <nav className="campaign-nav" aria-label="Featured collections">
        <div className="wrap campaign-nav-inner">
          <Link href="/products" className="is-active">New releases</Link>
          <Link href={productsHref({ category: "smartphones" })}>Smartphones</Link>
          <Link href={productsHref({ category: "laptops" })}>Performance laptops</Link>
          <Link href={productsHref({ category: "audio" })}>Everyday audio</Link>
          <Link href={productsHref({ onSale: true })} className="campaign-nav-all">
            View all <Icon name="arrow" size={17} sw={2} />
          </Link>
        </div>
      </nav>
    </section>
  );
}
