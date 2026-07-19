import type { StorageAdapter } from "grammy";
import { resolveSessionStorage } from "./toolkit/session/redis.js";

const FREE_DAILY_QUOTA = 3;

const adapter: StorageAdapter<Record<string, unknown>> =
  resolveSessionStorage<Record<string, unknown>>(undefined);

function k(kind: string, id: string): string {
  return `iconic:${kind}:${id}`;
}

export interface UserData {
  id: number;
  generationsToday: number;
  lastGenerationDate: string;
  subscription: "free" | "pro";
}

export interface VariationData {
  id: string;
  caption: string;
  iconLines: string[];
  feedback?: "up" | "down";
}

export interface GenerationData {
  id: string;
  userId: number;
  prompt: string;
  timestamp: number;
  variations: VariationData[];
}

export async function getUser(userId: number): Promise<UserData> {
  const raw = await adapter.read(k("user", String(userId)));
  if (raw) return raw as unknown as UserData;
  return {
    id: userId,
    generationsToday: 0,
    lastGenerationDate: "",
    subscription: "free",
  };
}

export async function saveUser(user: UserData): Promise<void> {
  await adapter.write(k("user", String(user.id)), user as unknown as Record<string, unknown>);
}

export async function canGenerate(userId: number, now: () => Date = () => new Date()): Promise<boolean> {
  const user = await getUser(userId);
  if (user.subscription === "pro") return true;
  const today = now().toISOString().slice(0, 10);
  if (user.lastGenerationDate !== today) return true;
  return user.generationsToday < FREE_DAILY_QUOTA;
}

export async function recordGeneration(userId: number, gen: GenerationData): Promise<void> {
  await adapter.write(k("gen", gen.id), gen as unknown as Record<string, unknown>);

  const indexKey = k("usergens", String(userId));
  const raw = await adapter.read(indexKey);
  const ids: string[] = raw ? (raw as unknown as { ids: string[] }).ids : [];
  ids.unshift(gen.id);
  await adapter.write(indexKey, { ids } as unknown as Record<string, unknown>);

  const user = await getUser(userId);
  const today = gen.timestamp ? new Date(gen.timestamp).toISOString().slice(0, 10) : "";
  if (user.lastGenerationDate !== today) {
    user.generationsToday = 1;
    user.lastGenerationDate = today;
  } else {
    user.generationsToday += 1;
  }
  await saveUser(user);
}

export async function getUserGenerations(userId: number): Promise<GenerationData[]> {
  const indexKey = k("usergens", String(userId));
  const raw = await adapter.read(indexKey);
  const ids: string[] = raw ? (raw as unknown as { ids: string[] }).ids : [];
  const gens: GenerationData[] = [];
  for (const id of ids) {
    const gRaw = await adapter.read(k("gen", id));
    if (gRaw) gens.push(gRaw as unknown as GenerationData);
  }
  return gens;
}

export async function getGeneration(genId: string): Promise<GenerationData | undefined> {
  const raw = await adapter.read(k("gen", genId));
  return raw ? (raw as unknown as GenerationData) : undefined;
}

export async function saveGeneration(gen: GenerationData): Promise<void> {
  await adapter.write(k("gen", gen.id), gen as unknown as Record<string, unknown>);
}

export async function recordFeedback(
  userId: number,
  genId: string,
  variationIndex: number,
  rating: "up" | "down",
): Promise<void> {
  const gen = await getGeneration(genId);
  if (!gen) return;
  if (gen.variations[variationIndex]) {
    gen.variations[variationIndex].feedback = rating;
    await saveGeneration(gen);
  }
}

export async function deleteGeneration(userId: number, genId: string): Promise<void> {
  const indexKey = k("usergens", String(userId));
  const raw = await adapter.read(indexKey);
  const ids: string[] = raw ? (raw as unknown as { ids: string[] }).ids : [];
  const filtered = ids.filter((id) => id !== genId);
  await adapter.write(indexKey, { ids: filtered } as unknown as Record<string, unknown>);
  await adapter.delete(k("gen", genId));
}
