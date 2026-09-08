"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Wand2, Loader2, User, Briefcase,
    Trash2, LayoutTemplate, Zap, History, FileText, Save,
    Bold, Italic, Target, Copy, Mail, Sparkles, ChevronRight, Send, ArrowRight, Rocket,
    ExternalLink, MapPin, CalendarDays, Repeat, BarChart3, Search, SlidersHorizontal,
    X, Plus, RefreshCw, GraduationCap, Wrench, LayoutGrid, Globe, FolderKanban, Check,
    Award, Users, Link as LinkIcon
} from "lucide-react";
import { AIPreparationAnimation } from "@/components/resume-engine/AIPreparationAnimation";

// --- TYPES ---
import { ResumeData, type CustomSection } from "@/types/resume";
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
import { ImproveWithAIDialog, type SummaryVariant } from "@/components/resume-engine/ImproveWithAIDialog";
import { SectionAccordion, type EditorSection } from "@/components/resume-engine/SectionAccordion";
import {
    JobDescriptionBody,
    SkillChips,
    relativeDay,
    useFormattedJd,
} from "@/components/jobs/JobDetails";

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
type Job = {
    id: string;
    company: string;
    jobTitle: string;
    description: string;
    location?: string | null;
    salary?: string | null;
    jobUrl?: string | null;
    sourceUrl?: string | null;
    source?: string;
    createdAt?: string;
    coverLetter?: string | null;
    formattedJd?: any;
};
type MasterProfile = any;

function ResumeStudioPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Zustand store for template selection
    const { selectedTemplate, setSelectedTemplate, getActiveTemplate } = useResumeStore();
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

    // "Improve with AI" — options are offered, never applied silently.
    const [aiDialogOpen, setAiDialogOpen] = useState(false);
    const [aiVariants, setAiVariants] = useState<SummaryVariant[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [skillsLoading, setSkillsLoading] = useState(false);
    const [newSkill, setNewSkill] = useState("");


    // No longer need activeTemplate state - use zustandTemplateId directly

    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingType, setGeneratingType] = useState<"resume" | "cover-letter" | "email" | "all" | null>(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [activeDocument, setActiveDocument] = useState<"resume" | "cover-letter" | "email">("resume");

    // ?doc=cover-letter lets other pages (the Cover Letter list) deep-link into
    // the right editor instead of dropping the user on the resume tab.
    useEffect(() => {
        const doc = searchParams.get("doc");
        if (doc === "cover-letter" || doc === "email") {
            setActiveDocument(doc);
            setMobilePanelView("preview");
        }
    }, [searchParams]);
    const [coverLetter, setCoverLetter] = useState<string | null>(null);
    const [draftEmail, setDraftEmail] = useState<string | null>(null);
    const [letterSaveState, setLetterSaveState] = useState<"idle" | "saving" | "saved">("idle");
    /** What the server currently holds, so an unchanged letter never PATCHes. */
    const persistedLetter = useRef<string | null>(null);

    const [activeTab, setActiveTab] = useState<"jd" | "profile" | "saved" | "analysis">("jd");

    // The cover letter is a column on the job, so it is saved in place rather
    // than through the resume Save dialog. Debounced so typing doesn't PATCH
    // on every keystroke.
    useEffect(() => {
        if (coverLetter === null || coverLetter === persistedLetter.current) return;
        const jobId = params.jobId as string;
        setLetterSaveState("saving");
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/jobs/${jobId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ coverLetter }),
                });
                if (!res.ok) throw new Error("save failed");
                persistedLetter.current = coverLetter;
                setLetterSaveState("saved");
            } catch {
                setLetterSaveState("idle");
            }
        }, 900);
        return () => clearTimeout(timer);
    }, [coverLetter, params.jobId]);

    // Structured JD from the formatter agent; falls back to the parser while
    // the agent answers, so this panel is never empty.
    const { jd: formattedJd, formatting: jdFormatting } = useFormattedJd(job as any);
    const [mobilePanelView, setMobilePanelView] = useState<"editor" | "preview">("editor");

    /**
     * The "generate this" call to action owns the right panel only while the
     * selected document is empty. A job can carry a cover letter without a
     * resume ever having been generated, and that letter must still show.
     */
    const activeDocumentHasContent =
        activeDocument === "resume"
            ? Boolean(resumeData)
            : activeDocument === "cover-letter"
                ? Boolean(coverLetter)
                : Boolean(draftEmail);

    /** Saved rows hold a plain string; only apply it if it is a template we ship. */
    const applySavedTemplate = (templateId?: string | null) => {
        if (templateId && TEMPLATES.some((t) => t.id === templateId)) {
            setSelectedTemplate(templateId as TemplateId);
        }
    };

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

                // The letter lives on the job, so it is here on load — without
                // this, arriving from the Cover Letter page showed an empty box.
                if (foundJob) {
                    setCoverLetter(foundJob.coverLetter ?? null);
                    persistedLetter.current = foundJob.coverLetter ?? null;
                }
                
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
                        applySavedTemplate(foundResume.templateId);
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
                    masterProfileName: masterProfileName,
                    templateId: selectedTemplate
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
                    name: name || currentResumeName,
                    templateId: selectedTemplate
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
                    templateId: selectedTemplate,
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

    /** Appends a blank entry so a section can be filled in by hand. */
    const addArrayItem = (section: 'experience' | 'projects' | 'education', blank: any) => {
        if (!resumeData) return;
        const current = Array.isArray(resumeData[section]) ? resumeData[section] : [];
        setResumeData({ ...resumeData, [section]: [...current, blank] });
    };

    // Helper to insert markdown at cursor position in textarea (simple version)
    const insertMarkdown = (marker: string) => {
        // This is a simplified version. A real implementation would need refs to the active textarea.
        // For now, we will just rely on user typing or provide a hint.
        setDialogConfig({ isOpen: true, type: 'alert', title: 'Formatting Hint', description: 'To bold, type **text**. To italicize, type *text*.', variant: 'default', confirmText: 'Got it' });
    };


    /** Current skills as a plain string list, whatever shape the AI returned. */
    const skillList = (): string[] => {
        const raw = resumeData?.skills;
        if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
        if (raw && typeof raw === "object") {
            return String((raw as any).technical || "")
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean);
        }
        return [];
    };

    const setSkills = (next: string[]) => {
        if (resumeData) setResumeData({ ...resumeData, skills: next });
    };

    const experienceLines = (): string[] =>
        (resumeData?.experience || []).map((e) => [e.role, e.company].filter(Boolean).join(" at "));

    const fetchSummaryVariants = async () => {
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await fetch("/api/resume/assist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "summary",
                    currentSummary: resumeData?.summary || "",
                    jobTitle: resumeData?.jobTitle || job?.jobTitle || null,
                    company: job?.company || null,
                    jobDescription: job?.description || null,
                    skills: skillList(),
                    experience: experienceLines(),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "Could not generate summary options.");
            setAiVariants(data.variants || []);
        } catch (err: any) {
            setAiVariants([]);
            setAiError(err?.message || "Could not generate summary options.");
        } finally {
            setAiLoading(false);
        }
    };

    const openImproveSummary = () => {
        setAiVariants([]);
        setAiDialogOpen(true);
        fetchSummaryVariants();
    };

    const handleSuggestSkills = async () => {
        if (!job?.description) {
            setDialogConfig({
                isOpen: true,
                type: "alert",
                title: "No job description",
                description: "Add a job description to this job so AI can spot the skills you are missing.",
                variant: "default",
            });
            return;
        }
        setSkillsLoading(true);
        try {
            const res = await fetch("/api/resume/assist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "skills",
                    currentSkills: skillList(),
                    jobDescription: job.description,
                    jobTitle: resumeData?.jobTitle || job.jobTitle || null,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "Could not suggest skills.");
            const found: string[] = data.skills || [];
            if (found.length) {
                setSkills([...skillList(), ...found]);
            } else {
                setDialogConfig({
                    isOpen: true,
                    type: "alert",
                    title: "Nothing missing",
                    description: "Your skills already cover what this job description asks for.",
                    variant: "success",
                });
            }
        } catch (err: any) {
            setDialogConfig({
                isOpen: true,
                type: "alert",
                title: "Suggestion failed",
                description: err?.message || "Could not suggest skills.",
                variant: "destructive",
            });
        } finally {
            setSkillsLoading(false);
        }
    };

    // Escaped newline kept in one place; the editors split/join on it.
    const NL = "\n";

    // ── Section order and custom sections live on the resume, not in component
    //    state, so they survive save/reload and travel with the document. ──
    const DEFAULT_SECTION_ORDER = [
        "personal", "experience", "education", "profile", "volunteering",
        "certifications", "skills", "projects", "languages", "references", "links",
    ];

    const customSections: CustomSection[] = resumeData?.customSections ?? [];

    const sectionOrder: string[] = resumeData?.sectionOrder?.length
        ? resumeData.sectionOrder
        : DEFAULT_SECTION_ORDER;

    const setSectionOrder = (next: string[]) => {
        if (resumeData) setResumeData({ ...resumeData, sectionOrder: next });
    };

    const setCustomSections = (next: CustomSection[]) => {
        if (resumeData) setResumeData({ ...resumeData, customSections: next });
    };

    // Adding and removing touch both `customSections` and `sectionOrder`, so each
    // writes them in a single update — two setResumeData calls off the same
    // snapshot would drop whichever field the second one didn't carry.
    const addCustomSection = () => {
        if (!resumeData) return;
        const id = `custom-${crypto.randomUUID().slice(0, 8)}`;
        setResumeData({
            ...resumeData,
            customSections: [...customSections, { id, title: "New section", content: "" }],
            sectionOrder: [...sectionOrder, id],
        });
    };

    const updateCustomSection = (id: string, field: "title" | "content", value: string) =>
        setCustomSections(customSections.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

    const removeCustomSection = (id: string) => {
        if (!resumeData) return;
        setResumeData({
            ...resumeData,
            customSections: customSections.filter((c) => c.id !== id),
            sectionOrder: sectionOrder.filter((s) => s !== id),
        });
    };

    const listSection = (key: string, placeholder: string) => (
        <ListEditor
            placeholder={placeholder}
            value={(resumeData as any)?.[key]}
            onChange={(next) => resumeData && setResumeData({ ...resumeData, [key]: next } as any)}
        />
    );

    const editorSections: EditorSection[] = !resumeData ? [] : [
        {
            id: "personal",
            title: "Personal Information",
            icon: User,
            body: (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <Input label="Full Name" value={resumeData.fullName || ""} onChange={(v) => updateField('fullName', v)} />
                    <Input label="Job Title" value={resumeData.jobTitle || ""} onChange={(v) => updateField('jobTitle', v)} />
                    <Input label="Email" value={resumeData.contact?.email || ""} onChange={(v) => updateContact('email', v)} />
                    <Input label="Phone" value={resumeData.contact?.phone || ""} onChange={(v) => updateContact('phone', v)} />
                    <Input label="Location" value={resumeData.contact?.location || ""} onChange={(v) => updateContact('location', v)} />
                    <Input label="LinkedIn" value={resumeData.contact?.linkedin || ""} onChange={(v) => updateContact('linkedin', v)} />
                    <Input label="Website / Portfolio" value={resumeData.contact?.website || ""} onChange={(v) => updateContact('website', v)} />
                </div>
            ),
        },
        {
            id: "experience",
            title: "Experience",
            icon: Briefcase,
            action: <AddButton label="Add" onClick={() => addArrayItem('experience', { id: crypto.randomUUID(), company: "", role: "", location: "", startDate: "", endDate: "", description: [] })} />,
            body: (
                <>
                    {(resumeData.experience || []).map((exp, idx) => (
                        <EntryCard key={idx} onRemove={() => removeArrayItem('experience', idx)}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                                <Input label="Company" value={exp.company || ""} onChange={(v) => updateArrayItem('experience', idx, 'company', v)} />
                                <Input label="Role" value={exp.role || ""} onChange={(v) => updateArrayItem('experience', idx, 'role', v)} />
                                <Input label="Location" value={exp.location || ""} onChange={(v) => updateArrayItem('experience', idx, 'location', v)} />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input label="Start" value={exp.startDate || ""} onChange={(v) => updateArrayItem('experience', idx, 'startDate', v)} />
                                    <Input label="End" value={exp.endDate || ""} onChange={(v) => updateArrayItem('experience', idx, 'endDate', v)} />
                                </div>
                            </div>
                            <label className="text-[10px] uppercase text-[var(--text-secondary)] font-bold block mb-1 mt-1">Bullet points (one per line)</label>
                            <textarea
                                className="w-full h-28 bg-[var(--background)]/30 border border-[var(--border-color)]/50 text-xs text-[var(--foreground)]/90 focus:border-[var(--primary)] outline-none p-2 rounded resize-none leading-relaxed"
                                value={Array.isArray(exp.description) ? exp.description.join(NL) : exp.description}
                                onChange={(e) => updateArrayItem('experience', idx, 'description', e.target.value.split(NL))}
                            />
                        </EntryCard>
                    ))}
                </>
            ),
        },
        {
            id: "education",
            title: "Education",
            icon: GraduationCap,
            action: <AddButton label="Add" onClick={() => addArrayItem('education', { id: crypto.randomUUID(), school: "", degree: "", field: "", startDate: "", endDate: "" })} />,
            body: (
                <>
                    {(resumeData.education || []).map((edu, idx) => (
                        <EntryCard key={idx} onRemove={() => removeArrayItem('education', idx)}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                                <Input label="School" value={edu.school || ""} onChange={(v) => updateArrayItem('education', idx, 'school', v)} />
                                <Input label="Degree" value={edu.degree || ""} onChange={(v) => updateArrayItem('education', idx, 'degree', v)} />
                                <Input label="Field of Study" value={edu.field || ""} onChange={(v) => updateArrayItem('education', idx, 'field', v)} />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input label="Start" value={edu.startDate || ""} onChange={(v) => updateArrayItem('education', idx, 'startDate', v)} />
                                    <Input label="End" value={edu.endDate || ""} onChange={(v) => updateArrayItem('education', idx, 'endDate', v)} />
                                </div>
                            </div>
                        </EntryCard>
                    ))}
                </>
            ),
        },
        {
            id: "profile",
            title: "Profile",
            icon: FileText,
            action: (
                <button
                    onClick={openImproveSummary}
                    className="shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[var(--primary)]/30 text-[11px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition"
                >
                    <Sparkles className="w-3 h-3" /> Improve with AI
                </button>
            ),
            body: (
                <textarea
                    className="w-full h-28 bg-[var(--background)]/50 border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--foreground)]/90 focus:border-[var(--primary)] outline-none resize-none leading-relaxed"
                    value={resumeData.summary || ""}
                    onChange={(e) => updateField('summary', e.target.value)}
                />
            ),
        },
        {
            id: "volunteering",
            title: "Volunteering & Leadership",
            icon: Users,
            body: listSection("volunteering", "One role per line, e.g. Coding Mentor - Code Club (2024)"),
        },
        {
            id: "certifications",
            title: "Certifications",
            icon: Award,
            body: listSection("certifications", "One certification per line"),
        },
        {
            id: "skills",
            title: "Key Skills",
            icon: Wrench,
            action: (
                <button
                    onClick={handleSuggestSkills}
                    disabled={skillsLoading}
                    className="shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[var(--primary)]/30 text-[11px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition disabled:opacity-50"
                >
                    {skillsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Suggest
                </button>
            ),
            body: (
                <>
                    <div className="flex flex-wrap gap-1.5">
                        {skillList().map((skill, idx) => (
                            <span
                                key={`${skill}-${idx}`}
                                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md bg-[var(--primary)]/8 border border-[var(--primary)]/20 text-[11px] font-medium text-[var(--primary)]"
                            >
                                {skill}
                                <button
                                    onClick={() => setSkills(skillList().filter((_, i) => i !== idx))}
                                    className="hover:text-red-500 transition"
                                    aria-label={`Remove ${skill}`}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && newSkill.trim()) {
                                    e.preventDefault();
                                    setSkills([...skillList(), newSkill.trim()]);
                                    setNewSkill("");
                                }
                            }}
                            placeholder="Add a skill and press Enter"
                            className="flex-1 bg-black/5 dark:bg-black/30 border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--primary)] outline-none"
                        />
                        <button
                            onClick={() => {
                                if (!newSkill.trim()) return;
                                setSkills([...skillList(), newSkill.trim()]);
                                setNewSkill("");
                            }}
                            className="h-8 px-3 rounded-lg border border-[var(--border-color)] text-[11px] font-semibold text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition"
                        >
                            Add
                        </button>
                    </div>
                </>
            ),
        },
        {
            id: "projects",
            title: "Projects",
            icon: FolderKanban,
            action: <AddButton label="Add" onClick={() => addArrayItem('projects', { id: crypto.randomUUID(), name: "", techStack: "", link: "", description: [] })} />,
            body: (
                <>
                    {(resumeData.projects || []).map((proj, idx) => (
                        <EntryCard key={idx} onRemove={() => removeArrayItem('projects', idx)}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                                <Input label="Project Name" value={proj.name || ""} onChange={(v) => updateArrayItem('projects', idx, 'name', v)} />
                                <Input label="Tech Stack" value={proj.techStack || ""} onChange={(v) => updateArrayItem('projects', idx, 'techStack', v)} />
                            </div>
                            <Input label="Link" value={proj.link || ""} onChange={(v) => updateArrayItem('projects', idx, 'link', v)} />
                            <label className="text-[10px] uppercase text-[var(--text-secondary)] font-bold block mb-1 mt-1">Bullet points (one per line)</label>
                            <textarea
                                className="w-full h-24 bg-[var(--background)]/30 border border-[var(--border-color)]/50 text-xs text-[var(--foreground)]/90 focus:border-[var(--primary)] outline-none p-2 rounded resize-none leading-relaxed"
                                value={Array.isArray(proj.description) ? proj.description.join(NL) : proj.description}
                                onChange={(e) => updateArrayItem('projects', idx, 'description', e.target.value.split(NL))}
                            />
                        </EntryCard>
                    ))}
                </>
            ),
        },
        {
            id: "languages",
            title: "Languages",
            icon: Globe,
            body: listSection("languages", "One language per line, e.g. English - Fluent"),
        },
        {
            id: "references",
            title: "References",
            icon: FileText,
            body: listSection("references", "One reference per line, or 'Available on request'"),
        },
        {
            id: "links",
            title: "Links",
            icon: LinkIcon,
            body: listSection("links", "One link per line, e.g. GitHub - github.com/you"),
        },
        ...customSections.map((custom) => ({
            id: custom.id,
            title: custom.title || "Untitled section",
            icon: LayoutGrid,
            body: (
                <>
                    <Input
                        label="Section title"
                        value={custom.title}
                        onChange={(v) => updateCustomSection(custom.id, "title", v)}
                    />
                    <textarea
                        className="w-full h-24 bg-[var(--background)]/50 border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--foreground)]/90 focus:border-[var(--primary)] outline-none resize-none leading-relaxed"
                        placeholder="One line per entry"
                        value={custom.content}
                        onChange={(e) => updateCustomSection(custom.id, "content", e.target.value)}
                    />
                </>
            ),
        })),
    ];

    // Shared by the job-details Saved tab and the editor's Saved tab, so the
    // list stays reachable once a document is open.
    const savedPanel = (
                    <div className="space-y-6">
                        <SavedGroup
                            title="Resumes"
                            icon={FileText}
                            count={savedResumes.length}
                            empty="No saved resumes yet. Generate one to start a version history."
                        >
                            {savedResumes.map((resume) => (
                                <SavedRow
                                    key={resume.id}
                                    icon={FileText}
                                    title={resume.name}
                                    meta={`${new Date(resume.createdAt).toLocaleString()}${resume.extensionData?.masterProfileName ? ` • Tailored using: ${resume.extensionData.masterProfileName}` : ""}`}
                                    active={currentResumeId === resume.id && activeDocument === "resume"}
                                    onClick={() => {
                                        setResumeData(resume.content);
                                        setHasGenerated(true);
                                        setCurrentResumeId(resume.id);
                                        setCurrentResumeName(resume.name);
                                        applySavedTemplate(resume.templateId);
                                        setActiveDocument("resume");
                                        setMobilePanelView("preview");
                                    }}
                                />
                            ))}
                        </SavedGroup>

                        <SavedGroup
                            title="Cover letter"
                            icon={Mail}
                            count={coverLetter ? 1 : 0}
                            empty="No cover letter for this job yet."
                        >
                            {coverLetter && (
                                <SavedRow
                                    icon={Mail}
                                    title="Cover letter"
                                    meta={`${coverLetter.trim().split(/\s+/).length} words${letterSaveState === "saving" ? " • saving…" : ""}`}
                                    active={activeDocument === "cover-letter"}
                                    onClick={() => {
                                        setActiveDocument("cover-letter");
                                        setMobilePanelView("preview");
                                    }}
                                />
                            )}
                        </SavedGroup>

                        <SavedGroup
                            title="Draft email"
                            icon={Send}
                            count={draftEmail ? 1 : 0}
                            empty="No draft email yet. Generate an Application Pack to create one."
                        >
                            {draftEmail && (
                                <SavedRow
                                    icon={Send}
                                    title="Draft email"
                                    meta={`${draftEmail.trim().split(/\s+/).length} words • kept for this session`}
                                    active={activeDocument === "email"}
                                    onClick={() => {
                                        setActiveDocument("email");
                                        setMobilePanelView("preview");
                                    }}
                                />
                            )}
                        </SavedGroup>
                    </div>
    );

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
                            <div className="p-5 border-b border-[var(--border-color)] bg-[var(--background)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-bold text-[var(--foreground)] leading-tight">{job.jobTitle}</h2>
                                        <p className="text-sm text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5 truncate">
                                            {job.company}
                                            {(job.jobUrl || job.sourceUrl) && (
                                                <a
                                                    href={(job.jobUrl || job.sourceUrl) as string}
                                                    target="_blank"
                                                    rel="noreferrer noopener"
                                                    title="View the original posting"
                                                    className="text-[var(--primary)] hover:opacity-80 shrink-0"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </p>
                                        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-2 text-xs text-[var(--text-secondary)]">
                                            {(formattedJd?.keyInfo?.location || job.location) && (
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5" /> {formattedJd?.keyInfo?.location || job.location}
                                                </span>
                                            )}
                                            {formattedJd?.keyInfo?.jobType && (
                                                <span className="flex items-center gap-1.5">
                                                    <Briefcase className="w-3.5 h-3.5" /> {formattedJd.keyInfo.jobType}
                                                </span>
                                            )}
                                            {relativeDay(job.createdAt) && (
                                                <span className="flex items-center gap-1.5">
                                                    <CalendarDays className="w-3.5 h-3.5" /> Saved {relativeDay(job.createdAt)}
                                                </span>
                                            )}
                                            {jdFormatting && (
                                                <span className="flex items-center gap-1.5 text-[var(--primary)]">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Structuring…
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => router.push("/dashboard/generator")}
                                        className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[var(--border-color)] text-xs font-semibold text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition"
                                    >
                                        <Repeat className="w-3.5 h-3.5" /> Change Job
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 px-3 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)] overflow-x-auto">
                                {([
                                    { id: "jd", label: "Job Description", icon: FileText },
                                    { id: "profile", label: "Master Profile", icon: User },
                                    { id: "saved", label: "Saved", icon: History },
                                    { id: "analysis", label: "Analysis", icon: BarChart3 },
                                ] as const).map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTab(t.id)}
                                        className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
                                            activeTab === t.id
                                                ? "border-[var(--primary)] text-[var(--primary)]"
                                                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                                        }`}
                                    >
                                        <t.icon className="h-3.5 w-3.5" /> {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
                                {activeTab === "jd" && (
                                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-4 w-full min-w-0">
                                        <JobDescriptionBody job={job as any} jd={formattedJd} />
                                    </div>
                                )}

                                {activeTab === "analysis" && (
                                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-4">
                                        <h4 className="text-sm font-bold text-[var(--foreground)] mb-1">Analysis</h4>
                                        <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                                            These are the keywords this posting screens for. Generate a resume and the
                                            ATS report will score your document against them.
                                        </p>
                                        {formattedJd && formattedJd.skills.length > 0 ? (
                                            <SkillChips skills={formattedJd.skills} />
                                        ) : (
                                            <p className="text-[13px] text-[var(--text-secondary)]">
                                                No skills or keywords were named in this posting.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {activeTab === "saved" && savedPanel}

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
                                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
                                    {/* Banner */}
                                    <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-3.5 mb-4">
                                        <div className="flex gap-2.5 min-w-0">
                                            <Sparkles className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-[var(--foreground)]">AI Generated Content</p>
                                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                                    Review and edit the content before downloading.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setHasGenerated(false)}
                                            className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border-color)] bg-[var(--background)] text-[11px] font-semibold text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                                        </button>
                                    </div>

                                    <SectionAccordion
                                        sections={editorSections}
                                        order={sectionOrder}
                                        onOrderChange={setSectionOrder}
                                    />

                                    {/* Custom sections manager */}
                                    <div className="mt-6 pt-5 border-t border-[var(--border-color)]">
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                                                <LayoutGrid className="w-4 h-4 text-[var(--primary)]" /> Custom Sections
                                            </h3>
                                            <AddButton label="Add Section" onClick={addCustomSection} />
                                        </div>
                                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">
                                            Create your own sections (e.g. Publications, Hobbies, Conferences). They appear
                                            in your resume preview and in the reorder list above.
                                        </p>

                                        {customSections.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-[var(--border-color)] py-6 text-center">
                                                <p className="text-[11px] text-[var(--text-secondary)]">
                                                    No custom sections yet. Click &ldquo;Add Section&rdquo; to create one.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {customSections.map((custom) => (
                                                    <div
                                                        key={custom.id}
                                                        className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-black/5 dark:bg-white/5 px-3 py-2"
                                                    >
                                                        <input
                                                            value={custom.title}
                                                            onChange={(e) => updateCustomSection(custom.id, "title", e.target.value)}
                                                            className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-[var(--foreground)] outline-none"
                                                            placeholder="Section title"
                                                        />
                                                        <button
                                                            onClick={() => removeCustomSection(custom.id)}
                                                            aria-label={`Remove ${custom.title || "section"}`}
                                                            className="shrink-0 text-[var(--text-secondary)] hover:text-red-500 transition"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-6" />
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

                            {activeSidebarTab === 'saved' && (
                                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
                                    {savedPanel}
                                </div>
                            )}

                            {/* STYLES TAB */}

                        </>
                    )}
                </div>

                {/* === RIGHT PANEL (PDF PREVIEW / IS GENERATING VIEW) === */}
                <div className={`${mobilePanelView === "preview" ? "flex" : "hidden"} md:flex flex-1 min-w-0 bg-black/5 dark:bg-[#525659] relative flex-col h-full border-l border-[var(--border-color)] overflow-hidden`}>
                    {(hasGenerated || coverLetter || draftEmail) && !isGenerating && (
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

                            <h2 className="text-3xl font-bold text-[var(--foreground)] mb-3 tracking-tight z-10">
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
                    ) : !hasGenerated && !activeDocumentHasContent ? (
                        <div className="flex-1 overflow-y-auto bg-[var(--background)]">
                            <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col items-center text-center">
                                {/* Drawn rather than shipped as an asset, so it recolours with the
                                    theme: a resume sheet flanked by a document and a sparkle tile. */}
                                <div className="relative w-[320px] h-[248px] mb-7 shrink-0" aria-hidden="true">
                                    <div className="absolute inset-x-8 inset-y-3 rounded-[3rem] bg-[var(--primary)]/[0.07]" />

                                    <div className="absolute left-1/2 -translate-x-1/2 top-1 w-[176px] h-[224px] rounded-2xl bg-[var(--background)] border border-[var(--border-color)] shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)] p-4">
                                        {/* avatar + name lines */}
                                        <div className="flex items-center gap-2.5 mb-3.5">
                                            <div className="w-8 h-8 rounded-full bg-[var(--border-color)] shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-1.5 rounded-full bg-[var(--border-color)]" style={{ width: "100%" }} />
                                                <div className="h-1.5 rounded-full bg-[var(--border-color)]" style={{ width: "62%" }} />
                                            </div>
                                        </div>

                                        <div className="h-1.5 rounded-full bg-[var(--border-color)] mb-4" style={{ width: "86%" }} />

                                        {/* bulleted sections */}
                                        <div className="space-y-[7px]">
                                            {["100%", "72%", "88%"].map((w, i) => (
                                                <div key={`a${i}`} className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]/70 shrink-0" />
                                                    <div className="h-1.5 rounded-full bg-[var(--border-color)]" style={{ width: w }} />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="h-3" />

                                        <div className="space-y-[7px]">
                                            {["92%", "66%", "80%"].map((w, i) => (
                                                <div key={`b${i}`} className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]/70 shrink-0" />
                                                    <div className="h-1.5 rounded-full bg-[var(--border-color)]" style={{ width: w }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="absolute left-1 top-[38%] w-12 h-12 rounded-2xl bg-[var(--background)] border border-[var(--border-color)] shadow-[0_8px_20px_-8px_rgba(15,23,42,0.3)] flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-blue-500" strokeWidth={2} />
                                    </div>

                                    <div className="absolute right-1 top-[44%] w-12 h-12 rounded-2xl bg-[var(--background)] border border-[var(--border-color)] shadow-[0_8px_20px_-8px_rgba(15,23,42,0.3)] flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-violet-500" strokeWidth={2} />
                                    </div>
                                </div>

                                <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                                    Your Job Details are Ready
                                </h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md leading-relaxed">
                                    Use the details from this job post and your Master Profile to generate a tailored,
                                    ATS-optimised resume.
                                </p>

                                {/* What happens next */}
                                <div className="w-full mt-8 rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/60 p-5 text-left">
                                    <p className="text-xs font-bold text-[var(--foreground)] mb-4">What will happen next?</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {[
                                            { icon: Search, title: "AI Analysis", body: "We analyse the job description and match it with your profile." },
                                            { icon: FileText, title: "Generate Resume", body: "Get a tailored, ATS-optimised resume." },
                                            { icon: SlidersHorizontal, title: "Review & Refine", body: "Edit, fine-tune and download your resume." },
                                        ].map((step, i) => (
                                            <div key={step.title} className="relative">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                                                        <step.icon className="w-4 h-4" />
                                                    </span>
                                                    <span className="w-6 h-6 rounded-full bg-[var(--background)] border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-secondary)] flex items-center justify-center">
                                                        {i + 1}
                                                    </span>
                                                    {i < 2 && (
                                                        <ChevronRight className="hidden sm:block w-4 h-4 text-[var(--text-secondary)] absolute -right-2.5 top-2" />
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-[var(--foreground)]">{step.title}</p>
                                                <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{step.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Generation actions — three outlined documents on the left,
                                    the combined pack on the right, split by a divider. */}
                                <div className="w-full mt-6 flex flex-col xl:flex-row gap-4">
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <div className="h-px bg-[var(--border-color)] flex-1 min-w-4" />
                                            <span className="text-[11px] text-[var(--text-secondary)] whitespace-nowrap shrink-0">
                                                Generate individual documents
                                            </span>
                                            <div className="h-px bg-[var(--border-color)] flex-1" />
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 flex-1">
                                            <button
                                                disabled={isGenerating}
                                                onClick={() => handleGenerateResumeOnly()}
                                                className="min-h-[52px] rounded-xl bg-[var(--background)] border-2 border-blue-500/60 hover:border-blue-500 text-[13px] font-bold text-[var(--foreground)] flex items-center justify-center gap-2 hover:shadow-md transition disabled:opacity-50"
                                            >
                                                <FileText className="w-4 h-4 text-blue-500 shrink-0" strokeWidth={2.5} />
                                                <span className="whitespace-nowrap">Resume</span>
                                            </button>
                                            <button
                                                disabled={isGenerating}
                                                onClick={() => handleGenerateCoverLetter()}
                                                className="min-h-[52px] rounded-xl bg-[var(--background)] border-2 border-fuchsia-500/60 hover:border-fuchsia-500 text-[13px] font-bold text-[var(--foreground)] flex items-center justify-center gap-2 hover:shadow-md transition disabled:opacity-50"
                                            >
                                                <Mail className="w-4 h-4 text-fuchsia-500 shrink-0" strokeWidth={2.5} />
                                                <span className="whitespace-nowrap">Cover Letter</span>
                                            </button>
                                            <button
                                                disabled={isGenerating}
                                                onClick={() => handleGenerateEmail()}
                                                className="min-h-[52px] rounded-xl bg-[var(--background)] border-2 border-emerald-500/60 hover:border-emerald-500 text-[13px] font-bold text-[var(--foreground)] flex items-center justify-center gap-2 hover:shadow-md transition disabled:opacity-50"
                                            >
                                                <Send className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                                                <span className="whitespace-nowrap">Draft Email</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="hidden xl:block w-px bg-[var(--border-color)] self-stretch shrink-0" />

                                    <button
                                        onClick={() => handleGenerateResume()}
                                        disabled={isGenerating}
                                        style={{ backgroundImage: "linear-gradient(to right, #3B82F6, #2563EB)" }}
                                        className="group w-full xl:w-[40%] shrink-0 min-h-[84px] rounded-xl text-white flex items-center gap-3 px-4 hover:shadow-lg transition disabled:opacity-50"
                                    >
                                        <span className="flex items-center gap-1 shrink-0">
                                            {isGenerating ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Wand2 className="w-5 h-5" />
                                                    <Rocket className="w-5 h-5" />
                                                </>
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1 text-left">
                                            <span className="block text-[15px] font-bold leading-tight whitespace-nowrap">
                                                {isGenerating ? "Working…" : "Application Pack"}
                                            </span>
                                            <span className="block text-[11px] text-white/85 leading-tight mt-0.5">
                                                Resume + Cover Letter + Email
                                            </span>
                                        </span>
                                        <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>

                                <p className="w-full text-[11px] text-[var(--text-secondary)] mt-3 text-center">
                                    1 credit is used per generation.
                                </p>
                            </div>
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
                                {letterSaveState !== "idle" && (
                                    <span className="absolute top-4 left-4 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                                        {letterSaveState === "saving" ? (
                                            <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                                        ) : (
                                            <><Check className="w-3 h-3 text-emerald-500" /> Saved</>
                                        )}
                                    </span>
                                )}
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

                <ImproveWithAIDialog

                    open={aiDialogOpen}

                    title="Improve Summary with AI"

                    subtitle="Choose one of the AI-generated summary options for this role."

                    variants={aiVariants}

                    loading={aiLoading}

                    error={aiError}

                    onRegenerate={fetchSummaryVariants}

                    onApply={(text) => {

                        updateField('summary', text);

                        setAiDialogOpen(false);

                    }}

                    onClose={() => setAiDialogOpen(false)}

                />


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

/** One labelled group in the Saved tab, with its own empty state. */
function SavedGroup({
    title,
    icon: Icon,
    count,
    empty,
    children,
}: {
    title: string;
    icon: React.ElementType;
    count: number;
    empty: string;
    children: React.ReactNode;
}) {
    return (
        <section>
            <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5 text-[var(--primary)]" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{title}</h4>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-70">{count}</span>
            </div>
            {count === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--border-color)] px-3 py-4 text-center text-[11px] text-[var(--text-secondary)]">
                    {empty}
                </p>
            ) : (
                <div className="space-y-2">{children}</div>
            )}
        </section>
    );
}

function SavedRow({
    icon: Icon,
    title,
    meta,
    active,
    onClick,
}: {
    icon: React.ElementType;
    title: string;
    meta: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            aria-current={active ? "true" : undefined}
            className={`group w-full text-left rounded-lg border p-3 transition ${active
                ? "border-[var(--primary)] bg-[var(--primary)]/8"
                : "border-[var(--border-color)] bg-black/5 dark:bg-white/5 hover:border-[var(--primary)]/50 hover:bg-black/10 dark:hover:bg-white/10"
                }`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className="grid place-items-center h-9 w-9 shrink-0 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] transition group-hover:bg-[var(--primary)]/25">
                    <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[var(--foreground)] transition group-hover:text-[var(--primary)]">
                        {title}
                    </span>
                    <span className="block truncate text-[10px] text-[var(--text-secondary)]">{meta}</span>
                </span>
            </div>
        </button>
    );
}

function Input({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return <div className="mb-2 w-full"><label className="text-[10px] uppercase text-[var(--text-secondary)] font-bold block mb-1">{label}</label><input type="text" className="w-full bg-black/5 dark:bg-black/30 border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--primary)] outline-none transition-colors" value={value} onChange={(e) => onChange(e.target.value)} /></div>
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[var(--border-color)] text-[11px] font-semibold text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
            <Plus className="w-3 h-3" /> {label}
        </button>
    );
}

function EntryCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
    return (
        <div className="relative group rounded-lg border border-[var(--border-color)] bg-black/5 dark:bg-white/5 p-3 mb-3 hover:border-[var(--foreground)]/20 transition-colors">
            <button
                onClick={onRemove}
                aria-label="Remove entry"
                className="absolute top-2.5 right-2.5 text-[var(--text-secondary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
            {children}
        </div>
    );
}

/** Simple newline-per-item list, for sections that are just strings. */
function ListEditor({
    value,
    onChange,
    placeholder,
}: {
    value?: string[] | string;
    onChange: (next: string[]) => void;
    placeholder: string;
}) {
    const text = Array.isArray(value) ? value.join("\n") : value || "";
    return (
        <textarea
            className="w-full h-24 bg-[var(--background)]/50 border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--foreground)]/90 focus:border-[var(--primary)] outline-none resize-none leading-relaxed"
            value={text}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value.split("\n").map((v) => v.trimStart()))}
        />
    );
}
