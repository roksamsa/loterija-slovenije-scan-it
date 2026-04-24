import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdCached, MdDialpad, MdFileUpload, MdFormatListBulleted } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";
import { bestConfirmationId, findConfirmationIds } from "./parseTicket";
import { runOcr, type OcrProgress } from "./ocr";
import { useCameraStream } from "./useCameraStream";
import { PotrdiloVnosModal } from "./PotrdiloVnosModal";
import "./App.css";

type CaptureState = "idle" | "hold" | "ocr";

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.drawImage(video, 0, 0);
    return c;
}

async function fileToImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Napaka pri sliki"));
        img.src = dataUrl;
    });
}

/**
 * Domači zaslon: kamera, nalaganje, modal → po uspelih 7 števkah odpiramo /listek?p=…
 */
export function CameraPage() {
    const navigate = useNavigate();
    const { videoRef, start, stop, refocus, error: camError, ready } = useCameraStream();
    const [facing, setFacing] = useState<"user" | "environment">("environment");
    const [cap, setCap] = useState<CaptureState>("idle");
    const [captured, setCaptured] = useState<HTMLCanvasElement | null>(null);
    const [ocrText, setOcrText] = useState<string | null>(null);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [manual, setManual] = useState("");
    const [potrdiloModalOpen, setPotrdiloModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toListekRef = useRef(false);

    const onProgress: OcrProgress = useCallback((p) => {
        if (p.status === "done") setOcrProgress(1);
        else setOcrProgress(p.progress * 0.95);
    }, []);

    const runRecognize = useCallback(
        async (source: HTMLCanvasElement | HTMLImageElement) => {
            setOcrError(null);
            setOcrText(null);
            setCap("ocr");
            setOcrProgress(0.02);
            try {
                const text = await runOcr(source, onProgress);
                setOcrText(text);
            } catch (e) {
                setOcrError(e instanceof Error ? e.message : "OCR je spodletel");
            } finally {
                setOcrProgress(1);
                setCap("hold");
            }
        },
        [onProgress],
    );

    useEffect(() => {
        void start(facing);
        return () => {
            stop();
        };
    }, [facing, start, stop]);

    const onFlip = useCallback(() => {
        setFacing((f) => (f === "environment" ? "user" : "environment"));
    }, []);

    const onCameraTap = useCallback(
        (e: React.PointerEvent<HTMLVideoElement>) => {
            if (!ready || facing !== "environment") return;

            const rect = e.currentTarget.getBoundingClientRect();
            const point = {
                x: clamp01((e.clientX - rect.left) / rect.width),
                y: clamp01((e.clientY - rect.top) / rect.height),
            };
            void (async () => {
                const focused = await refocus(point);
                if (!focused) {
                    await start(facing);
                }
            })();
        },
        [facing, ready, refocus, start],
    );

    const best = useMemo(
        () => (ocrText ? bestConfirmationId(ocrText) : null),
        [ocrText],
    );

    const effectiveId = (manual.replace(/\D/g, "").slice(0, 7) || best) ?? "";

    const ocrSettled = cap === "hold" && (ocrText !== null || ocrError !== null);

    useEffect(() => {
        if (toListekRef.current) return;
        if (effectiveId.length !== 7) return;
        if (!captured) return;
        if (!ocrSettled) return;
        toListekRef.current = true;
        navigate(`/listek?p=${effectiveId.replace(/\D/g, "").slice(0, 7)}`, {
            replace: true,
        });
    }, [effectiveId, captured, ocrSettled, navigate]);

    const onSnap = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;
        toListekRef.current = false;
        const canvas = captureVideoFrame(v);
        setCaptured(canvas);
        stop();
        setCap("hold");
        setManual("");
        void runRecognize(canvas);
    }, [runRecognize, stop, videoRef]);

    const onFile = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                const dataUrl = r.result as string;
                void (async () => {
                    toListekRef.current = false;
                    const img = await fileToImage(dataUrl);
                    const c = document.createElement("canvas");
                    c.width = img.naturalWidth;
                    c.height = img.naturalHeight;
                    const ctx = c.getContext("2d");
                    if (!ctx) return;
                    ctx.drawImage(img, 0, 0);
                    setCaptured(c);
                    setOcrText(null);
                    setOcrError(null);
                    setManual("");
                    setCap("hold");
                    await runRecognize(c);
                })();
            };
            r.readAsDataURL(f);
        },
        [runRecognize],
    );

    const cands = useMemo(
        () => (ocrText ? findConfirmationIds(ocrText) : []),
        [ocrText],
    );

    const onPotrdiloModalSubmit = useCallback(
        (seven: string) => {
            setPotrdiloModalOpen(false);
            navigate(`/listek?p=${seven}`);
        },
        [navigate],
    );

    const goResetCapture = useCallback(() => {
        toListekRef.current = false;
        setCaptured(null);
        setOcrText(null);
        setOcrError(null);
        setCap("idle");
        setManual("");
        void start(facing);
    }, [facing, start]);

    if (captured) {
        return (
          <div className="app" id="review-panel">
            <a className="skip-link" href="#ocr-panel">
              Skoči na vsebino
            </a>
            <header className="sub-h" style={{ paddingTop: "1rem" }}>
              <div className="sub-h-row">
                <button
                  type="button"
                  className="nav-back cam-aux-btn cam-aux-btn--round"
                  onClick={goResetCapture}
                >
                  ← Kamera
                </button>
                <Link to="/rezultati" className="nav-inline">
                  Rezultati
                </Link>
              </div>
              <h1 className="sub-h-t" id="ocr-panel">
                Branje listka
              </h1>
            </header>

            <div className="card">
              <h2 className="subtitle" style={{ margin: 0, fontSize: "1rem" }}>
                Zajeta slika
              </h2>
              <img
                className="preview"
                src={captured.toDataURL("image/png")}
                alt="Zajeta potrdilo"
              />
            </div>

            {(cap === "ocr" || ocrProgress < 1) &&
              ocrText === null &&
              !ocrError &&
              cap !== "idle" && (
                <div className="card">
                  <p className="subtitle" style={{ margin: 0 }}>
                    Branje besedila (lokalno)…
                  </p>
                  <div className="progress-outer">
                    <div
                      className="progress-inner"
                      style={{ width: `${Math.min(1, ocrProgress) * 100}%` }}
                    />
                  </div>
                </div>
              )}

            {ocrError && (
              <div className="card">
                <p style={{ color: "var(--danger)", margin: 0 }}>{ocrError}</p>
              </div>
            )}

            {ocrSettled && (
              <div className="card">
                <h2
                  className="subtitle"
                  style={{ margin: 0, fontSize: "1rem" }}
                >
                  Številka potrdila (7 števk)
                </h2>
                <p className="muted" style={{ margin: "0.4rem 0 0" }}>
                  Ko imate 7 pravilnih mest, odpremo stran{" "}
                  <strong>/listek?p=</strong> z istim stanjem po osvežitvi.
                </p>
                {effectiveId.length === 7 ? (
                  <div className="id-display" aria-live="polite">
                    {effectiveId}
                  </div>
                ) : (
                  <p className="muted">
                    Ni 7 znakov. Dopolnite vnos (ali kandidat spodaj).
                  </p>
                )}

                {cands.length > 1 && (
                  <ul className="candidates">
                    {cands.slice(0, 6).map((c) => (
                      <li key={c.value}>
                        <span>{c.value}</span>
                        <button
                          type="button"
                          onClick={() => setManual(c.value)}
                        >
                          Uporabi
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <label className="muted" htmlFor="manual-cam">
                  Ročna korektura
                </label>
                <input
                  id="manual-cam"
                  className="manual"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={7}
                  placeholder="_______"
                  value={manual}
                  onChange={(e) =>
                    setManual(e.target.value.replace(/\D/g, "").slice(0, 7))
                  }
                  style={{ marginTop: 6 }}
                />

                {effectiveId.length === 7 && (
                  <p className="hint" style={{ marginTop: "0.75rem" }}>
                    Odprtje pregleda v teku … če se ne odpre,{" "}
                    <button
                      type="button"
                      className="nav-inline"
                      style={{
                        display: "inline",
                        padding: 0,
                        border: 0,
                        background: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                      onClick={() => navigate(`/listek?p=${effectiveId}`)}
                    >
                      klikni sem
                    </button>
                    .
                  </p>
                )}

                {ocrText && ocrText.length > 0 ? (
                  <details style={{ marginTop: "0.75rem" }}>
                    <summary className="muted" style={{ cursor: "pointer" }}>
                      Surovi OCR
                    </summary>
                    <pre className="ocrbox">{ocrText}</pre>
                  </details>
                ) : null}
              </div>
            )}
            <PotrdiloVnosModal
              open={potrdiloModalOpen}
              onClose={() => setPotrdiloModalOpen(false)}
              onSubmit7={onPotrdiloModalSubmit}
            />
          </div>
        );
    }

    return (
        <div className="app app--camera">
            <a className="skip-link" href="#main-cam">
                Skoči na vsebino
            </a>
            {camError && (
                <p className="cam-err" role="status">
                    {camError}
                </p>
            )}
            <div className="cam-top-end">
                <Link
                    to="/rezultati"
                    className="cam-aux-btn cam-aux-btn--round"
                    aria-label="Rezultati in arhiv"
                    title="Rezultati in arhiv"
                >
                    <span className="cam-aux-btn__ic" aria-hidden>
                        <MdFormatListBulleted size={22} />
                    </span>
                </Link>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onFile}
                aria-label="Naloži sliko potrdila"
                tabIndex={-1}
            />

            <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                onPointerUp={onCameraTap}
                className={facing === "user" ? "cam-video cam-video--mirror" : "cam-video"}
            />

            <div className="cam-hint" id="main-cam">
                Dotaknite se slike za ostrenje. Držite listek raven in dobro osvetljen.
            </div>

            <div
                className="cam-dock"
                role="toolbar"
                aria-label="Kamera in nalaganje"
            >
                <button
                    type="button"
                    className="cam-aux-btn cam-aux-btn--round cam-aux-btn--upload"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Naloži sliko"
                    title="Naloži sliko"
                >
                    <span className="cam-aux-btn__ic" aria-hidden>
                        <MdFileUpload size={24} />
                    </span>
                </button>
                <button
                    type="button"
                    className="cam-aux-btn cam-aux-btn--round"
                    onClick={() => setPotrdiloModalOpen(true)}
                    aria-label="Vpiši 7-mestno številko potrdila"
                    title="Vpiši potrdilo"
                >
                    <span className="cam-aux-btn__ic" aria-hidden>
                        <MdDialpad size={24} />
                    </span>
                </button>
                <button
                    type="button"
                    className="cam-shutter"
                    onClick={onSnap}
                    disabled={!ready || cap === "ocr"}
                    aria-label="Zajemi in preberi"
                />
                <button
                    type="button"
                    className="cam-aux-btn cam-aux-btn--round"
                    onClick={onFlip}
                    disabled={!ready}
                    aria-label="Zamenjaj kamero"
                    title="Zamenjaj kamero"
                >
                    <span className="cam-aux-btn__ic" aria-hidden>
                        <MdCached size={24} />
                    </span>
                </button>
            </div>

            <PotrdiloVnosModal
                open={potrdiloModalOpen}
                onClose={() => setPotrdiloModalOpen(false)}
                onSubmit7={onPotrdiloModalSubmit}
            />
        </div>
    );
}
