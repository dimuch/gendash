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
        Live demo data from the free <a href="https://restcountries.com" target="_blank" rel="noreferrer">REST Countries API</a>.
        Upload a CSV above, or point <code>getConnector()</code> at Postgres or a Disqover instance to use your own.
      </footer>
    </main>
  );
}
