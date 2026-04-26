# MSCE Learn Scripts Directory

This directory contains utility scripts for managing MSCE Learn operations, particularly video processing and content management.

## Available Scripts

### 🎬 Video Processing

#### `process-video.sh`
**Main video processing pipeline** - Converts raw videos to optimized HLS format for streaming.

**Usage:**
```bash
./process-video.sh input.mp4 course-slug lesson-slug
```

**Features:**
- 720p video compression with H.264 codec
- HLS chunking (10-second segments)
- Cloudflare R2 upload with proper cache headers
- Automatic cleanup of temporary files
- Database-ready output path

**Documentation:** See [process-video.md](./process-video.md) for detailed setup and usage instructions.

#### `example-usage.sh`
**Example batch processing** - Demonstrates processing multiple videos for courses.

**Usage:**
```bash
./example-usage.sh
```

**Features:**
- Shows batch processing workflow
- Example for Mathematics and Biology courses
- Database entry examples

## Quick Start

### 1. Install Prerequisites
```bash
# Ubuntu/Debian
sudo apt install ffmpeg awscli

# macOS
brew install ffmpeg awscli
```

### 2. Configure R2 Access
Set up AWS CLI for Cloudflare R2:
```bash
aws configure
# Enter your R2 Access Key ID and Secret Access Key
```

### 3. Process Your First Video
```bash
./process-video.sh "my-lesson.mp4" mathematics "algebra-basics"
```

### 4. Add to Database
Copy the output path to your admin dashboard:
```
courses/mathematics/algebra-basics/playlist.m3u8
```

## File Structure

After processing, videos are stored in R2 with this structure:
```
courses/
├── {course-slug}/
│   └── {lesson-slug}/
│       ├── playlist.m3u8          # HLS playlist
│       ├── chunk_0001.ts           # Video segments
│       ├── chunk_0002.ts
│       └── ...
```

## Video Specifications

### Input Requirements
- **Format**: MP4, MOV, AVI, or other common formats
- **Resolution**: 720p or higher recommended
- **Audio**: Clear audio with minimal background noise
- **Duration**: Any length (script handles all durations)

### Output Specifications
- **Resolution**: 720p (1280x720)
- **Codec**: H.264 (libx264)
- **Audio**: AAC 128k
- **Quality**: CRF 23 (good balance)
- **Segments**: 10-second chunks
- **Target Size**: <150MB for 10-minute video

### Cache Settings
- **Playlist (.m3u8)**: 10-second cache (allows updates)
- **Chunks (.ts)**: 1-year immutable cache (optimal delivery)

## Troubleshooting

### Common Issues

#### FFmpeg Not Found
```bash
# Install FFmpeg
sudo apt install ffmpeg  # Ubuntu/Debian
brew install ffmpeg       # macOS
```

#### AWS CLI Authentication
```bash
# Test R2 connection
aws s3 ls --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

#### Permission Errors
```bash
# Make scripts executable
chmod +x process-video.sh
chmod +x example-usage.sh
```

### Error Messages

| Error | Solution |
|-------|----------|
| "Input file not found" | Check file path and permissions |
| "Video compression failed" | Verify FFmpeg installation and source video |
| "Upload failed" | Check R2 credentials and bucket access |
| "Temporary files cleanup failed" | Usually safe to ignore if upload succeeded |

## Best Practices

### Video Preparation
1. **High quality source** - Start with 1080p or higher
2. **Clear audio** - Use microphone, minimize background noise
3. **Stable camera** - Use tripod or stable surface
4. **Good lighting** - Ensure visibility of content

### File Naming
- **Use descriptive names**: `lesson-1-introduction.mp4`
- **Avoid spaces**: Use hyphens or underscores
- **Keep consistent**: Use naming convention across course
- **URL-friendly**: Use lowercase, alphanumeric, hyphens

### Batch Processing
1. **Process sequentially** - Don't overwhelm system
2. **Monitor storage** - Check disk space before batch
3. **Test uploads** - Verify first video uploads correctly
4. **Document paths** - Keep track of database entries

### Quality Control
1. **Test playback** - Verify videos play correctly
2. **Check audio sync** - Ensure audio matches video
3. **Mobile testing** - Test on phones and tablets
4. **Browser testing** - Test Safari and Chrome

## Advanced Usage

### Custom Quality Settings
Modify the script for different quality requirements:

```bash
# Higher quality (CRF 20)
-crf 20 -preset medium

# Faster processing (CRF 25)  
-crf 25 -preset ultrafast

# 480p resolution (for slow connections)
-vf "scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2"
```

### Different Chunk Durations
```bash
# Shorter chunks (5 seconds)
-hls_time 5

# Longer chunks (15 seconds)
-hls_time 15
```

### Batch Processing Script
Create custom batch scripts for your courses:

```bash
#!/bin/bash
# my-course-batch.sh

VIDEOS=(
    "lesson-1.mp4:introduction"
    "lesson-2.mp4:advanced-topics"
    "lesson-3.mp4:practice-problems"
)

for video in "${VIDEOS[@]}"; do
    IFS=':' read -r filename slug <<< "$video"
    echo "Processing $filename..."
    ./process-video.sh "$filename" my-course "$slug"
done
```

## Integration with MSCE Learn

### Database Entry
1. Copy R2 path from script output
2. In admin dashboard:
   - Add video record
   - Set lesson order
   - Paste r2_playlist_path
   - Set duration in seconds
   - Mark preview if applicable

### Preview Lessons
- Mark first lesson as preview
- Preview lessons don't require enrollment
- Helps students evaluate course quality

### Content Management
- Process videos in logical order
- Test each video before publishing
- Maintain consistent naming conventions
- Keep backup of original files

## Support

For additional help:
1. Check the detailed [process-video.md](./process-video.md) documentation
2. Review FFmpeg documentation for codec options
3. Consult Cloudflare R2 documentation for upload issues
4. Test with small files first to verify setup

The scripts provide a reliable, automated workflow for preparing educational content for MSCE Learn, ensuring consistent quality and optimal delivery across all student devices.
