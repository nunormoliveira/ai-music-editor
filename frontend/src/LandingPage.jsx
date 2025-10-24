import { useMemo, useState } from "react";

const features = [
  {
    title: "AI-assisted arranging",
    description:
      "Sketch transitions in natural language and watch Creative Studio translate them into evolving layers and textures in seconds.",
    accent: "from-sky-400 via-indigo-400 to-purple-500",
  },
  {
    title: "Stem-first workflow",
    description:
      "Upload an existing idea and generate polished stems that stay locked to your groove. Solo, tweak and bounce them instantly.",
    accent: "from-emerald-400 via-cyan-400 to-sky-500",
  },
  {
    title: "Mix intelligence",
    description:
      "Level, pan and EQ recommendations surface in real time while you explore sounds — no more second guessing your balances.",
    accent: "from-amber-400 via-orange-400 to-rose-500",
  },
];

const workflowSteps = [
  {
    title: "Describe the vibe",
    blurb: "Start with a prompt or drop in a rough bounce. Creative Studio understands structure, dynamics and instrumentation.",
  },
  {
    title: "Shape every stem",
    blurb: "Solo each stem, lock the parts you love and regenerate the rest. Preview mix revisions without touching a DAW.",
  },
  {
    title: "Export without friction",
    blurb: "Download WAVs, stems and session notes ready to drag into your project. Keep iterating whenever inspiration hits.",
  },
];

const stats = [
  { label: "Faster arrangement", value: "5×" },
  { label: "Stems rendered", value: "12k+" },
  { label: "Producers onboard", value: "3.4k" },
];

export default function LandingPage({ onStart, onSignOut, planLimits, profile, session }) {
  const [activeFeature, setActiveFeature] = useState(0);

  const activeCopy = useMemo(() => features[activeFeature], [activeFeature]);
  const energyBars = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, index) => ({
        id: index,
        height: Math.round(Math.random() * 36 + 12),
        emphasized: index % 3 === 0,
      })),
    []
  );

  const uploadLimitMb = planLimits?.maxUploadBytes
    ? Math.round(planLimits.maxUploadBytes / (1024 * 1024))
    : null;
  const renderLimit = planLimits?.monthlyRenderLimit ?? planLimits?.maxMonthlyRenders ?? "∞";

  return (
    <div id="top" className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute left-[10%] top-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[5%] top-1/2 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <a className="flex items-center gap-3 text-lg font-semibold text-white" href="#top">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-400 font-semibold text-slate-950">
              ♫
            </span>
            Creative Studio
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <a className="transition hover:text-white" href="#features">
              Features
            </a>
            <a className="transition hover:text-white" href="#workflow">
              Workflow
            </a>
            <a className="transition hover:text-white" href="#community">
              Community
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:text-white"
              type="button"
              onClick={() => {
                const target = document.querySelector("#features");
                target?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore features
            </button>
            <button
              className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02] focus:outline-none focus-visible:ring focus-visible:ring-indigo-400/60"
              type="button"
              onClick={onStart}
            >
              Open editor
            </button>
            {onSignOut && (
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:text-white"
                type="button"
                onClick={onSignOut}
              >
                Sign out
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto mt-6 flex max-w-6xl flex-col gap-24 px-6 pb-24">
          <section className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-8">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200/80 backdrop-blur">
                A new way to finish tracks
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Craft immersive mixes with an AI producer that understands your language.
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-slate-300">
                Creative Studio captures the intent in your prompts, translates it to musical decisions and keeps you in control with tactile stem editing tools. Spend more time sculpting energy, not troubleshooting plugins.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02] focus:outline-none focus-visible:ring focus-visible:ring-indigo-400/60"
                  type="button"
                  onClick={onStart}
                >
                  Go to editor
                </button>
                <span className="text-sm text-slate-400">
                  Signed in as {session?.user?.email ?? "guest"}. Current plan: {planLimits?.name ?? profile?.plan ?? "Free"}.
                </span>
              </div>
              {planLimits && (
                <div className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold uppercase tracking-[0.25em] text-indigo-200/80">Plan limits</span>
                    <span className="text-slate-300/90">{planLimits.name}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400/80">Upload size</p>
                      <p className="text-base font-semibold text-white">{uploadLimitMb ?? "∞"} MB</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400/80">Monthly renders</p>
                      <p className="text-base font-semibold text-white">{renderLimit}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Upcoming upgrades: two-factor authentication, passkeys/WebAuthn, session logs and refresh token revocation.
                  </p>
                </div>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-3xl bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-sky-400/30 blur-2xl" />
              <div className="relative rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-[0.3em] text-indigo-300/80">Live session</span>
                  <span>AI mix mentor</span>
                </div>
                <div className="mt-8 space-y-5">
                  <div className="rounded-2xl bg-white/5 p-4 shadow-inner">
                    <div className="flex items-center justify-between text-sm font-medium text-white/90">
                      <span>Prompt insight</span>
                      <span className="text-indigo-300">Realtime</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      "Push the chorus synths forward, glide vocals into a shimmer and lift the bass by 2dB during the bridge."
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4 shadow-inner">
                    <div className="flex items-center justify-between text-sm font-medium text-white/90">
                      <span>Stem focus</span>
                      <span className="text-indigo-300">Drums</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-800">
                      <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500" />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4 shadow-inner">
                    <div className="flex items-center justify-between text-sm font-medium text-white/90">
                      <span>Energy curve</span>
                      <span className="text-indigo-300">+18%</span>
                    </div>
                  <div className="mt-3 grid grid-cols-12 gap-1">
                    {energyBars.map((bar) => (
                      <span
                        key={bar.id}
                        className={`block w-full rounded-full bg-gradient-to-t from-indigo-500/30 via-purple-400/40 to-sky-300/60 transition duration-500 ${
                          bar.emphasized ? "opacity-90" : "opacity-60"
                        }`}
                        style={{ height: `${bar.height}px` }}
                      />
                    ))}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-16 lg:grid-cols-[0.55fr_0.45fr]" id="features">
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">Designed for fluid collaboration with your future self</h2>
              <p className="text-base text-slate-300">
                Hover each mode to feel how the Creative Studio engine adapts to your workflow. Every feature is built with instant feedback loops so you can keep momentum without technical roadblocks.
              </p>
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 backdrop-blur">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400/80">Highlighted</p>
                <h3 className="mt-4 text-2xl font-semibold text-white">{activeCopy.title}</h3>
                <p className="mt-3 text-base text-slate-300">{activeCopy.description}</p>
              </div>
            </div>
            <div className="grid gap-6">
              {features.map((feature, index) => (
                <button
                  key={feature.title}
                  type="button"
                  onMouseEnter={() => setActiveFeature(index)}
                  onFocus={() => setActiveFeature(index)}
                  className={`group relative overflow-hidden rounded-3xl border border-white/${
                    activeFeature === index ? "30" : "10"
                  } bg-slate-900/70 p-6 text-left shadow-lg transition duration-300 hover:-translate-y-1 hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400`}
                >
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 ${
                      activeFeature === index ? "opacity-100" : ""
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-40`} />
                  </div>
                  <div className="relative space-y-3">
                    <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                      Mode {index + 1}
                    </div>
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-300">{feature.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-12 lg:grid-cols-[0.45fr_0.55fr]" id="workflow">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 backdrop-blur">
              <h2 className="text-3xl font-semibold text-white">A workflow you can feel</h2>
              <p className="mt-4 text-base text-slate-300">
                We built Creative Studio to slot into any stage of your process. Whether you are starting from a blank prompt or polishing a live recording, the timeline is always listening and responding.
              </p>
              <div className="mt-6 grid gap-6">
                {workflowSteps.map((step, index) => (
                  <div key={step.title} className="rounded-2xl bg-slate-900/70 p-5 shadow-lg">
                    <div className="flex items-center justify-between text-sm font-semibold text-indigo-300">
                      <span className="text-white/90">{step.title}</span>
                      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Step {index + 1}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{step.blurb}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-8" id="community">
              <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-lg">
                <h3 className="text-2xl font-semibold text-white">Producers already love the flow</h3>
                <blockquote className="mt-4 space-y-4 text-base text-slate-300">
                  <p>
                    “Creative Studio feels like jamming with a co-producer who knows my references. I can map out a full arrangement before my coffee gets cold.”
                  </p>
                  <footer className="text-sm font-semibold text-indigo-200">— Mila, indie pop producer</footer>
                </blockquote>
              </div>
              <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200 backdrop-blur">
                <div className="font-semibold uppercase tracking-[0.3em] text-slate-300">What changes on launch</div>
                <ul className="grid gap-3">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                    <span>Full-length renders with recallable AI mix notes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                    <span>Hybrid mastering chain tuned to your genre profile</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                    <span>Session sharing with timed comments and version recall</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center">
            <div className="flex flex-wrap items-center justify-center gap-10 text-left md:justify-between">
              {stats.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="text-4xl font-semibold text-white">{item.value}</div>
                  <div className="text-sm uppercase tracking-[0.3em] text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="text-base text-slate-300">
                Your invite includes instant access to the Creative Studio editor. Jump in, explore stems and export your first mix in under five minutes.
              </p>
              <button
                className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02] focus:outline-none focus-visible:ring focus-visible:ring-indigo-400/60"
                type="button"
                onClick={onStart}
              >
                Try it for free
              </button>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/10 bg-slate-950/60 py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Creative Studio · Designed for curious producers
        </footer>
      </div>
    </div>
  );
}
