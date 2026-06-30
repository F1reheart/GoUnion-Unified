import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { PostCard } from "../feed/PostCard";
import { X, Loader } from "lucide-react";

export const AdminPostModal = ({ postId, onClose }) => {
    const { data: post, isLoading, isError } = useQuery({
        queryKey: ["post", postId],
        queryFn: () => api.posts.getById(postId || ""),
        enabled: Boolean(postId),
    });

    return (
        <AnimatePresence>
            {postId && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                        onClick={onClose} 
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                        className="relative w-full max-w-2xl bg-[#0a0a0c] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                            <h3 className="font-bold text-white text-sm uppercase tracking-widest">Reported Content Context</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-[#0a0a0c]">
                            {isLoading ? (
                                <div className="p-20 flex flex-col items-center justify-center text-white/40 gap-4">
                                    <Loader className="animate-spin" size={32} />
                                    <p className="text-sm font-bold uppercase tracking-widest">Loading Post...</p>
                                </div>
                            ) : isError || !post ? (
                                <div className="p-20 text-center">
                                    <p className="text-red-400 font-bold uppercase tracking-widest text-sm mb-2">Unavailable</p>
                                    <p className="text-white/40 text-xs">This post may have been deleted or is no longer accessible.</p>
                                </div>
                            ) : (
                                <div className="pb-10">
                                    <PostCard post={post} defaultShowComments={true} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
