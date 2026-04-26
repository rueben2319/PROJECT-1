#!/bin/bash

# Example usage of the video processing pipeline
# This demonstrates how to process multiple videos for a course

echo "🎓 MSCE Learn Video Processing Example"
echo "======================================"
echo ""

# Example 1: Mathematics course
echo "📚 Processing Mathematics Course Videos:"
echo ""

# Lesson 1
echo "📹 Processing Lesson 1 - Introduction to Algebra..."
./process-video.sh "math-intro.mp4" mathematics "algebra-introduction"

# Lesson 2  
echo "📹 Processing Lesson 2 - Linear Equations..."
./process-video.sh "linear-equations.mp4" mathematics "linear-equations"

# Lesson 3
echo "📹 Processing Lesson 3 - Quadratic Functions..."
./process-video.sh "quadratic-functions.mp4" mathematics "quadratic-functions"

echo ""
echo "✅ Mathematics course processing complete!"
echo ""

# Example 2: Biology course
echo "📚 Processing Biology Course Videos:"
echo ""

# Lesson 1
echo "📹 Processing Lesson 1 - Cell Structure..."
./process-video.sh "cell-structure.mp4" biology "cell-structure"

# Lesson 2
echo "📹 Processing Lesson 2 - Photosynthesis..."
./process-video.sh "photosynthesis.mp4" biology "photosynthesis"

echo ""
echo "✅ Biology course processing complete!"
echo ""

echo "🎉 All example videos processed!"
echo ""
echo "📋 Database entries needed:"
echo "Mathematics Course:"
echo "  - courses/mathematics/algebra-introduction/playlist.m3u8"
echo "  - courses/mathematics/linear-equations/playlist.m3u8"  
echo "  - courses/mathematics/quadratic-functions/playlist.m3u8"
echo ""
echo "Biology Course:"
echo "  - courses/biology/cell-structure/playlist.m3u8"
echo "  - courses/biology/photosynthesis/playlist.m3u8"
