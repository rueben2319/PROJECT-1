#!/bin/bash

# MSCE Learn Video Processing Pipeline
# Usage: ./process-video.sh input.mp4 course-slug lesson-slug

set -e  # Exit on any error

# Check if required arguments are provided
if [ $# -ne 3 ]; then
    echo "Usage: $0 <input.mp4> <course-slug> <lesson-slug>"
    echo "Example: $0 lesson1.mp4 mathematics algebra-basics"
    exit 1
fi

INPUT_FILE="$1"
COURSE_SLUG="$2"
LESSON_SLUG="$3"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    exit 1
fi

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg is not installed. Please install ffmpeg first."
    echo "Ubuntu/Debian: sudo apt install ffmpeg"
    echo "macOS: brew install ffmpeg"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed. Please install AWS CLI first."
    echo "Ubuntu/Debian: sudo apt install awscli"
    echo "macOS: brew install awscli"
    exit 1
fi

echo "🎬 Starting video processing pipeline..."
echo "Input: $INPUT_FILE"
echo "Course: $COURSE_SLUG"
echo "Lesson: $LESSON_SLUG"
echo ""

# Create temporary directory structure
TEMP_DIR="tmp/$COURSE_SLUG/$LESSON_SLUG"
mkdir -p "$TEMP_DIR"

echo "📁 Created temporary directory: $TEMP_DIR"

# Step 1: Compress video to 720p with optimal settings for streaming
echo "🔧 Step 1: Compressing video to 720p..."
ffmpeg -i "$INPUT_FILE" \
    -c:v libx264 \
    -preset fast \
    -crf 23 \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    -y \
    "$TEMP_DIR/source_720p.mp4"

if [ $? -ne 0 ]; then
    echo "❌ Error: Video compression failed"
    exit 1
fi

echo "✅ Video compression completed"
echo "📊 Compressed file size: $(du -h "$TEMP_DIR/source_720p.mp4" | cut -f1)"

# Step 2: Generate HLS chunks
echo "🔧 Step 2: Generating HLS chunks..."
ffmpeg -i "$TEMP_DIR/source_720p.mp4" \
    -c:v libx264 \
    -preset fast \
    -crf 23 \
    -c:a aac \
    -b:a 128k \
    -hls_time 10 \
    -hls_playlist_type vod \
    -hls_segment_filename "$TEMP_DIR/chunk_%04d.ts" \
    -y \
    "$TEMP_DIR/playlist.m3u8"

if [ $? -ne 0 ]; then
    echo "❌ Error: HLS generation failed"
    exit 1
fi

echo "✅ HLS generation completed"
echo "📊 Generated $(find "$TEMP_DIR" -name "chunk_*.ts" | wc -l) video chunks"

# Step 3: Upload to Cloudflare R2
echo "🔧 Step 3: Uploading to Cloudflare R2..."

R2_BUCKET="msce-learn-videos"
R2_PATH="courses/$COURSE_SLUG/$LESSON_SLUG"

# Upload playlist file (short cache duration)
echo "📤 Uploading playlist..."
aws s3 cp "$TEMP_DIR/playlist.m3u8" \
    "s3://$R2_BUCKET/$R2_PATH/playlist.m3u8" \
    --content-type "application/vnd.apple.mpegurl" \
    --cache-control "max-age=10" \
    --endpoint-url "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com"

if [ $? -ne 0 ]; then
    echo "❌ Error: Playlist upload failed"
    exit 1
fi

# Upload chunk files (long cache duration, immutable)
echo "📤 Uploading video chunks..."
for chunk in "$TEMP_DIR"/chunk_*.ts; do
    if [ -f "$chunk" ]; then
        chunk_name=$(basename "$chunk")
        echo "  → $chunk_name"
        
        aws s3 cp "$chunk" \
            "s3://$R2_BUCKET/$R2_PATH/$chunk_name" \
            --content-type "video/MP2T" \
            --cache-control "max-age=31536000, immutable" \
            --endpoint-url "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com"
        
        if [ $? -ne 0 ]; then
            echo "❌ Error: Chunk upload failed for $chunk_name"
            exit 1
        fi
    fi
done

echo "✅ All files uploaded to R2"

# Step 4: Clean up temporary files
echo "🔧 Step 4: Cleaning up temporary files..."
rm -rf "tmp/$COURSE_SLUG"

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Temporary files cleanup failed, but upload was successful"
else
    echo "✅ Temporary files cleaned up"
fi

# Step 5: Output the R2 playlist path for database entry
echo ""
echo "🎉 Video processing completed successfully!"
echo ""
echo "📋 Copy this path for the database r2_playlist_path field:"
echo "courses/$COURSE_SLUG/$LESSON_SLUG/playlist.m3u8"
echo ""
echo "🔗 Public URL will be:"
echo "https://videos.msce-learn.com/courses/$COURSE_SLUG/$LESSON_SLUG/playlist.m3u8"
echo ""
echo "📊 Processing summary:"
echo "  • Input file: $INPUT_FILE ($(du -h "$INPUT_FILE" | cut -f1))"
echo "  • Output resolution: 720p"
echo "  • Video codec: H.264 (libx264)"
echo "  • Audio codec: AAC (128k)"
echo "  • Chunk duration: 10 seconds"
echo "  • R2 path: courses/$COURSE_SLUG/$LESSON_SLUG/"
echo ""

# Optional: Show file sizes
if command -v du &> /dev/null; then
    echo "📊 File size comparison:"
    echo "  • Original: $(du -h "$INPUT_FILE" | cut -f1)"
    echo "  • Compressed: $(du -h "$TEMP_DIR/source_720p.mp4" 2>/dev/null | cut -f1 || echo "N/A")"
    echo "  • Total chunks: $(find "$TEMP_DIR" -name "chunk_*.ts" 2>/dev/null | wc -l) files"
fi

echo "✨ Ready to add to MSCE Learn!"
