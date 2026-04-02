import React from 'react';

export default function Timer({ seconds }) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const isLow = seconds < 60;
  const isCritical = seconds < 30;

  return (
    <div style={{ ...S.wrapper, borderColor: isCritical ? 'var(--danger)' : isLow ? 'var(--warn)' : 'var(--border)' }}>
      <span style={S.label}>TIME LEFT</span>
      <span style={{ ...S.time, color: isCritical ? 'var(--danger)' : isLow ? 'var(--warn)' : 'var(--accent)',
        animation: isCritical ? 'pulse 0.8s infinite' : 'none' }}>
        {mins}:{secs}
      </span>
      {isLow && <span style={{ ...S.warn, color: isCritical ? 'var(--danger)' : 'var(--warn)' }}>
        {isCritical ? '⚠ Hurry up!' : '⏳ Almost done'}
      </span>}
    </div>
  );
}

const S = {
  wrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center',
             padding: '6px 16px', border: '1px solid', borderRadius: 8,
             background: 'var(--surface)', transition: 'border-color .3s' },
  label:   { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 1 },
  time:    { fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, lineHeight: 1.2, transition: 'color .3s' },
  warn:    { fontSize: 11, fontWeight: 600, marginTop: 2 },
};
