"use client";

import { Camera, Trash2, UserRound } from "lucide-react";
import { Dialog } from "radix-ui";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useT, type Key } from "@/lib/i18n";
import { avatarUrl, profileApi } from "@/lib/profile/api";

const FRAME = 280;
const OUTPUT = 512;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 380 * 1024;

/** The student's picture, or a neutral default avatar. Circular everywhere. */
export function Avatar({
  present,
  version,
  name,
  className = "size-24",
}: {
  present: boolean;
  version: number;
  name?: string;
  className?: string;
}) {
  const { t } = useT();
  const [broken, setBroken] = useState<number | null>(null);
  return present && broken !== version ? (
    // eslint-disable-next-line @next/next/no-img-element -- a private, per-user, already-small picture served by our own API
    <img
      src={avatarUrl(version)}
      alt={name ? t("avatar.altNamed", { name }) : t("avatar.alt")}
      width={256}
      height={256}
      onError={() => setBroken(version)}
      className={`${className} shrink-0 rounded-full border border-border object-cover`}
    />
  ) : (
    <span
      role="img"
      aria-label={t("avatar.default")}
      className={`${className} grid shrink-0 place-items-center rounded-full border border-border bg-primary-soft text-primary-soft-foreground`}
    >
      <UserRound aria-hidden className="size-1/2" />
    </span>
  );
}

function errorKey(error: unknown): Key {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "AVATAR_TYPE":
      case "AVATAR_UNREADABLE":
        return "avatar.err.type";
      case "AVATAR_TOO_LARGE":
      case "AVATAR_PIXELS":
        return "avatar.err.large";
      case "AVATAR_SMALL":
        return "avatar.err.small";
      default:
        break;
    }
    if (error.status === 401) return "err.session";
  }
  return "avatar.err.generic";
}

async function renderJpeg(
  image: HTMLImageElement,
  scale: number,
  ox: number,
  oy: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT, OUTPUT);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    -ox / scale,
    -oy / scale,
    FRAME / scale,
    FRAME / scale,
    0,
    0,
    OUTPUT,
    OUTPUT,
  );
  for (const quality of [0.9, 0.8, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
  }
  throw new Error("too large");
}

function CropDialog({
  source,
  onCancel,
  onDone,
}: {
  source: { url: string; image: HTMLImageElement };
  onCancel: () => void;
  onDone: (blob: Blob) => Promise<void>;
}) {
  const { t } = useT();
  const { image } = source;
  const base = FRAME / Math.min(image.naturalWidth, image.naturalHeight);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState(() => ({
    x: (FRAME - image.naturalWidth * base) / 2,
    y: (FRAME - image.naturalHeight * base) / 2,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  const scale = base * zoom;
  const clamp = (x: number, y: number, s: number) => ({
    x: Math.min(0, Math.max(FRAME - image.naturalWidth * s, x)),
    y: Math.min(0, Math.max(FRAME - image.naturalHeight * s, y)),
  });

  function changeZoom(next: number) {
    // keep the point in the middle of the frame where it is
    const cx = (FRAME / 2 - offset.x) / scale;
    const cy = (FRAME / 2 - offset.y) / scale;
    const s = base * next;
    setZoom(next);
    setOffset(clamp(FRAME / 2 - cx * s, FRAME / 2 - cy * s, s));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onDone(await renderJpeg(image, scale, offset.x, offset.y));
    } catch (e) {
      setError(
        e instanceof Error && e.message === "too large"
          ? "avatar.err.large"
          : errorKey(e),
      );
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !busy && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/50" />
        <Dialog.Content
          aria-describedby="crop-help"
          className="fixed top-1/2 left-1/2 z-50 grid w-[min(24rem,92vw)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-border bg-background p-5 shadow-lg"
        >
          <Dialog.Title className="text-lg font-bold">
            {t("avatar.cropTitle")}
          </Dialog.Title>
          <p id="crop-help" className="text-sm text-muted-foreground">
            {t("avatar.cropHelp")}
          </p>
          <div
            role="application"
            aria-label={t("avatar.cropArea")}
            tabIndex={0}
            className="relative mx-auto touch-none overflow-hidden rounded-xl bg-muted outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
            style={{ width: FRAME, height: FRAME, cursor: "grab" }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                ox: offset.x,
                oy: offset.y,
              };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d)
                setOffset(
                  clamp(d.ox + e.clientX - d.x, d.oy + e.clientY - d.y, scale),
                );
            }}
            onPointerUp={() => (drag.current = null)}
            onKeyDown={(e) => {
              const step = 12;
              const move: Record<string, [number, number]> = {
                ArrowLeft: [step, 0],
                ArrowRight: [-step, 0],
                ArrowUp: [0, step],
                ArrowDown: [0, -step],
              };
              if (move[e.key]) {
                e.preventDefault();
                setOffset(
                  clamp(
                    offset.x + move[e.key][0],
                    offset.y + move[e.key][1],
                    scale,
                  ),
                );
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the picture being cropped */}
            <img
              src={source.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute top-0 left-0 max-w-none select-none"
              style={{
                width: image.naturalWidth * scale,
                height: image.naturalHeight * scale,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
            {/* circular mask: what the avatar will look like */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.45)]"
            />
          </div>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t("avatar.zoom")}
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => changeZoom(Number(e.target.value))}
              className="w-full cursor-pointer accent-[var(--primary)]"
            />
          </label>
          {error ? <Alert kind="error">{t(error)}</Alert> : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onCancel}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" disabled={busy} onClick={save}>
              {busy ? t("common.saving") : t("avatar.save")}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Upload, crop, replace and remove the profile picture. The server re-encodes whatever arrives; this only prepares a small square JPEG. */
export function AvatarUploader({
  present,
  version,
  name,
  onChanged,
}: {
  present: boolean;
  version: number;
  name?: string;
  onChanged: (present: boolean, version: number) => void;
}) {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<{
    url: string;
    image: HTMLImageElement;
  } | null>(null);
  const [error, setError] = useState<Key | null>(null);
  const [removing, setRemoving] = useState(false);

  function choose(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("avatar.err.type");
    if (file.size > MAX_FILE_BYTES) return setError("avatar.err.large");
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth < 32 || image.naturalHeight < 32) {
        URL.revokeObjectURL(url);
        setError("avatar.err.small");
      } else setSource({ url, image });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("avatar.err.type");
    };
    image.src = url;
  }

  function close() {
    if (source) URL.revokeObjectURL(source.url);
    setSource(null);
    if (input.current) input.current.value = "";
  }

  async function upload(blob: Blob) {
    const result = await profileApi.uploadAvatar(blob);
    onChanged(result.present, result.version);
    close();
  }

  async function remove() {
    setRemoving(true);
    setError(null);
    try {
      await profileApi.removeAvatar();
      onChanged(false, 0);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar present={present} version={version} name={name} />
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => input.current?.click()}
          >
            <Camera aria-hidden />
            {present ? t("avatar.replace") : t("avatar.upload")}
          </Button>
          {present ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={removing}
              onClick={remove}
            >
              <Trash2 aria-hidden />
              {t("avatar.remove")}
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{t("avatar.hint")}</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="sr-only"
          aria-label={t("avatar.upload")}
          tabIndex={-1}
          onChange={(e) => choose(e.target.files?.[0])}
        />
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {t(error)}
          </p>
        ) : null}
      </div>
      {source ? (
        <CropDialog source={source} onCancel={close} onDone={upload} />
      ) : null}
    </div>
  );
}
