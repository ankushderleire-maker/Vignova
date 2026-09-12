from typing import List, Dict, Any
from pydantic import BaseModel


class Skills(BaseModel):
    technical: str = ""
    soft: str = ""

class SkillGroup(BaseModel):
    """
    Skills as a labelled block — "Cloud & DevOps: Docker, AWS, Nginx".

    `Skills.technical` stays the flat, comma-separated truth that every
    template and the ATS scorer read; this is the same content arranged the
    way a strong resume presents it, for templates that can lay it out.
    """
    label: str = ""
    skills: List[str] = []

class Experience(BaseModel):
    id: str = ""
    company: str = ""
    role: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    description: Any = "" # Changed to Any to handle string or list during parsing
    impact: str = ""

class Education(BaseModel):
    id: str = ""
    school: str = ""
    degree: str = ""
    field: str = ""
    startDate: str = ""
    endDate: str = ""
    grade: str = ""

class Project(BaseModel):
    id: str = ""
    name: str = ""
    techStack: str = ""
    link: str = ""
    description: Any = "" # Changed to Any

class Certification(BaseModel):
    id: str = ""
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: str = ""

class Language(BaseModel):
    id: str = ""
    name: str = ""
    proficiency: str = ""

class ResumeSchema(BaseModel):
    fullName: str = ""
    jobTitle: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    website: str = ""
    linkedin: str = ""
    github: str = ""
    summary: str = ""
    skills: Skills = Skills()
    skillGroups: List[SkillGroup] = []
    experience: List[Experience] = []
    education: List[Education] = []
    projects: List[Project] = []
    certifications: List[Certification] = []
    languages: List[Language] = []

class TailorRequest(BaseModel):
    jobDescription: str
    masterProfile: Dict[str, Any]
    atsReport: Any = None

class ScoreRequest(BaseModel):
    userProfile: str
    jobDescription: str
    userSkills: List[str] = []
