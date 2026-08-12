import Link from "next/link";
import { categoryNavHref, productsHref } from "@/app/lib/product-filters";
import { Icon } from "@/app/ui/nova/nova-icons";
import { NovaGlyph } from "@/app/ui/nova/nova-glyphs";
import { NovaProductCard } from "@/app/ui/nova/nova-product-card";
import { Reveal } from "@/app/ui/nova/reveal";
import { NovaNewsletter } from "@/app/ui/nova/nova-newsletter";
import { getProducts } from "@/app/lib/services/products";
import type { ProductListItem } from "@/app/lib/definitions";
import { CampaignHero } from "@/app/ui/shop/campaign-hero";

/* ---- StorefrontHero → Nova HeroA ---------------------------------- */
export function StorefrontHero() {
  return <CampaignHero />;
}

/* ---- CategoryTiles → Nova CategoryStrip --------------------------- */
const cats = [
  { id: "smartphones", label: "Phones", detail: "Power in your pocket", glyph: "phone" as const },
  { id: "tablets", label: "Tablets", detail: "Create from anywhere", glyph: "tablet" as const },
  { id: "wearables", label: "Wearables", detail: "Move smarter", glyph: "watch" as const },
  { id: "audio", label: "Audio", detail: "Hear every detail", glyph: "headphones" as const },
  { id: "laptops", label: "Laptops", detail: "Built to perform", glyph: "laptop" as const },
  { id: "accessories", label: "Accessories", detail: "Complete your setup", glyph: "keyboard" as const },
];

export function CategoryTiles() {
  return (
    <section
      className="section cat-strip-sec"
      style={{ background: "var(--bg)" }}
    >
      <div className="wrap">
        <div className="home-section-heading">
          <div>
            <div className="eyebrow">Find your next upgrade</div>
            <h2>Shop by category</h2>
          </div>
          <p>Everything you need, thoughtfully selected in one place.</p>
        </div>
        <div className="cat-grid">
          {cats.map((c, index) => (
            <Reveal
              as={Link}
              key={c.id}
              href={categoryNavHref(c.id)}
              className="cat-tile"
              index={index}
            >
              <span className="cat-index">0{index + 1}</span>
              <NovaGlyph type={c.glyph} className="cat-glyph" />
              <span className="cat-copy">
                <strong>{c.label}</strong>
                <small>{c.detail}</small>
              </span>
              <span className="cat-arr">
                <Icon name="arrow" size={16} />
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- FeaturedProducts → Nova FeaturedGrid (async) ----------------- */
export async function FeaturedProducts() {
  let products: ProductListItem[] = [];
  try {
    const result = await getProducts(
      { page: 1, sort: "popular" },
      { authenticated: false },
    );
    products = result.products;
  } catch {
    products = [];
  }

  const featured = products.slice(0, 8);
  if (featured.length === 0) return null;

  return (
    <section className="section home-featured" style={{ background: "var(--surface)" }}>
      <div className="wrap">
        <div className="home-section-heading home-featured-heading">
          <div>
            <div className="eyebrow">Curated for you</div>
            <h2>Trending right now</h2>
          </div>
          <Link href={productsHref({ sort: "popular" })} className="home-section-link">
            Shop all products <Icon name="arrow" size={17} sw={2} />
          </Link>
        </div>
        <div className="prod-grid">
          {featured.map((p, index) => (
            <Reveal key={p.id} index={index} className="prod-grid-cell">
              <NovaProductCard p={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- StorefrontCta → Nova PromoBand + ValueRow + Newsletter -------- */
export function StorefrontCta() {
  return (
    <>
      {/* Promo band */}
      <section className="section">
        <div className="wrap">
          <Reveal className="promo home-promo">
            <div className="promo-text">
              <div
                className="eyebrow"
                style={{ color: "var(--accent-wash)", marginBottom: 14 }}
              >
                Sound, reimagined
              </div>
              <h2 style={{ fontSize: "clamp(30px,4vw,52px)", color: "#fff" }}>
                Your world.<br />In perfect focus.
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,.72)",
                  maxWidth: 420,
                  marginTop: 16,
                  fontSize: 17,
                }}
              >
                Immersive sound, effortless pairing, and all-day comfort. Meet
                audio designed to disappear into your day.
              </p>
              <Link
                href={productsHref({ category: "audio" })}
                className="btn btn-primary btn-lg"
                style={{ marginTop: 28, display: "inline-flex" }}
              >
                Discover Nova Audio
                <Icon name="arrow" size={17} sw={2} />
              </Link>
            </div>
            <NovaGlyph type="headphones" className="promo-glyph" />
          </Reveal>
        </div>
      </section>

      {/* Value row */}
      <section className="section">
        <div className="wrap value-row">
          {(
            [
              ["truck", "Free 2-day shipping", "On every order, no minimum."],
              ["refresh", "30-day returns", "Changed your mind? No problem."],
              ["shield", "2-year warranty", "Protection on all Nova devices."],
              [
                "headset",
                "Real human support",
                "Chat with experts, 7 days a week.",
              ],
            ] as const
          ).map(([ic, t, d], index) => (
            <Reveal className="value-item" key={t} index={index}>
              <div className="value-ic">
                <Icon name={ic} size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15.5 }}>{t}</div>
                <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>
                  {d}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <NovaNewsletter />
    </>
  );
}
