import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Eye, RotateCw } from "lucide-react";
import {
  canvasToFile,
  CROPS,
  DEFAULT_SETTINGS,
  dragScale,
  FILTERS,
  findFocus,
  focusForCrop,
  loadImageFile,
  prepareSource,
  renderPhoto,
} from "../lib/photo";

const PREVIEW_SIDE = 1000;
const FINAL_SIDE = 2000;

function chipClass(active) {
  return `rounded-full border px-3.5 py-1.5 text-sm transition cursor-pointer ${
    active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary hover:text-primary"
  }`;
}

function Slider({ label, value, onChange, min, max, step, display }) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between text-muted-foreground">
        {label} <span className="tabular-nums">{display}</span>
      </span>
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

// Edits a recipe photo before upload: crop around the dish, straighten, enhance and filter
export function PhotoEditor({ file, onDone, onSkip }) {
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [comparing, setComparing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const canvasHolder = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadImageFile(file)
      .then((loaded) => !cancelled && setImage(loaded))
      .catch(() => !cancelled && setError("Couldn't open that photo."));
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Turned copy of the photo at preview size, and where the dish is in it
  const source = useMemo(() => (image ? prepareSource(image, settings.quarterTurns, PREVIEW_SIDE) : null), [image, settings.quarterTurns]);
  const dish = useMemo(() => (source ? findFocus(source) : null), [source]);

  // Centre on the dish whenever the photo is turned or the crop shape changes
  const [centeredFor, setCenteredFor] = useState(null);
  const centerKey = source ? `${settings.quarterTurns}|${settings.crop}` : null;
  if (source && centerKey !== centeredFor) {
    setCenteredFor(centerKey);
    setSettings((s) => ({ ...s, ...focusForCrop(source, s, dish) }));
  }

  const shown = useMemo(() => {
    if (!source) return null;
    return renderPhoto(source, comparing ? { ...settings, enhance: 0, filter: "none" } : settings, PREVIEW_SIDE);
  }, [source, settings, comparing]);

  // Small versions with each filter, for picking one
  const thumbnails = useMemo(() => {
    if (!source) return {};
    const small = prepareSource(source, 0, 220);
    const base = { ...settings, quarterTurns: 0 };
    return Object.fromEntries(FILTERS.map((f) => [f.id, renderPhoto(small, { ...base, filter: f.id }, 220).toDataURL("image/jpeg", 0.8)]));
    // Only redo them when the crop changes, not on every slider move
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, settings.crop, settings.straighten, settings.zoom, settings.focusX, settings.focusY, settings.enhance]);

  useEffect(() => {
    const holder = canvasHolder.current;
    if (!shown || !holder) return;
    shown.className = "block h-auto w-full touch-none select-none";
    holder.replaceChildren(shown);
    let url = null;
    let cancelled = false;
    shown.toBlob((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    }, "image/jpeg", 0.8);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [shown]);

  const set = (change) => setSettings((s) => ({ ...s, ...change }));

  function onPointerDown(e) {
    if (!source) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const scale = dragScale(source, settings, e.currentTarget.clientWidth);
    drag.current = { x: e.clientX, y: e.clientY, focusX: settings.focusX, focusY: settings.focusY, scale };
  }
  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    set({
      focusX: clamp(d.focusX - (e.clientX - d.x) * d.scale.x),
      focusY: clamp(d.focusY - (e.clientY - d.y) * d.scale.y),
    });
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function savePhoto() {
    setSaving(true);
    // Final version from the full-size photo
    await new Promise((resolve) => setTimeout(resolve, 20)); // let "Saving…" show first
    // (crop and focus are relative, so the preview settings carry over to the bigger photo)
    const full = prepareSource(image, settings.quarterTurns, FINAL_SIDE * 1.5);
    const canvas = renderPhoto(full, settings, FINAL_SIDE);
    onDone(await canvasToFile(canvas, file.name));
  }

  if (error) return <p className="text-sm font-medium text-destructive">{error}</p>;
  if (!source) return <p className="text-sm text-muted-foreground">Opening your photo…</p>;

  return (
    <div className="mt-2 rounded-2xl border bg-background p-4 sm:p-5">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <div
            ref={canvasHolder}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="overflow-hidden rounded-xl bg-muted cursor-grab active:cursor-grabbing"
            title="Drag to move the photo"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Drag the photo to move it.</span>
            <button
              type="button"
              onPointerDown={() => setComparing(true)}
              onPointerUp={() => setComparing(false)}
              onPointerLeave={() => setComparing(false)}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium text-foreground transition hover:bg-muted cursor-pointer select-none"
            >
              <Eye className="h-3.5 w-3.5" /> Hold to see the original
            </button>
          </div>

          {previewUrl && (
            <div className="mt-4 grid grid-cols-[3fr_2fr] gap-3">
              <figure>
                <img src={previewUrl} alt="" className="aspect-[16/9] w-full rounded-lg object-cover" />
                <figcaption className="mt-1 text-xs text-muted-foreground">On the recipe page</figcaption>
              </figure>
              <figure>
                <img src={previewUrl} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                <figcaption className="mt-1 text-xs text-muted-foreground">On recipe cards</figcaption>
              </figure>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold">Crop</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {CROPS.map((crop) => (
                <button key={crop.id} type="button" title={crop.hint} onClick={() => set({ crop: crop.id })} className={chipClass(settings.crop === crop.id)}>
                  {crop.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{CROPS.find((c) => c.id === settings.crop)?.hint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set({ quarterTurns: settings.quarterTurns + 1 })}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition hover:bg-muted cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" /> Rotate
              </button>
              <button
                type="button"
                onClick={() => set(focusForCrop(source, settings, dish))}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition hover:bg-muted cursor-pointer"
              >
                <Crosshair className="h-3.5 w-3.5" /> Centre on the dish
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Slider label="Straighten" min={-10} max={10} step={0.5} value={settings.straighten} display={`${settings.straighten}°`} onChange={(straighten) => set({ straighten })} />
              <Slider label="Zoom" min={1} max={3} step={0.05} value={settings.zoom} display={`${settings.zoom.toFixed(1)}×`} onChange={(zoom) => set({ zoom })} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Light and colour</h3>
            <div className="mt-3">
              <Slider label="Auto enhance" min={0} max={1} step={0.05} value={settings.enhance} display={`${Math.round(settings.enhance * 100)}%`} onChange={(enhance) => set({ enhance })} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Filter</h3>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {FILTERS.map((filter) => (
                <button key={filter.id} type="button" onClick={() => set({ filter: filter.id })} className="group text-left cursor-pointer">
                  {thumbnails[filter.id] && (
                    <img
                      src={thumbnails[filter.id]}
                      alt=""
                      className={`aspect-square w-full rounded-lg object-cover ring-offset-2 transition ${
                        settings.filter === filter.id ? "ring-2 ring-primary" : "group-hover:opacity-80"
                      }`}
                    />
                  )}
                  <span className={`mt-1 block text-[11px] leading-tight ${settings.filter === filter.id ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                    {filter.label}
                  </span>
                </button>
              ))}
            </div>
            {settings.filter !== "none" && (
              <div className="mt-3">
                <Slider label="Filter strength" min={0} max={1} step={0.05} value={settings.strength} display={`${Math.round(settings.strength * 100)}%`} onChange={(strength) => set({ strength })} />
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <button type="button" onClick={() => setSettings({ ...DEFAULT_SETTINGS, crop: settings.crop, ...focusForCrop(source, { ...DEFAULT_SETTINGS, crop: settings.crop }, dish) })} className="mr-auto text-sm text-muted-foreground hover:text-foreground cursor-pointer">
          Reset
        </button>
        <button type="button" onClick={onSkip} disabled={saving} className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted cursor-pointer">
          Use the original
        </button>
        <button
          type="button"
          onClick={savePhoto}
          disabled={saving}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Saving…" : "Use this photo"}
        </button>
      </div>
    </div>
  );
}
