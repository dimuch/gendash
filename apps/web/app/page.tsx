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
        Live demo data: the open <a href="https://github.com/mledoze/countries" target="_blank" rel="noreferrer">mledoze/countries</a> dataset.
        Upload a CSV above, or point <code>getConnector()</code> at Postgres or a Disqover instance to use your own.
      </footer>
    </main>
  );
}
