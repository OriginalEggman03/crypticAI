import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site-config";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4efe6",
          padding: "64px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "3px solid #1a1510",
            borderRadius: 24,
            backgroundColor: "#ffffff",
            padding: "56px 72px",
            boxShadow: "0 24px 48px rgba(26, 21, 16, 0.12)",
            maxWidth: 960,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 28,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#8b3a2a",
              fontWeight: 600,
            }}
          >
            {SITE_NAME}
          </p>
          <h1
            style={{
              margin: "20px 0 0",
              fontSize: 64,
              fontWeight: 700,
              color: "#1a1510",
              textAlign: "center",
              lineHeight: 1.15,
              fontFamily: "Georgia, serif",
            }}
          >
            {SITE_TAGLINE}
          </h1>
          <p
            style={{
              margin: "28px 0 0",
              fontSize: 26,
              color: "#1a1510",
              opacity: 0.75,
              textAlign: "center",
              lineHeight: 1.45,
              maxWidth: 780,
            }}
          >
            British cryptic anagram clues from any theme — verified, archived,
            and ready to share.
          </p>
        </div>
        <p
          style={{
            marginTop: 36,
            fontSize: 22,
            color: "#8b3a2a",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
          }}
        >
          crypticai.uk
        </p>
      </div>
    ),
    { ...size }
  );
}
