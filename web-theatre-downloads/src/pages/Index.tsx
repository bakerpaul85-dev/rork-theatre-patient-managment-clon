import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity,
  Check,
  Copy,
  Download,
  FileArchive,
  ScanLine,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const APK_PATH = "/theatre-app-v1.2.1.apk" as const;
const APP_VERSION = "1.2.1" as const;
const APK_SIZE = "65 MB" as const;
const BUILD_DATE = "30 October 2026" as const;

const WHATS_NEW: readonly string[] = [
  "Fixed an issue where photo attachments from one case could appear on another case's emailed forms",
  "Theatre clock photos now auto-fill the time on both COIDA and Medical Aid forms",
  "New Theatre Clock section sits directly under the Hospital Sticker on both forms",
  "Employer details are auto-read from the COIDA employer report (NB-marked fields)",
  "C-Arm photos moved into the Theatre Clock section",
  "Removed the \u2018Reason for time in theatre longer\u2019 and POPIA consent fields",
];

type InstallStep = {
  readonly title: string;
  readonly detail: string;
};

const INSTALL_STEPS: readonly InstallStep[] = [
  {
    title: "Download the file",
    detail: "Tap the Download button above. Your phone may warn that this file type can be harmful — that is normal for apps installed outside the Play Store.",
  },
  {
    title: "Open it from Downloads",
    detail: "Pull down your notifications and tap the finished download, or find theatre-app-v1.2.apk in your Files app.",
  },
  {
    title: "Allow the install",
    detail: "If prompted, tap Settings and switch on 'Allow from this source', then go back and tap Install.",
  },
];

const Index = () => {
  const [origin, setOrigin] = useState<string>("");
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const downloadUrl = useMemo<string>(() => `${origin}${APK_PATH}`, [origin]);

  const handleCopy = useCallback(async () => {
    if (!downloadUrl) return;

    try {
      await navigator.clipboard.writeText(downloadUrl);
      setHasCopied(true);
      window.setTimeout(() => setHasCopied(false), 2000);
    } catch {
      setHasCopied(false);
    }
  }, [downloadUrl]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Atmosphere: surgical lamp glow + clinical grid */}
      <div className="pointer-events-none absolute inset-0 bg-graticule" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-56 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-accent/10 blur-[120px]"
        aria-hidden="true"
      />

      <main className="relative mx-auto w-full max-w-2xl px-5 pb-20 pt-12 sm:pt-16">
        {/* Masthead */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <Activity className="h-[18px] w-[18px] text-primary" strokeWidth={2.5} />
          </span>
          <span className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Theatre Suite
          </span>
        </div>

        {/* Hero */}
        <header className="mt-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Latest build · v{APP_VERSION}
            </span>
          </div>

          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Theatre Patient
            <br />
            <span className="text-primary">Management</span>
          </h1>

          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Case capture, sticker scanning and billing paperwork — built for the operating theatre.
            Install the Android app straight onto your phone.
          </p>
        </header>

        {/* Primary action */}
        <section className="mt-9">
          <Button
            asChild
            size="lg"
            className="group h-16 w-full rounded-2xl text-base font-semibold shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.7)] transition-transform active:scale-[0.985]"
          >
            <a href={APK_PATH} download>
              <Download
                className="mr-2.5 h-5 w-5 transition-transform duration-300 group-hover:translate-y-0.5"
                strokeWidth={2.5}
              />
              Download for Android
            </a>
          </Button>

          <dl className="mt-4 grid grid-cols-3 gap-2.5">
            {[
              { label: "Version", value: `v${APP_VERSION}`, icon: FileArchive },
              { label: "Size", value: APK_SIZE, icon: Download },
              { label: "Format", value: "APK", icon: Smartphone },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 backdrop-blur"
              >
                <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* What's new */}
        <section className="mt-4 rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            What&apos;s new in v{APP_VERSION}
          </h2>
          <ul className="mt-3 space-y-2">
            {WHATS_NEW.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* QR handoff */}
        <section className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur">
          <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:p-7">
            <div className="shrink-0 rounded-2xl bg-foreground p-3.5 shadow-lg">
              {downloadUrl ? (
                <QRCodeSVG
                  value={downloadUrl}
                  size={132}
                  level="M"
                  marginSize={0}
                  bgColor="#ffffff"
                  fgColor="#08171d"
                />
              ) : (
                <div className="h-[132px] w-[132px] animate-pulse rounded-lg bg-muted" />
              )}
            </div>

            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <ScanLine className="h-4 w-4 text-primary" strokeWidth={2.5} />
                <h2 className="text-base font-semibold">Reading this on a computer?</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Point your phone&apos;s camera at the code, open the link, then tap Download. The
                app installs directly — no Play Store or account needed.
              </p>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!downloadUrl}
                className={cn(
                  "mt-3.5 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-1.5",
                  "text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary",
                  "disabled:opacity-50",
                )}
              >
                {hasCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                    Link copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Copy download link
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Install guide */}
        <section className="mt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Installing on your phone
          </h2>

          <ol className="mt-5 space-y-5">
            {INSTALL_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[13px] font-bold tabular-nums text-primary">
                    {index + 1}
                  </span>
                  {index < INSTALL_STEPS.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-gradient-to-b from-border to-transparent" />
                  )}
                </div>
                <div className="pb-1 pt-1">
                  <h3 className="text-[15px] font-semibold leading-tight">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Trust note */}
        <section className="mt-9 flex gap-3.5 rounded-2xl border border-border/70 bg-card/40 p-5 backdrop-blur">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.25} />
          <div>
            <h2 className="text-sm font-semibold">Is this safe to install?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Yes — this is your own signed release build, hosted on your own page. The
              &ldquo;unknown source&rdquo; warning simply means it did not come from the Play
              Store. Patient information stays protected in line with POPIA.
            </p>
          </div>
        </section>

        <footer className="mt-10 border-t border-border/60 pt-6">
          <p className="text-xs text-muted-foreground">
            Build {APP_VERSION} · Released {BUILD_DATE} · Requires Android 7.0 or newer
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
