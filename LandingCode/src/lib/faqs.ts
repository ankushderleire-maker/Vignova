// Shared so the FAQ section and the FAQPage JSON-LD never drift apart.
export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "What is Vignova and how does it work?",
    a: "Vignova is an all-in-one AI career copilot. You start by creating a Master Profile with your entire work history. Then, using our Chrome Extension or web app, you can save jobs, instantly tailor your resume to match specific job descriptions, analyze your ATS score, and track your applications in a built-in Kanban board."
  },
  {
    q: "How can Vignova help me get a job faster?",
    a: "By automating the most tedious parts of the job search. Instead of spending 45 minutes manually tweaking your resume for every application, Vignova does it in under 5 minutes. That leaves you time to apply to more roles with a resume actually matched to each one, instead of sending the same generic document everywhere."
  },
  {
    q: "Do I need an existing resume to use Vignova?",
    a: "Not at all! You can build your Master Profile from scratch, or you can import your existing PDF resume or LinkedIn profile to get a massive head start."
  },
  {
    q: "Will my Vignova resume be ATS-friendly?",
    a: "Yes. Our templates use single-column, machine-readable layouts built for modern Applicant Tracking Systems such as Greenhouse, Workday and Lever. We avoid complex tables or graphics that confuse parsing algorithms."
  },
  {
    q: "Does using AI mean my resume will sound generic?",
    a: "No, because Vignova uses your Master Profile as its source of truth. It doesn't hallucinate fake experience; it simply reframes and highlights your actual, authentic achievements to perfectly match the keywords and requirements of the job you want."
  },
  {
    q: "Can employers tell if I used AI to write my application?",
    a: "Vignova is designed to enhance your own writing, not replace it. The output sounds professional and human because it's fundamentally based on your real experience. Furthermore, you have full control to edit and tweak any AI-generated text in our side-by-side editor."
  },
  {
    q: "Is Vignova free to use? Do you offer a free trial?",
    a: "We offer a generous free tier that allows you to create a Master Profile, use the job tracker, and generate your first tailored resumes. For advanced power users, we offer a premium subscription."
  },
  {
    q: "Do I have to pay separately for each feature?",
    a: "No! A premium subscription to Vignova includes unlimited access to all features: the AI Resume Studio, the Chrome Extension, the ATS Analyzer, and the Job Tracker."
  },
  {
    q: "Can I create multiple versions of my resume?",
    a: "Yes, you can generate and save an unlimited number of tailored resumes. Each tailored resume is linked to the specific job you saved in your tracker, keeping you perfectly organized."
  },
  {
    q: "Can I edit AI-generated resumes and pick templates?",
    a: "Absolutely. You are always in the driver's seat. You can regenerate specific bullet points, rewrite sections manually, and instantly switch between our 6+ professional, ATS-approved templates."
  },
  {
    q: "Can Vignova generate cover letters for me?",
    a: "Yes. Based on the job description and your Master Profile, Vignova can instantly draft highly personalized cover letters that explain exactly why your background makes you the perfect fit."
  },
  {
    q: "How is Vignova different from ChatGPT or other resume builders?",
    a: "Unlike ChatGPT which forgets context, Vignova remembers your entire career history (Master Profile). Unlike standard resume builders that just give you a PDF layout, Vignova actively writes the content, scores it for ATS compatibility, and tracks your job hunt from end to end."
  },
  {
    q: "Is my data private and secure?",
    a: "We use enterprise-grade encryption for all user data. Your resume and personal details are never sold to third parties, and you can export or delete your data entirely at any time."
  }
];
