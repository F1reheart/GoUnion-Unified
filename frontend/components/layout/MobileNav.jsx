import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, MessageSquare, User, Compass, GraduationCap, ShieldCheck, Settings, LogOut, X, Bell } from "lucide-react";
import { useAuthStore } from "../../store";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";

export const MobileNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const { data: unreadData } = useQuery({
        queryKey: ['notifications-unread'],
        queryFn: api.notifications.getUnreadCount,
        enabled: !!user,
    });
    const unreadCount = unreadData?.count || 0;

    const { data: chatsData } = useQuery({
        queryKey: ['chats'],
        queryFn: api.chats.getAll,
        enabled: !!user,
        staleTime: 30000,
    });
    const unreadChatsCount = chatsData?.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0) || 0;

    const NAV_LEFT = [
        { icon: Home, label: "Feed", path: "/" },
        { icon: Compass, label: "Discover", path: "/discover" },
    ];

    const NAV_RIGHT = [
        { icon: MessageSquare, label: "Chat", path: "/messages", badge: unreadChatsCount },
        { icon: User, label: "Profile", path: user?.username ? `/profile/${user.username}` : "/" },
    ];

    const OTHER_ITEMS = [
        { icon: Bell, label: "Alerts", path: "/notifications", badge: unreadCount },
        { icon: Users, label: "Groups", path: "/groups" },
        { icon: GraduationCap, label: "Alumni", path: "/alumni" },
        ...((user?.role === "admin" || user?.role === "moderator" || user?.email === "ezeilodavid292@gmail.com" || localStorage.getItem('login_email') === "ezeilodavid292@gmail.com")
            ? [{ icon: ShieldCheck, label: "Admin Panel", path: "/admin" }]
            : []),
        { icon: Settings, label: "Settings", path: "/settings" },
    ];

    const renderNavItem = (item) => (
        <NavLink key={item.path} to={item.path} onClick={() => {
            if (location.pathname === "/" && item.path === "/") window.dispatchEvent(new Event("gounion-refresh-feed"));
            if (location.pathname === "/discover" && item.path === "/discover") window.dispatchEvent(new Event("gounion-refresh-discover"));
        }} className={({ isActive }) => `relative flex flex-col items-center justify-center h-full flex-1 transition-all duration-300 ${isActive ? "text-primary" : "text-white/40 hover:text-white/80"}`}>
            {({ isActive }) => (
                <>
                    {isActive && (<motion.div layoutId="activeTab" className="absolute inset-0 bg-primary/10 rounded-xl" transition={{ type: "spring", duration: 0.5 }} />)}
                    <div className="relative">
                        <item.icon size={22} className={`relative z-10 transition-transform ${isActive ? "scale-110 text-primary" : ""}`} />
                        {item.badge > 0 && (
                            <span className="absolute -top-1.5 -right-2 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] z-20">
                                {item.badge > 99 ? '99+' : item.badge}
                            </span>
                        )}
                    </div>
                    <span className="relative z-10 text-[9px] mt-1 font-bold tracking-tight uppercase">{item.label}</span>
                </>
            )}
        </NavLink>
    );

    return (
        <>
            <div className={`md:hidden fixed bottom-0 left-0 w-full h-[calc(4.5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-[#050505]/95 backdrop-blur-3xl border-t border-white/5 z-[160] flex items-center justify-between px-2`}>
                <div className="flex flex-1 justify-around h-full">
                    {NAV_LEFT.map(renderNavItem)}
                </div>

                <div className="relative -top-5 px-2">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary text-black font-serif font-black text-2xl shadow-[0_4px_20px_rgba(196,255,14,0.4)] transition-transform hover:scale-105 active:scale-95 z-[165]">
                        G
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#050505]" />
                        )}
                    </button>
                </div>

                <div className="flex flex-1 justify-around h-full">
                    {NAV_RIGHT.map(renderNavItem)}
                </div>
            </div>

            <AnimatePresence>
                {isMenuOpen && (
                    <div className="fixed inset-0 z-[150] flex items-end justify-center md:hidden pointer-events-none">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto" />
                        
                        <div className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 w-full h-full pointer-events-none">
                            <div className="relative w-full h-full max-w-md mx-auto">
                                {OTHER_ITEMS.map((item, index) => {
                                    const total = OTHER_ITEMS.length;
                                    const angle = Math.PI - (index * (Math.PI / (total - 1)));
                                    const radius = 120;
                                    const x = Math.cos(angle) * radius;
                                    const y = -Math.sin(angle) * radius;

                                    return (
                                        <motion.div
                                            key={item.path}
                                            initial={{ x: "-50%", y: 40, opacity: 0, scale: 0 }}
                                            animate={{ x: `calc(-50% + ${x}px)`, y: y, opacity: 1, scale: 1 }}
                                            exit={{ x: "-50%", y: 40, opacity: 0, scale: 0 }}
                                            transition={{ type: "spring", stiffness: 350, damping: 22, delay: index * 0.04 }}
                                            className="absolute left-1/2 bottom-0 flex flex-col items-center justify-center z-[160] pointer-events-auto"
                                        >
                                            <Link
                                                to={item.path}
                                                onClick={(e) => {
                                                    if (item.label === "Alumni") {
                                                        e.preventDefault();
                                                        return;
                                                    }
                                                    setIsMenuOpen(false);
                                                }}
                                                className={`flex items-center justify-center w-[52px] h-[52px] bg-[#111114]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform hover:scale-110 relative ${item.label === "Alumni" ? "opacity-80 cursor-not-allowed border-dashed border-white/30" : "hover:bg-white/10"}`}
                                            >
                                                <item.icon className={`w-6 h-6 ${item.label === "Alumni" ? "text-white/40" : "text-white"}`} />
                                                {item.badge > 0 && (
                                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                                                        {item.badge > 99 ? '99+' : item.badge}
                                                    </span>
                                                )}
                                                {item.label === "Alumni" && (
                                                    <span className="absolute -top-3 bg-primary text-black text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(196,255,14,0.4)] whitespace-nowrap z-10 border border-black">
                                                        Coming Soon
                                                    </span>
                                                )}
                                            </Link>
                                            <motion.span 
                                                initial={{ opacity: 0, y: 5 }} 
                                                animate={{ opacity: 1, y: 0 }} 
                                                transition={{ delay: 0.15 + index * 0.04 }}
                                                className="absolute top-14 text-[9px] font-black uppercase tracking-[0.1em] text-white whitespace-nowrap bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/5"
                                            >
                                                {item.label}
                                            </motion.span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
