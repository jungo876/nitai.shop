import { ImageResponse } from "next/og";

export const alt = "NCK Agro — wholesale pesticides, fungicides and fertilisers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default preview image when a link to the site is shared (WhatsApp, Facebook…). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #14532d 0%, #16a34a 100%)", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, background: "white", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, fontWeight: 800 }}>N</div>
          <div style={{ fontSize: 64, fontWeight: 800 }}>NCK Agro</div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, marginTop: 48, lineHeight: 1.2 }}>Wholesale pesticides, fungicides & fertilisers</div>
        <div style={{ fontSize: 32, marginTop: 24, opacity: 0.9 }}>Bulk box prices · Secure online payment · Cash on Delivery</div>
        <div style={{ fontSize: 30, marginTop: 48, opacity: 0.85 }}>www.nitai.shop</div>
      </div>
    ),
    size
  );
}
