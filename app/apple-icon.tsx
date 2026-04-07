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
        {/* Crystal ball */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 32%, #7c3aed, #2e1065)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Main highlight */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.40)',
              position: 'absolute',
              top: 22,
              left: 26,
            }}
          />
          {/* Small shine */}
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.65)',
              position: 'absolute',
              top: 28,
              left: 32,
            }}
          />
          {/* Bottom glow */}
          <div
            style={{
              width: 60,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(139,92,246,0.25)',
              position: 'absolute',
              bottom: 16,
              left: 30,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
