"use client";

import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import {
  User, Briefcase, GraduationCap, Code2,
  Plus, Trash2, Save, Loader2, Link as LinkIcon,
  Mail, Phone, MapPin, Globe, Layout, X, ChevronDown, Check, Crown, FileText,
  FolderGit2, Award, Languages, Upload, AlertTriangle, CheckCircle2, AlertCircle
} from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// --- TYPES & SCHEMA (Matches Database) ---
type Experience = { id: string; company: string; role: string; location: string; startDate: string; endDate: string; description: string; };
type Education = { id: string; school: string; degree: string; field: string; startDate: string; endDate: string; grade: string; };
type Project = { id: string; name: string; techStack: string; link: string; description: string; };
type Certification = { id: string; name: string; issuer: string; date: string; url: string; };
type Language = { id: string; name: string; proficiency: string; };

export type ResumeData = {
  fullName: string; jobTitle: string; email: string; phone: string; location: string; website: string; linkedin: string; github: string;
  summary: string;
  skills: { technical: string; soft: string; };
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
};

const INITIAL_STATE: ResumeData = {
  fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "", linkedin: "", github: "",
  summary: "",
  skills: { technical: "", soft: "" },
  experience: [], education: [], projects: [], certifications: [], languages: []
};

// --- CONTEXT ---
type ProfileContextType = {
  data: ResumeData;
  updateField: (field: keyof ResumeData, value: string) => void;
  updateNested: (parent: "skills", field: string, value: string) => void;
  addListItem: (list: "experience" | "education" | "projects" | "certifications" | "languages", item: any) => void;
  updateListItem: (list: "experience" | "education" | "projects" | "certifications" | "languages", index: number, field: string, value: string) => void;
  removeListItem: (list: "experience" | "education" | "projects" | "certifications" | "languages", index: number) => void;
  activeSection: string;
  setActiveSection: (sec: string) => void;
  isSaving: boolean;
  handleSave: (options?: { silentSuccess?: boolean }) => void;
  isLoading: boolean;
  profiles: any[];
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string) => void;
  createNewProfile: (name?: string, parsed_data?: any) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  loadFromPdf: (file: File) => Promise<void>;
  subscription: any;
  showFeedback: (
    type: "confirm" | "success" | "error" | "loading" | "analyzing",
    title: string,
    message: string,
    onConfirm?: () => void,
    options?: { confirmLabel?: string; cancelLabel?: string; iconType?: "confirm" | "success" | "error" | "loading" | "analyzing" }
  ) => void;
  hideFeedback: () => void;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be within ProfileProvider");
  return ctx;
}

// --- PROVIDER ---
function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ResumeData>(INITIAL_STATE);
  const [activeSection, setActiveSection] = useState("Personal Info");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const dataRef = useRef<ResumeData>(INITIAL_STATE);
  const selectedProfileIdRef = useRef<string | null>(null);

  // --- FEEDBACK MODAL STATE ---
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: "confirm" | "success" | "error" | "loading" | "analyzing";
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    iconType?: "confirm" | "success" | "error" | "loading" | "analyzing";
  }>({ isOpen: false, type: "loading", title: "", message: "" });

  const showFeedback = (
    type: "confirm" | "success" | "error" | "loading" | "analyzing",
    title: string,
    message: string,
    onConfirm?: () => void,
    options?: { confirmLabel?: string; cancelLabel?: string; iconType?: "confirm" | "success" | "error" | "loading" | "analyzing" }
  ) => {
    setFeedback({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
      iconType: options?.iconType,
    });
  };
  const hideFeedback = () => setFeedback(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    selectedProfileIdRef.current = selectedProfileId;
  }, [selectedProfileId]);

  const createNewProfile = async (name?: string, parsed_data?: any) => {
    try {
      const createRes = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || `Profile ${profiles.length + 1}`, parsed_data: parsed_data || INITIAL_STATE })
      });
      const createJson = await createRes.json();
      if (createJson.profile) {
        setProfiles(prev => [...prev, createJson.profile]);
        setSelectedProfileId(createJson.profile.id);
      } else {
        throw new Error(createJson.error || createJson.message || "Failed to create profile");
      }
    } catch (err: any) {
      console.error("Failed to create profile", err);
      throw err;
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [profRes, subRes] = await Promise.all([
          fetch("/api/profiles"),
          fetch("/api/subscription")
        ]);

        const json = await profRes.json();
        const subData = await subRes.json();

        setSubscription(subData);
        setProfiles(json.profiles || []);

        if (json.profiles?.length > 0) {
          const defaultProf = json.profiles.find((p: any) => p.is_default) || json.profiles[0];
          setSelectedProfileId(defaultProf.id);
        } else {
          const createRes = await fetch("/api/profiles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Primary Profile", parsed_data: INITIAL_STATE })
          });
          const createJson = await createRes.json();
          if (createJson.profile) {
            setProfiles([createJson.profile]);
            setSelectedProfileId(createJson.profile.id);
          }
        }
      } catch (err) {
        console.error("Failed to load init data", err);
      }
    };
    init();
  }, []);

  const deleteProfile = async (id: string) => {
    if (profiles.length <= 1) {
      throw new Error("Cannot delete your only profile");
    }

    try {
      const deleteRes = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      if (!deleteRes.ok) {
        const err = await deleteRes.json();
        throw new Error(err.error || "Failed to delete profile");
      }

      const updatedProfiles = profiles.filter(p => p.id !== id);
      setProfiles(updatedProfiles);

      if (selectedProfileId === id) {
        const newSelected = updatedProfiles.find(p => p.is_default) || updatedProfiles[0];
        setSelectedProfileId(newSelected.id);
      }
    } catch (err: any) {
      console.error("Failed to delete profile", err);
      throw err;
    }
  };

  const loadFromPdf = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const parseRes = await fetch("/api/profiles/parse", {
        method: "POST",
        body: formData,
      });

      if (!parseRes.ok) throw new Error("Failed to parse resume");

      const parsedJson = await parseRes.json();
      const extractedData = parsedJson.data;

      if (extractedData) {
        setData({ ...INITIAL_STATE, ...extractedData });
      }
    } catch (err) {
      console.error(err);
      throw new Error("There was an error parsing the resume. Please try again.");
    }
  };

  useEffect(() => {
    if (!selectedProfileId) return;
    setIsLoading(true);
    // Clear data immediately to prevent ghosting from previous profile
    setData(INITIAL_STATE);

    fetch(`/api/profiles/${selectedProfileId}`)
      .then(r => r.json())
      .then(res => {
        if (res.profile?.parsed_data && Object.keys(res.profile.parsed_data).length > 0) {
          setData({ ...INITIAL_STATE, ...res.profile.parsed_data });
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [selectedProfileId]);

  const handleSave = async (options?: { silentSuccess?: boolean }) => {
    const profileId = selectedProfileIdRef.current;
    if (!profileId) return;

    setIsSaving(true);
    showFeedback("loading", "Saving Profile", "Updating your master dataset...");
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsed_data: dataRef.current }),
      });
      if (!res.ok) throw new Error("Save failed");
      if (options?.silentSuccess) {
        hideFeedback();
      } else {
        showFeedback("success", "Profile Saved", "Your master dataset has been updated successfully.");
      }
    } catch (error) {
      showFeedback("error", "Save Failed", "There was an error saving your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ResumeData, value: string) => setData(prev => ({ ...prev, [field]: value }));
  const updateNested = (parent: "skills", field: string, value: string) => setData(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
  const addListItem = (list: "experience" | "education" | "projects" | "certifications" | "languages", item: any) => setData(prev => ({ ...prev, [list]: [...prev[list], item] as any }));
  const updateListItem = (list: "experience" | "education" | "projects" | "certifications" | "languages", index: number, field: string, value: string) => {
    setData(prev => {
      const arr = [...prev[list]];
      arr[index] = { ...arr[index], [field]: value } as any;
      return { ...prev, [list]: arr };
    });
  };
  const removeListItem = (list: "experience" | "education" | "projects" | "certifications" | "languages", index: number) => setData(prev => ({ ...prev, [list]: prev[list].filter((_, i) => i !== index) as any }));

  return (
    <ProfileContext.Provider value={{ data, updateField, updateNested, addListItem, updateListItem, removeListItem, activeSection, setActiveSection, isSaving, handleSave, isLoading, profiles, selectedProfileId, setSelectedProfileId, createNewProfile, deleteProfile, loadFromPdf, subscription, showFeedback, hideFeedback }}>
      {children}

      {/* GLOBAL FEEDBACK MODAL */}
      {feedback.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={feedback.type === 'loading' || feedback.type === 'analyzing' ? undefined : hideFeedback} />
          <div className="relative bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-scale-in flex flex-col items-center text-center">

            {/* Animated Icon Container */}
            <div className={`rounded-full flex items-center justify-center ${feedback.type === 'analyzing' ? 'w-64 h-64 -mt-8 -mb-12' : 'w-16 h-16 mb-6'}`}>
              {feedback.type === "analyzing" && (
                <div className="w-full h-full relative" style={{ filter: 'drop-shadow(0 0 15px var(--primary)) hue-rotate(15deg) contrast(1.2)' }}>
                  <DotLottieReact src="/file-search.lottie" loop autoplay />
                </div>
              )}
              {feedback.type === "loading" && (
                <div className="bg-[var(--primary)]/10 text-[var(--primary)] w-full h-full rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              {feedback.type === "success" && (
                <div className="bg-green-500/10 text-green-500 w-full h-full rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}
              {feedback.type === "error" && (
                <div className="bg-red-500/10 text-red-500 w-full h-full rounded-full flex items-center justify-center animate-pulse">
                  <AlertCircle className="w-8 h-8" />
                </div>
              )}
              {(feedback.iconType || feedback.type) === "confirm" && (
                <div className="bg-yellow-500/10 text-yellow-500 w-full h-full rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              )}
              {(feedback.iconType || feedback.type) === "success" && (
                <div className="bg-green-500/10 text-green-500 w-full h-full rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}
            </div>

            <h3 className="text-2xl font-bold text-[var(--foreground)] font-heading mb-3">{feedback.title}</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8">{feedback.message}</p>

            {feedback.type === "confirm" && (
              <div className="flex gap-4 w-full">
                <button onClick={hideFeedback} className="flex-1 py-3.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--border-color)] rounded-xl text-[var(--foreground)] text-xs tracking-wider uppercase font-bold transition-all">
                  {feedback.cancelLabel || "Cancel"}
                </button>
                <button
                  onClick={() => {
                    hideFeedback();
                    if (feedback.onConfirm) feedback.onConfirm();
                  }}
                  className="flex-1 py-3.5 bg-[var(--primary)] text-[var(--background)] rounded-xl text-xs tracking-wider uppercase font-bold hover:bg-[var(--primary)]/90 transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                >
                  {feedback.confirmLabel || "Confirm"}
                </button>
              </div>
            )}

            {(feedback.type === "success" || feedback.type === "error") && (
              <button
                onClick={hideFeedback}
                className="w-full py-3.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border border-[var(--border-color)] rounded-xl text-[var(--foreground)] text-xs tracking-wider uppercase font-bold transition-all"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </ProfileContext.Provider>
  );
}

// --- SHARED UI COMPONENTS ---
function FormInput({ label, icon: Icon, value, onChange, placeholder, disabled = false, className = "", maxLength, type = "text", ...rest }: any) {
  return (
    <div className={`w-full relative group ${className}`}>
      <div className="flex items-center justify-between mb-1 px-0.5">
        <label className="text-[10px] uppercase font-bold text-gray-500 group-focus-within:text-[var(--primary)] transition-colors flex items-center gap-1.5 flex-1 tracking-wider">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </label>
      </div>
      <input
        type={type}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full bg-transparent border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)]/90 placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-all disabled:opacity-50 hover:border-gray-400 dark:hover:border-gray-600"
        value={value || ""} onChange={onChange} placeholder={placeholder} {...rest}
      />
    </div>
  );
}

function SectionLoader() {
  return (
    <div className="h-64 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      <span className="text-gray-400 text-sm font-medium tracking-wide">Loading Profile...</span>
    </div>
  );
}

// --- FORM: PERSONAL INFO ---
function PersonalInfoForm() {
  const { data, updateField } = useProfile();
  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 w-full">
          <FormInput label="Full Name" icon={User} maxLength={50} value={data.fullName} onChange={(e: any) => updateField("fullName", e.target.value)} />
          <FormInput label="Professional Title" icon={Briefcase} maxLength={100} value={data.jobTitle} onChange={(e: any) => updateField("jobTitle", e.target.value)} />
          <FormInput label="Email Address" icon={Mail} type="email" maxLength={100} value={data.email} onChange={(e: any) => updateField("email", e.target.value)} />
          <FormInput label="Phone Number" icon={Phone} type="tel" maxLength={20} value={data.phone} onChange={(e: any) => { const val = e.target.value.replace(/[^0-9+\s-]/g, ''); updateField("phone", val); }} />
          <FormInput label="Location" icon={MapPin} maxLength={100} value={data.location} onChange={(e: any) => updateField("location", e.target.value)} />
          <FormInput label="LinkedIn URL" icon={LinkIcon} type="url" maxLength={200} value={data.linkedin} onChange={(e: any) => updateField("linkedin", e.target.value)} />
          <FormInput label="Personal Website" icon={Globe} type="url" maxLength={200} value={data.website} onChange={(e: any) => updateField("website", e.target.value)} />
          <FormInput label="GitHub URL" icon={Code2} type="url" maxLength={200} value={data.github} onChange={(e: any) => updateField("github", e.target.value)} />
        </div>

        <div className="mt-6 space-y-1 group/textarea">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 transition-colors group-focus-within/textarea:text-[var(--primary)] flex items-center gap-1.5 tracking-wider">
              <Layout className="w-3.5 h-3.5" /> Professional Summary
            </label>
            <span className={`text-[10px] font-bold ${(data.summary?.length || 0) >= 900 ? 'text-red-500' : 'text-gray-400'}`}>
              {data.summary?.length || 0} / 900
            </span>
          </div>
          <textarea
            maxLength={900}
            className="w-full bg-transparent border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)]/90 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 outline-none min-h-[100px] leading-relaxed resize-y placeholder:text-[var(--text-secondary)]/50 transition-all hover:border-gray-400 dark:hover:border-gray-600"
            value={data.summary || ""} onChange={(e) => updateField("summary", e.target.value)} placeholder="A brief overview of your career highlights..."
          />
        </div>
      </div>
    </div>
  );
}

// --- FORM: EXPERIENCE ---
function ExperienceForm() {
  const { data, addListItem, removeListItem, updateListItem } = useProfile();
  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div className="flex justify-end items-center sm:items-end">
        <button onClick={() => addListItem("experience", { id: Date.now().toString(), company: "", role: "", location: "", startDate: "", endDate: "", description: "" })} className="text-xs flex items-center gap-1.5 text-[var(--primary)] hover:bg-[var(--primary)]/10 px-3 py-1.5 rounded-lg transition-colors font-bold">
          <Plus className="h-4 w-4" /> Add Experience
        </button>
      </div>

      {data.experience.length === 0 && (
        <div className="border border-dashed border-[var(--border-color)] bg-gray-50/50 dark:bg-white/5 rounded-2xl p-10 text-center flex flex-col items-center">
          <Briefcase className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-[var(--foreground)]/80 font-bold mb-1">No experience added yet</p>
          <p className="text-sm text-[var(--text-secondary)]">Click the button above to add your first role.</p>
        </div>
      )}

      <div className="space-y-6">
        {data.experience.map((exp, i) => {
          const isCurrent = exp.endDate === "Present";
          return (
            <div key={exp.id} className="mt-4 relative group/card transition-all duration-300 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-base text-[var(--foreground)]/90 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  Experience Entry
                </h3>
                <button title="Delete Entry" onClick={() => removeListItem("experience", i)} className="text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover/card:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
                <FormInput label="Company" icon={Briefcase} maxLength={100} value={exp.company} onChange={(e: any) => updateListItem("experience", i, "company", e.target.value)} />
                <FormInput label="Role" icon={User} maxLength={100} value={exp.role} onChange={(e: any) => updateListItem("experience", i, "role", e.target.value)} />
                <FormInput label="Start Date" icon={null} maxLength={20} placeholder="MM/YYYY" value={exp.startDate} onChange={(e: any) => updateListItem("experience", i, "startDate", e.target.value)} />

                <div className="relative">
                  <FormInput label="End Date" icon={null} maxLength={20} placeholder="MM/YYYY" value={exp.endDate === "Present" ? "" : exp.endDate} disabled={isCurrent} onChange={(e: any) => updateListItem("experience", i, "endDate", e.target.value)} />
                  <label className="flex items-center gap-2 cursor-pointer mt-2 text-xs uppercase font-bold tracking-wide text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors w-max">
                    <input type="checkbox" checked={isCurrent} onChange={(e) => updateListItem("experience", i, "endDate", e.target.checked ? "Present" : "")} className="rounded border-none outline-none ring-0 w-3.5 h-3.5 cursor-pointer accent-[var(--primary)]" />
                    Currently working here
                  </label>
                </div>
                <FormInput label="Location" maxLength={100} value={exp.location} onChange={(e: any) => updateListItem("experience", i, "location", e.target.value)} placeholder="City, Country or Remote" className="md:col-span-2" />
              </div>

              <div className="space-y-1 group/textarea">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500 transition-colors group-focus-within/textarea:text-[var(--primary)] tracking-wider">Description</label>
                  <span className={`text-[10px] font-bold ${(exp.description?.length || 0) >= 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                    {exp.description?.length || 0} / 1000
                  </span>
                </div>
                <textarea
                  maxLength={1000}
                  className="w-full bg-transparent border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)]/90 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 outline-none min-h-[90px] resize-y placeholder:text-[var(--text-secondary)]/50 transition-all hover:border-gray-400 dark:hover:border-gray-600"
                  placeholder="Describe your responsibilities and achievements..."
                  value={exp.description || ""} onChange={e => updateListItem("experience", i, "description", e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- FORM: EDUCATION ---
function EducationForm() {
  const { data, addListItem, removeListItem, updateListItem } = useProfile();
  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div className="flex justify-end items-center sm:items-end">
        <button onClick={() => addListItem("education", { id: Date.now().toString(), school: "", degree: "", field: "", grade: "", startDate: "", endDate: "" })} className="text-xs flex items-center gap-1.5 text-[var(--primary)] hover:bg-[var(--primary)]/10 px-3 py-1.5 rounded-lg transition-colors font-bold">
          <Plus className="w-4 h-4" /> Add Education
        </button>
      </div>

      {data.education.length === 0 && (
        <div className="border border-dashed border-[var(--border-color)] bg-gray-50/50 dark:bg-white/5 rounded-2xl p-10 text-center flex flex-col items-center">
          <GraduationCap className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-[var(--foreground)]/80 font-bold mb-1">No education added yet</p>
          <p className="text-sm text-[var(--text-secondary)]">Click the button above to add your degree or certification.</p>
        </div>
      )}

      <div className="space-y-6">
        {data.education.map((edu, i) => (
          <div key={edu.id} className="mt-4 relative group/card transition-all duration-300 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-base text-[var(--foreground)]/90 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs flex items-center justify-center font-bold">{i + 1}</span>
                Education Entry
              </h3>
              <button title="Delete Entry" onClick={() => removeListItem("education", i)} className="text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover/card:opacity-100">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <FormInput label="Institution" maxLength={100} value={edu.school} onChange={(e: any) => updateListItem("education", i, "school", e.target.value)} />
              <FormInput label="Degree Type" maxLength={100} placeholder="e.g. Bachelor's" value={edu.degree} onChange={(e: any) => updateListItem("education", i, "degree", e.target.value)} />
              <FormInput label="Field of Study" maxLength={100} value={edu.field} onChange={(e: any) => updateListItem("education", i, "field", e.target.value)} />
              <FormInput label="GPA / Grade" maxLength={20} value={edu.grade} onChange={(e: any) => updateListItem("education", i, "grade", e.target.value)} />
              <FormInput label="Start Date" maxLength={20} placeholder="MM/YYYY" value={edu.startDate} onChange={(e: any) => updateListItem("education", i, "startDate", e.target.value)} />
              <FormInput label="End Date" maxLength={20} placeholder="MM/YYYY or Expected" value={edu.endDate} onChange={(e: any) => updateListItem("education", i, "endDate", e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- FORM: SKILLS ---
function SkillsForm() {
  const { data, updateNested } = useProfile();
  const [inputValue, setInputValue] = useState("");

  const skillsList = data.skills.technical ? data.skills.technical.split(",").map(s => s.trim()).filter(Boolean) : [];

  const addSkill = () => {
    if (!inputValue.trim()) return;
    const newSkills = [...skillsList, inputValue.trim()].join(", ");
    updateNested("skills", "technical", newSkills);
    setInputValue("");
  };

  const removeSkill = (index: number) => {
    const newSkills = skillsList.filter((_, i) => i !== index).join(", ");
    updateNested("skills", "technical", newSkills);
  };

  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          maxLength={50}
          className="flex-1 bg-transparent border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-[var(--foreground)]/90 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[var(--text-secondary)]/50 text-sm font-medium hover:border-gray-400 dark:hover:border-gray-600"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
          placeholder="e.g. React, Node.js, AWS... (Press Enter to add)"
        />
        <button onClick={addSkill} className="bg-black/10 dark:bg-white/10 text-[var(--foreground)] px-5 py-2.5 rounded-lg font-bold hover:bg-black/20 dark:hover:bg-white/20 transition-colors uppercase tracking-wider text-[11px] whitespace-nowrap hidden sm:block">
          Add Skill
        </button>
      </div>

      {skillsList.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-xl p-8 text-center">
          <Code2 className="w-10 h-10 text-[var(--text-secondary)]/30 mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]/60 font-bold uppercase text-xs tracking-wider">No skills added yet</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {skillsList.map((skill, i) => (
            <div key={i} className="bg-[rgba(34,197,94,0.1)] text-[var(--primary)] border border-green-500/20 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm animate-slide-up-fade backdrop-blur-sm">
              {skill}
              <button title="Remove" onClick={() => removeSkill(i)} className="text-[var(--primary)] hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- FORM: PROJECTS ---
function ProjectsForm() {
  const { data, addListItem, removeListItem, updateListItem } = useProfile();
  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div className="flex justify-end items-center sm:items-end">
        <button onClick={() => addListItem("projects", { id: Date.now().toString(), name: "", techStack: "", link: "", description: "" })} className="text-xs flex items-center gap-1.5 text-[var(--primary)] hover:bg-[var(--primary)]/10 px-3 py-1.5 rounded-lg transition-colors font-bold">
          <Plus className="w-4 h-4" /> Add Project
        </button>
      </div>

      {data.projects.length === 0 && (
        <div className="border border-dashed border-[var(--border-color)] bg-gray-50/50 dark:bg-white/5 rounded-2xl p-10 text-center flex flex-col items-center">
          <FolderGit2 className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-[var(--foreground)]/80 font-bold mb-1">No projects added yet</p>
          <p className="text-sm text-[var(--text-secondary)]">Click the button above to add your projects.</p>
        </div>
      )}

      <div className="space-y-6">
        {data.projects.map((proj, i) => (
          <div key={proj.id} className="mt-4 relative group/card transition-all duration-300 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-base text-[var(--foreground)]/90 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs flex items-center justify-center font-bold">{i + 1}</span>
                Project Entry
              </h3>
              <button title="Delete Entry" onClick={() => removeListItem("projects", i)} className="text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover/card:opacity-100">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <FormInput label="Project Name" maxLength={100} placeholder="e.g. E-commerce Setup" value={proj.name} onChange={(e: any) => updateListItem("projects", i, "name", e.target.value)} />
              <FormInput label="Tech Stack" maxLength={200} placeholder="e.g. Next.js, Tailwind, Prisma" value={proj.techStack} onChange={(e: any) => updateListItem("projects", i, "techStack", e.target.value)} />
              <FormInput label="Live Link / Repo" maxLength={200} type="url" placeholder="https://" value={proj.link} onChange={(e: any) => updateListItem("projects", i, "link", e.target.value)} />

              <div className="md:col-span-2 space-y-1 group/textarea">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500 transition-colors group-focus-within/textarea:text-[var(--primary)] tracking-wider">Description</label>
                  <span className={`text-[10px] font-bold ${(proj.description?.length || 0) >= 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                    {proj.description?.length || 0} / 1000
                  </span>
                </div>
                <textarea
                  maxLength={1000}
                  className="w-full bg-transparent border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)]/90 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 outline-none min-h-[90px] resize-y placeholder:text-[var(--text-secondary)]/50 transition-all hover:border-gray-400 dark:hover:border-gray-600"
                  placeholder="Describe the project, challenges faced, and your specific contributions..."
                  value={proj.description || ""} onChange={e => updateListItem("projects", i, "description", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- FORM: CERTIFICATIONS ---
function CertificationsForm() {
  const { data, addListItem, removeListItem, updateListItem } = useProfile();
  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div className="flex justify-end items-center sm:items-end">
        <button onClick={() => addListItem("certifications", { id: Date.now().toString(), name: "", issuer: "", date: "", url: "" })} className="text-xs flex items-center gap-1.5 text-[var(--primary)] hover:bg-[var(--primary)]/10 px-3 py-1.5 rounded-lg transition-colors font-bold">
          <Plus className="w-4 h-4" /> Add Certification
        </button>
      </div>

      {data.certifications.length === 0 && (
        <div className="border border-dashed border-[var(--border-color)] bg-gray-50/50 dark:bg-white/5 rounded-2xl p-10 text-center flex flex-col items-center">
          <Award className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-[var(--foreground)]/80 font-bold mb-1">No certifications added yet</p>
          <p className="text-sm text-[var(--text-secondary)]">Click the button above to add certifications.</p>
        </div>
      )}

      <div className="space-y-6">
        {data.certifications.map((cert, i) => (
          <div key={cert.id} className="mt-4 relative group/card transition-all duration-300 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-base text-[var(--foreground)]/90 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs flex items-center justify-center font-bold">{i + 1}</span>
                Certification Entry
              </h3>
              <button title="Delete Entry" onClick={() => removeListItem("certifications", i)} className="text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover/card:opacity-100">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <FormInput label="Certification Name" maxLength={100} placeholder="e.g. AWS Certified Developer" value={cert.name} onChange={(e: any) => updateListItem("certifications", i, "name", e.target.value)} />
              <FormInput label="Issuing Organization" maxLength={100} placeholder="e.g. Amazon Web Services" value={cert.issuer} onChange={(e: any) => updateListItem("certifications", i, "issuer", e.target.value)} />
              <FormInput label="Date Earned" maxLength={20} placeholder="MM/YYYY" value={cert.date} onChange={(e: any) => updateListItem("certifications", i, "date", e.target.value)} />
              <FormInput label="Credential URL" maxLength={200} type="url" placeholder="https://" value={cert.url} onChange={(e: any) => updateListItem("certifications", i, "url", e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- FORM: LANGUAGES ---
function LanguagesForm() {
  const { data, addListItem, removeListItem, updateListItem } = useProfile();
  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div className="flex justify-end items-center sm:items-end">
        <button onClick={() => addListItem("languages", { id: Date.now().toString(), name: "", proficiency: "" })} className="text-xs flex items-center gap-1.5 text-[var(--primary)] hover:bg-[var(--primary)]/10 px-3 py-1.5 rounded-lg transition-colors font-bold">
          <Plus className="w-4 h-4" /> Add Language
        </button>
      </div>

      {data.languages.length === 0 && (
        <div className="border border-dashed border-[var(--border-color)] bg-gray-50/50 dark:bg-white/5 rounded-2xl p-10 text-center flex flex-col items-center">
          <Languages className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-[var(--foreground)]/80 font-bold mb-1">No languages added yet</p>
          <p className="text-sm text-[var(--text-secondary)]">Click the button above to add languages.</p>
        </div>
      )}

      <div className="space-y-6">
        {data.languages.map((lang, i) => (
          <div key={lang.id} className="mt-4 relative group/card transition-all duration-300 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-base text-[var(--foreground)]/90 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs flex items-center justify-center font-bold">{i + 1}</span>
                Language Entry
              </h3>
              <button title="Delete Entry" onClick={() => removeListItem("languages", i)} className="text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover/card:opacity-100">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <FormInput label="Language" maxLength={50} placeholder="e.g. English, Spanish" value={lang.name} onChange={(e: any) => updateListItem("languages", i, "name", e.target.value)} />
              <FormInput label="Proficiency Level" maxLength={50} placeholder="e.g. Native, Fluent, Beginner" value={lang.proficiency} onChange={(e: any) => updateListItem("languages", i, "proficiency", e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SIDEBAR MENU ---
const SECTIONS = [
  { id: "Personal Info", icon: User },
  { id: "Experience", icon: Briefcase },
  { id: "Education", icon: GraduationCap },
  { id: "Skills", icon: Code2 },
  { id: "Projects", icon: FolderGit2 },
  { id: "Certifications", icon: Award },
  { id: "Languages", icon: Languages },
];

function InternalSidebar() {
  const { activeSection, setActiveSection, data, isSaving, handleSave, isLoading } = useProfile();

  const isComplete = (secId: string) => {
    if (secId === "Personal Info") return !!data.fullName && !!data.email;
    if (secId === "Experience") return data.experience.length > 0;
    if (secId === "Education") return data.education.length > 0;
    if (secId === "Skills") return !!data.skills.technical && data.skills.technical.trim().length > 0;
    if (secId === "Projects") return data.projects.length > 0;
    if (secId === "Certifications") return data.certifications.length > 0;
    if (secId === "Languages") return data.languages.length > 0;
    return false;
  };

  return (
    <div className="w-full md:w-72 shrink-0 md:sticky md:top-6 self-start flex flex-col bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm mb-8 md:mb-0 z-10 transition-all duration-300">
      <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
        {SECTIONS.map(sec => {
          const active = activeSection === sec.id;
          const completed = isComplete(sec.id);
          return (
            <div key={sec.id} className="relative">
              <button onClick={() => setActiveSection(sec.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300 min-w-[max-content] md:min-w-0 z-10 relative ${active ? "bg-[var(--primary)]/10 text-[var(--primary)] font-bold" : "text-[var(--foreground)]/70 hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 font-medium"}`}>
                <div className="flex items-center gap-3">
                  <sec.icon className={`w-4 h-4 ${active ? "text-[var(--primary)]" : "opacity-70"}`} />
                  <span className="text-sm tracking-wide">{sec.id}</span>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ml-4 transition-colors ${completed ? "bg-[var(--primary)] shadow-[0_0_5px_var(--primary)]" : "bg-black/10 dark:bg-white/10"}`} />
              </button>
              {/* Active Indicator Line */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[var(--primary)] rounded-r-full shadow-[0_0_10px_var(--primary)] animate-in slide-in-from-left-2 z-0" />
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 pt-6 border-t border-[var(--border-color)] hidden md:block">
        <button
          onClick={() => handleSave()}
          disabled={isSaving || isLoading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-wide text-xs transition-all disabled:opacity-50 text-[var(--background)] bg-[var(--primary)] hover:bg-[var(--primary)]/90 shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:shadow-[0_0_20px_rgba(var(--primary),0.5)]"
        >
          {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

// --- MAIN LAYOUT ---
function ProfileCreationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { subscription, profiles, createNewProfile, isLoading, showFeedback } = useProfile();
  const [name, setName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  // Check if Free user and already has a profile
  const isFreeUser = !subscription || subscription.plan_type === "FREE";
  if (isFreeUser && profiles.length >= 1) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
          <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4 pt-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Crown className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)] font-heading">Multiple Profiles is a Premium Feature</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              Free users are limited to 1 Master Profile dataset. Upgrade to Pro or Premium to create unlimited tailored profiles for different job types.
            </p>
            <a href="/dashboard/billing" className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-wide text-xs text-black bg-yellow-500 hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]">
              View Plans & Upgrade
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Premium / Allowed User view
  const handleManualCreate = async () => {
    if (!name.trim()) {
      showFeedback("error", "Validation Error", "Please enter a profile name");
      return;
    }
    setIsUploading(true);
    showFeedback("loading", "Creating Profile", "Please wait...");
    try {
      await createNewProfile(name);
      showFeedback("success", "Success", "Your new master profile is ready.");
      onClose();
    } catch (err: any) {
      showFeedback("error", "Creation Failed", err.message || "Failed to create profile");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!name.trim()) {
      showFeedback("error", "Validation Error", "Please enter a profile name first");
      return;
    }
    setIsUploading(true);
    showFeedback("analyzing", "Analyzing Resume", "Our AI is extracting data from your PDF. This may take a few seconds.");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const parseRes = await fetch("/api/profiles/parse", {
        method: "POST",
        body: formData,
      });

      if (!parseRes.ok) {
        throw new Error("Failed to parse resume");
      }

      const parsedJson = await parseRes.json();
      const extractedData = parsedJson.data;

      await createNewProfile(name, extractedData);
      showFeedback("success", "Profile Created", "Your new master profile has been populated from your PDF!");
      onClose();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Parsing Failed", "There was an error parsing the resume. Please try again or create manually.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
        <button onClick={onClose} disabled={isUploading} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50">
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-[var(--foreground)] font-heading mb-2">Create New Profile</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              Create a new master profile dataset tailored for specific roles or industries.
            </p>
          </div>

          {!isLoading ? (
            <div className="space-y-4">
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-focus-within:text-[var(--primary)] transition-colors">
                  Profile Name
                </label>
                <input
                  type="text"
                  disabled={isUploading}
                  placeholder="e.g. Frontend Developer"
                  className="w-full bg-black/5 dark:bg-white/5 border border-[var(--border-color)] px-4 py-3 rounded-xl text-sm text-[var(--foreground)]/90 placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleManualCreate}
                  disabled={isUploading || !name.trim()}
                  className="flex flex-col items-center justify-center gap-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--border-color)] p-4 rounded-xl transition-all disabled:opacity-50 hover:border-gray-500"
                >
                  <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                    <Layout className="w-5 h-5 text-[var(--text-secondary)]" />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest text-center">Start manually</span>
                </button>

                <label className={`flex flex-col items-center justify-center gap-3 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 border border-[var(--primary)]/30 p-4 rounded-xl transition-all ${isUploading || !name.trim() ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} hover:border-[var(--primary)]/50`}>
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5 text-[var(--primary)]" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest text-center">
                    {isUploading ? "Uploading..." : "Import PDF"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    disabled={isUploading || !name.trim()}
                    suppressHydrationWarning
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MainContent() {
  const { activeSection, isLoading, profiles, selectedProfileId, setSelectedProfileId, deleteProfile, loadFromPdf, showFeedback, handleSave } = useProfile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setDropdownOpen(false);
    if (dropdownOpen) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [dropdownOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(!dropdownOpen);
  };

  const handleSelect = (id: string) => {
    setSelectedProfileId(id);
    setDropdownOpen(false);
  };

  const handleCreate = () => {
    setIsModalOpen(true);
    setDropdownOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedProfileId) return;
    showFeedback("confirm", "Delete Profile?", "Are you sure you want to delete this profile? This action cannot be undone.", async () => {
      setIsDeleting(true);
      showFeedback("loading", "Deleting...", "Removing profile data...");
      try {
        await deleteProfile(selectedProfileId);
        showFeedback("success", "Deleted", "Profile has been removed successfully.");
      } catch (err: any) {
        showFeedback("error", "Failed to Delete", err.message || "Failed to delete profile");
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showFeedback("confirm", "Overwrite Profile?", "This will overwrite your current unsaved changes for this profile with completely new PDF data. Continue?", async () => {
      setIsUploading(true);
      showFeedback("analyzing", "Extracting PDF...", "Please wait while AI analyzes the document...");
      try {
        await loadFromPdf(file);
        showFeedback(
          "confirm",
          "Extraction Complete",
          "Profile data was extracted successfully. Review the form and save these changes if everything looks correct.",
          () => {
            handleSave({ silentSuccess: true });
          },
          { confirmLabel: "Save", cancelLabel: "Cancel", iconType: "success" }
        );
      } catch (err: any) {
        showFeedback("error", "Extraction Failed", err.message || "Failed to extract from PDF");
      } finally {
        setIsUploading(false);
        const el = document.getElementById("pdf-upload-input") as HTMLInputElement;
        if (el) el.value = "";
      }
    });
  };

  const activeProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className="flex-1 flex flex-col font-ui w-full min-w-0">
      <ProfileCreationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* HEADER BAR: SECTION TITLE & PROFILE SELECTOR */}
      <div className="flex flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-color)]/50">

        {/* Section Title */}
        <div className="flex items-center gap-3 order-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center shadow-inner shrink-0">
            {SECTIONS.find(s => s.id === activeSection)?.icon && React.createElement(SECTIONS.find(s => s.id === activeSection)!.icon, { className: "w-5 h-5 text-[var(--primary)] drop-shadow-sm" })}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--foreground)] font-heading tracking-wide truncate">{activeSection === "Personal Info" ? "Personal Details" : activeSection}</h1>
            <p className="text-[var(--text-secondary)] text-xs hidden md:block font-medium truncate">
              {activeSection === "Personal Info" && "Basic information that makes up your resume header."}
              {activeSection === "Experience" && "Add your relevant career history."}
              {activeSection === "Education" && "Add your educational background."}
              {activeSection === "Skills" && "List your core technical and professional skills."}
              {activeSection === "Projects" && "Add significant personal or professional projects."}
              {activeSection === "Certifications" && "Add relevant professional certifications."}
              {activeSection === "Languages" && "Add languages you speak and your proficiency."}
            </p>
          </div>
        </div>

        {/* Profile Actions & Selector */}
        <div className="flex flex-row items-center gap-3 order-2 shrink-0">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {profiles.length > 1 && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-red-500/80 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                title="Delete Profile"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span className="hidden xl:inline">Delete</span>
              </button>
            )}

            <label className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 border border-[var(--border-color)] rounded-lg transition-colors hover:border-gray-500 shrink-0 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" /> : <Upload className="w-4 h-4" />}
              <span className="hidden lg:inline">{isUploading ? "Extracting..." : "Overwrite from PDF"}</span>
              <input type="file" id="pdf-upload-input" accept=".pdf" className="hidden" disabled={isUploading} suppressHydrationWarning onChange={handlePdfUpload} />
            </label>
          </div>

          {/* Profile Selector Dropdown */}
          <div className="flex items-center justify-end gap-2 pl-3 border-l border-[var(--border-color)]/50 shrink-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-right hidden xl:block">Active Dataset</label>
            <div className="relative group">
              <div
                onClick={toggleDropdown}
                className="flex items-center justify-between gap-2 bg-[var(--sidebar-bg)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors min-w-[160px] max-w-[200px] shadow-sm"
              >
                <span className="text-xs font-bold text-[var(--foreground)]/90 truncate">
                  {activeProfile ? activeProfile.name : "Select Profile"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </div>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div onClick={(e) => e.stopPropagation()} className="absolute top-full right-0 mt-2 w-full min-w-[240px] bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl shadow-lg z-50 overflow-hidden animate-slide-up-fade">
                  <div className="max-h-64 overflow-y-auto scrollbar-hide">
                    {profiles.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => handleSelect(profile.id)}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--foreground)]/90 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between transition-colors border-b border-[var(--border-color)] last:border-0"
                      >
                        <div className="truncate pr-2 border-r border-transparent">
                          <span className={`block truncate ${selectedProfileId === profile.id ? "text-[var(--primary)] font-bold" : "font-medium"}`}>{profile.name}</span>
                          {profile.is_default && <span className="text-[10px] text-[var(--text-secondary)]">Default dataset</span>}
                        </div>
                        {selectedProfileId === profile.id && <Check className="w-4 h-4 text-[var(--primary)] shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[var(--border-color)] bg-gray-50 dark:bg-white/5 p-2">
                    <button
                      onClick={handleCreate}
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create New Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <SectionLoader />
        ) : (
          <div className="w-full">
            {activeSection === "Personal Info" && <PersonalInfoForm />}
            {activeSection === "Experience" && <ExperienceForm />}
            {activeSection === "Education" && <EducationForm />}
            {activeSection === "Skills" && <SkillsForm />}
            {activeSection === "Projects" && <ProjectsForm />}
            {activeSection === "Certifications" && <CertificationsForm />}
            {activeSection === "Languages" && <LanguagesForm />}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MasterProfileDashboard() {
  return (
    <ProfileProvider>
      <div className="w-full min-h-screen pb-20">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full text-[var(--foreground)] relative items-start">
          <InternalSidebar />
          <MainContent />
        </div>

        {/* Mobile Save Button Area */}
        <div className="mt-8 pt-8 border-t border-[var(--border-color)] md:hidden w-full px-6 pb-6">
          <button className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold uppercase tracking-wide text-xs text-[var(--background)] bg-[var(--primary)] shadow-[0_0_15px_rgba(var(--primary),0.3)]">
            <Save className="h-4 w-4" /> Save Profile
          </button>
        </div>
      </div>
    </ProfileProvider>
  );
}
