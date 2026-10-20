import type { Product } from '../types';

interface ProductImageProps {
  product: Product;
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

export default function ProductImage({ product, size, rounded = '0' }: ProductImageProps) {
  const bg = COLORS[product.name] || '#e8e8e8';
  const icon = ICONS[product.name] || '📦';
  const s = size || 160;

  return (
    <div
      style={{
        width: '100%',
        height: s,
        minHeight: s,
        borderRadius: rounded,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: s > 80 ? s * 0.3 : s * 0.4,
        position: 'relative',
        overflow: 'hidden',
      }}
      role="img"
      aria-label={product.name}
    >
      <span>{icon}</span>
      {!product.infoReady && (
        <span style={{
          position: 'absolute',
          bottom: 8,
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--steel)',
          background: 'rgba(255,255,255,0.85)',
          padding: '2px 8px',
          borderRadius: 20,
        }}>
          준비 중
        </span>
      )}
    </div>
  );
}
