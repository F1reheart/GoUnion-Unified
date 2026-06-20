import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCcw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CameraModal = ({ onCapture, onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');

    const startCamera = useCallback(async () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode } 
            });
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error('Camera access denied or unavailable', err);
        }
    }, [facingMode]);

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [startCamera]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setCapturedImage(file);
                }
            }, 'image/jpeg', 0.9);
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
    };

    const handleConfirm = () => {
        if (capturedImage) {
            onCapture(capturedImage);
            onClose();
        }
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] bg-black flex flex-col">
                <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 w-full z-10">
                    <button onClick={onClose} className="p-2 text-white/70 hover:text-white bg-black/50 rounded-full">
                        <X size={24} />
                    </button>
                    {!capturedImage && (
                        <button onClick={toggleCamera} className="p-2 text-white/70 hover:text-white bg-black/50 rounded-full">
                            <RefreshCcw size={24} />
                        </button>
                    )}
                </div>

                <div className="flex-1 flex items-center justify-center bg-black relative">
                    {!capturedImage ? (
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <img 
                            src={URL.createObjectURL(capturedImage)} 
                            alt="Captured" 
                            className="w-full h-full object-contain"
                        />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="h-32 bg-black flex items-center justify-center gap-8 pb-8">
                    {!capturedImage ? (
                        <button 
                            onClick={handleCapture}
                            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center relative active:scale-95 transition-transform"
                        >
                            <div className="w-12 h-12 bg-white rounded-full" />
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={handleRetake}
                                className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
                            >
                                Retake
                            </button>
                            <button 
                                onClick={handleConfirm}
                                className="px-6 py-3 rounded-xl bg-primary text-black font-bold flex items-center gap-2 hover:brightness-110 transition-all"
                            >
                                <Check size={20} /> Use Photo
                            </button>
                        </>
                    )}
                </div>
            </div>
        </AnimatePresence>
    );
};
