
import sys

file_path = "app/dashboard/ats-score/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Remove duplicate score from sidebar
duplicate_score = """                                    <div className="px-2 py-1.5 mb-1">
                                        <div className={`text-2xl font-bold ${result.overall_ats_score >= 80 ? 'text-green-600 dark:text-green-500' : result.overall_ats_score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {result.overall_ats_score}%
                                        </div>
                                        <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">ATS Score</p>
                                    </div>
                                    <div className="border-t border-[var(--border-color)] pt-1.5">"""
text = text.replace(duplicate_score, '                                    <div className="pt-1.5">')

# 2. Update sidebar onClick
text = text.replace("onClick={() => setActiveSection(tab.id)}", "onClick={() => { setActiveSection(tab.id); document.getElementById(tab.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}")

# 3. Update Content Area div
text = text.replace('<div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-2">', '<div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-2 space-y-12 pb-12">')

# 4. Remove condition checks and add <div id="...">
# Overview
text = text.replace('{activeSection === "overview" && (<>', '<div id="overview" className="space-y-6">')
text = text.replace("                                        </div>\n                                    )}\n                                </>)}", "                                        </div>\n                                    )}\n                                </div>")

# Keywords
text = text.replace('{activeSection === "keywords" && (', '<div id="keywords" className="space-y-6">')
text = text.replace("                                        </div>\n                                    </div>\n                                )}", "                                        </div>\n                                    </div>\n                                </div>")

# Sections
text = text.replace('{activeSection === "sections" && (', '<div id="sections" className="space-y-6">')
# Sections uses the exact same closing as Keywords in my previous analysis, wait, let's double check if they clash.
# I will just replace `)}` for sections by exact strings if I can.

