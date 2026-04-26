# MSCE Learn Video Processing Pipeline

This guide explains how to use the video processing pipeline to convert and upload educational videos for MSCE Learn.

## Overview

The video processing pipeline converts raw video files into optimized HLS (HTTP Live Streaming) format suitable for adaptive streaming across all devices. Videos are compressed to 720p, chunked into 10-second segments, and uploaded to Cloudflare R2 for secure, fast delivery.

## Prerequisites

### Required Software

1. **FFmpeg** - Video processing and compression
2. **AWS CLI** - Cloudflare R2 upload tool
3. **Bash** - Script execution shell

### Installation

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg awscli
```

#### macOS
```bash
brew install ffmpeg awscli
```

#### Windows (WSL)
```bash
# Install WSL2 first, then:
sudo apt update
sudo apt install ffmpeg awscli
```

### Cloudflare R2 Configuration

#### 1. Get R2 Credentials
1. Log in to Cloudflare Dashboard
2. Navigate to R2 Object Storage
3. Go to Settings → R2 API Tokens
4. Create a new token with:
   - Permissions: Object Read & Write
   - Include: All buckets
5. Save the Access Key ID and Secret Access Key

#### 2. Configure AWS CLI for R2
Create or edit `~/.aws/credentials`:

```ini
[default]
aws_access_key_id = YOUR_R2_ACCESS_KEY_ID
aws_secret_access_key = YOUR_R2_SECRET_ACCESS_KEY
```

Create or edit `~/.aws/config`:

```ini
[default]
region = auto
endpoint_url = https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

#### 3. Set Environment Variables (Optional)
```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

#### 4. Test Configuration
```bash
aws s3 ls --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

## Usage

### Basic Command
```bash
./scripts/process-video.sh input.mp4 course-slug lesson-slug
```

### Example
```bash
./scripts/process-video.sh "Lesson 1 - Introduction.mp4" mathematics algebra-basics
```

### Arguments
- `input.mp4` - Path to the source video file
- `course-slug` - URL-friendly course identifier (e.g., "mathematics", "biology")
- `lesson-slug` - URL-friendly lesson identifier (e.g., "algebra-basics", "cell-structure")

### Output
The script will output the R2 playlist path to copy into the admin dashboard:

```
📋 Copy this path for the database r2_playlist_path field:
courses/mathematics/algebra-basics/playlist.m3u8
```

## Processing Pipeline

### Step 1: Video Compression
The script compresses videos using FFmpeg with optimal settings for streaming:

**Video Settings:**
- **Codec**: H.264 (libx264)
- **Resolution**: 720p (1280x720, maintains aspect ratio)
- **Quality**: CRF 23 (good balance of quality/size)
- **Preset**: fast (faster processing, good compression)
- **Metadata**: `+faststart` flag for instant playback

**Audio Settings:**
- **Codec**: AAC
- **Bitrate**: 128k
- **Sample Rate**: Auto-detected

**Command:**
```bash
ffmpeg -i input.mp4 \
    -c:v libx264 \
    -preset fast \
    -crf 23 \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    -y \
    tmp/course/lesson/source_720p.mp4
```

### Step 2: HLS Generation
The compressed video is converted to HLS format with adaptive streaming:

**HLS Settings:**
- **Chunk Duration**: 10 seconds per segment
- **Playlist Type**: VOD (Video on Demand)
- **Segment Pattern**: `chunk_%04d.ts` (e.g., `chunk_0001.ts`)
- **Output**: `playlist.m3u8` + chunk files

**Command:**
```bash
ffmpeg -i tmp/course/lesson/source_720p.mp4 \
    -c:v libx264 \
    -preset fast \
    -crf 23 \
    -c:a aac \
    -b:a 128k \
    -hls_time 10 \
    -hls_playlist_type vod \
    -hls_segment_filename tmp/course/lesson/chunk_%04d.ts \
    -y \
    tmp/course/lesson/playlist.m3u8
```

### Step 3: R2 Upload
Files are uploaded to Cloudflare R2 with appropriate cache settings:

**Playlist File (playlist.m3u8):**
- **Content-Type**: `application/vnd.apple.mpegurl`
- **Cache-Control**: `max-age=10` (short cache for updates)

**Chunk Files (chunk_*.ts):**
- **Content-Type**: `video/MP2T`
- **Cache-Control**: `max-age=31536000, immutable` (1 year, immutable)

**Upload Path Structure:**
```
courses/
├── mathematics/
│   └── algebra-basics/
│       ├── playlist.m3u8
│       ├── chunk_0001.ts
│       ├── chunk_0002.ts
│       └── ...
├── biology/
│   └── cell-structure/
│       ├── playlist.m3u8
│       └── ...
```

### Step 4: Cleanup
Temporary files are automatically removed after successful upload.

## File Size Guidelines

### Target Sizes
- **10-minute lesson**: < 150MB at 720p
- **5-minute lesson**: < 75MB at 720p
- **20-minute lesson**: < 300MB at 720p

### Compression Ratios
- **Typical compression**: 70-90% size reduction
- **Input 1GB → Output**: ~100-300MB (720p, CRF 23)

### Quality vs. Size Trade-offs
- **CRF 23**: Good quality, reasonable size (recommended)
- **CRF 20**: Higher quality, larger files
- **CRF 26**: Lower quality, smaller files

## Resolution Guidelines

### When to Use 720p (Default)
- **Standard lessons** - Most educational content
- **Screen recordings** - Text remains readable
- **Presentations** - Good balance of quality and size
- **Target audience**: General broadband users

### When to Use 480p (Alternative)
- **Very slow connections** - Rural areas with limited bandwidth
- **Mobile data constraints** - Students with limited data plans
- **Longer videos** - 30+ minute lessons
- **File size critical** - When storage/bandwidth is major constraint

### 480p Alternative Script
Create a modified script for 480p processing:

```bash
# Change scale to 854x480 (480p)
-vf "scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2"
```

## Best Practices

### Source Video Preparation
1. **Resolution**: Start with 1080p or higher source
2. **Format**: MP4, MOV, or other common formats
3. **Audio**: Clear audio with minimal background noise
4. **Content**: Stable camera, good lighting, clear presentation

### File Naming
- **Use descriptive names**: `lesson-1-introduction.mp4`
- **Avoid spaces**: Use hyphens or underscores
- **Keep it short**: Under 50 characters
- **Be consistent**: Use naming convention across course

### Processing Tips
1. **Batch processing**: Process multiple videos in sequence
2. **Monitor storage**: Check available disk space before processing
3. **Network stability**: Ensure stable internet for R2 uploads
4. **Error handling**: Script stops on any error for safety

### Quality Assurance
1. **Test playback**: Verify video plays correctly after upload
2. **Check audio**: Ensure audio is clear and synchronized
3. **Mobile testing**: Test on mobile devices
4. **Different browsers**: Test Safari (native HLS) and Chrome (HLS.js)

## Troubleshooting

### Common Issues

#### FFmpeg Not Found
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

#### AWS CLI Authentication Error
```bash
# Check credentials
aws configure list

# Test R2 connection
aws s3 ls --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

#### Upload Permission Error
- Check R2 token permissions
- Verify bucket exists
- Ensure correct account ID in endpoint URL

#### Video Quality Issues
- Try different CRF values (20-26)
- Check source video quality
- Verify audio sync in output

#### Large File Sizes
- Increase CRF value (24-26)
- Consider 480p resolution
- Check source video bitrate

### Error Messages

#### "Input file not found"
```bash
# Check file path and permissions
ls -la input.mp4
```

#### "Video compression failed"
```bash
# Check FFmpeg version and codecs
ffmpeg -codecs | grep libx264
```

#### "HLS generation failed"
```bash
# Check available disk space
df -h
```

#### "Upload failed"
```bash
# Test R2 connection manually
aws s3 cp test.txt s3://your-bucket/test.txt --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

## Advanced Configuration

### Custom FFmpeg Presets
For different quality requirements, modify the FFmpeg commands:

**High Quality (CRF 20):**
```bash
-crf 20 -preset medium
```

**Fast Processing (CRF 25):**
```bash
-crf 25 -preset ultrafast
```

### Custom Chunk Durations
For different network conditions:

**Shorter chunks (5 seconds):**
```bash
-hls_time 5
```

**Longer chunks (15 seconds):**
```bash
-hls_time 15
```

### Multiple Bitrates (Future Enhancement)
For adaptive bitrate streaming:
```bash
# Generate multiple resolutions
# This would require playlist merging and more complex setup
```

## Integration with MSCE Learn

### Database Entry
1. Copy the R2 playlist path from script output
2. In admin dashboard, add video record:
   - Title: Lesson title
   - Course: Select course
   - Lesson Order: Sequential number
   - r2_playlist_path: Paste the path from script
   - Duration: Video length in seconds
   - Is Preview: Check if free sample

### Preview Lessons
- Mark first lesson as preview for course discovery
- Preview lessons don't require enrollment
- Helps students evaluate course quality

### Quality Control
- Review processed videos before publishing
- Test playback on different devices
- Verify audio quality and synchronization

The video processing pipeline provides a reliable, automated way to prepare educational videos for the MSCE Learn platform, ensuring optimal quality, fast delivery, and compatibility across all student devices.
