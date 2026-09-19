/**
 * Description of a connected data source that the AI is allowed to see.
 * The AI sees table + column NAMES and TYPES only — never the rows.
 */

export type ColumnType = "string" | "number" | "date" | "boolean";

export interface ColumnSchema {
  name: string;
  type: ColumnType;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

export type DataSourceSchema = TableSchema[];

export function findTable(schema: DataSourceSchema, name: string) {
  return schema.find((t) => t.name === name);
}

export function findColumn(table: TableSchema, name: string) {
  return table.columns.find((c) => c.name === name);
}
