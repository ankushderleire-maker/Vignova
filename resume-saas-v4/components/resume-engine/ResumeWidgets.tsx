import { Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import { ResumeData } from "@/types/resume";

// Base styles for consistency
const styles = StyleSheet.create({
  sectionTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', color: '#16a34a', marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  text: { fontSize: 10, color: '#333', marginBottom: 2, lineHeight: 1.4 },
  bold: { fontWeight: 'bold' },
  sub: { fontSize: 9, color: '#666' },
  block: { marginBottom: 8 },
  bullet: { width: 10, fontSize: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start' }
});

// Helper to handle string vs array descriptions
const DescriptionText = ({ text }: { text: string | string[] }) => {
  if (Array.isArray(text)) {
    return (
      <View>
        {text.map((line, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.text}>{line}</Text>
          </View>
        ))}
      </View>
    );
  }
  return <Text style={styles.text}>{text}</Text>;
};

// Helper to clean URL for display (optional, but good practice)
const formatUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export const HeaderWidget = ({ data }: { data: ResumeData }) => (
  <View style={{ marginBottom: 15 }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold', textTransform: 'uppercase' }}>{data.fullName}</Text>
    <Text style={{ fontSize: 14, color: '#16a34a', marginBottom: 4 }}>{data.jobTitle}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {data.contact.email && <Text style={styles.sub}>{data.contact.email}</Text>}
      {data.contact.phone && <Text style={styles.sub}>{data.contact.phone}</Text>}
      {data.contact.location && <Text style={styles.sub}>{data.contact.location}</Text>}
      {data.contact.linkedin && (
        <Link src={data.contact.linkedin} style={{ ...styles.sub, textDecoration: 'none', color: '#333' }}>
          {data.contact.linkedin}
        </Link>
      )}
      {data.contact.website && (
        <Link src={data.contact.website} style={{ ...styles.sub, textDecoration: 'none', color: '#333' }}>
          {data.contact.website}
        </Link>
      )}
    </View>
  </View>
);

export const SummaryWidget = ({ data }: { data: ResumeData }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={styles.sectionTitle}>Professional Summary</Text>
    <Text style={styles.text}>{data.summary}</Text>
  </View>
);

export const ExperienceWidget = ({ data }: { data: ResumeData }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={styles.sectionTitle}>Experience</Text>
    {data.experience.map((exp, i) => (
      <View key={i} style={styles.block}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ ...styles.text, ...styles.bold }}>{exp.role}</Text>
          <Text style={styles.sub}>{(exp as any).date || `${exp.startDate} - ${exp.endDate}`}</Text>
        </View>
        <Text style={{ ...styles.sub, color: '#16a34a', marginBottom: 2 }}>{exp.company}</Text>
        <DescriptionText text={exp.description} />
      </View>
    ))}
  </View>
);

export const ProjectsWidget = ({ data }: { data: ResumeData }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={styles.sectionTitle}>Key Projects</Text>
    {data.projects.map((proj, i) => (
      <View key={i} style={styles.block}>
        <Text style={{ ...styles.text, ...styles.bold }}>{proj.name}</Text>
        <Text style={{ ...styles.sub, fontStyle: 'italic', marginBottom: 1 }}>{proj.techStack}</Text>
        <DescriptionText text={proj.description} />
      </View>
    ))}
  </View>
);

export const SkillsWidget = ({ data }: { data: ResumeData }) => {
  const skillsArray = Array.isArray(data.skills)
    ? data.skills
    : [data.skills?.technical, data.skills?.soft].filter(Boolean);

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.sectionTitle}>Skills</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {skillsArray.map((skill: any, i: number) => (
          <Text key={i} style={{ fontSize: 9, backgroundColor: '#f3f4f6', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 }}>
            {skill}
          </Text>
        ))}
      </View>
    </View>
  );
};

export const EducationWidget = ({ data }: { data: ResumeData }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={styles.sectionTitle}>Education</Text>
    {data.education.map((edu, i) => (
      <View key={i} style={{ marginBottom: 4 }}>
        <Text style={{ ...styles.text, ...styles.bold }}>{edu.school}</Text>
        <Text style={styles.text}>{edu.degree}</Text>
        <Text style={styles.sub}>{edu.startDate} - {edu.endDate}</Text>
      </View>
    ))}
  </View>
);

// THE REGISTRY: Maps JSON strings to Components
export const WIDGET_REGISTRY: Record<string, any> = {
  header: HeaderWidget,
  summary: SummaryWidget,
  experience: ExperienceWidget,
  skills: SkillsWidget,
  projects: ProjectsWidget,
  education: EducationWidget
};