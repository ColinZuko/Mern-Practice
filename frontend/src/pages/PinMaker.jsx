import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Download, RotateCcw, Share2 } from "lucide-react";
import { getPost, imageUrl } from "../api";
import { useAuth } from "../useAuth";
import { useSeo } from "../useSeo";
import { recipePath, slugify, SITE_URL } from "../lib/seo";
import { drawPin, loadPinAssets, pinCaption, pinDefaults, PIN_STYLES } from "../lib/pin";

const DEFAULT_PHOTO = { focusX: 0.5, focusY: 0.5, zoom: 1 };
const fieldClass =
  "w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20";

function CopyField({ label, value, multiline = false }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition hover:bg-muted cursor-pointer"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {multiline ? (
        <p className="whitespace-pre-line rounded-xl border bg-muted/40 px-4 py-3 text-sm">{value}</p>
      ) : (
        <p className="truncate rounded-xl border bg-muted/40 px-4 py-2.5 text-sm">{value}</p>
      )}
    </div>
  );
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.01 }) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-primary cursor-pointer"
      />
    </label>
  );
}

// Makes a Pinterest pin (image + text) for a recipe, in the Pickle & Pan style
export function PinMaker() {
  useSeo({ title: "Make a Pinterest pin", noindex: true });
  const { id } = useParams();
  const { canManage } = useAuth();
  const canvas = useRef(null);
  const [post, setPost] = useState(null);
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState("");
  const [style, setStyle] = useState("classic");
  const [text, setText] = useState(null);
  const [photo, setPhoto] = useState(DEFAULT_PHOTO);
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPost(id);
        const loadedAssets = await loadPinAssets(imageUrl(data.imageId));
        if (cancelled) return;
        setPost(data);
        setText(pinDefaults(data));
        setAssets(loadedAssets);
      } catch (e) {
        console.error("Couldn't prepare the pin:", e);
        if (!cancelled) setError("Couldn't load this recipe or its photo.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (assets && text && canvas.current) drawPin(canvas.current, assets, { style, text, photo });
  }, [assets, text, style, photo]);

  if (error) return <p className="mx-auto max-w-3xl px-4 py-14 text-muted-foreground">{error}</p>;
  if (!post || !text) return <p className="mx-auto max-w-3xl px-4 py-14 text-muted-foreground">Preparing your pin…</p>;
  if (!canManage(post)) {
    return <p className="mx-auto max-w-3xl px-4 py-14 text-muted-foreground">Only the recipe's author or an admin can make pins for it.</p>;
  }

  const url = `${SITE_URL}${recipePath(post)}`;
  const caption = pinCaption(post, url);
  const fileName = `${slugify(post.title) || "recipe"}-pin-${style}.jpg`;
  const setTextField = (field) => (e) => setText((t) => ({ ...t, [field]: e.target.value }));

  function toFile() {
    return new Promise((resolve) =>
      canvas.current.toBlob((blob) => resolve(new File([blob], fileName, { type: "image/jpeg" })), "image/jpeg", 0.92),
    );
  }

  async function download() {
    const file = await toFile();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  // On phones this opens the share sheet (Pinterest, Instagram, WhatsApp...) with the image attached
  async function share() {
    const file = await toFile();
    if (!navigator.canShare?.({ files: [file] })) {
      setShareStatus("Sharing isn't supported in this browser. Download the image instead.");
      return;
    }
    try {
      await navigator.clipboard?.writeText(caption.description).catch(() => {});
      await navigator.share({ files: [file], title: caption.title, text: caption.description });
      setShareStatus("");
    } catch (e) {
      if (e.name !== "AbortError") setShareStatus("Sharing didn't work. Download the image instead.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link to={recipePath(post)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to the recipe
      </Link>
      <h1 className="mt-4 text-4xl font-semibold">Pinterest pin</h1>
      <p className="mt-2 text-muted-foreground">
        Pick a design, tweak the text and photo, then download or share it. The description below is ready to paste.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          <canvas
            ref={canvas}
            aria-label={`Pinterest pin for ${post.title}`}
            className="aspect-[2/3] w-full rounded-2xl border bg-muted shadow-sm"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 cursor-pointer"
            >
              <Download className="h-4 w-4" /> Download image
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition hover:bg-muted cursor-pointer"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
          {shareStatus && <p className="mt-2 text-sm text-muted-foreground">{shareStatus}</p>}
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold">Design</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {PIN_STYLES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStyle(option.id)}
                  aria-pressed={style === option.id}
                  className={`rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                    style === option.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted"
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Text on the pin</h2>
              <button
                type="button"
                onClick={() => setText(pinDefaults(post))}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Headline</span>
              <input value={text.headline} onChange={setTextField("headline")} maxLength={90} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Small line above it</span>
              <input
                value={text.tagline}
                onChange={setTextField("tagline")}
                maxLength={32}
                placeholder="e.g. Easy weeknight dinner"
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Details</span>
              <input
                value={text.details}
                onChange={setTextField("details")}
                maxLength={60}
                placeholder="e.g. 30 min · Serves 4"
                className={fieldClass}
              />
            </label>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Photo</h2>
              <button
                type="button"
                onClick={() => setPhoto(DEFAULT_PHOTO)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Slider label="Zoom" min={1} max={2.5} value={photo.zoom} onChange={(zoom) => setPhoto((p) => ({ ...p, zoom }))} />
              <Slider label="Left ↔ right" value={photo.focusX} onChange={(focusX) => setPhoto((p) => ({ ...p, focusX }))} />
              <Slider label="Up ↕ down" value={photo.focusY} onChange={(focusY) => setPhoto((p) => ({ ...p, focusY }))} />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">For Pinterest</h2>
            <CopyField label="Title" value={caption.title} />
            <CopyField label="Description" value={caption.description} multiline />
            <CopyField label="Link" value={caption.link} />
            <p className="text-xs text-muted-foreground">
              On pinterest.com: Create → Pin, upload the image and paste these in. Always add the link, that's what brings
              visitors to the site.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
