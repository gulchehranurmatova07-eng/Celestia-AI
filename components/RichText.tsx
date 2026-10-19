import { Fragment, type ReactNode } from "react";

// Minimal, safe formatter for assistant replies: paragraphs, "- " bullets,
// **bold**, and auto-linked URLs / emails / @telegram handles. No raw HTML.

const TOKEN = /(\*\*[^*]+\*\*|https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]+|(?<![\w])@[A-Za-z0-9_]{5,32})/g;

function inline(text: string, keyBase: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^https?:\/\//.test(part)) {
      const href = part.replace(/[.,!?]+$/, "");
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-cyan underline underline-offset-2">
          {part}
        </a>
      );
    }
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(part)) {
      const email = part.replace(/[.]+$/, "");
      return (
        <a key={key} href={`mailto:${email}`} className="text-cyan underline underline-offset-2">
          {part}
        </a>
      );
    }
    if (/^@[A-Za-z0-9_]{5,32}$/.test(part)) {
      return (
        <a key={key} href={`https://t.me/${part.slice(1)}`} target="_blank" rel="noopener noreferrer" className="text-cyan underline underline-offset-2">
          {part}
        </a>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

const BULLET = /^\s*([-*•]|\d+[.)])\s+/;

export function RichText({ text }: { text: string }) {
  // Split into paragraphs and lists; consecutive bullet lines form one list.
  const groups: { list: boolean; lines: string[]; ended: boolean }[] = [];
  for (const block of text.replace(/\r/g, "").split(/\n{2,}/)) {
    for (const line of block.split("\n")) {
      if (!line.trim()) continue;
      const list = BULLET.test(line);
      const last = groups[groups.length - 1];
      if (last && last.list === list && !last.ended) last.lines.push(line);
      else groups.push({ list, lines: [line], ended: false });
    }
    const last = groups[groups.length - 1];
    if (last) last.ended = true;
  }

  return (
    <div className="space-y-2.5">
      {groups.map((g, gi) =>
        g.list ? (
          <ul key={gi} className="space-y-1.5">
            {g.lines.map((l, li) => (
              <li key={li} className="flex gap-2">
                <span className="mt-[0.55em] h-1.5 w-1.5 flex-none rounded-full bg-cyan shadow-[0_0_8px_rgb(54_217_255/0.8)]" />
                <span>{inline(l.replace(BULLET, ""), `${gi}-${li}`)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={gi}>
            {g.lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ""), `${gi}-${li}`)}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
