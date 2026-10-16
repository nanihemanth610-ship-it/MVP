/**
 * BillBridge Storage Adapter Layer
 * Pluggable repository interface supporting LocalStorage (client-first demo/offline)
 * and Supabase Postgres backend (when environment credentials are provided).
 */

import type { ClaimRecord } from "@/types/claim";
import { INITIAL_MOCK_CLAIMS } from "@/data/mock-claims";

export interface IClaimStorage {
  readonly mode: "local" | "supabase";
  getClaims(): Promise<ClaimRecord[]>;
  getClaimById(id: string): Promise<ClaimRecord | null>;
  saveClaim(claim: ClaimRecord): Promise<ClaimRecord>;
  updateClaim(id: string, patch: Partial<ClaimRecord>): Promise<ClaimRecord>;
  deleteClaim(id: string): Promise<void>;
  resetToMockData(): Promise<ClaimRecord[]>;
}

const STORAGE_KEY = "billbridge_claims_records_v1";

/**
 * LocalStorage implementation with seamless in-memory fallback.
 * Automatically seeds with rich synthetic demo claims on initial launch.
 */
export class LocalStorageClaimStorage implements IClaimStorage {
  readonly mode = "local" as const;
  private memoryCache: ClaimRecord[] | null = null;

  private isStorageAvailable(): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      const testKey = "__billbridge_test__";
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private readStorage(): ClaimRecord[] {
    if (!this.isStorageAvailable()) {
      if (!this.memoryCache) {
        this.memoryCache = [...INITIAL_MOCK_CLAIMS];
      }
      return this.memoryCache;
    }

    try {
      const serialized = window.localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        // Initialize with default mock claims
        this.writeStorage(INITIAL_MOCK_CLAIMS);
        return [...INITIAL_MOCK_CLAIMS];
      }
      const parsed = JSON.parse(serialized) as ClaimRecord[];
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : [...INITIAL_MOCK_CLAIMS];
    } catch (err) {
      console.warn(
        "BillBridge: Failed reading LocalStorage, reverting to mock seed",
        err,
      );
      return [...INITIAL_MOCK_CLAIMS];
    }
  }

  private writeStorage(claims: ClaimRecord[]): void {
    this.memoryCache = claims;
    if (this.isStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
      } catch (err) {
        console.warn(
          "BillBridge: Failed writing to LocalStorage, saved to memory cache",
          err,
        );
      }
    }
  }

  async getClaims(): Promise<ClaimRecord[]> {
    return this.readStorage();
  }

  async getClaimById(id: string): Promise<ClaimRecord | null> {
    const claims = this.readStorage();
    const found = claims.find((c) => c.id === id || c.claimNumber === id);
    return found ? { ...found } : null;
  }

  async saveClaim(claim: ClaimRecord): Promise<ClaimRecord> {
    const claims = this.readStorage();
    const existingIndex = claims.findIndex((c) => c.id === claim.id);

    let updated: ClaimRecord[];
    if (existingIndex >= 0) {
      updated = [...claims];
      updated[existingIndex] = {
        ...claim,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = [
        {
          ...claim,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...claims,
      ];
    }

    this.writeStorage(updated);
    return claim;
  }

  async updateClaim(
    id: string,
    patch: Partial<ClaimRecord>,
  ): Promise<ClaimRecord> {
    const claims = this.readStorage();
    const existingIndex = claims.findIndex((c) => c.id === id);

    if (existingIndex < 0) {
      throw new Error(`BillBridge: Claim with ID "${id}" not found.`);
    }

    const current = claims[existingIndex]!;
    const updatedRecord: ClaimRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    claims[existingIndex] = updatedRecord;
    this.writeStorage([...claims]);
    return updatedRecord;
  }

  async deleteClaim(id: string): Promise<void> {
    const claims = this.readStorage();
    const filtered = claims.filter((c) => c.id !== id);
    this.writeStorage(filtered);
  }

  async resetToMockData(): Promise<ClaimRecord[]> {
    this.writeStorage([...INITIAL_MOCK_CLAIMS]);
    return [...INITIAL_MOCK_CLAIMS];
  }
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  mapDbClaimToRecord,
  mapClaimToN8nPayload,
  mapN8nPayloadToDbClaim,
  type DbClaimRow,
  type DbClaimEventRow,
  type DbClaimInsert,
} from "./data-mapper";

/**
 * Supabase storage boundary.
 * Connects directly to PostgreSQL tables public.claims and public.claim_events
 * via typed Supabase client with seamless local cache synchronization.
 */
export class SupabaseClaimStorage implements IClaimStorage {
  readonly mode = "supabase" as const;
  private supabaseUrl: string;
  private anonKey: string;
  private client: SupabaseClient<Database>;
  private fallbackLocal = new LocalStorageClaimStorage();

  constructor(supabaseUrl: string, anonKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.anonKey = anonKey;
    this.client = createClient<Database>(supabaseUrl, anonKey);
  }

  getEndpointInfo(): { url: string; hasKey: boolean } {
    return {
      url: this.supabaseUrl,
      hasKey: Boolean(this.anonKey && this.anonKey.length > 0),
    };
  }

  async getClaims(): Promise<ClaimRecord[]> {
    try {
      const { data, error } = await (this.client.from("claims") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn(
          "BillBridge [Supabase]: Error fetching claims, falling back to local store:",
          error.message,
        );
        return this.fallbackLocal.getClaims();
      }

      if (data && (data as DbClaimRow[]).length > 0) {
        return (data as DbClaimRow[]).map((row) => mapDbClaimToRecord(row));
      }

      // If database is empty, seed initial demo claims locally
      return this.fallbackLocal.getClaims();
    } catch (err) {
      console.warn(
        "BillBridge [Supabase]: Network error connecting to Supabase:",
        err,
      );
      return this.fallbackLocal.getClaims();
    }
  }

  async getClaimById(id: string): Promise<ClaimRecord | null> {
    try {
      const { data: claimRow, error } = await (
        this.client.from("claims") as any
      )
        .select("*")
        .or(`id.eq.${id},claim_ref.eq.${id},claim_number.eq.${id}`)
        .maybeSingle();

      const typedRow = claimRow as DbClaimRow | null;
      if (error || !typedRow) {
        return this.fallbackLocal.getClaimById(id);
      }

      // Retrieve events for this claim
      const { data: eventRows } = await (
        this.client.from("claim_events") as any
      )
        .select("*")
        .or(`claim_id.eq.${typedRow.id},claim_ref.eq.${typedRow.claim_ref}`)
        .order("timestamp", { ascending: false });

      const typedEvents = (eventRows as DbClaimEventRow[] | null) || [];
      return mapDbClaimToRecord(typedRow, typedEvents);
    } catch {
      return this.fallbackLocal.getClaimById(id);
    }
  }

  async saveClaim(claim: ClaimRecord): Promise<ClaimRecord> {
    // Always sync local fallback so components have immediate access
    await this.fallbackLocal.saveClaim(claim);

    try {
      const n8nPayload = mapClaimToN8nPayload(
        claim,
        true,
        claim.idempotencyKey,
      );
      const dbInsert = mapN8nPayloadToDbClaim(
        n8nPayload,
        "demo-user-synthetic",
      );

      const upsertRow: DbClaimInsert = {
        ...dbInsert,
        id: claim.id.startsWith("claim-") ? undefined : claim.id,
      };

      const { data, error } = await (this.client.from("claims") as any)
        .upsert(upsertRow, { onConflict: "claim_ref" })
        .select()
        .maybeSingle();

      if (error) {
        console.warn(
          "BillBridge [Supabase]: Failed to save claim row in database:",
          error.message,
        );
      } else if (data) {
        return mapDbClaimToRecord(data as DbClaimRow);
      }
    } catch (err) {
      console.warn(
        "BillBridge [Supabase]: Network exception during saveClaim:",
        err,
      );
    }

    return claim;
  }

  async updateClaim(
    id: string,
    patch: Partial<ClaimRecord>,
  ): Promise<ClaimRecord> {
    const updated = await this.fallbackLocal.updateClaim(id, patch);

    try {
      const updatePayload: Database["public"]["Tables"]["claims"]["Update"] =
        {};
      if (patch.status) updatePayload.status = patch.status;
      if (patch.reviewerNotes)
        updatePayload.reviewer_notes = patch.reviewerNotes;
      if (patch.assignedReviewer)
        updatePayload.assigned_reviewer_id = patch.assignedReviewer;

      await (this.client.from("claims") as any)
        .update(updatePayload)
        .or(`id.eq.${id},claim_ref.eq.${id},claim_number.eq.${id}`);
    } catch (err) {
      console.warn(
        "BillBridge [Supabase]: Failed to update remote claim:",
        err,
      );
    }

    return updated;
  }

  async deleteClaim(id: string): Promise<void> {
    await this.fallbackLocal.deleteClaim(id);
    try {
      await (this.client.from("claims") as any)
        .delete()
        .or(`id.eq.${id},claim_ref.eq.${id},claim_number.eq.${id}`);
    } catch (err) {
      console.warn("BillBridge [Supabase]: Remote deletion skipped:", err);
    }
  }

  async resetToMockData(): Promise<ClaimRecord[]> {
    return this.fallbackLocal.resetToMockData();
  }
}

let activeStorage: IClaimStorage | null = null;

export function getClaimStorage(): IClaimStorage {
  if (activeStorage) return activeStorage;

  const url = import.meta.env?.VITE_SUPABASE_URL;
  const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;

  if (
    url &&
    key &&
    !url.includes("YOUR_PROJECT") &&
    !key.includes("your-anon-key")
  ) {
    activeStorage = new SupabaseClaimStorage(url, key);
  } else {
    activeStorage = new LocalStorageClaimStorage();
  }

  return activeStorage;
}
