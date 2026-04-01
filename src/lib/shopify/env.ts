import { z } from "zod";

const shopifyEnvSchema = z.object({
  SHOPIFY_STORE_DOMAIN: z.string().trim().optional(),
  SHOPIFY_ADMIN_KEY: z.string().trim().optional(),
});

const parsedShopifyEnv = shopifyEnvSchema.parse({
  SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN?.trim().replace(/^["']|["']$/g, ""),
  SHOPIFY_ADMIN_KEY: process.env.SHOPIFY_ADMIN_KEY?.trim().replace(/^["']|["']$/g, ""),
});

export const shopifyEnv = {
  storeDomain: parsedShopifyEnv.SHOPIFY_STORE_DOMAIN || null,
  adminKey: parsedShopifyEnv.SHOPIFY_ADMIN_KEY || null,
};