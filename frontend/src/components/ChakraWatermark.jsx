import React from 'react';

// 24-spoke Ashoka Chakra geometry, computed precisely (15deg increments).
const SPOKES = Array.from({ length: 24 }, (_, i) => {
  const rad = (i * 15) * (Math.PI / 180);
  return {
    x1: 200 + 26 * Math.sin(rad),
    y1: 200 - 26 * Math.cos(rad),
    x2: 200 + 178 * Math.sin(rad),
    y2: 200 - 178 * Math.cos(rad),
  };
});

/**
 * A dignified, extremely slow-rotating chakra watermark fixed behind all
 * page content. Purely decorative (aria-hidden), never intercepts clicks,
 * and freezes for prefers-reduced-motion.
 *
 * Rendered in authentic Ashoka Chakra navy blue (the colour specified for
 * the wheel on the Flag of India), with a gradient sweep and a soft glow
 * for a dimensional, engraved-metal treatment. The rotation itself
 * (chakra-spin, 220s linear) is unchanged.
 */
export default function ChakraWatermark() {
  return (
    <div className="chakra-watermark" aria-hidden="true">
      <div className="chakra-watermark-inner">
        <svg className="chakra-watermark-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="chakraBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a3a8f" />
              <stop offset="55%" stopColor="#0a1f6e" />
              <stop offset="100%" stopColor="#000080" />
            </linearGradient>
            <filter id="chakraGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g fill="none" stroke="url(#chakraBlueGradient)" strokeOpacity="0.15" strokeWidth="3" strokeLinecap="round" filter="url(#chakraGlow)">
            <circle cx="200" cy="200" r="190" strokeWidth="4.5" />
            <circle cx="200" cy="200" r="172" strokeWidth="1.6" />
            <circle cx="200" cy="200" r="16" fill="url(#chakraBlueGradient)" fillOpacity="0.13" strokeWidth="2" />
            {SPOKES.map((s, i) => (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
