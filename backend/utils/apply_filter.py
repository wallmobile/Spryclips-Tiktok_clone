#!/usr/bin/env python3
"""
TikTok-Style Video Filter Processor
Applies professional video filters similar to TikTok's filters
Uses OpenCV for processing and FFmpeg for encoding
"""

import cv2
import numpy as np
import argparse
import os
import sys
import subprocess
import multiprocessing
from pathlib import Path
from typing import Tuple, Optional

class TikTokFilterProcessor:
    """Process video frames with TikTok-style filters"""
    
    def __init__(
        self,
        brightness: float = 0.0,
        contrast: float = 1.0,
        saturation: float = 1.0,
        vignette: float = 0.0,
        grain: float = 0.0,
        skin_protection: bool = True
    ):
        self.brightness = brightness
        self.contrast = contrast
        self.saturation = saturation
        self.vignette = vignette
        self.grain = grain
        self.skin_protection = skin_protection
        self.vignette_mask = None
        
    def generate_vignette_mask(self, width: int, height: int) -> np.ndarray:
        """Generate a vignette effect mask"""
        if self.vignette <= 0:
            return None
            
        # Create coordinate grids
        y, x = np.ogrid[:height, :width]
        center_x, center_y = width / 2, height / 2
        
        # Calculate distance from center
        # Normalize by the distance from center to corner
        max_distance = np.sqrt(center_x**2 + center_y**2)
        distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)
        normalized_distance = distance / max_distance
        
        # Create gaussian falloff
        mask = 1 - (normalized_distance ** 2) * self.vignette
        mask = np.clip(mask, 0, 1)
        
        # Convert to 3-channel
        return np.stack([mask] * 3, axis=2).astype(np.float32)
    
    def detect_skin(self, frame: np.ndarray) -> np.ndarray:
        """Detect skin pixels in YCrCb color space"""
        # Convert to YCrCb
        ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
        
        # Skin tone range in YCrCb (empirically determined)
        lower_skin = np.array([0, 135, 85], dtype=np.uint8)
        upper_skin = np.array([255, 180, 135], dtype=np.uint8)
        
        # Create mask
        skin_mask = cv2.inRange(ycrcb, lower_skin, upper_skin)
        
        # Dilate to smooth edges
        skin_mask = cv2.dilate(skin_mask, np.ones((5, 5), np.uint8), iterations=2)
        
        # Blur for soft edges
        skin_mask = cv2.GaussianBlur(skin_mask.astype(np.float32), (21, 21), 0)
        skin_mask = skin_mask / 255.0
        
        return np.stack([skin_mask] * 3, axis=2)
    
    def apply_filters(self, frame: np.ndarray) -> np.ndarray:
        """Apply all filters to a single frame"""
        result = frame.astype(np.float32)
        
        # 1. Brightness adjustment
        if self.brightness != 0:
            result = result + (self.brightness * 255)
            result = np.clip(result, 0, 255)
        
        # 2. Contrast adjustment
        if self.contrast != 1.0:
            result = result * self.contrast
            result = np.clip(result, 0, 255)
        
        # 3. Saturation adjustment (with skin protection)
        if self.saturation != 1.0:
            # Convert to HSV
            hsv = cv2.cvtColor(result.astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
            
            # Scale S channel
            hsv[:, :, 1] = hsv[:, :, 1] * self.saturation
            hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
            
            # Convert back to BGR
            result = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
            
            # Apply skin protection to reduce saturation boost on skin
            if self.skin_protection:
                skin_mask = self.detect_skin(frame)
                # Reduce saturation effect on skin areas
                original_hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV).astype(np.float32)
                protected_s = original_hsv[:, :, 1] * 0.7 + hsv[:, :, 1] * 0.3
                hsv[:, :, 1] = protected_s * skin_mask[:, :, 0] + hsv[:, :, 1] * (1 - skin_mask[:, :, 0])
                result = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
        
        # 4. Vignette effect
        if self.vignette > 0:
            if self.vignette_mask is None:
                self.vignette_mask = self.generate_vignette_mask(frame.shape[1], frame.shape[0])
            result = result * self.vignette_mask
        
        # 5. Grain/Noise
        if self.grain > 0:
            # Generate random noise with frame-specific seed
            np.random.seed(hash(tuple(result.flatten())) % 2**32)
            noise = np.random.normal(0, self.grain * 50, result.shape).astype(np.float32)
            result = result + noise
            result = np.clip(result, 0, 255)
        
        return result.astype(np.uint8)
    
    def process_frame(self, frame_data: Tuple[int, np.ndarray]) -> Tuple[int, np.ndarray]:
        """Process a single frame (for multiprocessing)"""
        frame_num, frame = frame_data
        processed = self.apply_filters(frame)
        return (frame_num, processed)

def process_video_frames(
    input_path: str,
    brightness: float = 0.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    vignette: float = 0.0,
    grain: float = 0.0,
    skin_protection: bool = True,
    use_multiprocessing: bool = False,
    num_workers: int = None
) -> Tuple[np.ndarray, int]:
    """Process all frames of a video"""
    
    # Open video
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {input_path}")
    
    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"Processing video: {width}x{height} @ {fps}fps, {total_frames} frames")
    
    # Initialize processor
    processor = TikTokFilterProcessor(
        brightness=brightness,
        contrast=contrast,
        saturation=saturation,
        vignette=vignette,
        grain=grain,
        skin_protection=skin_protection
    )
    
    # Read all frames
    print("Reading frames...")
    frames = []
    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frames.append((frame_count, frame))
        frame_count += 1
        
        # Progress update
        if frame_count % 30 == 0:
            print(f"  Read {frame_count}/{total_frames} frames", end='\r')
    
    cap.release()
    print(f"\nRead {frame_count} frames")
    
    # Process frames
    print("Processing frames...")
    if use_multiprocessing and num_workers and len(frames) > 100:
        # Use multiprocessing for large videos
        if num_workers is None:
            num_workers = multiprocessing.cpu_count()
        
        with multiprocessing.Pool(num_workers) as pool:
            processed_frames = pool.map(processor.process_frame, frames)
        
        # Sort by frame number
        processed_frames.sort(key=lambda x: x[0])
        frames = [frame for _, frame in processed_frames]
    else:
        # Single-threaded processing
        for i, (frame_num, frame) in enumerate(frames):
            frames[i] = (frame_num, processor.apply_filters(frame))
            if (i + 1) % 30 == 0:
                print(f"  Processed {i+1}/{len(frames)} frames", end='\r')
        
        frames = [frame for _, frame in frames]
    
    print(f"\nProcessed {len(frames)} frames")
    
    return frames, fps

def process_with_opencv(input_path: str, output_path: str, **kwargs):
    """Process video using OpenCV VideoWriter (simple fallback)"""
    print("Using OpenCV VideoWriter...")
    
    frames, fps = process_video_frames(input_path, **kwargs)
    
    if not frames:
        raise ValueError("No frames processed")
    
    # Get video properties
    height, width = frames[0].shape[:2]
    
    # Create VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    if not out.isOpened():
        raise ValueError(f"Could not create output video: {output_path}")
    
    # Write frames
    print(f"Writing {len(frames)} frames to {output_path}...")
    for i, frame in enumerate(frames):
        out.write(frame)
        if (i + 1) % 30 == 0:
            print(f"  Written {i+1}/{len(frames)} frames", end='\r')
    
    out.release()
    print("\nDone!")
    
    # Note: This method loses audio - use FFmpeg method instead

def process_with_ffmpeg(
    input_path: str,
    output_path: str,
    brightness: float = 0.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    vignette: float = 0.0,
    grain: float = 0.0,
    skin_protection: bool = True,
    use_multiprocessing: bool = False,
    num_workers: int = None,
    hardware_accel: bool = False
):
    """Process video using FFmpeg for better encoding (RECOMMENDED)"""
    print("Using FFmpeg pipeline...")
    
    frames, fps = process_video_frames(
        input_path,
        brightness=brightness,
        contrast=contrast,
        saturation=saturation,
        vignette=vignette,
        grain=grain,
        skin_protection=skin_protection,
        use_multiprocessing=use_multiprocessing,
        num_workers=num_workers
    )
    
    if not frames:
        raise ValueError("No frames processed")
    
    height, width = frames[0].shape[:2]
    
    # Temporary raw video path
    temp_raw = output_path.replace('.mp4', '_temp.yuv')
    
    try:
        # Write raw frames
        print(f"Writing {len(frames)} frames to raw video...")
        with open(temp_raw, 'wb') as f:
            for i, frame in enumerate(frames):
                # Convert BGR to YUV420
                yuv_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV_I420)
                f.write(yuv_frame.tobytes())
                if (i + 1) % 30 == 0:
                    print(f"  Written {i+1}/{len(frames)} frames", end='\r')
        
        print("\nEncoding with FFmpeg...")
        
        # FFmpeg command to encode and copy audio
        ffmpeg_cmd = [
            'ffmpeg',
            '-f', 'rawvideo',
            '-vcodec', 'rawvideo',
            '-s', f'{width}x{height}',
            '-pix_fmt', 'yuv420p',
            '-r', str(fps),
            '-i', temp_raw,  # Input raw video
            '-i', input_path,  # Input with audio
            '-c:v', 'libx264',  # Video codec
            '-preset', 'fast',  # Encoding preset
            '-crf', '23',  # Quality
            '-c:a', 'copy',  # Copy audio
            '-map', '0:v:0',  # Video from raw input
            '-map', '1:a:0?',  # Audio from original (optional ? means skip if no audio)
            '-y',  # Overwrite output
            output_path
        ]
        
        # Use hardware acceleration if available
        if hardware_accel:
            ffmpeg_cmd = ffmpeg_cmd[:7] + ['-hwaccel', 'cuda', '-c:v', 'h264_nvenc'] + ffmpeg_cmd[7:]
        
        # Run FFmpeg
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"FFmpeg error: {result.stderr}")
            raise RuntimeError("FFmpeg encoding failed")
        
        print("FFmpeg encoding complete!")
        
    finally:
        # Clean up temporary file
        if os.path.exists(temp_raw):
            os.remove(temp_raw)

def main():
    parser = argparse.ArgumentParser(
        description='Apply TikTok-style filters to video',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic TikTok filter
  python apply_filter.py input.mp4 output.mp4 \\
      --brightness 0.05 --contrast 1.15 --saturation 1.2

  # Full TikTok-style enhancement
  python apply_filter.py input.mp4 output.mp4 \\
      --brightness 0.05 --contrast 1.15 --saturation 1.2 \\
      --vignette 0.45 --grain 0.08

  # Fast processing with multiprocessing
  python apply_filter.py input.mp4 output.mp4 \\
      --brightness 0.1 --multiprocessing --workers 8

  # Hardware acceleration (requires NVIDIA GPU)
  python apply_filter.py input.mp4 output.mp4 \\
      --brightness 0.1 --hardware-accel
        """
    )
    
    parser.add_argument('input', help='Input video path')
    parser.add_argument('output', help='Output video path')
    parser.add_argument('--brightness', type=float, default=0.0,
                        help='Brightness adjustment (-1 to 1, default: 0.0)')
    parser.add_argument('--contrast', type=float, default=1.0,
                        help='Contrast adjustment (0.5 to 2.0, default: 1.0)')
    parser.add_argument('--saturation', type=float, default=1.0,
                        help='Saturation adjustment (0 to 3.0, default: 1.0)')
    parser.add_argument('--vignette', type=float, default=0.0,
                        help='Vignette strength (0 to 1, default: 0.0)')
    parser.add_argument('--grain', type=float, default=0.0,
                        help='Film grain strength (0 to 1, default: 0.0)')
    parser.add_argument('--no-skin-protection', action='store_true',
                        help='Disable skin tone protection for saturation')
    parser.add_argument('--multiprocessing', action='store_true',
                        help='Use multiprocessing for large videos')
    parser.add_argument('--workers', type=int,
                        help='Number of worker processes (default: CPU count)')
    parser.add_argument('--hardware-accel', action='store_true',
                        help='Use hardware acceleration (NVIDIA GPU)')
    parser.add_argument('--use-opencv', action='store_true',
                        help='Use OpenCV VideoWriter (loses audio, not recommended)')
    
    args = parser.parse_args()
    
    # Validate inputs
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)
    
    # Create output directory if needed
    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    try:
        # Process video
        if args.use_opencv:
            process_with_opencv(
                args.input,
                args.output,
                brightness=args.brightness,
                contrast=args.contrast,
                saturation=args.saturation,
                vignette=args.vignette,
                grain=args.grain,
                skin_protection=not args.no_skin_protection
            )
        else:
            process_with_ffmpeg(
                args.input,
                args.output,
                brightness=args.brightness,
                contrast=args.contrast,
                saturation=args.saturation,
                vignette=args.vignette,
                grain=args.grain,
                skin_protection=not args.no_skin_protection,
                use_multiprocessing=args.multiprocessing,
                num_workers=args.workers,
                hardware_accel=args.hardware_accel
            )
        
        print(f"\n✅ Success! Output saved to: {args.output}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

