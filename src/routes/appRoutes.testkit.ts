import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Extracts the route patterns App.tsx actually mounts, by reading App.tsx.
//
// This exists because a redirect test that mounts its own `*` catch-all proves
// only that the redirect FIRES — it cannot tell a live target from a dead one.
// `/admin/messages -> /admin/clients?tab=messages` and
// `/admin/messages -> /admin/klients?tab=messages` both "pass" against a
// catch-all. The stored-notification links these redirects exist to keep alive
// would then land on NotFound, silently.
//
// Reading the source is deliberate. The alternative — importing App — drags in
// AuthProvider, the Supabase client, the Google Maps loader and 30 lazy chunks,
// none of which the assertion needs. Parsing gives the same answer for the same
// reason the browser does: these are the `<Route path=...>` elements in the
// file. `assertExtractorSane()` guards against a parser bug quietly returning
// nothing (which would make every assertion vacuously true).
// ---------------------------------------------------------------------------

// Resolved from the vitest root (the repo root) rather than `import.meta.url`,
// which Vite rewrites to a non-file URL during transform.
const APP_TSX = resolve(process.cwd(), "src/App.tsx");

const PATH_ATTR = /(?:^|\s)path\s*=\s*"([^"]*)"/;
const INDEX_ATTR = /(?:^|\s)index(?:\s|$|=)/;

interface RouteTag {
  /** Raw `path` attribute, or null for an index route. */
  path: string | null;
  index: boolean;
  selfClosing: boolean;
}

/**
 * Scans forward from `<Route` to the end of that opening tag, brace- and
 * quote-aware so `element={<Dashboard />}` does not read as a self-close.
 */
function readRouteTag(src: string, start: number): { tag: RouteTag; end: number } | null {
  let i = start + "<Route".length;
  let depth = 0;
  let quote: string | null = null;
  const chars: string[] = [];

  while (i < src.length) {
    const c = src[i];

    if (quote) {
      if (c === quote) quote = null;
      chars.push(c);
      i += 1;
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      chars.push(c);
      i += 1;
      continue;
    }

    if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (c === ">" && depth === 0) {
      const trimmed = chars.join("").trimEnd();
      const selfClosing = trimmed.endsWith("/");
      // Only attribute-level text: depth 0 guarantees we are not inside an
      // `element={...}` expression.
      const attrs = selfClosing ? trimmed.slice(0, -1) : trimmed;
      const pathMatch = attrs.match(PATH_ATTR);
      return {
        tag: {
          path: pathMatch ? pathMatch[1] : null,
          index: INDEX_ATTR.test(attrs),
          selfClosing,
        },
        end: i + 1,
      };
    }

    chars.push(c);
    i += 1;
  }
  return null;
}

/** React Router path joining: a leading "/" makes the child absolute. */
function joinPath(parent: string, child: string): string {
  if (child.startsWith("/")) return child;
  if (!child) return parent;
  return `${parent.replace(/\/$/, "")}/${child}`;
}

/**
 * Every full route pattern App.tsx mounts, EXCLUDING the `*` catch-all (which
 * would match anything and defeat the point).
 */
export function mountedRoutePatterns(source = readFileSync(APP_TSX, "utf8")): string[] {
  const patterns: string[] = [];
  const stack: string[] = [];
  let i = 0;

  while (i < source.length) {
    const openIdx = source.indexOf("<Route", i);
    const closeIdx = source.indexOf("</Route>", i);

    if (openIdx === -1 && closeIdx === -1) break;

    if (closeIdx !== -1 && (openIdx === -1 || closeIdx < openIdx)) {
      stack.pop();
      i = closeIdx + "</Route>".length;
      continue;
    }

    const read = readRouteTag(source, openIdx);
    if (!read) break;
    const { tag, end } = read;
    const parent = stack.length ? stack[stack.length - 1] : "";
    const full = tag.index || tag.path === null ? parent : joinPath(parent, tag.path);

    if (tag.selfClosing) {
      patterns.push(full || "/");
    } else {
      // Layout routes are recorded when their index child pushes the same
      // pattern, so only leaves need collecting here.
      stack.push(full || "/");
    }
    i = end;
  }

  return patterns.filter((p) => p !== "*" && !p.endsWith("/*"));
}

/**
 * Fails loudly if the extractor stopped working. Without this, a regex typo
 * turns every "target is mounted" assertion into a no-op.
 */
export function assertExtractorSane(patterns: string[]): void {
  const required = [
    "/admin",
    "/admin/missions",
    "/admin/missions/:id/delivery",
    "/admin/settings/templates",
    "/pilot",
  ];
  const missing = required.filter((p) => !patterns.includes(p));
  if (missing.length) {
    throw new Error(
      `App.tsx route extraction looks broken — missing ${missing.join(", ")}. ` +
        `Got ${patterns.length} patterns: ${patterns.join(", ")}`
    );
  }
  if (patterns.includes("*")) {
    throw new Error("The catch-all must be excluded or every target matches.");
  }
}
