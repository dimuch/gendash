import type { DataSourceSchema } from "@gendash/ai";
import type { Row } from "./types";
import { LiveConnector, fetchJson } from "./live";

/**
 * HR / people & orgs demo: DummyJSON users (free, no key). One row per person.
 * Good for "headcount by department", "average age by city", "people by role".
 * (Synthetic data — no real individuals.)
 */
export class PeopleConnector extends LiveConnector {
  protected readonly tableName = "people";
  protected readonly tableSchema: DataSourceSchema = [
    {
      name: "people",
      columns: [
        { name: "name", type: "string" },
        { name: "gender", type: "string" },
        { name: "age", type: "number" },
        { name: "city", type: "string" },
        { name: "state", type: "string" },
        { name: "department", type: "string" },
        { name: "company", type: "string" },
        { name: "role", type: "string" },
      ],
    },
  ];

  protected async fetchRows(): Promise<Row[]> {
    const data = (await fetchJson(
      "https://dummyjson.com/users?limit=0&select=firstName,lastName,age,gender,company,address",
      "The people demo API"
    )) as { users?: any[] };
    const list = Array.isArray(data?.users) ? data.users : [];
    return list.map((u) => ({
      name: `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim(),
      gender: String(u?.gender ?? "unknown"),
      age: Number(u?.age ?? 0),
      city: String(u?.address?.city ?? "unknown"),
      state: String(u?.address?.state ?? "unknown"),
      department: String(u?.company?.department ?? "unknown"),
      company: String(u?.company?.name ?? "unknown"),
      role: String(u?.company?.title ?? "unknown"),
    }));
  }
}
