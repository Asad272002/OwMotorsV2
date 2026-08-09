export const ADMIN_LOGO_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

const forbiddenSvgFragments = [
  "<script",
  "<foreignobject",
  "<iframe",
  "<object",
  "<embed",
  "<link",
  "<style",
  "<!doctype",
  "<!entity",
  "javascript:",
  "data:text/html",
] as const;

function normalizedSvgSource(source: string) {
  return source
    .split(String.fromCharCode(9)).join(" ")
    .split(String.fromCharCode(10)).join(" ")
    .split(String.fromCharCode(13)).join(" ");
}

function hasSvgRoot(source: string) {
  let candidate = source.trimStart();
  if (candidate.startsWith("<?xml")) {
    const declarationEnd = candidate.indexOf(">");
    if (declarationEnd < 0) return false;
    candidate = candidate.slice(declarationEnd + 1).trimStart();
  }
  while (candidate.startsWith("<!--")) {
    const commentEnd = candidate.indexOf("-->");
    if (commentEnd < 0) return false;
    candidate = candidate.slice(commentEnd + 3).trimStart();
  }
  return candidate.startsWith("<svg") && [" ", ">"].includes(candidate[4] ?? "");
}

export async function validateSvgLogo(file: File): Promise<string | null> {
  if (file.type !== "image/svg+xml") return null;

  const source = normalizedSvgSource(await file.text());
  const lowercaseSource = source.toLowerCase();
  if (!hasSvgRoot(lowercaseSource)) return "The SVG logo is not a valid SVG document.";
  if (forbiddenSvgFragments.some((fragment) => lowercaseSource.includes(fragment)) || /on[a-z]+ *=/i.test(source)) {
    return "The SVG logo contains unsupported scripts, embedded content, or external references.";
  }

  const hrefs = source.matchAll(/(?:xlink:)?href *= *(?:"([^"]*)"|'([^']*)')/gi);
  for (const match of hrefs) {
    const href = match[1] ?? match[2] ?? "";
    if (!href.startsWith("#")) return "SVG logo links must reference elements inside the same file.";
  }

  const urls = source.matchAll(/url[(] *["']?([^"')]+)["']? *[)]/gi);
  for (const match of urls) {
    if (!(match[1] ?? "").startsWith("#")) {
      return "SVG logo resources must reference elements inside the same file.";
    }
  }

  return null;
}
