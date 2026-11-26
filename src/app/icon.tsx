import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Site icon (browser tab, Google results, Android home screen). */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#16a34a", borderRadius: 96 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "white" }}>
          <div style={{ fontSize: 230, fontWeight: 800, lineHeight: 1, letterSpacing: -8 }}>N</div>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: 6, marginTop: 8 }}>AGRO</div>
        </div>
      </div>
    ),
    size
  );
}
