import $ from "jquery";
import "jquery-star";
import type { StarContext, StateRecord } from "jquery-star";

interface AccessManagerState extends StateRecord {
  accessManagerCount: number;
  accessManagerError: string | null;
  accessManagerLoading: boolean;
  accessManagerMember: string;
  accessManagerMessage: string;
  accessManagerPermissions: string[];
}

interface TransferListDetail {
  value: string[];
}

const blockSelector = '[data-block="access-manager"]';

function managerRoot(context: StarContext<AccessManagerState>): HTMLElement {
  const root = context.element?.closest(blockSelector) ?? context.root.closest(blockSelector);
  if (!(root instanceof HTMLElement)) {
    throw new Error("Access Manager action must run inside its block root.");
  }
  return root;
}

function eventDetail<T>(context: StarContext<AccessManagerState>): T | undefined {
  const event = context.event as
    (Event & { detail?: T; originalEvent?: CustomEvent<T> }) | undefined;
  return event?.detail ?? event?.originalEvent?.detail;
}

function endpoint(root: HTMLElement): string {
  const value = root.dataset.accessUrl;
  if (!value) throw new Error("Access Manager needs data-access-url.");
  return value;
}

function payload(state: AccessManagerState): Record<string, unknown> {
  return {
    accessManagerMember: state.accessManagerMember,
    accessManagerPermissions: [...state.accessManagerPermissions],
  };
}

async function request(
  context: StarContext<AccessManagerState>,
  method: "get" | "post",
): Promise<void> {
  const root = managerRoot(context);
  await $.star[method]<AccessManagerState>(endpoint(root), {
    error: "accessManagerError",
    pending: "accessManagerLoading",
    payload: payload(context.state),
    requestCancellation: "auto",
    retry: "never",
  })(context);
}

let installed = false;

export function installAccessManager(): void {
  if (installed) return;
  installed = true;

  $.star.action<AccessManagerState>("accessManager.change", (context) => {
    const detail = eventDetail<TransferListDetail>(context);
    if (!detail) return;
    context.state.accessManagerPermissions = [...detail.value];
    context.state.accessManagerCount = detail.value.length;
    context.state.accessManagerMessage = `${detail.value.length} permissions assigned locally. Save to persist them.`;
  });

  $.star.action<AccessManagerState>("accessManager.load", async (context) => {
    await request(context, "get");
  });

  $.star.action<AccessManagerState>("accessManager.save", async (context) => {
    await request(context, "post");
  });

  $.star.action<AccessManagerState>("accessManager.reset", async (context) => {
    await request(context, "get");
  });
}

installAccessManager();
