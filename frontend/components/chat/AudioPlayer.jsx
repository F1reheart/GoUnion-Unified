import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

export const AudioPlayer = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            audio.currentTime = 0;
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration) return;
        
        const bounds = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const width = bounds.width;
        const percentage = x / width;
        
        audio.currentTime = percentage * audio.duration;
        setProgress(percentage * 100);
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3 bg-[#111114] border border-[#ffeb3b]/20 rounded-full px-3 py-2 min-w-[200px] shadow-sm">
            <audio ref={audioRef} src={src} preload="metadata" />
            
            <button 
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-[#ffeb3b] text-black flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
            >
                {isPlaying ? <Pause size={16} className="fill-black" /> : <Play size={16} className="ml-1 fill-black" />}
            </button>
            
            <div className="flex-1 flex flex-col justify-center gap-1">
                <div 
                    className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden cursor-pointer relative"
                    onClick={handleSeek}
                >
                    <div 
                        className="absolute top-0 left-0 h-full bg-[#ffeb3b] rounded-full transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-white/50 font-medium">
                    <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};
