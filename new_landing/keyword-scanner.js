/*
 * Vignova resume keyword scanner.
 *
 * Runs entirely in the browser: the resume and the job description are never
 * sent anywhere or stored. It finds skills, tools and repeated requirement
 * terms in a job description and checks which of them appear in the resume.
 * That is keyword coverage, one of several things a resume check looks at.
 * It is not a prediction of whether an applicant tracking system or a
 * recruiter will shortlist the resume.
 *
 * The skills list grows out of the Vignova extension's local scorer, widened
 * beyond software roles to the finance, HR, sales, marketing, operations and
 * engineering jobs common on Indian job boards.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VignovaKeywordScanner = api;
  if (typeof document !== 'undefined') api.mount();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // [label, weight, ...variants]. Variants are lowercase. Weight 3 = a specific
  // tool, platform or certification; 2 = a core functional skill; 1 = a
  // general or soft skill. Ambiguous words ("go", "r", "c", "less", "spring",
  // "express", "teams") are only listed in unambiguous forms.
  var TERMS = [
    // Programming and web
    ['Python', 2, 'python'], ['Java', 2, 'java', 'core java'], ['JavaScript', 1, 'javascript', 'js', 'ecmascript'],
    ['TypeScript', 2, 'typescript'], ['C++', 2, 'c++', 'cpp'], ['C#', 2, 'c#', 'csharp'], ['C programming', 2, 'c programming', 'c language', 'embedded c'],
    ['Go (Golang)', 2, 'golang'], ['R programming', 2, 'r programming', 'r language', 'rstudio'], ['PHP', 2, 'php'],
    ['Ruby on Rails', 3, 'ruby on rails'], ['Kotlin', 3, 'kotlin'], ['Swift', 3, 'swift'], ['Scala', 3, 'scala'], ['Rust', 3, 'rust'],
    ['HTML', 1, 'html', 'html5'], ['CSS', 1, 'css', 'css3'], ['Tailwind CSS', 2, 'tailwind css', 'tailwindcss', 'tailwind'],
    ['Bootstrap', 2, 'bootstrap'], ['React', 2, 'react', 'react.js', 'reactjs'], ['Next.js', 3, 'next.js', 'nextjs'],
    ['Angular', 2, 'angular', 'angularjs'], ['Vue.js', 2, 'vue', 'vue.js', 'vuejs'], ['Redux', 2, 'redux'],
    ['Node.js', 2, 'node.js', 'nodejs', 'node js'], ['Express.js', 3, 'express.js', 'expressjs'], ['NestJS', 3, 'nestjs'],
    ['Django', 3, 'django'], ['Flask', 3, 'flask'], ['FastAPI', 3, 'fastapi'], ['Spring Boot', 3, 'spring boot'],
    ['.NET', 2, '.net', 'asp.net', 'dotnet', '.net core'], ['Laravel', 3, 'laravel'], ['REST APIs', 2, 'rest api', 'rest apis', 'restful', 'restful apis'],
    ['GraphQL', 3, 'graphql'], ['Microservices', 3, 'microservices', 'microservice architecture'], ['System design', 3, 'system design'],
    ['Data structures and algorithms', 2, 'data structures', 'algorithms', 'dsa'], ['Object-oriented programming', 2, 'object oriented programming', 'object-oriented programming', 'oops', 'oop'],
    ['Android development', 2, 'android', 'android development'], ['iOS development', 2, 'ios', 'ios development'],
    ['Flutter', 3, 'flutter'], ['React Native', 3, 'react native'], ['Unit testing', 2, 'unit testing', 'unit tests'],
    // Cloud, DevOps and tools
    ['AWS', 3, 'aws', 'amazon web services'], ['Microsoft Azure', 3, 'azure', 'microsoft azure'], ['Google Cloud', 3, 'gcp', 'google cloud', 'google cloud platform'],
    ['Docker', 3, 'docker'], ['Kubernetes', 3, 'kubernetes', 'k8s'], ['Terraform', 3, 'terraform'], ['Ansible', 3, 'ansible'],
    ['Jenkins', 3, 'jenkins'], ['CI/CD', 2, 'ci/cd', 'cicd', 'ci cd', 'continuous integration', 'continuous deployment'],
    ['Git', 1, 'git'], ['GitHub', 1, 'github'], ['Linux', 2, 'linux', 'unix'], ['Shell scripting', 2, 'shell scripting', 'bash scripting', 'bash'],
    ['JIRA', 1, 'jira'], ['Confluence', 1, 'confluence'], ['Postman', 2, 'postman'], ['Agile', 1, 'agile'], ['Scrum', 1, 'scrum'],
    ['DevOps', 2, 'devops'], ['Cybersecurity', 3, 'cybersecurity', 'cyber security', 'information security'], ['Networking', 2, 'networking', 'tcp/ip'],
    // Testing
    ['Manual testing', 2, 'manual testing'], ['Automation testing', 2, 'automation testing', 'test automation'], ['Selenium', 3, 'selenium'],
    ['Cypress', 3, 'cypress'], ['Playwright', 3, 'playwright'], ['API testing', 2, 'api testing'], ['Test cases', 2, 'test cases', 'test case design'],
    ['Regression testing', 2, 'regression testing'], ['JUnit', 3, 'junit'], ['TestNG', 3, 'testng'], ['Pytest', 3, 'pytest'], ['Jest', 3, 'jest'],
    // Data and AI
    ['SQL', 2, 'sql'], ['MySQL', 2, 'mysql'], ['PostgreSQL', 3, 'postgresql', 'postgres'], ['MongoDB', 3, 'mongodb', 'mongo db'],
    ['Oracle Database', 2, 'oracle database', 'oracle db', 'pl/sql', 'plsql'], ['SQL Server', 2, 'sql server', 'ms sql', 'mssql'], ['Redis', 3, 'redis'],
    ['Excel', 2, 'excel', 'ms excel', 'microsoft excel'], ['Advanced Excel', 2, 'advanced excel'], ['Pivot tables', 2, 'pivot table', 'pivot tables'],
    ['VLOOKUP', 2, 'vlookup', 'xlookup', 'lookup functions'], ['VBA and macros', 3, 'vba', 'macros', 'excel macros'], ['Google Sheets', 2, 'google sheets'],
    ['Power BI', 3, 'power bi', 'powerbi'], ['Tableau', 3, 'tableau'], ['Looker Studio', 3, 'looker studio', 'looker', 'google data studio'],
    ['Data analysis', 2, 'data analysis', 'data analytics', 'analysing data', 'analyzing data'], ['Data visualisation', 2, 'data visualization', 'data visualisation'],
    ['Dashboards', 2, 'dashboard', 'dashboards'], ['Statistics', 2, 'statistics', 'statistical analysis', 'statistical modelling', 'statistical modeling'],
    ['A/B testing', 3, 'a/b testing', 'ab testing', 'a/b tests'], ['ETL', 3, 'etl', 'elt'], ['Data warehousing', 3, 'data warehouse', 'data warehousing'],
    ['Data modelling', 2, 'data modeling', 'data modelling'], ['Snowflake', 3, 'snowflake'], ['BigQuery', 3, 'bigquery'], ['Databricks', 3, 'databricks'],
    ['Apache Spark', 3, 'apache spark', 'pyspark', 'spark'], ['Hadoop', 3, 'hadoop'], ['Kafka', 3, 'kafka', 'apache kafka'], ['Airflow', 3, 'airflow', 'apache airflow'],
    ['Pandas', 3, 'pandas'], ['NumPy', 3, 'numpy'], ['Matplotlib', 3, 'matplotlib', 'seaborn'], ['Jupyter', 2, 'jupyter', 'jupyter notebook'],
    ['Machine learning', 2, 'machine learning'], ['Deep learning', 3, 'deep learning'], ['Artificial intelligence', 2, 'artificial intelligence', 'ai'],
    ['Natural language processing', 3, 'natural language processing', 'nlp'], ['Computer vision', 3, 'computer vision', 'opencv'],
    ['Generative AI', 3, 'generative ai', 'genai', 'gen ai'], ['Large language models', 3, 'large language models', 'llm', 'llms'],
    ['Prompt engineering', 3, 'prompt engineering'], ['Scikit-learn', 3, 'scikit-learn', 'sklearn', 'scikit learn'], ['TensorFlow', 3, 'tensorflow', 'keras'],
    ['PyTorch', 3, 'pytorch'], ['MLOps', 3, 'mlops'], ['Predictive modelling', 3, 'predictive modeling', 'predictive modelling'],
    // Design
    ['Figma', 3, 'figma'], ['Adobe XD', 3, 'adobe xd'], ['Adobe Photoshop', 3, 'photoshop', 'adobe photoshop'], ['Adobe Illustrator', 3, 'illustrator', 'adobe illustrator'],
    ['Canva', 2, 'canva'], ['UI design', 2, 'ui design', 'user interface design'], ['UX design', 2, 'ux design', 'user experience design'],
    ['User research', 2, 'user research', 'usability testing'], ['Wireframing', 2, 'wireframing', 'wireframes'], ['Prototyping', 2, 'prototyping', 'prototypes'],
    ['Graphic design', 2, 'graphic design'], ['Video editing', 2, 'video editing', 'premiere pro', 'after effects'],
    // Marketing
    ['Digital marketing', 2, 'digital marketing'], ['SEO', 3, 'seo', 'search engine optimization', 'search engine optimisation'],
    ['SEM', 3, 'sem', 'search engine marketing'], ['Google Ads', 3, 'google ads', 'adwords', 'google adwords'], ['Meta Ads', 3, 'meta ads', 'facebook ads', 'instagram ads'],
    ['Social media marketing', 2, 'social media marketing', 'smm', 'social media management'], ['Content marketing', 2, 'content marketing'],
    ['Email marketing', 2, 'email marketing'], ['Performance marketing', 2, 'performance marketing'], ['Marketing automation', 3, 'marketing automation'],
    ['Google Analytics', 3, 'google analytics', 'ga4'], ['Google Search Console', 3, 'google search console', 'search console'], ['Keyword research', 2, 'keyword research'],
    ['Copywriting', 2, 'copywriting'], ['Content writing', 2, 'content writing', 'content creation'], ['Brand management', 2, 'brand management', 'branding'],
    ['Market research', 2, 'market research'], ['Campaign management', 2, 'campaign management', 'marketing campaigns'], ['WordPress', 2, 'wordpress'],
    ['HubSpot', 3, 'hubspot'], ['Mailchimp', 3, 'mailchimp'], ['Affiliate marketing', 2, 'affiliate marketing'], ['Influencer marketing', 2, 'influencer marketing'],
    ['Product marketing', 2, 'product marketing'], ['Go-to-market strategy', 2, 'go-to-market', 'go to market', 'gtm strategy'],
    // Sales and customer work
    ['Lead generation', 2, 'lead generation'], ['Cold calling', 2, 'cold calling'], ['B2B sales', 2, 'b2b sales', 'b2b'], ['B2C sales', 2, 'b2c sales', 'b2c'],
    ['Inside sales', 2, 'inside sales'], ['Field sales', 2, 'field sales'], ['Channel sales', 2, 'channel sales', 'channel partners'],
    ['Key account management', 2, 'key account management', 'key accounts'], ['Account management', 2, 'account management'],
    ['Business development', 2, 'business development'], ['Negotiation', 1, 'negotiation', 'negotiating'], ['CRM', 2, 'crm'],
    ['Salesforce', 3, 'salesforce'], ['Zoho CRM', 3, 'zoho crm', 'zoho'], ['Sales forecasting', 2, 'sales forecasting'], ['Pipeline management', 2, 'pipeline management', 'sales pipeline'],
    ['Customer service', 2, 'customer service', 'customer support', 'customer care'], ['Customer success', 2, 'customer success'],
    ['Client relationship management', 2, 'client relationship', 'client relationships', 'client handling', 'client servicing'],
    ['Zendesk', 3, 'zendesk'], ['Freshdesk', 3, 'freshdesk'], ['Voice process', 2, 'voice process', 'international voice'], ['Non-voice process', 2, 'non-voice process', 'non voice process', 'chat support', 'email support'],
    // Finance and accounting
    ['Accounting', 2, 'accounting', 'bookkeeping'], ['Tally', 3, 'tally', 'tally prime', 'tally erp'], ['GST', 3, 'gst', 'goods and services tax', 'gst returns'],
    ['TDS', 3, 'tds'], ['Income tax', 2, 'income tax'], ['Accounts payable', 2, 'accounts payable'], ['Accounts receivable', 2, 'accounts receivable'],
    ['Bank reconciliation', 2, 'bank reconciliation', 'reconciliation', 'reconciliations'], ['Financial analysis', 2, 'financial analysis'],
    ['Financial modelling', 3, 'financial modeling', 'financial modelling'], ['Budgeting', 2, 'budgeting', 'budget planning'], ['Forecasting', 2, 'forecasting'],
    ['MIS reporting', 2, 'mis reporting', 'mis reports', 'mis'], ['Audit', 2, 'audit', 'auditing', 'statutory audit'], ['Internal audit', 2, 'internal audit'],
    ['IFRS', 3, 'ifrs'], ['Ind AS', 3, 'ind as'], ['Cost accounting', 2, 'cost accounting', 'costing'], ['Invoicing', 1, 'invoicing', 'billing'],
    ['SAP', 3, 'sap'], ['SAP FICO', 3, 'sap fico', 'sap fi'], ['SAP MM', 3, 'sap mm'], ['SAP SD', 3, 'sap sd'], ['Oracle ERP', 3, 'oracle erp', 'oracle financials'],
    ['ERP systems', 2, 'erp'], ['QuickBooks', 3, 'quickbooks'], ['Zoho Books', 3, 'zoho books'], ['Valuation', 3, 'valuation'], ['Equity research', 3, 'equity research'],
    ['KYC', 3, 'kyc', 'know your customer'], ['AML', 3, 'aml', 'anti-money laundering', 'anti money laundering'], ['Credit analysis', 3, 'credit analysis', 'credit appraisal'],
    ['Underwriting', 3, 'underwriting'], ['Risk management', 2, 'risk management', 'risk assessment'], ['Regulatory compliance', 2, 'regulatory compliance', 'compliance'],
    ['Banking operations', 2, 'banking operations'], ['Mutual funds', 2, 'mutual funds'], ['Wealth management', 2, 'wealth management'],
    ['CFA', 3, 'cfa'], ['ACCA', 3, 'acca'], ['CPA', 3, 'cpa'],
    // HR
    ['Talent acquisition', 3, 'talent acquisition'],
    ['Recruitment', 2, 'recruitment', 'recruiting', 'hiring process', 'end-to-end recruitment', 'end to end recruitment', 'full-cycle recruitment', 'full cycle recruitment'],
    ['Candidate sourcing', 2, 'sourcing', 'candidate sourcing'], ['Screening', 2, 'screening', 'resume screening'], ['Onboarding', 2, 'onboarding', 'employee onboarding'],
    ['Payroll', 2, 'payroll', 'payroll processing'], ['HR operations', 2, 'hr operations', 'hr ops'], ['HRMS', 3, 'hrms', 'hris'],
    ['Employee engagement', 2, 'employee engagement'], ['Performance management', 2, 'performance management', 'performance appraisal', 'appraisals'],
    ['Compensation and benefits', 2, 'compensation and benefits', 'compensation & benefits'], ['Labour law', 2, 'labour law', 'labour laws', 'labor law', 'labor laws'],
    ['Statutory compliance', 2, 'statutory compliance', 'esic', 'provident fund'], ['Training and development', 2, 'training and development', 'learning and development', 'l&d'],
    ['HR business partnering', 2, 'hr business partner', 'hrbp'], ['Naukri RMS', 3, 'naukri rms', 'naukri resdex', 'resdex'], ['LinkedIn Recruiter', 3, 'linkedin recruiter'],
    // Operations, supply chain and quality
    ['Procurement', 2, 'procurement', 'purchasing'], ['Vendor management', 2, 'vendor management', 'vendor development', 'supplier management'],
    // Not the bare "supply chain": postings mention "our supply chain team" in passing.
    ['Supply chain management', 2, 'supply chain management', 'supply chain planning', 'supply chain operations', 'scm'], ['Inventory management', 2, 'inventory management', 'inventory control', 'stock management'],
    ['Logistics', 2, 'logistics', 'logistics management'], ['Warehouse management', 2, 'warehouse management', 'warehousing'], ['Demand planning', 2, 'demand planning'],
    ['Operations management', 2, 'operations management', 'business operations'], ['Process improvement', 2, 'process improvement', 'process optimization', 'process optimisation'],
    ['Six Sigma', 3, 'six sigma', 'lean six sigma'], ['Lean manufacturing', 3, 'lean manufacturing'], ['Kaizen', 3, 'kaizen'], ['5S', 3, '5s'],
    ['Quality control', 2, 'quality control'], ['Quality assurance', 2, 'quality assurance'], ['ISO 9001', 3, 'iso 9001'], ['Root cause analysis', 2, 'root cause analysis', 'rca'],
    ['Project management', 2, 'project management'], ['Programme planning', 2, 'project planning'], ['PMP', 3, 'pmp'], ['Scrum Master', 3, 'scrum master', 'csm'],
    // Engineering and construction
    ['AutoCAD', 3, 'autocad', 'auto cad'], ['SolidWorks', 3, 'solidworks'], ['CATIA', 3, 'catia'], ['ANSYS', 3, 'ansys'], ['MATLAB', 3, 'matlab'],
    ['PLC programming', 3, 'plc', 'plc programming'], ['SCADA', 3, 'scada'], ['Embedded systems', 3, 'embedded systems'], ['VLSI', 3, 'vlsi'], ['Verilog', 3, 'verilog'],
    ['PCB design', 3, 'pcb design'], ['Revit', 3, 'revit'], ['STAAD Pro', 3, 'staad pro', 'staad.pro'], ['Primavera', 3, 'primavera'], ['HVAC', 3, 'hvac'],
    ['Estimation and costing', 2, 'estimation and costing', 'quantity surveying', 'bill of quantities', 'boq'], ['Site execution', 2, 'site execution', 'site supervision'],
    // Healthcare, pharma and education
    ['Clinical research', 3, 'clinical research', 'clinical trials'], ['Pharmacovigilance', 3, 'pharmacovigilance'], ['Medical coding', 3, 'medical coding'],
    ['Regulatory affairs', 3, 'regulatory affairs'], ['GMP', 3, 'gmp', 'good manufacturing practice'], ['Patient care', 2, 'patient care'],
    ['Curriculum development', 2, 'curriculum development', 'curriculum design'], ['Lesson planning', 2, 'lesson planning'], ['Classroom management', 2, 'classroom management'],
    // General skills
    ['Communication skills', 1, 'communication skills', 'communication', 'verbal and written communication'], ['Leadership', 1, 'leadership', 'team leadership'],
    ['Team management', 1, 'team management', 'people management', 'managing a team'], ['Stakeholder management', 1, 'stakeholder management', 'stakeholder communication'],
    ['Problem solving', 1, 'problem solving', 'problem-solving'], ['Analytical skills', 1, 'analytical skills', 'analytical thinking'], ['Attention to detail', 1, 'attention to detail'],
    ['Time management', 1, 'time management'], ['Presentation skills', 1, 'presentation skills', 'presentations'], ['Teamwork', 1, 'teamwork', 'team player'],
    ['Critical thinking', 1, 'critical thinking'], ['Decision making', 1, 'decision making', 'decision-making'], ['Mentoring', 1, 'mentoring', 'coaching'],
    ['Report writing', 1, 'report writing', 'documentation'], ['Microsoft Office', 1, 'ms office', 'microsoft office', 'powerpoint', 'ms word'],
    ['English', 1, 'english'], ['Hindi', 1, 'hindi'], ['Marathi', 1, 'marathi'], ['Tamil', 1, 'tamil'], ['Telugu', 1, 'telugu'], ['Kannada', 1, 'kannada'],
    ['Bengali', 1, 'bengali'], ['Gujarati', 1, 'gujarati'], ['Malayalam', 1, 'malayalam'],
  ];

  // Words that make a poor keyword on their own. Multi-word phrases may still
  // contain them, as long as they neither start nor end with one.
  var STOPWORDS = new Set((
    'a about above across after again against all also am among an and any are as at be because been before being below between both but by can ' +
    'could did do does doing done down during each either else etc even ever every few for from further get gets getting given go going good great ' +
    'had has have having he her here hers him his how however i if in into is it its itself just keep know known like likely made make makes making ' +
    'many may me might more most much must my need needed needs new no nor not now of off on once one only or other others our ours out over own ' +
    'per please plus rather really same see seem shall she should since so some such than that the their theirs them then there these they this ' +
    'those through to too under until up upon us use used uses using very via want was we well were what when where whether which while who whom ' +
    'whose why will with within without would yet you your yours ' +
    // Job description boilerplate
    'ability able apply applicant applicants applying benefits candidate candidates company companies competitive culture day days degree desired ' +
    'description duties environment equivalent excellent experience experienced exposure fast familiar familiarity field full good great growth ' +
    'help hiring hybrid ideal immediate including job jobs join joiners knowledge least level location looking lpa ctc minimum month months ' +
    'nice notice offer office opening opportunity opportunities paced part period position positions preferred proven qualification qualifications ' +
    'related relevant remote requirement requirements required responsibilities responsibility role roles salary seeking skill skills strong ' +
    'successful team teams time understanding work working works world year years youll youre bachelor bachelors master masters graduate ' +
    'graduation mba btech b.tech be b.e engineering person people etc. who we are what you will do about us key areas area good-to-have'
  ).split(/\s+/));

  var REQUIREMENT_LINE = /\b(must|required|requirement|requirements|mandatory|essential|should have|need to have|qualification|qualifications|proficien|hands-on|experience (in|with)|knowledge of|expertise in|skills?:|what we('| a)re looking for|who you are)\b/i;

  function normalise(text) {
    return String(text || '')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/ /g, ' ');
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Boundaries without lookbehind, which older Safari versions reject.
  function variantPattern(variant) {
    var body = escapeRegExp(variant).replace(/\s+/g, '\\s+');
    var plural = /[a-z]$/.test(variant) && variant.length > 3 && !/s$/.test(variant) ? '(?:s|es)?' : '';
    return new RegExp('(^|[^a-z0-9+#.])' + body + plural + '(?=$|[^a-z0-9+#])', 'gi');
  }

  var COMPILED = TERMS.map(function (entry) {
    return { label: entry[0], weight: entry[1], patterns: entry.slice(2).map(variantPattern) };
  });

  function countMatches(patterns, text) {
    var total = 0;
    patterns.forEach(function (pattern) {
      pattern.lastIndex = 0;
      var match;
      while ((match = pattern.exec(text)) !== null) {
        total += 1;
        if (match[0].length === 0) pattern.lastIndex += 1;
      }
    });
    return total;
  }

  function requirementText(jd) {
    return jd.split(/\n+/).filter(function (line) {
      return REQUIREMENT_LINE.test(line) || /^\s*([-*•●▪]|\d+[.)])\s+/.test(line);
    }).join('\n');
  }

  function findSkills(jd, requirements) {
    var found = [];
    COMPILED.forEach(function (term) {
      var count = countMatches(term.patterns, jd);
      if (!count) return;
      found.push({
        label: term.label,
        weight: term.weight,
        count: count,
        requirement: countMatches(term.patterns, requirements) > 0,
        patterns: term.patterns,
        kind: 'skill'
      });
    });
    // "Excel" inside "Advanced Excel" is the same mention; keep the specific one.
    return found.filter(function (term) {
      return !found.some(function (other) {
        return other !== term && other.label.toLowerCase().indexOf(term.label.toLowerCase()) > 0 && other.count >= term.count;
      });
    });
  }

  function tokens(line) {
    return (line.toLowerCase().match(/[a-z][a-z0-9+#./&-]*[a-z0-9+#]|[a-z]/g) || []);
  }

  // Repeated multi-word phrases that the skills list does not know, such as
  // "credit card portfolio" or "store operations". Lower confidence, so they
  // count for less and are listed separately.
  function findPhrases(jd, requirements, skills) {
    var counts = {};
    var inRequirements = {};
    var add = function (store, phrase) { store[phrase] = (store[phrase] || 0) + 1; };
    jd.split(/[\n.;:!?()]+/).forEach(function (line) {
      var words = tokens(line);
      for (var size = 2; size <= 3; size++) {
        for (var i = 0; i + size <= words.length; i++) {
          var slice = words.slice(i, i + size);
          if (STOPWORDS.has(slice[0]) || STOPWORDS.has(slice[size - 1])) continue;
          if (slice.some(function (w) { return /^(and|or|with|for|to|of|in|the|a|an)$/.test(w); })) continue;
          if (slice.some(function (w) { return w.length < 3; })) continue;
          add(counts, slice.join(' '));
        }
      }
    });
    requirements.split(/[\n.;:!?()]+/).forEach(function (line) {
      var words = tokens(line);
      for (var size = 2; size <= 3; size++) {
        for (var i = 0; i + size <= words.length; i++) add(inRequirements, words.slice(i, i + size).join(' '));
      }
    });
    var known = skills.map(function (term) { return term.label.toLowerCase(); });
    var candidates = Object.keys(counts).filter(function (phrase) {
      if (counts[phrase] < 2) return false;
      return !known.some(function (label) { return phrase.indexOf(label) !== -1 || label.indexOf(phrase) !== -1; });
    });
    // Drop a phrase when a longer phrase containing it is just as frequent.
    candidates = candidates.filter(function (phrase) {
      return !candidates.some(function (other) {
        return other !== phrase && other.indexOf(phrase) !== -1 && counts[other] >= counts[phrase];
      });
    });
    return candidates
      .map(function (phrase) {
        return {
          label: phrase,
          weight: 1,
          count: counts[phrase],
          requirement: Boolean(inRequirements[phrase]),
          patterns: [variantPattern(phrase)],
          kind: 'phrase'
        };
      })
      .sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label); })
      .slice(0, 12);
  }

  function importance(term) {
    return term.weight + (term.requirement ? 1 : 0) + (term.count > 1 ? 0.5 : 0);
  }

  function publicTerm(term) {
    return { label: term.label, kind: term.kind, count: term.count, requirement: term.requirement, weight: term.weight, inResume: term.inResume };
  }

  function wordCount(text) {
    return (text.match(/[A-Za-z0-9+#]+/g) || []).length;
  }

  function analyze(resumeText, jobText) {
    var resume = normalise(resumeText);
    var jd = normalise(jobText);
    var requirements = requirementText(jd);
    var skills = findSkills(jd, requirements);
    var phrases = findPhrases(jd, requirements, skills);
    var terms = skills.concat(phrases);
    var total = 0;
    var covered = 0;
    terms.forEach(function (term) {
      term.inResume = countMatches(term.patterns, resume) > 0;
      var value = importance(term);
      total += value;
      if (term.inResume) covered += value;
    });
    var byImportance = function (a, b) {
      return importance(b) - importance(a) || b.count - a.count || a.label.localeCompare(b.label);
    };
    var matched = terms.filter(function (term) { return term.inResume; }).sort(byImportance);
    var missing = terms.filter(function (term) { return !term.inResume; }).sort(byImportance);
    var notes = [];
    if (wordCount(jd) < 60) notes.push('The job description is short. Paste the full posting, including responsibilities and requirements, for a fuller comparison.');
    if (wordCount(resume) < 120) notes.push('The resume text is short. Paste the whole resume, not only the summary, so skills listed under each role are found.');
    if (terms.length < 4) notes.push('Only a few specific terms were found in this job description, so the coverage figure is not very informative.');
    return {
      score: terms.length >= 4 ? Math.round((covered / total) * 100) : null,
      totals: { terms: terms.length, matched: matched.length, missing: missing.length },
      matched: matched.map(publicTerm),
      missing: missing.map(publicTerm),
      notes: notes
    };
  }

  // ---------- Page integration ----------

  var EXAMPLE_RESUME = [
    'Priya Sharma | Data Analyst | Pune',
    'Summary: Data analyst with 2 years of experience turning sales and inventory data into weekly reports for regional managers.',
    'Experience: Business Analyst, RetailCo India (2023 to present)',
    '- Built Excel dashboards with pivot tables and VLOOKUP to track stock across 40 stores.',
    '- Wrote SQL queries in MySQL to pull daily sales data and automated the weekly MIS report.',
    '- Presented findings to regional managers and cut report preparation time from two days to half a day.',
    'Education: B.Com, Savitribai Phule Pune University, CGPA 8.1',
    'Skills: Excel, SQL, MySQL, Google Sheets, data analysis, MIS reporting, communication'
  ].join('\n');

  var EXAMPLE_JOB = [
    'Data Analyst - Bengaluru (Hybrid)',
    'We are looking for a data analyst to support our sales and supply chain teams.',
    'Responsibilities:',
    '- Build and maintain Power BI dashboards for sales performance and inventory.',
    '- Write SQL queries to extract and clean data from our data warehouse.',
    '- Use Python (Pandas) to automate recurring reports.',
    '- Present insights to business stakeholders and support forecasting.',
    'Requirements:',
    '- 2+ years of experience in data analysis.',
    '- Must have strong SQL and Advanced Excel skills.',
    '- Hands-on experience with Power BI or Tableau dashboards.',
    '- Knowledge of Python and statistics is preferred.',
    '- Good communication and stakeholder management skills.'
  ].join('\n');

  function track(root, name, params) {
    try {
      if (window.vignovaAnalytics && typeof window.vignovaAnalytics.trackEvent === 'function') {
        var base = { tool: root.getAttribute('data-tool') || 'resume_keyword_scanner', page_path: window.location.pathname };
        Object.keys(params || {}).forEach(function (key) { base[key] = params[key]; });
        window.vignovaAnalytics.trackEvent(name, base);
      }
    } catch (error) { /* Analytics must never break the tool. */ }
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function chipList(terms, className, limit) {
    var list = element('ul', 'vn-chips ' + className);
    terms.slice(0, limit || terms.length).forEach(function (term) {
      list.appendChild(element('li', '', term.count > 1 ? term.label + ' ×' + term.count : term.label));
    });
    return list;
  }

  function copyText(text, button) {
    var done = function (ok) {
      var label = button.textContent;
      button.textContent = ok ? 'Copied' : 'Select and copy manually';
      window.setTimeout(function () { button.textContent = label; }, 1800);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      done(false);
    }
  }

  function render(root, result) {
    var container = root.querySelector('[data-ks-results]');
    var compact = root.getAttribute('data-mode') === 'compact';
    container.textContent = '';

    var row = element('div', 'vn-score-row');
    var ring = element('div', 'vn-score');
    ring.style.setProperty('--vn-score', String(result.score === null ? 0 : result.score));
    ring.appendChild(element('b', '', result.score === null ? '–' : result.score + '%'));
    ring.setAttribute('aria-hidden', 'true');
    var summary = element('div');
    var heading = element('h3', '', result.score === null ? 'Not enough terms to compare' : 'Keyword coverage: ' + result.score + '%');
    heading.setAttribute('tabindex', '-1');
    summary.appendChild(heading);
    summary.appendChild(element('p', '', result.totals.terms
      ? 'Your resume includes ' + result.totals.matched + ' of the ' + result.totals.terms + ' skills and terms found in this job description. Terms the posting repeats or lists under requirements count for more.'
      : 'We could not find specific skills or repeated terms in this job description.'));
    row.appendChild(ring);
    row.appendChild(summary);
    container.appendChild(row);

    var groups = element('div', 'vn-result-groups');
    var missing = element('div', 'vn-result-group');
    missing.appendChild(element('h4', '', 'Not found in your resume (' + result.missing.length + ')'));
    if (result.missing.length) {
      missing.appendChild(chipList(result.missing, 'vn-chips-missing', compact ? 10 : 0));
      var copy = element('button', 'vn-copy', 'Copy missing terms');
      copy.type = 'button';
      copy.style.marginTop = '12px';
      copy.addEventListener('click', function () {
        copyText(result.missing.map(function (term) { return term.label; }).join(', '), copy);
      });
      missing.appendChild(copy);
    } else {
      missing.appendChild(element('p', '', 'Every term we found also appears in your resume.'));
    }
    var matched = element('div', 'vn-result-group');
    matched.appendChild(element('h4', '', 'Found in your resume (' + result.matched.length + ')'));
    matched.appendChild(result.matched.length
      ? chipList(result.matched, 'vn-chips-found', compact ? 10 : 0)
      : element('p', '', 'None of the terms we found appear in your resume yet.'));
    groups.appendChild(missing);
    groups.appendChild(matched);
    container.appendChild(groups);

    result.notes.forEach(function (text) { container.appendChild(element('p', 'vn-note', text)); });
    container.appendChild(element('p', 'vn-note', 'Add a missing term only where it is true for your experience, and in context: a bullet that shows how you used it is worth more than a word in a skills list. Coverage is one signal. It does not predict whether an applicant tracking system or a recruiter will shortlist you.'));

    container.hidden = false;
    heading.focus({ preventScroll: true });
    container.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }

  function bind(root) {
    if (root.getAttribute('data-ks-bound')) return;
    root.setAttribute('data-ks-bound', 'true');
    var resume = root.querySelector('[data-ks-resume]');
    var job = root.querySelector('[data-ks-jd]');
    var run = root.querySelector('[data-ks-run]');
    var error = root.querySelector('[data-ks-error]');
    var example = root.querySelector('[data-ks-example]');
    var started = false;
    if (!resume || !job || !run) return;

    var start = function () {
      if (started || !(resume.value.trim() || job.value.trim())) return;
      started = true;
      track(root, 'seo_tool_started');
    };
    resume.addEventListener('input', start);
    job.addEventListener('input', start);

    if (example) {
      example.addEventListener('click', function () {
        resume.value = EXAMPLE_RESUME;
        job.value = EXAMPLE_JOB;
        start();
        run.click();
      });
    }

    run.addEventListener('click', function () {
      var problem = '';
      if (wordCount(resume.value) < 25) problem = 'Paste your resume text (at least a few lines) into the first box.';
      else if (wordCount(job.value) < 25) problem = 'Paste the job description (at least a few lines) into the second box.';
      if (error) {
        error.textContent = problem;
        error.hidden = !problem;
      }
      if (problem) return;
      var result = analyze(resume.value, job.value);
      render(root, result);
      track(root, 'keyword_scan_completed', { terms_found: result.totals.terms, terms_matched: result.totals.matched });
    });
  }

  function mount() {
    var start = function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-keyword-scanner]'), bind);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }

  return { analyze: analyze, mount: mount, terms: TERMS.length, example: { resume: EXAMPLE_RESUME, job: EXAMPLE_JOB } };
});
