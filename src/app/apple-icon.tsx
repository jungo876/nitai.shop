import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iPhone "Add to Home Screen" icon. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#16a34a", color: "white", fontSize: 110, fontWeight: 800 }}>
        N
      </div>
    ),
    size
  );
}
