import type { DataSourceSchema } from "@gendash/ai";
import type { Row } from "./types";
import { LiveConnector, fetchJson } from "./live";

/**
 * Retail / e-commerce demo: DummyJSON products (free, no key, no rate limit).
 * One row per product. Good for "average price by category", "top 10 products
 * by rating", "total stock by brand".
 */
export class ProductsConnector extends LiveConnector {
  protected readonly tableName = "products";
  protected readonly tableSchema: DataSourceSchema = [
    {
      name: "products",
      columns: [
        { name: "product", type: "string" },
        { name: "category", type: "string" },
        { name: "brand", type: "string" },
        { name: "price", type: "number" },
        { name: "rating", type: "number" },
        { name: "stock", type: "number" },
        { name: "discount", type: "number" },
      ],
    },
  ];

  protected async fetchRows(): Promise<Row[]> {
    const data = (await fetchJson(
      "https://dummyjson.com/products?limit=0&select=title,category,brand,price,rating,stock,discountPercentage",
      "The products demo API"
    )) as { products?: any[] };
    const list = Array.isArray(data?.products) ? data.products : [];
    return list.map((p) => ({
      product: String(p?.title ?? ""),
      category: String(p?.category ?? "other"),
      brand: String(p?.brand ?? "unbranded"),
      price: Number(p?.price ?? 0),
      rating: Number(p?.rating ?? 0),
      stock: Number(p?.stock ?? 0),
      discount: Number(p?.discountPercentage ?? 0),
    }));
  }
}
