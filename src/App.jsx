import { useState, useEffect, useCallback, useRef } from 'react';
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
  // ============ NETWORK STATUS ============
  const isOnline = true; 

  // ============ DEVICE OFFLINE DETECTION ===========
  const DEVICE_TIMEOUT = 20000; // 20 seconds

  const getStoredLastUpdate = () => {
    const stored = localStorage.getItem('apfc_lastUpdate');
    return stored ? parseInt(stored, 10) : 0;
  };

  const [lastUpdate, setLastUpdate] = useState(getStoredLastUpdate);
  const [deviceOnline, setDeviceOnline] = useState(() => {
    const last = getStoredLastUpdate();
    return (Date.now() - last) < DEVICE_TIMEOUT;
  });

  const updateLastUpdate = (timestamp) => {
    localStorage.setItem('apfc_lastUpdate', timestamp.toString());
    setLastUpdate(timestamp);
  };

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
  // LCD DATA
  // =========================
  const [lcd, setLcd] = useState({
    line1: "V:0.0V PF:0.00",
    line2: "I:0.00A S :0VA",
    line3: "P:0W Q :0VAR",
    line4: "CAP:OFF",
  });
  
  // STORE ALL CHART DATA (no limit)
  const [chartData, setChartData] = useState([]);

  // =========================
  // BOTTOM NAVIGATION STATE
  // =========================
  const [activeTab, setActiveTab] = useState("parameters");

  // =========================
  // HISTORY SLIDER STATE
  // =========================
  const WINDOW_SIZE = 20; // number of data points to display
  const [windowStart, setWindowStart] = useState(0);
  const [isUserPanning, setIsUserPanning] = useState(false);
  const prevDataLengthRef = useRef(0);

  // Auto-slide to latest if slider is at the rightmost position
  useEffect(() => {
    const currentLen = chartData.length;
    if (currentLen > prevDataLengthRef.current && !isUserPanning) {
      const maxStart = Math.max(0, currentLen - WINDOW_SIZE);
      const prevMaxStart = Math.max(0, prevDataLengthRef.current - WINDOW_SIZE);
      if (windowStart === prevMaxStart || windowStart === prevDataLengthRef.current - WINDOW_SIZE) {
        setWindowStart(maxStart);
      }
    }
    prevDataLengthRef.current = currentLen;
  }, [chartData.length, windowStart, isUserPanning]);

  // Get data to display based on slider window
  const getDisplayData = () => {
    if (chartData.length <= WINDOW_SIZE) return chartData;
    const start = Math.min(windowStart, chartData.length - WINDOW_SIZE);
    return chartData.slice(start, start + WINDOW_SIZE);
  };

  const handleSliderChange = (e) => {
    const newStart = parseInt(e.target.value, 10);
    setWindowStart(newStart);
    setIsUserPanning(true);
  };

  const goToLatest = () => {
    const maxStart = Math.max(0, chartData.length - WINDOW_SIZE);
    setWindowStart(maxStart);
    setIsUserPanning(false);
  };

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
      if (err.code === "auth/network-request-failed") {
        setLoginError("No internet connection. Please check your network.");
      } else if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setLoginError("Invalid email or password.");
      } else {
        setLoginError("Login failed: " + err.message);
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

      // Store ALL data (no slice limit)
      setChartData((prev) => [
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
      ]);

      const deviceTimestamp = val.timestamp ? parseInt(val.timestamp) * 1000 : Date.now();
      updateLastUpdate(deviceTimestamp);
    });
    return () => unsub();
  }, [user]);

  // =========================
  // PARSING DISPLAY VALUES
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
  if (!isOnline) {
    return <OfflinePage />;
  }

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

  if (!deviceOnline) {
    return <DeviceOfflinePage />;
  }

  const displayData = getDisplayData();
  const maxStart = Math.max(0, chartData.length - WINDOW_SIZE);
  const showSlider = chartData.length > WINDOW_SIZE;
  
  // Prepare historical data for table (latest first)
  const historicalData = [...chartData].reverse();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-lime-950 to-cyan-900 relative pb-20">
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-orange-500 bg-clip-text text-transparent">
            APFC MONITORING SYSTEM FOR RESIDENTIAL LOADS
          </h1>
          <p className="text-red-200 text-xs md:text-sm mt-1">
            AUTOMATIC POWER FACTOR CORRECTION MONITORING SYSTEM
          </p>
        </div>

        {/* CONTENT BASED ON ACTIVE TAB */}
        <div className="mt-4">
          {activeTab === "parameters" && (
            <div>
              {/* 6 parameter cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
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
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-sky-400 shadow-lg">
                  <p className="text-sky-500 text-sm font-bold uppercase tracking-wider">APPARENT POWER ( VA )</p>
                  <h1 className="text-4xl font-mono mt-1 text-white">{apparent}</h1>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-orange-400 shadow-lg">
                  <p className="text-orange-500 text-sm font-bold uppercase tracking-wider">ACTIVE POWER ( W )</p>
                  <h1 className="text-4xl font-mono mt-1 text-white">{power}</h1>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-pink-400 shadow-lg">
                  <p className="text-pink-500 text-sm font-bold uppercase tracking-wider">REACTIVE POWER ( VAR )</p>
                  <h1 className="text-4xl font-mono mt-1 text-white">{reactive}</h1>
                </div>
              </div>
              {/* Capacitor Bank Status */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-amber-500 shadow-lg mb-8">
                <p className="text-amber-500 text-sm font-bold uppercase tracking-wider">CAP. BANK STATUS</p>
                <h1 className="text-3xl font-mono mt-1 text-white">{lcd.line4}</h1>
              </div>

              {/* Historical Data Table */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/10">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">
                    📋 Historical Data Log
                  </h2>
                  <span className="text-xs text-slate-100 bg-slate-800/50 px-3 py-1 rounded-full">
                    Total Records: {chartData.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <div className="max-h-[400px] overflow-y-auto custom-scroll">
                    <table className="w-full text-sm text-left text-slate-200">
                      <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm text-xs uppercase font-semibold tracking-wider border-b border-white/20">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Time</th>
                          <th className="px-4 py-3">Voltage (V)</th>
                          <th className="px-4 py-3">Current (A)</th>
                          <th className="px-4 py-3">PF (cos φ)</th>
                          <th className="px-4 py-3">Apparent (VA)</th>
                          <th className="px-4 py-3">Active (W)</th>
                          <th className="px-4 py-3">Reactive (VAR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {historicalData.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="text-center py-8 text-slate-400">
                              No historical data available yet. Waiting for device...
                            </td>
                          </tr>
                        ) : (
                          historicalData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-2 font-mono text-xs text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-2 font-mono text-xs">{row.time}</td>
                              <td className="px-4 py-2 font-mono text-sm text-cyan-300">{row.voltage.toFixed(1)}</td>
                              <td className="px-4 py-2 font-mono text-sm text-emerald-300">{row.current.toFixed(2)}</td>
                              <td className="px-4 py-2 font-mono text-sm text-violet-300">{row.pf.toFixed(3)}</td>
                              <td className="px-4 py-2 font-mono text-sm text-sky-300">{row.apparent.toFixed(1)}</td>
                              <td className="px-4 py-2 font-mono text-sm text-orange-300">{row.power.toFixed(1)}</td>
                              <td className="px-4 py-2 font-mono text-sm text-pink-300">{row.reactive.toFixed(1)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-right text-[11px] text-slate-100 mt-3 italic">
                  Latest data shown first • Real-time updates
                </p>
              </div>
            </div>
          )}

          {activeTab === "charts" && (
            <div>
              {/* Slider and Latest button */}
              {showSlider && (
                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-4 mb-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-white text-sm">
                      <span>📜 Slide to view previous data (Total {chartData.length} data points)</span>
                      <button
                        onClick={goToLatest}
                        className="bg-cyan-600 hover:bg-cyan-700 px-3 py-1 rounded-full text-xs font-semibold transition"
                      >
                        Press for latest data ⚡
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={maxStart}
                      value={windowStart}
                      onChange={handleSliderChange}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-100">
                      <span>Start (oldest)</span>
                      <span>Latest</span>
                    </div>
                  </div>
                </div>
              )}
              {!showSlider && chartData.length > 0 && (
                <div className="text-center text-slate-300 text-sm mb-3">
                  Showing {chartData.length} data points (not enough for slider yet)
                </div>
              )}
              {chartData.length === 0 && (
                <div className="text-center text-slate-400 py-10">Waiting for data from device...</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Current Chart */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-l-4 border-b-4 border-emerald-500">
                  <h2 className="text-emerald-500 font-bold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                    Current (Ampere)
                  </h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={displayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" stroke="#fff" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={50} />
                      <YAxis stroke="#fff" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#fff" }} />
                      <Line type="monotone" dataKey="current" stroke="#10b981" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* PF Chart */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-l-4 border-b-4 border-violet-500">
                  <h2 className="text-violet-500 font-bold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-violet-400 rounded-full"></span>
                    Power Factor (cos φ)
                  </h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={displayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" stroke="#fff" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={50} />
                      <YAxis stroke="#fff" domain={[0, 1]} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#fff" }} />
                      <Line type="monotone" dataKey="pf" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Apparent Power Chart */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-l-4 border-b-4 border-cyan-500">
                  <h2 className="text-cyan-500 font-bold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                    Apparent Power (Volt-Ampere)
                  </h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={displayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" stroke="#fff" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={50} />
                      <YAxis stroke="#fff" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#fff" }} />
                      <Line type="monotone" dataKey="apparent" stroke="#06b6d4" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Reactive Power Chart */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 shadow-xl border-l-4 border-b-4 border-pink-500">
                  <h2 className="text-pink-500 font-bold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-pink-400 rounded-full"></span>
                    Reactive Power (Volt-Ampere Reactive)
                  </h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={displayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" stroke="#fff" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={50} />
                      <YAxis stroke="#fff" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#fff" }} />
                      <Line type="monotone" dataKey="reactive" stroke="#ec4899" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === "info" && (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">ℹ️ System Information</h2>
              <p className="text-slate-300">Device Status: {deviceOnline ? "🟢 Online" : "🔴 Offline"}</p>
              <p className="text-slate-300 mt-2">Last Data Received: {new Date(lastUpdate).toLocaleString()}</p>
              <p className="text-slate-300 mt-2">Total Data Points Stored: {chartData.length}</p>
              <button
                onClick={logout}
                className="mt-6 bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full text-white font-semibold transition"
              >
                LOGOUT ↺
              </button>
              <p className="text-xs text-slate-400 mt-6">© 2026 — Automatic Power Factor Correction Monitoring System</p>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM NAVIGATION MENU */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/70 backdrop-blur-lg border-t border-white/20 shadow-lg z-20">
        <div className="flex justify-around items-center max-w-md mx-auto py-2">
          <button
            onClick={() => setActiveTab("parameters")}
            className={`flex flex-col items-center px-4 py-1 rounded-full transition ${
              activeTab === "parameters" ? "text-cyan-400" : "text-slate-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <span className="text-xs mt-1">Live Data</span>
          </button>
          <button
            onClick={() => setActiveTab("charts")}
            className={`flex flex-col items-center px-4 py-1 rounded-full transition ${
              activeTab === "charts" ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-xs mt-1">Graph Monitor</span>
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`flex flex-col items-center px-4 py-1 rounded-full transition ${
              activeTab === "info" ? "text-amber-400" : "text-slate-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12z" />
            </svg>
            <span className="text-xs mt-1">Info</span>
          </button>
        </div>
      </div>
    </div>
  );
}