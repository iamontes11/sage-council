import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: '#86efac',
            fontFamily: 'sans-serif',
            letterSpacing: '-4px',
          }}
        >
          S
        </div>
      </div>
    ),
    { ...size }
  );
}
