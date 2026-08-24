import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "linear-gradient(115deg, #09090b, #1c1917, #3f1d0f, #18181b)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "white",
            color: "#18181b",
            fontSize: 30,
            fontWeight: 700,
            marginBottom: 40,
          }}
        >
          35
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>35events</div>
        <div style={{ fontSize: 32, color: "rgba(255,255,255,0.8)", marginTop: 16, maxWidth: 800 }}>
          Auto rondritten &amp; meets
        </div>
      </div>
    ),
    { ...size },
  );
}
