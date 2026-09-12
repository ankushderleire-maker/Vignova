"""Offline regressions: no model, scraping, database access or real user data."""
import ast
import importlib.util
import json
from pathlib import Path
import re
import unittest

# Import the pure utility directly: app/__init__.py starts the full API stack.
utility = Path(__file__).resolve().parents[1] / "app/utils/linkedin_skills.py"
spec = importlib.util.spec_from_file_location("linkedin_skills", utility)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
clean_skill_details = module.clean_skill_details
coerce_skill_list = module.coerce_skill_list
collect_master_skills = module.collect_master_skills


class SkillTests(unittest.TestCase):
    def test_contacts_and_headings_are_not_skills(self):
        invalid = ["person@example.org", "Contact: person@example.org", "+353 891234567",
                   "0891234567", "Phone: (212) 555-0199", "Call +44 7700 900123",
                   "person＠example.org", "person\u200b@example.org", "Certifications",
                   "Technical Skills", "https://example.org/cv", "www.example.org",
                   "Education", "Email: person", "Phone", None, 123456789, {}, True]
        self.assertEqual(coerce_skill_list(invalid), [])
        self.assertEqual(coerce_skill_list(["Python", *invalid, "SQL"]), ["Python", "SQL"])

    def test_real_skills_keep_punctuation_and_versions(self):
        skills = ["C++", "C#", "R", "C", "CI/CD", ".NET", "Node.js", "ASP.NET",
                  "AWS S3", "Python 3", "HTML5", "ISO 27001", "Email marketing",
                  "LLMs (GPT-4, Gemini)", "3D modelling"]
        self.assertEqual(coerce_skill_list(skills), skills)
        self.assertEqual(coerce_skill_list("C++, C#; CI/CD | LLMs (GPT-4, Gemini)\nR"),
                         ["C++", "C#", "CI/CD", "LLMs (GPT-4, Gemini)", "R"])

    def test_grouped_skills_ignore_object_metadata(self):
        self.assertEqual(coerce_skill_list({"technical": "Python, SQL", "soft": ["Leadership"],
                                           "email": "person@example.org"}), ["Python", "SQL", "Leadership"])
        details = clean_skill_details([{"name": "Python", "endorsements": "3", "positions": ["Developer"]},
                                       {"name": "person@example.org"}, {"title": "SQL"}, "python"])
        self.assertEqual([item["name"] for item in details], ["Python", "SQL"])
        self.assertEqual(details[0]["endorsements"], "3")
        self.assertEqual(coerce_skill_list({"name": "person@example.org", "endorsements": "Python"}), [])

    def test_master_keywords_only_come_from_skill_fields(self):
        master = {"fullName": "Example Person", "jobTitle": "Developer", "summary": "Career summary",
                  "contact": {"email": "person@example.org", "phone": "+353 891234567"},
                  "sectionOrder": ["skills", "certifications"],
                  "skills": {"technical": "Python, CI/CD, person@example.org", "soft": "Leadership"},
                  "projects": [{"name": "Example Project", "techStack": "C++, SQL", "link": "https://example.org"}],
                  "certifications": ["AWS Certified Developer"], "education": [{"school": "Example University"}]}
        self.assertEqual(collect_master_skills(master), ["Python", "CI/CD", "Leadership", "C++", "SQL"])
        self.assertEqual(collect_master_skills({"contact": master["contact"], "fullName": "Example Person"}), [])

    def test_deduplication_limits_and_idempotence(self):
        values = [" Python ", "python", "SQL", "sql", "Leadership"]
        self.assertEqual(coerce_skill_list(values, 2), ["Python", "SQL"])
        self.assertEqual(coerce_skill_list(coerce_skill_list(values)), coerce_skill_list(values))
        self.assertEqual(coerce_skill_list(values, 0), [])


def offline_route_helpers():
    # Load the actual pure post-processing call graph without importing the
    # route module's production model/database configuration. Readability is
    # unrelated to these regressions, so its NLP dependency is stubbed.
    route = Path(__file__).resolve().parents[1] / "app/routes/linkedin.py"
    tree = ast.parse(route.read_text(encoding="utf-8"))
    definitions = {node.name: node for node in tree.body if isinstance(node, ast.FunctionDef)}
    wanted = {"_fallback_linkedin_optimization", "_ensure_score_friendly_profile", "_normalize_linkedin_profile"}
    pending = list(wanted)
    while pending:
        for node in ast.walk(definitions[pending.pop()]):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                name = node.func.id
                if name in definitions and name not in wanted and name != "_calculate_linkedin_readability_score":
                    wanted.add(name)
                    pending.append(name)
    namespace = {"json": json, "re": re, "coerce_skill_list": coerce_skill_list,
                 "collect_master_skills": collect_master_skills, "clean_skill_details": clean_skill_details,
                 "_calculate_linkedin_readability_score": lambda _: {"score": 100}}
    module = ast.Module(body=[definitions[name] for name in sorted(wanted)], type_ignores=[])
    exec(compile(module, str(route), "exec"), namespace)
    return namespace


class OptimizationFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.helpers = offline_route_helpers()

    def test_ai_and_fallback_never_promote_contact_or_ats_fragments(self):
        source = {"headline": "Developer", "skills": ["Python", "person@example.org", "+353 891234567"],
                  "topSkills": ["SQL", "Certifications"], "skillDetails": [{"name": "person@example.org"}],
                  "contact": {"email": "person@example.org"},
                  "experience": [{"title": "Developer", "associatedSkills": "Python, +353 891234567"}],
                  "projects": [{"title": "Search", "description": "Built a search tool.", "skills": ["Python", "person@example.org"]}]}
        master = {"skills": {"technical": "Python, SQL"}, "email": "person@example.org"}
        keywords = collect_master_skills(master)
        missing = ["person", "example.org", "Certifications", "+353 891234567", "SQL"]
        outputs = [self.helpers["_ensure_score_friendly_profile"](
            {"skills": ["SQL", "person@example.org", "+353 891234567"]}, source, keywords, missing, master),
            self.helpers["_fallback_linkedin_optimization"](source, keywords, missing, master)]
        for result in outputs:
            self.assertEqual(set(result["skills"]), {"Python", "SQL"})
            self.assertEqual(result["contact"], source["contact"])
            self.assertEqual(result["topSkills"], ["SQL"])
            self.assertEqual(result["skillDetails"], [])
            for section in ("experience", "projects"):
                for item in result[section]:
                    self.assertNotIn("person@example.org", json.dumps(item))
                    self.assertNotIn("891234567", json.dumps(item))


if __name__ == "__main__":
    unittest.main()
