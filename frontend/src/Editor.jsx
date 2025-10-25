import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const MB = 1024 * 1024;

export default function Editor({ onNavigateHome, accessToken, planLimits, profile, onUsageUpdate }) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const [mixUrl, setMixUrl] = useState(null);
  const [signedExpiry, setSignedExpiry] = useState(null);
  const [stems, setStems] = useState([
    { name: "Drums", url: null },
    { name: "Bass", url: null },
    { name: "Guitar", url: null },
    { name: "Vocals", url: null },
    { name: "Other", url: null },
  ]);

  const [usage, setUsage] = useState({ count: 0, limit: null });

  const fileInputRef = useRef(null);
  const audioRefs = useRef({});
  const [, forceRender] = useState(0);

  const API_BASE_URL = useMemo(() => {
    const envUrl = import.meta.env.VITE_API_URL?.trim();
    if (envUrl) return envUrl.replace(/\/$/, "");

    if (typeof window !== "undefined") {
      const { hostname } = window.location;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:5000";
      }
    }

    return "https://risibly-uncatholical-hillary.ngrok-free.dev";
  }, []);

  useEffect(() => {
    const nextCount = planLimits?.monthlyRenderCount ?? profile?.monthly_render_count ?? 0;
    const nextLimit =
      planLimits?.monthlyRenderLimit ?? planLimits?.maxMonthlyRenders ?? profile?.monthly_render_limit ?? null;
    setUsage({ count: nextCount ?? 0, limit: nextLimit ?? null });
  }, [planLimits, profile?.monthly_render_count, profile?.monthly_render_limit]);

  const planName = planLimits?.name ?? (profile?.plan ?? "Free");
  const maxUploadBytes = planLimits?.maxUploadBytes ?? null;
  const maxUploadMb = useMemo(() => {
    if (!maxUploadBytes) return null;
    return Math.round(maxUploadBytes / MB);
  }, [maxUploadBytes]);

  const renderQuotaCopy = useMemo(() => {
    if (usage.limit === null || usage.limit === undefined) {
      return `${usage.count ?? 0} renders this month`;
    }
    return `${usage.count ?? 0} / ${usage.limit} renders used`;
  }, [usage.count, usage.limit]);

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setProgress(0);
    setFeedback(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setFeedback("AI generation pipeline is coming soon — upload stems while we train the model.");
    } catch (e) {
      console.error(e);
      setFeedback(e.message || "Falha ao gerar");
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }

  function handleUploadClick() {
    if (!accessToken) {
      setFeedback("Sessão expirada. Faça login novamente para continuar.");
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleFileChange(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;

    if (maxUploadBytes && file.size > maxUploadBytes) {
      setFeedback(
        `O ficheiro excede o limite de ${maxUploadMb} MB do seu plano. Atualize o plano ou carregue um ficheiro mais pequeno.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setProgress(0);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE_URL}/api/upload`);
        xhr.responseType = "json";
        xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setProgress(pct);
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload"));
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(xhr.response?.error || "Upload failed"));
          }
        };

        xhr.send(formData);
      });

      const audioUrl = data?.audioUrl;
      if (!audioUrl) {
        throw new Error("Resposta inválida do servidor");
      }

      setMixUrl(audioUrl);
      setSignedExpiry(data?.expiresAt ? new Date(data.expiresAt * 1000) : null);
      setStems((prev) => prev.map((stem) => ({ ...stem, url: null })));
      setProgress(100);
      setFeedback("Upload concluído. O URL de download é protegido e expira automaticamente.");

      if (data?.planLimits?.monthlyRenderCount !== undefined) {
        setUsage((prev) => ({ ...prev, count: data.planLimits.monthlyRenderCount ?? prev.count }));
      }

      if (typeof onUsageUpdate === "function") {
        Promise.resolve(onUsageUpdate()).catch((err) => console.error("Failed to refresh profile", err));
      }
    } catch (e) {
      console.error(e);
      setFeedback(e.message || "Falha no upload");
      alert(e.message || "Falha no upload");
    } finally {
      setUploading(false);
      setProgress(0);
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

  const signedExpiryCopy = useMemo(() => {
    if (!signedExpiry) return null;
    return signedExpiry.toLocaleString();
  }, [signedExpiry]);

  return (
    <div className="app-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <div className="app-container">
        <header className="app-header glass-card">
          <div className="brand">
            <div className="brand-icon">♫</div>
            <div>
              <h1>Creative Studio</h1>
              <p>AI-enhanced mixing & stem design</p>
            </div>
          </div>
          <div className="header-right">
            <div className="plan-pill">
              <span className="plan-pill-name">{planName}</span>
              <span className="plan-pill-usage">{renderQuotaCopy}</span>
            </div>
            {onNavigateHome && (
              <button className="btn btn-secondary" onClick={onNavigateHome} type="button">
                Back to landing
              </button>
            )}
          </div>
        </header>

        <main className="content">
          <section className="panel glass-card prompt-panel">
            <div className="panel-header">
              <div>
                <h2>Describe your next sonic idea</h2>
                <p>
                  Paint the vibe, instruments, or transitions you want. Upload an existing mix to reshape it with AI.
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
              <button onClick={handleGenerate} disabled={isGenerating} className="btn btn-primary" type="button">
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
              <button onClick={handleUploadClick} disabled={uploading} className="btn btn-secondary" type="button">
                {uploading ? "Uploading…" : "Upload reference mix"}
              </button>

              {progress > 0 && uploading && <span className="upload-progress">{progress}%</span>}
            </div>

            {maxUploadMb && (
              <p className="plan-footnote">Upload limit: {maxUploadMb} MB · Signed URLs expire automatically.</p>
            )}
            {feedback && <p className="editor-feedback">{feedback}</p>}
            {signedExpiryCopy && <p className="plan-footnote">Download link expira em {signedExpiryCopy}.</p>}
          </section>

          <section className="panel glass-card">
            <div className="panel-header">
              <div>
                <h2>Full mix preview</h2>
                <p>Use the protected link below to audition your upload securely.</p>
              </div>
              <span className="badge">Signed URL</span>
            </div>

            <div className="audio-grid">
              <div className="audio-card">
                <div className="audio-card-header">
                  <h3>Full Mix</h3>
                  {mixUrl ? (
                    <button className="btn btn-outline" onClick={() => togglePlay("FullMix")} type="button">
                      {isPlaying("FullMix") ? "Pause" : "Play"}
                    </button>
                  ) : (
                    <span className="audio-placeholder">Upload a track to listen</span>
                  )}
                </div>
                {mixUrl && (
                  <audio
                    ref={(el) => {
                      if (el) audioRefs.current.FullMix = el;
                    }}
                    src={mixUrl}
                    onEnded={() => handleEnded("FullMix")}
                    controls
                  />
                )}
              </div>
            </div>
          </section>

          <section className="panel glass-card">
            <div className="panel-header">
              <div>
                <h2>Stem lanes</h2>
                <p>AI stem sculpting arrives next — you&apos;ll be able to regenerate and bounce individual layers here.</p>
              </div>
              <span className="badge">Coming soon</span>
            </div>

            <div className="stems-grid">
              {stems.map((stem) => (
                <div key={stem.name} className="stem-card">
                  <header className="stem-header">
                    <span className="stem-name">{stem.name}</span>
                    {stem.url ? (
                      <button className="btn btn-ghost" onClick={() => togglePlay(stem.name)} type="button">
                        {isPlaying(stem.name) ? "Pause" : "Play"}
                      </button>
                    ) : (
                      <span className="audio-placeholder">Render pending</span>
                    )}
                  </header>
                  {stem.url && (
                    <audio
                      ref={(el) => {
                        if (el) audioRefs.current[stem.name] = el;
                      }}
                      src={stem.url}
                      onEnded={() => handleEnded(stem.name)}
                      controls
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
