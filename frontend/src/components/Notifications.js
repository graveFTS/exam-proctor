import React from 'react';

const typeStyle = {
  no_face:        { bg: '#ff44441a', border: 'var(--danger)', color: 'var(--danger)', icon: '👁️' },
  multiple_faces: { bg: '#ff44441a', border: 'var(--danger)', color: 'var(--danger)', icon: '👥' },
  banned_object:  { bg: '#ffaa0015', border: 'var(--warn)',   color: 'var(--warn)',   icon: '📵' },
  no_camera:      { bg: '#ff44441a', border: 'var(--danger)', color: 'var(--danger)', icon: '🚫' },
  warn:           { bg: '#ffaa0015', border: 'var(--warn)',   color: 'var(--warn)',   icon: '⚠️' },
};

export default function Notifications({ items }) {
  return (
    <div style={S.box}>
      <div style={S.title}>⚠ Violation Alerts</div>
      {items.length === 0 ? (
        <p style={S.empty}>✅ No violations detected</p>
      ) : (
        items.map(n => {
          const ts = typeStyle[n.type] || typeStyle.warn;
          return (
            <div key={n.id} style={{ ...S.item, background: ts.bg, borderColor: ts.border, color: ts.color }}>
              <span style={S.icon}>{ts.icon}</span>
              <span style={S.msg}>{n.m}</span>
              {n.time && <span style={S.time}>{n.time}</span>}
            </div>
          );
        })
      )}
    </div>
  );
}

const S = {
  box:   { display: 'flex', flexDirection: 'column', gap: 6 },
  title: { fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--warn)', marginBottom: 4 },
  empty: { color: 'var(--muted)', fontSize: 12 },
  item:  { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12,
           padding: '8px 10px', borderRadius: 6, border: '1px solid' },
  icon:  { flexShrink: 0, fontSize: 14 },
  msg:   { flex: 1, lineHeight: 1.4 },
  time:  { flexShrink: 0, fontSize: 11, opacity: 0.7, marginLeft: 4, whiteSpace: 'nowrap' },
};
