import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, X, Share2, Mail, MessageSquare } from "lucide-react";
import { useToast } from "./Toast";

export const InviteModal = ({ isOpen, onClose, username }) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    
    const inviteLink = `${window.location.origin}/login?isSignup=true`;
    const shareMessage = `Hey! Join me on GoUnion, the exclusive real-time college campus network for students. Sign up here: ${inviteLink}`;
    
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareMessage);
            setCopied(true);
            toast("Invite message copied!", "success");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast("Failed to copy link", "error");
        }
    };
    
    const shareToWhatsApp = () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
    };
    
    const shareToX = () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`, '_blank');
    };
    
    const shareToEmail = () => {
        window.open(`mailto:?subject=Join%20GoUnion&body=${encodeURIComponent(shareMessage)}`, '_blank');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose} 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0c]/95 p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-5"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(196,255,14,0.1)] border border-primary/20">
                                    <Share2 size={20} />
                                </div>
                                <div>
                                    <h3 className="font-serif text-xl text-white">Invite Friends</h3>
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mt-0.5">Grow your campus network</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4 py-2">
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                Share the link below to invite other university students to join GoUnion.
                            </p>
                            
                            <div className="relative flex items-center bg-white/5 border border-white/5 rounded-2xl p-4 gap-3">
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 select-none">Invitation Message</p>
                                    <p className="text-xs text-white/70 font-mono mt-1 leading-relaxed truncate">{shareMessage}</p>
                                </div>
                                <button 
                                    onClick={handleCopy} 
                                    className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all border ${copied ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <button 
                                    onClick={shareToWhatsApp}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#25d366]/10 border border-[#25d366]/20 hover:bg-[#25d366]/20 transition-all text-xs font-bold text-white uppercase tracking-wider"
                                >
                                    <MessageSquare size={20} className="text-[#25d366]" />
                                    WhatsApp
                                </button>
                                <button 
                                    onClick={shareToX}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold text-white uppercase tracking-wider"
                                >
                                    <Share2 size={20} className="text-white" />
                                    Share to X
                                </button>
                                <button 
                                    onClick={shareToEmail}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-xs font-bold text-white uppercase tracking-wider"
                                >
                                    <Mail size={20} className="text-primary" />
                                    Email
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
