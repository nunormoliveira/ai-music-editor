import React, { useRef, useState } from "react";
import "./App.css";

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
  const [, forceRender] = useState(0);

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
    forceRender((n) => n + 1);
  }

  function isPlaying(key) {
    const a = audioRefs.current[key];
    return a && !a.paused;
  }

  function handleEnded(key) {
    const a = audioRefs.current[key];
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    forceRender((n) => n + 1);
  }

  return (
    <div className="app-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <div className="app-container">
        <header className="app-header glass-card">
          <div className="brand">
            <div className="brand-icon">♫</div>
            <div>
              <h1>Pulsar Studio</h1>
              <p>AI-enhanced mixing & stem design</p>
            </div>
          </div>
          <div className="header-status">
            <span className="status-indicator" />
            <span>Realtime stem sculpting</span>
          </div>
        </header>

        <main className="content">
          <section className="panel glass-card prompt-panel">
            <div className="panel-header">
              <div>
                <h2>Describe your next sonic idea</h2>
                <p>
                  Paint the vibe, instruments, or transitions you want. Upload an existing mix to
                  reshape it with AI.
                </p>
              </div>
              <span className="badge">Creative mode</span>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Dreamy synthwave intro, add shimmering vocals at 0:45 and tighten the kick."
              className="prompt-input"
            />

            <div className="action-row">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="btn btn-primary"
              >
                {isGenerating ? (
                  <span className="btn-inner">
                    <span className="loader" /> Generating
                  </span>
                ) : (
                  <span className="btn-inner">Generate with AI</span>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden-input"
                onChange={handleFileChange}
              />
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="btn btn-secondary"
              >
                {uploading ? (
                  <span className="btn-inner">
                    <span className="loader" /> Uploading
                  </span>
                ) : (
                  <span className="btn-inner">Upload a song</span>
                )}
              </button>
            </div>

            {(isGenerating || uploading) && (
              <div className="progress-card">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-meta">
                  {isGenerating ? "Synthesising layers" : "Lifting stems"} · {progress}%
                </p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <h3>Full mix</h3>
                <p>Preview the master with every texture combined.</p>
              </div>
            </div>

            <div className="player-surface glass-card">
              {mixUrl ? (
                <Player
                  label="FullMix"
                  src={mixUrl}
                  audioRefs={audioRefs}
                  onToggle={togglePlay}
                  isPlaying={isPlaying}
                  onEnded={handleEnded}
                />
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🎧</div>
                  <p>Your generated mix will land here—craft a prompt or upload a track.</p>
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <h3>Isolated stems</h3>
                <p>Solo each layer to sculpt transitions and dynamics.</p>
              </div>
            </div>

            <div className="stems-grid">
              {stems.map((s) => (
                <div key={s.name} className="stem-card glass-card">
                  <div className="stem-header">
                    <span className="stem-name">{s.name}</span>
                    <span className="stem-chip">AI</span>
                  </div>
                  {s.url ? (
                    <Player
                      label={s.name}
                      src={s.url}
                      audioRefs={audioRefs}
                      onToggle={togglePlay}
                      isPlaying={isPlaying}
                      onEnded={handleEnded}
                      compact
                    />
                  ) : (
                    <div className="stem-empty">
                      <span>Waiting for stem to be rendered…</span>
                    </div>
                  )}

                  <div className="stem-actions">
                    <button className="btn btn-ghost" disabled title="Coming soon">
                      Edit section
                    </button>
                    <button className="btn btn-ghost" disabled title="Coming soon">
                      Lock stem
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <h3>Export assets</h3>
                <p>Bounce high-quality audio for your DAW session.</p>
              </div>
            </div>

            <div className="export-actions">
              <button
                className="btn btn-outline"
                disabled={!mixUrl}
                title={!mixUrl ? "Generate or upload first" : "Download WAV"}
              >
                Download mix (WAV)
              </button>
              <button
                className="btn btn-outline"
                disabled={!stems.some((s) => s.url)}
                title={!stems.some((s) => s.url) ? "Generate or upload first" : "Download ZIP"}
              >
                Download stems (ZIP)
              </button>
              <button className="btn btn-ghost" disabled title="Coming soon">
                Export MIDI (soon)
              </button>
            </div>
          </section>

          <footer className="footer-note">
            Demo UI — plug in your backend endpoints for generation & uploads, then replace the placeholder
            audio URLs with secure links from your API.
          </footer>
        </main>
      </div>
    </div>
  );
}

function Player({ label, src, audioRefs, onToggle, isPlaying, onEnded, compact = false }) {
  return (
    <div className={`player ${compact ? "player-compact" : ""}`}>
      <button onClick={() => onToggle(label)} className="player-button" aria-label="Toggle playback">
        {isPlaying(label) ? "❚❚" : "▶"}
      </button>

      <div className="player-details">
        <span className="player-label">{label}</span>
        <div className="progress-track">
          <div className={`progress-visual ${isPlaying(label) ? "is-playing" : ""}`} />
        </div>
      </div>

      <audio
        ref={(el) => (audioRefs.current[label] = el)}
        src={src}
        preload="none"
        onEnded={() => onEnded(label)}
      />
    </div>
  );
}

