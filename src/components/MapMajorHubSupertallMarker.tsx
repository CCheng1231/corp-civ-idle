import { useId } from "react";

interface MapMajorHubSupertallMarkerProps {
  hubId: string;
  /** Hex center in map viewBox coordinates */
  x: number;
  y: number;
  hexRadius: number;
}

/** Supertall exchange art embedded in the world map SVG (hub-iso-supertall). */
export function MapMajorHubSupertallMarker({
  hubId,
  x,
  y,
  hexRadius,
}: MapMajorHubSupertallMarkerProps) {
  const reactId = useId().replace(/:/g, "");
  const p = `${reactId}-${hubId}`;
  const width = hexRadius * 2 * 0.94;
  const height = width * (320 / 300);
  const svgX = x - width / 2;
  const svgY = y - height * 0.86;

  return (
    <svg
      x={svgX}
      y={svgY}
      width={width}
      height={height}
      viewBox="0 0 300 320"
      className="map-major-hub-supertall-marker"
      overflow="visible"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${p}-sky`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8f4fc" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#8ec8e8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#3a6d8f" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`${p}-glass`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9fd0e8" />
          <stop offset="45%" stopColor="#4a88a8" />
          <stop offset="100%" stopColor="#2a5068" />
        </linearGradient>
        <linearGradient id={`${p}-shade`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6a98b0" />
          <stop offset="100%" stopColor="#1a3848" />
        </linearGradient>
        <linearGradient id={`${p}-crown`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#a8c8e0" />
          <stop offset="100%" stopColor="#f0f8ff" />
        </linearGradient>
        <pattern
          id={`${p}-curtain-lit`}
          width="8"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="10" fill={`url(#${p}-glass)`} />
          <rect width="8" height="10" fill={`url(#${p}-sky)`} opacity="0.35" />
          <path
            d="M0 0v10M2.5 0v10M5 0v10M7.5 0v10"
            stroke="#1a3040"
            strokeWidth="0.55"
            opacity="0.85"
          />
          <path
            d="M0 2.5h8M0 5h8M0 7.5h8"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="0.35"
          />
          <path d="M0 5h8" stroke="rgba(40,60,80,0.45)" strokeWidth="0.9" />
        </pattern>
        <pattern
          id={`${p}-curtain-shade`}
          width="8"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="10" fill={`url(#${p}-shade)`} />
          <path d="M0 0v10M4 0v10M8 0v10" stroke="#142830" strokeWidth="0.6" />
          <path
            d="M0 3.3h8M0 6.6h8"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="0.5"
          />
        </pattern>
        <pattern
          id={`${p}-plaza`}
          width="16"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <rect width="16" height="12" fill="#8a9098" />
          <path d="M0 6h16M8 0v12" stroke="#6a7078" strokeWidth="0.45" />
          <rect x="1" y="1" width="6" height="4" fill="#9aa0a8" opacity="0.4" />
        </pattern>
        <pattern
          id={`${p}-podium`}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <rect width="12" height="12" fill="#b8bcc4" />
          <path
            d="M0 0l12 12M12 0L0 12"
            stroke="#a0a4ac"
            strokeWidth="0.25"
            opacity="0.35"
          />
        </pattern>
      </defs>
      <ellipse cx="150" cy="290" rx="100" ry="24" fill="rgba(0,0,0,0.45)" />
      <path d="M48 272 L252 272 L262 282 L38 282 Z" fill={`url(#${p}-plaza)`} />
      <path
        d="M95 272 L205 272 L215 262 L85 262 Z"
        fill={`url(#${p}-podium)`}
      />
      <path
        d="M95 262 L205 262 L198 248 L102 248 Z"
        fill={`url(#${p}-curtain-lit)`}
        stroke="#5a7888"
        strokeWidth="0.8"
      />
      <path
        d="M102 248 L198 248 L190 238 L110 238 Z"
        fill="#dce8f0"
        opacity="0.9"
      />
      <path
        d="M118 262 L182 262 L168 88 L132 88 Z"
        fill={`url(#${p}-curtain-lit)`}
        stroke="#2a5060"
        strokeWidth="0.8"
      />
      <path
        d="M132 88 L168 88 L160 72 L140 72 Z"
        fill={`url(#${p}-curtain-shade)`}
        stroke="#3a5868"
      />
      <path
        d="M118 262 L132 88 L140 72 L128 262 Z"
        fill="#fff"
        opacity="0.08"
      />
      <path
        d="M182 262 L168 88 L160 72 L172 262 Z"
        fill="#000"
        opacity="0.12"
      />
      <path
        d="M132 88 L168 88 L162 68 L138 68 Z"
        fill={`url(#${p}-crown)`}
        stroke="rgba(255,255,255,0.8)"
      />
      <rect
        x="144"
        y="52"
        width="12"
        height="18"
        fill="#3ec6b8"
        rx="1"
        opacity="0.9"
      />
      <path d="M150 52 L150 38" stroke="#9aa8b0" strokeWidth="1.2" />
      <circle cx="150" cy="36" r="2.5" fill="#5ee8d8" />
      <path
        d="M95 272 L118 262 L118 200 L95 210 Z"
        fill={`url(#${p}-curtain-shade)`}
      />
      <path
        d="M205 272 L182 262 L182 200 L205 210 Z"
        fill={`url(#${p}-curtain-shade)`}
        opacity="0.9"
      />
      <path
        d="M118 262 L182 262 L182 266 L118 266 Z"
        fill="#000"
        opacity="0.16"
      />
    </svg>
  );
}
