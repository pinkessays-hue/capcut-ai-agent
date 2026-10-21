import type { Product } from '../types';

interface ProductImageProps {
  product: Product;
  size?: number;
  rounded?: string;
}

const COLORS: Record<string, string> = {
  '포미 2단 리프트업 침대': '#e8d5c4',
  '홈앤힐 무드랙 시스템장': '#d5dce8',
  '홈앤힐 미니랩 높이각도조절 책상': '#e8e4d5',
  '홈앤힐 포그 구스 모듈소파': '#d5e8df',
};

const ICONS: Record<string, string> = {
  '포미 2단 리프트업 침대': '🛏️',
  '홈앤힐 무드랙 시스템장': '🗄️',
  '홈앤힐 미니랩 높이각도조절 책상': '🪑',
  '홈앤힐 포그 구스 모듈소파': '🛋️',
};

export default function ProductImage({ product, size, rounded = '0' }: ProductImageProps) {
  const s = size || 160;

  if (product.thumbnailUrl) {
    return (
      <div
        style={{
          width: '100%',
          height: s,
          minHeight: s,
          borderRadius: rounded,
          overflow: 'hidden',
          position: 'relative',
          background: '#f1f4f7',
        }}
        role="img"
        aria-label={product.name}
      >
        <img
          src={product.thumbnailUrl}
          alt={product.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        {!product.infoReady && (
          <span style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
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

  const bg = COLORS[product.name] || '#e8e8e8';
  const icon = ICONS[product.name] || '📦';

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
