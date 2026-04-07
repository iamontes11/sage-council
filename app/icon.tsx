import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        {/* Crystal ball */}
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 32%, #7c3aed, #2e1065)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Highlight */}
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.45)',
              position: 'absolute',
              top: 4,
              left: 5,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
