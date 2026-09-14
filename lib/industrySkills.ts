// Same industry list company-signup uses (app/(auth)/company-signup.tsx),
// shared here so a candidate's declared industry lines up with how companies
// describe themselves. Candidates pick one at signup purely to steer which
// skill suggestions they see — tech-only suggestions ("React Native",
// "PostgreSQL"...) made no sense for a healthcare or logistics candidate.
export const INDUSTRIES = [
  'Technology', 'Financial Services', 'Healthcare', 'Education',
  'Manufacturing', 'Retail & E-Commerce', 'Energy', 'Agriculture',
  'Media & Entertainment', 'Logistics & Supply Chain', 'Consulting', 'Other',
];

export const SKILLS_BY_INDUSTRY: Record<string, string[]> = {
  'Technology': [
    'React Native', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL',
    'AWS', 'DevOps', 'Go', 'Product Management', 'UI/UX Design',
  ],
  'Financial Services': [
    'Financial Modeling', 'Risk Analysis', 'Regulatory Compliance', 'Credit Analysis',
    'Treasury Management', 'Auditing', 'Bloomberg Terminal', 'Excel/VBA',
  ],
  'Healthcare': [
    'Patient Care', 'Clinical Documentation', 'Electronic Health Records', 'HIPAA Compliance',
    'Medical Coding', 'Nursing', 'Pharmacology', 'Care Coordination',
  ],
  'Education': [
    'Curriculum Design', 'Classroom Management', 'Instructional Design', 'Lesson Planning',
    'Student Assessment', 'EdTech Tools', 'Special Education', 'Tutoring',
  ],
  'Manufacturing': [
    'Lean Manufacturing', 'Six Sigma', 'Quality Control', 'Supply Chain Planning',
    'CAD/CAM', 'Production Scheduling', 'Industrial Safety', 'Inventory Management',
  ],
  'Retail & E-Commerce': [
    'Merchandising', 'Inventory Management', 'Point of Sale Systems', 'Customer Service',
    'E-commerce Platforms', 'Visual Merchandising', 'Sales Forecasting', 'Category Management',
  ],
  'Energy': [
    'Process Engineering', 'HSE Compliance', 'Project Management', 'Field Operations',
    'Renewable Energy Systems', 'Electrical Systems', 'Regulatory Compliance', 'Reservoir Engineering',
  ],
  'Agriculture': [
    'Crop Management', 'Agronomy', 'Farm Operations', 'Supply Chain Logistics',
    'Soil Analysis', 'Livestock Management', 'Agribusiness', 'Sustainability Practices',
  ],
  'Media & Entertainment': [
    'Content Production', 'Video Editing', 'Scriptwriting', 'Social Media Management',
    'Brand Strategy', 'Photography', 'Sound Design', 'Talent Management',
  ],
  'Logistics & Supply Chain': [
    'Supply Chain Management', 'Warehouse Operations', 'Fleet Management', 'Procurement',
    'Freight Forwarding', 'Inventory Optimization', 'Logistics Planning', 'Customs Compliance',
  ],
  'Consulting': [
    'Strategic Planning', 'Client Management', 'Business Analysis', 'Market Research',
    'Financial Modeling', 'Presentation Design', 'Process Improvement', 'Stakeholder Management',
  ],
  'Other': [
    'Project Management', 'Communication', 'Problem Solving', 'Leadership',
    'Data Analysis', 'Microsoft Office', 'Time Management', 'Teamwork',
  ],
};

export const DEFAULT_SKILL_SUGGESTIONS = SKILLS_BY_INDUSTRY['Other'];
