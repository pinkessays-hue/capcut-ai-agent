import { useState } from 'react';
import { addCreator } from '../store/data';
import { CHANNEL_LABELS } from '../types';
import type { ChannelType, CreatorChannel } from '../types';

interface ApplyPageProps {
  onSuccess: () => void;
}

const CHANNEL_OPTIONS: ChannelType[] = ['youtube', 'instagram', 'tiktok', 'naver_blog', 'ohouse'];

export default function ApplyPage({ onSuccess }: ApplyPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [channels, setChannels] = useState<CreatorChannel[]>([
    { type: 'youtube', url: '', accountName: '' },
  ]);
  const [submitted, setSubmitted] = useState(false);

  const addChannel = () => {
    setChannels([...channels, { type: 'youtube', url: '', accountName: '' }]);
  };

  const removeChannel = (idx: number) => {
    if (channels.length > 1) {
      setChannels(channels.filter((_, i) => i !== idx));
    }
  };

  const updateChannel = (idx: number, field: keyof CreatorChannel, value: string) => {
    const updated = [...channels];
    updated[idx] = { ...updated[idx], [field]: value };
    setChannels(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !category || channels.some(c => !c.url || !c.accountName)) {
      alert('모든 항목을 입력해주세요.');
      return;
    }
    addCreator({ name, email, phone, category, channels });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center', maxWidth: 600 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>신청이 완료되었습니다</h2>
        <p style={{ fontSize: 16, color: 'var(--charcoal)', marginBottom: 32, lineHeight: 1.6 }}>
          운영팀에서 검토 후 승인 여부를 안내드리겠습니다.<br />
          이 페이지는 테스트 데모입니다. 실제 개인정보를 입력하지 마세요.
        </p>
        <button className="btn-primary" onClick={onSuccess}>홈으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '48px 16px 80px', maxWidth: 640 }}>
      <h1 className="section-title">크리에이터 신청</h1>
      <p style={{ fontSize: 14, color: 'var(--attention)', marginBottom: 24, fontWeight: 600 }}>
        ⚠ 테스트 화면입니다. 실제 개인정보 대신 예시 입력을 사용해주세요.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="apply-name">이름</label>
          <input
            id="apply-name"
            className="input-field"
            placeholder="예: 홍길동"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="apply-email">이메일</label>
          <input
            id="apply-email"
            type="email"
            className="input-field"
            placeholder="예: creator@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="apply-phone">연락처</label>
          <input
            id="apply-phone"
            className="input-field"
            placeholder="예: 010-0000-0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="apply-category">활동 분야</label>
          <input
            id="apply-category"
            className="input-field"
            placeholder="예: 인테리어 / 홈스타일링"
            value={category}
            onChange={e => setCategory(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>활동 채널</label>
            <button type="button" className="btn-ghost btn-small" onClick={addChannel}>
              + 채널 추가
            </button>
          </div>

          {channels.map((ch, idx) => (
            <div key={idx} className="card" style={{ marginBottom: 12, padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <select
                  className="select-field"
                  style={{ width: 'auto', flex: '0 0 auto' }}
                  value={ch.type}
                  onChange={e => updateChannel(idx, 'type', e.target.value)}
                  aria-label={`채널 ${idx + 1} 종류`}
                >
                  {CHANNEL_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{CHANNEL_LABELS[opt]}</option>
                  ))}
                </select>
                {channels.length > 1 && (
                  <button type="button" onClick={() => removeChannel(idx)} style={{
                    fontSize: 13,
                    color: 'var(--critical)',
                    fontWeight: 600,
                  }}>
                    삭제
                  </button>
                )}
              </div>
              <input
                className="input-field"
                placeholder="채널 URL (예: https://youtube.com/@example)"
                value={ch.url}
                onChange={e => updateChannel(idx, 'url', e.target.value)}
                style={{ marginBottom: 8 }}
                aria-label={`채널 ${idx + 1} URL`}
              />
              <input
                className="input-field"
                placeholder="계정명 (예: @example_creator)"
                value={ch.accountName}
                onChange={e => updateChannel(idx, 'accountName', e.target.value)}
                aria-label={`채널 ${idx + 1} 계정명`}
              />
            </div>
          ))}
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
          신청하기
        </button>
      </form>
    </div>
  );
}
