'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Youtube,
  Database,
  FileText,
  X,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { CREATORS } from '@/lib/creators';

interface TranscriptStat {
  creatorId: string;
  chunks: number;
  videos: number;
}

interface IngestResult {
  success: boolean;
  message?: string;
  error?: string;
  chunks?: number;
  fileName?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Shared
  const [selectedCreator, setSelectedCreator] = useState(CREATORS[0]?.id || '');
  const [stats, setStats] = useState<TranscriptStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'youtube' | 'file'>('youtube');

  // YouTube tab
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [ytResult, setYtResult] = useState<IngestResult | null>(null);

  // File tab — staged files + results
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestProgress, setIngestProgress] = useState('');
  const [ingestResults, setIngestResults] = useState<IngestResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/ingest');
      const data = await res.json();
      // Only update stats if the fetch returned valid data — never reset to []
      if (Array.isArray(data.stats)) {
        setStats(data.stats);
      }
    } catch {
      // ignore — keep previous stats intact
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const getStatForCreator = (creatorId: string) =>
    stats.find((s) => s.creatorId === creatorId);

  // ── YouTube ingest ────────────────────────────────────────────
  const handleYoutubeIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim() || ytLoading) return;
    setYtLoading(true);
    setYtResult(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: selectedCreator,
          videoUrl: videoUrl.trim(),
          videoTitle: videoTitle.trim() || undefined,
        }),
      });
      const data = await res.json();
      setYtResult(data);
      if (data.success) {
        setVideoUrl('');
        setVideoTitle('');
        fetchStats();
      }
    } catch {
      setYtResult({ success: false, error: 'Network error' });
    } finally {
      setYtLoading(false);
    }
  };

  // ── File staging: pick files without ingesting yet ───────────
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    setStagedFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const newOnes = picked.filter((f) => !existing.has(`${f.name}-${f.size}`));
      return [...prev, ...newOnes];
    });
    // Reset so the same file can be re-picked after removal
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setStagedFiles([]);
    setIngestResults([]);
  };

  // ── Ingest all staged files ───────────────────────────────────
  const handleIngest = async () => {
    if (stagedFiles.length === 0 || ingestLoading) return;
    setIngestLoading(true);
    setIngestResults([]);
    const results: IngestResult[] = [];

    for (let i = 0; i < stagedFiles.length; i++) {
      const file = stagedFiles[i];
      setIngestProgress(`Procesando ${i + 1} de ${stagedFiles.length}: ${file.name}`);
      try {
        const text = await file.text();
        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorId: selectedCreator,
            fileName: file.name,
            transcript: text,
          }),
        });
        const data = await res.json();
        results.push({ ...data, fileName: file.name });
      } catch {
        results.push({ success: false, error: 'Error de red', fileName: file.name });
      }
    }

    setIngestResults(results);
    setIngestProgress('');

    // Clear staged files only if all succeeded
    if (results.every((r) => r.success)) setStagedFiles([]);

    fetchStats();
    setIngestLoading(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-sage-400" size={32} />
      </div>
    );
  }

  const successCount = ingestResults.filter((r) => r.success).length;
  const failCount = ingestResults.filter((r) => !r.success).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/chat')}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Volver al chat
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Database size={24} className="text-sage-400" />
            <h1 className="text-2xl font-bold text-white">Transcript Library</h1>
          </div>
          <p className="text-neutral-400 text-sm">
            Alimenta a los council members con videos de YouTube o archivos de texto para profundizar su sabiduría.
          </p>
        </div>

        {/* Creator stats grid */}
        <div className="grid grid-cols-3 gap-3">
          {CREATORS.map((c) => {
            const stat = getStatForCreator(c.id);
            return (
              <div
                key={c.id}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedCreator === c.id
                    ? 'border-sage-400/50 bg-sage-400/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
                onClick={() => setSelectedCreator(c.id)}
              >
                <div className="text-lg mb-1">{c.emoji}</div>
                <div className="text-white text-sm font-medium">{c.name}</div>
                <div className="text-neutral-500 text-xs">
                  {statsLoading
                    ? '...'
                    : `${stat?.chunks ?? 0} chunks · ${stat?.videos ?? 0} fuentes`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'youtube'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 text-neutral-400 border border-white/10 hover:border-white/20'
            }`}
          >
            <Youtube size={16} />
            YouTube URL
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'file'
                ? 'bg-sage-400/20 text-sage-400 border border-sage-400/30'
                : 'bg-white/5 text-neutral-400 border border-white/10 hover:border-white/20'
            }`}
          >
            <FileText size={16} />
            Archivos .txt
          </button>
        </div>

        {/* ── YouTube tab ─────────────────────────────────────── */}
        {activeTab === 'youtube' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Youtube size={20} className="text-red-400" />
              <h2 className="text-white font-semibold">Agregar video de YouTube</h2>
            </div>

            <form onSubmit={handleYoutubeIngest} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-wider font-medium mb-2">
                  Council Member
                </label>
                <select
                  value={selectedCreator}
                  onChange={(e) => setSelectedCreator(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sage-400/50"
                >
                  {CREATORS.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#111]">
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-wider font-medium mb-2">
                  YouTube URL
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-sage-400/50"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-500 uppercase tracking-wider font-medium mb-2">
                  Título del video (opcional)
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Dejar en blanco para usar el ID del video"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-sage-400/50"
                />
              </div>

              {ytResult && (
                <div
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm border ${
                    ytResult.success
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {ytResult.success ? (
                    <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={16} className="shrink-0 mt-0.5" />
                  )}
                  <span>{ytResult.message || ytResult.error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={ytLoading || !videoUrl.trim()}
                className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl px-4 py-3 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {ytLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {ytLoading ? 'Ingesting...' : 'Ingestar transcript'}
              </button>
            </form>
          </div>
        )}

        {/* ── File tab ─────────────────────────────────────────── */}
        {activeTab === 'file' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Upload size={20} className="text-sage-400" />
              <h2 className="text-white font-semibold">Subir archivos de texto</h2>
            </div>

            {/* Creator selector */}
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-wider font-medium mb-2">
                Council Member destino
              </label>
              <select
                value={selectedCreator}
                onChange={(e) => setSelectedCreator(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sage-400/50"
              >
                {CREATORS.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#111]">
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              multiple
              className="hidden"
              onChange={handleFilePick}
            />

            {/* STEP 1: Load button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={ingestLoading}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FolderOpen size={16} />
              Seleccionar archivos .txt
            </button>

            {/* Staged files list */}
            {stagedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
                    {stagedFiles.length} archivo{stagedFiles.length !== 1 ? 's' : ''} seleccionado{stagedFiles.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={clearAll}
                    className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
                  >
                    Limpiar todo
                  </button>
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {stagedFiles.map((file, i) => {
                    const result = ingestResults.find((r) => r.fileName === file.name);
                    return (
                      <div
                        key={`${file.name}-${i}`}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm border ${
                          result?.success
                            ? 'bg-green-500/10 border-green-500/20'
                            : result && !result.success
                            ? 'bg-red-500/10 border-red-500/20'
                            : 'bg-white/[0.03] border-white/[0.08]'
                        }`}
                      >
                        <FileText
                          size={14}
                          className={
                            result?.success
                              ? 'text-green-400 shrink-0'
                              : result && !result.success
                              ? 'text-red-400 shrink-0'
                              : 'text-neutral-500 shrink-0'
                          }
                        />
                        <span className="flex-1 text-neutral-300 truncate">{file.name}</span>
                        <span className="text-neutral-600 text-xs shrink-0">{formatBytes(file.size)}</span>
                        {result?.success && (
                          <CheckCircle size={14} className="text-green-400 shrink-0" />
                        )}
                        {result && !result.success && (
                          <span className="text-red-400 text-xs shrink-0 max-w-32 truncate">{result.error}</span>
                        )}
                        {!result && !ingestLoading && (
                          <button
                            onClick={() => removeStagedFile(i)}
                            className="text-neutral-700 hover:text-neutral-400 transition-colors shrink-0"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Progress indicator */}
            {ingestProgress && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border bg-blue-500/10 border-blue-500/20 text-blue-400">
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span>{ingestProgress}</span>
              </div>
            )}

            {/* Summary banner after ingest */}
            {ingestResults.length > 0 && !ingestLoading && (
              <div className={`px-4 py-3 rounded-xl text-sm border ${
                failCount === 0
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : successCount === 0
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              }`}>
                {failCount === 0
                  ? `✓ ${successCount} archivo${successCount !== 1 ? 's' : ''} ingesta${successCount !== 1 ? 'dos' : 'do'} correctamente`
                  : successCount === 0
                  ? `✗ Todos los archivos fallaron`
                  : `${successCount} exitoso${successCount !== 1 ? 's' : ''}, ${failCount} fallido${failCount !== 1 ? 's' : ''}`}
              </div>
            )}

            {/* STEP 2: Ingest button */}
            <button
              onClick={handleIngest}
              disabled={stagedFiles.length === 0 || ingestLoading}
              className="w-full flex items-center justify-center gap-2 bg-sage-400/20 hover:bg-sage-400/30 text-sage-400 border border-sage-400/30 rounded-xl px-4 py-3 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {ingestLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {ingestLoading
                ? 'Ingesting...'
                : stagedFiles.length === 0
                ? 'Selecciona archivos primero'
                : `Ingestar ${stagedFiles.length} archivo${stagedFiles.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* Tips */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
          <h3 className="text-white font-semibold text-sm">Tips para mejores resultados</h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">—</span>
              Agrega 5–15 videos por creator para contexto rico. Más = mejores respuestas.
            </li>
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">—</span>
              Videos largos (30min+) dan más insight. Evita trailers o shorts.
            </li>
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">—</span>
              Los videos necesitan subtítulos en inglés (los auto-generados cuentan).
            </li>
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">—</span>
              Selecciona múltiples .txt, revisa la lista y luego haz clic en Ingestar.
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
