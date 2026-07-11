
import sys

file_path = "app/dashboard/ats-score/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Replace Sidebar block
idx_start = text.find('<div className="flex-1 min-h-0 flex gap-4">')
idx_end = text.find('<div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-2">')
if idx_start != -1 and idx_end != -1:
    idx_end += len('<div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-2">')
    new_content = """<div className="flex-1 min-h-0 flex flex-col items-center">
                            {/* -- Content Area (Single Page) -- */}
                            <div className="w-full max-w-6xl overflow-y-auto custom-scrollbar px-2 space-y-16 pb-12 pt-4">"""
    text = text[:idx_start] + new_content + text[idx_end:]

# Now replace the opening `{activeSection === "..." && (` strings
text = text.replace('{activeSection === "overview" && (<>', '')
text = text.replace('{activeSection === "keywords" && (', '')
text = text.replace('{activeSection === "sections" && (', '')
text = text.replace('{activeSection === "improvements" && (<>', '')
text = text.replace('{activeSection === "content" && (<>', '')
text = text.replace('{activeSection === "review" && (<>', '')
text = text.replace('{activeSection === "ai" && (', '')

# And now manually fix the closing strings by looking at the exact text.
# The exact text for overview closing:
text = text.replace("                                        </div>\n                                    )}\n                                </>)}", "                                        </div>\n                                    )}")

# Keywords closing:
text = text.replace("                                        </div>\n                                    </div>\n                                )}", "                                        </div>\n                                    </div>")

# Sections closing: (matches keywords closing)
text = text.replace("                                        </div>\n                                    </div>\n                                )}", "                                        </div>\n                                    </div>")

# Improvements closing:
text = text.replace("                                        </div>\n                                    )}\n                                </>)}", "                                        </div>\n                                    )}")

# Content closing:
text = text.replace("                                        </div>\n                                    )}\n                                </>)}", "                                        </div>\n                                    )}")

# Review closing:
text = text.replace("                                                </div>\n                                            </div>\n                                        </div>\n                                    )}\n                                </>)}", "                                                </div>\n                                            </div>\n                                        </div>\n                                    )}")

# AI closing:
text = text.replace("                                        )}\n                                    </div>\n                                )}\n\n                            </div>", "                                        )}\n                                    </div>\n\n                            </div>")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("Done")

