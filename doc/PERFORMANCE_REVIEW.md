# Đánh giá Performance — Nova Storefront (Next.js)

> Phạm vi: ứng dụng storefront `Nova-online-shopping-nextjs` (bỏ qua `Nova-admin`).
> Stack: Next.js 15.5.7 (App Router, Turbopack), React 19, next-auth v5, Tailwind 3.
> Ngày: 2026-06-23

---

## Tóm tắt nhanh

Kiến trúc tổng thể tốt: dùng App Router + Server Components, `next/image` cho ảnh nội bộ, fonts qua `next/font`, ISR + cache tags ở tầng fetch. **Tuy nhiên có một số cấu hình đang "vô hiệu hoá" chính các tối ưu đó** — đặc biệt là `force-dynamic` ở layout khiến toàn bộ trang shop render động mỗi request, làm chết ISR/SSG của trang chi tiết sản phẩm.

Mức độ ưu tiên:

| # | Vấn đề | Ảnh hưởng | Công sức | Ưu tiên |
|---|--------|-----------|----------|---------|
| 1 | `(shop)/layout.tsx` `force-dynamic` ép động toàn bộ route con | 🔴 Cao (TTFB, mất cache) | Thấp | **P0** |
| 2 | PDP có `generateStaticParams` + `revalidate` nhưng bị vô hiệu | 🔴 Cao | Thấp | **P0** |
| 3 | Ảnh sản phẩm từ CDN ngoài đi qua `<img>` thuần, không tối ưu | 🟠 Trung-Cao (LCP, CLS, băng thông) | Trung | **P1** |
| 4 | `NovaProductCard` là `"use client"` không cần thiết | 🟠 Trung (JS bundle) | Trung | **P1** |
| 5 | 3 hệ analytics (GTM + GA + Vercel) + GTM inline ở `<head>` | 🟠 Trung (main-thread, blocking) | Thấp | **P1** |
| 6 | 5 họ font Google, nhiều weight; Lusitana không dùng | 🟡 Thấp-Trung | Thấp | **P2** |
| 7 | `AIChatbot` + AI SDK nạp client trên mọi trang | 🟡 Thấp-Trung (bundle) | Trung | **P2** |
| 8 | `next.config` images chưa bật AVIF / tinh chỉnh cache | 🟡 Thấp | Thấp | **P2** |
| 9 | Hero JPG 409KB nguồn lớn (đã qua next/image) | 🟢 Thấp | Thấp | **P3** |

---

## Phân tích chi tiết

### 1. ⛔ `force-dynamic` ở layout ép động toàn bộ route con — P0

`app/(shop)/layout.tsx`:

```ts
export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";
```

Segment config ở **layout** áp dụng cho **toàn bộ segment con**: trang danh sách sản phẩm, **trang chi tiết sản phẩm (PDP)**, cart, account, customers. Hệ quả:

- Mọi request đều render server-side từ đầu → TTFB cao hơn, không tận dụng full-route cache / CDN.
- `fetchCache = "default-no-store"` còn ép các fetch không khai báo cache thành `no-store`.

**Vấn đề lớn nhất:** cấu hình này áp lên cả những trang vốn *nên* tĩnh (catalog, PDP) chỉ vì chúng nằm chung layout với các trang cần dữ liệu theo user (cart, account).

**Khuyến nghị:** Bỏ `force-dynamic`/`fetchCache` khỏi layout dùng chung. Đẩy `dynamic = "force-dynamic"` **xuống từng route thực sự cần per-user** (cart, account/*, customers). Để catalog & PDP tự quyết bằng `revalidate` của chúng.

```ts
// app/(shop)/layout.tsx  → bỏ 2 dòng config, chỉ giữ JSX
// app/(shop)/account/layout.tsx, cart/page.tsx, customers/page.tsx
export const dynamic = "force-dynamic"; // chỉ ở nơi cần
```

---

### 2. ⛔ PDP khai báo SSG/ISR nhưng đang bị vô hiệu hoá — P0

`app/(shop)/products/[slug]/page.tsx`:

```ts
export const revalidate = 60;
export const dynamicParams = true;
export async function generateStaticParams() { return getAllProductSlugParams(); }
```

PDP được thiết kế để **prebuild tĩnh + ISR 60s** — rất tốt cho LCP và TTFB. Nhưng vì layout cha đặt `force-dynamic`, toàn bộ ý định này bị bỏ qua: `generateStaticParams` (và vòng lặp fetch tới `staticBuildMaxPages = 100` trang trong `getAllProductSlugParams`) trở thành code chết.

**Khuyến nghị:** Sau khi sửa #1, PDP sẽ thực sự được prerender + ISR. Đây là *cùng một fix* với #1 nhưng đáng tách ra vì là nơi hưởng lợi rõ nhất (trang sản phẩm thường là landing page từ search/ads).

---

### 3. 🟠 Ảnh sản phẩm từ CDN ngoài không được tối ưu — P1

`app/ui/shared/safe-image.tsx` chỉ cho phép `next/image` với `res.cloudinary.com` và `*.googleusercontent.com`. Mọi host khác rơi vào nhánh `<img>` thuần:

```tsx
<img src={srcStr} ... loading={priority ? "eager" : "lazy"} />
```

Nhánh này **không** có: tối ưu định dạng (AVIF/WebP), resize theo `sizes`, `srcset` responsive, và **không có width/height cố định** khi `fill` → nguy cơ **CLS** và tải ảnh gốc full-size. Nếu phần lớn ảnh sản phẩm đến từ vendor CDN ngoài (rất phổ biến), thì grid sản phẩm và PDP đang tải ảnh chưa nén — ảnh hưởng trực tiếp **LCP** và băng thông mobile.

**Khuyến nghị (chọn 1):**
- Thêm các host CDN sản phẩm vào `images.remotePatterns` trong `next.config.ts` để chúng đi qua `next/image`; hoặc
- Proxy/normalize ảnh về Cloudinary lúc ingest; hoặc
- Tối thiểu: gán `width`/`height` (hoặc `aspect-ratio` cố định) cho nhánh `<img>` để chặn CLS.

---

### 4. 🟠 `NovaProductCard` là client component không cần thiết — P1

`app/ui/nova/nova-product-card.tsx` mở đầu bằng `"use client"`, nhưng phần tương tác duy nhất là callback `onFav` *optional*. Trên trang chủ (`FeaturedProducts`) và danh sách sản phẩm, card được render **không có `onFav`** → không cần JS phía client. Hiện tại toàn bộ lưới sản phẩm (8+ card/trang) bị serialize và hydrate vô ích.

**Khuyến nghị:** Tách card thành Server Component; chỉ rút nút "fav" (khi có `onFav`) ra một client component nhỏ. Hoặc nếu `onFav` chưa dùng ở storefront, bỏ hẳn và chuyển card về server. Giảm JS hydrate cho mọi trang có lưới sản phẩm.

---

### 5. 🟠 Ba hệ analytics song song + GTM chèn inline ở `<head>` — P1

`app/layout.tsx` nạp đồng thời: **Google Tag Manager**, **Google Analytics (gtag)**, và **Vercel Analytics**.

- `GoogleTagManagerScript` (`components/GoogleTagManager.tsx`) dùng `<script dangerouslySetInnerHTML>` đặt thẳng trong `<head>` — không qua `next/script`, chạy sớm và cạnh tranh main-thread khi khởi động.
- GTM thường đã bao trùm GA → chạy **cả hai** dễ gây trùng lặp và tăng tải.

**Khuyến nghị:**
- Chọn **một** đường: GTM *hoặc* GA trực tiếp, không cả hai.
- Chuyển GTM sang `next/script` với `strategy="afterInteractive"` (hoặc `worker`/Partytown nếu muốn đẩy khỏi main-thread).
- Cân nhắc bỏ Vercel Analytics nếu đã có GA/GTM, hoặc ngược lại.

---

### 6. 🟡 Nhiều họ font & weight; có font không dùng — P2

`app/ui/fonts.ts` khai báo **5 họ**: Inter, Outfit (3 weight), **Lusitana** (2 weight), Sora (5 weight), Manrope (5 weight). Layout chỉ dùng `inter, outfit, sora, manrope` — **Lusitana không được gắn vào** `<body>`.

- Mỗi weight là một file font tải thêm; Sora+Manrope = 10 file weight.
- Lusitana có khả năng là code thừa.

**Khuyến nghị:**
- Xoá `Lusitana` nếu không dùng.
- Giảm số weight thực sự cần (vd Sora/Manrope thường chỉ cần 2–3 weight). `display: "swap"` đã đặt đúng (tránh FOIT) — giữ nguyên.
- Cân nhắc gộp còn 2 họ font để giảm tải.

---

### 7. 🟡 `AIChatbot` + AI SDK vào client bundle trên mọi trang — P2

`AIChatbot` render trong root layout (`app/layout.tsx`) và là `"use client"`, kéo theo `@ai-sdk/react` + `ai` vào bundle client của **mọi** trang, dù người dùng hiếm khi mở chat.

**Khuyến nghị:** `dynamic(() => import("@/components/AIChatbot"), { ssr: false })`, hoặc tách nút mở chat (nhẹ) khỏi panel chat (nặng) và chỉ import panel khi mở. Giảm JS khởi tạo cho trang chủ/PDP.

---

### 8. 🟡 `next.config` images chưa bật AVIF / tinh chỉnh cache — P2

`next.config.ts` mới khai báo `remotePatterns`. Có thể thêm:

```ts
images: {
  formats: ["image/avif", "image/webp"],
  minimumCacheTTL: 60 * 60 * 24 * 30, // cache ảnh đã tối ưu lâu hơn
  // deviceSizes / imageSizes nếu muốn giới hạn biến thể
  remotePatterns: [ /* ... */ ],
}
```

AVIF giảm đáng kể dung lượng ảnh so với WebP/JPEG cho cùng chất lượng.

---

### 9. 🟢 Hero JPG nguồn 409KB — P3

`public/hero_iphone_17_pro.jpg` nặng 409KB. Đã render qua `next/image` với `priority` + `fetchPriority="high"` + `sizes` đúng nên được resize/nén tự động — chấp nhận được. Có thể chuẩn bị sẵn bản nguồn nhỏ hơn để build nhanh hơn, nhưng tác động runtime thấp.

---

## Lộ trình đề xuất (theo thứ tự thực hiện)

**Đợt 1 — Cache & rendering (P0, công sức thấp, lợi ích cao nhất):**
1. Bỏ `force-dynamic` + `fetchCache` khỏi `(shop)/layout.tsx`.
2. Đẩy `force-dynamic` xuống đúng các route cần per-user (cart, account/*, customers).
3. Xác nhận PDP & catalog được prerender/ISR (kiểm tra output `next build` — phải thấy ` ● (ISR)` / ` ○ (Static)` thay vì ` ƒ (Dynamic)`).

**Đợt 2 — Ảnh & JS bundle (P1):**
4. Đưa ảnh sản phẩm CDN ngoài vào `next/image` (allowlist host) hoặc chặn CLS bằng kích thước cố định.
5. Chuyển `NovaProductCard` về Server Component.
6. Gộp về một hệ analytics; chuyển GTM sang `next/script`.

**Đợt 3 — Tinh chỉnh (P2/P3):**
7. Dọn font (bỏ Lusitana, giảm weight).
8. Lazy-load `AIChatbot`.
9. Bật AVIF + cache TTL trong `next.config`.

---

## Cách đo lường (đề xuất)

- Chạy `next build` và đọc bảng route để xác nhận trang nào Static/ISR/Dynamic (kiểm chứng fix #1, #2).
- `@next/bundle-analyzer` để đo JS client trước/sau fix #4, #7.
- Lighthouse / PageSpeed cho `/`, `/products`, `/products/[slug]` — theo dõi **LCP, CLS, TBT** trước và sau từng đợt.
- Web Vitals thực tế qua Vercel Analytics (đã có sẵn).

---

*Báo cáo dựa trên đọc mã nguồn tĩnh; chưa chạy build/Lighthouse trong môi trường này. Các con số cần được xác nhận bằng đo lường ở mục trên.*
