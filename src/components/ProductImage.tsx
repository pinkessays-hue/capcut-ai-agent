interface ProductImageProps {
  name: string;
  infoReady: boolean;
  size?: number;
  rounded?: string;
}

const COLORS: Record<string, string> = {
  '포미 리프트업 침대': '#e8d5c4',
  '리클라이너 소파': '#d5dce8',
  '휴고 플립': '#c4e8d5',
};

const ICONS: Record<string, string> = {
  '포미 리프트업 침대': '🛏️',
  '리클라이너 소파': '🛋️',
  '휴고 플립': '💺',
};

export default function ProductImage({ name, infoReady, size = 160, rounded = 'var(--rounded-xl)' }: ProductImageProps) {
  const bg = COLORS[name] || '#e8e8e8';
  const icon = ICONS[name] || '📦';

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: rounded,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: size > 80 ? size * 0.3 : size * 0.4,
        position: 'relative',
        overflow: 'hidden',
      }}
      role="img"
      aria-label={name}
    >
      <span>{icon}</span>
      {!infoReady && (
        <span style={{
          position: 'absolute',
          bottom: 8,
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--steel)',
          background: 'rgba(255,255,255,0.85)',
          padding: '2px 8px',
          borderRadius: 'var(--rounded-full)',
        }}>
          준비 중
        </span>
      )}
    </div>
  );
}
