import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { Avatar } from '../ui/Avatar';

export const AudioPlayer = ({ src, mine, senderAvatar, senderName }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
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
                audioRef.current.playbackRate = playbackRate;
            }
            setIsPlaying(!isPlaying);
        }
    };

    const togglePlaybackRate = () => {
        let nextRate = 1;
        if (playbackRate === 1) nextRate = 1.5;
        else if (playbackRate === 1.5) nextRate = 2;
        else nextRate = 1;

        setPlaybackRate(nextRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration) return;
        
        const bounds = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const width = bounds.width;
        const percentage = Math.max(0, Math.min(1, x / width));
        
        audio.currentTime = percentage * audio.duration;
        setProgress(percentage * 100);
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Static height sequence for waveform simulation
    const waveformBars = [10, 16, 12, 6, 18, 14, 10, 14, 8, 16, 12, 18, 6, 12, 10, 14, 8, 12];

    return (
        <div className={`flex items-center gap-3 rounded-2xl p-3 min-w-[280px] max-w-[320px] shadow-sm select-none ${mine ? 'bg-black/5 border border-black/10 text-black' : 'bg-[#151518] border border-white/10 text-white'}`}>
            <audio ref={audioRef} src={src} preload="metadata" />
            
            {/* Left: Avatar with mini badge */}
            <div className="relative shrink-0">
                <Avatar 
                    src={senderAvatar} 
                    label={senderName || "User"} 
                    className="w-10 h-10 rounded-full border border-white/10 object-cover" 
                />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 ${mine ? 'border-primary bg-black' : 'border-[#151518] bg-primary'}`}>
                    <Mic size={10} className={mine ? "text-primary" : "text-black"} />
                </div>
            </div>

            {/* Center / Right Content */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                    {/* Play / Pause */}
                    <button 
                        onClick={togglePlay}
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-all ${mine ? 'bg-black text-primary' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                        {isPlaying ? <Pause size={14} className={mine ? "fill-primary text-primary" : "fill-white text-white"} /> : <Play size={14} className={`ml-0.5 ${mine ? "fill-primary text-primary" : "fill-white text-white"}`} />}
                    </button>

                    {/* Waveform Progress */}
                    <div 
                        className="flex items-center gap-[2.5px] h-6 flex-1 cursor-pointer select-none min-w-0 justify-center"
                        onClick={handleSeek}
                    >
                        {waveformBars.map((height, i) => {
                            const barProgress = (i / waveformBars.length) * 100;
                            const isActive = progress >= barProgress;
                            return (
                                <div 
                                    key={i} 
                                    className="w-[2.5px] rounded-full transition-colors duration-100 shrink-0" 
                                    style={{ 
                                        height: `${height}px`,
                                        backgroundColor: isActive 
                                            ? (mine ? '#000000' : '#c4ff0e') 
                                            : (mine ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)')
                                    }}
                                 />
                            );
                        })}
                    </div>

                    {/* Speed Toggle */}
                    <button 
                        onClick={togglePlaybackRate} 
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-transparent transition-all select-none hover:scale-105 shrink-0 ${mine ? 'bg-black/10 border-black/10 hover:bg-black/20 text-black' : 'bg-white/5 border-white/10 hover:bg-white/15 text-white/90'}`}
                    >
                        {playbackRate}x
                    </button>
                </div>

                {/* Subtext info */}
                <div className="flex justify-between items-center text-[9px] font-bold tracking-wider leading-none">
                    <span className={mine ? 'text-black/60' : 'text-white/45'}>
                        {formatTime(audioRef.current?.currentTime || 0)}
                    </span>
                    <span className={mine ? 'text-black/60' : 'text-white/45'}>
                        {formatTime(duration)}
                    </span>
                </div>
            </div>
        </div>
    );
};
