import { useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import heic2any from "heic2any";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, Loader2, Crop as CropIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CropArea { x: number; y: number; width: number; height: number; }

/**
 * Crop the given image src to the given pixel rect and return a JPEG blob.
 * Runs entirely in the browser — no server round-trip until we POST the final blob.
 */
async function getCroppedBlob(imageSrc: string, pixelCrop: CropArea): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/jpeg", 0.92);
  });
}

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  /** Crop aspect ratio (width/height). Default 16/9. Pass `undefined` for free-form. */
  aspect?: number;
  /** Upload endpoint; defaults to the shared /api/content/image. */
  uploadUrl?: string;
  /** Height of the thumbnail preview slot. Default 128px. */
  previewHeight?: number;
}

export default function ImageUploadField({
  value,
  onChange,
  aspect = 16 / 9,
  uploadUrl = "/api/content/image",
  previewHeight = 128,
}: ImageUploadFieldProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const rawFileRef = useRef<File | null>(null);

  const [uploading, setUploading] = useState(false);

  // Crop modal state
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<CropArea | null>(null);
  const [cropping, setCropping] = useState(false);

  const onCropComplete = useCallback((_: unknown, pixels: CropArea) => setCropPixels(pixels), []);

  const pickFile = async (file: File) => {
    // Normalize HEIC → JPEG so react-easy-crop (which uses <img>) can load it.
    let prepped: File = file;
    const isHeic = file.type === "image/heic" || file.type === "image/heif" || /\.(heic|heif)$/i.test(file.name);
    if (isHeic) {
      try {
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        prepped = new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
      } catch {
        toast({ title: "Couldn't open HEIC", description: "Try exporting as JPEG from Photos.", variant: "destructive" });
        return;
      }
    }
    rawFileRef.current = prepped;
    setCropSrc(URL.createObjectURL(prepped));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropOpen(true);
  };

  const applyCrop = async () => {
    if (!cropSrc || !cropPixels) return;
    setCropping(true);
    try {
      const blob = await getCroppedBlob(cropSrc, cropPixels);
      const fd = new FormData();
      fd.append("image", blob, rawFileRef.current?.name || "image.jpg");
      setUploading(true);
      const res = await fetch(uploadUrl, { method: "POST", credentials: "include", body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let message = text;
        try { const j = JSON.parse(text); if (j.message) message = j.message; } catch { /* keep */ }
        throw new Error(message || "Upload failed");
      }
      const data = await res.json();
      if (data.url) onChange(data.url);
      setCropOpen(false);
      // Release the preview URL now that the server has its own copy.
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setCropping(false);
      setUploading(false);
    }
  };

  const reCrop = () => {
    if (!value) return;
    setCropSrc(value);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropOpen(true);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-start gap-3">
          <div className="relative">
            <img
              src={value}
              alt=""
              style={{ height: previewHeight, width: aspect ? previewHeight * aspect : previewHeight }}
              className="object-cover rounded-md border"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={reCrop}>
              <CropIcon className="h-3.5 w-3.5 mr-1.5" /> Re-crop
            </Button>
          </div>
        </div>
      ) : (
        <div
          style={{ height: previewHeight }}
          className="border-2 border-dashed border-muted rounded-md p-4 text-center cursor-pointer hover:bg-muted/30 flex flex-col items-center justify-center gap-1"
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault(); e.stopPropagation();
            if (!uploading && e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]);
          }}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Click or drop an image</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) pickFile(e.target.files[0]); e.target.value = ""; }}
      />

      {/* Crop modal */}
      <Dialog open={cropOpen} onOpenChange={(o) => { if (!o) setCropOpen(false); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-80 bg-black rounded-md overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="space-y-1.5 px-1">
            <Label className="text-xs text-muted-foreground">Zoom</Label>
            <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={([v]) => setZoom(v)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropOpen(false)} disabled={cropping}>Cancel</Button>
            <Button onClick={applyCrop} disabled={cropping || !cropPixels}>
              {cropping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {cropping ? "Uploading…" : "Apply crop & upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
