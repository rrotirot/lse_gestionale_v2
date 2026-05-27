import React, { useMemo, useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { discordAdminService } from "@/services/discordAdminService";

function statusPill(status) {
  if (status === "completed") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (status === "running") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (status === "queued") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return dateStr;
  }
}

function getRankBadge(rank) {
  if (rank === null || rank === undefined) return "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500";
  if (rank === 5) return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-900/45 font-bold";
  if (rank === 4) return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-900/45 font-bold";
  if (rank === 3) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40";
  if (rank === 2) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40";
  if (rank === 1) return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-900/40";
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
}

function getRankLabel(rank) {
  if (rank === null || rank === undefined) return "Nessuno";
  if (rank === 5) return `Rank ${rank} (Amministratore)`;
  if (rank === 4) return `Rank ${rank} (Resposnabile di settore)`;
  if (rank === 3) return `Rank ${rank} (Operatore specializzato)`;
  if (rank === 2) return `Rank ${rank} (Operatore)`;
  if (rank === 1) return `Rank ${rank} (Prospect)`;
  return `Rank ${rank} (prospect_)`;
}

export default function AdminDiscordPage({ user, onLogout, onUpdateUser, onNavigateToHome }) {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [botStatus, setBotStatus] = useState({
    configured: false,
    status: "loading",
    guildName: null,
    guildId: null,
    version: "v0.1.1-beta"
  });
  const [jobState, setJobState] = useState({
    active: false,
    jobId: "",
    mode: "dry-run",
    progress: 0,
    status: "queued",
    result: null,
    error: null
  });
  const [error, setError] = useState(null);
  const [botActionLoading, setBotActionLoading] = useState(false);

  // Stato modal creazione/pianificazione job
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobForm, setJobForm] = useState({ type: "sync-members", mode: "dry-run", scheduled: false, cronExpr: "0 * * * *" });
  const [jobFormLoading, setJobFormLoading] = useState(false);
  const [jobFormSuccess, setJobFormSuccess] = useState(null);

  // Stati per Utenti Registrati e Rank
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedRun = useMemo(() => runs.find((run) => run.jobId === selectedRunId) || null, [runs, selectedRunId]);

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchUsername = u.username?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchHandle = u.rsiHandle?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchOrg = u.mainOrgName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchUsername || matchHandle || matchOrg;
    });
  }, [usersList, searchTerm]);

  const fetchBotStatus = async () => {
    try {
      const data = await discordAdminService.getBotStatus();
      setBotStatus(data);
    } catch (err) {
      console.error("Errore nel recupero dello stato del bot:", err);
      setBotStatus({
        configured: false,
        status: "error",
        guildName: null,
        guildId: null,
        version: "v0.1.1-beta",
        error: err.message
      });
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await discordAdminService.getSyncHistory();
      if (data.success && data.history) {
        setRuns(data.history);
        if (data.history.length > 0) {
          setSelectedRunId((prev) => {
            const stillExists = data.history.some(r => r.jobId === prev);
            return stillExists ? prev : data.history[0].jobId;
          });
        }
      }
    } catch (err) {
      console.error("Errore nel recupero dello storico:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      const data = await discordAdminService.getAdminUsers();
      if (data.success && data.users) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.error("Errore nel recupero degli utenti:", err);
      setUsersError(err.message || "Errore nel caricamento degli utenti");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleStartBot = async () => {
    try {
      setBotActionLoading(true);
      setError(null);
      const res = await discordAdminService.startBot();
      if (res.success) {
        await fetchBotStatus();
      }
    } catch (err) {
      console.error("Errore nell'avvio del bot:", err);
      setError(err.message || "Impossibile avviare il bot");
      setBotStatus(prev => ({ ...prev, status: "offline", error: err.message }));
    } finally {
      // Il timeout watchdog e il normale flusso sbloccheranno l'interfaccia
      setBotActionLoading(false);
    }
  };

  const handleStopBot = async () => {
    try {
      setBotActionLoading(true);
      setError(null);
      const res = await discordAdminService.stopBot();
      if (res.success) {
        await fetchBotStatus();
      }
    } catch (err) {
      console.error("Errore nell'arresto del bot:", err);
      setError(err.message || "Impossibile arrestare il bot");
    } finally {
      setBotActionLoading(false);
    }
  };

  // Watchdog: se il bot resta in loading per più di 90 secondi, forza lo stato offline e sblocca il pulsante
  useEffect(() => {
    if (!botActionLoading) return;
    const timeoutId = setTimeout(() => {
      console.warn("Watchdog 90s scattato: forzatura stato offline.");
      setBotActionLoading(false);
      setError("Timeout 90s superato: l'interfaccia è stata sbloccata forzatamente.");
      setBotStatus(prev => ({ ...prev, status: "offline", error: "Timeout forzato" }));
    }, 90000);
    return () => clearTimeout(timeoutId);
  }, [botActionLoading]);

  useEffect(() => {
    fetchBotStatus();
    fetchHistory();
    fetchUsers();
  }, []);

  // Poll active job status
  useEffect(() => {
    let timer;
    if (jobState.active && (jobState.status === "queued" || jobState.status === "running")) {
      timer = setInterval(async () => {
        try {
          const data = await discordAdminService.getJobStatus(jobState.jobId);
          if (data.success && data.job) {
            const backendJob = data.job;
            const isFinished = backendJob.status === "completed" || backendJob.status === "failed";

            setJobState({
              active: !isFinished,
              jobId: backendJob.jobId,
              mode: backendJob.mode,
              progress: backendJob.progress,
              status: backendJob.status,
              result: backendJob.result,
              error: backendJob.error
            });

            if (isFinished) {
              fetchHistory();
            }
          }
        } catch (err) {
          console.error("Errore nel polling del job:", err);
        }
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [jobState.active, jobState.status, jobState.jobId]);

  const handleCreateJob = async () => {
    try {
      setJobFormLoading(true);
      setJobFormSuccess(null);
      setError(null);
      const dryRun = jobForm.mode === "dry-run";
      const data = await discordAdminService.triggerSyncMembers(dryRun);
      if (data.success && data.jobId) {
        setJobState({
          active: true,
          jobId: data.jobId,
          mode: jobForm.mode,
          progress: 10,
          status: "queued",
          result: null,
          error: null
        });
        setJobFormSuccess(`Job avviato con ID: ${data.jobId}`);
        setTimeout(() => {
          setShowJobModal(false);
          setJobFormSuccess(null);
        }, 2000);
      }
    } catch (err) {
      setError(err.message || "Errore nella creazione del job");
    } finally {
      setJobFormLoading(false);
    }
  };

  const triggerSyncJob = async (mode) => {
    const dryRun = mode === "dry-run";
    try {
      setError(null);
      const data = await discordAdminService.triggerSyncMembers(dryRun);
      if (data.success && data.jobId) {
        setJobState({
          active: true,
          jobId: data.jobId,
          mode: dryRun ? "dry-run" : "live",
          progress: 10,
          status: "queued",
          result: null,
          error: null
        });
      }
    } catch (err) {
      setError(err.message || "Errore nell'avvio del sync");
    }
  };

  const triggerApplyChanges = async () => {
    try {
      setError(null);
      const data = await discordAdminService.triggerApplyChanges();
      if (data.success && data.jobId) {
        setJobState({
          active: true,
          jobId: data.jobId,
          mode: "live",
          progress: 10,
          status: "queued",
          result: null,
          error: null
        });
      }
    } catch (err) {
      setError(err.message || "Errore nell'avvio dell'applicazione modifiche");
    }
  };

  // Modal creazione/pianificazione job
  const JobModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowJobModal(false)}>
      <div
        className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Crea / Pianifica Job (WIP)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Avvia un job immediatamente o pianificalo</p>
          </div>
          <button onClick={() => setShowJobModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Tipo job */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tipo Job</label>
            <select
              value={jobForm.type}
              onChange={e => setJobForm(f => ({ ...f, type: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="sync-members">Sync Membri Discord</option>
              <option value="import-events" disabled>Sync Eventi (coming soon)</option>
            </select>
          </div>

          {/* Modalità */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Modalità</label>
            <div className="grid grid-cols-2 gap-2">
              {["dry-run", "live"].map(m => (
                <button
                  key={m}
                  onClick={() => setJobForm(f => ({ ...f, mode: m }))}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${jobForm.mode === m
                    ? m === "live"
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-blue-500 bg-blue-600 text-white"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                >
                  {m === "dry-run" ? "🔍 Dry Run" : "⚡ Live"}
                </button>
              ))}
            </div>
            {jobForm.mode === "live" && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                ⚠️ La modalità Live applica modifiche reali al database.
              </p>
            )}
          </div>

          {/* Esecuzione immediata vs pianificata */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Pianificazione</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ val: false, label: "▶ Immediato" }, { val: true, label: "🕐 Pianificato" }].map(({ val, label }) => (
                <button
                  key={String(val)}
                  onClick={() => setJobForm(f => ({ ...f, scheduled: val }))}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${jobForm.scheduled === val
                    ? "border-purple-500 bg-purple-600 text-white"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cron expression (solo se pianificato) */}
          {jobForm.scheduled && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Cron Expression</label>
              <input
                type="text"
                value={jobForm.cronExpr}
                onChange={e => setJobForm(f => ({ ...f, cronExpr: e.target.value }))}
                placeholder="0 * * * *"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Es: <span className="font-mono">0 * * * *</span> = ogni ora · <span className="font-mono">0 0 * * *</span> = ogni giorno mezzanotte
              </p>
              <p className="mt-1 text-xs text-amber-500">⚠️ La pianificazione cron richiede supporto backend (coming soon).</p>
            </div>
          )}

          {/* Feedback successo */}
          {jobFormSuccess && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
              ✅ {jobFormSuccess}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={() => setShowJobModal(false)}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleCreateJob}
            disabled={jobFormLoading || jobForm.scheduled || botStatus.status !== "online"}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {jobFormLoading ? "Avvio..." : jobForm.scheduled ? "Salva Pianif. (WIP)" : "▶ Avvia Job"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {showJobModal && <JobModal />}
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
              Pannello di controllo della sincronizzazione membri ed eventi con il bot Discord.
            </p>
          </div>
          {botStatus.status === "online" ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Attivo (Bot Discord)
            </span>
          ) : botStatus.status === "unknown" ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
              Verifica in corso...
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
              Offline (Bot Discord)
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300 text-sm">
            <strong>Errore:</strong> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stato Bot</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Connessione</p>
                {botStatus.status === "online" && (
                  <p className="font-semibold text-green-600 dark:text-green-400">Online (Connesso)</p>
                )}
                {botStatus.status === "offline" && (
                  <p className="font-semibold text-red-600 dark:text-red-400">Offline (Mancata Connessione)</p>
                )}
                {botStatus.status === "unconfigured" && (
                  <p className="font-semibold text-amber-600 dark:text-amber-400">Non configurato (.env vuoto)</p>
                )}
                {botStatus.status === "loading" && (
                  <p className="font-semibold text-gray-500 dark:text-gray-400">Verifica in corso...</p>
                )}
                {botStatus.status === "error" && (
                  <p className="font-semibold text-red-500" title={botStatus.error}>Errore: API non raggiungibile</p>
                )}
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Guild (Server Discord)</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {botStatus.guildName || (botStatus.guildId ? `Guild ID: ${botStatus.guildId}` : "N/D")}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Configurazione</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {botStatus.configured ? "OK (Chiavi Presenti)" : "Mancante"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Versione bot</p>
                <p className="font-semibold text-gray-900 dark:text-white">{botStatus.version}</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">Latenza / Risposta Bot</p>
                {botStatus.status === "online" ? (
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {botStatus.latency ? `${botStatus.latency} ms` : "In verifica..."}
                    {botStatus.wsPing !== null && botStatus.wsPing !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-2">
                        (WS: {botStatus.wsPing} ms)
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="font-semibold text-gray-400 dark:text-gray-500">N/D</p>
                )}
              </div>
            </div>
            {botStatus.error && (
              <div className="mt-3 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-100 dark:border-red-900/30">
                {botStatus.error}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Azioni Rapide</h2>
            <div className="space-y-3">
              <button
                onClick={() => triggerSyncJob("dry-run")}
                disabled={jobState.active || botStatus.status !== "online"}
                className={`w-full rounded-lg px-4 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Sync membri (dry-run)
              </button>
              <button
                onClick={() => triggerSyncJob("live")}
                disabled={jobState.active || botStatus.status !== "online"}
                className={`w-full rounded-lg px-4 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Sync membri (reale)
              </button>
              <button
                onClick={triggerApplyChanges}
                disabled={jobState.active || botStatus.status !== "online"}
                className={`w-full rounded-lg px-4 py-2.5 bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Applica modifiche a Discord
              </button>
              <button
                onClick={() => { setJobForm(f => ({ ...f, type: "sync-members" })); setShowJobModal(true); }}
                disabled={botStatus.status !== "online"}
                className="w-full rounded-lg px-4 py-2.5 bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>📋</span> Crea / Pianifica Job (WIP)
              </button>
              <button className="w-full rounded-lg px-4 py-2.5 bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed" disabled>
                Sync eventi (coming soon)
              </button>

              <div className="border-t border-gray-200 dark:border-gray-700 my-4 pt-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Servizio Bot</p>
                {botStatus.status === "online" ? (
                  <button
                    onClick={handleStopBot}
                    disabled={botActionLoading}
                    className="w-full rounded-lg px-4 py-2.5 bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 font-medium hover:bg-red-200 dark:hover:bg-red-950/50 transition-colors disabled:opacity-50"
                  >
                    {botActionLoading ? "Arresto in corso..." : "Arresta Bot Discord"}
                  </button>
                ) : (botStatus.status === "offline" || botStatus.status === "loading") ? (
                  <button
                    onClick={handleStartBot}
                    disabled={botActionLoading}
                    className="w-full rounded-lg px-4 py-2.5 bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {botActionLoading ? "Avvio in corso..." : (botStatus.status === "loading" ? "Forza Avvio Bot" : "Avvia Bot Discord")}
                  </button>
                ) : botStatus.status === "unconfigured" ? (
                  <button
                    disabled
                    className="w-full rounded-lg px-4 py-2.5 bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 font-medium cursor-not-allowed"
                    title="Configura DISCORD_BOT_TOKEN nel file .env"
                  >
                    Non configurato (Modifica .env)
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <section className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Storico Esecuzioni</h2>
            <div className="overflow-x-auto overflow-y-auto max-h-[290px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 rounded-lg">
              {runs.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Nessuna sincronizzazione registrata.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur z-10">
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                      <th className="py-2 pr-3">Run</th>
                      <th className="py-2 pr-3">Mode</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Inizio</th>
                      <th className="py-2 pr-3">Durata</th>
                      <th className="py-2 pr-3">Risultato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const durationSec = run.finishedAt
                        ? ((new Date(run.finishedAt) - new Date(run.startedAt)) / 1000).toFixed(1)
                        : null;
                      return (
                        <tr
                          key={run.jobId}
                          className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/60 dark:hover:bg-gray-700/30 cursor-pointer ${selectedRunId === run.jobId ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
                            }`}
                          onClick={() => setSelectedRunId(run.jobId)}
                        >
                          <td className="py-2 pr-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                            {run.jobId.replace("job_sync_", "")}
                          </td>
                          <td className="py-2 pr-3 capitalize">{run.mode}</td>
                          <td className="py-2 pr-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusPill(run.status)}`}>
                              {run.status}
                            </span>
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(run.startedAt)}</td>
                          <td className="py-2 pr-3">{durationSec ? `${durationSec}s` : "-"}</td>
                          <td className="py-2 pr-3 text-xs whitespace-nowrap">
                            {run.status === "failed" ? (
                              <span className="text-red-500 font-medium">Fallito</span>
                            ) : (
                              `+${run.result?.added || 0} / ~${run.result?.updated || 0} / =${run.result?.unchanged || 0}`
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Attivo</h2>
            {jobState.active ? (
              <div className="space-y-3 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-white">JobId:</span>{" "}
                  <span className="font-mono text-xs">{jobState.jobId}</span>
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-white">Mode:</span> {jobState.mode}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-white">Status:</span> {jobState.status}
                </p>
                <div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${jobState.progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Progresso: {jobState.progress}%</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nessun job attivo in corso.</p>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dettaglio Run Selezionato</h2>
          {selectedRun ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <p><span className="text-gray-500 dark:text-gray-400 font-medium">Run ID:</span> <span className="font-mono text-xs text-gray-900 dark:text-white">{selectedRun.jobId}</span></p>
                <p><span className="text-gray-500 dark:text-gray-400 font-medium">Triggerato da:</span> <span className="text-gray-900 dark:text-white">{selectedRun.triggeredBy}</span></p>
                <p><span className="text-gray-500 dark:text-gray-400 font-medium">Inizio:</span> <span className="text-gray-900 dark:text-white">{formatDateTime(selectedRun.startedAt)}</span></p>
                <p><span className="text-gray-500 dark:text-gray-400 font-medium">Fine:</span> <span className="text-gray-900 dark:text-white">{formatDateTime(selectedRun.finishedAt)}</span></p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <p className="font-semibold text-gray-950 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1 mb-2">Risultato Report</p>
                {selectedRun.status === "failed" ? (
                  <div className="text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-100 dark:border-red-900/30">
                    <p className="font-medium">Errore di esecuzione:</p>
                    <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                      {selectedRun.result?.errors?.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      )) || <li>Errore generico sconosciuto.</li>}
                    </ul>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-gray-50 dark:bg-gray-900/40 rounded border border-gray-100 dark:border-gray-800">
                      <p className="text-gray-400">Letti da Discord</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{selectedRun.result?.readFromDiscord || 0}</p>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-900/40 rounded border border-gray-100 dark:border-gray-800">
                      <p className="text-gray-400">Bot Ignorati</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{selectedRun.result?.skippedBots || 0}</p>
                    </div>
                    <div className="p-2 bg-green-50/50 dark:bg-green-950/10 rounded border border-green-100/50 dark:border-green-900/20">
                      <p className="text-green-600 dark:text-green-400 font-medium">Aggiunti</p>
                      <p className="text-lg font-bold text-green-700 dark:text-green-300">{selectedRun.result?.added || 0}</p>
                    </div>
                    <div className="p-2 bg-blue-50/50 dark:bg-blue-950/10 rounded border border-blue-100/50 dark:border-blue-900/20">
                      <p className="text-blue-600 dark:text-blue-400 font-medium">Aggiornati</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{selectedRun.result?.updated || 0}</p>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-900/40 rounded border border-gray-100 dark:border-gray-800 col-span-2">
                      <p className="text-gray-400">Invariati nel database</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{selectedRun.result?.unchanged || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Seleziona un run dallo storico per vedere i dettagli.</p>
          )}
        </section>

        {/* Sezione Utenti Registrati e Rank */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Utenti Registrati & Rank Gestionale</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Elenco degli utenti registrati sul portale con i relativi stati di verifica RSI e rank organizzativo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cerca utente, handle o org..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={fetchUsers}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                title="Ricarica elenco utenti"
              >
                🔄
              </button>
            </div>
          </div>

          {usersLoading ? (
            <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
              Caricamento degli utenti in corso...
            </div>
          ) : usersError ? (
            <div className="text-red-500 bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-100 dark:border-red-900/30 text-sm">
              <strong>Errore:</strong> {usersError}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
              Nessun utente trovato corrispondente ai criteri di ricerca.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-3">Avatar</th>
                    <th className="py-2 pr-3">Username</th>
                    <th className="py-2 pr-3">Handle RSI</th>
                    <th className="py-2 pr-3">Stato Verifica</th>
                    <th className="py-2 pr-3">Org Principale</th>
                    <th className="py-2 pr-3">Rank Organizzazione</th>
                    <th className="py-2 pr-3">Data Registrazione</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/60 dark:hover:bg-gray-700/30">
                      <td className="py-2.5 pr-3">
                        {u.rsiAvatar ? (
                          <img
                            src={u.rsiAvatar}
                            alt={u.username}
                            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                            {u.username?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-gray-900 dark:text-white">
                        {u.username}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {u.rsiHandle || "-"}
                      </td>
                      <td className="py-2.5 pr-3">
                        {u.rsiVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            ✓ Verificato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            ✗ Non Verificato
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-xs">
                        {u.mainOrgName || "-"}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getRankBadge(u.organizationRank)}`}>
                          {getRankLabel(u.organizationRank)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
