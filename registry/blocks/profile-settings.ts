import $ from "jquery";
import "jquery-star";
import type { StarContext, StateRecord } from "jquery-star";

interface ProfileSettingsState extends StateRecord {
  profileSettingsMessage: string;
  profileSettingsRotating: boolean;
  profileSettingsSaving: boolean;
}

interface ProfileResponse {
  displayName: string;
  email: string;
  environment: string;
  revision: number;
  updatedAt: string;
}

interface InviteResponse {
  inviteUrl: string;
  revision: number;
}

const blockSelector = '[data-block="profile-settings"]';

function profileRoot(context: StarContext<ProfileSettingsState>): HTMLElement {
  const root = context.element?.closest(blockSelector) ?? context.root.closest(blockSelector);
  if (!(root instanceof HTMLElement)) {
    throw new Error("Profile Settings action must run inside its block root.");
  }
  return root;
}

function part<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Profile Settings is missing ${selector}.`);
  }
  return element as T;
}

function endpoint(root: HTMLElement, name: "saveUrl" | "inviteUrl"): string {
  const value = root.dataset[name];
  if (!value) {
    throw new Error(`Profile Settings needs data-${name.replace(/[A-Z]/g, "-$&").toLowerCase()}.`);
  }
  return value;
}

async function responseJSON<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(body.error || `Profile request failed with ${response.status}.`);
  return body;
}

let installed = false;

export function installProfileSettings(): void {
  if (installed) return;
  installed = true;

  $.star.action<ProfileSettingsState>("profileSettings.save", async (context) => {
    const root = profileRoot(context);
    const form = part<HTMLFormElement>(root, '[data-profile-part="form"]');
    context.state.profileSettingsSaving = true;
    try {
      const payload = Object.fromEntries(
        Array.from(new FormData(form), ([name, value]) => [name, String(value)]),
      );
      const response = await fetch(endpoint(root, "saveUrl"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const profile = await responseJSON<ProfileResponse>(response);
      $.star.ui.editable.set(
        part(root, '[data-profile-field="display-name"]'),
        profile.displayName,
      );
      $.star.ui.editable.set(part(root, '[data-profile-field="email"]'), profile.email);
      $(root).find('[data-profile-value="revision"]').text(profile.revision);
      $(root).find('[data-profile-value="environment"]').text(profile.environment);
      $(root)
        .find('[data-profile-value="updated"]')
        .attr("datetime", profile.updatedAt)
        .text(new Date(profile.updatedAt).toLocaleString());
      context.state.profileSettingsMessage = `Profile revision ${profile.revision} saved.`;
    } catch (error) {
      context.state.profileSettingsMessage = error instanceof Error ? error.message : String(error);
    } finally {
      context.state.profileSettingsSaving = false;
    }
  });

  $.star.action<ProfileSettingsState>("profileSettings.rotateInvite", async (context) => {
    const root = profileRoot(context);
    context.state.profileSettingsRotating = true;
    try {
      const response = await fetch(endpoint(root, "inviteUrl"), { method: "POST" });
      const invite = await responseJSON<InviteResponse>(response);
      const control = part<HTMLInputElement>(
        root,
        '[data-profile-part="invite"] [data-part="value"]',
      );
      control.value = invite.inviteUrl;
      control.setAttribute("value", invite.inviteUrl);
      context.state.profileSettingsMessage = `Invite URL revision ${invite.revision} is ready to copy.`;
    } catch (error) {
      context.state.profileSettingsMessage = error instanceof Error ? error.message : String(error);
    } finally {
      context.state.profileSettingsRotating = false;
    }
  });
}

installProfileSettings();
