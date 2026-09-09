'use client';

import { useEffect, useRef, useState } from 'react';
import { Newspaper, Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import { toast } from '@/components/Toast';
import type { OraculoDay, OraculoStatus } from '@/types';

function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, data] = result.split(',');
      resolve({ data, mimeType: file.type || 'image/png' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function OraculoPage() {
  const [status, setStatus] = useState<OraculoStatus | 'loading'>('loading');
  const [day, setDay] = useState<OraculoDay | null>(null);
  const [personalText, setPersonalText] = useState('');
  const [professionalText, setProfessionalText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/oraculo');
      const data = await res.json();
      setStatus(data.status);
      setDay(data.day);
    } catch {
      toast('No se pudo cargar el estado de El Oráculo', 'error');
      setStatus('waiting_personal');
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handlePersonalSubmit = async () => {
    if (!personalText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/oraculo/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: personalText }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDay(data.day);
      setStatus(data.day.status);
      toast('Brief personal cargado — esperando el brief profesional', 'success');
    } catch {
      toast('No se pudo cargar el brief personal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfessionalSubmit = async (image?: { data: string; mimeType: string }) => {
    if (!image && !professionalText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/oraculo/professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          image ? { imageBase64: image.data, mimeType: image.mimeType } : { content: professionalText },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setDay(data.day);
      setStatus(data.day.status);
      toast('El periódico matutino está listo', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'El Oráculo no pudo generar el periódico', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const image = await fileToBase64(file);
    await handleProfessionalSubmit(image);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (status === 'loading') {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-neutral-500" size={28} />
      </div>
    );
  }

  if (status === 'ready' && day?.html) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#0f0f0f]">
        <div className="px-6 pt-14 pb-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-neutral-400 text-sm">
            <Newspaper size={16} />
            <span>El Oráculo — edición de hoy</span>
          </div>
        </div>
        <iframe
          title="El Oráculo"
          srcDoc={day.html}
          className="flex-1 w-full border-0 bg-white"
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto flex items-start justify-center px-6 pt-20 pb-10">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-900/40 to-indigo-950/60 border border-violet-500/20 flex items-center justify-center text-2xl">
            🔮
          </div>
          <h1 className="text-xl font-semibold text-white">El Oráculo</h1>
          <p className="text-sm text-neutral-500">
            Cruza tu vida personal y profesional en el periódico matutino de mañana.
          </p>
        </div>

        {status === 'waiting_personal' && (
          <div className="card p-5 space-y-3">
            <p className="text-sm text-neutral-300">
              Pega el brief personal de hoy (el &quot;periódico&quot; de Grok). El Oráculo se quedará
              esperando el brief profesional para disparar el cruce automáticamente.
            </p>
            <textarea
              value={personalText}
              onChange={(e) => setPersonalText(e.target.value)}
              placeholder="Pega aquí el contenido del brief personal…"
              rows={8}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus-ring resize-none"
            />
            <button
              onClick={handlePersonalSubmit}
              disabled={submitting || !personalText.trim()}
              className="btn btn-primary w-full gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Cargar brief personal
            </button>
          </div>
        )}

        {status === 'waiting_professional' && (
          <div className="card p-5 space-y-3">
            <p className="text-xs text-green-400/80">✓ Brief personal cargado — esperando el brief profesional</p>
            <p className="text-sm text-neutral-300">
              Sube el corte de calendario/pendientes (texto o captura). En cuanto llegue, se dispara
              el cruce y se genera el periódico — sin pasos adicionales.
            </p>
            <textarea
              value={professionalText}
              onChange={(e) => setProfessionalText(e.target.value)}
              placeholder="Pega aquí el texto del brief profesional…"
              rows={8}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus-ring resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleProfessionalSubmit()}
                disabled={submitting || !professionalText.trim()}
                className="btn btn-primary flex-1 gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Generar periódico
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                className="btn btn-ghost gap-2 border border-white/[0.08]"
              >
                <ImageIcon size={16} />
                Captura
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
