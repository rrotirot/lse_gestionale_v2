import React, { useMemo, useState } from "react";
import Header from "@/components/layout/Header";

const MOCK_RUNS = [
  { id: "run_20260520_001", mode: "dry-run", status: "completed", startedAt: "2026-05-20 10:12", duration: "2.8s", added: 4, updated: 2, unchanged: 148, errors: 0 },
  { id: "run_20260520_002", mode: "live", status: "completed", startedAt: "2026-05-20 09:45", duration: "4.1s", added: 1, updated: 0, unchanged: 153, errors: 0 },
  { id: "run_20260519_004", mode: "live", status: "failed", startedAt: "2026-05-19 21:07", duration: "1.1s", added: 0, updated: 0, unchanged: 0, errors: 1 },
];

function statusPill(status) {
  if (status === "completed") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (status === "running") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (status === "queued") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

export default function AdminDiscordPage({ user, onLogout, onUpdateUser, onNavigateToHome }) {
  const [selectedRunId, setSelectedRunId] = useState(MOCK_RUNS[0].id);
  const [jobState, setJobState] = useState({
    active: true,
    jobId: "job_sync_20260520_003",
    mode: "dry-run",
    progress: 62,
    status: "running",
  });

  const selectedRun = useMemo(() => MOCK_RUNS.find((run) => run.id === selectedRunId) || null, [selectedRunId]);

  const triggerMockJob = (mode) => {
    setJobState({
      active: true,
      jobId: `job_sync_${Date.now()}`,
      mode,
      progress: 10,
      status: "queued",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header
        user={user}
        onLogout={onLogout}
        onUpdateUser={onUpdateUser}
        onNavigateToHome={onNavigateToHome}
        showHomeButton={true}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Bot Discord</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Interfaccia placeholder per validare i flussi di gestione bot dal gestionale.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            Placeholder UI
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stato Bot</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Connessione</p>
                <p className="font-semibold text-green-600 dark:text-green-400">Online</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Guild</p>
                <p className="font-semibold text-gray-900 dark:text-white">Logistic Space Economy</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Heartbeat</p>
                <p className="font-semibold text-gray-900 dark:text-white">8s fa</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Versione bot</p>
                <p className="font-semibold text-gray-900 dark:text-white">v0.3-alpha</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Azioni Rapide</h2>
            <div className="space-y-3">
              <button onClick={() => triggerMockJob("dry-run")} className="w-full rounded-lg px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                Sync membri (dry-run)
              </button>
              <button onClick={() => triggerMockJob("live")} className="w-full rounded-lg px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                Sync membri (reale)
              </button>
              <button className="w-full rounded-lg px-4 py-2.5 bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed" disabled>
                Sync eventi (coming soon)
              </button>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <section className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Storico Esecuzioni</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-3">Run</th>
                    <th className="py-2 pr-3">Mode</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Inizio</th>
                    <th className="py-2 pr-3">Durata</th>
                    <th className="py-2 pr-3">Risultato</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_RUNS.map((run) => (
                    <tr key={run.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/60 dark:hover:bg-gray-700/30 cursor-pointer" onClick={() => setSelectedRunId(run.id)}>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-700 dark:text-gray-300">{run.id}</td>
                      <td className="py-2 pr-3">{run.mode}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusPill(run.status)}`}>{run.status}</span>
                      </td>
                      <td className="py-2 pr-3">{run.startedAt}</td>
                      <td className="py-2 pr-3">{run.duration}</td>
                      <td className="py-2 pr-3 text-xs">+{run.added} / ~{run.updated} / ={run.unchanged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Attivo</h2>
            {jobState.active ? (
              <div className="space-y-3 text-sm">
                <p className="text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-900 dark:text-white">JobId:</span> <span className="font-mono text-xs">{jobState.jobId}</span></p>
                <p className="text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-900 dark:text-white">Mode:</span> {jobState.mode}</p>
                <p className="text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-900 dark:text-white">Status:</span> {jobState.status}</p>
                <div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${jobState.progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Progresso: {jobState.progress}%</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nessun job in esecuzione.</p>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dettaglio Run Selezionato</h2>
          {selectedRun && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Run ID</p>
                <p className="font-mono text-xs text-gray-900 dark:text-white mt-1">{selectedRun.id}</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Esito</p>
                <p className="text-gray-900 dark:text-white mt-1">
                  Added: {selectedRun.added}, Updated: {selectedRun.updated}, Unchanged: {selectedRun.unchanged}, Errors: {selectedRun.errors}
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

