import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Volume2, VolumeX, Plus, Share2, X, Music2, Play, Compass } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CommentSection } from "../components/feed/CommentSection";
import { CreateReel } from "../components/feed/CreateReel";
import { api } from "../services/api";
import { useAuthStore } from "../store";

const isVideoUrl = (url) => {
    if (!url) return false;
    return /\.(mp4|webm|mov|m4v|avi|mkv|m3u8)(\?|$)/i.test(url);
};

const getCleanCaption = (content) => {
    return content.replace(/(?:🎵 )?Sound:.*$/m, '').replace(/\[Overlay Text:.*\]/m, '').replace(/\[Sticker:.*\]/m, '').replace(/\[Mix:.*\]/m, '').trim();
};

const getOverlayText = (content) => {
    const match = content.match(/\[Overlay Text: (.*?)\]/);
    return match ? match[1] : null;
};

const getSoundName = (post) => {
    const content = post.content || "";
    const soundMatch = content.match(/(?:🎵 )?Sound: (.*)$/m);
    if (soundMatch) return soundMatch[1].trim();
    if (post.isReel || post.mediaType === "video" || isVideoUrl(post.imageUrl)) {
        return `Original sound - @${post.author.username}`;
    }
    return null;
};

export const Goto = () => {
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuthStore();
    const [isMuted, setIsMuted] = useState(false);
    const [activeCommentPost, setActiveCommentPost] = useState(null);
    const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
    const [loadedMedia, setLoadedMedia] = useState({});
    const [pausedVideos, setPausedVideos] = useState({});
    const [videoProgress, setVideoProgress] = useState({});
    const [gotoSeed, setGotoSeed] = useState(() => Math.random());
    const [showIntro, setShowIntro] = useState(true);

    const loadMoreRef = useRef(null);
    const videoRefs = useRef({});

    useEffect(() => {
        // Hide intro after 2 seconds
        const timer = setTimeout(() => setShowIntro(false), 2200);
        return () => clearTimeout(timer);
    }, []);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
        queryKey: ["goto-reels", gotoSeed],
        queryFn: ({ pageParam }) => api.posts.getReels({ pageParam, seed: gotoSeed }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => lastPage.length > 0 ? allPages.length : undefined,
        staleTime: 60000,
    });

    const likeMutation = useMutation({
        mutationFn: (postId) => api.posts.like(postId),
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ["goto-reels"] });
            const previousReels = queryClient.getQueriesData({ queryKey: ["goto-reels"] });
            queryClient.setQueryData(["goto-reels", gotoSeed], (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) =>
                        page.map((post) => {
                            if (post.id === postId) {
                                const isLiked = !post.isLiked;
                                return {
                                    ...post,
                                    isLiked,
                                    likes: isLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
                                };
                            }
                            return post;
                        })
                    ),
                };
            });
            return { previousReels };
        },
        onError: (err, newTodo, context) => {
            if (context?.previousReels) {
                context.previousReels.forEach(([key, data]) => {
                    queryClient.setQueryData(key, data);
                });
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["goto-reels"] });
        },
    });

    useEffect(() => {
        const handleExternalRefresh = () => {
            setGotoSeed(Math.random());
            queryClient.invalidateQueries({ queryKey: ["goto-reels"] });
            window.scrollTo({ top: 0, behavior: "smooth" });
        };
        window.addEventListener("gounion-refresh-goto", handleExternalRefresh);
        return () => window.removeEventListener("gounion-refresh-goto", handleExternalRefresh);
    }, [queryClient]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1, rootMargin: "100px" }
        );
        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        const elements = Object.values(videoRefs.current).filter((el) => Boolean(el));
        if (!elements.length) return;
        const playObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const video = entry.target;
                    if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
                        void video.play().catch(() => {});
                    } else {
                        video.pause();
                        video.currentTime = 0;
                    }
                });
            },
            { threshold: [0.2, 0.6, 0.9] }
        );
        elements.forEach((video) => playObserver.observe(video));
        return () => playObserver.disconnect();
    }, [data]);

    const handleShare = async (reel) => {
        const text = reel.content ? getCleanCaption(reel.content) : "Check out this reel!";
        const url = `${window.location.origin}/post/${reel.id}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Reconnected Konnect",
                    text,
                    url,
                });
            } else {
                await navigator.clipboard.writeText(`${text}\n${url}`);
                alert("Reel link copied to clipboard!");
            }
        } catch (err) {
            console.error("Error sharing:", err);
        }
    };

    const reels = Array.from(
        new Map((data?.pages.flat() || []).map((post) => [post.id, post])).values()
    ).filter((post) => post.isReel || post.mediaType === "video" || isVideoUrl(post.imageUrl));

    if (status === "pending") {
        return (
            <div className="fixed inset-0 md:pl-64 lg:pr-80 bg-black overflow-hidden z-0 flex items-center justify-center">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center font-serif font-black text-5xl text-white/20 shadow-[0_0_50px_rgba(255,255,255,0.05)] border border-white/10"
                >
                    R
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 md:pl-64 lg:pr-80 bg-black overflow-hidden z-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"
        >
            <AnimatePresence>
                {showIntro && (
                    <motion.div 
                        initial={{ opacity: 1, backdropFilter: "blur(20px)" }}
                        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black"
                    >
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0, scale: 0.9 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="flex flex-col items-center gap-6"
                        >
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
                                <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                                    <Compass size={40} className="text-white" />
                                </div>
                            </div>
                            <h1 className="text-4xl font-serif font-black text-white tracking-tight">Konnect</h1>
                            <p className="text-white/50 text-sm font-medium tracking-widest uppercase">Cross-Campus Discovery</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar">
                {reels.length === 0 ? (
                    <div className="h-[100dvh] flex flex-col items-center justify-center text-center p-8 relative z-10">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black -z-10" />
                        <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Explore the Universe</h3>
                        <p className="text-white/50 max-w-sm mb-10 text-sm leading-relaxed">
                            Discover moments from students across different universities. Be the first to share your world!
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsCreateReelOpen(true)}
                            className="px-10 py-4 bg-white text-black rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                        >
                            Create Reel
                        </button>
                    </div>
                ) : (
                    reels.map((reel) => {
                        const cleanCaption = getCleanCaption(reel.content || "");
                        const overlayText = getOverlayText(reel.content || "");
                        const soundName = getSoundName(reel);

                        return (
                            <section
                                key={reel.id}
                                className="snap-start snap-always h-full w-full relative bg-black flex flex-col overflow-hidden"
                            >
                                <div className="flex-1 relative flex items-center justify-center min-h-0 bg-black">
                                    {!loadedMedia[reel.id] && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center font-serif font-black text-3xl text-white/20 animate-pulse border border-white/10">
                                                R
                                            </div>
                                        </div>
                                    )}

                                    <video
                                        ref={(el) => {
                                            videoRefs.current[reel.id] = el;
                                        }}
                                        src={reel.imageUrl}
                                        onPlaying={() => {
                                            setLoadedMedia((prev) => ({ ...prev, [reel.id]: true }));
                                            setPausedVideos((prev) => ({ ...prev, [reel.id]: false }));
                                        }}
                                        onPause={() => setPausedVideos((prev) => ({ ...prev, [reel.id]: true }))}
                                        onTimeUpdate={(e) => {
                                            const v = e.currentTarget;
                                            setVideoProgress((prev) => ({
                                                ...prev,
                                                [reel.id]: { current: v.currentTime, duration: v.duration || 0 },
                                            }));
                                        }}
                                        className={`relative z-10 h-full w-full object-cover sm:object-contain bg-transparent transition-transform duration-500 ease-out ${
                                            activeCommentPost?.id === reel.id
                                                ? "scale-[0.52] -translate-y-[10vh] md:scale-[0.68] rounded-3xl"
                                                : ""
                                        }`}
                                        loop
                                        muted={isMuted}
                                        playsInline
                                        preload="auto"
                                        onClick={(e) => {
                                            const video = e.currentTarget;
                                            if (video.paused) void video.play();
                                            else video.pause();
                                        }}
                                    />

                                    {pausedVideos[reel.id] && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer"
                                            onClick={() => {
                                                const v = videoRefs.current[reel.id];
                                                if (v) void v.play();
                                            }}
                                        >
                                            <div className="w-24 h-24 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl">
                                                <Play size={40} className="text-white fill-white ml-2" />
                                            </div>
                                        </motion.div>
                                    )}

                                    <div
                                        className="absolute bottom-0 left-0 right-0 z-20 px-2 pt-6 pb-2 cursor-pointer"
                                        style={{ touchAction: "none" }}
                                        onClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => {
                                            e.currentTarget.setPointerCapture(e.pointerId);
                                            const v = videoRefs.current[reel.id];
                                            if (!v) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                                            v.currentTime = ratio * v.duration;
                                        }}
                                        onPointerMove={(e) => {
                                            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                                            const v = videoRefs.current[reel.id];
                                            if (!v) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                                            v.currentTime = ratio * v.duration;
                                        }}
                                        onPointerUp={(e) => {
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                        }}
                                    >
                                        <div className="relative h-[3px] rounded-full pointer-events-none bg-white/20 overflow-hidden">
                                            <div
                                                className="absolute inset-y-0 left-0 bg-white"
                                                style={{
                                                    width: `${videoProgress[reel.id] ? (videoProgress[reel.id].current / videoProgress[reel.id].duration) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {overlayText && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none z-20">
                                            <p
                                                className="text-white font-black text-3xl text-center break-words w-full px-8"
                                                style={{
                                                    textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 4px 20px rgba(0,0,0,0.8)",
                                                }}
                                            >
                                                {overlayText}
                                            </p>
                                        </div>
                                    )}

                                    <div className="absolute top-6 right-4 z-20 flex flex-col gap-4">
                                        <button
                                            onClick={() => setIsMuted((prev) => !prev)}
                                            className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/50 hover:scale-110 transition-all active:scale-95"
                                        >
                                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                        </button>
                                        <button
                                            onClick={() => setIsCreateReelOpen(true)}
                                            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-110 transition-all active:scale-95"
                                        >
                                            <Plus size={24} className="stroke-[3]" />
                                        </button>
                                    </div>
                                </div>

                                <div className="absolute right-3 md:right-4 bottom-[120px] z-30 flex flex-col items-center gap-6">
                                    <div className="flex flex-col items-center gap-1">
                                        <Link
                                            to={`/profile/${reel.author.username}`}
                                            className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-white overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-transform hover:scale-110 active:scale-95 mb-1"
                                        >
                                            <img
                                                src={reel.author.avatarUrl || `https://ui-avatars.com/api/?name=${reel.author.fullName}`}
                                                alt={reel.author.username}
                                                className="w-full h-full object-cover"
                                            />
                                        </Link>
                                    </div>

                                    <button
                                        onClick={() => likeMutation.mutate(reel.id)}
                                        className="flex flex-col items-center gap-1.5 group"
                                    >
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all group-active:scale-90">
                                            <Heart
                                                className={`w-6 h-6 md:w-7 md:h-7 transition-colors ${
                                                    reel.isLiked ? "fill-red-500 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "text-white"
                                                }`}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-white drop-shadow-md">{reel.likes}</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveCommentPost(reel)}
                                        className="flex flex-col items-center gap-1.5 group"
                                    >
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all group-active:scale-90">
                                            <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-white drop-shadow-md">{reel.comments}</span>
                                    </button>

                                    <button
                                        onClick={() => handleShare(reel)}
                                        className="flex flex-col items-center gap-1.5 group"
                                    >
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all group-active:scale-90">
                                            <Share2 className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-white drop-shadow-md">Share</span>
                                    </button>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-32 px-4 pb-6 z-20 pointer-events-none">
                                    <div className="max-w-[80%] pointer-events-auto flex flex-col items-start">
                                        <Link
                                            to={`/profile/${reel.author.username}`}
                                            className="inline-flex items-center gap-2 mb-2 group"
                                        >
                                            <span className="font-bold text-white text-lg tracking-tight group-hover:underline drop-shadow-md">
                                                @{reel.author.username}
                                            </span>
                                            {!reel.author.isFollowing && String(currentUser?.id) !== String(reel.author.id) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        api.profiles.follow(reel.author.id);
                                                        queryClient.setQueryData(["goto-reels", gotoSeed], (old) => {
                                                            if (!old?.pages) return old;
                                                            return {
                                                                ...old,
                                                                pages: old.pages.map((page) =>
                                                                    page.map((p) => {
                                                                        if (p.author.id === reel.author.id) {
                                                                            return {
                                                                                ...p,
                                                                                author: {
                                                                                    ...p.author,
                                                                                    isFollowing: true,
                                                                                },
                                                                            };
                                                                        }
                                                                        return p;
                                                                    })
                                                                ),
                                                            };
                                                        });
                                                    }}
                                                    className="px-3 py-1 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                                                >
                                                    Follow
                                                </button>
                                            )}
                                        </Link>

                                        {cleanCaption && (
                                            <p className="text-white/90 text-sm leading-relaxed mb-4 font-medium line-clamp-3 whitespace-pre-wrap drop-shadow-md">
                                                {cleanCaption}
                                            </p>
                                        )}

                                        {soundName && (
                                            <Link
                                                to={`/sound/${encodeURIComponent(soundName)}`}
                                                className="inline-flex items-center gap-2 text-white bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors shadow-lg"
                                            >
                                                <Music2 size={14} className="text-white" />
                                                <motion.div
                                                    animate={{ x: [0, -20, 0] }}
                                                    transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                                                    className="text-xs font-bold overflow-hidden max-w-[180px] whitespace-nowrap"
                                                >
                                                    {soundName}
                                                </motion.div>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </section>
                        );
                    })
                )}
                <div ref={loadMoreRef} className="h-20 bg-black" />
            </div>

            <AnimatePresence>
                {activeCommentPost && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveCommentPost(null)}
                            className="fixed inset-x-0 bottom-0 h-[75dvh] md:left-64 lg:right-80 bg-black/60 backdrop-blur-sm z-[150]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 md:left-64 lg:right-80 bg-zinc-950 rounded-t-[32px] z-[160] border-t border-white/10 p-4 sm:p-6 h-[75dvh] flex flex-col shadow-[0_-30px_80px_rgba(0,0,0,0.8)]"
                        >
                            <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-white/20" />
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight">Comments</h3>
                                    <p className="text-sm text-white/50 mt-1">@{activeCommentPost.author.username}</p>
                                </div>
                                <button
                                    onClick={() => setActiveCommentPost(null)}
                                    className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all hover:scale-110 active:scale-95"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <CommentSection postId={activeCommentPost.id} authorUsername={activeCommentPost.author.username} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <CreateReel isOpen={isCreateReelOpen} onClose={() => setIsCreateReelOpen(false)} />

            <style dangerouslySetInnerHTML={{
                __html: `
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
                `
            }} />
        </motion.div>
    );
};
