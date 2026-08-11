import Link from "next/link";
import {
  categoryNavHref,
  CATEGORY_NAV_ITEMS,
  productsHref,
} from "@/app/lib/product-filters";

export default function NovaFooter() {
  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 22,
                color: "#fff",
                letterSpacing: "-0.03em",
              }}
            >
              NOVA
            </span>
            <p
              className="muted"
              style={{
                marginTop: 16,
                maxWidth: 280,
                color: "rgba(255,255,255,.55)",
              }}
            >
              Premium tech, thoughtfully chosen. Free 2-day shipping and 30-day
              returns on everything.
            </p>
          </div>

          <div className="foot-col">
            <h2>Shop</h2>
            {CATEGORY_NAV_ITEMS.map((c) => (
              <Link key={c.id} href={categoryNavHref(c.id)}>
                {c.label}
              </Link>
            ))}
            <Link href={categoryNavHref("all")}>All products</Link>
          </div>

          <div className="foot-col">
            <h2>Discover</h2>
            {[
              { name: "New arrivals", href: productsHref({ sort: "newest" }) },
              { name: "Top rated", href: productsHref({ sort: "rating" }) },
              { name: "Offers", href: productsHref({ onSale: true }) },
              { name: "Shopping bag", href: "/cart" },
            ].map((item) => (
              <Link key={item.name} href={item.href}>
                {item.name}
              </Link>
            ))}
          </div>

          <div className="foot-col">
            <h2>Account</h2>
            {[
              { name: "Overview", href: "/account" },
              { name: "Orders", href: "/account/orders" },
              { name: "Wishlist", href: "/account/wishlist" },
              { name: "Profile", href: "/account/profile" },
            ].map((item) => (
              <Link key={item.name} href={item.href}>
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="foot-bottom">
          <span>
            © {new Date().getFullYear()} NOVA Shop. All rights reserved.
          </span>
          <div className="foot-bottom-links">
            {[
              { name: "Privacy", href: "/privacy" },
              { name: "Terms", href: "/terms" },
              { name: "Cookies", href: "/cookies" },
            ].map((item) => (
              <Link key={item.name} href={item.href}>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
