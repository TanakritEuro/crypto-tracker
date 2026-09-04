import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * A bold "L" monogram in the app's accent color, matching the brand mark
 * used in opengraph-image.tsx — one consistent mark across the tab icon and
 * the social share card. Colors are hardcoded (dark-mode values from
 * globals.css) since Satori renders a plain style tree with no access to the
 * app's `var()` custom properties.
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
          color: accentInk,
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        L
      </div>
    ),
    size,
  );
}
