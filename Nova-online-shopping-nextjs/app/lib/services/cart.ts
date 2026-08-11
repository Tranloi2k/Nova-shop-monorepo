"use server";

import { authFetch } from "@/app/lib/api-client";
import { CACHE_TAGS } from "@/app/lib/cache-tags";
import type { CartItem, CartSummary } from "@/app/lib/definitions";
import { revalidateAfterCartChange } from "@/app/lib/revalidate-shop";
import { resolveUserId } from "@/app/lib/auth-tokens";
import { getProductById } from "@/app/lib/services/products";
import { cookies } from "next/headers";

const EMPTY_CART: CartSummary = {
  cart: null,
  totalItems: 0,
  totalPrice: 0,
  totalDiscount: 0,
  finalPrice: 0,
};

const GUEST_CART_COOKIE = "nova_guest_cart";
const GUEST_CART_MAX_LINES = 24;

type GuestCartLine = {
  id: number;
  productId: number;
  quantity: number;
  color: string;
  storage: string;
};

function normalizeGuestLines(value: unknown): GuestCartLine[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((line) => {
      const item = line as Partial<GuestCartLine>;
      return {
        id: Number(item.id),
        productId: Number(item.productId),
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        color: typeof item.color === "string" ? item.color.slice(0, 128) : "",
        storage: typeof item.storage === "string" ? item.storage.slice(0, 128) : "",
      };
    })
    .filter(
      (line) =>
        Number.isInteger(line.id) &&
        line.id < 0 &&
        Number.isInteger(line.productId) &&
        line.productId > 0,
    )
    .slice(0, GUEST_CART_MAX_LINES);
}

async function readGuestLines(): Promise<GuestCartLine[]> {
  const raw = (await cookies()).get(GUEST_CART_COOKIE)?.value;
  if (!raw) return [];

  try {
    return normalizeGuestLines(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return [];
  }
}

async function writeGuestLines(lines: GuestCartLine[]) {
  const cookieStore = await cookies();
  if (lines.length === 0) {
    cookieStore.delete(GUEST_CART_COOKIE);
    return;
  }

  cookieStore.set(
    GUEST_CART_COOKIE,
    encodeURIComponent(JSON.stringify(lines.slice(0, GUEST_CART_MAX_LINES))),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    },
  );
}

async function getGuestCartSummary(
  lines?: GuestCartLine[],
): Promise<CartSummary> {
  const guestLines = lines ?? (await readGuestLines());
  if (guestLines.length === 0) return EMPTY_CART;

  const items = (
    await Promise.all(
      guestLines.map(async (line): Promise<CartItem | null> => {
        try {
          const product = await getProductById(String(line.productId), {
            authenticated: false,
          });
          return {
            id: line.id,
            cartId: 0,
            productId: line.productId,
            quantity: line.quantity,
            price: Number(product.price) || 0,
            color: line.color,
            storage: line.storage,
            product: {
              id: Number(product.id),
              name: String(product.name),
              image: String(product.image ?? ""),
              price: Number(product.price) || 0,
              discount: Number(product.discount) || 0,
              stock: Number(product.stock) || 0,
            },
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((item): item is CartItem => item !== null);

  if (items.length === 0) return EMPTY_CART;

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const totalDiscount = items.reduce(
    (total, item) =>
      total +
      item.price * item.quantity * ((Number(item.product.discount) || 0) / 100),
    0,
  );

  return {
    cart: { id: 0, userId: 0, quantity: totalItems, items },
    totalItems,
    totalPrice,
    totalDiscount,
    finalPrice: totalPrice - totalDiscount,
  };
}

async function revalidateCartCaches(options?: { productId?: string | number }) {
  const userId = await resolveUserId();

  revalidateAfterCartChange({
    userId,
    productId: options?.productId,
    refreshRoute: true,
  });
}

async function getApiUrl(): Promise<string> {
  const apiUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_URL;
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_EXTERNAL_API_URL is not configured");
  }
  return apiUrl;
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }
    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}

async function fetchCartResponse(userId: string): Promise<Response> {
  const apiUrl = await getApiUrl();

  const tags: string[] = [CACHE_TAGS.cart];
  if (userId) {
    tags.push(CACHE_TAGS.cartUser(userId));
  }

  return authFetch(`${apiUrl}/cart?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
    next: { tags },
  });
}

export async function getCartSummary(): Promise<CartSummary> {
  const guestLines = await readGuestLines();
  if (guestLines.length > 0) {
    return getGuestCartSummary(guestLines);
  }

  const apiUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_URL;
  if (!apiUrl) {
    return EMPTY_CART;
  }

  const userId = await resolveUserId();
  if (!userId) return EMPTY_CART;

  const res = await fetchCartResponse(userId);

  if (res.status === 401 || res.status === 404) {
    return EMPTY_CART;
  }

  if (!res.ok) {
    console.error("Failed to fetch cart:", res.status);
    return EMPTY_CART;
  }

  return res.json();
}

/** @deprecated Prefer getCartSummary — kept for navbar badge */
export async function getCart() {
  const summary = await getCartSummary();
  return summary.cart;
}

export async function addToCart(
  productId: string,
  quantity: number,
  options?: { color?: string; storage?: string },
): Promise<CartSummary> {
  const guestLines = await readGuestLines();
  const userId = await resolveUserId();

  if (!userId || guestLines.length > 0) {
    const numericProductId = Number(productId);
    const product = await getProductById(String(productId), {
      authenticated: false,
    });
    const color = options?.color?.trim() ?? "";
    const storage = options?.storage?.trim() ?? "";
    const matchingLine = guestLines.find(
      (line) =>
        line.productId === numericProductId &&
        line.color === color &&
        line.storage === storage,
    );
    const productQuantity = guestLines
      .filter((line) => line.productId === numericProductId)
      .reduce((total, line) => total + line.quantity, 0);
    const requestedQuantity = Math.max(1, Math.floor(quantity));
    const stock = Math.max(0, Number(product.stock) || 0);

    if (productQuantity + requestedQuantity > stock) {
      throw new Error(`Only ${stock} unit(s) of "${product.name}" available in stock`);
    }

    const nextLines = matchingLine
      ? guestLines.map((line) =>
          line.id === matchingLine.id
            ? { ...line, quantity: line.quantity + requestedQuantity }
            : line,
        )
      : [
          ...guestLines,
          {
            id: Math.min(0, ...guestLines.map((line) => line.id)) - 1,
            productId: numericProductId,
            quantity: requestedQuantity,
            color,
            storage,
          },
        ];

    if (nextLines.length > GUEST_CART_MAX_LINES) {
      throw new Error("Your guest bag is full. Remove an item before adding another.");
    }

    await writeGuestLines(nextLines);
    return getGuestCartSummary(nextLines);
  }

  const apiUrl = await getApiUrl();

  const res = await authFetch(`${apiUrl}/cart/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: Number(productId),
      quantity,
      color: options?.color ?? "",
      storage: options?.storage ?? "",
    }),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res, "Failed to add to cart"));
  }

  const data: CartSummary = await res.json();
  await revalidateCartCaches({ productId });
  return data;
}

export async function updateCartItem(
  cartItemId: number,
  quantity: number,
): Promise<CartSummary> {
  const guestLines = await readGuestLines();
  const guestLine = guestLines.find((line) => line.id === cartItemId);
  if (guestLine) {
    const product = await getProductById(String(guestLine.productId), {
      authenticated: false,
    });
    const siblingQuantity = guestLines
      .filter(
        (line) => line.productId === guestLine.productId && line.id !== cartItemId,
      )
      .reduce((total, line) => total + line.quantity, 0);
    const nextQuantity = Math.max(1, Math.floor(quantity));
    const stock = Math.max(0, Number(product.stock) || 0);
    if (siblingQuantity + nextQuantity > stock) {
      throw new Error(`Only ${stock} unit(s) of "${product.name}" available in stock`);
    }

    const nextLines = guestLines.map((line) =>
      line.id === cartItemId ? { ...line, quantity: nextQuantity } : line,
    );
    await writeGuestLines(nextLines);
    return getGuestCartSummary(nextLines);
  }

  const apiUrl = await getApiUrl();

  const res = await authFetch(`${apiUrl}/cart/items/${cartItemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res, "Failed to update cart item"));
  }

  const data: CartSummary = await res.json();
  await revalidateCartCaches();
  return data;
}

export async function removeFromCart(
  cartItemId: number,
): Promise<CartSummary> {
  const guestLines = await readGuestLines();
  if (guestLines.some((line) => line.id === cartItemId)) {
    const nextLines = guestLines.filter((line) => line.id !== cartItemId);
    await writeGuestLines(nextLines);
    return getGuestCartSummary(nextLines);
  }

  const apiUrl = await getApiUrl();

  const res = await authFetch(`${apiUrl}/cart/items/${cartItemId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to remove cart item");
  }

  const data: CartSummary = await res.json();
  await revalidateCartCaches();
  return data;
}

export async function clearCart(): Promise<CartSummary> {
  const guestLines = await readGuestLines();
  if (guestLines.length > 0) {
    await writeGuestLines([]);
    return EMPTY_CART;
  }

  const apiUrl = await getApiUrl();

  const res = await authFetch(`${apiUrl}/cart/clear`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to clear cart");
  }

  await revalidateCartCaches();
  return EMPTY_CART;
}

/** Merge an anonymous cookie cart into the signed-in account before checkout. */
export async function mergeGuestCart(): Promise<CartSummary> {
  let guestLines = await readGuestLines();
  if (guestLines.length === 0) return getCartSummary();

  const userId = await resolveUserId();
  if (!userId) return getGuestCartSummary(guestLines);

  const apiUrl = await getApiUrl();
  for (const line of [...guestLines]) {
    const res = await authFetch(`${apiUrl}/cart/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: line.productId,
        quantity: line.quantity,
        color: line.color,
        storage: line.storage,
      }),
    });

    if (!res.ok) {
      throw new Error(await readApiError(res, "Could not move your guest bag to your account"));
    }

    guestLines = guestLines.filter((guestLine) => guestLine.id !== line.id);
    await writeGuestLines(guestLines);
  }

  await revalidateCartCaches();
  const res = await fetchCartResponse(userId);
  if (!res.ok) return EMPTY_CART;
  return res.json();
}
