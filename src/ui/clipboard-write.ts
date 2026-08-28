export async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const control = document.createElement("textarea");
  control.value = text;
  control.setAttribute("readonly", "");
  control.style.position = "fixed";
  control.style.opacity = "0";
  document.body.append(control);
  control.select();
  const copied = typeof document.execCommand === "function" && document.execCommand("copy");
  control.remove();
  if (!copied) throw new Error("The Clipboard API is unavailable.");
}
