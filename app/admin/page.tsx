'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Plus,
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Youtube,
  Database,
  FileText,
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
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedCreator, setSelectedCreator] = useState(CREATORS[0]?.id || '');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [stats, setStats] = useState<TranscriptStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'youtube' | 'file'>('youtube');
  const [fileResult, setFileResult] = useState<IngestResult | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/ingest');
        const data = await res.json();
        setStats(data.stats || []);
      } catch {
        // ignore
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const getStatForCreator = (creatorId: string) =>
    stats.find((s) => s.creatorId === creatorId);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim() || loading) return;

    setLoading(true);
    setResult(null);

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
      setResult(data);

      if (data.success) {
        setVideoUrl('');
        setVideoTitle('');
        const statsRes = await fetch('/api/ingest');
        const statsData = await statsRes.json();
        setStats(statsData.stats || []);
      }
    } catch (err) {
      setResult({ success: false, error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || fileLoading) return;

    setFileLoading(true);
    setFileResult(null);

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
      setFileResult(data);

      if (data.success) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        const statsRes = await fetch('/api/ingest');
        const statsData = await statsRes.json();
        setStats(statsData.stats || []);
      }
    } catch (err) {
      setFileResult({ success: false, error: 'Network error' });
    } finally {
      setFileLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-sage-400" size={32} />
      </div>
    );
  }

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
            Back to chat
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Database size={24} className="text-sage-400" />
            <h1 className="text-2xl font-bold text-white">Transcript Library</h1>
          </div>
          <p className="text-neutral-400">
            Feed your council members with YouTube videos or text files to deepen their wisdom.
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
                  {statsLoading ? '...' : `${stat?.chunks || 0} chunks Â· ${stat?.videos || 0} sources`}
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
            Upload .txt File
          </button>
        </div>

        {/* YouTube ingest form */}
        {activeTab === 'youtube' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Youtube size={20} className="text-red-400" />
              <h2 className="text-white font-semibold">Add YouTube Video</h2>
            </div>

            <form onSubmit={handleIngest} className="space-y-4">
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
                  Video Title (optional)
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Leave blank to use video ID"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-sage-400/50"
                />
              </div>

              {result && (
                <div
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm border ${
                    result.success
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={16} className="shrink-0 mt-0.5" />
                  )}
                  <span>{result.message || result.error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !videoUrl.trim()}
                className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl px-4 py-3 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {loading ? 'Ingesting...' : 'Ingest Transcript'}
              </button>
            </form>
          </div>
        )}

        {/* File upload form */}
        {activeTab === 'file' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Upload size={20} className="text-sage-400" />
              <h2 className="text-white font-semibold">Upload Text File</h2>
            </div>

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
                Text File (.txt)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-sage-400/20 file:text-sage-400 hover:file:bg-sage-400/30 focus:outline-none focus:border-sage-400/50"
              />
              <p className="text-neutral-500 text-xs mt-1">No file size limit. The file will be chunked automatically.</p>
            </div>

            {fileResult && (
              <div
                className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm border ${
                  fileResult.success
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {fileResult.success ? (
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={16} className="shrink-0 mt-0.5" />
                )}
                <span>{fileResult.message || fileResult.error}</span>
              </div>
            )}

            <button
              onClick={handleFileUpload}
              disabled={fileLoading}
              className="w-full flex items-center justify-center gap-2 bg-sage-400/20 hover:bg-sage-400/30 text-sage-400 border border-sage-400/30 rounded-xl px-4 py-3 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {fileLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {fileLoading ? 'Uploading...' : 'Upload & Ingest'}
            </button>
          </div>
        )}

        {/* Tips */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
          <h3 className="text-white font-semibold text-sm">Tips for best results</h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">-</span>
              Add 5-15 videos per creator for rich context. More = better responses.
            </li>
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">-</span>
              Long-form videos (30min+) give the most insight. Avoid trailers or shorts.
            </li>
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">-</span>
              Videos need English captions (auto-generated counts). Transcripts load within seconds.
            </li>
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">-</span>
              Upload .txt files with notes, articles, or any text content to add more context.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
