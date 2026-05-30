export default function OfflinePage() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="text-center text-white px-6">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold tracking-wider">SISTEM OFFLINE</h1>
        <p className="mt-2 text-gray-400 text-sm">
          Koneksi internet terputus atau server tidak dapat dijangkau.
        </p>
        <p className="text-gray-500 text-xs mt-4">
          Sistem akan otomatis kembali saat koneksi pulih.
        </p>
      </div>
    </div>
  );
}