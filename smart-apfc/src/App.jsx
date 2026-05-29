export default function SmartAPFCDashboard() {
  const data = {
    voltage: 220.4,
    current: 3.25,
    power: 580,
    pf: 0.98,
    apparent: 592,
    reactive: 110,
    cap: '48.5uF',
    relay: ['ON', 'ON', 'OFF', 'ON'],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-wide">
              SMART APFC DASHBOARD
            </h1>
            <p className="text-cyan-200 mt-2 text-lg">
              Automatic Power Factor Correction Monitoring System
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-cyan-400/30 px-6 py-4 rounded-3xl shadow-2xl">
            <p className="text-sm text-cyan-100">System Status</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse"></div>
              <span className="font-semibold text-lg">ONLINE</span>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* VOLTAGE */}
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-6 shadow-2xl hover:scale-105 transition-all duration-300">
            <p className="text-lg font-semibold opacity-90">Voltage</p>
            <h2 className="text-5xl font-bold mt-4">{data.voltage}</h2>
            <p className="text-xl mt-2">Volt</p>
          </div>

          {/* CURRENT */}
          <div className="bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl p-6 shadow-2xl hover:scale-105 transition-all duration-300">
            <p className="text-lg font-semibold opacity-90">Current</p>
            <h2 className="text-5xl font-bold mt-4">{data.current}</h2>
            <p className="text-xl mt-2">Ampere</p>
          </div>

          {/* POWER */}
          <div className="bg-gradient-to-br from-pink-500 to-red-600 rounded-3xl p-6 shadow-2xl hover:scale-105 transition-all duration-300">
            <p className="text-lg font-semibold opacity-90">Active Power</p>
            <h2 className="text-5xl font-bold mt-4">{data.power}</h2>
            <p className="text-xl mt-2">Watt</p>
          </div>

          {/* PF */}
          <div className="bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl p-6 shadow-2xl hover:scale-105 transition-all duration-300">
            <p className="text-lg font-semibold opacity-90">Power Factor</p>
            <h2 className="text-5xl font-bold mt-4">{data.pf}</h2>
            <p className="text-xl mt-2">Cos φ</p>
          </div>
        </div>

        {/* SECOND SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
          {/* POWER DETAILS */}
          <div className="xl:col-span-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-cyan-300">
              Power Monitoring
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/40 rounded-2xl p-5 border border-cyan-400/20">
                <p className="text-cyan-200 text-sm">Apparent Power</p>
                <h3 className="text-4xl font-bold mt-3">{data.apparent} VA</h3>
              </div>

              <div className="bg-slate-900/40 rounded-2xl p-5 border border-pink-400/20">
                <p className="text-pink-200 text-sm">Reactive Power</p>
                <h3 className="text-4xl font-bold mt-3">{data.reactive} VAR</h3>
              </div>

              <div className="bg-slate-900/40 rounded-2xl p-5 border border-green-400/20 md:col-span-2">
                <p className="text-green-200 text-sm">Capacitor Bank Active</p>
                <h3 className="text-5xl font-bold mt-3 text-green-300">
                  {data.cap}
                </h3>
              </div>
            </div>
          </div>

          {/* RELAY STATUS */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-yellow-300">
              Relay Status
            </h2>

            <div className="space-y-4">
              {data.relay.map((status, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-slate-900/40 p-4 rounded-2xl"
                >
                  <span className="text-lg font-medium">Relay R{index + 1}</span>

                  <div
                    className={`px-4 py-2 rounded-xl font-bold ${
                      status === 'ON'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LCD DISPLAY */}
        <div className="mt-8 bg-black rounded-3xl p-8 border-4 border-cyan-500 shadow-[0_0_40px_rgba(0,255,255,0.3)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-cyan-300">LCD Monitor Simulation</h2>
            <div className="text-green-400 font-semibold animate-pulse">
              LIVE DATA
            </div>
          </div>

          <div className="bg-green-950 text-green-400 rounded-2xl p-6 font-mono text-xl leading-loose border border-green-500 shadow-inner">
            <p>V: 220.4V   PF: 0.98</p>
            <p>I: 3.25A    S : 592VA</p>
            <p>P: 580W     Q : 110VAR</p>
            <p>CAP: 48.5uF</p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-8 text-center text-cyan-200 opacity-80">
          <p>
            SMART APFC Monitoring System • Firebase Realtime Database • ESP8266
          </p>
        </div>
      </div>
    </div>
  );
}