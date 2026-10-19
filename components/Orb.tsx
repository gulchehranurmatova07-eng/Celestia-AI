import type { CSSProperties } from "react";

export type OrbState = "idle" | "thinking" | "responded";

const PARTICLE_ANGLES = [18, 96, 152, 214, 288, 330];

function Ring() {
  return (
    <div className="orb-ring-tilt">
      <div className="orb-ring">
        {PARTICLE_ANGLES.map((a) => (
          <span key={a} className="orb-particle" style={{ "--a": `${a}deg` } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}

/**
 * The Celestia signature orb: a glossy black sphere with an electric-blue
 * outline, a friendly light face, and an orbital ring with particles.
 * Purely decorative — wrap it in a button when it should be interactive.
 */
export function Orb({
  size = 140,
  state = "idle",
  showStar = true,
  className = "",
}: {
  /** Pixel size, or any CSS length such as "clamp(110px, 30vw, 160px)". */
  size?: number | string;
  state?: OrbState;
  showStar?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-state={state}
      className={`orb ${className}`}
      style={{ "--orb-size": typeof size === "number" ? `${size}px` : size } as CSSProperties}
    >
      <div className="orb-float">
        <div className="orb-glow" />
        <div className="orb-ring-layer back">
          <Ring />
        </div>
        <div className="orb-sphere">
          <div className="orb-face">
            <svg viewBox="0 0 100 100" width="62%" height="62%" fill="none">
              <path className="eye" d="M24 46 Q32 36 40 46" stroke="#5fe3ff" strokeWidth="5.5" strokeLinecap="round" />
              <path className="eye" d="M60 46 Q68 36 76 46" stroke="#5fe3ff" strokeWidth="5.5" strokeLinecap="round" />
              <path d="M38 62 Q50 72 62 62" stroke="#3aa0ff" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className="orb-ring-layer front">
          <Ring />
        </div>
        {showStar && (
          <svg className="orb-star" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c.6 5.9 3.1 9.4 12 12-8.9 2.6-11.4 6.1-12 12-.6-5.9-3.1-9.4-12-12C8.9 9.4 11.4 5.9 12 0Z" />
          </svg>
        )}
      </div>
    </div>
  );
}
