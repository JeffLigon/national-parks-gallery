# Jeff’s Web Dev Learning Path
**Build your National Parks Photo Gallery from zero → professional quality**

This learning path has **6 phases**, each focused on one core skill category.  
You can stop after *any* phase and still have something valuable.

---

# 🎯 Overview

You’ll learn:

- **Hands-on** development  
- Building **something personal** (your National Parks gallery)  
- **Growing complexity step-by-step**  
- Ending with a real, meaningful project:

  **➡️ Your National Parks Photo Gallery**

I’ll lay this out like a course roadmap:  
No pressure, no deadlines — just a progression where each phase levels you up without overwhelming you.

---

# 🟦 PHASE 1 — The Basics (0–3 hours)

**Goal:** Get your first simple website online using **Astro** and **Cloudflare Pages**.

## What you’ll learn
- Installing Node.js  
- Creating an Astro project  
- Understanding files/folders  
- Editing a basic page  
- Running a local dev server  
- Deploying to Cloudflare Pages  
- Design section layout (Squarespace/Wix layout equivalent)

## What you’ll build
- A homepage with text  
- A simple “Hello World” published at:

```
https://yourname.pages.dev
```

---

# 🟩 PHASE 2 — Add Your First Photos (0–2 hours)

**Goal:** Add images and a simple hand-built photo page.

## What you’ll learn
- Where to put image files  
- Importing images in Astro  
- Building a basic photo gallery layout  
- Adding captions or labels manually  

## What you’ll build

```html
<div class="photo">
  <img src="/photos/yosemite.jpg" alt="Yosemite" />
  <p>Yosemite Valley</p>
</div>
```

## Momentum you get
Your site now **has your own photos** — instant motivation.

---

# 🟧 PHASE 3 — Improve Design (1–3 hours)

**Goal:** Make the site look clean, modern, and consistent.

## What you’ll learn
- Adding global CSS  
- Using layout components  
- Improving spacing, typography, and alignment  
- Responsive photos (CSS `max-width`, `object-fit`, etc.)  

## What you’ll build

```html
<style>
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, 300px);
  gap: 1rem;
}
.gallery img {
  width: 100%;
  border-radius: 8px;
}
</style>
```

Your site now **looks like a real website**, not a beginner project.

---

# 🟨 PHASE 4 — Metadata & Organization (1 week of casual learning)

**Goal:** Automatically generate your gallery from metadata instead of hardcoding photos.

This is where you start learning **programming concepts** tied to your personal project.

## You’ll learn
- What **EXIF** data is  
- How to extract photo metadata (date taken, GPS)  
- Writing a simple script (Node/Python) that:
  - reads all photos in `/photos/`
  - outputs a `photos.json` file  

## What you’ll build

```json
{
  "file": "yosemite_001.jpg",
  "title": "Half Dome Sunrise",
  "park": "Yosemite",
  "date": "2022-06-10",
  "lat": 37.745,
  "lon": -119.533
}
```

Astro then loads this JSON and **auto-generates the gallery**.

## Momentum you get  
You’ve now automated something → **this is real programming**.

---

# 🟪 PHASE 5 — Scale Up with Cloudflare R2 (1 day)

**Goal:** Move photos to object storage instead of your Git repo.

## What you’ll learn
- What object storage is  
- How to upload to **Cloudflare R2**  
- How to reference images from R2  
- How to secure API tokens  
- How to update your gallery script for remote URLs  

Your site now loads images from scalable cloud storage.

---

# 🟥 PHASE 6 — Advanced Features (ongoing / optional)

**Goal:** Add professional features to make your gallery truly impressive.

## What you’ll learn
Choose *any* of these depending on what sparks your interest:

### Filtering & tagging  
- Filter by park  
- Filter by year  
- Search bar  

### Maps & geo visualization  
- Plot photos on a map  
- Use Leaflet or Mapbox  
- Hover or click to show photo previews  

### Admin tools  
- Add a private upload page  
- Script that auto-extracts EXIF  
- Auto-resizing photos  

### Platform upgrade  
- Migrate to **Next.js**  
- Add API routes  
- Add a database (Supabase or SQLite)

## Momentum you get  
This becomes a **real portfolio project**, showing mastery of:

- HTML/CSS  
- Astro  
- Cloudflare  
- Metadata  
- APIs  
- JSON  
- Deployment workflows  

---

# 🎉 Final Result  
By the end of this learning path you’ll have:

- A **working website**  
- A **gallery of your own National Parks photos**  
- Metadata-driven automation  
- Cloud storage  
- Clean, structured code  
- A project you can show off, keep improving, or turn into something bigger  

