import React, { useRef, useState } from "react";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [mixUrl, setMixUrl] = useState(null);
  const [stems, setStems] = useState([
    { name: "Drums", url: null },
    { name: "Bass", url: null },
    { name: "Guitar", url: null },
    { name: "Vocals", url: null },
    { name: "Other", url: null },
  ]);

  const fileInputRef = useRef(null);
  const audioRefs = useRef({}); // { "FullMix": HTMLAudioElement, "Drums": ... }

  // demo audio placeholder (substitui por URL vindo do teu backend)
  const DEMO =
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_3dbd2dcf8a.mp3?filename=lofi-study-112191.mp3";

  async function fakeProgress(cb) {
    setProgress(5);
    const steps = [15, 28, 42, 57, 71, 84, 93, 100];
    for (const p of steps) {
      await new Promise((r) => setTimeout(r, 280));
      setProgress(p);
    }
    cb && cb();
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      // 🔌 Troca por POST /api/generate { prompt }
      await fakeProgress(() => {
        setMixUrl(DEMO);
        setStems((prev) =>
          prev.map((s) => ({
            ...s,
            url: DEMO, // no real: viria do teu backend (stems por instrumento)
          }))
        );
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      // 🔌 Troca por upload real: POST /api/upload (FormData), depois polling /api/jobs/:id
      await fakeProgress(() => {
        setMixUrl(DEMO);
        setStems((prev) =>
          prev.map((s) => ({
            ...s,
            url: DEMO,
          }))
        );
      });
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function togglePlay(key) {
    const a = audioRefs.current[key];
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
    // força re-render para atualizar label
    setTimeout(() => {
      // noop — só para re-render leve
      // (ou poderias usar state por faixa, mas mantemos simples)
    }, 0);
  }

  function isPlaying(key) {
    const a = audioRefs.current[key];
    return a && !a.paused;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-black text-white grid place-items-center font-bold">
              ♫
            </div>
            <span className="font-semibold">AI Music Editor</span>
          </div>
          <span className="text-sm text-gray-500">MVP • Prompt → Stems</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Prompt + Actions */}
        <section className="border rounded-xl p-4 shadow-sm">
          <h2 className="text-base font-semibold mb-3">
            Describe what you want to create or edit
          </h2>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Add an energetic guitar riff at 1:30. Keep drums and bass."
            className="w-full min-h-[96px] rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
            >
              {isGenerating ? "Generating…" : "Generate with AI"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={handleUploadClick}
              disabled={uploading}
              className="rounded-lg border px-4 py-2 disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload a song"}
            </button>
          </div>

          {(isGenerating || uploading) && (
            <div className="mt-4">
              <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                <div
                  className="h-2 bg-gray-900 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Processing… demo progress bar
              </p>
            </div>
          )}
        </section>

        {/* Full Mix */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Full Mix</h3>
          <div className="border rounded-xl p-4">
            {mixUrl ? (
              <Player
                label="FullMix"
                src={mixUrl}
                audioRefs={audioRefs}
                onToggle={togglePlay}
                isPlaying={isPlaying}
              />
            ) : (
              <div className="h-20 rounded-xl border border-dashed grid place-items-center text-sm text-gray-400">
                Your mix will appear here after generation or upload
              </div>
            )}
          </div>
        </section>

        {/* Stems */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Stems</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stems.map((s) => (
              <div
                key={s.name}
                className="border rounded-xl p-4 shadow-sm flex flex-col gap-3"
              >
                <div className="text-sm font-medium">{s.name}</div>
                {s.url ? (
                  <Player
                    label={s.name}
                    src={s.url}
                    audioRefs={audioRefs}
                    onToggle={togglePlay}
                    isPlaying={isPlaying}
                    compact
                  />
                ) : (
                  <div className="h-16 rounded-xl border border-dashed grid place-items-center text-xs text-gray-400">
                    Stem will appear here
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-sm opacity-60 cursor-not-allowed"
                    title="Soon"
                  >
                    Edit section
                  </button>
                  <button
                    className="rounded-lg border px-3 py-1.5 text-sm opacity-60 cursor-not-allowed"
                    title="Soon"
                  >
                    Lock stem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Exports */}
        <section className="pt-2">
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg border px-4 py-2 disabled:opacity-50"
              disabled={!mixUrl}
              title={!mixUrl ? "Generate or upload first" : "Download WAV"}
            >
              Download Mix (WAV)
            </button>
            <button
              className="rounded-lg border px-4 py-2 disabled:opacity-50"
              disabled={!stems.some((s) => s.url)}
              title={!stems.some((s) => s.url) ? "Generate or upload first" : "Download ZIP"}
            >
              Download Stems (ZIP)
            </button>
            <button
              className="rounded-lg border px-4 py-2 opacity-60 cursor-not-allowed"
              title="Coming soon"
            >
              Export MIDI (soon)
            </button>
          </div>
        </section>

        <footer className="text-xs text-gray-400 pt-8">
          Demo UI — wire your backend endpoints to make generate/upload real. Replace placeholder audio URLs with signed
          URLs from your API.
        </footer>
      </main>
    </div>
  );
}

function Player({ label, src, audioRefs, onToggle, isPlaying, compact = false }) {
  return (
    <div className={`w-full ${compact ? "p-2" : "p-3"} rounded-xl border flex items-center gap-3`}>
      <button
        onClick={() => onToggle(label)}
        className="rounded-lg bg-black text-white px-3 py-1.5"
      >
        {isPlaying(label) ? "Pause" : "Play"}
      </button>

      <div className="flex-1 min-w-0">
        <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
          {/* barra fake só para dar feedback visual */}
          <div
            className={`h-2 ${isPlaying(label) ? "bg-gray-900 w-full" : "bg-gray-300 w-0"}`}
            style={{ transition: "width 8s linear" }}
          />
        </div>
      </div>

      <audio
        ref={(el) => (audioRefs.current[label] = el)}
        src={src}
        preload="none"
        onEnded={() => onToggle(label)} // volta ao estado "Pause" no fim
      />
    </div>
  );
}

