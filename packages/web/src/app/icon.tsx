// Dynamic favicon — https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Black square favicon with white "CK" — matches ContextKit brand. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "system-ui",
          letterSpacing: -0.5
        }}
      >
        CK
      </div>
    ),
    { ...size }
  );
}
