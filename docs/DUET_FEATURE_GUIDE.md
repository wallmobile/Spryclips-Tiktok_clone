# How to Create a Duet - User Guide

## What is a Duet?
A **Duet** lets you record a video alongside another user's video. Your video plays side-by-side or top-to-bottom with the original video, creating a collaborative content experience.

## How to Create a Duet

### Step 1: Find a Video
- Browse your feed and find a video you want to duet with
- Not all videos allow duets (the creator can disable this feature)

### Step 2: Open Duet Creator
- Click the **three dots (⋮)** menu on the right side of the video
- Select **"Duet"** from the menu
- A new duet recording screen will open

### Step 3: Choose Your Layout
You have two layout options:
- **Side by Side** (default): Your video appears next to the original video
- **Top & Bottom**: Your video appears above or below the original video

### Step 4: Allow Camera & Microphone Access
- Your browser will ask for camera and microphone permissions
- Click **"Allow"** to grant access
- If you accidentally blocked it, go to browser settings and enable permissions

### Step 5: Record Your Video
1. Click the **"Start Recording"** button
2. The original video will start playing automatically
3. Your camera will activate and you can see yourself recording
4. React, lip-sync, dance, or interact with the original video
5. Click **"Stop Recording"** when done

### Step 6: Review Your Duet
- Your recorded video will play alongside the original
- If you're not happy with it, click **"Re-record"** to try again
- You can see both videos playing together in your chosen layout

### Step 7: Post Your Duet
- Click **"Create Duet"** button
- The duet will be uploaded and posted to your profile
- Your duet will appear in the feed with credit to the original creator
- Caption will automatically include "@username" of the original creator

## Tips for Great Duets
✅ **Good lighting** - Make sure your face is well-lit  
✅ **Watch timing** - Try to match the timing of the original video  
✅ **Be creative** - Add your own personality and style  
✅ **React naturally** - Genuine reactions make the best duets  
✅ **Check sound** - Make sure your microphone is working  

## Technical Requirements
- **Browser**: Chrome, Edge, Firefox, or Safari (latest versions)
- **Camera**: Built-in or external webcam
- **Microphone**: Built-in or external mic
- **Internet**: Stable connection for uploading

## Troubleshooting

### Camera Not Working?
- Check if another app is using your camera
- Make sure browser has camera permission
- Try refreshing the page and allowing permissions again

### Video Not Uploading?
- Check your internet connection
- Make sure the video file isn't too large
- Try recording a shorter video

### Can't See Duet Option?
- The creator may have disabled duets for this video
- Make sure you're logged in to your account

## Privacy & Settings
- You can disable duets on your own videos in upload settings
- Check "Allow Duet" option when posting to enable/disable this feature

---

## For Developers

### How Duet Works Technically

1. **Recording Phase**:
   - Uses `MediaRecorder API` to capture user's camera and audio
   - Original video plays in sync while user records
   - Records to WebM format with VP8 video codec

2. **Upload Phase**:
   - Recorded video is sent to backend via `/api/upload` endpoint
   - Metadata includes original video ID and layout preference
   - Video type is marked as "duet"

3. **Backend Processing** (to be implemented):
   - Server receives the user's recorded video
   - Fetches the original video
   - Uses FFmpeg to merge videos side-by-side or top-to-bottom
   - Generates final duet video file
   - Saves with reference to original video

4. **Display Phase**:
   - Duet appears in feed like regular videos
   - Shows original creator attribution
   - Counts as engagement for original video

### Files Modified
- `frontend/src/components/video/DuetComponent.js` - Main duet recording UI
- `frontend/src/components/video/DuetComponent.css` - Styling
- `frontend/src/components/video/ForYouFeed.tsx` - Duet trigger handler
- `frontend/src/components/common/ActionBar.tsx` - Duet menu option

### Backend TODO
To fully implement duet merging on the backend, add:
```javascript
// backend/utils/videoMerger.js
const ffmpeg = require('fluent-ffmpeg');

async function mergeDuetVideos(userVideoPath, originalVideoPath, layout = 'side-by-side') {
  return new Promise((resolve, reject) => {
    const outputPath = `uploads/duet-${Date.now()}.mp4`;
    
    const filterComplex = layout === 'side-by-side' 
      ? '[0:v]scale=640:1138[left];[1:v]scale=640:1138[right];[left][right]hstack'
      : '[0:v]scale=1280:569[top];[1:v]scale=1280:569[bottom];[top][bottom]vstack';
    
    ffmpeg()
      .input(userVideoPath)
      .input(originalVideoPath)
      .complexFilter(filterComplex)
      .audioCodec('aac')
      .videoCodec('libx264')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}
```
