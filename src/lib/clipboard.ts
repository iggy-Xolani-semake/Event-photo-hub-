/**
 * Copy text to the clipboard, with a fallback path.
 *
 * `navigator.clipboard` only exists in a secure context, so on a plain-http
 * staging host — or in a browser where the permission was denied — the modern
 * API throws. Copying an event link is how hosts actually share a gallery, so
 * a silent failure there is a real bug: this falls back to the legacy
 * textarea + execCommand path and reports whether it worked, letting callers
 * show a truthful "Copied" or "Couldn't copy — select the link instead".
 *
 * Returns true when the text is on the clipboard.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (window.isSecureContext && typeof navigator.clipboard?.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or a flaky implementation — try the legacy path.
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";

    const selection = document.getSelection();
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    // Put the user's own selection back exactly as it was.
    if (previousRange && selection) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }

    return copied;
  } catch {
    return false;
  }
}
