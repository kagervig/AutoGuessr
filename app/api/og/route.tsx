import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { GRADE_HEX } from "@/app/lib/grade";

export const runtime = "edge";

const BG = "#0a0a0a";
const PRIMARY = "#f22648";
const MUTED = "#a6a6a6";
const WHITE = "#fafafa";

const OUTFIT_FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Outfit:wght@900&display=swap";

async function loadOutfitFont(): Promise<ArrayBuffer> {
  const css = await fetch(OUTFIT_FONT_CSS_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.text());

  const url = css.match(/url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error("Outfit font URL not found in Google Fonts CSS");

  return fetch(url).then((r) => r.arrayBuffer());
}

function LogoText() {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Outfit",
        fontWeight: 900,
        fontStyle: "italic",
        fontSize: 80,
        letterSpacing: "-0.05em",
        background: "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.4) 100%)",
        backgroundClip: "text",
        color: "transparent",
        lineHeight: 1,
      }}
    >
      AUTOGUESSR
    </div>
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const score = searchParams.get("score");
  const grade = searchParams.get("grade");
  const mode = searchParams.get("mode");

  if (!score || !grade) {
    return new Response("Missing required params: score, grade", { status: 400 });
  }

  const fontData = await loadOutfitFont();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BG,
        fontFamily: "Outfit",
        padding: "60px",
        position: "relative",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 8, display: "flex" }}>
        <LogoText />
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 22, fontWeight: 700, color: PRIMARY, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16, display: "flex" }}>
        Game Score
      </div>

      {/* Grade */}
      <div style={{ fontSize: 160, fontWeight: 900, lineHeight: 1, color: GRADE_HEX[grade] ?? WHITE, marginBottom: 16, display: "flex" }}>
        {grade}
      </div>

      {/* Score */}
      <div style={{ fontSize: 64, fontWeight: 900, color: WHITE, marginBottom: 8, display: "flex" }}>
        {Number(score).toLocaleString()}
      </div>
      <div style={{ fontSize: 20, color: MUTED, letterSpacing: 4, textTransform: "uppercase", marginBottom: 24, display: "flex" }}>
        pts
      </div>

      {/* Mode */}
      {mode && (
        <div style={{ fontSize: 22, color: MUTED, letterSpacing: 2, display: "flex", gap: 10 }}>
          <span style={{ color: PRIMARY, fontWeight: 700, textTransform: "uppercase" }}>Mode:</span>
          <span>{mode}</span>
        </div>
      )}
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Outfit", data: fontData, weight: 900, style: "normal" }],
    }
  );
}
