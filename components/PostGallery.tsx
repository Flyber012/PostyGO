
import React, { useMemo, useRef, useEffect } from 'react';
import { Post, BackgroundElement } from '../types';
import { Plus, Trash2, Files } from 'lucide-react';

interface TimelineGalleryProps {
    posts: Post[];
    selectedPostId: string | null;
    onSelectPost: (id: string) => void;
    onAddPost: () => void;
    onDeletePost: (options: { postId?: string, carouselId?: string }) => void;
}

const TimelineGallery: React.FC<TimelineGalleryProps> = ({ posts, selectedPostId, onSelectPost, onAddPost, onDeletePost }) => {
    
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

    const galleryItems = useMemo(() => {
        const carousels = new Map<string, Post[]>();
        const singlePosts: Post[] = [];

        posts.forEach(post => {
            if (post.carouselId) {
                if (!carousels.has(post.carouselId)) carousels.set(post.carouselId, []);
                carousels.get(post.carouselId)!.push(post);
            } else {
                singlePosts.push(post);
            }
        });
        
        carousels.forEach(slides => slides.sort((a, b) => (a.slideIndex || 0) - (b.slideIndex || 0)));
        return [...singlePosts.map(p => [p]), ...Array.from(carousels.values())];
    }, [posts]);

    return (
        <div className="w-full h-full bg-zinc-900/80 backdrop-blur-sm p-2 flex items-center space-x-3">
            <button onClick={onAddPost} className="h-24 w-16 flex-shrink-0 flex flex-col items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-400 transition-colors">
                <Plus className="w-6 h-6" />
                <span className="text-xs mt-1">Novo</span>
            </button>
            <div className="flex-1 h-full overflow-x-auto overflow-y-hidden flex items-center space-x-3 pr-4">
                {galleryItems.map((item, index) => {
                    const isCarousel = item.length > 1;
                    const displayPost = item[0];
                    if (!displayPost) return null;
                    
                    const isSelected = item.some(p => p.id === selectedPostId);
                    const background = displayPost.elements.find(el => el.type === 'background') as BackgroundElement | undefined;
                    
                    return (
                        <div
                            key={displayPost.carouselId || displayPost.id}
                            ref={isSelected ? selectedItemRef : null}
                            onClick={() => onSelectPost(displayPost.id)}
                            className={`relative group cursor-pointer rounded-md overflow-hidden transition-all duration-200 flex-shrink-0 h-24 w-24 transform hover:scale-105 ${
                                isSelected ? 'ring-2 ring-pink-500' : 'ring-2 ring-transparent hover:ring-pink-400/50'
                            }`}
                        >
                            {background ? (
                                <img src={background.src} alt="thumbnail" className="w-full h-full object-cover"/>
                            ) : (
                                <div className="w-full h-full bg-zinc-700" />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5 backdrop-blur-sm flex items-center justify-center">
                                {isCarousel ? `Carrossel (${item.length})` : `Post ${index + 1}`}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeletePost(isCarousel ? { carouselId: displayPost.carouselId } : { postId: displayPost.id });
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-600/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                aria-label={isCarousel ? "Remover carrossel" : "Remover post"}
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
