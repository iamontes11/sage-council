'use client';

import { useEffect, useState } from 'react';
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
  const [stats, setStats] = useState<TranscriptStat[]>([]);
  const [selectedCreator, setSelectedCreator] = useState(CREATORS[0].id);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    if (status === 'authenticated') loadStats();
  }, [status]);

  const loadStats = async () => {
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
      if (res.ok) {
        setResult({ success: true, message: data.message, chunks: data.chunks });
        setVideoUrl('');
        setVideoTitle('');
        loadStats(); // refresh stats
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch (err) {
      setResult({ success: false, error: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const creator = CREATORS.find((c) => c.id === selectedCreator)!;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-neutral-100 p-6">
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
            <Database size={24} classNaMe="text-sage-400" />
            <h1 className="text-2xl font-bold text-white">Transcript Library</h1>
          </div>
          <p className="text-neutral-400">
            Feed your council members with YouTube videos to deepen their wisdom. Paste any
            YouTube URL and the transcript will be extracted and indexed automatically.
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
                    ? 'border-sage-500/50 bg-sage-600/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
                onClick={() => setSelectedCreator(c.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-sm font-medium text-white truncate">{c.name}</span>
                </div>
                {statsLoading ? (
                  <div className="h-4 bg-white/10 rounded animate-pulse" />
                ) : stat ? (
                  <p className="text-xs text-neutral-500">
                    {stat.videos} video{stat.videos !== 1 ? 's' : ''} · {stat.chunks} chunks
                  </p>
                ) : (
                  <p className="text-xs text-neutral-600">No transcripts yet</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Ingest form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Youtube size={20} className="text-red-400" />
            <h2 className="text-white font-semibold">Add YouTube Video</h2>
          </div>

          <form onSubmit={handleIngest} className="space-y-4">
            {/* Creator selector */}
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-wider font-medium mb-2">
                Council Member
              </label>
              <select
                value={selectedCreator}
                onChange={(e) => setSelectedCreator(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sage-500/50"
              >
                {CREATORS.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#111]">
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Creator philosophy preview */}
            <div className="text-xs text-neutral-500 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
              <span className="text-neutral-400 font-medium">{creator.name}:</span>{' '}
              {creator.tagline}
            </div>

            {/* Video URL */}
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-wider font-medium mb-2">
                YouTube URL *
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-sage-500/50"
              />
            </div>

            {/* Video title (optional) */}
            <div>
              <label className="block text-xs text-neutral-500 uppercase tracking-wider font-medium mb-2">
                Video Title (optional)
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Leave blank to use video ID"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-sage-500/50"
              />
            </div>

            {/* Result */}
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
                <span>{result.success ? result.message : result.error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !videoUrl.trim()}
              className="w-full flex items-center justify-center gap-2 bg-sage-600 hover:bg-sage-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Extracting transcript...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Ingest Transcript
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tips */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
          <h3 className="text-white font-semibold text-sm">Tips for best results</h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">→</span>
              Add 5-15 videos per creator for rich context. More = better responses.
            </li>
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">→</span>
              Long-form videos (30min+) give the most insight. Avoid trailers or shorts.
            </li>
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">→</span>
              Videos need English captions (auto-generated counts). Transcripts load within seconds.
            </li>
            <li className="flex gap-2">
              <span className="text-sage-400 shrink-0">→</span>
              For podcasts: the interview videos from their own YouTube channels work best.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
