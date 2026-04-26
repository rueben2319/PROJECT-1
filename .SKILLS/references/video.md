# Video Reference — MSCE Learn

All videos go through FFmpeg → HLS → Cloudflare R2. Raw MP4 files are never
served directly. Signed URLs (10-min expiry) are the only way videos reach students.

---

## Upload pipeline (run for every new lesson)

```bash
#!/bin/bash
# scripts/process-video.sh
# Usage: ./process-video.sh input.mp4 course-slug lesson-slug
#
# Requires: ffmpeg, aws CLI configured for Cloudflare R2

INPUT=$1
COURSE=$2   # e.g. form4-mathematics
LESSON=$3   # e.g. lesson-01-algebra-basics
OUTDIR="tmp/${COURSE}/${LESSON}"

echo "→ Step 1: Compressing and encoding..."
mkdir -p "$OUTDIR"
ffmpeg -i "$INPUT" \
  -c:v libx264 \
  -crf 23 \
  -preset fast \
  -vf scale=1280:720 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  "${OUTDIR}/source_720p.mp4"

echo "→ Step 2: Generating HLS chunks..."
ffmpeg -i "${OUTDIR}/source_720p.mp4" \
  -c:v libx264 -crf 23 -preset fast \
  -c:a aac -b:a 128k \
  -hls_time 10 \
  -hls_playlist_type vod \
  -hls_segment_filename "${OUTDIR}/chunk_%04d.ts" \
  "${OUTDIR}/playlist.m3u8"

echo "→ Step 3: Uploading to Cloudflare R2..."
# Upload chunks (cache forever — they never change)
aws s3 cp "$OUTDIR" \
  "s3://msce-learn-videos/courses/${COURSE}/${LESSON}/" \
  --recursive \
  --exclude "*.mp4" \
  --content-type "video/MP2T" \
  --cache-control "max-age=31536000, immutable" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# Upload playlist (short cache — could be updated)
aws s3 cp "${OUTDIR}/playlist.m3u8" \
  "s3://msce-learn-videos/courses/${COURSE}/${LESSON}/playlist.m3u8" \
  --content-type "application/vnd.apple.mpegurl" \
  --cache-control "max-age=10" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "→ Step 4: Cleaning up temp files..."
rm -rf "$OUTDIR"

echo ""
echo "✓ Done. Add this path to the videos table:"
echo "  r2_playlist_path: courses/${COURSE}/${LESSON}/playlist.m3u8"
```

---

## FFmpeg settings explained

| Flag | Value | Why |
|------|-------|-----|
| `-c:v libx264` | H.264 codec | Universal browser support including Android Chrome |
| `-crf 23` | Quality 0–51 (lower = better) | Sweet spot: good quality, reasonable file size |
| `-preset fast` | Encoding speed | Faster encode, slightly larger file — acceptable trade-off |
| `-vf scale=1280:720` | 720p output | Clear on phone screens, not too heavy for 3G |
| `-c:a aac -b:a 128k` | Audio | Clear voice audio for lectures |
| `-movflags +faststart` | Metadata to front | Browser starts playing before full download |
| `-hls_time 10` | 10-second chunks | Player starts in ~1–2 seconds on 3G |
| `-hls_playlist_type vod` | Video on demand | Not a live stream |

---

## File size targets

| Quality | Resolution | Target file size (10 min) | 3G start time |
|---------|-----------|--------------------------|---------------|
| Low | 480p | ~60MB | ~1.5s |
| Standard | 720p | ~120MB | ~2.5s |
| High | 1080p | ~250MB | ~5s (avoid for 3G) |

**Use 720p for MVP.** Add 480p as a fallback in Phase 2.

---

## R2 folder structure

```
msce-learn-videos/              ← R2 bucket (private)
  courses/
    form4-mathematics/
      lesson-01-algebra/
        playlist.m3u8           ← HLS playlist (tiny, ~1KB)
        chunk_0000.ts           ← 0:00–0:10
        chunk_0001.ts           ← 0:10–0:20
        ...
    form4-english/
      lesson-01-comprehension/
        playlist.m3u8
        chunk_0000.ts
        ...
    jce-biology/
      ...
```

The path stored in the `videos` table is always the relative path:
`courses/form4-mathematics/lesson-01-algebra/playlist.m3u8`

This path **never** goes to the frontend — only signed URLs do.

---

## Signed URL Edge Function

```typescript
// supabase/functions/get-video-url/index.ts
import { createClient } from '@supabase/supabase-js'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { requireAuth, requireEnrollment } from '../_shared/auth.ts'
import { validateInput, GetVideoUrlSchema } from '../_shared/validate.ts'
import { logAudit, AUDIT } from '../_shared/audit.ts'
import { corsHeaders } from '../_shared/cors.ts'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     Deno.env.get('R2_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
  },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  try {
    // 1. Verify auth
    const user  = await requireAuth(req, supabase)

    // 2. Validate input
    const input = await validateInput(req, GetVideoUrlSchema)

    // 3. Fetch video record (never trust client-provided path)
    const { data: video } = await supabase
      .from('videos')
      .select('r2_playlist_path, course_id, is_preview')
      .eq('id', input.video_id)
      .single()
    if (!video) {
      return Response.json({ error: 'Video not found' }, { status: 404 })
    }

    // 4. Check enrollment (skip for previews)
    if (!video.is_preview) {
      await requireEnrollment(user.id, video.course_id, supabase)
    }

    // 5. Generate signed URL from R2 (10 minutes)
    const signedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: Deno.env.get('R2_BUCKET_NAME')!,
        Key:    video.r2_playlist_path,  // path from DB — never from client
      }),
      { expiresIn: 600 }  // 600 seconds = 10 minutes
    )

    // 6. Audit log
    await logAudit(supabase, AUDIT.ACCESS_GRANTED, user.id, {
      video_id:  input.video_id,
      course_id: video.course_id,
      is_preview: video.is_preview
    })

    return Response.json(
      { data: { url: signedUrl } },
      { headers: corsHeaders(req) }
    )

  } catch (err) {
    if (err instanceof HTTPError) {
      return Response.json({ error: err.message }, { status: err.status })
    }
    console.error('[get-video-url]', err)
    return Response.json({ error: 'Could not load video' }, { status: 500 })
  }
})
```

---

## Anti-piracy measures

| Measure | How |
|---------|-----|
| No download button | `controlsList="nodownload"` on `<video>` |
| No right-click | `onContextMenu={e => e.preventDefault()}` |
| URLs expire in 10 min | `expiresIn: 600` in signed URL generation |
| Path never exposed | `r2_playlist_path` never returned to frontend |
| Enrollment re-checked every play | `requireEnrollment` runs on every `get-video-url` call |
| Private R2 bucket | No public access to storage |

---

## Video quality checklist before uploading

- [ ] Video is compressed with FFmpeg (not raw phone recording)
- [ ] Resolution is 720p or 480p — not 1080p
- [ ] `-movflags +faststart` flag was used
- [ ] HLS chunks are 10 seconds each
- [ ] File size is under 150MB for a 10-minute lesson
- [ ] Chunks uploaded with `max-age=31536000` cache header
- [ ] Playlist uploaded with `max-age=10` cache header
- [ ] `r2_playlist_path` added to `videos` table in DB
- [ ] Preview flag set correctly (`is_preview = true/false`)
- [ ] Lesson order set correctly (`lesson_order` column)
