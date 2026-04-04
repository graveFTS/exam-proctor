import React from 'react';

const typeStyle = {
  no_face:           { bg: '#ff44441a', border: 'var(--danger)', color: 'var(--danger)', icon: '👁️' },
  multiple_faces:    { bg: '#ff44441a', border: 'var(--danger)', color: 'var(--danger)', icon: '👥' },
  looking_away:      { bg: '#ffaa0015', border: 'var(--warn)',   color: 'var(--warn)',   icon: '👀' },
  phone_detected:    { bg: '#ff44441a', border: 'var(--danger)', color: 'var(--danger)', icon: '📵' },
  book_detected:     { bg: '#ffaa0015', border: 'var(--warn)',   color: 'var(--warn)',   icon: '📚' },
  laptop_detected:   { bg: '#ff44441a', border: 'var(--danger)', color: 'var(--danger)', icon: '💻' },
  tablet_detected:   { bg: '#ff44441a', border: 'var(--danger)', color: 'var(--danger)', icon: '📱' },
  earphone_detected: { bg: '#ffaa0015', border: 'var(--warn)',   color: 'var(--warn)',   icon: '🎧' },
  paper_detected:    { bg: '#ffaa0015', border: 'var(--warn)',   color: 'var(--warn)',   icon: '📄' },
  remote_detected:   { bg: '#ffaa0015', border: 'var(--warn)',   color: 'var(--warn)',   icon: '📡' },
  banned_object:     { bg: '#ffaa0015', border: 'var(--warn)',   color: 'var(--warn)',   icon: '🚫' },
  no_camera:         { bg: '#ff44441a', border: 'var(--danger)', color: 'var(--danger)', icon: '📷' },
  warn:              { bg: '#ffaa0015', border: 'var(--warn)',   color: 'var(--warn)',   icon: '⚠️' },
};

export default function Notifications({ items }) {
  // ✅ Sort by id descending (newest first = highest timestamp on top)
  const sorted = [...items].sort((a, b) => b.id - a.id);

  // ✅ Deduplicate — show count if same type appears multiple times
  const deduped = [];
  const countMap = {};
  for (const n of sorted) {
    if (!countMap[n.type]) {
      countMap[n.type] = { ...n, count: 1 };
      deduped.push(countMap[n.type]);
    } else {
      countMap[n.type].count += 1;
    }
  }

  return (
    <div style={S.box}>
      <div style={S.title}>
        ⚠ Violation Alerts
        {deduped.length > 0 && (
          <span style={S.badge}>{items.length}</span>
        )}
      </div>
      {deduped.length === 0 ? (
        <p style={S.empty}>✅ No violations detected</p>
      ) : (
        deduped.map(n => {
          const ts = typeStyle[n.type] || typeStyle.warn;
          return (
            <div key={n.id} style={{ ...S.item, background: ts.bg, borderColor: ts.border, color: ts.color }}>
              <span style={S.icon}>{ts.icon}</span>
              <div style={S.content}>
                <span style={S.msg}>{n.msg}</span>
                <div style={S.meta}>
                  {n.time && <span style={S.time}>{n.time}</span>}
                  {n.count > 1 && (
                    <span style={{ ...S.countBadge, background: ts.border }}>
                      ×{n.count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const S = {
  box:        { display: 'flex', flexDirection: 'column', gap: 6 },
  title:      { fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--warn)',
                marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 },
  badge:      { background: 'var(--danger)', color: '#fff', fontSize: 10,
                fontWeight: 700, padding: '1px 6px', borderRadius: 20 },
  empty:      { color: 'var(--muted)', fontSize: 12 },
  item:       { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12,
                padding: '8px 10px', borderRadius: 6, border: '1px solid' },
  icon:       { flexShrink: 0, fontSize: 14, marginTop: 1 },
  content:    { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  msg:        { lineHeight: 1.4 },
  meta:       { display: 'flex', alignItems: 'center', gap: 6 },
  time:       { fontSize: 10, opacity: 0.6, whiteSpace: 'nowrap' },
  countBadge: { fontSize: 10, color: '#fff', padding: '1px 5px',
                borderRadius: 20, fontWeight: 700, opacity: 0.85 },
};