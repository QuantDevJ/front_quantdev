export type PlaidOnSuccessMetadata = {
  institution?: { institution_id?: string; name?: string };
};

const PLAID_SCRIPT_SRC =
  "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

type PlaidLinkHandler = { open: () => void };

type PlaidCreateConfig = {
  token: string;
  onSuccess: (publicToken: string, metadata: PlaidOnSuccessMetadata) => void;
  onExit?: (error: unknown, metadata: unknown) => void;
};

declare global {
  interface Window {
    Plaid?: {
      create: (config: PlaidCreateConfig) => PlaidLinkHandler;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadPlaidLinkScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Plaid Link must run in the browser"));
  }
  if (window.Plaid) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${PLAID_SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Plaid Link")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = PLAID_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Plaid Link"));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export async function openPlaidLink(options: {
  linkToken: string;
  onSuccess: (publicToken: string, metadata: PlaidOnSuccessMetadata) => void;
  onExit?: (error: unknown, metadata: unknown) => void;
}): Promise<void> {
  await loadPlaidLinkScript();
  if (!window.Plaid?.create) {
    throw new Error("Plaid Link script did not initialize");
  }
  const handler = window.Plaid.create({
    token: options.linkToken,
    onSuccess: options.onSuccess,
    onExit: options.onExit,
  });
  handler.open();
}
