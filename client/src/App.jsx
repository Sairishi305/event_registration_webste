import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, MapPin, Phone, Mail, Users, Ticket, ScanLine, Download, ShieldCheck, LogIn, LogOut, Sparkles, ArrowRight, MonitorPlay, BadgeCheck, Brain, Rocket, Orbit } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const eventDate = new Date('2026-12-15T09:00:00');

const speakers = [
  { name: 'Dr. Asha Nair', role: 'IEEE Women in Engineering Global Chair', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
  { name: 'Prof. Meera Rao', role: 'AI & Innovation Lead', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
  { name: 'Ms. Priya Srinivas', role: 'Entrepreneurship & Leadership Mentor', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' }
];

const schedule = [
  { time: '09:00', title: 'Registration & Breakfast' },
  { time: '10:00', title: 'Inauguration Ceremony' },
  { time: '11:00', title: 'Keynote Session' },
  { time: '13:00', title: 'Panel Discussion' },
  { time: '15:30', title: 'Networking & Awards' }
];

const highlights = [
  { title: 'Innovation Forum', text: 'Curated talks that blend leadership, engineering, and technology.', icon: Brain },
  { title: 'Leadership Circle', text: 'Connect with mentors, changemakers, and industry leaders.', icon: Rocket },
  { title: 'Premium Networking', text: 'Experience an elegant, high-touch atmosphere designed for professionals.', icon: Orbit },
  { title: 'Immersive Experience', text: 'A polished conference journey from registration to celebration.', icon: MonitorPlay }
];

function App() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());
  const [formData, setFormData] = useState({
    fullName: '', phoneNumber: '', email: '', collegeName: '', branch: '', year: '', gender: 'Female', ieeeMember: 'No', ieeeMembershipNumber: '', transactionId: '', paymentProof: null
  });
  const [message, setMessage] = useState('');
  const [participants, setParticipants] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [activeView, setActiveView] = useState('public');
  const [adminToken, setAdminToken] = useState('');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginMessage, setLoginMessage] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState({ total: 0, revenue: 0, ieee: 0, checkedIn: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone_number: '', college_name: '' });
  const [scannerActive, setScannerActive] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    fetch('/api/registrations/count').then(r => r.json()).then(d => setParticipants(d.count)).catch(() => {});
    return () => clearInterval(interval);
  }, []);

  const feeLabel = useMemo(() => formData.ieeeMember === 'Yes' ? '₹199' : '₹299', [formData.ieeeMember]);

  const filteredRegistrations = registrations.filter((entry) => {
    const term = searchTerm.toLowerCase();
    return [entry.full_name, entry.email, entry.registration_id, entry.college_name].join(' ').toLowerCase().includes(term);
  });

  function handleChange(e) {
    const { name, value, files } = e.target;
    if (name === 'paymentProof') {
      setFormData(prev => ({ ...prev, paymentProof: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null) data.append(key, value);
    });

    const response = await fetch('/api/registrations', { method: 'POST', body: data });
    const result = await response.json();
    setMessage(result.message || 'Registration submitted');
    if (response.ok) {
      setDownloadUrl(result.passUrl || '');
      setFormData({ fullName: '', phoneNumber: '', email: '', collegeName: '', branch: '', year: '', gender: 'Female', ieeeMember: 'No', ieeeMembershipNumber: '', transactionId: '', paymentProof: null });
      fetch('/api/registrations/count').then(r => r.json()).then(d => setParticipants(d.count)).catch(() => {});
    }
  }

  async function handleAdminLogin(e) {
    e.preventDefault();
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });
    const result = await response.json();
    if (response.ok) {
      setAdminToken(result.token);
      setActiveView('admin');
      setLoginMessage('Welcome to the admin dashboard');
      loadAdminData(result.token);
    } else {
      setLoginMessage(result.message || 'Login failed');
    }
  }

  async function loadAdminData(token) {
    const [registrationsResponse, statsResponse] = await Promise.all([
      fetch('/api/admin/registrations', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const registrationsData = await registrationsResponse.json();
    const statsData = await statsResponse.json();
    setRegistrations(registrationsData);
    setStats(statsData);
  }

  async function handleDelete(id) {
    const response = await fetch(`/api/admin/registrations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (response.ok) {
      loadAdminData(adminToken);
    }
  }

  function beginEdit(registration) {
    setEditingId(registration.id);
    setEditForm({
      full_name: registration.full_name,
      email: registration.email,
      phone_number: registration.phone_number,
      college_name: registration.college_name
    });
  }

  async function handleSaveEdit(id) {
    const response = await fetch(`/api/admin/registrations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(editForm)
    });
    if (response.ok) {
      setEditingId(null);
      loadAdminData(adminToken);
    }
  }

  async function handleExport() {
    const response = await fetch('/api/admin/registrations/export', { headers: { Authorization: `Bearer ${adminToken}` } });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'registrations.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleAttendanceScan(registrationId) {
    const response = await fetch('/api/admin/attendance/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ registrationId })
    });
    const result = await response.json();
    setScanMessage(response.ok ? `Checked in ${result.participant.full_name}` : result.message);
  }

  useEffect(() => {
    if (!scannerActive) return;
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render((decodedText) => {
      scanner.clear();
      setScanMessage(`Scanned ${decodedText}`);
      handleAttendanceScan(decodedText);
      setScannerActive(false);
    }, () => {});

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scannerActive]);

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <header className="sticky top-0 z-50 border-b border-purple-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-purple-700">IEEE WIE</p>
            <h1 className="text-lg font-semibold text-slate-900">Warangal Congress 2026</h1>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
            <a href="#about" className="transition hover:text-purple-700">About</a>
            <a href="#speakers" className="transition hover:text-purple-700">Speakers</a>
            <a href="#schedule" className="transition hover:text-purple-700">Schedule</a>
            <a href="#register" className="transition hover:text-purple-700">Register</a>
            <button onClick={() => setActiveView(activeView === 'admin' ? 'public' : 'admin')} className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700 transition hover:border-purple-400 hover:bg-purple-100">
              {activeView === 'admin' ? 'Public View' : 'Admin Portal'}
            </button>
          </nav>
        </div>
      </header>

      {activeView === 'public' ? (
        <main>
          <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0B0B0F_0%,#2D0A4F_45%,#6A0DAD_100%)] px-6 py-24 text-white sm:py-28 lg:px-8 lg:py-32">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute left-[-8%] top-[-10%] h-56 w-56 rounded-full bg-purple-500/30 blur-3xl" />
              <div className="absolute bottom-[-10%] right-[-4%] h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
            </div>
            <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="max-w-3xl space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-purple-100 backdrop-blur">
                  <ShieldCheck size={16} /> IEEE VEC Student Branch • Vaagdevi Engineering College, Warangal
                </div>
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.35em] text-purple-200">December 15, 2026 • Premium engineering summit</p>
                  <h2 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-7xl">Women shaping the future of technology.</h2>
                  <p className="max-w-2xl text-lg leading-8 text-slate-200">Join the Warangal Zonal WIE Congress 2026 for an elegant IEEE-inspired experience featuring visionary speakers, leadership talks, and meaningful professional connections.</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <a href="#register" className="inline-flex items-center gap-2 rounded-[14px] bg-gradient-to-r from-purple-700 to-violet-500 px-5 py-3 font-semibold text-white shadow-[0_15px_35px_rgba(106,13,173,0.35)] transition hover:scale-[1.03] hover:shadow-[0_20px_45px_rgba(106,13,173,0.45)]">Reserve your seat <ArrowRight size={18} /></a>
                  <a href="#about" className="rounded-[14px] border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20">Explore the event</a>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ['Date', '15 Dec 2026'],
                    ['Venue', 'VEC Campus'],
                    ['Capacity', `${230 - participants} slots left`]
                  ].map(([label, value]) => <div key={label} className="rounded-[18px] border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-sm text-slate-300">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>)}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
                <div className="flex items-center gap-2 text-purple-200"><Clock3 size={18} /> Countdown to congress</div>
                <div className="mt-6 grid grid-cols-4 gap-3">
                  {Object.entries(timeLeft).map(([unit, value]) => (
                    <div key={unit} className="rounded-[16px] border border-white/10 bg-black/25 p-3 text-center">
                      <p className="text-2xl font-semibold text-white">{String(value).padStart(2, '0')}</p>
                      <p className="text-[11px] uppercase tracking-[0.25em] text-slate-300">{unit}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  <div className="flex items-center gap-2 font-semibold"><Users size={16} /> Registration momentum</div>
                  <p className="mt-2">{participants}/230 participants already registered.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="about" className="bg-white px-6 py-20 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.35em] text-purple-700">About the event</p>
                <h3 className="text-3xl font-semibold text-slate-900 sm:text-4xl">A premium platform for innovation, leadership, and impact.</h3>
                <p className="max-w-2xl text-lg leading-8 text-slate-600">The Warangal Zonal WIE Congress 2026 brings together student leaders, researchers, and professionals to celebrate the power of engineering excellence and the future of women in technology.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {highlights.map(({ title, text, icon: Icon }) => (
                  <div key={title} className="rounded-[20px] border border-purple-200/70 bg-white p-5 shadow-[0_10px_35px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(106,13,173,0.15)]">
                    <div className="mb-3 inline-flex rounded-[14px] bg-purple-100 p-2 text-purple-700"><Icon size={20} /></div>
                    <h4 className="font-semibold text-slate-900">{title}</h4>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#F8FAFC] px-6 py-20 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
              {[
                ['230', 'Maximum seats'],
                ['15+', 'Expert speakers'],
                ['1', 'Fully immersive day']
              ].map(([value, label]) => (
                <div key={label} className="rounded-[20px] border border-purple-200/70 bg-white p-6 text-center shadow-[0_10px_35px_rgba(0,0,0,0.08)]">
                  <p className="text-4xl font-semibold text-purple-700">{value}</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="speakers" className="bg-white px-6 py-20 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-purple-700">Featured speakers</p>
                  <h3 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Voices shaping the future of engineering.</h3>
                </div>
              </div>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {speakers.map((speaker) => (
                  <div key={speaker.name} className="rounded-[24px] border border-purple-200/70 bg-white p-4 shadow-[0_10px_35px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(106,13,173,0.15)]">
                    <img src={speaker.image} alt={speaker.name} className="h-56 w-full rounded-[18px] object-cover" />
                    <div className="mt-4 flex items-center gap-2 text-purple-700"><BadgeCheck size={16} /> Featured Speaker</div>
                    <h4 className="mt-3 text-xl font-semibold text-slate-900">{speaker.name}</h4>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{speaker.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="schedule" className="bg-[#F8FAFC] px-6 py-20 lg:px-8">
            <div className="mx-auto max-w-7xl rounded-[28px] border border-purple-200/70 bg-white p-8 shadow-[0_10px_35px_rgba(0,0,0,0.08)]">
              <p className="text-sm uppercase tracking-[0.35em] text-purple-700">Program schedule</p>
              <h3 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">A curated day of insight, impact, and celebration.</h3>
              <div className="mt-8 space-y-4">
                {schedule.map((item) => (
                  <div key={item.time} className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-purple-200/70 bg-purple-50/70 px-4 py-4">
                    <div className="flex items-center gap-3"><CalendarDays size={18} className="text-purple-700" /><span className="font-medium text-slate-900">{item.title}</span></div>
                    <div className="flex items-center gap-2 text-slate-600"><Clock3 size={16} /> {item.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="register" className="bg-white px-6 py-20 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[28px] border border-purple-200/70 bg-[#F8FAFC] p-8 shadow-[0_10px_35px_rgba(0,0,0,0.08)]">
                <p className="text-sm uppercase tracking-[0.35em] text-purple-700">Registration</p>
                <h3 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Reserve your seat for a world-class experience.</h3>
                <p className="mt-4 text-lg leading-8 text-slate-600">Upon successful registration, you will receive a confirmation email, your unique registration ID, and an event pass for the congress.</p>
                <div className="mt-8 space-y-4 text-sm text-slate-700">
                  <div className="flex items-center gap-3"><MapPin size={16} className="text-purple-700" /> Vaagdevi Engineering College, Warangal</div>
                  <div className="flex items-center gap-3"><Phone size={16} className="text-purple-700" /> +91 9876543210</div>
                  <div className="flex items-center gap-3"><Mail size={16} className="text-purple-700" /> wie.congress@vec.edu.in</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="rounded-[28px] border border-purple-200/70 bg-white p-8 shadow-[0_10px_35px_rgba(0,0,0,0.08)]" encType="multipart/form-data">
                <div className="grid gap-4 md:grid-cols-2">
                  <input required className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Full Name" />
                  <input required className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Phone Number" />
                  <input required type="email" className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" />
                  <input required className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" name="collegeName" value={formData.collegeName} onChange={handleChange} placeholder="College Name" />
                  <input required className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" name="branch" value={formData.branch} onChange={handleChange} placeholder="Branch" />
                  <input required className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" name="year" value={formData.year} onChange={handleChange} placeholder="Year" />
                  <select className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 focus:border-purple-500 focus:outline-none" name="gender" value={formData.gender} onChange={handleChange}>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                  <select className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 focus:border-purple-500 focus:outline-none" name="ieeeMember" value={formData.ieeeMember} onChange={handleChange}>
                    <option value="Yes">IEEE Member</option>
                    <option value="No">Non-IEEE Member</option>
                  </select>
                  <input className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" name="ieeeMembershipNumber" value={formData.ieeeMembershipNumber} onChange={handleChange} placeholder="IEEE Membership Number" />
                  <input className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" name="registrationFee" value={feeLabel} readOnly />
                  <input required className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none" name="transactionId" value={formData.transactionId} onChange={handleChange} placeholder="Transaction ID" />
                  <input required type="file" accept="image/*" className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-4 py-3 text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-purple-100 file:px-3 file:py-2 file:text-purple-700" name="paymentProof" onChange={handleChange} />
                </div>
                <button type="submit" className="mt-6 inline-flex items-center gap-2 rounded-[14px] bg-gradient-to-r from-purple-700 to-violet-500 px-5 py-3 font-semibold text-white shadow-[0_15px_35px_rgba(106,13,173,0.35)] transition hover:scale-[1.03] hover:shadow-[0_20px_45px_rgba(106,13,173,0.45)]"><Ticket size={16} /> Register & Generate Pass</button>
                {message && <p className="mt-4 text-sm text-purple-700">{message}</p>}
                {downloadUrl && <a href={downloadUrl} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-purple-700" target="_blank" rel="noreferrer"><Download size={16} /> Download Event Pass</a>}
              </form>
            </div>
          </section>
        </main>
      ) : (
        <main className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="mb-6 rounded-[28px] border border-purple-200/70 bg-white p-6 shadow-[0_10px_35px_rgba(0,0,0,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-purple-700">Admin Dashboard</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900">Secure control center</h2>
              </div>
              {!adminToken ? (
                <form onSubmit={handleAdminLogin} className="flex flex-wrap gap-3">
                  <input className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-3 py-2 text-slate-900 placeholder:text-slate-500" placeholder="Username" value={loginData.username} onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} />
                  <input type="password" className="rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-3 py-2 text-slate-900 placeholder:text-slate-500" placeholder="Password" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} />
                  <button type="submit" className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-700 to-violet-500 px-4 py-2 font-semibold text-white"><LogIn size={16} /> Login</button>
                </form>
              ) : (
                <button onClick={() => setAdminToken('')} className="flex items-center gap-2 rounded-full border border-purple-200 px-4 py-2 text-slate-700"><LogOut size={16} /> Logout</button>
              )}
            </div>
            {loginMessage && <p className="mt-4 text-sm text-purple-700">{loginMessage}</p>}
          </div>

          {adminToken ? (
            <>
              <div className="mb-8 grid gap-4 md:grid-cols-4">
                {[
                  ['Total Registrations', stats.total],
                  ['Revenue', `₹${stats.revenue || 0}`],
                  ['IEEE Members', stats.ieee],
                  ['Checked In', stats.checkedIn]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[20px] border border-purple-200/70 bg-white p-4 shadow-[0_10px_35px_rgba(0,0,0,0.08)]">
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-purple-200/70 bg-white p-4 shadow-[0_10px_35px_rgba(0,0,0,0.08)]">
                <input className="w-full max-w-md rounded-[12px] border border-purple-200 bg-[#F8FAFC] px-3 py-2 text-slate-900 placeholder:text-slate-500" placeholder="Search participants" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <button onClick={handleExport} className="rounded-full bg-gradient-to-r from-purple-700 to-violet-500 px-4 py-2 font-semibold text-white">Export Excel</button>
              </div>

              <div className="mb-6 rounded-[24px] border border-purple-200/70 bg-white p-6 shadow-[0_10px_35px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">Attendance Scanner</h3>
                  <button onClick={() => setScannerActive(true)} className="flex items-center gap-2 rounded-full border border-purple-200 px-4 py-2 text-slate-700"><ScanLine size={16} /> Start Scan</button>
                </div>
                {scannerActive ? <div id="reader" className="mt-4" /> : <p className="mt-4 text-sm text-slate-500">Use the scanner to check in participants with their QR code.</p>}
                {scanMessage && <p className="mt-4 text-sm text-purple-700">{scanMessage}</p>}
              </div>

              <div className="overflow-x-auto rounded-[24px] border border-purple-200/70 bg-white shadow-[0_10px_35px_rgba(0,0,0,0.08)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-purple-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Registration ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">College</th>
                      <th className="px-4 py-3">Fee</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((entry) => (
                      <tr key={entry.id} className="border-t border-purple-100">
                        <td className="px-4 py-3 text-slate-700">{entry.registration_id}</td>
                        <td className="px-4 py-3 text-slate-700">{entry.full_name}</td>
                        <td className="px-4 py-3 text-slate-700">{entry.email}</td>
                        <td className="px-4 py-3 text-slate-700">{entry.college_name}</td>
                        <td className="px-4 py-3 text-slate-700">₹{entry.registration_fee}</td>
                        <td className="px-4 py-3">
                          {editingId === entry.id ? (
                            <div className="flex flex-wrap gap-2">
                              <input className="rounded border border-purple-200 bg-[#F8FAFC] px-2 py-1 text-slate-900" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                              <input className="rounded border border-purple-200 bg-[#F8FAFC] px-2 py-1 text-slate-900" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                              <input className="rounded border border-purple-200 bg-[#F8FAFC] px-2 py-1 text-slate-900" value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} />
                              <input className="rounded border border-purple-200 bg-[#F8FAFC] px-2 py-1 text-slate-900" value={editForm.college_name} onChange={(e) => setEditForm({ ...editForm, college_name: e.target.value })} />
                              <button onClick={() => handleSaveEdit(entry.id)} className="rounded bg-purple-700 px-3 py-1 text-white">Save</button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => beginEdit(entry)} className="rounded bg-purple-100 px-3 py-1 text-purple-700">Edit</button>
                              <button onClick={() => handleDelete(entry.id)} className="rounded bg-rose-600 px-3 py-1 text-white">Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </main>
      )}

      <footer className="bg-[#0B0B0F] px-6 py-8 text-center text-sm text-slate-300 lg:px-8">
        <p>© 2026 IEEE VEC Student Branch • Warangal Zonal WIE Congress</p>
      </footer>
    </div>
  );
}

function getTimeLeft() {
  const diff = eventDate - new Date();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60)
  };
}

export default App;
