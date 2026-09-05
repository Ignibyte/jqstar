export type StarPersistData =
  null | boolean | number | string | StarPersistData[] | { [key: string]: StarPersistData };

export type StarPersistErrorCode =
  | "contract"
  | "unavailable"
  | "read"
  | "write"
  | "quota"
  | "remove"
  | "cleanup"
  | "corrupt"
  | "future-version"
  | "migration"
  | "decode"
  | "encode"
  | "limit"
  | "clock"
  | "deleted"
  | "disposed";

export interface StarPersistRevision {
  readonly counter: number;
  readonly origin: string;
}

export interface StarPersistEnvelope {
  readonly format: "jquery-star-persist/1";
  readonly namespace: string;
  readonly store: string;
  readonly version: number;
  readonly savedAt: number;
  readonly expiresAt: number | null;
  readonly revision: StarPersistRevision;
  readonly codec: { readonly id: string; readonly version: number };
  readonly data: StarPersistData;
}

export interface StarPersistAdapterChange {
  readonly key: string | null;
  readonly value: string | null;
}

export interface StarPersistAdapter {
  readonly kind: "memory" | "local" | "session" | "custom";
  readonly shared: boolean;
  readonly subscribable: boolean;
  readonly window?: Window;
  available(): boolean;
  read(key: string): string | null;
  replace(key: string, value: string): void;
  remove(key: string): void;
  subscribe?(listener: (change: StarPersistAdapterChange) => void): () => void;
  dispose(): void;
}

export interface StarPersistCodec<Store extends object = Record<string, unknown>> {
  readonly id: string;
  readonly version: number;
  encode(store: Readonly<Store>): StarPersistData;
  decode(data: StarPersistData, draft: Store): void;
}

export interface StarPersistField {
  readonly path: string;
  readonly validate: (value: StarPersistData) => boolean;
}

export type StarPersistMigration = (data: StarPersistData) => StarPersistData;

export interface StarPersistOptions<Store extends object = Record<string, unknown>> {
  readonly namespace: string;
  readonly key?: string;
  readonly version: number;
  readonly codec: StarPersistCodec<Store>;
  readonly migrations?: Readonly<Record<number, StarPersistMigration>>;
  readonly adapter?: StarPersistAdapter;
  readonly ownAdapter?: boolean;
  readonly clock?: () => number;
  readonly ttlMs?: number;
  readonly throttleMs?: number;
  readonly maxDelayMs?: number;
  readonly maxBytes?: number;
  readonly strict?: boolean;
  readonly flushOnDispose?: boolean;
}

export interface StarPersistStatus {
  readonly attachment: string;
  readonly adapter: StarPersistAdapter["kind"];
  readonly store: string;
  readonly version: number;
  readonly codecVersion: number;
  readonly revision: StarPersistRevision | null;
  readonly outcome:
    | "ready"
    | "missing"
    | "expired"
    | "hydrated"
    | "pending"
    | "written"
    | "external"
    | "reset"
    | "disabled"
    | "disposed";
  readonly error: StarPersistErrorCode | null;
  readonly bytes: number;
  readonly time: number;
}

export interface StarPersistResult {
  readonly ok: boolean;
  readonly status: StarPersistStatus;
}

export interface StarPersistDisposalReport extends StarPersistResult {
  readonly errors: readonly StarPersistErrorCode[];
}

export interface StarPersistAttachment {
  readonly id: string;
  status(): StarPersistStatus;
  flush(): StarPersistResult;
  retry(): StarPersistResult;
  reset(): StarPersistResult;
  subscribe(listener: (status: StarPersistStatus) => void): () => void;
  dispose(): StarPersistDisposalReport;
}

export interface StarPersistFacade {
  attach<Store extends object>(
    name: string,
    options: StarPersistOptions<Store>,
  ): StarPersistAttachment;
  attachments(): readonly StarPersistAttachment[];
}
