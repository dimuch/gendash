import { Dashboard } from "../components/Dashboard";

export default function Home() {
  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">GenDash</div>
        <div className="tagline">Ask a question, get a live dashboard — no SQL, no setup.</div>
      </header>
      <Dashboard />
      <footer className="foot">
        Demo data source. Point <code>getConnector()</code> at a read-only Postgres to use your own.
      </footer>
    </main>
  );
}
