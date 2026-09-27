export async function writeClipboard(
  owner: Window,
  text: string,
  current: () => boolean,
): Promise<boolean> {
  if (!current()) return false;
  const navigator: { clipboard?: Partial<Pick<Clipboard, "writeText">> } = owner.navigator;
  const clipboard = navigator.clipboard;
  if (!current()) return false;
  const write = clipboard?.writeText?.bind(clipboard);
  if (!current()) return false;
  if (write) {
    await write(text);
    return true;
  }
  const document = owner.document;
  const control = document.createElement("textarea");
  control.value = text;
  control.setAttribute("readonly", "");
  control.style.position = "fixed";
  control.style.opacity = "0";
  try {
    if (!current()) return false;
    document.body.append(control);
    if (!current()) return false;
    control.select();
    if (!current()) return false;
    const legacy: { execCommand?: Document["execCommand"] } = document;
    const execute = legacy.execCommand?.bind(document);
    if (!current()) return false;
    const copied = execute?.("copy");
    if (!copied) throw new Error("The Clipboard API is unavailable.");
    return true;
  } finally {
    control.remove();
  }
}
