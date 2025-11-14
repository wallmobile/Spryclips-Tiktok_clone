import React from 'react';
import ForYouFeed from './ForYouFeed';

// Example usage of ForYouFeed component
const ForYouFeedExample: React.FC = () => {
  // Sample video items
  const sampleVideos = [
    {
      id: '1',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
    },
    {
      id: '2',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
    },
    {
      id: '3',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
    },
  ];

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ForYouFeed items={sampleVideos} />
    </div>
  );
};

export default ForYouFeedExample;















