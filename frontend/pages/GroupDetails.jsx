import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Image as ImageIcon, Send, Shield, Globe, Lock, Clock, Check, CheckCheck, X, Sparkles, Trash2, Plus, Camera, Mic, Smile, LogOut, Reply, MoreVertical, Keyboard, Maximize2, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, getApiErrorMessage, transformPost } from "../services/api";
import { Skeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { authStorage } from "../utils/persistentStorage";
import { useToast } from "../components/ui/Toast";
import { VoiceRecorder } from "../components/chat/VoiceRecorder";
import { StickerPicker } from "../components/chat/StickerPicker";
import { AudioPlayer } from "../components/chat/AudioPlayer";
import { MediaPlayer } from "../components/ui/MediaPlayer";
import { CameraModal } from "../components/chat/CameraModal";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { MediaModal } from "../components/ui/MediaModal";

const isVideoUrl = (url) => {
    if (!url) return false;
    return /\.(mp4|webm|mov|m4v|avi|mkv|3gp)(\?|$)/i.test(url);
};

const isImageUrl = (url) => {
    if (!url) return false;
    return /\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?|$)/i.test(url);
};

export const GroupDetails = () => {
    const { id } = useParams();
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [messageText, setMessageText] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [activeTab, setActiveTab] = useState("chat");
    const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinMessage, setJoinMessage] = useState("");
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [activeMessageMenu, setActiveMessageMenu] = useState(null);
    const [replyToMsg, setReplyToMsg] = useState(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [editPrivacy, setEditPrivacy] = useState("public");




    const bottomRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const currentUserId = authStorage.getItem("user_id");

    const { data: group, isLoading: isGroupLoading } = useQuery({
        queryKey: ["group", id],
        queryFn: () => api.groups.getById(id),
        enabled: !!id,
    });

    const { data: members, isLoading: isMembersLoading } = useQuery({
        queryKey: ["group-members", id],
        queryFn: () => api.groups.getMembers(id),
        enabled: !!id,
    });

    const { data: requests, isLoading: isRequestsLoading } = useQuery({
        queryKey: ["group-requests", id],
        queryFn: () => api.groups.getRequests(id),
        enabled: !!id && group?.creatorId === currentUserId,
    });

    const isMember = Boolean(group?.isJoined) || members?.some((m) => String(m.user_id) === String(currentUserId));
    const isAdmin = String(group?.creatorId) === String(currentUserId);
    const canViewMessages = Boolean(group) && (group.privacy !== "private" || isMember || isAdmin);

    const { data: posts, isLoading: isPostsLoading } = useQuery({
        queryKey: ["group-posts", id],
        queryFn: () => api.groups.getPosts(id),
        enabled: !!id && canViewMessages,
        refetchInterval: canViewMessages ? 5000 : false,
        staleTime: 4000,
    });

    const onlineMembers = (members || []).filter((m) => m.user?.is_online || m.user?.isOnline);
    const typingMembers = (members || []).filter((m) => String(m.user_id) !== String(currentUserId) && (m.user?.is_typing || m.user?.isTyping));
    const isPending = requests?.some((r) => String(r.user_id) === String(currentUserId) && r.status === "pending");

    const [typingUserIds, setTypingUserIds] = useState(new Set());
    const [isWeTyping, setIsWeTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!id || !window.socket) return;

        const handleTypingEvent = (data) => {
            if (String(data.groupId) === String(id) && String(data.userId) !== String(currentUserId)) {
                setTypingUserIds((prev) => {
                    const next = new Set(prev);
                    if (data.isTyping) {
                        next.add(data.userId);
                    } else {
                        next.delete(data.userId);
                    }
                    return next;
                });
            }
        };

        const handleNewMessage = (data) => {
            if (String(data.groupId) === String(id)) {
                queryClient.setQueryData(["group-posts", id], (old) => {
                    if (!old) return [transformPost(data.message)];
                    const transformed = transformPost(data.message);
                    // Match by real ID or by temp optimistic ID
                    const existsIndex = old.findIndex(p => String(p.id) === String(transformed.id) || (String(p.id).startsWith('temp-') && p.content === transformed.content));
                    if (existsIndex !== -1) {
                        const newOld = [...old];
                        newOld[existsIndex] = transformed;
                        return newOld;
                    }
                    return [...old, transformed];
                });
            }
        };

        window.socket.emit('joinGroup', id);
        window.socket.on('typing', handleTypingEvent);
        window.socket.on('new_group_message', handleNewMessage);

        return () => {
            if (window.socket) {
                window.socket.off('typing', handleTypingEvent);
                window.socket.off('new_group_message', handleNewMessage);
                window.socket.emit('typing', { groupId: id, isTyping: false });
            }
            setTypingUserIds(new Set());
        };
    }, [id, currentUserId, queryClient]);

    const typingMembersNames = React.useMemo(() => {
        const names = [];
        for (const userId of typingUserIds) {
            const m = members?.find((member) => String(member.user_id) === String(userId));
            if (m) {
                names.push(m.user?.profile?.full_name || m.user?.username || "Someone");
            }
        }
        return names;
    }, [typingUserIds, members]);
    useEffect(() => {
        if (group) {
            setEditName(group.name || "");
            setEditDescription(group.description || "");
            setEditPrivacy(group.privacy || "public");
        }
    }, [group]);

    const sortedMessages = React.useMemo(() => {
        if (!posts) return [];
        return [...posts].sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
            const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
            return dateA - dateB;
        });
    }, [posts]);

    useEffect(() => {
        if (activeTab === "chat") {
            bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [sortedMessages, activeTab]);

    const deletePostMutation = useMutation({
        mutationFn: (postId) => api.posts.delete(postId),
        onSuccess: (_, postId) => {
            queryClient.setQueryData(["group-posts", id], (old) => old?.map(p => String(p.id) === String(postId) ? {...p, isDeleted: true, content: "", imageUrl: null, mediaUrl: null} : p));
        }
    });

    const createPostMutation = useMutation({
        mutationFn: (data) => api.groups.createPost(id, data),
        onMutate: async ({ caption, image }) => {
            setMessageText("");
            clearAttachment();
            setReplyToMsg(null);
            setIsEmojiPickerOpen(false);
            
            await queryClient.cancelQueries({ queryKey: ["group-posts", id] });
            const previousPosts = queryClient.getQueryData(["group-posts", id]);
            const previewUrl = image && image.type ? URL.createObjectURL(image) : (image?.url || null);
            
            const optimisticMessage = {
                id: `temp-${Date.now()}`,
                content: caption,
                imageUrl: image && image.type && image.type.startsWith("image/") ? previewUrl : null,
                videoUrl: image && image.type && image.type.startsWith("video/") ? previewUrl : null,
                audioUrl: image && image.type && image.type.startsWith("audio/") ? previewUrl : null,
                stickerUrl: image && !image.type ? image.url : null,
                author: {
                    id: currentUserId,
                    username: "you",
                    fullName: "You",
                    avatarUrl: (() => { try { const d = authStorage.getItem('user_data'); return d ? JSON.parse(d).avatarUrl : null; } catch { return null; } })()
                },
                createdAt: new Date().toISOString(),
                likes: 0,
                comments: 0,
                isLiked: false,
                replyToId: replyToMsg?.id || null
            };
            queryClient.setQueryData(["group-posts", id], (old) => old ? [...old, optimisticMessage] : [optimisticMessage]);
            return { previousPosts };
        },
        onError: (_err, _vars, context) => {
            queryClient.setQueryData(["group-posts", id], context?.previousPosts);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["group-posts", id] });
        },
    });

    const joinMutation = useMutation({
        mutationFn: (data) => api.groups.join(id, data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["group", id] });
            queryClient.invalidateQueries({ queryKey: ["group-members", id] });
            queryClient.invalidateQueries({ queryKey: ["group-requests", id] });
            if (res.status === "requested") {
                toast("Request sent successfully!", "success");
            } else {
                toast("Joined group!", "success");
            }
        },
    });

    const makeAdminMutation = useMutation({
        mutationFn: (userId) => api.groups.updateMemberRole(id, userId, 'admin'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["group-members", id] });
            toast("Member promoted to admin", "success");
        },
    });

    const approveMutation = useMutation({
        mutationFn: ({ requestId, status }) => api.groups.approveRequest(requestId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["group-requests", id] });
            queryClient.invalidateQueries({ queryKey: ["group-members", id] });
        },
    });

    const updateGroupMutation = useMutation({
        mutationFn: (data) => api.groups.updateGroup(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["group", id] });
            toast("Group settings saved successfully!", "success");
        },
        onError: (err) => {
            toast(getApiErrorMessage(err, "Failed to update group"), "error");
        }
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, role }) => api.groups.updateMemberRole(id, userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["group-members", id] });
        },
    });

    const kickMemberMutation = useMutation({
        mutationFn: (userId) => api.groups.kickMember(id, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["group-members", id] });
            queryClient.invalidateQueries({ queryKey: ["group", id] });
            queryClient.invalidateQueries({ queryKey: ["group-posts", id] });
            toast("Member removed successfully!", "success");
        },
        onError: (err) => {
            toast(getApiErrorMessage(err, "Failed to remove member"), "error");
        }
    });

    const leaveGroupMutation = useMutation({
        mutationFn: () => api.groups.kickMember(id, currentUserId),
        onSuccess: () => {
            toast("You have left the group successfully!", "success");
            navigate("/groups");
        },
        onError: (err) => {
            toast(getApiErrorMessage(err, "Failed to leave group"), "error");
        }
    });
    
    const deleteGroupMutation = useMutation({
        mutationFn: () => api.groups.deleteGroup(id),
        onSuccess: () => navigate("/groups"),
    });

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

    const handleSend = () => {
        if (!messageText.trim() && !attachment) return;
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setIsWeTyping(false);
        if (window.socket && id) {
            window.socket.emit('typing', { groupId: id, isTyping: false });
        }

        createPostMutation.mutate({ caption: messageText.trim(), image: attachment, replyToId: replyToMsg?.id });
    };

    const handleSendVoiceNote = async (audioBlob) => {
        const audioFile = new File([audioBlob], 'voice_note.webm', { type: 'audio/webm' });
        createPostMutation.mutate({ caption: '', image: audioFile, replyToId: replyToMsg?.id });
    };

    const handleSendSticker = async (stickerUrl) => {
        setIsEmojiPickerOpen(false);
        createPostMutation.mutate({ caption: '', image: { url: stickerUrl }, replyToId: replyToMsg?.id });
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

    const getDateLabel = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "";
        const diff = new Date().getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return "Today";
        if (days === 1) return "Yesterday";
        return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    };

    const getTimeLabel = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "";
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    if (isGroupLoading) return (<div className="h-[100dvh] w-full bg-[#030303] flex items-center justify-center"><div className="w-16 h-16 rounded-2xl bg-white/5 animate-pulse border border-white/10 flex items-center justify-center text-3xl font-serif text-white/20">G</div></div>);
    
    if (!group) return (
        <div className="h-[100dvh] w-full bg-[#030303] flex flex-col items-center justify-center py-32 text-white">
            <h2 className="font-serif text-3xl mb-6">Group not found</h2>
            <button onClick={() => navigate("/groups")} className="px-8 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5">Return to groups</button>
        </div>
    );

    return (
        <div className="h-[100dvh] w-full bg-[#030303] text-white flex flex-col overflow-hidden">
            {/* Header Area */}
            <div className="relative shrink-0 border-b border-white/5">
                <img src={group.imageUrl} alt={group.name} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                {isAdmin && (
                    <label className="absolute right-4 top-4 z-[40] p-2 bg-black/60 hover:bg-black/80 border border-white/10 text-white rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-lg">
                        <Camera size={14} /> Update Cover
                        <input type="file" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) updateGroupMutation.mutate({ file });
                        }} className="hidden" accept="image/*" />
                    </label>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent" />
                <div className="relative w-full p-4 md:p-6 flex flex-col gap-4">
                    <button onClick={() => navigate("/groups")} className="flex items-center gap-3 text-white/60 hover:text-white transition-all w-fit">
                        <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10"><ArrowLeft size={16} /></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back</span>
                    </button>
                    
                    <div className="flex items-end justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="font-serif text-3xl md:text-4xl font-bold text-white truncate mb-2">{group.name}</h1>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5 text-xs text-white/60 font-bold uppercase tracking-widest"><Users size={12} /> {members?.length || 0} Members</span>
                                <span className="flex items-center gap-1.5 text-xs text-white/60 font-bold uppercase tracking-widest">{group.privacy === "public" ? <Globe size={12} className="text-primary" /> : <Lock size={12} className="text-accent" />} {group.privacy}</span>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            {isMember && !isAdmin && (
                                <button onClick={() => leaveGroupMutation.mutate()} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-colors" title="Leave Group">
                                    <LogOut size={18} />
                                </button>
                            )}
                            {isAdmin && (
                                <button onClick={() => deleteGroupMutation.mutate()} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-colors" title="Delete Group">
                                    <Trash2 size={18} />
                                </button>
                            )}
                            {isAdmin && (
                                <button onClick={() => setActiveTab("admin")} className={`p-3 rounded-xl border transition-colors ${activeTab === "admin" ? "bg-primary text-black border-primary" : "bg-white/10 text-white hover:bg-white/20 border-white/10"}`} title="Admin Settings">
                                    <Shield size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none border-b border-white/5 shrink-0">
                {["chat", "members", "about"].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {activeTab === "chat" && (
                        <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
                            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-6 py-4" onClick={() => setActiveMessageMenu(null)}>
                                <div className="space-y-3 pb-4">
                                    {isPostsLoading ? (
                                        <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
                                    ) : sortedMessages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center text-white/40">
                                            <Sparkles size={32} className="mb-4 text-white/20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">No messages yet</p>
                                        </div>
                                    ) : (
                                        sortedMessages.map((msg, index) => {
                                            const mine = String(msg.author?.id) === String(currentUserId);
                                            const msgDate = msg.createdAt || msg.created_at || "";
                                            const prevDate = index > 0 ? (sortedMessages[index - 1].createdAt || sortedMessages[index - 1].created_at || "") : "";
                                            const showDate = index === 0 || getDateLabel(msgDate) !== getDateLabel(prevDate);
                                            const repliedMsg = msg.replyToId ? sortedMessages.find(m => String(m.id) === String(msg.replyToId)) : null;

                                            // System messages simulation (if msg has no author or is flagged)
                                            if (msg.isSystem) {
                                                return (
                                                    <div key={msg.id} className="flex justify-center my-2">
                                                        <span className="px-3 py-1 bg-white/5 rounded-xl text-[10px] font-bold text-white/40">{msg.content}</span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <React.Fragment key={msg.id}>
                                                    {showDate && (
                                                        <div className="sticky top-2 z-10 my-3 flex justify-center">
                                                            <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/45 backdrop-blur">{getDateLabel(msgDate)}</span>
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
                                                        <div className={`flex max-w-[85%] gap-2 sm:max-w-[75%] ${mine ? "flex-row-reverse" : "flex-row"}`}>
                                                            {!mine && (
                                                                <div className="shrink-0 mt-auto mb-1">
                                                                    <Avatar src={msg.author?.avatarUrl} alt={msg.author?.fullName || msg.author?.username} label={msg.author?.fullName || msg.author?.username} className="h-7 w-7 rounded-full object-cover bg-white/10" />
                                                                </div>
                                                            )}
                                                            <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                                                                
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
                                                                                <button onClick={() => { deletePostMutation.mutate(msg.id); setActiveMessageMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg w-full text-left">
                                                                                    <Trash2 size={14} /> Delete
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {!mine && <span className="text-[10px] font-bold text-primary/70 px-2">{msg.author?.fullName || msg.author?.username || "Member"}</span>}

                                                                <div 
                                                                     onContextMenu={(e) => {
                                                                         e.preventDefault();
                                                                         setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id);
                                                                     }}
                                                                     className={`rounded-2xl px-3 py-2 shadow-md border cursor-pointer select-none transition-all duration-200 ${mine ? "bg-primary text-black border-primary/20 rounded-br-md active:scale-[0.99] hover:brightness-[0.98]" : "bg-[#111114] text-white border-white/10 rounded-bl-md active:scale-[0.99] hover:bg-[#151519]"}`}
                                                                 >
                                                                    {repliedMsg && (
                                                                        <div className={`mb-2 p-2 rounded-xl border-l-2 text-xs ${mine ? "bg-black/10 border-black text-black/70" : "bg-black/30 border-primary text-white/70"}`}>
                                                                            <span className={`font-bold block mb-1 ${mine ? "text-black" : "text-primary"}`}>{String(repliedMsg.author?.id) === String(currentUserId) ? "You" : repliedMsg.author?.fullName}</span>
                                                                            {repliedMsg.isDeleted ? <em className={mine ? "text-black/50 italic" : "text-white/40 italic"}>This message was deleted</em> : repliedMsg.content || "Media"}
                                                                        </div>
                                                                    )}

                                                                    {msg.isDeleted ? (
                                                                        <p className={`italic text-sm px-1 flex items-center gap-2 ${mine ? "text-black/50" : "text-white/40"}`}><Trash2 size={14}/> This message was deleted</p>
                                                                    ) : (
                                                                        <>
                                                                            {(() => {
                                                                                const mediaUrl = msg.imageUrl || msg.mediaUrl;
                                                                                if (!mediaUrl) return null;
                                                                                
                                                                                if (isImageUrl(mediaUrl)) {
                                                                                    return (
                                                                                        <img 
                                                                                            src={mediaUrl} 
                                                                                            className="max-h-64 rounded-xl mb-1 object-cover cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform" 
                                                                                            alt="" 
                                                                                            onClick={() => setSelectedMedia({ url: mediaUrl, type: 'image', name: msg.fileName || 'Image' })} 
                                                                                        />
                                                                                    );
                                                                                } else if (isVideoUrl(mediaUrl) || msg.videoUrl) {
                                                                                    const vUrl = msg.videoUrl || mediaUrl;
                                                                                    return (
                                                                                        <div className="relative group/video rounded-xl overflow-hidden mb-1">
                                                                                            <MediaPlayer url={vUrl} maxHeight="256px" autoPlayOnVisible={false} />
                                                                                            <button 
                                                                                                onClick={() => setSelectedMedia({ url: vUrl, type: 'video', name: msg.fileName || 'Video' })}
                                                                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/video:opacity-100 transition-opacity z-10 cursor-pointer"
                                                                                                title="View Fullscreen"
                                                                                            >
                                                                                                <Maximize2 size={14} />
                                                                                            </button>
                                                                                        </div>
                                                                                    );
                                                                                } else {
                                                                                    // It's a generic file attachment!
                                                                                    return (
                                                                                        <div className={`flex items-center gap-2 p-1.5 rounded-xl mb-1 ${mine ? "bg-black/10 text-black" : "bg-white/5 text-white"}`}>
                                                                                            <button 
                                                                                                onClick={(e) => {
                                                                                                    e.preventDefault();
                                                                                                    setSelectedMedia({ url: mediaUrl, type: 'file', name: msg.fileName || 'Attachment' });
                                                                                                }}
                                                                                                className="flex-1 flex items-center gap-2 p-1 text-left cursor-pointer hover:opacity-80 transition-all min-w-0"
                                                                                            >
                                                                                                <FileText size={20} className="shrink-0" />
                                                                                                <span className="text-sm truncate">{msg.fileName || "Attachment"}</span>
                                                                                            </button>
                                                                                            <button 
                                                                                                onClick={(e) => {
                                                                                                    e.preventDefault();
                                                                                                    fetch(mediaUrl)
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
                                                                                                            window.open(mediaUrl, '_blank');
                                                                                                        });
                                                                                                }}
                                                                                                className={`p-2 rounded-lg hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer ${mine ? "hover:bg-black/10 text-black" : "hover:bg-white/10 text-white"}`}
                                                                                                title="Download File"
                                                                                            >
                                                                                                <Download size={16} />
                                                                                            </button>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                            })()}
                                                                            {msg.videoUrl && !msg.imageUrl && !msg.mediaUrl && (
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
                                                                            {msg.audioUrl && (
                                                                                <AudioPlayer 
                                                                                    src={msg.audioUrl} 
                                                                                    mine={mine} 
                                                                                    senderAvatar={msg.author?.avatarUrl} 
                                                                                    senderName={msg.author?.fullName || msg.author?.username} 
                                                                                />
                                                                            )}
                                                                            {msg.stickerUrl && <img src={msg.stickerUrl} className="h-24 w-24 object-contain" alt="Sticker" />}
                                                                            {(msg.content || msg.caption) && <p className={`px-1 pt-1 text-[14px] leading-relaxed whitespace-pre-wrap ${mine ? "text-black" : "text-white"}`}>{msg.content || msg.caption}</p>}
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className={`flex items-center gap-1 px-2 text-[10px] ${mine ? "text-primary/70" : "text-white/40"}`}>
                                                                    <span>{msgDate ? getTimeLabel(msgDate) : ""}</span>
                                                                    {mine && !msg.isDeleted && <CheckCheck size={12} className="text-blue-500" />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                    {typingMembersNames.length > 0 && (
                                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-zinc-400 text-xs w-fit max-w-[280px] mb-2 ml-4 animate-in fade-in zoom-in duration-200">
                                            <span>{typingMembersNames.length === 1 ? `${typingMembersNames[0]} is typing` : 'Several people are typing'}</span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce"></span>
                                        </div>
                                    )}
                                    <div ref={bottomRef} />
                                </div>
                            </div>

                            {/* Reply Indicator UI */}
                            <AnimatePresence>
                                {replyToMsg && (
                                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="absolute bottom-20 left-0 w-full px-4 z-20">
                                        <div className="bg-[#111114] border border-white/10 rounded-xl p-3 flex items-start justify-between shadow-2xl backdrop-blur-xl">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Reply size={14} className="text-primary" />
                                                    <span className="text-xs font-bold text-primary">Replying to {String(replyToMsg.author?.id) === String(currentUserId) ? "yourself" : replyToMsg.author?.fullName}</span>
                                                </div>
                                                <p className="text-sm text-white/70 truncate">{replyToMsg.isDeleted ? "Deleted message" : replyToMsg.content || "Media"}</p>
                                            </div>
                                            <button onClick={() => setReplyToMsg(null)} className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white shrink-0"><X size={16} /></button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Chat Input Footer */}
                            {isMember ? (
                                <footer className="bg-[#0a0a0c]/95 border-t border-white/5 px-2 py-2 shrink-0 z-30 relative flex flex-col gap-2">
                                    {attachmentPreview && (
                                        <div className="mx-2 mb-2 w-fit relative">
                                            {attachment?.type?.startsWith("video/") ? <video src={attachmentPreview} className="h-28 rounded-lg border border-white/10" /> : <img src={attachmentPreview} className="h-28 rounded-lg border border-white/10 object-cover" alt="" />}
                                            <button onClick={clearAttachment} className="absolute -top-2 -right-2 h-7 w-7 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={14} /></button>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-end gap-1 sm:gap-2">
                                        <div className="relative shrink-0 flex gap-1">
                                            <button onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)} className="h-11 w-11 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center">
                                                <Plus size={22} className={`transition-transform ${isAttachMenuOpen ? "rotate-45" : ""}`} />
                                            </button>
                                            
                                            <AnimatePresence>
                                                {isAttachMenuOpen && (
                                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }} className="absolute bottom-14 left-0 rounded-2xl border border-white/10 bg-[#111114] p-2 shadow-2xl flex gap-2">
                                                        <button onClick={() => fileInputRef.current?.click()} className="h-11 w-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center"><ImageIcon size={20} /></button>
                                                        <button onClick={() => { setIsAttachMenuOpen(false); setIsCameraModalOpen(true); }} className="h-11 w-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center"><Camera size={20} /></button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,video/*" />

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
                                                        if (id && window.socket) {
                                                            if (!isWeTyping) {
                                                                setIsWeTyping(true);
                                                                window.socket.emit('typing', { groupId: id, isTyping: true });
                                                            }
                                                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                                            typingTimeoutRef.current = setTimeout(() => {
                                                                setIsWeTyping(false);
                                                                window.socket.emit('typing', { groupId: id, isTyping: false });
                                                            }, 2000);
                                                        }
                                                    }} 
                                                    onKeyDown={handleKeyPress} 
                                                    onFocus={() => setIsEmojiPickerOpen(false)}
                                                    placeholder="Type a message..." 
                                                    className="min-h-[44px] max-h-32 w-full bg-transparent px-2 py-3 text-[14px] text-white placeholder:text-white/35 outline-none resize-none hide-scrollbar"
                                                    rows={1}
                                                />
                                                
                                                {(!messageText.trim() && !attachment) ? (
                                                    <button onClick={() => setIsVoiceRecording(true)} disabled={createPostMutation.isPending} className="h-11 w-11 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors shrink-0">
                                                        <Mic size={20} />
                                                    </button>
                                                ) : (
                                                    <button onClick={handleSend} disabled={createPostMutation.isPending} className="h-9 w-9 mr-1 mb-1 rounded-full bg-primary text-black flex items-center justify-center disabled:opacity-40 shrink-0 self-end">
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
                            ) : !isPending ? (
                                <div className="bg-[#0a0a0c]/95 border-t border-white/5 px-4 py-4 text-center shrink-0">
                                    <button onClick={() => { group.privacy === "private" ? setIsJoinModalOpen(true) : joinMutation.mutate(undefined); }} className="px-8 py-3 bg-white text-black rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-zinc-200 transition-all w-full md:w-auto">
                                        {group.privacy === "private" ? "Request to Join" : "Join Group to Chat"}
                                    </button>
                                </div>
                            ) : null}
                        </motion.div>
                    )}

                    {activeTab === "members" && (
                        <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                            {members?.map((m) => (
                                <div key={m.id} className="bg-white/5 border border-white/10 p-4 flex items-center justify-between gap-4 rounded-2xl">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <Avatar src={m.user?.profile?.profile_picture || m.user?.avatarUrl} alt={m.user?.username} label={m.user?.username} className="w-12 h-12 rounded-xl object-cover" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-bold truncate">{m.user?.profile?.full_name || m.user?.fullName || m.user?.username}</p>
                                            <p className="text-[9px] font-black text-primary uppercase tracking-widest">{m.role}</p>
                                        </div>
                                    </div>
                                    {isAdmin && String(m.user_id) !== String(currentUserId) && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            {m.role !== "admin" && (
                                                <button 
                                                    onClick={() => makeAdminMutation.mutate(m.user_id)}
                                                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer active:scale-95"
                                                >
                                                    Make Admin
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to remove ${m.user?.profile?.full_name || m.user?.username}?`)) {
                                                        kickMemberMutation.mutate(m.user_id);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer active:scale-95"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === "about" && (
                        <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto p-6 space-y-8">
                            <div>
                                <h4 className="text-white font-serif text-2xl mb-4">Description</h4>
                                <p className="text-white/60 leading-relaxed text-sm">{group.description || "No description provided."}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Created</p>
                                    <p className="text-white text-sm font-bold">{new Date(group.created_at || Date.now()).toLocaleDateString()}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Privacy</p>
                                    <p className="text-primary text-sm font-bold uppercase">{group.privacy}</p>
                                </div>
                            </div>
                            
                            {isMember && !isAdmin && (
                                <button 
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to leave this group?")) {
                                            leaveGroupMutation.mutate();
                                        }
                                    }}
                                    className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    Exit Group
                                </button>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "admin" && isAdmin && (
                        <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto p-4 space-y-6">
                            {/* Group Info Settings (WhatsApp style) */}
                            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 shadow-xl">
                                <h3 className="text-white font-serif text-xl mb-1">Group Settings</h3>
                                <p className="text-xs text-white/40 uppercase tracking-widest font-black mb-6">Manage group details and privacy</p>
                                
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Group Name</label>
                                        <input 
                                            type="text" 
                                            value={editName} 
                                            onChange={(e) => setEditName(e.target.value)} 
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/30 transition-all font-semibold"
                                            placeholder="Group Name" 
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Description</label>
                                        <textarea 
                                            value={editDescription} 
                                            onChange={(e) => setEditDescription(e.target.value)} 
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/30 transition-all resize-none font-medium leading-relaxed"
                                            placeholder="Describe the group purpose..." 
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Group Privacy</label>
                                        <select 
                                            value={editPrivacy} 
                                            onChange={(e) => setEditPrivacy(e.target.value)} 
                                            className="w-full bg-[#111114] border border-white/5 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-primary/30 transition-all"
                                        >
                                            <option value="public">Public (anyone can find and join)</option>
                                            <option value="private">Private (requires approval to join)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Group Profile Picture</label>
                                        <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <Avatar src={group.imageUrl} alt={group.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                                            <label className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer hover:scale-105 active:scale-95 transition-all">
                                                <Camera size={14} /> Change Avatar
                                                <input 
                                                    type="file" 
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) updateGroupMutation.mutate({ file });
                                                    }} 
                                                    className="hidden" 
                                                    accept="image/*" 
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => updateGroupMutation.mutate({ name: editName, description: editDescription, privacy: editPrivacy })} 
                                        disabled={updateGroupMutation.isPending}
                                        className="w-full py-4 mt-2 bg-primary text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                    >
                                        {updateGroupMutation.isPending ? "Saving..." : "Save Settings"}
                                    </button>
                                </div>
                            </div>

                            {/* Pending Requests */}
                            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 shadow-xl">
                                <h3 className="text-white font-serif text-xl mb-1">Pending Requests</h3>
                                <p className="text-xs text-white/40 uppercase tracking-widest font-black mb-6">Review membership requests</p>
                                
                                {requests?.length === 0 ? (
                                    <p className="text-white/40 text-sm py-4">No pending requests</p>
                                ) : (
                                    <div className="space-y-4">
                                        {requests?.map((req) => (
                                            <div key={req.id} className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={req.user?.profile?.profile_picture} className="w-10 h-10 rounded-xl" />
                                                    <div>
                                                        <p className="text-white text-sm font-bold">{req.user?.username}</p>
                                                        {req.message && (
                                                            <p className="text-[10px] text-white/70 italic mt-1">&quot;{req.message}&quot;</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => approveMutation.mutate({ requestId: req.id, status: "accepted" })} className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg hover:scale-105 active:scale-95 transition-transform"><Check size={16}/></button>
                                                    <button onClick={() => approveMutation.mutate({ requestId: req.id, status: "rejected" })} className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:scale-105 active:scale-95 transition-transform"><X size={16}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isJoinModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsJoinModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-[2rem] p-6 shadow-2xl">
                            <h2 className="text-xl font-serif text-white mb-4">Join Private Group</h2>
                            <textarea value={joinMessage} onChange={(e) => setJoinMessage(e.target.value)} placeholder="Why do you want to join this group? (Optional)" rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6 resize-none focus:outline-none focus:border-primary/30" />
                            <button onClick={() => { joinMutation.mutate({ message: joinMessage }); setIsJoinModalOpen(false); }} className="w-full py-3 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-xs">Submit Request</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
