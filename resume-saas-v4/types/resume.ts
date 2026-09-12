// types/resume.ts

export type Experience = {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string | string[]; // AI might return array or string
  location: string;
  /**
   * One line closing the role: what was different because this person held it.
   * Where a support-shaped history keeps its figures — the individual duties of
   * coordination or testing work rarely carry one.
   */
  impact?: string;
};

export type Education = {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  /** Grade or GPA. Collected by the profile form; optional everywhere. */
  grade?: string;
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
  /** Collected by the profile form since the beginning; no template
   *  rendered it, and the generate routes never copied it here. */
  github?: string;
  /**
   * Right to work, as it reads in a contact line: "Stamp 1G", "EU Citizen".
   * Both of the reference resumes this house style is drawn from carry one.
   */
  workAuthorization?: string;
};

/** An award or piece of recognition, as the profile stores it. */
export type Achievement = {
  id?: string;
  title: string;
  description?: string;
  date?: string;
};

/**
 * Skills as a labelled block — "Cloud & DevOps: Docker, AWS, Nginx".
 *
 * `skills` stays the flat list every template already reads; this is the same
 * content arranged the way a strong resume presents it, for templates that lay
 * it out as a labelled grid.
 */
export type SkillGroup = {
  label: string;
  skills: string[];
};

/** A section the user invented, e.g. Publications or Conferences. */
export type CustomSection = {
  id: string;
  title: string;
  content: string;
};

// This is the formatted data structure the Frontend/PDF Engine expects
export type ResumeData = {
  fullName: string;
  jobTitle: string;
  contact: ContactInfo;
  summary: string;
  skills: string[] | { technical?: string; soft?: string }; // Expanded to handle object from API
  /** The same skills under headings, when the generator produced them. */
  skillGroups?: SkillGroup[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications?: string[];
  languages?: string[];
  /** Awards, structured, for the templates that lay them out. */
  achievements?: Achievement[];
  /**
   * The same awards as plain lines, for the templates that do not know about
   * them — composeSections appends this under an "Awards" heading.
   */
  awards?: string[];
  /** The references note, one line per reference. */
  references?: string;
  customSections?: CustomSection[];
  /** Section ids in the order the user arranged them. Absent means the default. */
  sectionOrder?: string[];
  [key: string]: any; // Allow dynamic fields (e.g. awards, custom sections)
};