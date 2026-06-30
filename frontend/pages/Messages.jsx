import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Check, CheckCheck, Image as ImageIcon, FileText, MessageSquarePlus, MoreVertical, Paperclip, Plus, Search, Send, UserPlus, X, Mic, Smile, Trash2, Reply, Share, Keyboard, Maximize2, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, getApiErrorMessage } from "../services/api";
import { authStorage } from "../utils/persistentStorage";
import { Avatar } from "../components/ui/Avatar";
import { useToast } from "../components/ui/Toast";
import { VoiceRecorder } from "../components/chat/VoiceRecorder";
import { StickerPicker } from "../components/chat/StickerPicker";
import { AudioPlayer } from "../components/chat/AudioPlayer";
import { CameraModal } from "../components/chat/CameraModal";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { MediaPlayer } from "../components/ui/MediaPlayer";
import { useAuthStore } from "../store";
import { MediaModal } from "../components/ui/MediaModal";

export const Messages = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const navigate = useNavigate();
    const currentUserId = authStorage.getItem("user_id");
    const { user: currentUser } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const userIdFromQuery = searchParams.get("userId");
    const queryUsername = searchParams.get("username") || "";
    const queryName = searchParams.get("name") || queryUsername || "New chat";
    const queryAvatar = searchParams.get("avatar") || "";

    const bottomRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [messageText, setMessageText] = useState("");
    const [searchText, setSearchText] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [pendingChat, setPendingChat] = useState(null);
    const [chatPrepareError, setChatPrepareError] = useState(null);
    const [contactEmails, setContactEmails] = useState(new Set());
    const [contactNames, setContactNames] = useState(new Set());
    const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches);
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [activeMessageMenu, setActiveMessageMenu] = useState(null);
    const [replyToMsg, setReplyToMsg] = useState(null);
    const [selectedMedia, setSelectedMedia] = useState(null);

    const { data: chats = [], isLoading: chatsLoading, isError: chatsError, error: chatsLoadError } = useQuery({
        queryKey: ["chats"],
        queryFn: api.chats.getAll,
        staleTime: 30000,
    });

    const { data: suggestedUsers = [], isLoading: suggestionsLoading } = useQuery({
        queryKey: ["message-suggestions"],
        queryFn: api.profiles.getSuggestions,
        staleTime: 1000 * 60 * 5,
    });

    const filteredSuggestedUsers = suggestedUsers.filter((person) => !chats.some((chat) => String(chat.partner.id) === String(person.id)));

    const createChatMutation = useMutation({
        mutationFn: (participantId) => api.chats.createConversation([participantId]),
        onMutate: () => setChatPrepareError(null),
        onSuccess: (newChat) => {
            const normalizedChat = {
                id: newChat.id.toString(),
                partner: newChat.partner?.id ? newChat.partner : { id: userIdFromQuery, username: queryUsername, fullName: queryName, avatarUrl: queryAvatar || null },
                lastMessage: "No messages yet",
                timestamp: "",
                unreadCount: 0,
            };
            setPendingChat(null);
            queryClient.setQueryData(["chats"], (old = []) => {
                const withoutTemp = old.filter((chat) => !chat.id.toString().startsWith("temp-"));
                return [normalizedChat, ...withoutTemp.filter((chat) => chat.id !== normalizedChat.id)];
            });
            setSelectedChatId(normalizedChat.id);
            setSearchParams({}, { replace: true });
        },
        onError: (error) => {
            setChatPrepareError(getApiErrorMessage(error, "Unable to prepare this chat."));
            setPendingChat((current) => current ? { ...current, lastMessage: "Unable to prepare chat" } : current);
        },
    });

    const followSuggestionMutation = useMutation({
        mutationFn: (userId) => api.profiles.follow(userId),
        onSuccess: (_data, userId) => {
            queryClient.setQueryData(["message-suggestions"], (old = []) => old.map((person) => String(person.id) === String(userId) ? { ...person, isFollowing: true, followers: (person.followers || 0) + 1 } : person));
            queryClient.invalidateQueries({ queryKey: ["message-suggestions"] });
        },
    });

    useEffect(() => {
        if (!isDesktop || selectedChatId || !chats.length || userIdFromQuery) return;
        setSelectedChatId(chats[0].id);
    }, [chats, isDesktop, selectedChatId, userIdFromQuery]);

    useEffect(() => {
        const media = window.matchMedia("(min-width: 768px)");
        const handleChange = () => setIsDesktop(media.matches);
        handleChange();
        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        if (!userIdFromQuery || !chats) return;
        const existingChat = chats.find((chat) => String(chat.partner.id) === String(userIdFromQuery));
        if (existingChat) {
            setSelectedChatId(existingChat.id);
            setSearchParams({}, { replace: true });
            return;
        }
        if (!createChatMutation.isPending) {
            const tempChatId = `temp-${userIdFromQuery}`;
            const tempChat = { id: tempChatId, partner: { id: userIdFromQuery, username: queryUsername, fullName: queryName, avatarUrl: queryAvatar || null }, lastMessage: "Starting conversation...", timestamp: "", unreadCount: 0 };
            setPendingChat(tempChat);
            queryClient.setQueryData(["chats"], (old = []) => {
                if (old.some((chat) => chat.id === tempChatId || String(chat.partner.id) === String(userIdFromQuery))) return old;
                return [tempChat, ...old];
            });
            setSelectedChatId(tempChatId);
            createChatMutation.mutate(userIdFromQuery);
        }
    }, [userIdFromQuery, queryUsername, queryName, queryAvatar, chats, createChatMutation.isPending, createChatMutation, queryClient, setSearchParams]);

    const [partnerIsTyping, setPartnerIsTyping] = useState(false);
    const [isWeTyping, setIsWeTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!selectedChatId || !window.socket) return;
        
        const handleTypingEvent = (data) => {
            if (String(data.conversationId) === String(selectedChatId) && String(data.userId) !== String(currentUserId)) {
                setPartnerIsTyping(data.isTyping);
            }
        };

        window.socket.emit('joinConversation', selectedChatId);
        window.socket.on('typing', handleTypingEvent);

        return () => {
            if (window.socket) {
                window.socket.off('typing', handleTypingEvent);
                window.socket.emit('typing', { conversationId: selectedChatId, isTyping: false });
            }
            setPartnerIsTyping(false);
        };
    }, [selectedChatId, currentUserId]);

    const { data: messages = [], isLoading: messagesLoading, isError: messagesError, error: messagesLoadError } = useQuery({
        queryKey: ["messages", selectedChatId],
        queryFn: () => api.chats.getMessages(selectedChatId),
        enabled: !!selectedChatId && !selectedChatId.startsWith("temp-"),
        staleTime: 30000,
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 100);
        return () => clearTimeout(timer);
    }, [messages, selectedChatId]);

    useEffect(() => {
        if (!selectedChatId || selectedChatId.startsWith("temp-")) return;
        const hasUnread = messages.some(m => !m.isRead && String(m.senderId) !== String(currentUserId));
        if (hasUnread) {
            api.chats.markRead(selectedChatId).then(() => {
                queryClient.invalidateQueries({ queryKey: ["chats"] });
                queryClient.invalidateQueries({ queryKey: ["messages", selectedChatId] });
                queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
            }).catch(console.error);
        }
    }, [selectedChatId, messages, currentUserId, queryClient]);

    const firstUnreadIndex = useMemo(() => {
        return messages.findIndex(m => !m.isRead && String(m.senderId) !== String(currentUserId));
    }, [messages, currentUserId]);

    const selectedChat = chats.find((chat) => chat.id === selectedChatId);
    const activeChat = selectedChat || (pendingChat?.id === selectedChatId ? pendingChat : null);
    const isTempChat = Boolean(selectedChatId?.startsWith("temp-"));
    const isChatPreparing = isTempChat && createChatMutation.isPending && !chatPrepareError;

    const filteredChats = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        if (!q) return chats;
        return chats.filter((chat) => `${chat.partner.fullName} ${chat.partner.username}`.toLowerCase().includes(q));
    }, [chats, searchText]);

    const normalizeContactToken = (value) => value?.trim().toLowerCase() || "";
    const isFromContacts = (person) => {
        const email = normalizeContactToken(person.email);
        const username = normalizeContactToken(person.username);
        const fullName = normalizeContactToken(person.fullName);
        return Boolean((email && contactEmails.has(email)) || (username && contactNames.has(username)) || (fullName && contactNames.has(fullName)));
    };

    const clearAttachment = () => {
        if (attachmentPreview?.startsWith("blob:")) URL.revokeObjectURL(attachmentPreview);
        setAttachment(null);
        setAttachmentPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        clearAttachment();
        setAttachment(file);
        setAttachmentPreview(URL.createObjectURL(file));
        setIsAttachMenuOpen(false);
    };

    const handleCameraCapture = (file) => {
        clearAttachment();
        setAttachment(file);
        setAttachmentPreview(URL.createObjectURL(file));
        setIsAttachMenuOpen(false);
    };

    const importContacts = async () => {
        try {
            const nav = navigator;
            if (nav.contacts?.select) {
                const contacts = await nav.contacts.select(["name", "email"], { multiple: true });
                setContactEmails(new Set(contacts.flatMap((contact) => contact.email || []).map(normalizeContactToken).filter(Boolean)));
                setContactNames(new Set(contacts.flatMap((contact) => contact.name || []).map(normalizeContactToken).filter(Boolean)));
            } else if (navigator.share) {
                await navigator.share({ title: "Join GoUnion", text: "Hey! I'd love for you to join me on GoUnion. It's a great space to connect. Download the app here:", url: "https://gounion.me/download" });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(`Hey! I'd love for you to join me on GoUnion. It's a great space to connect. Download the app here:\nhttps://gounion.me/download`);
                toast("Invite link copied to clipboard.", "success");
            }
        } catch (err) {
            if (err.name !== "AbortError") console.error("Contacts failed", err);
        }
    };

    const shareAppLink = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: "Join GoUnion", url: "https://gounion.me/download" });
            } else {
                await navigator.clipboard.writeText("https://gounion.me/download");
            }
            toast("App link shared successfully!", "success");
        } catch (e) {
            console.error(e);
        }
    };

    const startChatWithUser = (person) => {
        if (!person.isFollowing) {
            followSuggestionMutation.mutate(person.id);
            return;
        }
        const existingChat = chats.find((chat) => String(chat.partner.id) === String(person.id));
        setIsSuggestionsOpen(false);
        setSearchParams({}, { replace: true });
        if (existingChat) {
            setSelectedChatId(existingChat.id);
            return;
        }
        const tempChatId = `temp-${person.id}`;
        const tempChat = { id: tempChatId, partner: person, lastMessage: "Starting conversation...", timestamp: "", unreadCount: 0 };
        setPendingChat(tempChat);
        setSelectedChatId(tempChatId);
        queryClient.setQueryData(["chats"], (old = []) => [tempChat, ...old.filter((chat) => String(chat.partner.id) !== String(person.id))]);
        createChatMutation.mutate(person.id);
    };

    const deleteMessageMutation = useMutation({
        mutationFn: (messageId) => api.chats.deleteMessage(messageId),
        onSuccess: (_, messageId) => {
            queryClient.setQueryData(["messages", selectedChatId], (old) => 
                old?.map(m => String(m.id) === String(messageId) ? {...m, isDeleted: true, content: "", imageUrl: null, videoUrl: null, audioUrl: null, stickerUrl: null} : m)
            );
            toast("Message deleted", "success");
        },
        onError: (err) => toast(getApiErrorMessage(err, "Failed to delete message"), "error")
    });

    const sendMessageMutation = useMutation({
        mutationFn: ({ chatId, content, file, audioBlob, sticker, replyToId }) => api.chats.sendMessage(chatId, content, file, audioBlob, sticker, replyToId),
        onMutate: async ({ content, file, audioBlob, sticker, replyToId }) => {
            const activeChatId = selectedChatId;
            setMessageText("");
            clearAttachment();
            setReplyToMsg(null);
            setIsEmojiPickerOpen(false);
            
            await queryClient.cancelQueries({ queryKey: ["messages", activeChatId] });
            await queryClient.cancelQueries({ queryKey: ["chats"] });
            const previousMessages = queryClient.getQueryData(["messages", activeChatId]);
            const previousChats = queryClient.getQueryData(["chats"]);
            const previewUrl = file ? URL.createObjectURL(file) : null;
            const audioPreviewUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;
            
            const optimisticMessage = {
                id: `temp-${Date.now()}`,
                content,
                imageUrl: file && file.type.startsWith("image/") ? previewUrl : null,
                videoUrl: file && file.type.startsWith("video/") ? previewUrl : null,
                audioUrl: audioPreviewUrl,
                stickerUrl: sticker?.url || null,
                stickerId: sticker?.id || null,
                fileUrl: file && !file.type.startsWith("image/") && !file.type.startsWith("video/") ? previewUrl : null,
                fileName: file && !file.type.startsWith("image/") && !file.type.startsWith("video/") ? file.name : null,
                senderId: currentUserId,
                replyToId: replyToId || null,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                dateLabel: new Date().toLocaleDateString([], { month: "short", day: "numeric" }),
                fullTimestamp: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
                isRead: false,
            };
            queryClient.setQueryData(["messages", activeChatId], (old) => old ? [...old, optimisticMessage] : [optimisticMessage]);
            queryClient.setQueryData(["chats"], (old) => {
                if (!old) return old;
                const chatIndex = old.findIndex((chat) => chat.id === activeChatId);
                if (chatIndex === -1) return old;
                const updatedChat = {
                    ...old[chatIndex],
                    lastMessage: content || (sticker ? "Sticker" : file ? (file.type.startsWith("video/") ? "Video" : "Photo") : "Voice Note"),
                    timestamp: optimisticMessage.timestamp,
                };
                const nextChats = [...old];
                nextChats.splice(chatIndex, 1);
                return [updatedChat, ...nextChats];
            });
            return { previousMessages, previousChats, activeChatId };
        },
        onSuccess: (newServerMsg, _vars, context) => {
            queryClient.setQueryData(["messages", context?.activeChatId], (old) => {
                const sansTemp = old?.filter((m) => !m.id.toString().startsWith("temp-")) || [];
                // Compare IDs as strings to prevent duplicate voice notes if socket also fires
                if (!sansTemp.find(m => String(m.id) === String(newServerMsg.id))) {
                    return [...sansTemp, newServerMsg];
                }
                return sansTemp;
            });
        },
        onError: (err, _variables, context) => {
            queryClient.setQueryData(["messages", context?.activeChatId], context?.previousMessages);
            queryClient.setQueryData(["chats"], context?.previousChats);
            toast(getApiErrorMessage(err, "Unable to send message"), "error");
        },
    });

    const handleSend = () => {
        if (!selectedChatId) return;
        if (!messageText.trim() && !attachment) return;
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setIsWeTyping(false);
        if (window.socket) {
            window.socket.emit('typing', { conversationId: selectedChatId, isTyping: false });
        }

        sendMessageMutation.mutate({ chatId: selectedChatId, content: messageText.trim() || undefined, file: attachment, replyToId: replyToMsg?.id });
    };

    const handleSendVoiceNote = (audioBlob) => {
        if (!selectedChatId) return;
        sendMessageMutation.mutate({ chatId: selectedChatId, audioBlob, replyToId: replyToMsg?.id });
    };

    const handleSendSticker = async (stickerUrl) => {
        if (!selectedChatId) return;
        setIsEmojiPickerOpen(false);
        sendMessageMutation.mutate({ chatId: selectedChatId, sticker: { url: stickerUrl, id: stickerUrl.split("seed=").pop() || "sticker" }, replyToId: replyToMsg?.id });
    };

    const handleEmojiClick = (emojiObj) => {
        setMessageText(prev => prev + emojiObj.emoji);
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="h-[100dvh] w-full bg-[#030303] text-white overflow-hidden">
            <div className="h-full flex">
                {/* Left Sidebar (Chat List) */}
                <aside className={`w-full md:w-[390px] md:min-w-[390px] bg-[#050505]/95 border-r border-white/10 flex-col ${selectedChatId ? "hidden md:flex" : "flex"}`}>
                    <div className="h-16 px-4 bg-[#0a0a0c]/95 border-b border-white/5 flex items-center justify-between">
                        <button onClick={() => navigate("/")} className="h-10 w-10 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center shrink-0">
                            <ArrowLeft size={21} />
                        </button>
                        <Link to="/" className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-primary text-black flex items-center justify-center font-black shadow-lg shadow-primary/20">G</div>
                            <div className="min-w-0">
                                <p className="font-semibold leading-none text-white">GoUnion Chats</p>
                                <p className="text-xs text-white/40 mt-1">Direct Messages</p>
                            </div>
                        </Link>
                        <button onClick={() => setIsSuggestionsOpen(true)} className="h-10 w-10 rounded-xl text-white/50 hover:text-white hover:bg-white/5 flex items-center justify-center">
                            <MoreVertical size={20} />
                        </button>
                    </div>

                    <div className="p-3 bg-[#050505]">
                        <div className="h-10 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 px-4">
                            <Search size={18} className="text-white/40" />
                            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search or start new chat" className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 outline-none" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto relative">
                        {chatsLoading ? (
                            <div className="flex-1 flex items-center justify-center py-20"><div className="w-16 h-16 rounded-2xl bg-white/5 animate-pulse border border-white/10 flex items-center justify-center text-3xl font-serif text-white/20">G</div></div>
                        ) : chatsError ? (
                            <div className="px-8 py-20 text-center text-sm text-red-300">{getApiErrorMessage(chatsLoadError, "Chats could not load.")}</div>
                        ) : filteredChats.length === 0 ? (
                            <div className="px-8 py-20 text-center text-white/40 text-sm">No chats yet.</div>
                        ) : (
                            <>
                                {filteredChats.map((chat) => (
                                    <button key={chat.id} onClick={() => setSelectedChatId(chat.id)} className={`w-full h-[72px] px-4 flex items-center gap-3 text-left border-b border-white/5 transition-colors ${selectedChatId === chat.id ? "bg-white/10" : "hover:bg-white/5"}`}>
                                        <Avatar src={chat.partner.avatarUrl} alt={chat.partner.fullName} label={chat.partner.fullName} className="h-12 w-12 rounded-full object-cover bg-white/10 border border-white/10 relative" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-[15px] text-white font-bold truncate">{chat.partner.fullName}</p>
                                                <span className={`text-[11px] font-bold shrink-0 ${chat.unreadCount > 0 ? "text-primary" : "text-white/35"}`}>{chat.timestamp}</span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between gap-3">
                                                <p className={`text-sm truncate ${chat.unreadCount > 0 ? "text-white font-medium" : "text-white/45"}`}>{chat.lastMessage}</p>
                                                {chat.unreadCount > 0 && <span className="h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px] text-black font-bold flex items-center justify-center">{chat.unreadCount > 99 ? "99+" : chat.unreadCount}</span>}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </aside>

                {/* Main Chat Area */}
                <section className={`flex-1 bg-[#030303] flex-col relative ${selectedChatId ? "flex" : "hidden md:flex"}`}>
                    {activeChat ? (
                        <>
                            <header className="h-16 px-3 md:px-5 bg-[#0a0a0c]/95 flex items-center gap-3 border-b border-white/5">
                                <button onClick={() => { setSelectedChatId(null); setSearchParams({}, { replace: true }); }} className="md:hidden h-10 w-10 shrink-0 rounded-xl text-white/60 hover:text-white hover:bg-white/5 flex items-center justify-center z-50">
                                    <ArrowLeft size={21} />
                                </button>
                                <Avatar src={activeChat.partner.avatarUrl} alt={activeChat.partner.fullName} label={activeChat.partner.fullName} className="h-10 w-10 rounded-full object-cover bg-white/10 border border-white/10" />
                                <Link to={`/profile/${activeChat.partner.username}`} className="min-w-0 flex-1">
                                    <p className="text-[15px] font-bold text-white truncate">{activeChat.partner.fullName}</p>
                                    <p className="text-xs truncate transition-colors">
                                        {activeChat.partner.isOnline ? (
                                            <span className="text-green-500 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online</span>
                                        ) : activeChat.partner.lastSeen ? (
                                            <span className="text-white/40">Last seen {activeChat.partner.lastSeen}</span>
                                        ) : (
                                            <span className="text-white/40">Offline • Tap for profile</span>
                                        )}
                                    </p>
                                </Link>
                                <button onClick={() => setIsSuggestionsOpen(true)} className="h-10 w-10 rounded-xl text-white/50 hover:text-white hover:bg-white/5 flex items-center justify-center">
                                    <MoreVertical size={20} />
                                </button>
                            </header>

                            <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-10 py-6" onClick={() => setActiveMessageMenu(null)}>
                                <div className="absolute inset-0 opacity-60 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.05),transparent_25%),radial-gradient(circle_at_85%_30%,rgba(196,255,14,0.04),transparent_22%)]" />
                                
                                <div className="relative space-y-5 pb-4">
                                    {(messagesLoading || isChatPreparing) ? (
                                        <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
                                    ) : messagesError ? (
                                        <div className="flex min-h-[50vh] items-center justify-center px-4 text-center text-red-200 bg-red-500/10 p-6 rounded-3xl">{getApiErrorMessage(messagesLoadError, "Messages could not load.")}</div>
                                    ) : chatPrepareError ? (
                                        <div className="flex min-h-[50vh] items-center justify-center text-center">
                                            <div className="max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                                <p className="text-sm font-semibold text-white">{chatPrepareError}</p>
                                                <button onClick={() => { if (activeChat?.partner?.id) createChatMutation.mutate(activeChat.partner.id); }} className="mt-5 rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-black w-full">Try again</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <AnimatePresence mode="popLayout">
                                            {messages.map((msg, index) => {
                                                const mine = String(msg.senderId) === String(currentUserId);
                                                const showDate = index === 0 || msg.dateLabel !== messages[index - 1]?.dateLabel;
                                                const repliedMsg = msg.replyToId ? messages.find(m => String(m.id) === String(msg.replyToId)) : null;

                                                return (
                                                    <React.Fragment key={msg.id}>
                                                        {showDate && (
                                                            <div className="sticky top-2 z-10 my-3 flex justify-center">
                                                                <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/45 backdrop-blur">{msg.dateLabel}</span>
                                                            </div>
                                                        )}
                                                        {index === firstUnreadIndex && (
                                                            <div className="flex items-center gap-4 my-4 w-full px-2">
                                                                <div className="flex-1 h-px bg-primary/20"></div>
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shadow-[0_0_10px_rgba(196,255,14,0.1)]">New Messages</span>
                                                                <div className="flex-1 h-px bg-primary/20"></div>
                                                            </div>
                                                        )}
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 8 }} 
                                                            animate={{ opacity: 1, y: 0 }} 
                                                            drag="x"
                                                            dragConstraints={{ left: 0, right: 0 }}
                                                            dragElastic={{ left: 0, right: 0.2 }}
                                                            onDragEnd={(e, info) => {
                                                                if (info.offset.x > 50) {
                                                                    setReplyToMsg(msg);
                                                                }
                                                            }}
                                                            className={`flex group ${mine ? "justify-end" : "justify-start"} relative w-full`}
                                                        >
                                                            <div className={`flex max-w-[82%] flex-col gap-1 sm:max-w-[70%] ${mine ? "items-end" : "items-start"}`}>
                                                                
                                                                {/* Context Menu Icon */}
                                                                <div className={`absolute top-2 ${mine ? "-left-10" : "-right-10"} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                                    <button onClick={(e) => { e.stopPropagation(); setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id); }} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white shadow">
                                                                        <MoreVertical size={14} />
                                                                    </button>
                                                                    {activeMessageMenu === msg.id && (
                                                                        <div className="absolute top-8 z-50 bg-[#111114] border border-white/10 rounded-xl shadow-2xl p-1 w-32 flex flex-col">
                                                                            <button onClick={() => { setReplyToMsg(msg); setActiveMessageMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 rounded-lg w-full text-left">
                                                                                <Reply size={14} /> Reply
                                                                            </button>
                                                                            {mine && (
                                                                                <button onClick={() => { deleteMessageMutation.mutate(msg.id); setActiveMessageMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg w-full text-left">
                                                                                    <Trash2 size={14} /> Delete
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div 
                                                                    onContextMenu={(e) => {
                                                                        e.preventDefault();
                                                                        setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id);
                                                                    }}
                                                                    className={`rounded-2xl px-3 py-2 shadow-md border cursor-pointer select-none transition-all duration-200 ${mine ? "bg-primary text-black border-primary/20 rounded-br-md active:scale-[0.99] hover:brightness-[0.98]" : (!msg.isRead ? "bg-[#151512] text-white border-primary/20 rounded-bl-md shadow-[0_0_15px_rgba(196,255,14,0.04)] active:scale-[0.99]" : "bg-[#111114] text-white border-white/10 rounded-bl-md active:scale-[0.99] hover:bg-[#151519]")}`}
                                                                >
                                                                    {repliedMsg && (
                                                                        <div className={`mb-2 p-2 rounded-xl border-l-2 text-xs ${mine ? "bg-black/10 border-black text-black/70" : "bg-black/30 border-primary text-white/70"}`}>
                                                                            <span className={`font-bold block mb-1 ${mine ? "text-black" : "text-primary"}`}>{String(repliedMsg.senderId) === String(currentUserId) ? "You" : (activeChat?.partner?.fullName || "User")}</span>
                                                                            {repliedMsg.isDeleted ? <em className={mine ? "text-black/50 italic" : "text-white/40 italic"}>This message was deleted</em> : repliedMsg.content || "Media"}
                                                                        </div>
                                                                    )}

                                                                    {msg.isDeleted ? (
                                                                        <p className={`italic text-sm px-1 flex items-center gap-2 ${mine ? "text-black/50" : "text-white/40"}`}><Trash2 size={14}/> This message was deleted</p>
                                                                    ) : (
                                                                        <>
                                                                            {(msg.imageUrl || msg.mediaUrl) && (
                                                                                <img 
                                                                                    src={msg.imageUrl || msg.mediaUrl} 
                                                                                    className="max-h-64 rounded-xl mb-1 object-cover cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform" 
                                                                                    alt="" 
                                                                                    onClick={() => setSelectedMedia({ url: msg.imageUrl || msg.mediaUrl, type: 'image', name: msg.fileName || 'Image' })} 
                                                                                />
                                                                            )}
                                                                            {msg.videoUrl && (
                                                                                <div className="relative group/video rounded-xl overflow-hidden mb-1">
                                                                                    <MediaPlayer url={msg.videoUrl} maxHeight="256px" autoPlayOnVisible={false} />
                                                                                    <button 
                                                                                        onClick={() => setSelectedMedia({ url: msg.videoUrl, type: 'video', name: msg.fileName || 'Video' })}
                                                                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/video:opacity-100 transition-opacity z-10 cursor-pointer"
                                                                                        title="View Fullscreen"
                                                                                    >
                                                                                        <Maximize2 size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            {msg.fileUrl && (
                                                                                <div className={`flex items-center gap-2 p-1.5 rounded-xl mb-1 ${mine ? "bg-black/10 text-black" : "bg-white/5 text-white"}`}>
                                                                                    <button 
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            setSelectedMedia({ url: msg.fileUrl, type: 'file', name: msg.fileName || 'Attachment' });
                                                                                        }}
                                                                                        className="flex-1 flex items-center gap-2 p-1 text-left cursor-pointer hover:opacity-80 transition-all min-w-0"
                                                                                    >
                                                                                        <FileText size={20} className="shrink-0" />
                                                                                        <span className="text-sm truncate">{msg.fileName || "Attachment"}</span>
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            // Force download via direct fetch to bypass Service Worker interception
                                                                                            fetch(msg.fileUrl)
                                                                                                .then(r => r.blob())
                                                                                                .then(blob => {
                                                                                                    const url = window.URL.createObjectURL(blob);
                                                                                                    const link = document.createElement('a');
                                                                                                    link.href = url;
                                                                                                    link.setAttribute('download', msg.fileName || 'download');
                                                                                                    document.body.appendChild(link);
                                                                                                    link.click();
                                                                                                    link.parentNode.removeChild(link);
                                                                                                    window.URL.revokeObjectURL(url);
                                                                                                })
                                                                                                .catch(() => {
                                                                                                    window.open(msg.fileUrl, '_blank');
                                                                                                });
                                                                                        }}
                                                                                        className={`p-2 rounded-lg hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer ${mine ? "hover:bg-black/10 text-black" : "hover:bg-white/10 text-white"}`}
                                                                                        title="Download File"
                                                                                    >
                                                                                        <Download size={16} />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            {msg.audioUrl && (
                                                                                <AudioPlayer 
                                                                                    src={msg.audioUrl} 
                                                                                    mine={mine} 
                                                                                    senderAvatar={mine ? currentUser?.avatarUrl : activeChat?.partner?.avatarUrl} 
                                                                                    senderName={mine ? currentUser?.fullName : activeChat?.partner?.fullName} 
                                                                                />
                                                                            )}
                                                                            {msg.stickerUrl && <img src={msg.stickerUrl} className="h-24 w-24 object-contain" alt="Sticker" />}
                                                                            {(msg.content || msg.caption) && <p className={`px-1 pt-1 text-[14px] leading-relaxed whitespace-pre-wrap ${mine ? "text-black" : "text-white"}`}>{msg.content || msg.caption}</p>}
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className={`flex items-center gap-1 px-2 text-[10px] ${mine ? "text-primary/70" : "text-white/40"}`}>
                                                                    <span>{msg.fullTimestamp || msg.timestamp}</span>
                                                                    {mine && !msg.isDeleted && (
                                                                        msg.isRead ? <CheckCheck size={14} className="text-[#3b82f6]" /> : activeChat?.partner?.isOnline ? <CheckCheck size={14} className="text-white/40" /> : <Check size={14} className="text-white/40" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </AnimatePresence>
                                    )}
                                    {partnerIsTyping && (
                                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-zinc-400 text-xs w-fit max-w-[200px] mb-2 ml-4 animate-in fade-in zoom-in duration-200">
                                            <span>typing</span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce"></span>
                                        </div>
                                    )}
                                    <div ref={bottomRef} />
                                </div>
                            </div>

                            <AnimatePresence>
                                {replyToMsg && (
                                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="absolute bottom-20 left-0 w-full px-4 z-20">
                                        <div className="bg-[#111114] border border-white/10 rounded-xl p-3 flex items-start justify-between shadow-2xl backdrop-blur-xl">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Reply size={14} className="text-primary" />
                                                    <span className="text-xs font-bold text-primary">Replying to {String(replyToMsg.senderId) === String(currentUserId) ? "yourself" : activeChat.partner.fullName}</span>
                                                </div>
                                                <p className="text-sm text-white/70 truncate">{replyToMsg.isDeleted ? "Deleted message" : replyToMsg.content || "Media message"}</p>
                                            </div>
                                            <button onClick={() => setReplyToMsg(null)} className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white shrink-0"><X size={16} /></button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <footer className="bg-[#0a0a0c]/95 border-t border-white/5 px-2 py-2 relative z-30 flex flex-col gap-2">
                                {attachmentPreview && (
                                    <div className="mx-2 mb-2 w-fit relative">
                                        {attachment?.type.startsWith("video/") ? <video src={attachmentPreview} className="h-28 rounded-lg border border-white/10" /> : attachment?.type.startsWith("image/") ? <img src={attachmentPreview} className="h-28 rounded-lg border border-white/10 object-cover" alt="" /> : (
                                            <div className="h-20 max-w-[220px] rounded-lg border border-white/10 bg-white/5 px-4 flex items-center gap-3 text-white/80"><FileText size={22} /><span className="text-sm truncate">{attachment?.name}</span></div>
                                        )}
                                        <button onClick={clearAttachment} className="absolute -top-2 -right-2 h-7 w-7 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={14} /></button>
                                    </div>
                                )}
                                
                                <div className="flex items-end gap-1 sm:gap-2 w-full">
                                    <div className="relative shrink-0 flex gap-1">
                                        <button onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)} className="h-11 w-11 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center">
                                            <Plus size={22} className={`transition-transform ${isAttachMenuOpen ? "rotate-45" : ""}`} />
                                        </button>
                                        
                                        <AnimatePresence>
                                            {isAttachMenuOpen && (
                                                <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }} className="absolute bottom-14 left-0 rounded-2xl border border-white/10 bg-[#111114] p-2 shadow-2xl flex gap-2">
                                                    <button onClick={() => { fileInputRef.current.accept="image/*,video/*"; fileInputRef.current?.click(); }} className="h-11 w-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center"><ImageIcon size={20} /></button>
                                                    <button onClick={() => { setIsAttachMenuOpen(false); setIsCameraModalOpen(true); }} className="h-11 w-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center"><Camera size={20} /></button>
                                                    <button onClick={() => { fileInputRef.current.accept="application/pdf,.doc,.docx,.txt,.zip"; fileInputRef.current?.click(); }} className="h-11 w-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center"><Paperclip size={21} /></button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

                                    {isVoiceRecording ? (
                                        <VoiceRecorder onSend={(blob) => { setIsVoiceRecording(false); handleSendVoiceNote(blob); }} onCancel={() => setIsVoiceRecording(false)} />
                                    ) : (
                                        <div className="flex-1 flex items-center bg-[#111114] border border-white/10 rounded-2xl relative">
                                            <button 
                                                onClick={() => {
                                                    if (isEmojiPickerOpen) {
                                                        setIsEmojiPickerOpen(false);
                                                        inputRef.current?.focus();
                                                    } else {
                                                        setIsEmojiPickerOpen(true);
                                                    }
                                                }} 
                                                className="h-11 w-11 rounded-xl text-white/55 hover:text-white flex items-center justify-center transition-colors shrink-0"
                                            >
                                                {isEmojiPickerOpen ? (
                                                    <Keyboard size={22} className="text-primary animate-in zoom-in duration-200" />
                                                ) : (
                                                    <Smile size={22} className="animate-in zoom-in duration-200" />
                                                )}
                                            </button>

                                            <textarea 
                                                ref={inputRef}
                                                value={messageText} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setMessageText(val);
                                                    if (selectedChatId && window.socket) {
                                                        if (!isWeTyping) {
                                                            setIsWeTyping(true);
                                                            window.socket.emit('typing', { conversationId: selectedChatId, isTyping: true });
                                                        }
                                                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                                        typingTimeoutRef.current = setTimeout(() => {
                                                            setIsWeTyping(false);
                                                            window.socket.emit('typing', { conversationId: selectedChatId, isTyping: false });
                                                        }, 2000);
                                                    }
                                                }} 
                                                onKeyDown={handleKeyPress} 
                                                onFocus={() => setIsEmojiPickerOpen(false)}
                                                placeholder={isChatPreparing ? "Preparing chat..." : "Type a message..."} 
                                                disabled={isTempChat} 
                                                className="min-h-[44px] max-h-32 w-full bg-transparent px-2 py-3 text-[14px] sm:text-[15px] text-white placeholder:text-white/35 outline-none resize-none hide-scrollbar"
                                                rows={1}
                                            />
                                            
                                            {(!messageText.trim() && !attachment) ? (
                                                <button onClick={() => setIsVoiceRecording(true)} disabled={isTempChat || sendMessageMutation.isPending} className="h-11 w-11 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors shrink-0">
                                                    <Mic size={20} />
                                                </button>
                                            ) : (
                                                <button onClick={handleSend} disabled={isTempChat || sendMessageMutation.isPending} className="h-9 w-9 mr-1 mb-1 rounded-full bg-primary text-black flex items-center justify-center disabled:opacity-40 shrink-0 self-end shadow-[0_0_15px_rgba(196,255,14,0.4)] hover:scale-105 transition-transform">
                                                    <Send size={16} className="ml-0.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {isEmojiPickerOpen && (
                                    <div className="w-full overflow-hidden flex justify-center border-t border-white/5 pt-2 mt-1 animate-in slide-in-from-bottom duration-200">
                                        <EmojiPicker 
                                            theme={Theme.DARK} 
                                            onEmojiClick={handleEmojiClick} 
                                            lazyLoadEmojis={true} 
                                            style={{ width: '100%', height: '350px', border: 'none', background: 'transparent' }} 
                                        />
                                    </div>
                                )}
                            </footer>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center px-8">
                            <div className="max-w-md">
                                <div className="mx-auto h-24 w-24 rounded-3xl border border-white/10 bg-[#111114] flex items-center justify-center text-primary mb-6 shadow-2xl">
                                    <MessageSquarePlus size={34} />
                                </div>
                                <h1 className="text-3xl font-serif text-white">GoUnion Messages</h1>
                                <p className="mt-3 text-sm leading-6 text-white/40">Select a chat from the left or search to start a new conversation.</p>
                            </div>
                        </div>
                    )}
                </section>

                <AnimatePresence>
                    {isSuggestionsOpen && (
                        <div className="fixed inset-0 z-[220] flex items-end justify-center p-0 sm:items-center sm:p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsSuggestionsOpen(false)} />
                            <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }} className="relative flex max-h-[82dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#0b0b0e] shadow-2xl sm:rounded-[2rem]">
                                <div className="flex items-center justify-between border-b border-white/5 p-5">
                                    <div>
                                        <h2 className="text-lg font-black text-white">Contacts & Suggestions</h2>
                                        <p className="mt-1 text-xs text-white/40">Connect with people on GoUnion.</p>
                                    </div>
                                    <button onClick={() => setIsSuggestionsOpen(false)} className="h-10 w-10 rounded-xl text-white/50 hover:bg-white/5 hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3">
                                    {suggestionsLoading ? (
                                        <div className="py-12 text-center text-sm text-white/40">Loading contacts...</div>
                                    ) : filteredSuggestedUsers.length === 0 ? (
                                        <div className="py-12 text-center text-sm text-white/40">No account suggestions right now.</div>
                                    ) : (
                                        filteredSuggestedUsers.map((person) => {
                                            const fromContacts = isFromContacts(person);
                                            return (
                                                <button key={person.id} onClick={() => startChatWithUser(person)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-white/5 group">
                                                    <Avatar src={person.avatarUrl} alt={person.fullName} label={person.fullName} className="h-12 w-12 rounded-full border border-white/10 object-cover group-hover:border-primary/50 transition-colors" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-white">{person.fullName}</p>
                                                        <p className="truncate text-xs text-white/40">@{person.username}</p>
                                                        {fromContacts && <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-primary">From your contacts</p>}
                                                    </div>
                                                    <span className="rounded-xl bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black shadow-lg hover:scale-105 transition-transform">{person.isFollowing ? "Message" : "Follow"}</span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
            
            {isCameraModalOpen && <CameraModal onCapture={handleCameraCapture} onClose={() => setIsCameraModalOpen(false)} />}

            {selectedMedia && (
                <MediaModal 
                    isOpen={!!selectedMedia} 
                    onClose={() => setSelectedMedia(null)} 
                    mediaUrl={selectedMedia.url} 
                    mediaType={selectedMedia.type} 
                    fileName={selectedMedia.name} 
                />
            )}
        </div>
    );
};
