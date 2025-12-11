/**
 * Camera Access Test Utility
 * Use this in browser console to test camera access
 * 
 * Usage: In browser console, type:
 *   window.testCamera()
 */

export const testCameraAccess = async () => {
  console.group('📷 Camera Access Test');
  
  // 1. Check browser support
  console.log('1️⃣ Checking browser support...');
  if (!navigator.mediaDevices) {
    console.error('❌ navigator.mediaDevices is not available');
    console.log('This browser does not support the MediaDevices API');
    console.groupEnd();
    return false;
  }
  console.log('✅ navigator.mediaDevices is available');
  
  if (!navigator.mediaDevices.getUserMedia) {
    console.error('❌ getUserMedia is not available');
    console.groupEnd();
    return false;
  }
  console.log('✅ getUserMedia is available');
  
  // 2. Check protocol
  console.log('\n2️⃣ Checking protocol...');
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  console.log(`Protocol: ${protocol}`);
  console.log(`Hostname: ${hostname}`);
  
  if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    console.warn('⚠️ Camera access requires HTTPS (or localhost)');
    console.log('Current URL might not support camera access');
  } else {
    console.log('✅ Protocol/Hostname is OK for camera access');
  }
  
  // 3. Check permissions
  console.log('\n3️⃣ Checking permissions...');
  if (navigator.permissions) {
    try {
      const cameraPermission = await navigator.permissions.query({ name: 'camera' });
      console.log(`Camera permission state: ${cameraPermission.state}`);
      console.log(`Camera permission status: ${cameraPermission.status}`);
      
      if (cameraPermission.state === 'denied') {
        console.error('❌ Camera permission is denied');
        console.log('Please allow camera access in browser settings');
        console.groupEnd();
        return false;
      } else if (cameraPermission.state === 'prompt') {
        console.log('ℹ️ Camera permission will be requested');
      } else if (cameraPermission.state === 'granted') {
        console.log('✅ Camera permission is granted');
      }
    } catch (permError) {
      console.warn('⚠️ Could not check permissions:', permError);
    }
  } else {
    console.warn('⚠️ Permissions API not available');
  }
  
  // 4. List available devices
  console.log('\n4️⃣ Listing available cameras...');
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log(`Found ${videoDevices.length} camera(s):`);
    
    if (videoDevices.length === 0) {
      console.error('❌ No cameras found');
      console.groupEnd();
      return false;
    }
    
    videoDevices.forEach((device, index) => {
      console.log(`  Camera ${index + 1}: ${device.label || 'Unnamed'} (${device.deviceId.substring(0, 20)}...)`);
    });
    console.log('✅ Cameras found');
  } catch (enumError) {
    console.error('❌ Error enumerating devices:', enumError);
  }
  
  // 5. Try to access camera
  console.log('\n5️⃣ Testing camera access...');
  let stream = null;
  try {
    console.log('Requesting camera access...');
    stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    
    console.log('✅ Camera access granted!');
    console.log('Stream tracks:', stream.getTracks().map(track => ({
      kind: track.kind,
      label: track.label,
      enabled: track.enabled,
      readyState: track.readyState
    })));
    
    // Stop the stream
    stream.getTracks().forEach(track => track.stop());
    console.log('✅ Camera test successful!');
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('❌ Camera access failed:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'NotAllowedError') {
      console.error('\n❌ PERMISSION DENIED');
      console.log('Solution: Allow camera permission in browser settings');
      console.log('  Chrome: Click the lock icon in address bar > Site Settings > Camera > Allow');
      console.log('  Firefox: Click the lock icon > Permissions > Camera > Allow');
      console.log('  Edge: Click the lock icon > Permissions > Camera > Allow');
    } else if (error.name === 'NotFoundError') {
      console.error('\n❌ NO CAMERA FOUND');
      console.log('Solution: Connect a camera or enable built-in camera');
    } else if (error.name === 'NotReadableError') {
      console.error('\n❌ CAMERA IN USE');
      console.log('Solution: Close other apps using the camera');
    } else if (error.name === 'SecurityError') {
      console.error('\n❌ SECURITY ERROR');
      console.log('Solution: Use HTTPS or localhost');
    }
    
    console.groupEnd();
    return false;
  }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  window.testCamera = testCameraAccess;
  window.testCameraAccess = testCameraAccess;
}

