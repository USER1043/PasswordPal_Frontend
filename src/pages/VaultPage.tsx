// ============================================================================
// VaultPage — Real encrypted vault data from backend via Rust decryption
// ============================================================================
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, Shield, Settings, AlertTriangle,
  LayoutGrid, List, ChevronRight, Loader2,
} from "lucide-react";
import PasswordItem from "../components/PasswordItem";
import AddPasswordModal, { type PasswordData } from "../components/AddPasswordModal";
import * as vaultService from "../services/vaultService";
import type { DecryptedVaultItem, VaultEntry } from "../services/vaultService";
import { useNotification } from "../context/NotificationContext";

interface VaultPageProps {
  onNavigate: (view: string) => void;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
}

/** Convert a DecryptedVaultItem to the PasswordData shape the UI components expect */
function toPasswordData(item: DecryptedVaultItem): PasswordData {
  return {
    id: item.id,
    name: item.name,
    username: item.username,
    password: item.password,
    url: item.website_url,
    folder: item.folder_name,
    notes: item.notes,
    version: item.version,
    updated_at: item.updated_at,
  };
}

/** Convert PasswordData from the form to a VaultEntry for Rust encryption */
function toVaultEntry(data: PasswordData): VaultEntry {
  return {
    name: data.name,
    username: data.username,
    password: data.password,
    website_url: data.url || "",
    folder_name: data.folder || "",
    tags: [],
    notes: data.notes || "",
  };
}

export default function VaultPage({ onNavigate, showAddModal, setShowAddModal }: VaultPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [editingPassword, setEditingPassword] = useState<PasswordData | null>(null);
  const [passwords, setPasswords] = useState<PasswordData[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error: notifyError } = useNotification();

  // Use refs for notification functions to avoid re-triggering loadVault
  const notifyErrorRef = useRef(notifyError);
  notifyErrorRef.current = notifyError;

  const loadVault = useCallback(async () => {
    setLoading(true);
    try {
      const items = await vaultService.fetchVault();
      setPasswords(items.map(toPasswordData));
    } catch (err: unknown) {
      console.error("Failed to load vault:", err);
      notifyErrorRef.current("Failed to load vault data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  // Derive folders dynamically from actual data
  const folderNames = [...new Set(passwords.map((p) => p.folder).filter(Boolean))] as string[];
  const folders = [
    { id: "all", name: "All Items", count: passwords.length, icon: "🔐" },
    ...folderNames.map((f) => ({
      id: f.toLowerCase(),
      name: f,
      count: passwords.filter((p) => p.folder === f).length,
      icon: f === "Work" ? "💼" : f === "Finance" ? "💰" : f === "Social" ? "🌐" : "👤",
    })),
  ];

  const filteredPasswords = passwords.filter((pwd) => {
    const matchesSearch =
      pwd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pwd.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder =
      selectedFolder === "all" ||
      pwd.folder?.toLowerCase() === selectedFolder.toLowerCase();
    return matchesSearch && matchesFolder;
  });

  const handleSavePassword = async (data: PasswordData) => {
    try {
      const entry = toVaultEntry(data);
      if (editingPassword?.id) {
        await vaultService.saveEntry(entry, editingPassword.id, (editingPassword as unknown as { version?: number }).version);
      } else {
        await vaultService.saveEntry(entry);
      }
      setEditingPassword(null);
      setShowAddModal(false);
      success(editingPassword ? "Password updated" : "Password saved");
      await loadVault();
    } catch (err: unknown) {
      console.error("Save failed:", err);
      if ((err as { response?: { status?: number } }).response?.status === 409) {
        notifyError("Version conflict — someone else modified this entry. Please refresh.");
      } else {
        notifyError("Failed to save password");
      }
    }
  };

  const handleEdit = (id: string) => {
    const pwd = passwords.find((p) => p.id === id);
    if (pwd) {
      setEditingPassword(pwd);
      setShowAddModal(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this password?")) return;
    try {
      await vaultService.deleteEntry(id);
      success("Password deleted");
      await loadVault();
    } catch (err) {
      console.error("Delete failed:", err);
      notifyError("Failed to delete password");
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 1) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Top Nav */}
      <div className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">My Vault</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate("settings")}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 sticky top-6">
              {/* Quick Stats */}
              <div className="mb-6 p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-semibold">Vault Items</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{passwords.length}</div>
                <div className="text-xs text-slate-400">
                  {passwords.length === 0 ? "Add your first password" : "Secured credentials"}
                </div>
              </div>

              {/* Folders */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
                  Folders
                </div>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${selectedFolder === folder.id
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "text-slate-300 hover:bg-slate-700/50"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{folder.icon}</span>
                      <span className="font-medium">{folder.name}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${selectedFolder === folder.id
                        ? "bg-purple-500/30 text-purple-200"
                        : "bg-slate-700 text-slate-400"
                        }`}
                    >
                      {folder.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
                  Quick Actions
                </div>
                <button
                  onClick={() => onNavigate("generator")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-700/50 rounded-xl transition-all"
                >
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">Password Generator</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
                <button
                  onClick={() => onNavigate("security")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-700/50 rounded-xl transition-all"
                >
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Security Dashboard</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {/* Search Bar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search passwords..."
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-3 rounded-xl transition-all ${viewMode === "list"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50"
                    }`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-3 rounded-xl transition-all ${viewMode === "grid"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50"
                    }`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => {
                  setEditingPassword(null);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-purple-500/50"
              >
                <Plus className="w-5 h-5" />
                Add Password
              </button>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                <span className="ml-4 text-slate-400 text-lg">Decrypting vault...</span>
              </div>
            ) : filteredPasswords.length === 0 ? (
              <div className="text-center py-20">
                <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">
                  No passwords found
                </h3>
                <p className="text-slate-500 mb-6">
                  {searchQuery
                    ? "Try a different search term"
                    : "Add your first password to get started"}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Password
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="text-sm text-slate-400 mb-4">
                  {filteredPasswords.length} password
                  {filteredPasswords.length !== 1 ? "s" : ""} found
                </div>
                {viewMode === "list" ? (
                  <div className="space-y-3">
                    {filteredPasswords.map((pwd) => (
                      <PasswordItem
                        key={pwd.id}
                        id={pwd.id!}
                        name={pwd.name}
                        username={pwd.username}
                        password={pwd.password}
                        url={pwd.url}
                        folder={pwd.folder}
                        lastModified={formatRelativeTime(pwd.updated_at)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {filteredPasswords.map((pwd) => (
                      <PasswordItem
                        key={pwd.id}
                        id={pwd.id!}
                        name={pwd.name}
                        username={pwd.username}
                        password={pwd.password}
                        url={pwd.url}
                        folder={pwd.folder}
                        lastModified={formatRelativeTime(pwd.updated_at)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AddPasswordModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingPassword(null);
        }}
        onSave={handleSavePassword}
        editData={editingPassword}
      />
    </div>
  );
}
