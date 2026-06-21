export default function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>report-web</h1>
      <p>سامانه گزارش‌گیری و تحلیل هوشمند (نمونه اولیه v1)</p>
      <p>API base: {import.meta.env.VITE_API_BASE}</p>
      <p>Auth mode: {import.meta.env.VITE_AUTH_MODE}</p>
    </main>
  );
}
