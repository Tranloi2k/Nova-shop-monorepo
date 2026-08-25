import Link from "next/link";

import ShopShell from "@/app/ui/shop/shop-shell";

import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <ShopShell>
      <section className={styles.page} aria-labelledby="not-found-title">
        <div className={`wrap ${styles.content}`}>
          <p className={styles.code} aria-hidden="true">
            404
          </p>
          <h1 id="not-found-title" className={styles.title}>
            Page not found
          </h1>
          <p className={styles.description}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className={styles.actions}>
            <Link href="/" className="btn btn-dark btn-lg">
              Back to home
            </Link>
            <Link href="/products" className={styles.shopLink}>
              Browse products <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </ShopShell>
  );
}
