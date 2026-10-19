import type { LangCode } from "@/lib/i18n";

// Inline SVG flags render consistently on every OS (emoji flags don't on Windows).
export function Flag({ lang, size = 20 }: { lang: LangCode; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    "aria-hidden": true,
    className: "flex-none rounded-full ring-1 ring-white/15",
  } as const;
  const clip = `flag-clip-${lang}`;

  return (
    <svg {...common}>
      <defs>
        <clipPath id={clip}>
          <circle cx="16" cy="16" r="16" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {lang === "en" && (
          <>
            <rect width="32" height="32" fill="#012169" />
            <path d="M0 0 32 32M32 0 0 32" stroke="#fff" strokeWidth="6" />
            <path d="M0 0 32 32M32 0 0 32" stroke="#C8102E" strokeWidth="2.2" />
            <path d="M16 0v32M0 16h32" stroke="#fff" strokeWidth="9" />
            <path d="M16 0v32M0 16h32" stroke="#C8102E" strokeWidth="5" />
          </>
        )}
        {lang === "ru" && (
          <>
            <rect width="32" height="11" fill="#fff" />
            <rect y="10.6" width="32" height="11" fill="#0039A6" />
            <rect y="21.3" width="32" height="11" fill="#D52B1E" />
          </>
        )}
        {lang === "zh" && (
          <>
            <rect width="32" height="32" fill="#EE1C25" />
            <path
              d="m10 6 1.6 4.8h5l-4 3 1.5 4.8-4.1-3-4.1 3 1.5-4.8-4-3h5L10 6Z"
              fill="#FFDE00"
            />
            <circle cx="18.5" cy="6.5" r="1.1" fill="#FFDE00" />
            <circle cx="21" cy="10" r="1.1" fill="#FFDE00" />
            <circle cx="21" cy="14.5" r="1.1" fill="#FFDE00" />
            <circle cx="18.5" cy="18" r="1.1" fill="#FFDE00" />
          </>
        )}
        {lang === "uz" && (
          <>
            <rect width="32" height="11" fill="#0099B5" />
            <rect y="10.4" width="32" height="1.2" fill="#CE1126" />
            <rect y="11.6" width="32" height="8.8" fill="#fff" />
            <rect y="20.4" width="32" height="1.2" fill="#CE1126" />
            <rect y="21.6" width="32" height="10.4" fill="#1EB53A" />
            <circle cx="8" cy="5.6" r="3" fill="#fff" />
            <circle cx="9.2" cy="5.6" r="2.6" fill="#0099B5" />
          </>
        )}
        {lang === "tr" && (
          <>
            <rect width="32" height="32" fill="#E30A17" />
            <circle cx="13" cy="16" r="7" fill="#fff" />
            <circle cx="14.8" cy="16" r="5.6" fill="#E30A17" />
            <path d="m19.2 16 4.9-1.6-3 4.2v-5.2l3 4.2-4.9-1.6Z" fill="#fff" />
          </>
        )}
      </g>
    </svg>
  );
}
