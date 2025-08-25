import React from 'react';
import { Post, PostSize, BackgroundElement, ForegroundElement } from '../types';

interface ThumbnailPostProps {
  post: Post;
  postSize: PostSize;
}

const ThumbnailPost: React.FC<ThumbnailPostProps> = ({ post, postSize }) => {
  const backgroundElement = post.elements.find(el => el.type === 'background') as BackgroundElement | undefined;
  const foregroundElements = post.elements.filter((el): el is ForegroundElement => el.type !== 'background');

  const aspectRatio = postSize.width / postSize.height;

  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{
        backgroundColor: backgroundElement?.backgroundColor || '#18181b', // Fallback color
      }}
    >
      {backgroundElement?.src && (
        <img src={backgroundElement.src} alt="thumbnail" className="w-full h-full object-cover"/>
      )}
      
      {/* Ghost elements for layout preview */}
      <div className="absolute inset-0 w-full h-full">
        {foregroundElements.map(element => (
          <div
            key={`thumb-${element.id}`}
            className="absolute bg-white/20 rounded-sm"
            style={{
              left: `${(element.x / postSize.width) * 100}%`,
              top: `${(element.y / postSize.height) * 100}%`,
              width: `${(element.width / postSize.width) * 100}%`,
              height: `${(element.height / postSize.height) * 100}%`,
              transform: `rotate(${element.rotation || 0}deg)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ThumbnailPost;