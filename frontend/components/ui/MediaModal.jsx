import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MediaModal = ({ isOpen, onClose, mediaUrl, mediaType, fileName }) => {
    // Prevent background scrolling when modal is open
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
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-10">
                {/* Backdrop overlay */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                />

                {/* Main Content Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-5xl bg-[#09090b]/80 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
                >
                    {/* Header Controls */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-md">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-primary">
                                <FileText size={18} />
                            </div>
                            <span className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-md">{fileName || 'Media Preview'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Open in new tab (bypassing service worker) */}
                            <a 
                                href={mediaUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                                title="Open in new tab"
                            >
                                <ExternalLink size={18} />
                            </a>
                            {/* Download button */}
                            <button 
                                onClick={handleDownload}
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                                title="Download File"
                            >
                                <Download size={18} />
                            </button>
                            {/* Close button */}
                            <button 
                                onClick={onClose}
                                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 hover:text-red-300 transition-all ml-2"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center bg-black/40 min-h-[300px]">
                        {mediaType === 'image' && (
                            <img 
                                src={mediaUrl} 
                                alt={fileName || 'Image preview'} 
                                className="max-h-[60vh] max-w-full object-contain rounded-2xl border border-white/5 shadow-2xl animate-in zoom-in-95 duration-200"
                            />
                        )}

                        {mediaType === 'video' && (
                            <video 
                                src={mediaUrl} 
                                controls 
                                autoPlay 
                                className="max-h-[60vh] max-w-full rounded-2xl border border-white/5 shadow-2xl"
                            />
                        )}

                        {mediaType === 'file' && (
                            isPdf ? (
                                <iframe 
                                    src={mediaUrl} 
                                    className="w-full h-[60vh] rounded-2xl border border-white/10 shadow-inner bg-white/5" 
                                    title={fileName}
                                />
                            ) : (
                                <div className="text-center p-8 max-w-md bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-md">
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
