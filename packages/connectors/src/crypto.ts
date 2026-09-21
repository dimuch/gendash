import type { DataSourceSchema } from "@gendash/ai";
import type { Row } from "./types";
import { LiveConnector, fetchJson } from "./live";

/**
 * Finance demo: CoinGecko markets (no key, but rate-limited — the base class
 * won't cache a failed load, so a 429 just retries next time). One row per coin.
 * Good for "top 10 coins by market cap", "biggest 24h gainers", "volume by coin".
 */
export class CryptoConnector extends LiveConnector {
  protected readonly tableName = "coins";
  // Prices move — re-fetch at most every 30s so "Live" shows fresh numbers.
  protected readonly ttlMs = 30_000;
  protected readonly tableSchema: DataSourceSchema = [
    {
      name: "coins",
      columns: [
        { name: "coin", type: "string" },
        { name: "symbol", type: "string" },
        { name: "price", type: "number" },
        { name: "market_cap", type: "number" },
        { name: "volume", type: "number" },
        { name: "change_24h", type: "number" },
        { name: "rank", type: "number" },
      ],
    },
  ];

  protected async fetchRows(): Promise<Row[]> {
    const data = (await fetchJson(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1",
      "The crypto demo API (CoinGecko)"
    )) as any[];
    const list = Array.isArray(data) ? data : [];
    return list.map((c) => ({
      coin: String(c?.name ?? ""),
      symbol: String(c?.symbol ?? "").toUpperCase(),
      price: Number(c?.current_price ?? 0),
      market_cap: Number(c?.market_cap ?? 0),
      volume: Number(c?.total_volume ?? 0),
      change_24h: Number(c?.price_change_percentage_24h ?? 0),
      rank: Number(c?.market_cap_rank ?? 0),
    }));
  }
}
