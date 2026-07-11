"use client";

import { useState, useEffect } from "react";
import { Bell, Send, Users, Filter, User, X, CheckCircle } from "lucide-react";

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Form state
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [targetType, setTargetType] = useState("ALL");
    const [targetFilter, setTargetFilter] = useState("");

    // Users list for SPECIFIC targeting
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [userSearch, setUserSearch] = useState("");

    useEffect(() => {
        fetchNotifications();
        fetchUsers();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/admin/notifications");
            if (res.ok) setNotifications(await res.json());
        } catch (e) {
            console.error("Failed to fetch notifications", e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setAllUsers(Array.isArray(data) ? data : data.users || []);
            }
        } catch (e) {
            console.error("Failed to fetch users", e);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        setIsSending(true);
        try {
            let filter = "";
            if (targetType === "PLAN") filter = targetFilter;
            if (targetType === "SPECIFIC") filter = selectedUsers.join(",");

            const res = await fetch("/api/admin/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, message, targetType, targetFilter: filter })
            });

            if (!res.ok) throw new Error("Failed to send notification");

            // Reset form
            setTitle("");
            setMessage("");
            setTargetType("ALL");
            setTargetFilter("");
            setSelectedUsers([]);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            fetchNotifications();
        } catch (e: any) {
            alert("Failed: " + e.message);
        } finally {
            setIsSending(false);
        }
    };

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const filteredUsers = allUsers.filter(u =>
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
    );

    const getTargetLabel = (n: any) => {
        if (n.targetType === "ALL") return "All Users";
        if (n.targetType === "PLAN") return `${n.targetFilter} Plan Users`;
        if (n.targetType === "SPECIFIC") {
            const count = n.targetFilter?.split(",").length || 0;
            return `${count} Specific User${count !== 1 ? "s" : ""}`;
        }
        return "Unknown";
    };

    return (
        <div className="p-6 space-y-8 bg-zinc-950 min-h-[calc(100vh-64px)] text-white">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bell className="w-6 h-6 text-red-500" />
                    Push Notifications
                </h1>
                <p className="text-gray-400 text-sm mt-1">Send announcements and updates to your users.</p>
            </div>

            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Notification sent successfully!</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Create Notification Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSend} className="bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-5">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            <Send className="w-4 h-4 text-red-500" />
                            Compose Notification
                        </h2>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. New Feature Released!"
                                className="w-full bg-zinc-800 border border-white/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 transition-colors"
                                required
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Message</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Write your notification message here..."
                                rows={4}
                                className="w-full bg-zinc-800 border border-white/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 transition-colors resize-none"
                                required
                            />
                        </div>

                        {/* Target Audience */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                                <Filter className="w-3.5 h-3.5" />
                                Target Audience
                            </label>
                            <select
                                value={targetType}
                                onChange={e => { setTargetType(e.target.value); setTargetFilter(""); setSelectedUsers([]); }}
                                className="w-full bg-zinc-800 border border-white/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 transition-colors"
                            >
                                <option value="ALL">All Users</option>
                                <option value="PLAN">By Plan Type</option>
                                <option value="SPECIFIC">Specific Users</option>
                            </select>
                        </div>

                        {/* Plan Filter */}
                        {targetType === "PLAN" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Select Plan</label>
                                <select
                                    value={targetFilter}
                                    onChange={e => setTargetFilter(e.target.value)}
                                    className="w-full bg-zinc-800 border border-white/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 transition-colors"
                                    required
                                >
                                    <option value="">Choose a plan...</option>
                                    <option value="FREE">Free</option>
                                    <option value="PRO">Pro</option>
                                    <option value="STARTER">Starter</option>
                                </select>
                            </div>
                        )}

                        {/* Specific Users */}
                        {targetType === "SPECIFIC" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Select Users ({selectedUsers.length} selected)
                                </label>
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full bg-zinc-800 border border-white/10 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-red-500 transition-colors mb-2"
                                />
                                <div className="max-h-48 overflow-y-auto border border-white/10 rounded-lg bg-zinc-800">
                                    {filteredUsers.slice(0, 30).map(user => (
                                        <label
                                            key={user.id}
                                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${selectedUsers.includes(user.id) ? "bg-red-500/10" : ""}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => toggleUser(user.id)}
                                                className="accent-red-500 w-4 h-4"
                                            />
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-gray-200 truncate">{user.full_name || "Unnamed"}</div>
                                                <div className="text-[10px] text-gray-500 truncate">{user.email}</div>
                                            </div>
                                        </label>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <div className="p-3 text-center text-xs text-gray-500">No users found</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Send Button */}
                        <button
                            type="submit"
                            disabled={isSending || !title.trim() || !message.trim()}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSending ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Notification
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Notification History */}
                <div className="lg:col-span-3">
                    <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h2 className="font-semibold text-lg">Sent Notifications</h2>
                            <p className="text-xs text-gray-500 mt-0.5">History of all notifications sent to users</p>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-12 text-center text-gray-500 text-sm">
                                No notifications sent yet. Compose one to get started.
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map(n => (
                                    <div key={n.id} className="p-4 hover:bg-white/5 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-medium text-gray-200 text-sm">{n.title}</h3>
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                                                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {getTargetLabel(n)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                                                    <span>•</span>
                                                    <span>{n._count?.dismissals || 0} dismissed</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
