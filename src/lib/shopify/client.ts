import type { ShopifyPeriodMetrics } from "@/lib/types";
import { shopifyEnv } from "@/lib/shopify/env";

export type ShopifyOrder = {
  id: number;
  name: string;
  total_price: string;
  currency: string;
  created_at: string;
};

type ShopifyOrdersResponse = {
  orders?: ShopifyOrder[];
};

const SHOPIFY_API_VERSION = "2025-01";
const SHOPIFY_REQUEST_TIMEOUT_MS = 10000;

function buildOrdersUrl(pageInfo?: string) {
  if (!shopifyEnv.storeDomain || !shopifyEnv.adminKey) {
    return null;
  }

  const url = new URL(
    `https://${shopifyEnv.storeDomain}/admin/api/${SHOPIFY_API_VERSION}/orders.json`,
  );

  url.searchParams.set("limit", "250");
  url.searchParams.set("fields", "id,name,total_price,currency,created_at");

  // Only include status and order on first page (when pageInfo is not present)
  if (!pageInfo) {
    url.searchParams.set("status", "any");
    url.searchParams.set("order", "created_at desc");
  } else {
    url.searchParams.set("page_info", pageInfo);
  }

  return url;
}

function getNextPageInfo(linkHeader: string | null) {
  if (!linkHeader) {
    return undefined;
  }

  const nextLink = linkHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.includes('rel="next"'));

  if (!nextLink) {
    return undefined;
  }

  const match = nextLink.match(/<([^>]+)>/);
  if (!match) {
    return undefined;
  }

  try {
    const result = new URL(match[1]).searchParams.get("page_info");
    return result ?? undefined;
  } catch {
    return undefined;
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    SHOPIFY_REQUEST_TIMEOUT_MS,
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function fetchShopifyOrders() {
  const orders: ShopifyOrder[] = [];

  const firstUrl = buildOrdersUrl();
  if (!firstUrl) {
    return null;
  }

  let pageInfo: string | undefined = undefined;
  let pageCount = 0;

  while (pageCount < 20) {
    const url = buildOrdersUrl(pageInfo);
    if (!url) {
      return null;
    }

    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          "X-Shopify-Access-Token": shopifyEnv.adminKey ?? "",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Shopify orders request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ShopifyOrdersResponse;
      orders.push(...(payload.orders ?? []));

      pageInfo = getNextPageInfo(response.headers.get("link"));
      pageCount += 1;

      if (!pageInfo) {
        break;
      }
    } catch (error) {
      throw error;
    }
  }

  return orders;
}

export function calculateMetricsForPeriod(
  orders: ShopifyOrder[],
  startDate: Date,
  endDate: Date,
): ShopifyPeriodMetrics {
  const periodOrders = orders.filter((order) => {
    const orderDate = new Date(order.created_at);
    return orderDate >= startDate && orderDate <= endDate;
  });

  const revenue = periodOrders.reduce((sum, order) => sum + Number(order.total_price), 0);
  const orderCount = periodOrders.length;
  const aov = orderCount > 0 ? revenue / orderCount : 0;

  return {
    revenue,
    orderCount,
    aov,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}