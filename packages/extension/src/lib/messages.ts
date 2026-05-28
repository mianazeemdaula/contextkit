// Typed message contract between popup ↔ background ↔ content scripts.
// Discriminated union keyed on `type` so each handler narrows exhaustively.

export interface ContextProfileSummary {
  slug: string;
  title: string;
  updatedAt?: string;
}

export interface ContextProfile extends ContextProfileSummary {
  body: string;
}

export type InjectResult = { ok: true } | { ok: false; reason: string };

// popup → background
export type ListContextsRequest = { type: "LIST_CONTEXTS" };
export type GetContextRequest = { type: "GET_CONTEXT"; slug: string };
export type InjectRequest = { type: "INJECT"; slug: string };
export type HealthRequest = { type: "HEALTH" };

export type RuntimeRequest =
  | ListContextsRequest
  | GetContextRequest
  | InjectRequest
  | HealthRequest;

// background → popup
export type ListContextsResponse = {
  type: "LIST_CONTEXTS_RESULT";
  contexts: ContextProfileSummary[];
  source: "native" | "stub";
};
export type GetContextResponse = {
  type: "GET_CONTEXT_RESULT";
  context: ContextProfile | null;
  source: "native" | "stub";
};
export type InjectResponse = {
  type: "INJECT_RESULT";
  result: InjectResult;
};
export type HealthResponse = {
  type: "HEALTH_RESULT";
  nativeHost: "available" | "unavailable";
};

export type RuntimeResponse =
  | ListContextsResponse
  | GetContextResponse
  | InjectResponse
  | HealthResponse;

// background → content script (forwarded via chrome.tabs.sendMessage)
export type ContentInjectRequest = {
  type: "CONTENT_INJECT";
  text: string;
};
export type ContentInjectResponse = {
  type: "CONTENT_INJECT_RESULT";
  result: InjectResult;
};
