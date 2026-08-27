# Plan: Migrate Gallery Photos to Cloudflare R2

*Working plan + permanent reference. Goal: get photos out of the git repo (which
was already ~690 MB and growing) and into Cloudflare R2 object storage, with a
clean, repeatable workflow for adding new parks going forward.*

See also: [lessons/object-storage-and-blobs.md](lessons/object-storage-and-blobs.md)
for the "why" behind all of this.

---

## Decisions (locked in)

1. **Image optimization: YES, but quality-first and test-first.** Photos must
   look crisp fullscreen on a 4K monitor with no visible detail loss. We
   generate a small grid thumbnail + a high-resolution display image, and we
   validate the quality settings on the 4K monitor *before* batch-processing.
2. **Public access: `r2.dev` subdomain** to start. Custom domain later.
3. **Local staging folder:** `~/projects/national-parks-gallery-photos/`
   (a *sibling* of the repo, NOT inside it — so it never touches git).
4. **Upload mechanism:** a single integrated **Node script** using the
   S3-compatible AWS SDK (R2 speaks the S3 API). No extra tools like rclone —
   one script does upload + metadata + manifest.

---

## Architecture

Each photo becomes **two things in two places**:

| The thing | Where it lives | In git? |
|---|---|---|
| Image **bytes** (thumbnail + display) | Cloudflare R2 | ❌ no |
| Image **metadata** (filename, width, height, dateTaken, URLs) | committed **JSON manifest** | ✅ yes |

**Why the manifest is necessary:** the current build reads each image off local
disk (`fs.readFileSync` in `src/lib/imageMeta.js`) to get its width, height, and
EXIF date. Once images live in R2 they're *not on disk at build time*, so we
extract that metadata **once, locally, at curation time** and commit it as JSON.
The build then reads the JSON instead of the disk.

### The three homes

**1. Local staging — OUTSIDE the repo** (curation workspace, never committed):
```
~/projects/national-parks-gallery-photos/
  yosemite/          <- final picks, straight in (no subfolders)
  glacier-bay/
```

**2. In the repo (committed — tiny text):**
```
src/data/photos/yosemite.json     <- the manifest per park
```

**3. In R2 (the bytes):**
```
parks/yosemite/DSC00134.jpg           <- display image (~3840px)
parks/yosemite/thumbs/DSC00134.jpg    <- grid thumbnail (~800px)
parks/yosemite/hero.jpg               <- park hero image
```

---

## Image quality strategy

| Version | Long edge | Quality | Used for | Notes |
|---|---|---|---|---|
| **Thumbnail** | ~800px | ~80 | the photo grid | grid images display small; fast load |
| **Display** | ~3840px | **90** (chosen in Phase 0 test) | fullscreen lightbox | full 4K detail — the priority |

**Why 3840px:** a 4K monitor is 3840×2160. To fill it fullscreen with native,
crisp detail a landscape photo needs ~3840px on its long edge. Smaller = the
browser upscales = softness. We reduce *file size* via JPEG quality (removing
data the eye can't see), NOT *pixel dimensions*.

**No detail trade-off:** the grid uses small previews (they're tiny on screen
anyway); clicking loads the high-res display image. Fast pages AND full detail.

---

## Prerequisites

- **Activate R2** in the Cloudflare dashboard (requires a payment method on
  file even for the free tier — see the free-tier limits below).
- **R2 API credentials** (Account ID, Access Key ID, Secret Access Key) stored
  in a **`.env` file** (already gitignored — NEVER commit these).
- **Public bucket URL** (the `r2.dev` address) — not secret; stored in config.
- Node deps for the script: `@aws-sdk/client-s3` (upload), plus existing
  `sharp` (resize), `exifr` + `image-size` (metadata).

**R2 free tier (for reference):** 10 GB storage, 1M writes/mo, 10M reads/mo,
**unlimited free egress**. Current photos are ~0.7 GB — comfortably free.

---

## Phases

### Phase 0 — Quality test (do this FIRST)
- Pick 1–2 representative photos (one detailed landscape, one portrait).
- Generate display versions at a few quality settings (e.g. 82 / 85 / 90).
- View each fullscreen on the 4K monitor next to the original.
- **Jeff approves the final quality number.** Everything else uses it.

### Phase 1 — Set up R2
- Activate R2; create bucket (e.g. `national-parks-gallery`).
- Enable public access via `r2.dev`; note the public base URL.
- Create API token; put credentials in `.env`.

### Phase 2 — Build the prep script (`npm run add-park <park>`)
One script that, for `~/projects/national-parks-gallery-photos/<park>/`:
- a. Converts HEIC → JPG (fold in existing `scripts/convert-heic.mjs`).
- b. Generates thumbnail (~800px) + display (~3840px) with `sharp`.
- c. Reads width/height/EXIF date/orientation (reuse `imageMeta.js` logic).
- d. Uploads both sizes (+ hero) to R2 under `parks/<park>/`.
- e. Writes `src/data/photos/<park>.json` (metadata + R2 URLs, sorted by date).

### Phase 3 — Migrate the existing 7 parks
(yosemite, grand-canyon, yellowstone, guadalupe, grand-teton, rocky-mountain,
hot-springs — the ones that already have photos in the repo.)
- Copy each park's existing photos into the staging folder (or point the script
  at the repo's current `public/images/parks/<park>/` for a one-time pass).
- Run the prep script for each → uploads to R2 + generates manifests.

### Phase 4 — Convert the park pages to read manifests
- Replace the `fs.readdirSync` + `getPublicImageSize` block in each
  `src/pages/parks/<park>/index.astro` with a read of `src/data/photos/<park>.json`.
- Update `LightboxGallery.astro`: grid `<img src>` → thumbnail URL, lightbox
  `href` + `data-pswp-width/height` → display URL + dimensions.
- Update each park's `hero` to its R2 URL.
- First page becomes the copy-paste template for the rest.

### Phase 5 — Remove images from the repo (going forward)
- `git rm -r --cached public/images/parks/**` (untrack, keep local copies).
- Add `public/images/parks/` to `.gitignore`.
- Commit: repo stops accumulating image blobs from here on.

### Phase 6 — Optional / later
- **History scrub:** use `git filter-repo` to purge the ~690 MB of old image
  blobs from history (careful, rewrites history — separate scheduled session).
- **Custom domain** for R2 (replaces `r2.dev`, removes rate limits).

---

## The ongoing per-park workflow (the loop you'll run forever)

1. **Curate:** copy your final picks into
   `~/projects/national-parks-gallery-photos/<park>/`.
2. **Process:** `npm run add-park <park>` (resizes, uploads to R2, writes JSON).
3. **Wire (new parks only):** create the park's `index.astro` from the template.
4. **Verify:** `npm run dev`, check the gallery locally.
5. **Commit & push:** only the JSON + code change go to git — never images.
6. **Deploy:** Cloudflare Pages rebuilds; images serve from R2.

To **replace/add** photos in an existing park: drop new picks in the folder,
re-run the script, commit the updated JSON. R2 objects overwrite in place — no
history bloat.

---

## Security reminders

- R2 credentials live ONLY in `.env` (gitignored). Never commit or paste them.
- The public `r2.dev` URL is fine to commit (it's meant to be public).
- If a credential ever leaks, rotate the API token in the Cloudflare dashboard.
