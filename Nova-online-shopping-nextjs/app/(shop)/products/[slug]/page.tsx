import {
  getAllProductSlugParams,
  getProductById,
} from "@/app/lib/services/products";
import {
  buildPageMetadata,
  getProductOgDescription,
  getProductOgImage,
  productPath,
} from "@/app/lib/seo";
import {
  getProductGalleryImages,
  parseCommaSeparatedList,
} from "@/app/lib/product-fields";
import { productDetailJsonLd } from "@/app/lib/seo-structured-data";
import JsonLd from "@/app/ui/seo/json-ld";
import { StarIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import SlideImage from "./slideImage";
import ProductForm from "./productForm";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/app/ui/nova/nova-icons";
import {
  getReviewMetrics,
  parseProductDetail,
} from "@/app/lib/product-detail";

type ProductPageProps = Readonly<{
  params: Promise<Readonly<{ slug: string }>>;
}>;

function addBusinessDays(date: Date, days: number) {
  const result = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}

function getDeliveryEstimate() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const now = new Date();
  return `${formatter.format(addBusinessDays(now, 2))} – ${formatter.format(
    addBusinessDays(now, 3),
  )}`;
}

function formatCategory(value?: string) {
  if (!value) return "Premium technology";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const ProductTabs = dynamic(() => import("./productTabs"), {
  loading: () => (
    <div className="pdp-tabs" style={{ marginTop: 48 }}>
      <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-[var(--surface-muted)]" />
      <div className="mt-6 h-40 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
    </div>
  ),
});

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return getAllProductSlugParams();
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const id = slug.split(".").pop() || "";
  const data = await getProductById(id, { authenticated: false });

  return buildPageMetadata({
    title: data.name,
    description: getProductOgDescription(data),
    pathname: productPath({ id: data.id, name: data.name }),
    image: getProductOgImage(data),
  });
}

export default async function ProductPage(props: ProductPageProps) {
  const { slug } = await props.params;
  const id = slug.split(".").pop() || "";
  const data = await getProductById(id, { authenticated: false });
  const { reviews } = data;
  const { reviewTotal, productRating } = getReviewMetrics(
    reviews,
    data.reviewCount,
    data.rate,
  );

  const product = {
    ...data,
    colors: parseCommaSeparatedList(data.colors),
    storageOptions: parseCommaSeparatedList(data.storageOptions),
    images: getProductGalleryImages(data),
  };

  const prodDetail = parseProductDetail(product.detailInformation);

  const displayDetails: Record<string, unknown> = {
    Category: formatCategory(product.category),
    Availability: Number(product.stock) > 0 ? "In stock" : "Out of stock",
    Finish: product.colors.join(", ") || "Standard finish",
    Storage: product.storageOptions.join(", ") || "Standard configuration",
    Warranty: "2-year limited warranty",
  };
  if (prodDetail) Object.assign(displayDetails, prodDetail);
  const deliveryEstimate = getDeliveryEstimate();

  return (
    <main className="pdp-main">
      <JsonLd data={productDetailJsonLd(data)} />
      <div className="wrap">
        {/* Breadcrumb */}
        <nav className="crumbs pdp-crumbs">
          <Link href="/products">Shop</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        {/* Main grid: gallery + info */}
        <div className="pdp-grid">
          <div className="pdp-gallery">
            <SlideImage images={product.images} name={product.name} />
          </div>

          <div className="pdp-info">
            <div
              className="muted"
              style={{ fontWeight: 700, fontSize: "13.5px", letterSpacing: ".02em" }}
            >
              NOVA
            </div>
            <h1 className="pdp-title" style={{ marginTop: 6 }}>
              {product.name}
            </h1>

            {/* Stars */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {[1, 2, 3, 4, 5].map((r) =>
                  r <= Math.floor(productRating) ? (
                    <StarIcon
                      key={r}
                      style={{ width: 14, height: 14, color: "var(--ink)" }}
                    />
                  ) : (
                    <StarOutlineIcon
                      key={r}
                      style={{ width: 14, height: 14, color: "var(--hair)" }}
                    />
                  ),
                )}
              </div>
              <span className="muted" style={{ fontSize: 13.5 }}>
                {productRating.toFixed(1)} · {reviewTotal.toLocaleString()} reviews
              </span>
            </div>

            <p className="muted pdp-desc">
              {product.description}
            </p>

            <div className="pdp-highlights" aria-label="Product highlights">
              <div>
                <span className="pdp-highlight-icon"><Icon name="box" size={18} /></span>
                <span><strong>{formatCategory(product.category)}</strong><small>Selected by NOVA</small></span>
              </div>
              <div>
                <span className="pdp-highlight-icon"><Icon name="check" size={18} /></span>
                <span><strong>{Number(product.stock) > 0 ? "Ready to ship" : "Currently unavailable"}</strong><small>Live stock status</small></span>
              </div>
              <div>
                <span className="pdp-highlight-icon"><Icon name="shield" size={18} /></span>
                <span><strong>2-year warranty</strong><small>Included protection</small></span>
              </div>
            </div>

            <ProductForm
              product={{ ...product }}
              deliveryEstimate={deliveryEstimate}
            />
          </div>
        </div>

        {/* Tabs: Specifications / Shipping / Reviews */}
        <ProductTabs
          productDetail={displayDetails}
          reviews={reviews}
          productRate={productRating}
          reviewCount={reviewTotal}
        />
      </div>
    </main>
  );
}
