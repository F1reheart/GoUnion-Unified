import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { ChevronLeft, Download, FileText, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MediaModal = ({ isOpen, onClose, mediaUrl, mediaType, fileName }) => {
    // Prevent background scrolling when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const isPdf = fileName?.toLowerCase().endsWith('.pdf') || mediaUrl?.toLowerCase().includes('.pdf');
    const isOfficeDoc = fileName?.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i) || mediaUrl?.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);

    // Force download handler to bypass Service Worker interception
    const handleDownload = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(mediaUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName || 'download');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            // Fallback to direct tab open if fetch fails
            window.open(mediaUrl, '_blank');
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex flex-col bg-[#09090b]">
                {/* Full Screen Main Content */}
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className="flex flex-col w-full h-full overflow-hidden"
                >
                    {/* Header Controls */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/50 backdrop-blur-md shrink-0">
                        <div className="flex items-center gap-4 min-w-0">
                            {/* Back button */}
                            <button 
                                onClick={onClose}
                                className="flex items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                            >
                                <ChevronLeft size={20} />
                                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Back</span>
                            </button>
                            {/* File Name */}
                            <h2 className="text-white font-bold text-sm truncate max-w-[200px] sm:max-w-md">{fileName || 'Media'}</h2>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {/* External Link */}
                            <a 
                                href={mediaUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                                title="Open in new tab"
                            >
                                <ExternalLink size={18} />
                            </a>
                            {/* Download button */}
                            <button 
                                onClick={handleDownload}
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                                title="Download File"
                            >
                                <Download size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
                        {mediaType === 'image' && (
                            <img 
                                src={mediaUrl} 
                                alt={fileName || 'Image preview'} 
                                className="w-full h-full object-contain animate-in fade-in duration-300"
                            />
                        )}

                        {mediaType === 'video' && (
                            <video 
                                src={mediaUrl} 
                                controls 
                                autoPlay 
                                className="w-full h-full object-contain animate-in fade-in duration-300"
                            />
                        )}

                        {mediaType === 'file' && (
                            isPdf ? (
                                <iframe 
                                    src={mediaUrl} 
                                    className="w-full h-full bg-white" 
                                    title={fileName}
                                />
                            ) : isOfficeDoc ? (
                                <iframe 
                                    src={mediaUrl}
                                    className="w-full h-full bg-white" 
                                    title={fileName}
                                />
                            ) : (
                                <div className="text-center p-8 max-w-md bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-md m-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 text-primary shadow-lg shadow-primary/5">
                                        <FileText size={32} />
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-2">{fileName}</h3>
                                    <p className="text-xs text-white/40 mb-6 uppercase tracking-wider font-semibold">Document Preview Unavailable</p>
                                    <button 
                                        onClick={handleDownload}
                                        className="px-6 py-3 bg-primary text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10"
                                    >
                                        Download File
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
