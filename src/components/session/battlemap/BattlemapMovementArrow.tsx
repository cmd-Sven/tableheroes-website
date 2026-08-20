"use client";

type Props = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** DnD-5e-Bewegungsdistanz in Fuß */
  feet: number;
  valid: boolean;
};

/**
 * Bewegungspfeil vom Token zum Ziel — Linie mit Spitze und Fuß-Label (DnD 5e).
 */
export function BattlemapMovementArrow({
  fromX,
  fromY,
  toX,
  toY,
  feet,
  valid,
}: Props) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 6) return null;

  const angle = Math.atan2(dy, dx);
  const headLen = 14;
  const tailPad = 10;
  const startX = fromX + Math.cos(angle) * tailPad;
  const startY = fromY + Math.sin(angle) * tailPad;
  const endX = toX - Math.cos(angle) * headLen;
  const endY = toY - Math.sin(angle) * headLen;

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const labelAngleDeg = (angle * 180) / Math.PI;
  const flipLabel = labelAngleDeg > 90 || labelAngleDeg < -90;

  const stroke = valid ? "#379806" : "#ef4444";
  const labelBg = valid ? "rgba(10, 31, 16, 0.92)" : "rgba(40, 10, 10, 0.92)";

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[48] overflow-visible"
      aria-hidden
    >
      <defs>
        <marker
          id="battlemap-move-arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill={stroke} />
        </marker>
      </defs>

      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd="url(#battlemap-move-arrowhead)"
        opacity={0.95}
      />

      <circle cx={fromX} cy={fromY} r={5} fill={stroke} opacity={0.85} />
      <circle
        cx={toX}
        cy={toY}
        r={6}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        opacity={0.9}
      />

      <g transform={`translate(${midX}, ${midY}) rotate(${flipLabel ? labelAngleDeg + 180 : labelAngleDeg})`}>
        <rect
          x={-28}
          y={-11}
          width={56}
          height={22}
          rx={4}
          fill={labelBg}
          stroke={stroke}
          strokeWidth={1.5}
        />
        <text
          x={0}
          y={5}
          textAnchor="middle"
          fill={stroke}
          fontSize={13}
          fontWeight="700"
          fontFamily="var(--font-barlow), sans-serif"
        >
          {feet} ft
        </text>
      </g>
    </svg>
  );
}
