import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { io } from 'socket.io-client';
import { BACKEND } from '../api';

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12, pad = n => String(n).padStart(2, '0');
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return (
    <div style={CS.wrap}>
      <div style={CS.time}>{pad(h12)}:{pad(m)}<span style={CS.sec}>:{pad(s)}</span><span style={CS.ampm}>{ampm}</span></div>
      <div style={CS.date}>{days[now.getDay()]}, {months[now.getMonth()]} {now.getDate()}, {now.getFullYear()}</div>
    </div>
  );
}

function MiniCalendar() {
  const [cur, setCur] = useState(new Date());
  const today = new Date();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const year = cur.getFullYear(), month = cur.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const isToday = d => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  return (
    <div style={CAL.wrap}>
      <div style={CAL.header}>
        <button style={CAL.navBtn} onClick={() => setCur(new Date(year, month - 1, 1))}>‹</button>
        <span style={CAL.label}>{months[month]} {year}</span>
        <button style={CAL.navBtn} onClick={() => setCur(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div style={CAL.grid}>
        {dayLabels.map(d => <div key={d} style={CAL.dayLabel}>{d}</div>)}
        {cells.map((d, i) => (
          <div key={i} style={{ ...CAL.cell, ...(d && isToday(d) ? CAL.today : {}) }}>{d}</div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ ...SC.card, borderColor: color + '40' }}>
      <div style={{ ...SC.icon, background: color + '20', color }}>{icon}</div>
      <div style={SC.value}>{value}</div>
      <div style={SC.label}>{label}</div>
    </div>
  );
}

function ExamCard({ exam, onStart }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ ...EC.card, ...(hover ? EC.cardHover : {}) }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={EC.top}>
        <div style={EC.iconWrap}>📝</div>
        <div style={EC.info}>
          <div style={EC.title}>{exam.title}</div>
          {exam.createdBy && <div style={EC.by}>by {exam.createdBy.name}</div>}
        </div>
      </div>
      <div style={EC.meta}>
        <span style={EC.chip}>⏱ {exam.duration} min</span>
        <span style={EC.chip}>❓ {exam.questions?.length} questions</span>
      </div>
      <button style={{ ...EC.btn, ...(hover ? EC.btnHover : {}) }} onClick={() => onStart(exam._id)}>
        Start Exam →
      </button>
    </div>
  );
}

const DONT_LIST = [
  ['📵', 'Use a phone',            'Phones are strictly prohibited during the exam.'],
  ['👥', 'Allow others in frame',  'Only you should be visible in the webcam.'],
  ['📚', 'Use books or notes',     'No study materials allowed during the exam.'],
  ['💻', 'Use another device',     'No second laptop, tablet or desktop allowed.'],
  ['🎧', 'Wear earphones',         'Earphones or headphones are not allowed.'],
  ['👀', 'Look away from screen',  'Keep your eyes on the screen at all times.'],
  ['🗣️','Talk to someone',         'Communicating with others is not allowed.'],
  ['📄', 'Use paper or cheatsheet','No written notes or papers allowed.'],
  ['🚪', 'Leave the room',         'Stay in your seat for the full duration.'],
  ['📡', 'Use a remote or device', 'No external devices or remotes allowed.'],
];

const DO_LIST = [
  ['🎥', 'Keep webcam on',           'Your webcam must stay on throughout the exam.'],
  ['💡', 'Sit in good lighting',     'Ensure your face is clearly visible to the camera.'],
  ['👤', 'Be alone in the room',     'No other person should be in the same room.'],
  ['🖥️','Face the screen',          'Look at your screen and answer questions.'],
  ['🔇', 'Stay in a quiet place',    'Minimize background noise and distractions.'],
  ['⏱️','Manage your time wisely',  'Submit before the timer runs out.'],
  ['🪑', 'Sit upright properly',     'Sit so your face is fully visible at all times.'],
  ['🔋', 'Check power & internet',   'Ensure stable connection before starting.'],
  ['🪟', 'Keep browser focused',     'Do not switch tabs or open other apps.'],
  ['✅', 'Answer honestly',          'All work must be entirely your own.'],
];

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [violations, setViolations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exams');
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    Promise.all([api.get('/exam'), api.get('/violations/mine')])
      .then(([eRes, vRes]) => { setExams(eRes.data); setViolations(vRes.data); })
      .finally(() => setLoading(false));
    const socket = io(BACKEND);
    socket.on('violation_alert', data => {
      if (data.studentId === user.id)
        setAlerts(a => [{ ...data, time: new Date().toLocaleTimeString() }, ...a].slice(0, 3));
    });
    return () => socket.disconnect();
  }, []);

  const logout = () => { localStorage.clear(); nav('/login'); };
  const sevColor = s => ({ LOW:'#22c55e', MEDIUM:'#f59e0b', HIGH:'#f97316', CRITICAL:'#ef4444' }[s]||'#f59e0b');
  const highViol = violations.filter(v => v.severity === 'HIGH' || v.severity === 'CRITICAL').length;
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

  return (
    <div style={S.page}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.sideTop}>
          <div style={S.logo}>⬡ <span>ExamGuard</span></div>
          <div style={S.avatar}>{user.name?.[0]?.toUpperCase() || 'S'}</div>
          <div style={S.userName}>{user.name}</div>
          <div style={S.userRole}>Student</div>
        </div>
        <nav style={S.nav}>
          {[
            ['exams',      '📋', 'My Exams',    null],
            ['violations', '⚠️', 'Violations',  violations.length > 0 ? violations.length : null],
            ['calendar',   '📅', 'Calendar',    null],
            ['rules',      '📜', 'Exam Rules',  null],
          ].map(([tab, icon, label, badge]) => (
            <button key={tab} style={{ ...S.navItem, ...(activeTab === tab ? S.navActive : {}) }}
              onClick={() => setActiveTab(tab)}>
              <span style={S.navIcon}>{icon}</span>
              <span>{label}</span>
              {badge && <span style={S.navBadge}>{badge}</span>}
            </button>
          ))}
        </nav>
        <button style={S.logoutBtn} onClick={logout}>⎋ Logout</button>
      </div>

      {/* Main */}
      <div style={S.main}>
        {alerts.length > 0 && (
          <div style={S.alertBar}>
            🚨 {alerts[0].violations?.[0]?.message || 'Violation detected'} — {alerts[0].time}
            <button style={S.alertClose} onClick={() => setAlerts([])}>✕</button>
          </div>
        )}

        {/* Topbar */}
        <div style={S.topbar}>
          <div>
            <h1 style={S.greeting}>{greeting()}, {user.name?.split(' ')[0]}! 👋</h1>
            <p style={S.greetingSub}>{exams.length > 0 ? `You have ${exams.length} exam(s) ready` : 'No exams available yet'}</p>
          </div>
          <LiveClock />
        </div>

        {/* Stats */}
        <div style={S.statsRow}>
          <StatCard icon="📝" label="Available Exams"  value={exams.length}      color="#00ff9d" />
          <StatCard icon="⚠️" label="Total Violations" value={violations.length} color={violations.length > 0 ? '#f97316' : '#00ff9d'} />
          <StatCard icon="🚨" label="High Severity"    value={highViol}          color={highViol > 0 ? '#ef4444' : '#00ff9d'} />
          <StatCard icon="✅" label="Clean Sessions"   value={Math.max(0, exams.length - (violations.length > 0 ? 1 : 0))} color="#7c3aed" />
        </div>

        <div style={S.tabContent}>

          {/* EXAMS */}
          {activeTab === 'exams' && (
            <div>
              <h2 style={S.sectionTitle}>Available Exams</h2>
              {loading ? <div style={S.empty}>Loading exams...</div>
              : exams.length === 0 ? (
                <div style={S.emptyState}>
                  <div style={S.emptyIcon}>📭</div>
                  <h3 style={S.emptyTitle}>No exams yet</h3>
                  <p style={S.emptySub}>Your instructor hasn't created any exams yet.</p>
                </div>
              ) : (
                <div style={S.examGrid}>
                  {exams.map(exam => <ExamCard key={exam._id} exam={exam} onStart={id => nav(`/exam/${id}`)} />)}
                </div>
              )}
            </div>
          )}

          {/* VIOLATIONS */}
          {activeTab === 'violations' && (
            <div>
              <h2 style={S.sectionTitle}>My Violation Log</h2>
              {violations.length === 0 ? (
                <div style={S.emptyState}>
                  <div style={S.emptyIcon}>🎉</div>
                  <h3 style={S.emptyTitle}>Clean record!</h3>
                  <p style={S.emptySub}>No violations recorded. Keep it up!</p>
                </div>
              ) : (
                <div style={S.violList}>
                  {violations.map((v, i) => (
                    <div key={i} style={S.violRow}>
                      <div style={{ ...S.sevBar, background: sevColor(v.severity) }} />
                      <div style={S.violInfo}>
                        <div style={S.violMsg}>{v.message}</div>
                        <div style={S.violTime}>{new Date(v.createdAt).toLocaleString()}</div>
                      </div>
                      <span style={{ ...S.sevChip, background: sevColor(v.severity)+'25', color: sevColor(v.severity) }}>
                        {v.severity || 'MEDIUM'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CALENDAR */}
          {activeTab === 'calendar' && (
            <div>
              <h2 style={S.sectionTitle}>Calendar</h2>
              <div style={S.calRow}>
                <MiniCalendar />
                <div style={S.calRight}>
                  <div style={S.todayCard}>
                    <div style={S.todayLabel}>TODAY</div>
                    <div style={S.todayDate}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
                    <div style={S.todayStats}>
                      <div style={S.todayStat}>
                        <span style={S.todayNum}>{exams.length}</span>
                        <span style={S.todayStatLabel}>Pending Exams</span>
                      </div>
                      <div style={S.todayDiv} />
                      <div style={S.todayStat}>
                        <span style={S.todayNum}>{violations.length}</span>
                        <span style={S.todayStatLabel}>Violations</span>
                      </div>
                    </div>
                  </div>
                  <div style={S.upcomingBox}>
                    <div style={S.upcomingTitle}>📋 Upcoming Exams</div>
                    {exams.length === 0 ? <p style={{color:'var(--muted)',fontSize:13}}>No exams scheduled</p>
                    : exams.slice(0, 3).map(e => (
                      <div key={e._id} style={S.upcomingItem}>
                        <div style={S.upcomingDot} />
                        <div>
                          <div style={S.upcomingName}>{e.title}</div>
                          <div style={S.upcomingMeta}>⏱ {e.duration} min • {e.questions?.length} questions</div>
                        </div>
                        <button style={S.upcomingBtn} onClick={() => nav(`/exam/${e._id}`)}>Start</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RULES */}
          {activeTab === 'rules' && (
            <div>
              <h2 style={S.sectionTitle}>📜 Exam Rules & Guidelines</h2>
              <p style={S.rulesIntro}>
                Read these carefully before starting any exam. Violations are detected automatically by AI and logged permanently.
              </p>

              <div style={RU.grid}>
                {/* DON'T */}
                <div style={RU.card}>
                  <div style={RU.cardHead}>
                    <div style={{ ...RU.headIcon, background:'#ef444420', color:'#ef4444' }}>✕</div>
                    <div>
                      <div style={RU.headTitle}>Do NOT do these</div>
                      <div style={RU.headSub}>Violations will be recorded and reported</div>
                    </div>
                  </div>
                  {DONT_LIST.map(([icon, title, desc], i) => (
                    <div key={i} style={RU.row}>
                      <div style={{ ...RU.ruleIcon, background:'#ef444412' }}>{icon}</div>
                      <div style={RU.ruleInfo}>
                        <div style={RU.ruleTitle}>{title}</div>
                        <div style={RU.ruleDesc}>{desc}</div>
                      </div>
                      <div style={{ ...RU.dot, background:'#ef4444' }} />
                    </div>
                  ))}
                </div>

                {/* DO */}
                <div style={RU.card}>
                  <div style={RU.cardHead}>
                    <div style={{ ...RU.headIcon, background:'#00ff9d20', color:'#00ff9d' }}>✓</div>
                    <div>
                      <div style={RU.headTitle}>You MUST do these</div>
                      <div style={RU.headSub}>Required for a valid exam session</div>
                    </div>
                  </div>
                  {DO_LIST.map(([icon, title, desc], i) => (
                    <div key={i} style={RU.row}>
                      <div style={{ ...RU.ruleIcon, background:'#00ff9d12' }}>{icon}</div>
                      <div style={RU.ruleInfo}>
                        <div style={RU.ruleTitle}>{title}</div>
                        <div style={RU.ruleDesc}>{desc}</div>
                      </div>
                      <div style={{ ...RU.dot, background:'#00ff9d' }} />
                    </div>
                  ))}
                  {/* Warning notice */}
                  <div style={RU.warnBox}>
                    <div style={RU.warnTitle}>⚠️ Important Notice</div>
                    <div style={RU.warnText}>
                      Multiple HIGH or CRITICAL severity violations may result in your exam being flagged or disqualified.
                      The AI monitors every 10 seconds — stay compliant throughout.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const S = {
  page: { display:'flex', minHeight:'100vh', background:'var(--bg)' },
  sidebar: { width:220, background:'var(--surface)', borderRight:'1px solid var(--border)',
    display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0, position:'sticky', top:0, height:'100vh' },
  sideTop: { padding:'0 20px 24px', borderBottom:'1px solid var(--border)', textAlign:'center' },
  logo: { fontFamily:'var(--mono)', fontSize:18, color:'var(--accent)', marginBottom:20, textAlign:'left' },
  avatar: { width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#00ff9d)',
    color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
    fontWeight:700, fontSize:22, margin:'0 auto 10px' },
  userName: { fontWeight:700, fontSize:15, marginBottom:4 },
  userRole: { fontSize:12, background:'var(--accent)20', color:'var(--accent)', padding:'2px 10px', borderRadius:20, display:'inline-block' },
  nav: { flex:1, padding:'16px 12px', display:'flex', flexDirection:'column', gap:4 },
  navItem: { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8,
    background:'transparent', border:'none', color:'var(--muted)', fontSize:14,
    cursor:'pointer', textAlign:'left', transition:'all .15s', width:'100%' },
  navActive: { background:'var(--accent)15', color:'var(--accent)', fontWeight:600 },
  navIcon: { fontSize:16, width:20 },
  navBadge: { marginLeft:'auto', background:'var(--danger)', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20 },
  logoutBtn: { margin:'0 12px', padding:'10px 12px', borderRadius:8, border:'1px solid var(--border)',
    background:'transparent', color:'var(--muted)', cursor:'pointer', fontSize:13 },
  alertBar: { background:'#ef444420', border:'1px solid var(--danger)', padding:'10px 20px',
    color:'var(--danger)', fontSize:13, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center' },
  alertClose: { background:'transparent', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:16 },
  main: { flex:1, display:'flex', flexDirection:'column', overflow:'auto' },
  topbar: { display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'28px 32px 20px', borderBottom:'1px solid var(--border)' },
  greeting: { fontSize:24, fontWeight:700, marginBottom:4 },
  greetingSub: { fontSize:14, color:'var(--muted)' },
  statsRow: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, padding:'24px 32px 0' },
  tabContent: { padding:'24px 32px', flex:1 },
  sectionTitle: { fontFamily:'var(--mono)', fontSize:16, marginBottom:16, color:'var(--text)' },
  rulesIntro: { color:'var(--muted)', fontSize:14, marginBottom:24, lineHeight:1.7,
    background:'var(--surface)', padding:'12px 16px', borderRadius:8, border:'1px solid var(--border)' },
  empty: { color:'var(--muted)', fontSize:14 },
  emptyState: { textAlign:'center', padding:'48px 20px' },
  emptyIcon: { fontSize:48, marginBottom:16 },
  emptyTitle: { fontSize:18, fontWeight:700, marginBottom:8 },
  emptySub: { color:'var(--muted)', fontSize:14 },
  examGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 },
  violList: { display:'flex', flexDirection:'column', gap:8 },
  violRow: { display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
    background:'var(--surface)', borderRadius:8, border:'1px solid var(--border)' },
  sevBar: { width:4, height:36, borderRadius:2, flexShrink:0 },
  violInfo: { flex:1 },
  violMsg: { fontSize:13, fontWeight:500, marginBottom:3 },
  violTime: { fontSize:11, color:'var(--muted)' },
  sevChip: { fontSize:11, padding:'3px 8px', borderRadius:20, fontWeight:700, whiteSpace:'nowrap' },
  calRow: { display:'grid', gridTemplateColumns:'320px 1fr', gap:24 },
  calRight: { display:'flex', flexDirection:'column', gap:16 },
  todayCard: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20 },
  todayLabel: { fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)', marginBottom:6, letterSpacing:2 },
  todayDate: { fontSize:15, fontWeight:700, marginBottom:16 },
  todayStats: { display:'flex', alignItems:'center', gap:20 },
  todayStat: { textAlign:'center' },
  todayNum: { display:'block', fontSize:28, fontWeight:700, fontFamily:'var(--mono)', color:'var(--accent)' },
  todayStatLabel: { fontSize:12, color:'var(--muted)' },
  todayDiv: { width:1, height:40, background:'var(--border)' },
  upcomingBox: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20, flex:1 },
  upcomingTitle: { fontFamily:'var(--mono)', fontSize:13, marginBottom:16 },
  upcomingItem: { display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' },
  upcomingDot: { width:8, height:8, borderRadius:'50%', background:'var(--accent)', flexShrink:0 },
  upcomingName: { fontSize:13, fontWeight:600, marginBottom:2 },
  upcomingMeta: { fontSize:11, color:'var(--muted)' },
  upcomingBtn: { marginLeft:'auto', background:'var(--accent)', color:'#0a0a0f',
    border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer' },
};

const CS = {
  wrap: { textAlign:'right' },
  time: { fontFamily:'var(--mono)', fontSize:32, fontWeight:700, color:'var(--accent)', lineHeight:1 },
  sec: { fontSize:22, opacity:0.6 },
  ampm: { fontSize:14, marginLeft:6, color:'var(--muted)' },
  date: { fontSize:13, color:'var(--muted)', marginTop:4 },
};

const CAL = {
  wrap: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20 },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  label: { fontFamily:'var(--mono)', fontSize:14, fontWeight:700 },
  navBtn: { background:'transparent', border:'1px solid var(--border)', color:'var(--text)',
    borderRadius:6, width:28, height:28, cursor:'pointer', fontSize:16 },
  grid: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 },
  dayLabel: { textAlign:'center', fontSize:11, color:'var(--muted)', fontWeight:700, padding:'4px 0', fontFamily:'var(--mono)' },
  cell: { textAlign:'center', fontSize:13, padding:'6px 0', borderRadius:6, color:'var(--text)' },
  today: { background:'var(--accent)', color:'#0a0a0f', fontWeight:700 },
};

const SC = {
  card: { background:'var(--surface)', border:'1px solid', borderRadius:12, padding:20,
    display:'flex', flexDirection:'column', alignItems:'center', gap:8 },
  icon: { width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 },
  value: { fontSize:28, fontWeight:700, fontFamily:'var(--mono)' },
  label: { fontSize:12, color:'var(--muted)', textAlign:'center' },
};

const EC = {
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20,
    display:'flex', flexDirection:'column', gap:14, transition:'border-color .2s, transform .2s' },
  cardHover: { borderColor:'var(--accent)', transform:'translateY(-2px)' },
  top: { display:'flex', gap:12, alignItems:'flex-start' },
  iconWrap: { fontSize:24, width:44, height:44, background:'var(--accent)15', borderRadius:10,
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  info: { flex:1 },
  title: { fontWeight:700, fontSize:15, marginBottom:4 },
  by: { fontSize:12, color:'var(--muted)' },
  meta: { display:'flex', gap:8, flexWrap:'wrap' },
  chip: { fontSize:12, background:'var(--bg)', border:'1px solid var(--border)',
    padding:'3px 10px', borderRadius:20, color:'var(--muted)' },
  btn: { background:'var(--accent)', color:'#0a0a0f', border:'none', borderRadius:8,
    padding:10, fontWeight:700, fontSize:14, cursor:'pointer', transition:'opacity .15s',
    width:'100%', fontFamily:'var(--font)' },
  btnHover: { opacity:0.85 },
};

const RU = {
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 },
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:24 },
  cardHead: { display:'flex', alignItems:'center', gap:14, marginBottom:20,
    paddingBottom:16, borderBottom:'1px solid var(--border)' },
  headIcon: { width:40, height:40, borderRadius:10, display:'flex', alignItems:'center',
    justifyContent:'center', fontSize:18, fontWeight:700, flexShrink:0 },
  headTitle: { fontSize:16, fontWeight:700, marginBottom:2 },
  headSub: { fontSize:12, color:'var(--muted)' },
  row: { display:'flex', alignItems:'center', gap:12, padding:'10px 0',
    borderBottom:'1px solid var(--border)' },
  ruleIcon: { width:36, height:36, borderRadius:8, display:'flex', alignItems:'center',
    justifyContent:'center', fontSize:16, flexShrink:0 },
  ruleInfo: { flex:1 },
  ruleTitle: { fontSize:13, fontWeight:600, marginBottom:2 },
  ruleDesc: { fontSize:12, color:'var(--muted)', lineHeight:1.5 },
  dot: { width:6, height:6, borderRadius:'50%', flexShrink:0 },
  warnBox: { marginTop:20, background:'#f59e0b15', border:'1px solid #f59e0b40',
    borderRadius:8, padding:16 },
  warnTitle: { fontSize:13, fontWeight:700, color:'#f59e0b', marginBottom:6 },
  warnText: { fontSize:12, color:'var(--muted)', lineHeight:1.6 },
};