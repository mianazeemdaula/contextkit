// Open Graph image — Next 15 file convention:
// https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "ContextKit popup shown next to a ChatGPT chat box, with a single Paste button highlighted.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** OG image: black canvas with the landing-page headline from `landing/COPY.md`. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0b0b0f 0%, #1f1230 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          fontFamily: "system-ui"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            fontWeight: 700
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              background: "#fff",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              fontWeight: 800
            }}
          >
            CK
          </div>
          ContextKit
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>
            Stop re-explaining yourself to every AI.
          </div>
          <div style={{ fontSize: 30, opacity: 0.85, maxWidth: 1000 }}>
            Save your role, project, and tone once. Paste them into any chat in two seconds.
          </div>
        </div>
        <div style={{ fontSize: 22, opacity: 0.6 }}>contextkit.app</div>
      </div>
    ),
    { ...size }
  );
}
