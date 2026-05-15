'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  SkipForward,
  RotateCcw,
  Copy,
  CheckCircle2,
  Zap,
} from 'lucide-react';

interface Step {
  id: number;
  name: string;
  emoji: string;
  description: string;
  prompt: (task: string) => string;
  key: string;
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    id: 1,
    name: 'Rompedor de Parálisis',
    emoji: '⚡',
    description: 'Divide en pasos micro',
    prompt: (task) =>
      `Estoy paralizado viendo "${task}" y no puedo empezar. Divídelo en pasos "Ridículamente Pequeños" que tarden menos de 1 minuto cada uno. Dame el primer paso y dime exactamente dónde poner las manos para comenzar.`,
    key: 'paralysis',
  },
  {
    id: 2,
    name: 'Auditor de Ceguera Temporal',
    emoji: '⏱️',
    description: 'Obtén estimaciones realistas',
    prompt: (task) =>
      `Estoy a punto de empezar "${task}". Ayúdame a "Mapear el Tiempo" identificando las 3 sub-tareas ocultas que siempre olvido para establecer un deadline realista. Incluye tiempo estimado para cada sub-tarea.`,
    key: 'timing',
  },
  {
    id: 3,
    name: 'Arquitecto del Menú Dopamina',
    emoji: '🎮',
    description: 'Mantén la concentración sostenida',
    prompt: (task) =>
      `Estoy a punto de trabajar en "${task}" la próxima hora y siento que puedo perder el interés. Crea un "Menú Dopamina" con "Botanas" de 5 minutos (movimiento rápido), "Platos Fuertes" de 20 minutos (trabajo profundo) y "Acompañamientos" de 10 minutos (juego creativo) para mantener mi cerebro enganchado.`,
    key: 'dopamine',
  },
  {
    id: 4,
    name: 'Simulador de Body Doubling',
    emoji: '👥',
    description: 'Recibe responsabilidad en vivo',
    prompt: (task) =>
      `Sé mi cuerpo doble virtual mientras trabajo en "${task}". Haz check-in cada 10 minutos para preguntarme qué avancé y mantener mi enfoque anclado. Comienza preguntándome qué voy a hacer ahorita.`,
    key: 'bodyDouble',
  },
  {
    id: 5,
    name: 'Externalizador de Función Ejecutiva',
    emoji: '🧠',
    description: 'Limpia el ruido mental',
    prompt: (task) =>
      `Estoy trabajando en "${task}" pero tengo la cabeza llena de "Loops Abiertos" y distracciones. Voy a descargar todo lo que me preocupa. Categorízalo en "Ahorita", "Después" y "Basura", y escribe una acción concreta para solo los items de "Ahorita". Luego dime que vuelva al trabajo.`,
    key: 'externalizer',
    optional: true,
  },
  {
    id: 6,
    name: 'Guía de Cambio de Contexto',
    emoji: '🔄',
    description: 'Transiciones suaves',
    prompt: (task) =>
      `Acabo de terminar "${task}" y necesito cambiar de contexto ahora. Diseña una rutina de 3 minutos "Paleta Limpiadora Mental" para ayudarme a resetear. Hazla específica y accionable.`,
    key: 'contextSwitch',
    optional: true,
  },
  {
    id: 7,
    name: 'Filtro Basado en Interés',
    emoji: '🎯',
    description: 'Gamifica lo aburrido',
    prompt: (task) =>
      `Sigo trabajando en "${task}". Ayúdame a gamificar el trabajo restante conectándolo con lo que estoy hyper-fijado ahorita. Crea una estructura de "Misión" donde terminar la tarea desbloquea una recompensa. Hazlo específico y alcanzable.`,
    key: 'gamify',
    optional: true,
  },
];

type Phase = 'input' | 'steps' | 'done';

export function ADHDSequenceHelper() {
  const [phase, setPhase] = useState<Phase>('input');
  const [task, setTask] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const step = STEPS[currentStep];

  const startSequence = useCallback(() => {
    const trimmed = taskInput.trim();
    if (!trimmed) return;
    setTask(trimmed);
    setCurrentStep(0);
    setSkipped(new Set());
    setPhase('steps');
  }, [taskInput]);

  const goNext = useCallback(() => {
    setCopied(false);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setPhase('done');
    }
  }, [currentStep]);

  const goPrev = useCallback(() => {
    setCopied(false);
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const skipStep = useCallback(() => {
    if (!step?.optional) return;
    setCopied(false);
    setSkipped((prev) => new Set([...prev, step.key]));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setPhase('done');
    }
  }, [step, currentStep]);

  const restart = useCallback(() => {
    setPhase('input');
    setTaskInput('');
    setTask('');
    setCurrentStep(0);
    setSkipped(new Set());
    setCopied(false);
  }, []);

  const copyPrompt = useCallback(() => {
    if (!step) return;
    navigator.clipboard.writeText(step.prompt(task)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [step, task]);

  /* ── Input phase ─────────────────────────────────────────── */
  if (phase === 'input') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">⚡</div>
            <h1 className="text-2xl font-bold text-white mb-2">ADHD Sequence Helper</h1>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Guía de 7 pasos para ejecutar cualquier tarea sin parálisis.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-[#18181b] border border-white/[0.10] focus-within:border-violet-500/45 rounded-2xl px-4 py-3 transition-all duration-200">
              <label className="block text-[11px] text-neutral-500 uppercase tracking-wider mb-2 font-semibold">
                ¿Cuál es tu tarea?
              </label>
              <textarea
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    startSequence();
                  }
                }}
                placeholder="Ej: Escribir el reporte de ventas del Q2..."
                rows={3}
                className="w-full bg-transparent text-neutral-100 placeholder-neutral-600 text-sm resize-none outline-none leading-relaxed"
                autoFocus
              />
            </div>

            <button
              onClick={startSequence}
              disabled={!taskInput.trim()}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-colors text-sm"
            >
              <Zap size={16} />
              Iniciar Secuencia
            </button>
          </div>

          <div className="mt-10">
            <p className="text-[11px] text-neutral-600 uppercase tracking-wider font-semibold text-center mb-4">
              Los 7 pasos
            </p>
            {STEPS.map((s) => (
              <div key={s.key} className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-500">
                <span className="text-base shrink-0">{s.emoji}</span>
                <span className="flex-1">{s.name}</span>
                {s.optional && (
                  <span className="text-[10px] text-neutral-700 bg-white/5 px-2 py-0.5 rounded-full">
                    Opcional
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    );
  }

  /* ── Done phase ──────────────────────────────────────────── */
  if (phase === 'done') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-bold text-white mb-3">¡Secuencia Completada!</h2>
          <p className="text-neutral-400 text-sm mb-2">
            Tarea:{' '}
            <span className="text-neutral-200 font-medium">{task}</span>
          </p>
          <p className="text-neutral-500 text-sm mb-10">~20-25 minutos</p>

          <div className="w-full space-y-2 mb-10 text-left">
            {STEPS.map((s) => (
              <div
                key={s.key}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm ${
                  skipped.has(s.key) ? 'text-neutral-600' : 'text-neutral-300'
                }`}
              >
                {skipped.has(s.key) ? (
                  <span className="text-neutral-700 shrink-0">○</span>
                ) : (
                  <CheckCircle2 size={16} className="text-violet-400 shrink-0" />
                )}
                <span>
                  {s.emoji} {s.name}
                </span>
                {skipped.has(s.key) && (
                  <span className="text-[10px] text-neutral-700 ml-auto">Saltado</span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={restart}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
          >
            <Zap size={16} />
            Nueva Tarea
          </button>
        </motion.div>
      </main>
    );
  }

  /* ── Steps phase ─────────────────────────────────────────── */
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <main className="flex flex-col min-h-screen max-w-2xl mx-auto w-full px-4 py-6">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 text-xs text-neutral-500">
          <span className="font-medium">
            Paso {currentStep + 1} de {STEPS.length}
          </span>
          <button
            onClick={restart}
            className="flex items-center gap-1 hover:text-neutral-300 transition-colors"
          >
            <RotateCcw size={11} />
            Reiniciar
          </button>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-violet-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <div className="flex gap-1.5 mt-2">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i < currentStep
                  ? skipped.has(s.key)
                    ? 'bg-white/10'
                    : 'bg-violet-600'
                  : i === currentStep
                  ? 'bg-violet-400'
                  : 'bg-white/5'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Task chip */}
      <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
        <span className="text-neutral-500 text-xs shrink-0">Tarea:</span>
        <span className="text-neutral-300 text-xs font-medium truncate">{task}</span>
      </div>

      {/* Step card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex-1 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1228] border border-violet-500/20 flex items-center justify-center text-2xl shrink-0">
              {step.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-lg font-bold text-white">{step.name}</h2>
                {step.optional && (
                  <span className="text-[10px] text-violet-400/70 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                    Opcional
                  </span>
                )}
              </div>
              <p className="text-neutral-400 text-sm">{step.description}</p>
            </div>
          </div>

          {/* Prompt box */}
          <div className="flex-1 bg-[#13121a] border border-white/[0.08] rounded-2xl p-5 mb-4">
            <p className="text-[11px] text-violet-400/70 uppercase tracking-wider font-semibold mb-3">
              Prompt
            </p>
            <p className="text-neutral-200 text-sm leading-[1.75] whitespace-pre-wrap">
              {step.prompt(task)}
            </p>
          </div>

          {/* Copy */}
          <button
            onClick={copyPrompt}
            className={`w-full flex items-center justify-center gap-2.5 font-semibold py-3.5 rounded-xl transition-all text-sm mb-3 ${
              copied
                ? 'bg-green-600/20 border border-green-500/30 text-green-400'
                : 'bg-violet-600 hover:bg-violet-500 text-white'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle2 size={15} />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy size={15} />
                Copiar Prompt
              </>
            )}
          </button>

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed text-neutral-300 rounded-xl transition-colors text-sm flex-1"
            >
              <ChevronLeft size={15} />
              Atrás
            </button>

            {step.optional && (
              <button
                onClick={skipStep}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-400 rounded-xl transition-colors text-sm"
              >
                <SkipForward size={14} />
                Saltar
              </button>
            )}

            <button
              onClick={goNext}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium rounded-xl transition-colors text-sm flex-1"
            >
              {currentStep === STEPS.length - 1 ? 'Finalizar' : 'Siguiente'}
              <ChevronRight size={15} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
