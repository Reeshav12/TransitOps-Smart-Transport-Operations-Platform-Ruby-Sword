import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 20,
          background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 800,
          borderRadius: 8,
          fontFamily: 'sans-serif',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        TO
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
