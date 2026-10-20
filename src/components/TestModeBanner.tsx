import { useState, useEffect } from 'react';
import { getTestMode } from '../api/admin';

export default function TestModeBanner() {
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    getTestMode()
      .then(res => { if (res.data) setIsTestMode(res.data.testMode); })
      .catch(() => setIsTestMode(true));
  }, []);

  if (!isTestMode) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #ff9500, #ff6b00)',
      color: '#fff',
      textAlign: 'center',
      padding: '6px 16px',
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      테스트 모드 — 실제 결제·송금·주문 연동 없이 동작합니다
    </div>
  );
}
