# Lesson: Object Storage & the Origin of "Blob"

*A companion note to the National Parks Gallery project — captured from a
learning conversation. Covers why the web moved photos out of the web server
and into object storage, and the surprisingly fun history of the word "blob."*

---

## 1. The world I remember: the 1990s single-server model

Back when you hand-coded web pages, the model was dead simple. You had **one
machine** running Apache or IIS, and its filesystem *was* the website:

```
/var/www/          (or C:\inetpub\ on IIS)
  index.html
  about.html
  images/
    yosemite.jpg
    grand-canyon.jpg
  cgi-bin/
    guestbook.pl
```

A request came in, the server read the file straight off its local disk, and
sent it back. HTML, GIFs, JPEGs, and scripts all lived together. This worked
because sites were small, traffic was modest, and if you needed more power you
just **bought a bigger server** ("vertical scaling").

The hidden catch: **your files and your server were welded together.** The
server *was* the storage. That's the assumption everything below breaks.

---

## 2. What forced the change (roughly 2006–2012)

### Pressure 1 — Horizontal scaling demands stateless servers
As sites grew, you couldn't buy an infinitely bigger box. The answer was to run
**many identical servers** behind a load balancer. But that breaks the old model:
if a user uploads a photo to Server A, then their next request hits Server B —
Server B's disk doesn't have that photo.

The clean fix is to make servers **stateless**: they hold *no* files of their
own, so any server can handle any request and you can clone, kill, and replace
them freely. All the actual *stuff* (images, uploads) moves to a **separate
shared place every server can reach.** That place is object storage.

> This is the single most important idea. A stateless server can be duplicated
> and thrown away at will — the foundation of cloud computing, auto-scaling, and
> modern deploys. You can't do that if the server is also hoarding the files.

### Pressure 2 — Amazon S3 launched in March 2006
This is the pivot date. **S3 (Simple Storage Service)** gave everyone a cheap,
durable, API-accessible "bucket in the sky." Before it, "separate your storage"
meant building your own file servers (hard). After it, it was a web service
anyone could call. S3 essentially *created* this pattern as mainstream practice.
**Cloudflare R2** (2022) is a direct descendant: same idea, S3-compatible API,
different pricing.

### Pressure 3 — Text and images have opposite needs
Treating code and photos the same is fine at small scale but wasteful at large
scale:

| | HTML / code (text) | Images / video (blobs) |
|---|---|---|
| **Size** | Kilobytes | Megabytes |
| **Changes** | Often (every deploy) | Rarely (uploaded once) |
| **Served best** | Rendered near the app | Dumb, cached, from anywhere |
| **Version control** | Belongs in git | Bloats git badly |

Text wants to live with your *logic* and change constantly. Images want to be
written once and read a billion times, ideally from a server physically close
to the visitor.

---

## 3. The CDN multiplier — the payoff that sealed it

Once images live in object storage, you can put a **CDN (Content Delivery
Network)** in front — cached copies in data centers worldwide. A visitor in
Tokyo gets the photo from a Tokyo edge server, not your origin in Virginia.
Faster for them; your origin barely gets touched.

*The National Parks Gallery is literally this architecture:* **Cloudflare Pages**
serves the HTML/code (and is itself a CDN), and **R2 + Cloudflare's network**
serves the photos from the edge. The 90s "one box does everything" became
"code here, blobs there, both cached globally."

---

## 4. The trade-offs you accept

It isn't free of downsides — worth knowing:

- **More moving parts.** Two systems instead of one; a URL in your code now
  points to something external.
- **Eventual consistency.** Object stores historically didn't guarantee a file
  you just wrote was instantly readable everywhere (S3 fixed this in 2020).
- **No `cd` into a folder.** Objects are managed via an API/dashboard, not a
  filesystem. It *looks* like folders (`parks/yosemite/photo.jpg`) but that's a
  naming convention — it's really a flat **key → bytes** store.

**One-sentence summary:** the web moved to object storage because servers became
disposable and interchangeable — and you can't do that if each server is also
hoarding the files.

---

## 5. So what *is* a "blob"?

Generically: **an opaque chunk of binary data that the system stores and hands
back without caring what's inside.** A JPEG, a video, a PDF, a ZIP — to the
storage layer they're all the same: a bag of bytes with a name. The system
doesn't parse it or understand it. That "doesn't care what's inside" quality is
the essence of the word.

### The origin story (this part is great)

The term comes from **databases**, coined by **Jim Starkey** in the late
1970s/early 1980s while working on DEC's **Rdb** database. He needed a name for a
column type that could hold arbitrarily large binary data (images, audio) as
opposed to tidy integers and strings.

His own account: he named it after the **1958 sci-fi horror film *The Blob***
— the amorphous, gelatinous alien that keeps growing and consuming everything
(a young Steve McQueen fights it). These data objects were shapeless and could
grow enormous, just like the movie monster.

Then the classic corporate thing happened: **marketing wanted a proper
acronym.** So it got **backronymed** — first to "Basic Large Object," then to
the one that stuck: **BLOB = Binary Large OBject** (the "Binary Large Object"
expansion is often credited to Terri Watson at DEC). Starkey reportedly
preferred the movie-monster origin. So today it's written as if it were always
an acronym, but it started as a joke about a horror film.

### Where "blob" lives today

- **Databases** — `BLOB` is still a literal column type (MySQL: `TINYBLOB`,
  `BLOB`, `MEDIUMBLOB`, `LONGBLOB`).
- **Object storage** — and here's the vendor split:

  | | Amazon S3 | Azure |
  |---|---|---|
  | The thing | **Object** | **Blob** |
  | The container | **Bucket** | **Container** |
  | Service name | Simple Storage Service | **Blob** Storage |

  Cloudflare R2 follows the S3 vocabulary ("objects" in "buckets") because it's
  S3-API-compatible.
- **The browser / JavaScript** — a literal `Blob` object (`new Blob([data])`)
  and "blob URLs" (`blob:https://...`).
- **Git** — one of git's four internal object types is a **blob**. This one hits
  home for this project (next section).

The word survived ~45 years because the *concept* is so useful: **data the
system holds but deliberately doesn't understand.**

---

## 6. Bringing it home: git is full of blobs

Git stores everything as objects in a key-value store where the **key is a hash
of the content**. There are four object types:

| Type | Holds |
|---|---|
| **blob** | Raw file *contents* — just bytes, no name |
| **tree** | A directory listing: names + pointers to blobs/trees |
| **commit** | A snapshot: points to one top tree + parent + author + message |
| **tag** | A named pointer to a commit |

The structure is a chain of pointers: **commit → tree → subtrees → blobs.**

### Seeing it live (real commands run against this repo)

Ask git for a photo's blob hash, then inspect it:

```bash
$ git rev-parse HEAD:public/images/parks/yosemite/DSC00134.JPG
e717725703cf5e427604cc11eb05c5875628ff20      # the blob's hash

$ git cat-file -t e717725703cf5e427604cc11eb05c5875628ff20
blob                                          # its type

$ git cat-file -s e717725703cf5e427604cc11eb05c5875628ff20
10518528                                       # size in bytes (~10 MB)
```

The **tree** object is where filenames actually live — the blob itself has no name:

```bash
$ git cat-file -p HEAD:public/images/parks/yosemite
100644 blob a10b1f1c...  ATMY7236.JPG
100644 blob e717725703...  DSC00134.JPG     # <- name lives HERE, in the tree
100644 blob d5c38fd6...  IMG_3279.JPG
```

Proof the blob is pure image bytes with no filename inside:

```bash
$ git cat-file -p e717725703... | head -c 16 | xxd
00000000: ffd8 ffe1 c561 4578 6966 0000 4949 2a00  .....aExif..II*.
#          └ FF D8 FF = JPEG header   └ "Exif" = the metadata block
```

(That `Exif` block is exactly what the gallery's `imageMeta.js` reads to sort
photos by date taken.)

### Why this explains the 690 MB `.git` folder

**Blobs are keyed by content hash, and git keeps every blob forever.** Re-save a
photo — even a tiny edit — and its content changes, so its hash changes, so git
stores a **brand-new 10 MB blob** next to the old one. Both live in history
permanently. Delete the file entirely and the blob *still* stays, because old
commits reference it.

That's why this repo's `.git` was ~690 MB with only half the parks done: it's
every version of every photo ever committed, immortalized as blobs. A text file
re-saved 100 times costs almost nothing; a 10 MB image re-saved a few times
costs 10 MB each time, forever.

**This is the mechanical reason object storage wins for images:** R2 stores
*one* copy under a key and lets you overwrite it in place — no eternal history.
Moving the photos to R2 gets the blobs out of the place that keeps them forever
and into the place designed to serve them cheaply.

---

## Key takeaways

1. Object storage exists because **stateless, disposable servers** need a shared
   place to keep files — and that unlocked cloud scale + global CDNs.
2. Separate **code (text, belongs in git)** from **assets (blobs, belong in
   object storage)**.
3. A **blob** is a bag of bytes the storage layer deliberately doesn't
   understand — the term came from a 1958 horror film, later backronymed to
   "Binary Large OBject."
4. **Git bloats on images** because it stores every version of every blob
   forever — which is precisely why this project is migrating photos to R2.
