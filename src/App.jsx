import { useState, useEffect, useCallback } from 'react';
import { ref, onValue } from "firebase/database";
import { db, app } from "./firebase";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { useNetworkStatus } from "./hooks/useNetworkStatus";
import DeviceOfflinePage from "./components/DeviceOfflinePage";

export default function App() {
  // ============ STATUS JARINGAN INTERNET ============
  const isOnline = true; 

  // ============ DETEKSI PERANGKAT OFFLINE ===========
  const DEVICE_TIMEOUT = 20000; // 20 detik

  // Ambil timestamp terakhir dari localStorage (default 0 jika belum ada)
  const getStoredLastUpdate = () => {
    const stored = localStorage.getItem('apfc_lastUpdate');
    return stored ? parseInt(stored, 10) : 0;
  };

  const [lastUpdate, setLastUpdate] = useState(getStoredLastUpdate);

  // Inisialisasi deviceOnline langsung berdasarkan selisih waktu saat ini
  const [deviceOnline, setDeviceOnline] = useState(() => {
    const last = getStoredLastUpdate();
    return (Date.now() - last) < DEVICE_TIMEOUT;
  });

  // Fungsi untuk update lastUpdate + simpan ke localStorage
  const updateLastUpdate = (timestamp) => {
    localStorage.setItem('apfc_lastUpdate', timestamp.toString());
    setLastUpdate(timestamp);
  };

  // Cek deviceOnline setiap 1 detik (agar perubahan real-time tanpa refresh)
  useEffect(() => {
    const timer = setInterval(() => {
      setDeviceOnline((Date.now() - lastUpdate) < DEVICE_TIMEOUT);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  // =========================
  // AUTH
  // =========================
  const auth = getAuth(app);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // =========================
  // DATA LCD
  // =========================
  const [lcd, setLcd] = useState({
    line1: "V:0.0V PF:0.00",
    line2: "I:0.00A S :0VA",
    line3: "P:0W Q :0VAR",
    line4: "CAP:OFF",
  });
  const [chartData, setChartData] = useState([]);

  // =========================
  // AUTH LISTENER
  // =========================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // =========================
  // LOGIN
  // =========================
 const login = async () => {
  try {
    setLoginError("");
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    console.log("Login error:", err.code); // debug
    if (err.code === "auth/network-request-failed") {
      setLoginError("Tidak ada koneksi internet. Periksa jaringan Anda.");
    } else if (
      err.code === "auth/user-not-found" ||
      err.code === "auth/wrong-password" ||
      err.code === "auth/invalid-credential"
    ) {
      setLoginError("Email atau password salah.");
    } else {
      setLoginError("Gagal login: " + err.message);
    }
  }
};

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {
  await signOut(auth);
};

  // =========================
  // FIREBASE REALTIME DB
  // =========================
  useEffect(() => {
   if (!user) return;
  const dataRef = ref(db, "PFC");
  const unsub = onValue(dataRef, (snapshot) => {
    const val = snapshot.val();
    console.log("Data dari Firebase:", val); // <-- DEBUG
    if (!val) return;

      setLcd({
        line1: val.line1 || "",
        line2: val.line2 || "",
        line3: val.line3 || "",
        line4: val.line4 || "",
      });

      const voltage = parseFloat(val.line1?.match(/V:\s*([\d.]+)/)?.[1]) || 0;
      const pf = parseFloat(val.line1?.match(/PF:\s*([\d.]+)/)?.[1]) || 0;
      const current = parseFloat(val.line2?.match(/I:\s*([\d.]+)/)?.[1]) || 0;
      const apparent = parseFloat(val.line2?.match(/S\s*:\s*([\d.]+)/)?.[1]) || 0;
      const power = parseFloat(val.line3?.match(/P:\s*([\d.]+)/)?.[1]) || 0;
      const reactive = parseFloat(val.line3?.match(/Q\s*:\s*([\d.]+)/)?.[1]) || 0;

      setChartData((prev) => {
        const newData = [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            voltage,
            pf,
            current,
            apparent,
            power,
            reactive,
          },
        ];
        return newData.slice(-20);
      });

    const deviceTimestamp = val.timestamp ? parseInt(val.timestamp) * 1000 : Date.now();
    console.log("deviceTimestamp:", deviceTimestamp, "Date.now:", Date.now()); // DEBUG
    updateLastUpdate(deviceTimestamp);
  });
  return () => unsub();
}, [user]);

  // =========================
  // PARSING DISPLAY
  // =========================
  const voltage = lcd.line1.match(/V:\s*([\d.]+V?)/)?.[1] || "0.0V";
  const pf = lcd.line1.match(/PF:\s*([\d.]+)/)?.[1] || "0.00";
  const current = lcd.line2.match(/I:\s*([\d.]+A?)/)?.[1] || "0.00A";
  const apparent = lcd.line2.match(/S\s*:\s*([\d.]+VA?)/)?.[1] || "0VA";
  const power = lcd.line3.match(/P:\s*([\d.]+W?)/)?.[1] || "0W";
  const reactive = lcd.line3.match(/Q\s*:\s*([\d.]+VAR?)/)?.[1] || "0VAR";

  // =========================
  // RENDER
  // =========================
  // 1. Internet mati → halaman OfflinePage
  if (!isOnline) {
    return <OfflinePage />;
  }

  // 2. Belum login → halaman login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-indigo-950 to-violet-950">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-[380px] border border-white/20">
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
            APFC SYSTEM LOGIN
          </h1>
          <p className="text-center text-slate-300 text-sm mb-8">
            AUTOMATIC POWER FACTOR CORRECTION
          </p>
          <input
            className="w-full p-3 mb-4 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Email"
            type="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full p-3 mb-4 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          {loginError && (
            <p className="text-red-400 text-sm mb-4 text-center bg-red-900/30 py-2 rounded-lg">
              {loginError}
            </p>
          )}
          <button
            onClick={login}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 p-3 rounded-lg font-bold transition-all duration-200 shadow-lg"
          >
            LOGIN
          </button>
          <p className="text-xs text-center text-slate-100 mt-6">
            © 2026 — APFC MONITORING SYSTEM
          </p>
        </div>
      </div>
    );
  }

  // 3. Perangkat IoT offline → halaman DeviceOfflinePage
  if (!deviceOnline) {
    return <DeviceOfflinePage />;
  }

  // 4. Semua normal → dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-lime-950 to-cyan-900 relative overflow-hidden">
      {/* Watermark */}
      <div
        className="absolute inset-0 pointer-events-none select-none z-0 opacity-10 md:opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="30">
              <pattern id="wm" width="200" height="30" patternUnits="userSpaceOnUse">
                <g fill="white" font-family="monospace" font-size="12" font-weight="bold">
                  <text x="0" y="22">cos φ</text>
                  <text x="50" y="22">APFC</text>
                  <text x="95" y="22">λ</text>
                  <text x="110" y="22">PFC</text>
                  <g stroke="white" stroke-width="1.2" transform="translate(37,5)">
                    <line x1="4" y1="18" x2="4" y2="8"/>
                    <line x1="1" y1="18" x2="7" y2="18"/>
                    <line x1="2" y1="14" x2="6" y2="14"/>
                    <line x1="3" y1="10" x2="5" y2="10"/>
                    <line x1="4" y1="8" x2="4" y2="5"/>
                    <circle cx="4" cy="4" r="1.2" fill="white"/>
                  </g>
                  <text x="80" y="22" font-size="13">⚡</text>
                  <text x="165" y="22" font-size="13">⚠</text>
                </g>
              </pattern>
              <rect width="100%" height="100%" fill="url(#wm)"/>
            </svg>
          `)}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto',
        }}
      />
      <svg className="absolute bottom-0 left-0 w-full h-32 opacity-5" preserveAspectRatio="none" viewBox="0 0 1200 120">
        <path d="M0,64L80,69C160,75,240,85,320,80C400,75,480,53,560,48C640,43,720,53,800,64C880,75,960,85,1040,80C1120,75,1200,53,1200,53L1200,120L0,120Z" fill="white" />
      </svg>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-lime-950 to-cyan-900">
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-orange-500 bg-clip-text text-transparent">
              APFC MONITORING SYSTEM FOR RESIDENTIAL LOADS
            </h1>
            <p className="text-red-200 text-sm md:text-base mt-2 border-b border-white/10 inline-block pb-1 px-4">
              SISTEM PEMANTAUAN KOREKSI FAKTOR DAYA OTOMATIS PADA BEBAN RUMAH TANGGA
            </p>
            <button
              onClick={logout}
              className="mt-4 text-red-400 hover:text-red-300 text-sm bg-black/100 px-4 py-1 rounded-full transition"
            >
              LOGOUT ↺
            </button>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-cyan-400 shadow-lg">
              <p className="text-cyan-500 text-sm font-bold uppercase tracking-wider">VOLTAGE ( V )</p>
              <h1 className="text-4xl font-mono mt-1 text-white">{voltage}</h1>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-emerald-400 shadow-lg">
              <p className="text-emerald-500 text-sm font-bold uppercase tracking-wider">CURRENT ( A )</p>
              <h1 className="text-4xl font-mono mt-1 text-white">{current}</h1>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-violet-400 shadow-lg">
              <p className="text-violet-500 text-sm font-bold uppercase tracking-wider">POWER FACTOR ( cos φ )</p>
              <h1 className="text-4xl font-mono mt-1 text-white">{pf}</h1>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-orange-400 shadow-lg">
              <p className="text-orange-500 text-sm font-bold uppercase tracking-wider">ACTIVE POWER ( W )</p>
              <h1 className="text-4xl font-mono mt-1 text-white">{power}</h1>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-sky-400 shadow-lg">
              <p className="text-sky-500 text-sm font-bold uppercase tracking-wider">APPARENT POWER ( VA )</p>
              <h1 className="text-4xl font-mono mt-1 text-white">{apparent}</h1>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-pink-400 shadow-lg">
              <p className="text-pink-500 text-sm font-bold uppercase tracking-wider"> REACTIVE POWER ( VAR )</p>
              <h1 className="text-4xl font-mono mt-1 text-white">{reactive}</h1>
            </div>
          </div>

          {/* Cap bank */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 mb-10 border-l-4 border-r-4 border-amber-500 shadow-lg">
            <p className="text-amber-500 text-sm font-bold uppercase tracking-wider">CAP. BANK STATUS</p>
            <h1 className="text-3xl font-mono mt-1 text-white">{lcd.line4}</h1>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Current Chart */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-l-4 border-b-4 border-emerald-500">
              <h2 className="text-emerald-500 font-bold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                CURRENT (Ampere)
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#ffff" tick={{ fontSize: 14 }} angle={-35} textAnchor="end" height={50} />
                  <YAxis stroke="#ffff" />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#ffff" }} />
                  <Line type="monotone" dataKey="current" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* PF Chart */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-l-4 border-b-4 border-violet-500">
              <h2 className="text-violet-500 font-bold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-violet-400 rounded-full"></span>
                POWER FACTOR (cos φ)
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#ffff" tick={{ fontSize: 14 }} angle={-35} textAnchor="end" height={50} />
                  <YAxis stroke="#ffff" domain={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#ffff" }} />
                  <Line type="monotone" dataKey="pf" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Apparent Power Chart */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-l-4 border-b-4 border-cyan-500">
              <h2 className="text-cyan-500 font-bold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                APPARENT POWER (VA)
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#ffff" tick={{ fontSize: 14 }} angle={-35} textAnchor="end" height={50} />
                  <YAxis stroke="#ffff" />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#ffff" }} />
                  <Line type="monotone" dataKey="apparent" stroke="#06b6d4" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Reactive Power Chart */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-l-4 border-b-4 border-pink-500">
              <h2 className="text-pink-500 font-bold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-pink-400 rounded-full"></span>
                REACTIVE POWER (VAR)
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#ffff" tick={{ fontSize: 14 }} angle={-35} textAnchor="end" height={50} />
                  <YAxis stroke="#ffff" />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#ffff" }}/>
                  <Line type="monotone" dataKey="reactive" stroke="#ec4899" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <footer className="mt-12 text-center text-slate-400 text-xs border-t border-white/10 pt-6">
            <p>© 2026 — Sistem Pemantauan APFC Berbasis IoT</p>
          </footer>
        </div>
      </div>
    </div>
  );
}