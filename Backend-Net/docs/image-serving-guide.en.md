# Image serving: why the API proxies the bytes

**Date:** 2026-09-07 · **Status:** implemented, verified end-to-end · Persian version: `image-serving-guide.fa.md`

## 1. The symptom

Upload worked. Delete "worked". But every URL the API handed back gave a bare
`404 page not found` in the browser — while the *same URL* fetched fine with `curl.exe`.

Two things made this hard to read:

- **`DeleteObject` returns `204` for a key that does not exist.** Verified against the live
  bucket. So "delete works fine" was never evidence of anything — a wrong key deletes nothing and
  still reports success.
- The response body was `404 page not found` (plain text, Go's `http.NotFound`), **not** S3's XML
  `<Code>NoSuchKey</Code>`. Those come from two different servers. Only the second one means "the
  object is missing".

## 2. Root cause

**Liara's object-storage edge rejects any request whose `User-Agent` looks like a browser** and
answers a plain-text `404 page not found` from its router, never reaching the S3 gateway.

Bisected header-by-header against an object confirmed to exist, same URL, same second:

| `User-Agent` | Result |
|---|---|
| *(none)* | `200` image |
| `curl/8.21.0` | `200` image |
| `WMS-Backend/1.0` | `200` image |
| `AppleWebKit/537.36` | `200` image |
| `Mozilla/5.0` | **`404 page not found`** |
| `Mozilla/5.0 (Windows NT 10.0…) Chrome/152…` | **`404 page not found`** |
| `Mozilla/5.0 (X11; Linux…) Firefox/155.0` | **`404 page not found`** |
| `Chrome/152.0.0.0` | **`404 page not found`** |
| `SomeApp Safari/537.36` | **`404 page not found`** |

The block is independent of everything that looked suspicious:

- path-style (`storage.c2.liara.site/wms/KEY`) **and** virtual-host style (`wms.storage.c2.liara.site/KEY`)
- public URL **and** correctly presigned URL (`X-Amz-Signature` verified valid — it returns `200` to curl)
- HTTP/1.1 **and** HTTP/2
- with and without a `Referer`
- whether the object exists or not

So **no URL pointing at that bucket can ever load in a browser.** The signing code was never wrong.

> `*.liara.space` (the domain in Liara's own docs) is unreachable from this network entirely — TLS
> reset on connect — so it is not an alternative endpoint here.

## 3. "Couldn't the frontend just send the request the way the backend does?"

No. This was tested directly from a page on a real separate origin (`http://127.0.0.1:5173`), and
it fails for two independent reasons, neither fixable in frontend code:

```
1. plain fetch()                -> threw: Failed to fetch
2. fetch() + User-Agent: curl   -> threw: Failed to fetch
4. XHR                          -> network error
5. <img src=bucket>             -> FAILED
```

Browser console:

```
Refused to set unsafe header "User-Agent"
Access to fetch at 'https://storage.c2.liara.site/wms/…' from origin 'http://127.0.0.1:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

1. **`User-Agent` is a forbidden header name.** The Fetch spec forbids scripts from setting it, and
   `XMLHttpRequest.setRequestHeader` refuses outright. The single header Liara filters on is the one
   header a browser will never let JavaScript change. There is no frontend workaround — not fetch,
   not XHR, not axios, not a blob URL, not a service worker.
2. **Even if it could, CORS blocks it.** The router that answers browser User-Agents emits no
   `Access-Control-Allow-Origin` at all. (The S3 gateway does echo `Origin` — but browsers never
   reach it.)

Something outside the browser has to fetch those bytes. The API is the only thing in the system that
qualifies. **This is necessarily a backend change.**

## 4. What changed

### New: `GET api/File/GetImage?objectKey=…`

Streams the object through the API. The AWS SDK fetches it server-side, where the User-Agent is not
blocked.

- `[AllowAnonymous]` — an `<img src>` cannot send an `Authorization` header. This grants nothing
  that was not already public: the bucket serves these objects to any unauthenticated caller today.
- Returns `FileResponseDto` and `File(content, contentType)` — no download filename, so it renders
  inline in an `<img>`. Same deliberate exception to the `ResponseDto` convention the PDF/barcode
  endpoints already make.
- A missing key now throws `NotFoundCustomException` → the normal Persian JSON envelope
  (`تصویر مورد نظر یافت نشد.`) instead of a silent, uninformative provider 404.

### `IObjectStorageService`

| Member | Change |
|---|---|
| `DownloadAsync(objectKey, ct)` | **new** — pulls the object back as `StoredFileDto` (bytes + content type + file name) |
| `GetFixedUrl(objectKey)` | now returns `{PublicBaseUrl}/api/File/GetImage?objectKey=…` — **our host, never the bucket**. Name kept, so all 15 existing call sites are unchanged |
| `GetExpirableUrl(objectKey)` | unchanged behaviour (presigned bucket URL), now documented as **server-to-server only — never give it to a browser** |
| `NormalizeKey(keyOrUrl)` | **restored**, and extended: also strips our own `?objectKey=` URL, where the key lives in the query string rather than the path |

`StoredFileDto` buffers to `byte[]` rather than holding a live stream — uploads are capped at
`MaxImageSizeBytes` (5 MB), and `byte[]` is what `FileResponseDto` already carries.

### Object keys: the uploader's file name, de-duplicated

Keys stay human-readable — the bucket listing is meant to be recognisable — so the uploaded file
name *is* the key. Two things guard it:

**1. Collision suffix.** A name already in the bucket gets a number rather than overwriting:

```
logo.png  ->  logo.png
logo.png  ->  logo-1.png
logo.png  ->  logo-2.png
```

Before this, the second `logo.png` silently replaced the first object's bytes — and the first
entity's `imageUrl` then pointed at somebody else's picture.

This is **check-then-put, not atomic**. S3's conditional write (`If-None-Match: *`) is *ignored* by
this provider — tested against the live bucket, the second PUT returned `200` and clobbered the
first — so an atomic reservation is not available. Two uploads of the same name in the same instant
can still collide; the window is one round-trip, versus the old behaviour of colliding on *every*
upload. After 50 probes it falls back to a GUID suffix rather than failing the upload: a rejected
upload loses the user's file, an ugly key costs nothing.

**2. Reduced to a single path segment.** The file name is client-controlled and becomes the key
verbatim, so it must not be able to pick its own prefix in the bucket. Both separators are stripped
regardless of host OS (the name comes off an HTTP request, not this machine's filesystem), along
with control characters, surrounding whitespace and leading/trailing dots:

| sent | stored key |
|---|---|
| `../../evil.png` | `evil.png` |
| `products/2026/logo.png` | `logo.png` |
| `C:\Users\alisi\Desktop\photo.png` | `photo.png` |
| `  spaced.png  ` | `spaced.png` |
| *(empty after cleaning)* | a GUID |

Related one-line fix in `UploadImageCommandHandler`: the extension allow-list check now runs on the
**trimmed** name. `"  photo.png  "` previously yielded the extension `".png  "`, matched nothing,
and rejected a perfectly good file.

> Keys remain guessable by design — that is the trade-off for readable names, on a bucket that is
> public-read. See §7.2.

### Restored, because the fix depends on them

- **`ContentType` on upload.** Stored on the object and handed straight back by `DownloadAsync`, so
  the browser renders inline instead of downloading an `octet-stream`.
- **`NormalizeKey` at every persistence site** — `Create/Update` for Product, Customer, Supplier and
  `ReceivePurchaseCommand`'s images. `ImageUrl` in a read response is now an API URL; without this,
  a frontend echoing it back into an update would persist the URL into the key column.
- **`ObjectKey` on the `GetImageUrl` response**, alongside `Url`.

`DisablePayloadSigning` was **not** restored — `RequestChecksumCalculation.WHEN_REQUIRED` in the DI
registration already handles the `aws-chunked` framing problem. Verified: uploads are byte-identical
to the source file without it.

### Audit of every handler that touches the service

All 28 consumers were checked for the upload → store → display round-trip. Two were broken:

**1. Document attachments never normalised their key.** `CreatePurchaseCommand`,
`UpdatePurchaseCommand`, `CreateSaleCommand` and `UpdateSaleCommand` all *injected*
`IObjectStorageService` and then never called it — they wrote `attachment.ObjectKey` verbatim, while
`GetPurchaseDetailQuery` / `GetSaleDetailQuery` read it back through `GetFixedUrl`. Every other write
path in the codebase normalised; these four were the drift. It matters most here because Update
**replaces the attachment list wholesale** (the frontend always sends the final list), so a frontend
re-sending what it just read can easily put `url` back into `objectKey` — and the column would then
hold a URL with an embedded host, which breaks the moment `PublicBaseUrl` differs between
environments. Fixed in all four; regression test
`UpdatePurchase_AttachmentUrlEchoedBack_PersistsTheBareKey`.

**2. `ScanBarcodeQuery` returned the bare key in a field named `imageUrl`.** The handler did not
inject the storage service at all: it set `ImageUrl = product.ImageUrl` (which is the *key*) and left
`ImageKey` null — the inverse of every other read path. An `<img src="logo.png">` resolves against
the *frontend's* origin, so the scan screen showed a broken image while every other screen worked.
Now `ImageKey = product.ImageUrl` and `ImageUrl = GetFixedUrl(...)`, matching
`GetProductDetailQuery`.

Everything else was already correct: the six entity-image write paths, `ReceivePurchaseCommand`'s
photos, both receiving-image read queries, all four product/customer/supplier list and detail
queries, and `DeleteImage` / `GetImageUrl` / `GetImage` (which normalise internally).

### Configuration

```jsonc
"ObjectStorage": {
  // This API's own public base URL. Image URLs point HERE, not at the bucket.
  // Change per environment.
  "PublicBaseUrl": "http://localhost:5083"
},
"CorsSettings": {
  "AllowedOrigins": [ "http://localhost:5173", "http://127.0.0.1:5173" ]
}
```

**The CORS entry was a separate, pre-existing bug.** It read `[ "localhost" ]` — a bare host, not an
origin. `WithOrigins()` matched nothing, no `Access-Control-Allow-Origin` was ever emitted, and every
browser call from the Vite dev server was blocked (login and list endpoints included — there is no
Vite proxy; axios uses an absolute `http://localhost:5083/api`). Now verified emitting
`Access-Control-Allow-Origin: http://localhost:5173` on both preflight and the actual request.

> **Add your production frontend origin here before deploying.** Scheme + host + port, always.

If `PublicBaseUrl` is left blank, image URLs come out relative (`/api/File/GetImage?objectKey=…`),
which only resolves for a frontend served from the same origin as the API.

### Write-side field renamed to `imageKey` (breaking)

The six image-write fields disagreed with each other and with the read side:

| command | was | now |
|---|---|---|
| `CreateProductCommand` | `imageUrl` | `imageKey` |
| `UpdateProductCommand` | `imageObjectKey` | `imageKey` |
| `CreateCustomerCommand` | `imageUrl` | `imageKey` |
| `UpdateCustomerCommand` | `imageUrl` | `imageKey` |
| `CreateSupplierCommand` | `imageUrl` | `imageKey` |
| `UpdateSupplierCommand` | `imageUrl` | `imageKey` |

`imageKey` won rather than `imageUrl` (which had the majority) because **read and write are now
symmetric**: every read DTO returns `imageKey` (stable) + `imageUrl` (display only), and `imageKey`
is the one you send back. A write field named `imageUrl` that actually wants a *key* is precisely the
trap `NormalizeKey` exists to catch — the name now makes the correct usage obvious instead of relying
on a safety net.

The three AutoMapper create-maps now explicitly `Ignore()` the entity's `ImageUrl` column, so nobody
can reintroduce a convention mapping that bypasses `NormalizeKey`.

`NormalizeKey` is still applied, so sending a full URL keeps working — but `imageKey` is the contract.

## 5. What this means for the frontend

The read contract is unchanged in shape — DTOs still carry `imageKey` (stable) and `imageUrl`
(ready to render). Only the *host* inside `imageUrl` changed.

**Nothing is required for images to display.** `<img src>` is exempt from CORS and the endpoint is
anonymous. Verified live from a separate origin: `IMG: loaded 4096x2341`.

### Required frontend change: rename the write field to `imageKey`

Reading is unaffected. Only the payload key on the six create/update commands changed.

```diff
  // useCustomerForm.js / useSupplierForm.js
- imageUrl: imageKey ?? null,
+ imageKey: imageKey ?? null,

  // useProductForm.js — create AND update now agree; the imageObjectKey special case is gone
- imageObjectKey: imageKey ?? null,
+ imageKey: imageKey ?? null,
```

Clearing an image is still `imageKey: null`. Sending a full URL still works (`NormalizeKey`), so a
missed call site degrades rather than breaks — but it should be `imageKey` everywhere.

Also worth doing while you are in there, though not caused by this change: `objectKeyOf` still reads
the key from the URL's pathname, which is now the wrong half. See below.

`SignedImage.jsx` already fits: it renders `imageUrl` directly and only calls `GetImageUrl` from
`onError`. The new URLs do not expire, so that fallback never fires.

**One latent hazard worth fixing.** `objectKeyOf` in
`src/shared/services/files/objectKey.js` — the frontend's mirror of `NormalizeKey` — extracts the key
from a URL's **pathname** and discards the query string ("the query is the expired signature"). That
assumption is now wrong: the key lives *in* the query string. Fed one of the new URLs it returns
`api/File/GetImage`. It is latent, not live — every call site currently passes a key, never a URL
(`remoteUrl` is kept separate) — but the mirror is out of sync with the backend and should read
`?objectKey=` first.

## 6. Verification performed

- **Root cause** — header bisection against a live object (table in §2).
- **Frontend-fix impossibility** — real cross-origin page, `fetch` / `fetch`+UA / XHR / `<img>` all fail (§3).
- **SDK layer** — uploaded via the exact production code path with ASCII, spaced, Persian and
  `+`/`#` keys: all `200`, all byte-identical to source, both addressing styles.
- **Key de-duplication, against the live bucket, through the real `LiaraObjectStorageService`** —
  the same name three times produced `dedupe-probe.png` / `-1` / `-2`, and all three objects read
  back with their own distinct bytes intact. `../../escaped.png`,
  `products/2026/nested.png` and `C:\…\windows.png` all stored as a bare file name with no separator.
  Probe objects deleted afterwards.
- **Conditional write** — `If-None-Match: *` confirmed *not* honoured by this provider (PUT returned
  `200` and overwrote), which is why the dedupe is check-then-put.
- **Live browser** — `GET api/File/GetImage` renders for plain, spaced and Persian keys; a bad key
  returns the Persian JSON envelope.
- **Cross-origin `<img>`** — loaded `4096x2341` from a separate origin.
- **CORS** — `Access-Control-Allow-Origin` now emitted on preflight (`204`) and actual request (`200`).
- **Build** — `dotnet build WMS.slnx`, 0 errors.
- **Tests** — 20 image/attachment tests pass (7 added: the URL must point at the API rather than the bucket and
  must serve the bytes; same-name uploads must suffix and keep both objects; four file-name
  sanitisation cases, plus an attachment URL-echo round-trip). Full suite 359/368; the 9 failures are the pre-existing set CLAUDE.md
  documents — 8 die during user seeding on `IX_Users_PersonelCode` before any image code runs, the
  9th is a FluentValidation message assertion.

## 7. Open items (not fixed here)

1. **The bucket is public-read, and keys are readable by design.** Any unauthenticated caller can
   fetch any object with a non-browser User-Agent, and the key is the original file name, so keys are
   guessable. This is the accepted trade-off for a recognisable bucket listing. If the bucket is ever
   made private, `GetImage` must grow its own expiring signed token — simply re-applying
   `[Authorize]` would break every image, because `<img>` cannot send a bearer token.
2. **`ImageFolderEnum folder` is accepted and validated but unused** — keys are flat. Restoring a
   `{folder}/` prefix would reduce cross-entity name collisions, but it changes the shape of keys
   already stored in the database.
3. **Real Liara credentials are committed in `WMS/appsettings.json`** — owner is removing them; they
   belong in `ObjectStorage__AccessKey` / `ObjectStorage__SecretKey` environment variables and should
   be rotated, since they are in git history.
4. **Frontend `objectKeyOf`** — see §5. Deliberately left to the frontend; this document is the
   hand-off.
