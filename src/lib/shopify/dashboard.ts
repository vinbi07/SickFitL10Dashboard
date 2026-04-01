import type { ShopifyFinancialSummary, ShopifyMetricWithPeriod } from "@/lib/types";
import { shopifyEnv } from "@/lib/shopify/env";
import { fetchShopifyOrders, calculateMetricsForPeriod, type ShopifyOrder } from "@/lib/shopify/client";

// Shared cache for orders to avoid fetching multiple times
let cachedOrders: ShopifyOrder[] | null = null;
let ordersTimestamp = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedOrders(): Promise<ShopifyOrder[] | null> {
  if (!shopifyEnv.storeDomain || !shopifyEnv.adminKey) {
    return null;
  }

  if (cachedOrders && Date.now() - ordersTimestamp < CACHE_DURATION_MS) {
    return cachedOrders;
  }

  try {
    const orders = await fetchShopifyOrders();
    if (orders) {
      cachedOrders = orders;
      ordersTimestamp = Date.now();
    }
    return orders;
  } catch {
    return null;
  }
}

export async function getShopifyFinancialSummary(): Promise<ShopifyFinancialSummary | null> {
  if (!shopifyEnv.storeDomain || !shopifyEnv.adminKey) {
    return null;
  }

  try {
    const orders = await getCachedOrders();

    if (!orders) {
      return null;
    }

    const parsedOrders = orders
      .map((order) => ({
        id: order.id,
        name: order.name,
        totalPrice: Number(order.total_price),
        currencyCode: order.currency,
        createdAt: order.created_at,
      }))
      .filter((order) => Number.isFinite(order.totalPrice));

    const orderCount = parsedOrders.length;
    const revenue = parsedOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const aov = orderCount > 0 ? revenue / orderCount : 0;
    const currencyCode = parsedOrders[0]?.currencyCode ?? "USD";

    return {
      storeDomain: shopifyEnv.storeDomain,
      orderCount,
      revenue,
      aov,
      currencyCode,
      fetchedAt: new Date().toISOString(),
      recentOrders: parsedOrders.slice(0, 6),
    };
  } catch (error) {
    return null;
  }
}

export async function getShopifyPeriodMetrics(): Promise<{
  sevenDay: ShopifyMetricWithPeriod[];
  thirtyDay: ShopifyMetricWithPeriod[];
} | null> {
  if (!shopifyEnv.storeDomain || !shopifyEnv.adminKey) {
    return null;
  }

  try {
    const orders = await getCachedOrders();

    if (!orders) {
      return null;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 7-day periods
    const current7DayStart = new Date(today);
    current7DayStart.setDate(current7DayStart.getDate() - 6);
    const current7DayEnd = new Date(today);
    current7DayEnd.setHours(23, 59, 59, 999);

    const previous7DayEnd = new Date(current7DayStart);
    previous7DayEnd.setDate(previous7DayEnd.getDate() - 1);
    const previous7DayStart = new Date(previous7DayEnd);
    previous7DayStart.setDate(previous7DayStart.getDate() - 6);

    // 30-day periods
    const current30DayStart = new Date(today);
    current30DayStart.setDate(current30DayStart.getDate() - 29);
    const current30DayEnd = new Date(today);
    current30DayEnd.setHours(23, 59, 59, 999);

    const previous30DayEnd = new Date(current30DayStart);
    previous30DayEnd.setDate(previous30DayEnd.getDate() - 1);
    const previous30DayStart = new Date(previous30DayEnd);
    previous30DayStart.setDate(previous30DayStart.getDate() - 29);

    // Calculate metrics
    const current7Day = calculateMetricsForPeriod(orders, current7DayStart, current7DayEnd);
    const previous7Day = calculateMetricsForPeriod(orders, previous7DayStart, previous7DayEnd);

    const current30Day = calculateMetricsForPeriod(orders, current30DayStart, current30DayEnd);
    const previous30Day = calculateMetricsForPeriod(orders, previous30DayStart, previous30DayEnd);

    // Calculate percent changes
    const calc7DayPercent = (metricName: "revenue" | "orderCount" | "aov") => {
      const currentVal = metricName === "revenue" ? current7Day.revenue : metricName === "orderCount" ? current7Day.orderCount : current7Day.aov;
      const previousVal = metricName === "revenue" ? previous7Day.revenue : metricName === "orderCount" ? previous7Day.orderCount : previous7Day.aov;
      if (previousVal === 0) return 0;
      return ((currentVal - previousVal) / previousVal) * 100;
    };

    const calc30DayPercent = (metricName: "revenue" | "orderCount" | "aov") => {
      const currentVal = metricName === "revenue" ? current30Day.revenue : metricName === "orderCount" ? current30Day.orderCount : current30Day.aov;
      const previousVal = metricName === "revenue" ? previous30Day.revenue : metricName === "orderCount" ? previous30Day.orderCount : previous30Day.aov;
      if (previousVal === 0) return 0;
      return ((currentVal - previousVal) / previousVal) * 100;
    };

    const sevenDay: ShopifyMetricWithPeriod[] = [
      {
        metricName: "revenue",
        current: current7Day,
        previous: previous7Day,
        percentChange: calc7DayPercent("revenue"),
      },
      {
        metricName: "orders",
        current: current7Day,
        previous: previous7Day,
        percentChange: calc7DayPercent("orderCount"),
      },
      {
        metricName: "aov",
        current: current7Day,
        previous: previous7Day,
        percentChange: calc7DayPercent("aov"),
      },
    ];

    const thirtyDay: ShopifyMetricWithPeriod[] = [
      {
        metricName: "revenue",
        current: current30Day,
        previous: previous30Day,
        percentChange: calc30DayPercent("revenue"),
      },
      {
        metricName: "orders",
        current: current30Day,
        previous: previous30Day,
        percentChange: calc30DayPercent("orderCount"),
      },
      {
        metricName: "aov",
        current: current30Day,
        previous: previous30Day,
        percentChange: calc30DayPercent("aov"),
      },
    ];

    return { sevenDay, thirtyDay };
  } catch (error) {
    return null;
  }
}