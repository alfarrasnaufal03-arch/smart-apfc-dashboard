import React, { useEffect, useState } from "react";
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
} from "recharts";

export default function App() {
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
      setLoginError("Email atau password salah");
    }
  };

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
  // LOGIN PAGE
  // =========================
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

  // =========================
  // MAIN DASHBOARD - TUNGGAL, RAPI, RESPONSIF
  // =========================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-lime-950 to-cyan-900 overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-orange-500 bg-clip-text text-transparent">
            APFC MONITORING SYSTEM FOR RESIDENTIAL LOADS
          </h1>
          <p className="text-red-200 text-sm md:text-base mt-2 border-b border-white/10 inline-block pb-1 px-4">
            SISTEM PEMANTAUAN PERBAIKAN FAKTOR DAYA OTOMATIS BEBAN RUMAH TANGGA
          </p>
          <button
            onClick={logout}
            className="mt-4 text-red-400 hover:text-red-300 text-sm bg-black/30 px-4 py-1 rounded-full transition"
          >
            LOGOUT ↺
          </button>
        </div>

        {/* PARAMETER CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-cyan-400">
            <p className="text-cyan-500 text-sm font-bold uppercase">VOLTAGE (V)</p>
            <h1 className="text-4xl font-mono mt-1 text-white">{voltage}</h1>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-emerald-400">
            <p className="text-emerald-500 text-sm font-bold uppercase">CURRENT (A)</p>
            <h1 className="text-4xl font-mono mt-1 text-white">{current}</h1>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-violet-400">
            <p className="text-violet-500 text-sm font-bold uppercase">POWER FACTOR (cos φ)</p>
            <h1 className="text-4xl font-mono mt-1 text-white">{pf}</h1>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-orange-400">
            <p className="text-orange-500 text-sm font-bold uppercase">ACTIVE POWER (W)</p>
            <h1 className="text-4xl font-mono mt-1 text-white">{power}</h1>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-sky-400">
            <p className="text-sky-500 text-sm font-bold uppercase">APPARENT POWER (VA)</p>
            <h1 className="text-4xl font-mono mt-1 text-white">{apparent}</h1>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border-l-4 border-r-4 border-pink-400">
            <p className="text-pink-500 text-sm font-bold uppercase">REACTIVE POWER (VAR)</p>
            <h1 className="text-4xl font-mono mt-1 text-white">{reactive}</h1>
          </div>
        </div>

        {/* KAPASITOR */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 mb-10 border-l-4 border-r-4 border-amber-500">
          <p className="text-amber-500 text-sm font-bold uppercase">CAP. BANK STATUS</p>
          <h1 className="text-3xl font-mono mt-1 text-white">{lcd.line4}</h1>
        </div>

        {/* CHART 2 KOLOM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current */}
          <div className="bg-slate-900/50 rounded-2xl p-4 shadow-xl border-l-4 border-b-4 border-emerald-500">
            <h2 className="text-emerald-500 font-bold mb-3">CURRENT (Ampere)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#fff" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px" }} labelStyle={{ color: "#fff" }} itemStyle={{ color: "#fff" }} />
                <Line type="monotone" dataKey="current" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* PF */}
          <div className="bg-slate-900/50 rounded-2xl p-4 shadow-xl border-l-4 border-b-4 border-violet-500">
            <h2 className="text-violet-500 font-bold mb-3">POWER FACTOR (cos φ)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#fff" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke="#fff" domain={[0, 1]} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px" }} labelStyle={{ color: "#fff" }} itemStyle={{ color: "#fff" }} />
                <Line type="monotone" dataKey="pf" stroke="#8b5cf6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Apparent */}
          <div className="bg-slate-900/50 rounded-2xl p-4 shadow-xl border-l-4 border-b-4 border-cyan-500">
            <h2 className="text-cyan-500 font-bold mb-3">APPARENT POWER (VA)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#fff" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px" }} labelStyle={{ color: "#fff" }} itemStyle={{ color: "#fff" }} />
                <Line type="monotone" dataKey="apparent" stroke="#06b6d4" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Reactive */}
          <div className="bg-slate-900/50 rounded-2xl p-4 shadow-xl border-l-4 border-b-4 border-pink-500">
            <h2 className="text-pink-500 font-bold mb-3">REACTIVE POWER (VAR)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#fff" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px" }} labelStyle={{ color: "#fff" }} itemStyle={{ color: "#fff" }} />
                <Line type="monotone" dataKey="reactive" stroke="#ec4899" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="mt-12 text-center text-slate-400 text-xs border-t border-white/10 pt-6">
          <p>© 2026 — Sistem Pemantauan APFC Berbasis IoT</p>
        </footer>
      </div>
    </div>
  );
}