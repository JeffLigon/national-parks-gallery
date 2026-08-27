# Lesson: Why JPEG Compression Looks Identical at 1/8th the Size

*Captured from the National Parks Gallery project. During the R2 migration we
resized a 10 MB camera photo down to a 1.75 MB web version — and it looked
completely indistinguishable from the original, fullscreen on a 4K monitor. This
note explains why that works, and what our processing did that the camera's
original JPEG didn't.*

Companion to: [object-storage-and-blobs.md](object-storage-and-blobs.md) ·
Applied in: [../r2-migration.md](../r2-migration.md)

---

## The real numbers (from an actual project photo)

Source: a Yosemite DSLR shot, `DSC00134.JPG`.

| Version | Dimensions | Size | Bytes/pixel |
|---|---|---|---|
| Original (from camera) | 4240 × 2832 (12 MP) | 10.03 MB | ~6.7 bits/px |
| Resized, quality 82 | 3840 × 2565 | 1.20 MB | ~1.0 bits/px |
| Resized, quality 85 | 3840 × 2565 | 1.34 MB | ~1.1 bits/px |
| Resized, quality 90 | 3840 × 2565 | 1.75 MB | ~1.4 bits/px |

All three resized versions were visually indistinguishable from the original at
fullscreen on a 4K display. We chose **quality 90** for safety headroom (R2
egress is free, so the extra bytes cost nothing).

**The key observation:** the pixel count only dropped ~18%, but the *bytes per
pixel* dropped nearly 5×. So most of the savings came from **re-compression**,
not from resizing. That points straight at the interesting question:

> Both files are JPEG. Why is one 8× smaller than the other, if they look the same?

---

## Part 1 — Why the camera's JPEG was so big

The trick isn't something JPEG "can't" do. It's that the camera *chose not to*.

1. **Cameras save with the brakes off.** DSLRs/mirrorless save JPEGs at
   near-maximum quality with very light compression — they assume you may edit
   later, so they preserve far more precision than the eye needs. 6.7 bits/pixel
   is enormous for a JPEG (typical high-quality web JPEGs are ~1–2 bits/pixel).
2. **Full sensor resolution.** 4240×2832 is more pixels than a 4K screen can even
   show. Downscaling to 3840px on the long edge loses nothing you could display.
3. **Embedded baggage.** Camera files carry a preview thumbnail, full EXIF, and a
   color profile. Our pipeline reads the orientation/date it needs, then drops
   the rest.

So the original was *hoarding* precision and pixels that never reach your eye.

---

## Part 2 — Why a smarter encoder wins at the same "quality"

Our pipeline uses **sharp** with **mozjpeg** enabled. mozjpeg is not a new
format — it's a smarter *implementation* of the same JPEG standard, built by
Mozilla. Same rules, cleverer play:

- **Trellis quantization** — spends bits where they matter most in each block.
- **Optimized/tuned quantization tables** — better than a camera's fixed tables.
- **Progressive encoding** — reorganizes the data to pack more efficiently.

Feed mozjpeg the same "quality 90" and it produces a meaningfully smaller file
than the camera's encoder for the identical visual result. "Quality 90" is a
*target*, not a fixed size — the encoder decides how to hit it.

---

## Part 3 — Why you literally cannot see the loss

This is the beautiful part. JPEG is *lossy* — it permanently throws away data —
but it throws away exactly the data your visual system was going to ignore
anyway. It exploits two specific blind spots of human vision:

### 1. Your eyes barely notice fine, high-frequency detail
JPEG chops the image into **8×8 pixel blocks** and runs a **DCT (Discrete Cosine
Transform)** on each. The DCT re-expresses the block not as 64 pixels, but as a
mix of **patterns**: a few coarse ones (smooth gradients, broad tone) plus many
fine ones (tiny sharp detail).

Then it **quantizes** — rounds off the coefficients, and rounds the *fine*
patterns much more aggressively than the coarse ones. Why? Because human vision
is far more sensitive to broad shapes and smooth tone than to high-frequency
micro-detail. The **"quality" number is literally how hard it rounds:**
- q90 → gentle rounding, keeps almost all detail (what we chose).
- q50 → brutal rounding; you'd start seeing 8×8 "blockiness" and edge halos.

### 2. Your eyes have low resolution for color
Human retinas have far more brightness receptors than color receptors — you
resolve *luminance* detail much better than *color* detail. JPEG exploits this
with **chroma subsampling**: it splits the image into a brightness channel + two
color channels, and stores the **color at lower resolution than the brightness**.
You never notice, because you couldn't resolve that color detail anyway.

### The punchline
The compressor isn't *hiding* the loss from you. It's surgically removing
information addressed to senses you don't have. That's why "I can't tell the
difference" isn't luck — it's the entire design goal of **perceptual
compression** working as intended. The JPEG standard has been quietly exploiting
the wiring of the human retina since 1992.

---

## How this maps to our pipeline

For each gallery photo the prep script produces:
- a **display** image: ~3840px long edge, mozjpeg quality 90 → full 4K detail,
  ~1–2 MB instead of ~10 MB;
- a small **thumbnail** for the grid.

Result: fullscreen detail is preserved for viewers who click in, while pages
stay fast and R2 storage stays tiny.

---

## Key takeaways

1. A camera JPEG is big because it uses **light compression + full resolution +
   embedded metadata** — precision you can't see.
2. **mozjpeg** is the same JPEG format, encoded smarter → smaller files at the
   same visual quality.
3. JPEG is **lossy on purpose**, targeting the two big blind spots of human
   vision: **high-frequency detail** (via DCT + quantization) and **color
   resolution** (via chroma subsampling).
4. "Quality 90" is a *perceptual target*, not a fixed size — that's why an 8×
   size reduction can look identical.
