import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, Download, FileText, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MediaModal = ({ isOpen, onClose, mediaUrl, mediaType, fileName }) => {
    const [loading, setLoading] = useState(true);
    const [blobUrl, setBlobUrl] = useState(null);
    const [loadError, setLoadError] = useState(false);

    const isPdf = fileName?.toLowerCase().endsWith('.pdf') || mediaUrl?.toLowerCase().includes('.pdf');
    const isOfficeDoc = fileName?.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i) || mediaUrl?.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);
    const isDocument = isPdf || isOfficeDoc;

    // For PDFs: fetch as blob and create a local blob URL so it works on both mobile and desktop
    useEffect(() => {
        if (!isOpen || !mediaUrl || mediaType !== 'file') return;
        if (!isPdf) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setLoadError(false);
        setBlobUrl(null);

        fetch(mediaUrl)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.blob();
            })
            .then(blob => {
                if (cancelled) return;
                const url = URL.createObjectURL(blob);
                setBlobUrl(url);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setLoadError(true);
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, mediaUrl, mediaType, isPdf]);

    // Clean up blob URL on unmount or URL change
    useEffect(() => {
        return () => {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [blobUrl]);

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

    // Google Docs Viewer as absolute fallback for Office docs
    const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(mediaUrl)}`;

    // Force download handler
    const handleDownload = async (e) => {
        e.preventDefault();
        try {
            // If we already have the blob URL, use it directly
            if (blobUrl) {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.setAttribute('download', fileName || 'download');
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                return;
            }
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
            window.open(mediaUrl, '_blank');
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex flex-col bg-[#09090b]">
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className="flex flex-col w-full h-full overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/50 backdrop-blur-md shrink-0">
                        <div className="flex items-center gap-4 min-w-0">
                            <button 
                                onClick={onClose}
                                className="flex items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                            >
                                <ChevronLeft size={20} />
                                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Back</span>
                            </button>
                            <h2 className="text-white font-bold text-sm truncate max-w-[200px] sm:max-w-md">{fileName || 'Media'}</h2>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <a 
                                href={mediaUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                                title="Open in new tab"
                            >
                                <ExternalLink size={18} />
                            </a>
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
                            <>
                                {/* Loading overlay */}
                                {loading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
                                        <Loader2 size={40} className="text-primary animate-spin mb-4" />
                                        <p className="text-white/60 text-sm font-medium">Loading document...</p>
                                    </div>
                                )}

                                {/* PDF: render via blob URL in iframe */}
                                {isPdf && blobUrl && !loadError && (
                                    <iframe 
                                        src={blobUrl}
                                        className="w-full h-full bg-white" 
                                        title={fileName}
                                        style={{ border: 'none' }}
                                    />
                                )}

                                {/* Office docs: use Google Docs Viewer */}
                                {isOfficeDoc && !isPdf && !loadError && (
                                    <iframe 
                                        src={googleViewerUrl}
                                        className="w-full h-full bg-white" 
                                        title={fileName}
                                        onLoad={() => setLoading(false)}
                                        style={{ border: 'none' }}
                                    />
                                )}

                                {/* Error state or unsupported file */}
                                {(loadError || (!isPdf && !isOfficeDoc && !loading)) && (
                                    <div className="text-center p-8 max-w-md bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-md m-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 text-primary shadow-lg shadow-primary/5">
                                            {loadError ? <AlertCircle size={32} /> : <FileText size={32} />}
                                        </div>
                                        <h3 className="text-white font-bold text-lg mb-2">{fileName}</h3>
                                        <p className="text-xs text-white/40 mb-6 uppercase tracking-wider font-semibold">
                                            {loadError ? 'Could not load document preview' : 'Preview not available for this file type'}
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            <button 
                                                onClick={handleDownload}
                                                className="px-6 py-3 bg-primary text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10"
                                            >
                                                Download File
                                            </button>
                                            <a 
                                                href={mediaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 active:scale-95 transition-all text-center"
                                            >
                                                Open in New Tab
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
