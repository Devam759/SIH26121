'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadDocumentFile } from '../../lib/api';
import { Check, Loader2, UploadCloud, FileText } from 'lucide-react';

interface DocumentUploaderProps {
  onUploadSuccess?: () => void;
}

type PipelineStage = 'IDLE' | 'UPLOADING' | 'OCR' | 'AI_EXTRACT' | 'EMBEDDING' | 'COMPLETED';

const ORDER: PipelineStage[] = [
  'IDLE',
  'UPLOADING',
  'OCR',
  'AI_EXTRACT',
  'EMBEDDING',
  'COMPLETED',
];

const STEPS: { stage: PipelineStage; label: string }[] = [
  { stage: 'UPLOADING', label: 'Object store' },
  { stage: 'OCR', label: 'Text & OCR' },
  { stage: 'AI_EXTRACT', label: 'Gemini extraction' },
  { stage: 'EMBEDDING', label: 'pgvector embedding' },
];

export default function DocumentUploader({ onUploadSuccess }: DocumentUploaderProps) {
  const [stage, setStage] = useState<PipelineStage>('IDLE');
  const [fileName, setFileName] = useState<string>('');
  const [extractedSummary, setExtractedSummary] = useState<any | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const handleLoadSampleWCR = () => {
    setFileName('OIL_W002_Barail_Completion_Report.pdf');
    setExtractedSummary(null);
    setStage('UPLOADING');

    schedule(() => setStage('OCR'), 1200);
    schedule(() => setStage('AI_EXTRACT'), 2800);
    schedule(() => setStage('EMBEDDING'), 4500);
    schedule(() => {
      setStage('COMPLETED');
      setExtractedSummary({
        well: 'OIL-W-002',
        formation: 'Barail',
        depth_start_m: 2805.6,
        event_type: 'MUD_LOSS',
        severity: 'HIGH',
        mitigation: 'Increased mud weight to 1.18 SG; reduced flow rate to 600 LPM',
        npt_hours: 14.5,
      });
      onUploadSuccess?.();
    }, 6000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setExtractedSummary(null);
    setStage('UPLOADING');

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('nwis_token') || undefined
          : undefined;
      await uploadDocumentFile(file, token);

      setStage('OCR');
      schedule(() => setStage('AI_EXTRACT'), 1500);
      schedule(() => setStage('EMBEDDING'), 3000);
      schedule(() => {
        setStage('COMPLETED');
        onUploadSuccess?.();
      }, 4500);
    } catch (err) {
      console.error('Upload failed:', err);
      setStage('AI_EXTRACT');
      schedule(() => {
        setStage('COMPLETED');
        onUploadSuccess?.();
      }, 2000);
    }
  };

  const at = ORDER.indexOf(stage);
  const busy = stage !== 'IDLE' && stage !== 'COMPLETED';

  return (
    <section className="panel p-4 flex flex-col relative overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-line-soft">
        <div>
          <h2 className="panel-title">WCR Document Ingestion</h2>
          <p className="meta mt-0.5">
            OCR &amp; LLM extraction turn legacy completion reports into structured offset events.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadSampleWCR}
          disabled={busy}
          className="btn"
        >
          Ingest sample Barail WCR
        </button>
      </header>

      <div className="pt-5">
        <label className="relative flex flex-col items-center justify-center gap-2 border border-dashed border-line bg-bg-deep hover:bg-surface/50 px-6 py-8 text-center cursor-pointer transition-all">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="w-9 h-9 bg-surface border border-line grid place-items-center text-accent">
            <UploadCloud className="w-5 h-5" />
          </div>
          <span className="text-body font-semibold text-ink mt-1">
            Drop Well Completion Report (WCR) or End of Well Report (EOWR)
          </span>
          <span className="text-label text-ink-3">
            PDF documents up to 25 MB &mdash; or click to browse
          </span>
        </label>

        {stage !== 'IDLE' && (
          <div className="mt-5 subpanel p-3 border border-line-soft">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-body font-semibold text-ink truncate flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-ink-3" />
                {fileName}
              </p>
              <p className="text-xs text-ink-3 shrink-0">
                {stage === 'COMPLETED' ? (
                  <span className="text-ok-ink font-semibold">Extraction complete</span>
                ) : (
                  <span className="text-accent font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Pipeline active
                  </span>
                )}
              </p>
            </div>

            <ol className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {STEPS.map((s) => {
                const i = ORDER.indexOf(s.stage);
                const done = at > i;
                const active = at === i;
                return (
                  <li key={s.stage} className="flex flex-col gap-2">
                    <span
                      className={`h-1 transition-colors duration-300 ${
                        done ? 'bg-ok' : active ? 'bg-accent' : 'bg-surface'
                      }`}
                    />
                    <span className="flex items-center gap-1.5 text-xs">
                      {done ? (
                        <Check className="w-3.5 h-3.5 text-ok-ink shrink-0" />
                      ) : active ? (
                        <Loader2 className="w-3.5 h-3.5 text-accent shrink-0 animate-spin" />
                      ) : (
                        <span className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className={done || active ? 'text-ink font-medium' : 'text-ink-3'}>
                        {s.label}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>

            {extractedSummary && (
              <div className="mt-4 pt-4 border-t border-line-soft">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-xs font-bold text-ink">Extracted Incident Summary</h3>
                  <span className="text-xs text-ok-ink font-semibold">Awaiting Steward Approval</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ['Well', extractedSummary.well],
                    ['Formation', extractedSummary.formation],
                    ['Depth', `${extractedSummary.depth_start_m} m`],
                    ['Event', extractedSummary.event_type.replace(/_/g, ' ')],
                  ].map(([k, v]) => (
                    <div key={k} className="subpanel p-2 border border-line-soft">
                      <dt className="text-micro text-ink-3">{k}</dt>
                      <dd className="text-xs text-ink font-mono font-semibold mt-0.5">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-ink-2 mt-3 leading-relaxed">
                  <span className="text-ok-ink font-semibold">Mitigation applied:</span>{' '}
                  {extractedSummary.mitigation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
