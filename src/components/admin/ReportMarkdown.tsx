import type { ReactNode } from "react";
import { safeHref, stripFrontMatter } from "@/lib/officeReports";

// ---------------------------------------------------------------------------
// ReportMarkdown — renders an office report's Markdown.
//
// The app has no Markdown library, and minutes use a small, steady set of
// marks: headings, bold, lists, tables, rules. This covers those and nothing
// else. Text reaches the page only as React text nodes, so a report cannot
// inject markup or script whatever it contains.
// ---------------------------------------------------------------------------

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\n]+\*)/g;
const BLOCK_START = /^(?:#{1,6}\s|>\s?|\s*[-*]\s+|\s*\d+\.\s+|\||-{3,}\s*$)/;

function inline(text: string, key: string): ReactNode[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((part, index) => {
      const k = `${key}-${index}`;
      if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
        return <strong key={k} className="font-semibold text-foreground">{inline(part.slice(2, -2), k)}</strong>;
      }
      if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
        return <code key={k} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
      }
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
      if (link) {
        const href = safeHref(link[2]);
        if (!href) return link[1];
        return (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
            {link[1]}
          </a>
        );
      }
      if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
        return <em key={k}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
}

function cells(row: string): string[] {
  return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

const HEADING: Record<number, string> = {
  1: "mt-2 text-xl font-bold tracking-tight",
  2: "mt-8 border-b pb-1 text-lg font-semibold tracking-tight",
  3: "mt-6 text-base font-semibold",
  4: "mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground",
};

export default function ReportMarkdown({ source }: { source: string }) {
  const lines = stripFrontMatter(source).replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^-{3,}\s*$/.test(line)) {
      out.push(<hr key={key} className="my-6 border-border" />);
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      // The page already has its own h1, so a report's "# Title" becomes an h2.
      const level = Math.min(heading[1].length, 4);
      const Tag = `h${level + 1}` as "h2" | "h3" | "h4" | "h5";
      out.push(<Tag key={key} className={HEADING[level]}>{inline(heading[2].trim(), key)}</Tag>);
      i += 1;
      continue;
    }

    if (line.startsWith("|") && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(cells(lines[i]));
        i += 1;
      }
      out.push(
        <div key={key} className="my-4 overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                {head.map((cell, c) => (
                  <th key={c} scope="col" className="border-b px-3 py-2 font-semibold">{inline(cell, `${key}-h${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-b last:border-b-0">
                  {row.map((cell, c) => (
                    <td key={c} className="px-3 py-2 align-top">{inline(cell, `${key}-r${r}c${c}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(
        <blockquote key={key} className="my-4 border-l-2 border-primary/50 pl-4 text-muted-foreground">
          {inline(quote.join(" "), key)}
        </blockquote>
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const marker = bullet.test(line) ? bullet : numbered;
      const items: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        (marker.test(lines[i]) || (items.length > 0 && /^\s{2,}\S/.test(lines[i]) && !BLOCK_START.test(lines[i].trim())))
      ) {
        if (marker.test(lines[i])) items.push(lines[i].replace(marker, ""));
        else items[items.length - 1] += ` ${lines[i].trim()}`;
        i += 1;
      }
      const children = items.map((item, n) => {
        // "- [ ] task" and "- [x] task" are action items; the box is shown as a word.
        const task = /^\[([ xX])\]\s+(.*)$/.exec(item);
        return (
          <li key={n}>
            {task ? (
              <>
                <span className="mr-2 font-mono text-xs text-muted-foreground">{task[1] === " " ? "[open]" : "[done]"}</span>
                {inline(task[2], `${key}-${n}`)}
              </>
            ) : (
              inline(item, `${key}-${n}`)
            )}
          </li>
        );
      });
      out.push(
        marker === bullet ? (
          <ul key={key} className="my-3 list-disc space-y-1.5 pl-6">{children}</ul>
        ) : (
          <ol key={key} className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>
        )
      );
      continue;
    }

    const paragraph: string[] = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    out.push(<p key={key} className="my-3">{inline(paragraph.join(" "), key)}</p>);
  }

  return <div className="break-words text-sm leading-relaxed">{out}</div>;
}
