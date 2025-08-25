

import React, { useMemo, useRef, useEffect } from 'react';
import { Post, PostSize } from '../types';
import { Plus, Trash2 } from 'lucide-react';
import ThumbnailPost from './ThumbnailPost';

interface TimelineGalleryProps {
    posts: Post[];
    selectedPostId: string | null;
    onSelectPost: (id: string) => void;
    onAddPost: () => void;
    onDeletePost: (options: { postId?: string, carouselId?: string }) => void;
    postSize: PostSize;
}

const TimelineGallery: React.FC<TimelineGalleryProps> = ({ posts, selectedPostId, onSelectPost, onAddPost, onDeletePost, postSize }) => {
    
    const selectedItemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedItemRef.current) {
            selectedItemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [selectedPostId]);

    // This logic flattens carousels into individual slides for the gallery
    const galleryItems = useMemo(() => {
        const flattened: (Post & { carouselTotal?: number })[] = [];
        const carousels = new Map<string, Post[]>();

        // Group posts by carouselId
        posts.forEach(post => {
            if (post.carouselId) {
                if (!carousels.has(post.carouselId)) {
                    carousels.set(post.carouselId, []);
                }
                carousels.get(post.carouselId)!.push(post);
            } else {
                flattened.push(post); // Add single posts directly
            }
        });

        // Sort slides within each carousel and add them to the flattened list
        carousels.forEach((slides) => {
            const sortedSlides = slides.sort((a, b) => (a.slideIndex || 0) - (b.slideIndex || 0));
            const total = sortedSlides.length;
            sortedSlides.forEach(slide => {
                flattened.push({ ...slide, carouselTotal: total });
            });
        });
        
        return flattened;
    }, [posts]);

    return (
        <div className="w-full h-full bg-zinc-900/80 backdrop-blur-sm p-2 flex items-center space-x-3">
            <button onClick={onAddPost} className="h-20 w-16 flex-shrink-0 flex flex-col items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-400 transition-colors">
                <Plus className="w-6 h-6" />
                <span className="text-xs mt-1">Novo</span>
            </button>
            <div className="flex-1 h-full overflow-x-auto overflow-y-hidden flex items-center space-x-3 pr-4">
                {galleryItems.map((post, index) => {
                    const isSelected = post.id === selectedPostId;
                    const isCarouselSlide = !!post.carouselId;

                    return (
                        <div
                            key={post.id}
                            ref={isSelected ? selectedItemRef : null}
                            onClick={() => onSelectPost(post.id)}
                            className={`relative group cursor-pointer rounded-md overflow-hidden transition-all duration-200 flex-shrink-0 h-20 w-20 transform hover:scale-105 ${
                                isSelected ? 'ring-2 ring-pink-500' : 'ring-2 ring-transparent hover:ring-pink-400/50'
                            }`}
                        >
                            <ThumbnailPost post={post} postSize={postSize} />
                            
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5 backdrop-blur-sm flex items-center justify-center">
                                {isCarouselSlide 
                                    ? `Slide ${(post.slideIndex || 0) + 1}/${post.carouselTotal}` 
                                    : `Post ${index + 1}`
                                }
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // If it's a carousel slide and has siblings, just delete the slide.
                                    // Otherwise, offer to delete the whole carousel (or the last slide).
                                    // For simplicity here, we always delete just the single slide.
                                    // A confirm modal could ask to delete the whole carousel.
                                    onDeletePost({ postId: post.id });
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-600/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                aria-label="Remover post"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TimelineGallery;