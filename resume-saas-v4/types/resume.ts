// types/resume.ts

export type Experience = {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string | string[]; // AI might return array or string
  location: string;
};

export type Education = {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
};

export type Project = {
  id: string;
  name: string;
  techStack: string;
  link?: string;
  description: string | string[];
};

export type ContactInfo = {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
};

// This is the formatted data structure the Frontend/PDF Engine expects
export type ResumeData = {
  fullName: string;
  jobTitle: string;
  contact: ContactInfo;
  summary: string;
  skills: string[] | { technical?: string; soft?: string }; // Expanded to handle object from API
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications?: string[];
  languages?: string[];
  [key: string]: any; // Allow dynamic fields (e.g. awards, custom sections)
};