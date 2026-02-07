import { ImageResponse } from "next/og";
import { S } from "@/app/lib/season-data";

export const runtime = "edge";

export function GET(request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season") || "spring";
  const sub = searchParams.get("sub") || "";
  const data = S[season] || S.spring;
  const subData = data.subs?.[sub];
  const palette = data.colors.slice(0, 6);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "48px 56px",
          backgroundImage: data.gradient,
          fontFamily: "sans-serif",
          color: "#1a1a1a",
        }}
      >
        <div style={{ width: "55%", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: 20, letterSpacing: 1, color: "#999" }}>your personal color</div>
          <div style={{ fontSize: 52, fontWeight: 700 }}>{data.label}</div>
          {subData && (
            <div
              style={{
                alignSelf: "flex-start",
                padding: "8px 16px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.06)",
                fontSize: 18,
                color: "#555",
                fontWeight: 500,
              }}
            >
              {subData.label}
            </div>
          )}
          <div style={{ fontSize: 24, fontWeight: 600 }}>{`"${data.tagline}"`}</div>
          <div style={{ marginTop: "auto", fontSize: 18, color: "#bbb" }}>TONCHECK</div>
        </div>
        <div
          style={{
            width: "45%",
            display: "flex",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          {palette.map((c) => (
            <div
              key={c.hex}
              style={{
                width: "140px",
                height: "140px",
                borderRadius: 18,
                background: c.hex,
                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
              }}
            />
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
