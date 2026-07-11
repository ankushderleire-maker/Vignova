
import sys
import re

file_path = "app/dashboard/ats-score/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Insert the SectionHeader component at the top of the file
section_header_code = """
const SectionHeader = ({ number, title }: { number: number, title: string }) => (
    <div className="flex items-center justify-between mb-4 mt-8">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#6366f1] text-white flex items-center justify-center font-bold text-sm shadow-md">
                {number}
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)]">{title}</h3>
        </div>
        <button className="text-[#6366f1] text-xs font-semibold hover:bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 transition-colors">
            View Details
        </button>
    </div>
);
"""
text = text.replace("import { CustomDialog } from \"@/components/ui/CustomDialog\";\n", "import { CustomDialog } from \"@/components/ui/CustomDialog\";\n" + section_header_code)


# We are replacing the entire layout of the result step.
# Find `<div className="flex gap-6">`
start_idx = text.find('<div className="flex gap-6">')

# Find `{/* --- LOADING STEP --- */}`
end_idx = text.rfind('}\n\n            {/* --- LOADING STEP --- */}')
if end_idx == -1:
    end_idx = text.rfind('}\n            {/* --- LOADING STEP --- */}')

if start_idx == -1 or end_idx == -1:
    print("Could not find bounds")
    exit(1)

with open("new_result_step.tsx", "r", encoding="utf-8") as f:
    new_top_section = f.read()

# We need to extract the parts from the old text that we want to keep, like the Score Breakdown progress bars, Keywords, Sections, etc.
# Actually, I can just use my `scratch_refactor3.py` logic to remove the `{activeSection === "..." && (<>` tags!
# Because the layout of the individual cards is ALREADY fine! I just need to remove the top level wrappers, and add the `<SectionHeader />` before each section.

