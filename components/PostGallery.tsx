
import React, { useMemo } from 'react';
import { Post, BackgroundElement } from '../types';
import { Plus, Trash2, Files } from 'lucide-react';

interface PostGalleryProps {
    posts: Post[];
    selectedPostId: string | null;
    onSelectPost: (id: string) => void;
    onAddPost: () => void;
    onDeletePost: (options: { postId?: string, carouselId?: string }) => void;
}

const PostGallery: React.FC<PostGalleryProps> = ({ posts, selectedPostId, onSelectPost, onAddPost, onDeletePost }) => {
    
    const galleryItems = useMemo(() => {
        const carousels = new Map<string, Post[]>();
        const singlePosts: Post[] = [];

        posts.forEach(post => {
            if (post.carouselId) {
                if (!carousels.has(post.carouselId)) {
                    carousels.set(post.carouselId, []);
                }
                carousels.get(post.carouselId)!.push(post);
            } else {
                singlePosts.push(post);
            }
        });
        
        carousels.forEach(slides => slides.sort((a, b) => (a.slideIndex || 0) - (b.slideIndex || 0)));
        
        return [...Array.from(carousels.values()), ...singlePosts.map(p => [p])];
    }, [posts]);

    return (
        <div className="p-4 flex-shrink-0" style={{ height: '50%', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-200">Conteúdo</h2>
                <button onClick={onAddPost} className="p-1 hover:bg-zinc-700 rounded transition-colors" aria-label="Adicionar novo post">
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            <div className="space-y-3">
                {galleryItems.map((item, index) => {
                    const isCarousel = item.length > 1;
                    const displayPost = item[0];
                    if (!displayPost) return null;
                    
                    const isSelected = item.some(p => p.id === selectedPostId);
                    const background = displayPost.elements.find(el => el.type === 'background') as BackgroundElement | undefined;
                    const title = isCarousel ? `Carrossel ${index + 1}` : `Post ${index + 1}`;

                    return (
                        <div
                            key={displayPost.carouselId || displayPost.id}
                            onClick={() => onSelectPost(displayPost.id)}
                            className={`relative group cursor-pointer rounded-md overflow-hidden transition-all duration-300 transform hover:scale-105 ${
                                isSelected
                                    ? 'ring-4 ring-pink-500'
                                    : 'ring-2 ring-transparent hover:ring-pink-400/70'
                            }`}
                        >
                            {background ? (
                                <img
                                    src={background.src}
                                    alt={`${title} thumbnail`}
                                    className="w-full h-auto object-cover aspect-square"
                                />
                            ) : (
                                <div className="w-full h-24 bg-zinc-700" />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/80 text-white text-xs text-center py-1 backdrop-blur-sm flex items-center justify-center">
                                {isCarousel && <Files className="w-3 h-3 mr-1.5" />}
                                {title}
                                {isCarousel && <span className="ml-1.5 bg-purple-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.length}</span>}
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

export default PostGallery;