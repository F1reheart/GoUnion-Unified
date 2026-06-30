import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle, Smartphone, Globe, MessageCircle, Users, Zap, ArrowRight, ChevronRight, Layout, Menu } from 'lucide-react';
import { usePwaStore } from '../store/pwaStore';
import { useNavigate } from 'react-router-dom';


export const DownloadPage = () => {
    const { installPrompt, isInstalled } = usePwaStore();
    const navigate = useNavigate();
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        usePwaStore.getState().clearInstallPrompt();
    };

    return (
        _jsxs("div", { className: "min-h-screen w-full bg-[#030303] flex flex-col relative overflow-x-hidden", children: [
            // Ambient Background
            _jsxs("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: [
                _jsx("div", { className: "absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px]" }),
                _jsx("div", { className: "absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[150px]" })
            ] }),
            
            // Header
            _jsx("header", { className: "w-full p-6 flex justify-between items-center z-10", children: 
                _jsxs("div", { className: "flex items-center gap-3", children: [
                    _jsx("div", { className: "w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-serif font-black text-xl", children: "G" }),
                    _jsx("span", { className: "font-serif text-xl font-bold tracking-tight text-white", children: "GoUnion" })
                ] })
            }),

            // Main Content
            _jsxs("main", { className: "flex-1 flex flex-col z-10 max-w-6xl mx-auto w-full px-6 pt-12 md:pt-20", children: [
                // Hero Section
                _jsxs("section", { className: "flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-8 mb-32", children: [
                    _jsxs("div", { className: "flex-1 text-center lg:text-left", children: [
                        _jsx(motion.div, { 
                            initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 },
                            className: "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6", children: "The Elite Campus Network"
                        }),
                        _jsxs(motion.h1, { 
                            initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 },
                            className: "font-serif text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1]", children: [
                                "Connect with your ", _jsx("br", { className: "hidden md:block" }),
                                _jsx("span", { className: "text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent", children: "university" }), " instantly."
                            ] 
                        }),
                        _jsx(motion.p, { 
                            initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.2 },
                            className: "text-zinc-400 text-lg md:text-xl mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed", children: 
                            "GoUnion is the exclusive real-time social network for college students. Join groups, discover stories, and chat with peers in a premium, lightning-fast app."
                        }),
                        _jsxs(motion.div, { 
                            initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.3 },
                            className: "flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start", children: [
                                isInstalled ? (
                                    _jsx("button", { 
                                        onClick: () => navigate('/login'),
                                        className: "w-full sm:w-auto bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3", children: 
                                        "Open GoUnion"
                                    })
                                ) : installPrompt ? (
                                    _jsxs("button", { 
                                        onClick: handleInstall, 
                                        className: "w-full sm:w-auto bg-white text-black px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]", children: [
                                            _jsx(Download, { size: 18 }), "Install App"
                                        ] 
                                    })
                                ) : (
                                    _jsxs("div", { className: "bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex flex-col gap-2 max-w-xs text-center", children: [
                                        _jsx("span", { className: "text-white font-bold text-sm", children: "How to install:" }),
                                        _jsxs("span", { className: "text-zinc-400 text-xs leading-relaxed", children: [
                                            isIOS ? "Tap the share icon " : "Click the install icon ",
                                            isIOS && _jsx("span", { className: "inline-block px-1 bg-white/10 rounded", children: "⇪" }),
                                            " and select ", _jsx("strong", { className: "text-white", children: isIOS ? '"Add to Home Screen"' : '"Install"' })
                                        ] })
                                    ] })
                                ),
                                _jsxs("button", { 
                                    onClick: () => navigate('/login'),
                                    className: "w-full sm:w-auto bg-transparent border border-white/10 text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/5 transition-all", children: [
                                        "Use in Browser ", _jsx(Globe, { size: 18 })
                                    ] 
                                })
                            ] 
                        })
                    ] }),
                    
                    // Phone Frame with Real Screenshot
                    _jsx(motion.div, { 
                        initial: { opacity: 0, scale: 0.9, rotate: 2 }, animate: { opacity: 1, scale: 1, rotate: 0 }, transition: { delay: 0.2, type: 'spring' },
                        className: "relative w-[300px] h-[600px] rounded-[3rem] border-8 border-white/10 bg-[#030303] shadow-2xl overflow-hidden flex-shrink-0 mx-auto", children: 
                        _jsx("img", { 
                            src: "/screenshot-main.png", 
                            alt: "GoUnion App Feed", 
                            className: "w-full h-full object-cover",
                            onError: (e) => {
                                e.target.onerror = null;
                                // Fallback gradient if image not found yet
                                e.target.parentElement.className += " bg-gradient-to-b from-zinc-800 to-black flex items-center justify-center text-zinc-500 text-sm text-center p-4";
                                e.target.outerHTML = "<span>Save your image as <br/><b>public/screenshot-main.png</b></span>";
                            }
                        })
                    })
                ] }),

                // Features Grid
                _jsxs("section", { className: "pb-32", children: [
                    _jsx("div", { className: "text-center mb-16", children: 
                        _jsx("h2", { className: "font-serif text-3xl md:text-4xl font-bold text-white", children: "Everything you need on campus" })
                    }),
                    _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [
                        _jsxs(motion.div, { 
                            whileHover: { y: -5 },
                            className: "glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col h-full", 
                            children: [
                                _jsx("div", { className: "w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-6", children: _jsx(MessageCircle, { className: "w-6 h-6 text-primary" }) }),
                                _jsx("h3", { className: "text-lg font-bold text-white mb-2 font-serif", children: "Real-time Chat" }),
                                _jsx("p", { className: "text-zinc-400 text-sm leading-relaxed mb-6 flex-grow", children: "Connect instantly with crystal-clear text, voice, and media messaging." }),
                                _jsx("div", { className: "w-full aspect-[4/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 mt-auto", children:
                                    _jsx("img", { src: "/screenshot-chat.png", alt: "Chat Feature", className: "w-full h-full object-cover", onError: (e) => { e.target.style.display = 'none'; } })
                                })
                            ] 
                        }),
                        _jsxs(motion.div, { 
                            whileHover: { y: -5 },
                            className: "glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col h-full", 
                            children: [
                                _jsx("div", { className: "w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center mb-6", children: _jsx(Users, { className: "w-6 h-6 text-accent" }) }),
                                _jsx("h3", { className: "text-lg font-bold text-white mb-2 font-serif", children: "Campus Groups" }),
                                _jsx("p", { className: "text-zinc-400 text-sm leading-relaxed mb-6 flex-grow", children: "Join communities, study groups, and clubs specific to your university." }),
                                _jsx("div", { className: "w-full aspect-[4/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 mt-auto", children:
                                    _jsx("img", { src: "/screenshot-groups.png", alt: "Groups Feature", className: "w-full h-full object-cover", onError: (e) => { e.target.style.display = 'none'; } })
                                })
                            ] 
                        }),
                        _jsxs(motion.div, { 
                            whileHover: { y: -5 },
                            className: "glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col h-full", 
                            children: [
                                _jsx("div", { className: "w-12 h-12 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center mb-6", children: _jsx(Globe, { className: "w-6 h-6 text-fuchsia-500" }) }),
                                _jsx("h3", { className: "text-lg font-bold text-white mb-2 font-serif", children: "Discover" }),
                                _jsx("p", { className: "text-zinc-400 text-sm leading-relaxed mb-6 flex-grow", children: "Explore trending campus stories, infinite reels, and find new peers." }),
                                _jsx("div", { className: "w-full aspect-[4/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 mt-auto", children:
                                    _jsx("img", { src: "/screenshot-discover.png", alt: "Discover Feature", className: "w-full h-full object-cover", onError: (e) => { e.target.style.display = 'none'; } })
                                })
                            ] 
                        }),
                        _jsxs(motion.div, { 
                            whileHover: { y: -5 },
                            className: "glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col h-full", 
                            children: [
                                _jsx("div", { className: "w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6", children: _jsx(Layout, { className: "w-6 h-6 text-amber-500" }) }),
                                _jsx("h3", { className: "text-lg font-bold text-white mb-2 font-serif", children: "Your Profile" }),
                                _jsx("p", { className: "text-zinc-400 text-sm leading-relaxed mb-6 flex-grow", children: "Showcase your university, department, level, and build your campus identity." }),
                                _jsx("div", { className: "w-full aspect-[4/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 mt-auto", children:
                                    _jsx("img", { src: "/screenshot-profile.png", alt: "Profile Feature", className: "w-full h-full object-cover", onError: (e) => { e.target.style.display = 'none'; } })
                                })
                            ] 
                        })
                    ] })
                ] })
            ] })
        ] })
    );
};
