import { ImageResponse } from "next/og";

export const alt = "Ledger — crypto market and portfolio tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Static per the docs' own guidance: statically optimized (built once, cached)
 * since it reads no request data — this card never needs to change per visit.
 *
 * Colors are the dark-mode values from globals.css, hardcoded rather than
 * referenced as CSS custom properties: ImageResponse renders through Satori,
 * which takes a plain inline-style tree and has no access to the app's
 * stylesheet or `var()` resolution.
 */
export default function Image() {
  const ink = "#ffffff";
  const ink2 = "#c3c2b7";
  const muted = "#898781";
  const plane = "#0d0d0d";
  const surface = "#1a1a19";
  const edge = "rgba(255,255,255,0.09)";
  const accent = "#3987e5";
  const gain = "#0ca30c";

  // A silhouette suggesting a rising market — not real data, just texture
  // that reads instantly as "this is a price chart product."
  const bars = [22, 30, 26, 38, 34, 46, 40, 54, 48, 64, 58, 74, 68, 86, 96];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: `linear-gradient(160deg, ${plane} 0%, ${surface} 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/*
            A plain letter, not the ₿ glyph used elsewhere in the app: Satori
            (the renderer behind ImageResponse) ships a limited bundled font
            and falls back to fetching missing glyphs from Google Fonts at
            render time — that fetch failed in this environment, which would
            have left a blank box here. "L" needs no special glyph.
          */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 60,
              height: 60,
              borderRadius: 16,
              background: accent,
              color: ink,
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            L
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: ink }}>
            Ledger
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 920 }}>
          <div
            style={{
              display: "flex",
              fontSize: 60,
              fontWeight: 700,
              color: ink,
              lineHeight: 1.15,
              letterSpacing: -1,
            }}
          >
            Live prices. Real profit &amp; loss.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 26,
              color: ink2,
              lineHeight: 1.5,
            }}
          >
            A crypto market tracker and personal portfolio — cost basis, P/L
            and allocation, derived from your own trades.
          </div>
        </div>

        {/* Footer: bar chart texture + stack pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              height: 100,
            }}
          >
            {bars.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: 22,
                  height: h,
                  borderRadius: 5,
                  background:
                    i === bars.length - 1
                      ? gain
                      : `linear-gradient(180deg, ${accent} 0%, rgba(57,135,229,0.35) 100%)`,
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingTop: 28,
              borderTop: `1px solid ${edge}`,
            }}
          >
            {["Next.js", "Supabase", "CoinGecko"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  fontSize: 20,
                  color: muted,
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: `1px solid ${edge}`,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
