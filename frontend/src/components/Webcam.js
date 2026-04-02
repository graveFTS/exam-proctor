import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import Webcam from 'react-webcam';

const WebcamMonitor = forwardRef(({ onError, isActive }, ref) => {
  const webcamRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getScreenshot: () => webcamRef.current?.getScreenshot() || null,
  }));

  return (
    <div style={S.wrapper}>
      <div style={S.label}>📷 Live Monitoring</div>
      <div style={S.camBox}>
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          style={S.cam}
          videoConstraints={{ width: 280, height: 200, facingMode: 'user' }}
          onUserMediaError={onError}
        />
        {isActive && <div style={S.recDot} title="Recording" />}
      </div>
      <div style={S.status}>
        <span style={S.dot} /> AI Proctoring Active
      </div>
    </div>
  );
});

export default WebcamMonitor;

const S = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' },
  camBox: { position: 'relative' },
  cam: { width: '100%', borderRadius: 8, border: '1px solid var(--border)', display: 'block' },
  recDot: {
    position: 'absolute', top: 8, right: 8,
    width: 10, height: 10, borderRadius: '50%',
    background: 'var(--danger)',
    animation: 'pulse 1.2s infinite',
  },
  status: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)' },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--accent)', display: 'inline-block',
    animation: 'pulse 1.5s infinite',
  },
};
