"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Wand2, Loader2, User, Briefcase,
    Trash2, LayoutTemplate, Zap, History, FileText, Save,
    Bold, Italic, Target, Copy, Mail, Sparkles
} from "lucide-react";
import { AIPreparationAnimation } from "@/components/resume-engine/AIPreparationAnimation";

// --- TYPES ---
import { ResumeData } from "@/types/resume";
import SaveDialog from "@/components/resume-engine/SaveDialog";

// --- TEMPLATES ---
import { AVAILABLE_TEMPLATES, TemplateConfig } from '@/components/resume-engine/templates';
import { InteractivePreviewPanel } from '@/components/resume-engine/InteractivePreviewPanel';
import { SidebarTabBar, type SidebarTab } from '@/components/resume-engine/SidebarTabBar';
import { TemplatesTabContent } from '@/components/resume-engine/TemplatesTabContent';

import { DesignSettings } from "@/components/resume-engine/DesignControls";
import { useResumeStore, TEMPLATES } from '@/lib/stores/resumeStore';
import type { TemplateId } from '@/lib/stores/resumeStore';
import { CustomDialog } from "@/components/ui/CustomDialog";

const PdfDownloadButton = dynamic(
    () => import("@/components/resume-engine/HtmlPreviewPanel").then((mod) => mod.PdfDownloadButton),
    {
        ssr: false,
        loading: () => <span className="text-xs text-gray-500">Loading...</span>
    }
);

// Helper to get template name from Zustand store
function getTemplateName(id: TemplateId): string {
    const template = TEMPLATES.find(t => t.id === id);
    return template?.name || 'Modern';
}

// --- LOCAL TYPES ---
type Job = { id: string; company: string; jobTitle: string; description: string; };
type MasterProfile = any;

function ResumeStudioPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Zustand store for template selection
    const { selectedTemplate, getActiveTemplate } = useResumeStore();
    const activeTemplateId = getActiveTemplate(); // This handles hover/select logic

    const [job, setJob] = useState<Job | null>(null);
    const [masterProfile, setMasterProfile] = useState<MasterProfile | null>(null);
    const [masterProfilesList, setMasterProfilesList] = useState<any[]>([]);
    const [selectedMasterProfileId, setSelectedMasterProfileId] = useState<string>("");
    const [masterProfileName, setMasterProfileName] = useState<string>("");

    // STATE: The Resume Data
    const [resumeData, setResumeData] = useState<ResumeData | null>(null);
    const [savedResumes, setSavedResumes] = useState<any[]>([]);

    const [dialogConfig, setDialogConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm';
        title: string;
        description: string;
        variant: 'default' | 'destructive' | 'success';
        confirmText?: string;
        onConfirm?: () => void;
    }>({ isOpen: false, type: 'alert', title: '', description: '', variant: 'default' });

    // Design Settings (kept for InteractivePreviewPanel compatibility)
    const [designSettings, setDesignSettings] = useState<DesignSettings>({
        global: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
        header: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
        summary: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
        experience: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
        education: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
        skills: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
        colors: {
            primary: '#667eea',
            secondary: '#764ba2'
        }
    });

    // Track the currently open resume ID
    const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
    const [currentResumeName, setCurrentResumeName] = useState<string>("");

    // Save Dialog
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    // Sidebar Tab State (Canva-style)
    const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('content');

    // No longer need activeTemplate state - use zustandTemplateId directly

    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingType, setGeneratingType] = useState<"resume" | "cover-letter" | "email" | "all" | null>(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [activeDocument, setActiveDocument] = useState<"resume" | "cover-letter" | "email">("resume");
    const [coverLetter, setCoverLetter] = useState<string | null>(null);
    const [draftEmail, setDraftEmail] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"jd" | "profile" | "saved">("jd");
    const [mobilePanelView, setMobilePanelView] = useState<"editor" | "preview">("editor");

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Job
                const jobRes = await fetch("/api/jobs");
                const jobJson = await jobRes.json();
                const foundJob = jobJson.data?.find((j: Job) => j.id === params.jobId);

                // 2. Fetch Profiles List
                const profilesRes = await fetch("/api/profiles");
                const profilesJson = await profilesRes.json();
                const pList = profilesJson.profiles || [];
                setMasterProfilesList(pList);
                setJob(foundJob);
                
                // Set default or first profile as selected
                let defaultProfileId = pList.find((p: any) => p.is_default)?.id;
                if (!defaultProfileId && pList.length > 0) defaultProfileId = pList[0].id;
                
                let fetchedProfile = null;
                
                if (defaultProfileId) {
                    setSelectedMasterProfileId(defaultProfileId);
                    const selectedP = pList.find((p: any) => p.id === defaultProfileId);
                    if (selectedP) setMasterProfileName(selectedP.name);
                    
                    const profileRes = await fetch(`/api/profiles/${defaultProfileId}`);
                    const profileJson = await profileRes.json();
                    fetchedProfile = profileJson.profile?.parsed_data || null;
                    setMasterProfile(fetchedProfile);
                } else {
                    // Fallback to old route if somehow profiles array is empty
                    const fallbackRes = await fetch("/api/profile");
                    const fallbackJson = await fallbackRes.json();
                    fetchedProfile = fallbackJson.data;
                    setMasterProfile(fetchedProfile);
                }

                // 3. Fetch Saved Resumes for this Job
                if (foundJob) {
                    const savedRes = await fetch(`/api/resumes?jobId=${foundJob.id}`);
                    if (savedRes.ok) {
                        const savedJson = await savedRes.json();
                        setSavedResumes(savedJson.data || []);
                    }
                }

                // 4. Check URL for specific resume ID
                const resumeId = searchParams.get("resumeId");
                if (resumeId) {
                    const resumeRes = await fetch(`/api/resumes?jobId=${params.jobId}`);
                    const resumeJson = await resumeRes.json();
                    const foundResume = resumeJson.data?.find((r: any) => r.id === resumeId);
                    if (foundResume) {
                        setResumeData(foundResume.content);
                        setHasGenerated(true);
                        setCurrentResumeId(foundResume.id);
                        setCurrentResumeName(foundResume.name);
                        // Ideally load saved design settings too if we saved them
                    }
                }
                // 5. Auto Start from ATS Refine
                else if (searchParams.get("refine") === "true" && foundJob) {
                    const savedJd = sessionStorage.getItem("ats_refine_jd") || foundJob.description;
                    const savedResumeRaw = sessionStorage.getItem("ats_refine_resume");
                    const savedReportRaw = sessionStorage.getItem("ats_refine_report");

                    if (savedResumeRaw) {
                        try {
                            const parsedResume = JSON.parse(savedResumeRaw);
                            const parsedReport = savedReportRaw ? JSON.parse(savedReportRaw) : null;
                            setTimeout(() => handleGenerateResume({ ...foundJob, description: savedJd }, parsedResume, parsedReport), 500);
                        } catch (e) {
                            const parsedReport = savedReportRaw ? JSON.parse(savedReportRaw) : null;
                            setTimeout(() => handleGenerateResume({ ...foundJob, description: savedJd }, { raw_text: savedResumeRaw }, parsedReport), 500);
                        }
                    } else if (fetchedProfile) {
                        setTimeout(() => handleGenerateResume(foundJob, fetchedProfile), 500);
                    }
                }
                // 6. Auto Start Normal
                else if (searchParams.get("autoStart") === "true" && foundJob && fetchedProfile) {
                    setTimeout(() => handleGenerateResume(foundJob, fetchedProfile), 500);
                }

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (params.jobId) fetchData();
    }, [params.jobId, searchParams]);

        const handleGenerateCoverLetter = async () => {
        if (!masterProfile || !job) return;
        setGeneratingType("cover-letter");
        setIsGenerating(true);
        try {
            const response = await fetch("/api/cover-letter/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobDescription: job.description, masterProfile: masterProfile })
            });
            if (response.status === 403) {
                setDialogConfig({ isOpen: true, type: 'alert', title: 'Out of Credits', description: 'You have 0 credits remaining!', variant: 'destructive', confirmText: 'Got it' });
                setIsGenerating(false);
                return;
            }
            if (!response.ok) throw new Error("Failed to generate cover letter");
            const result = await response.json();
            if (result.coverLetter) {
                setCoverLetter(result.coverLetter);
                // Save to Job Application
                await fetch(`/api/jobs/${job.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ coverLetter: result.coverLetter }),
                });
            }
            setHasGenerated(true);
            setActiveDocument("cover-letter");
            setMobilePanelView("preview");
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateEmail = async () => {
        if (!masterProfile || !job) return;
        setGeneratingType("email");
        setIsGenerating(true);
        try {
            const response = await fetch("/api/email/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobDescription: job.description, masterProfile: masterProfile })
            });
            if (response.status === 403) {
                setDialogConfig({ isOpen: true, type: 'alert', title: 'Out of Credits', description: 'You have 0 credits remaining!', variant: 'destructive', confirmText: 'Got it' });
                setIsGenerating(false);
                return;
            }
            if (!response.ok) throw new Error("Failed to generate email");
            const result = await response.json();
            if (result.draftEmail) setDraftEmail(result.draftEmail);
            setHasGenerated(true);
            setActiveDocument("email");
            setMobilePanelView("preview");
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateResumeOnly = async () => {
        if (!masterProfile || !job) return;
        setGeneratingType("resume");
        setIsGenerating(true);
        try {
            const response = await fetch("/api/resume/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobDescription: job.description, masterProfile: masterProfile })
            });
            if (response.status === 403) {
                setDialogConfig({ isOpen: true, type: 'alert', title: 'Out of Credits', description: 'You have 0 credits remaining!', variant: 'destructive', confirmText: 'Got it' });
                setIsGenerating(false);
                return;
            }
            if (!response.ok) throw new Error("Failed to generate resume");
            const result = await response.json();
            
            const aiData = result.data;
            const formattedData = {
                fullName: aiData.fullName || masterProfile.fullName,
                jobTitle: aiData.jobTitle || job.jobTitle,
                contact: {
                    email: aiData.email || masterProfile.email,
                    phone: aiData.phone || masterProfile.phone,
                    location: aiData.location || masterProfile.location || "",
                    linkedin: aiData.linkedin || masterProfile.linkedin || "",
                    website: aiData.website || ""
                },
                summary: aiData.summary,
                skills: aiData.skills?.technical ? (Array.isArray(aiData.skills.technical) ? aiData.skills.technical : aiData.skills.technical.split(",").map((s: string) => s.trim())) : [],
                experience: aiData.experience?.map((exp: any) => ({
                    id: exp.id || Math.random().toString(),
                    company: exp.company,
                    role: exp.role,
                    startDate: exp.startDate,
                    endDate: exp.endDate,
                    description: Array.isArray(exp.description) ? exp.description : [exp.description],
                    location: exp.location || ""
                })) || [],
                projects: aiData.projects ? aiData.projects.map((proj: any) => ({
                    id: proj.id || Math.random().toString(),
                    name: proj.name,
                    techStack: proj.techStack,
                    description: Array.isArray(proj.description) ? proj.description : [proj.description],
                    link: proj.link || ""
                })) : [],
                education: aiData.education?.map((edu: any) => ({
                    id: edu.id || Math.random().toString(),
                    school: edu.school,
                    degree: edu.degree,
                    field: edu.field,
                    startDate: edu.startDate || "",
                    endDate: edu.endDate || ""
                })) || []
            };
            setResumeData(formattedData);
            setHasGenerated(true);
            setActiveDocument("resume");
            setMobilePanelView("preview");
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };
// --- GENERATION LOGIC ---
    const handleGenerateResume = async (currentJob = job, currentProfile = masterProfile, atsReport = null) => {
        if (!currentProfile || !currentJob) return;
        setGeneratingType("all");
        setIsGenerating(true);

        try {
            // Single atomic call: checks credits, calls backend, deducts only on success
            const response = await fetch("/api/resume/generate-all", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobDescription: currentJob.description,
                    masterProfile: currentProfile,
                    atsReport: atsReport
                }),
            });

            if (response.status === 403) {
                setDialogConfig({
                    isOpen: true,
                    type: 'alert',
                    title: 'Out of Credits',
                    description: 'You have 0 credits remaining! Please upgrade your plan to continue generating tailored resumes.',
                    variant: 'destructive',
                    confirmText: 'Got it'
                });
                setIsGenerating(false);
                return;
            }

            if (!response.ok) throw new Error("Failed to generate resume");

            const result = await response.json();
            const aiData = result.data;
            if (result.coverLetter) setCoverLetter(result.coverLetter);
            if (result.draftEmail) setDraftEmail(result.draftEmail);

            // 3. Format Data
            const formattedData: ResumeData = {
                fullName: aiData.fullName || currentProfile.fullName,
                jobTitle: aiData.jobTitle || currentJob.jobTitle,
                contact: {
                    email: aiData.email || currentProfile.email,
                    phone: aiData.phone || currentProfile.phone,
                    location: aiData.location || currentProfile.location || "",
                    linkedin: aiData.linkedin || currentProfile.linkedin || "",
                    website: aiData.website || ""
                },
                summary: aiData.summary,
                skills: aiData.skills?.technical
                    ? (Array.isArray(aiData.skills.technical)
                        ? aiData.skills.technical
                        : aiData.skills.technical.split(",").map((s: string) => s.trim()))
                    : [],
                experience: aiData.experience?.map((exp: any) => ({
                    id: exp.id || Math.random().toString(),
                    company: exp.company,
                    role: exp.role,
                    startDate: exp.startDate,
                    endDate: exp.endDate,
                    description: Array.isArray(exp.description) ? exp.description : [exp.description],
                    location: exp.location || ""
                })) || [],
                projects: aiData.projects ? aiData.projects.map((proj: any) => ({
                    id: proj.id || Math.random().toString(),
                    name: proj.name,
                    techStack: proj.techStack,
                    description: Array.isArray(proj.description) ? proj.description : [proj.description],
                    link: proj.link || ""
                })) : [],
                education: aiData.education?.map((edu: any) => ({
                    id: edu.id || Math.random().toString(),
                    school: edu.school,
                    degree: edu.degree,
                    field: edu.field,
                    startDate: edu.startDate || "",
                    endDate: edu.endDate || ""
                })) || []
            };

            setResumeData(formattedData);
            setHasGenerated(true);
            setMobilePanelView("preview");

            // 4. Save
            const saveRes = await fetch("/api/resumes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId: currentJob.id,
                    content: formattedData,
                    resumeName: `Resume V${savedResumes.length + 1}`,
                    masterProfileName: masterProfileName
                }),
            });

            // 5. Save Cover Letter to Job Application
            if (result.coverLetter) {
                await fetch(`/api/jobs/${currentJob.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ coverLetter: result.coverLetter }),
                });
            }

            if (!saveRes.ok) throw new Error("Failed to save generated resume");const saveJson = await saveRes.json();
            if (saveJson.data?.id) {
                setCurrentResumeId(saveJson.data.id);
                setCurrentResumeName(saveJson.data.name);
                // Refresh list
                const updatedListRes = await fetch(`/api/resumes?jobId=${currentJob.id}`);
                const updatedList = await updatedListRes.json();
                setSavedResumes(updatedList.data || []);
            }

        } catch (error) {
            console.error("Error generating resume:", error);
            setDialogConfig({
                isOpen: true,
                type: 'alert',
                title: 'Generation Failed',
                description: 'Something went wrong while generating the resume. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // NEW: Handle Manual Save
    const handleManualSave = async (saveAsNew: boolean, name?: string) => {
        if (!resumeData || !job) return;

        // 1. UPDATE EXISTING
        if (!saveAsNew && currentResumeId) {
            const res = await fetch(`/api/resumes/${currentResumeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: resumeData,
                    name: name || currentResumeName
                })
            });
            if (res.ok) {
                setDialogConfig({ isOpen: true, type: 'alert', title: 'Success', description: 'Resume Updated!', variant: 'success' });
                const updatedListRes = await fetch(`/api/resumes?jobId=${job.id}`);
                const updatedList = await updatedListRes.json();
                setSavedResumes(updatedList.data || []);
            }
        }
        // 2. SAVE AS NEW
        else {
            const res = await fetch("/api/resumes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId: job.id,
                    content: resumeData,
                    resumeName: name || `${job.company} Resume V${savedResumes.length + 1}`,
                    masterProfileName: masterProfileName
                })
            });
            const json = await res.json();
            if (res.ok && json.data?.id) {
                setCurrentResumeId(json.data.id);
                setCurrentResumeName(json.data.name);
                setDialogConfig({ isOpen: true, type: 'alert', title: 'Success', description: 'Saved as new version!', variant: 'success' });
                const updatedListRes = await fetch(`/api/resumes?jobId=${job.id}`);
                const updatedList = await updatedListRes.json();
                setSavedResumes(updatedList.data || []);
            }
        }
    };

    // --- EDIT HANDLERS ---
    const updateField = (section: keyof ResumeData, value: any) => {
        if (!resumeData) return;
        setResumeData({ ...resumeData, [section]: value });
    };

    const updateContact = (field: keyof ResumeData['contact'], value: string) => {
        if (!resumeData) return;
        setResumeData({ ...resumeData, contact: { ...resumeData.contact, [field]: value } });
    };

    const updateArrayItem = (section: 'experience' | 'projects' | 'education', index: number, field: string, value: any) => {
        if (!resumeData) return;
        const newList = [...resumeData[section]];
        // @ts-ignore
        newList[index] = { ...newList[index], [field]: value };
        setResumeData({ ...resumeData, [section]: newList });
    };

    const removeArrayItem = (section: 'experience' | 'projects' | 'education', index: number) => {
        if (!resumeData) return;
        const newList = resumeData[section].filter((_, i) => i !== index);
        setResumeData({ ...resumeData, [section]: newList });
    };

    // Helper to insert markdown at cursor position in textarea (simple version)
    const insertMarkdown = (marker: string) => {
        // This is a simplified version. A real implementation would need refs to the active textarea.
        // For now, we will just rely on user typing or provide a hint.
        setDialogConfig({ isOpen: true, type: 'alert', title: 'Formatting Hint', description: 'To bold, type **text**. To italicize, type *text*.', variant: 'default', confirmText: 'Got it' });
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-[var(--primary)] bg-[var(--background)]"><Loader2 className="animate-spin h-8 w-8" /></div>;
    if (!job || !masterProfile) return <div className="p-10 text-[var(--foreground)] bg-[var(--background)]">Data missing.</div>;

    return (
        <div className="h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] overflow-hidden w-full">

            {/* HEADER */}
            <div className="h-14 md:h-16 border-b border-[#222] flex items-center justify-between px-3 md:px-6 bg-[#111] shrink-0 w-full z-20 relative">
                <div className="flex items-center gap-2 md:gap-4 min-w-0">
                    <button onClick={() => router.back()} className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition shrink-0">
                        <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="p-1.5 md:p-2 bg-[var(--primary)]/20 rounded-lg shrink-0">
                            <Zap className="h-4 w-4 md:h-5 md:w-5 text-[var(--primary)]" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-bold text-base md:text-xl text-white leading-tight">Resume Studio</h1>
                            <p className="text-[10px] md:text-xs text-gray-400 truncate">{job.jobTitle} • {job.company}</p>
                        </div>
                    </div>
                </div>

                {hasGenerated && resumeData && (
                    <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                        {/* CHECK ATS SCORE — hidden on mobile */}
                        <button
                            onClick={() => {
                                if (!currentResumeId) {
                                    setDialogConfig({
                                        isOpen: true,
                                        type: 'alert',
                                        title: 'Save Required',
                                        description: 'Please save your resume first before checking the ATS score.',
                                        variant: 'destructive',
                                        confirmText: 'OK'
                                    });
                                    setIsSaveDialogOpen(true);
                                    return;
                                }
                                router.push(`/dashboard/ats-score?jobId=${job.id}&resumeId=${currentResumeId}`);
                            }}
                            className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                            <Target className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Check ATS Score</span>
                            <span className="sm:inline md:hidden">ATS</span>
                        </button>

                        {/* SAVE BUTTON */}
                        <button
                            onClick={() => setIsSaveDialogOpen(true)}
                            className="flex items-center gap-1.5 bg-white/10 text-white hover:bg-white/20 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/10 shadow-sm"
                        >
                            <Save className="h-3.5 w-3.5 text-orange-500" />
                            <span className="hidden sm:inline">Save</span>
                        </button>

                        {/* DOWNLOAD BUTTON */}
                        <PdfDownloadButton
                            data={resumeData}
                            templateId={selectedTemplate}
                            designSettings={designSettings}
                            fileName={`${job.company.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`}
                        />
                    </div>
                )}
            </div>

            {/* SAVE DIALOG */}
            <SaveDialog
                isOpen={isSaveDialogOpen}
                onClose={() => setIsSaveDialogOpen(false)}
                onSavePromise={handleManualSave}
                isExisting={!!currentResumeId}
                currentName={currentResumeName}
            />



            {/* Mobile panel tab switcher */}
            <div className="flex md:hidden border-b border-[var(--border-color)] bg-[var(--sidebar-bg)] shrink-0">
                <button
                    onClick={() => setMobilePanelView("editor")}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${mobilePanelView === "editor" ? "text-[var(--primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-secondary)]"}`}
                >
                    {hasGenerated ? "Editor" : "Setup"}
                </button>
                <button
                    onClick={() => setMobilePanelView("preview")}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${mobilePanelView === "preview" ? "text-[var(--primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-secondary)]"}`}
                >
                    Preview
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden w-full relative">

                {/* === LEFT PANEL (EDITOR / REVIEW) === */}
                <div className={`${mobilePanelView === "editor" ? "flex" : "hidden"} md:flex flex-col border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] shrink-0 z-10 shadow-2xl w-full md:w-[45%] xl:w-[45%] md:max-w-[45%] transition-all duration-300 ease-in-out overflow-hidden`}>
                    {!hasGenerated ? (
                        <>
                            {/* PRE-GENERATION VIEW */}
                            <div className="p-5 border-b border-[var(--border-color)] bg-black/5 dark:bg-white/5">
                                <h2 className="text-lg font-bold text-[var(--foreground)] mb-1">Review Context</h2>
                                <p className="text-xs text-[var(--text-secondary)]">Ensure your Job Description and Master Profile are correct before generating.</p>
                            </div>

                            <div className="flex border-b border-[var(--border-color)] bg-[var(--sidebar-bg)]">
                                <button onClick={() => setActiveTab("jd")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === "jd" ? "text-[var(--primary)] border-b-2 border-[var(--primary)] bg-black/5 dark:bg-white/[0.02]" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}>
                                    <Briefcase className="h-3 w-3" /> Job Description
                                </button>
                                <button onClick={() => setActiveTab("profile")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === "profile" ? "text-[var(--primary)] border-b-2 border-[var(--primary)] bg-black/5 dark:bg-white/[0.02]" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}>
                                    <User className="h-3 w-3" /> Master Profile
                                </button>
                                <button onClick={() => setActiveTab("saved")} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === "saved" ? "text-[var(--primary)] border-b-2 border-[var(--primary)] bg-black/5 dark:bg-white/[0.02]" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}>
                                    <History className="h-3 w-3" /> Saved Resumes
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
                                {activeTab === "jd" && (
                                    <div className="bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-[var(--border-color)] shadow-inner w-full min-w-0">
                                        <p className="text-[var(--foreground)]/80 whitespace-pre-line text-sm leading-relaxed break-words break-all w-full">{job.description}</p>
                                    </div>
                                )}

                                {activeTab === "saved" && (
                                    <div className="space-y-3">
                                        {savedResumes.length === 0 ? (
                                            <div className="text-center py-10 text-[var(--text-secondary)] text-xs">No saved resumes yet.</div>
                                        ) : (
                                            savedResumes.map((resume) => (
                                                <button
                                                    key={resume.id}
                                                    onClick={() => {
                                                        setResumeData(resume.content);
                                                        setHasGenerated(true);
                                                        setCurrentResumeId(resume.id);
                                                        setCurrentResumeName(resume.name);
                                                        setMobilePanelView("preview");
                                                    }}
                                                    className="w-full text-left bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-[var(--border-color)] hover:border-[var(--primary)]/50 hover:bg-black/10 dark:hover:bg-white/10 transition group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-[var(--primary)]/20 rounded-lg group-hover:bg-[var(--primary)]/30 transition">
                                                            <FileText className="h-4 w-4 text-[var(--primary)]" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition">{resume.name}</div>
                                                            <div className="text-[10px] text-[var(--text-secondary)]">
                                                                {new Date(resume.createdAt).toLocaleString()}
                                                                {resume.extensionData?.masterProfileName && ` • Tailored using: ${resume.extensionData.masterProfileName}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}

                                {activeTab === "profile" && (
                                    <div className="space-y-4">
                                        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-[var(--border-color)]">
                                            {masterProfilesList.length > 1 ? (
                                                <div className="mb-4">
                                                    <label className="text-xs text-[var(--text-secondary)] font-bold uppercase mb-1 block">Select Profile Context</label>
                                                    <select 
                                                        className="w-full bg-[var(--background)] border border-[var(--border-color)] text-[var(--foreground)] text-sm rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
                                                        value={selectedMasterProfileId}
                                                        onChange={async (e) => {
                                                            const newId = e.target.value;
                                                            setSelectedMasterProfileId(newId);
                                                            const p = masterProfilesList.find(x => x.id === newId);
                                                            if (p) setMasterProfileName(p.name);
                                                            
                                                            const profileRes = await fetch(`/api/profiles/${newId}`);
                                                            const profileJson = await profileRes.json();
                                                            setMasterProfile(profileJson.profile?.parsed_data || null);
                                                        }}
                                                    >
                                                        {masterProfilesList.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name} {p.is_default ? '(Default)' : ''}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : null}

                                            <h3 className="font-bold text-[var(--foreground)] text-lg">{masterProfile?.fullName}</h3>
                                            <p className="text-[var(--primary)] text-sm mb-3">{masterProfile?.jobTitle}</p>
                                            <p className="text-xs text-[var(--text-secondary)] mb-1">{masterProfile?.email}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{masterProfile?.phone}</p>
                                        </div>

                                        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-[var(--border-color)] space-y-2">
                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Content Verified</h4>

                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--text-secondary)]">Experience Entries</span>
                                                <span className="text-[var(--foreground)] font-bold">{masterProfile?.experience?.length || 0}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--text-secondary)]">Project Entries</span>
                                                <span className={`font-bold ${masterProfile?.projects?.length ? 'text-[var(--foreground)]' : 'text-red-400'}`}>
                                                    {masterProfile?.projects?.length || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--text-secondary)]">Education Entries</span>
                                                <span className="text-[var(--foreground)] font-bold">{masterProfile?.education?.length || 0}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--text-secondary)]">Skills</span>
                                                <span className="text-[var(--foreground)] font-bold">
                                                    {masterProfile?.skills?.technical ? (
                                                        typeof masterProfile.skills.technical === 'string'
                                                            ? masterProfile.skills.technical.split(',').length
                                                            : (Array.isArray(masterProfile.skills.technical) ? masterProfile.skills.technical.length : 0)
                                                    ) : 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--text-secondary)]">Languages</span>
                                                <span className="text-[var(--foreground)] font-bold">{masterProfile?.languages?.length || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-[var(--border-color)] bg-white dark:bg-[#111] space-y-4">
                                <button
                                    onClick={() => handleGenerateResume()}
                                    disabled={isGenerating}
                                    className="relative w-full group overflow-hidden rounded-xl p-[1px] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] via-indigo-500 to-[var(--primary)] bg-[length:200%_auto] animate-gradient-x rounded-xl opacity-70 group-hover:opacity-100 transition-opacity"></span>
                                    <div className="relative w-full flex items-center justify-center gap-2 bg-white dark:bg-[#111] text-[var(--foreground)] py-3.5 rounded-xl font-bold transition-all group-hover:bg-opacity-0 group-hover:text-white dark:group-hover:bg-opacity-0">
                                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] to-indigo-600 opacity-10 dark:opacity-20 rounded-xl group-hover:opacity-100 transition-opacity z-0"></div>
                                        {isGenerating ? <Loader2 className="animate-spin h-5 w-5 z-10 text-[var(--primary)] group-hover:text-white" /> : <Sparkles className="h-5 w-5 z-10 text-[var(--primary)] group-hover:text-white" />}
                                        <span className="z-10">{isGenerating ? "AI is Thinking..." : "Generate Application Pack (Resume + Cover Letter + Email)"}</span>
                                    </div>
                                </button>
                                
                                <div className="flex items-center gap-3">
                                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent flex-1"></div>
                                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">Or Generate Individually</span>
                                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent flex-1"></div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                    <button 
                                        disabled={isGenerating} 
                                        onClick={() => handleGenerateResumeOnly()} 
                                        className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--border-color)] transition-all disabled:opacity-50 hover:-translate-y-0.5"
                                    >
                                        <FileText className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
                                        <span className="text-[11px] font-semibold text-[var(--foreground)]">Resume</span>
                                    </button>
                                    <button 
                                        disabled={isGenerating} 
                                        onClick={() => handleGenerateCoverLetter()} 
                                        className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--border-color)] transition-all disabled:opacity-50 hover:-translate-y-0.5"
                                    >
                                        <Briefcase className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
                                        <span className="text-[11px] font-semibold text-[var(--foreground)]">Cover Letter</span>
                                    </button>
                                    <button 
                                        disabled={isGenerating} 
                                        onClick={() => handleGenerateEmail()} 
                                        className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--border-color)] transition-all disabled:opacity-50 hover:-translate-y-0.5"
                                    >
                                        <Mail className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
                                        <span className="text-[11px] font-semibold text-[var(--foreground)]">Draft Email</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* EDITOR VIEW - Canva Style Tabs */}
                            <SidebarTabBar
                                activeTab={activeSidebarTab}
                                onTabChange={setActiveSidebarTab}
                            />

                            {/* CONTENT TAB */}
                            {activeSidebarTab === 'content' && activeDocument === 'resume' && (
                                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10 animate-slide-down">
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-sm font-bold text-[var(--primary)] flex items-center gap-2">
                                            <Wand2 className="h-3 w-3" /> AI Generated Content
                                        </h2>
                                        <div className="flex gap-2">
                                            <button onClick={() => insertMarkdown('**')} title="Bold (**text**)" className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-[var(--text-secondary)] hover:text-[var(--foreground)]">
                                                <Bold className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => insertMarkdown('*')} title="Italic (*text*)" className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-[var(--text-secondary)] hover:text-[var(--foreground)]">
                                                <Italic className="w-3 h-3" />
                                            </button>
                                            <div className="w-[1px] h-4 bg-[var(--border-color)] mx-1"></div>
                                            <button onClick={() => setHasGenerated(false)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] underline transition">Regenerate</button>
                                        </div>
                                    </div>

                                    <Section title="Header & Contact">
                                        <Input label="Full Name" value={resumeData?.fullName || ""} onChange={(v) => updateField('fullName', v)} />
                                        <Input label="Job Title" value={resumeData?.jobTitle || ""} onChange={(v) => updateField('jobTitle', v)} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input label="Email" value={resumeData?.contact.email || ""} onChange={(v) => updateContact('email', v)} />
                                            <Input label="Phone" value={resumeData?.contact.phone || ""} onChange={(v) => updateContact('phone', v)} />
                                            <Input label="Location" value={resumeData?.contact.location || ""} onChange={(v) => updateContact('location', v)} />
                                            <Input label="LinkedIn" value={resumeData?.contact.linkedin || ""} onChange={(v) => updateContact('linkedin', v)} />
                                        </div>
                                    </Section>
                                    <Section title="Summary">
                                        <textarea className="w-full h-32 bg-[var(--background)]/50 border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--foreground)]/90 focus:border-[var(--primary)] outline-none resize-none leading-relaxed" value={resumeData?.summary} onChange={(e) => updateField('summary', e.target.value)} />
                                    </Section>
                                    <Section title="Skills">
                                        <textarea className="w-full h-24 bg-[var(--background)]/50 border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--foreground)]/90 focus:border-[var(--primary)] outline-none resize-none leading-relaxed" value={Array.isArray(resumeData?.skills) ? resumeData.skills.join(", ") : ""} onChange={(e) => updateField('skills', e.target.value.split(", "))} />
                                    </Section>
                                    <Section title="Experience">
                                        {resumeData?.experience?.map((exp, idx) => (
                                            <div key={idx} className="bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-[var(--border-color)] mb-3 relative group hover:border-[var(--foreground)]/20 transition-colors">
                                                <button onClick={() => removeArrayItem('experience', idx)} className="absolute top-3 right-3 text-[var(--text-secondary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
                                                <Input label="Company" value={exp.company || ""} onChange={(v) => updateArrayItem('experience', idx, 'company', v)} />
                                                <Input label="Role" value={exp.role || ""} onChange={(v) => updateArrayItem('experience', idx, 'role', v)} />
                                                <Input label="Location" value={exp.location || ""} onChange={(v) => updateArrayItem('experience', idx, 'location', v)} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input label="Start Date" value={exp.startDate || ""} onChange={(v) => updateArrayItem('experience', idx, 'startDate', v)} />
                                                    <Input label="End Date" value={exp.endDate || ""} onChange={(v) => updateArrayItem('experience', idx, 'endDate', v)} />
                                                </div>
                                                <textarea className="w-full h-32 bg-[var(--background)]/30 border border-[var(--border-color)]/50 text-xs text-[var(--foreground)]/90 focus:border-[var(--primary)] outline-none p-2 rounded resize-none leading-relaxed mt-2" value={Array.isArray(exp.description) ? exp.description.join('\n') : exp.description} onChange={(e) => updateArrayItem('experience', idx, 'description', e.target.value.split('\n'))} placeholder="Description..." />
                                            </div>
                                        ))}
                                    </Section>

                                    <Section title="Projects">
                                        {resumeData?.projects?.map((proj, idx) => (
                                            <div key={idx} className="bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-[var(--border-color)] mb-3 relative group hover:border-[var(--foreground)]/20 transition-colors">
                                                <button onClick={() => removeArrayItem('projects', idx)} className="absolute top-3 right-3 text-[var(--text-secondary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
                                                <Input label="Project Name" value={proj.name || ""} onChange={(v) => updateArrayItem('projects', idx, 'name', v)} />
                                                <Input label="Tech Stack" value={proj.techStack || ""} onChange={(v) => updateArrayItem('projects', idx, 'techStack', v)} />
                                                <Input label="Link" value={proj.link || ""} onChange={(v) => updateArrayItem('projects', idx, 'link', v)} />
                                                <textarea className="w-full h-24 bg-[var(--background)]/30 border border-[var(--border-color)]/50 text-xs text-[var(--foreground)]/90 focus:border-[var(--primary)] outline-none p-2 rounded resize-none leading-relaxed mt-2" value={Array.isArray(proj.description) ? proj.description.join('\n') : proj.description} onChange={(e) => updateArrayItem('projects', idx, 'description', e.target.value.split('\n'))} placeholder="Description..." />
                                            </div>
                                        ))}
                                    </Section>

                                    <Section title="Education">
                                        {resumeData?.education?.map((edu, idx) => (
                                            <div key={idx} className="bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-[var(--border-color)] mb-3 relative group hover:border-[var(--foreground)]/20 transition-colors">
                                                <button onClick={() => removeArrayItem('education', idx)} className="absolute top-3 right-3 text-[var(--text-secondary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
                                                <Input label="School" value={edu.school || ""} onChange={(v) => updateArrayItem('education', idx, 'school', v)} />
                                                <Input label="Degree" value={edu.degree || ""} onChange={(v) => updateArrayItem('education', idx, 'degree', v)} />
                                                <Input label="Field of Study" value={edu.field || ""} onChange={(v) => updateArrayItem('education', idx, 'field', v)} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input label="Start Date" value={edu.startDate || ""} onChange={(v) => updateArrayItem('education', idx, 'startDate', v)} />
                                                    <Input label="End Date" value={edu.endDate || ""} onChange={(v) => updateArrayItem('education', idx, 'endDate', v)} />
                                                </div>
                                            </div>
                                        ))}
                                    </Section>

                                    <Section title="Certifications">
                                        <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-[var(--border-color)]">
                                            <textarea
                                                className="w-full h-32 bg-[var(--background)]/30 border border-[var(--border-color)]/50 text-xs text-[var(--foreground)]/90 focus:border-[var(--primary)] outline-none p-2 rounded resize-none leading-relaxed"
                                                value={Array.isArray(resumeData?.certifications) ? resumeData.certifications.join('\n') : (resumeData?.certifications || "")}
                                                onChange={(e) => {
                                                    if (resumeData) {
                                                        setResumeData({ ...resumeData, certifications: e.target.value.split('\n') });
                                                    }
                                                }}
                                                placeholder="List certifications (one per line)..."
                                            />
                                        </div>
                                    </Section>
                                </div>
                            )}

                            {activeSidebarTab === 'content' && activeDocument === 'cover-letter' && (
                                <div className="flex-1 p-6 flex flex-col items-center text-center justify-center text-[var(--text-secondary)] animate-slide-down">
                                    <FileText className="w-12 h-12 mb-4 opacity-50" />
                                    <h3 className="font-bold text-[var(--foreground)] mb-2">Cover Letter Editor</h3>
                                    <p className="text-sm">You can edit your cover letter directly in the text area on the right side.</p>
                                </div>
                            )}

                            {activeSidebarTab === 'content' && activeDocument === 'email' && (
                                <div className="flex-1 p-6 flex flex-col items-center text-center justify-center text-[var(--text-secondary)] animate-slide-down">
                                    <FileText className="w-12 h-12 mb-4 opacity-50" />
                                    <h3 className="font-bold text-[var(--foreground)] mb-2">Draft Email Editor</h3>
                                    <p className="text-sm">You can edit your draft email directly in the text area on the right side.</p>
                                </div>
                            )}

                            {/* TEMPLATES TAB */}
                            {activeSidebarTab === 'templates' && (
                                <TemplatesTabContent />
                            )}

                            {/* STYLES TAB */}

                        </>
                    )}
                </div>

                {/* === RIGHT PANEL (PDF PREVIEW / IS GENERATING VIEW) === */}
                <div className={`${mobilePanelView === "preview" ? "flex" : "hidden"} md:flex flex-1 min-w-0 bg-black/5 dark:bg-[#525659] relative flex-col h-full border-l border-[var(--border-color)] overflow-hidden`}>
                    {hasGenerated && !isGenerating && (
                        <div className="flex items-center justify-center gap-4 py-3 bg-[var(--background)] border-b border-[var(--border-color)] shadow-sm z-10">
                            <button 
                                onClick={() => setActiveDocument('resume')} 
                                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeDocument === 'resume' ? 'bg-[var(--primary)] text-[var(--background)] shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                📄 Resume
                            </button>
                            <button 
                                onClick={() => setActiveDocument('cover-letter')} 
                                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeDocument === 'cover-letter' ? 'bg-[var(--primary)] text-[var(--background)] shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                ✉️ Cover Letter
                            </button>
                            <button 
                                onClick={() => setActiveDocument('email')} 
                                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeDocument === 'email' ? 'bg-[var(--primary)] text-[var(--background)] shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                📨 Draft Email
                            </button>
                        </div>
                    )}
                    {isGenerating ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-[var(--foreground)] relative overflow-hidden bg-[var(--background)]">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--primary)]/5 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>

                            <div className="w-full max-w-lg relative z-10 mb-8 mt-10">
                                <AIPreparationAnimation />
                            </div>

                            <h2 className="text-3xl font-bold text-[var(--foreground)] mb-3 tracking-tight z-10 bg-clip-text text-transparent bg-gradient-to-r from-[var(--foreground)] to-[var(--text-secondary)]">
                                {generatingType === "cover-letter" ? "Generating Cover Letter..." :
                                 generatingType === "email" ? "Generating Draft Email..." :
                                 generatingType === "all" ? "Generating Application Pack..." :
                                 "Generating Tailored Resume..."}
                            </h2>
                            <div className="flex items-center gap-2 text-sm text-[var(--primary)] z-10 font-bold tracking-wide">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>AI is analyzing the job description and matching your profile</span>
                            </div>
                        </div>
                    ) : !hasGenerated ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-[var(--foreground)] relative overflow-hidden bg-[var(--background)]">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--primary)]/5 rounded-full blur-3xl animate-pulse"></div>
                            <Wand2 className="h-16 w-16 text-[var(--primary)] relative z-10 mb-4" />
                            <h2 className="text-3xl font-bold text-[var(--foreground)] mb-3 tracking-tight z-10">Ready to Tailor</h2>
                            <p className="text-[var(--text-secondary)] max-w-md text-sm leading-relaxed z-10">AI Agent ready to analyze.</p>
                        </div>
                    ) : activeDocument === "resume" ? (
                        resumeData ? (
                            /* Using Interactive Preview with Canva-like editing */
                            <InteractivePreviewPanel
                                data={resumeData}
                                templateId={activeTemplateId}
                                designSettings={designSettings}
                                onDataChange={(newData) => setResumeData(newData)}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-[var(--foreground)] bg-[var(--background)]">
                                <FileText className="w-16 h-16 text-[var(--border-color)] mb-4" />
                                <h3 className="text-xl font-bold mb-2">No Resume Generated</h3>
                                <p className="text-sm text-[var(--text-secondary)] max-w-md">You haven't generated a tailored resume for this job yet. Click "Generate Resume" or "Generate Application Pack" in the left panel to create one.</p>
                            </div>
                        )
                    ) : activeDocument === "cover-letter" ? (
                        <div className="flex-1 overflow-auto p-6 lg:p-12 bg-white dark:bg-[#1e1e1e]">
                            <div className="max-w-3xl mx-auto relative group">
                                <button 
                                    onClick={() => navigator.clipboard.writeText(coverLetter || "")}
                                    className="absolute top-4 right-4 p-2 bg-[var(--background)]/80 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                                    title="Copy to clipboard"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <textarea
                                    className="w-full min-h-[600px] p-6 pt-12 text-sm text-[var(--foreground)] bg-transparent border border-[var(--border-color)] rounded-xl outline-none focus:border-[var(--primary)] resize-y leading-relaxed shadow-sm transition-all relative"
                                    value={coverLetter || ""}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    placeholder="Your Cover Letter will appear here..."
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto p-6 lg:p-12 bg-white dark:bg-[#1e1e1e]">
                            <div className="max-w-3xl mx-auto relative group">
                                <button 
                                    onClick={() => navigator.clipboard.writeText(draftEmail || "")}
                                    className="absolute top-4 right-4 p-2 bg-[var(--background)]/80 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                                    title="Copy to clipboard"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <textarea
                                    className="w-full min-h-[600px] p-6 pt-12 text-sm text-[var(--foreground)] bg-transparent border border-[var(--border-color)] rounded-xl outline-none focus:border-[var(--primary)] resize-y leading-relaxed shadow-sm transition-all relative"
                                    value={draftEmail || ""}
                                    onChange={(e) => setDraftEmail(e.target.value)}
                                    placeholder="Your Draft Email will appear here..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                <CustomDialog
                    {...dialogConfig}
                    onClose={() => setDialogConfig(s => ({ ...s, isOpen: false }))}
                />
            </div>
        </div>
    );
}

export default function ResumeStudioPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">Loading Studio...</div>}>
            <ResumeStudioPageContent />
        </Suspense>
    );
}

// Helpers
function Section({ title, children, action }: { title: string, children: React.ReactNode, action?: React.ReactNode }) {
    return <div className="space-y-3"><div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1 mt-4"><h3 className="text-xs font-bold uppercase text-[var(--primary)] tracking-wider">{title}</h3>{action}</div>{children}</div>
}
function Input({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return <div className="mb-2 w-full"><label className="text-[10px] uppercase text-[var(--text-secondary)] font-bold block mb-1">{label}</label><input type="text" className="w-full bg-black/5 dark:bg-black/30 border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--primary)] outline-none transition-colors" value={value} onChange={(e) => onChange(e.target.value)} /></div>
}