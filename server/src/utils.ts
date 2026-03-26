import fs from "node:fs";
import path from "node:path";

export function isoNow(): string {
  return new Date().toISOString();
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function readJsonFile(fileName: string): string | null {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

export function writeJsonFile(fileName: string, content: string): void {
  const filePath = path.join(process.cwd(), fileName);
  fs.writeFileSync(filePath, content, "utf8");
}

export function parseJsonBody<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function createIdGenerator(start = 0) {
  let current = start;
  return {
    next() {
      current += 1;
      return current;
    },
    bump(value: number) {
      current = Math.max(current, value);
    },
  };
}
