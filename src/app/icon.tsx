import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Mirrors the brand mark in SiteHeader: a rounded square in the app's accent
 * color with a ₿ mark. Colors are hardcoded (dark-mode values from
 * globals.css) since Satori renders a plain style tree with no access to the
 * app's `var()` custom properties — same constraint as opengraph-image.tsx.
 *
 * The ₿ is drawn as an SVG path rather than the literal glyph: Satori tries
 * to fetch missing glyphs from Google Fonts at render time, that fetch fails
 * in this environment (see opengraph-image.tsx), and it renders as a blank
 * box for this character. A vector path has no such dependency.
 */
export default function Icon() {
  const accent = "#3987e5";
  const accentInk = "#ffffff";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: accent,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
          <path
            d="M4.5 1.5V3M7 1.5V3M4.5 13V14.5M7 13V14.5M2 3H8.75C10.269 3 11.5 4.231 11.5 5.75C11.5 6.816 10.897 7.741 10.013 8.203C11.061 8.585 11.808 9.588 11.808 10.767C11.808 12.286 10.577 13.517 9.058 13.517H2V3ZM4.25 3V8.05M4.25 8.05V13M4.25 8.05H8.75C9.578 8.05 10.25 7.378 10.25 6.55V6.5C10.25 5.672 9.578 5 8.75 5H4.25M4.25 8.05H9.058C9.886 8.05 10.558 8.722 10.558 9.55C10.558 10.378 9.886 11.05 9.058 11.05H4.25"
            stroke={accentInk}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
