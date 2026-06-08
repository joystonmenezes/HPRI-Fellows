// All editable program content lives here for now. Once the admin CMS (Phase 4)
// is in place, these values are served from the database instead — the page
// reads from the same shape, so the UI does not change.

// `published` is optional and defaults to shown (true). A value of false hides
// the item on the public page while keeping it editable in the admin.
export type Link = { label: string; href?: string; published?: boolean };

export type ScheduleRow = {
  week: string;
  when: string;
  type: string;
  topic: string;
  location: string;
  materials: Link[];
  published?: boolean;
};

export type MentorRow = {
  fellow: string;
  primary: string;
  secondary: string;
  area: string;
  published?: boolean;
};

export type ActivityRow = {
  activity: string;
  deliverable: string;
  published?: boolean;
};

export type AssignmentRow = {
  assignment: string;
  due: string;
  submit: Link;
  published?: boolean;
  // Admin-controlled gate: students can only submit once this is true.
  // Defaults to closed (undefined → not active).
  active?: boolean;
  // Optional submission window, as "YYYY-MM-DDTHH:mm" Los Angeles wall-clock
  // strings. Empty/absent means no bound on that side. Only enforced when
  // `active` is true.
  opensAt?: string;
  closesAt?: string;
};

export type ContactRow = {
  need: string;
  contact: string;
  use: string;
  email?: string;
  phone?: string;
  published?: boolean;
};

const CITY_CENTER =
  "USC City Center, 1150 S. Olive Street, Suite 1100, Los Angeles, CA 90015 and Zoom";
const SOCIAL_WORK_CENTER =
  "USC Social Work Center, 665 W. 34th Street, Room 106, Los Angeles, CA 90089 and Zoom";

export const program = {
  name: "HPRI Summer Fellowship Program",
  term: "Summer 2026",
  dateRange: "June 22–July 30, 2026",
  tagline: "A central hub for fellows, families, mentors, and staff.",
  intro:
    "The HPRI Summer Fellowship Program is a six-week hybrid learning experience for students and early-career fellows interested in homelessness research, housing policy, public health, social work, data, field learning, and community engagement. Fellows participate approximately 10 hours per week through seminars, mentor meetings, self-directed or project-based work, assignments, and a final capstone presentation.",

  quickLinks: [
    { label: "Fellowship Overview" },
    { label: "Weekly Presentations and Recordings" },
    { label: "Rules and Expectations" },
    { label: "Mentor List" },
    { label: "Self-Directed Activity List" },
    { label: "Submit Assignments" },
    { label: "Capstone Guide" },
    { label: "Parent/Guardian Forms" },
  ] as Link[],

  glance: {
    rows: [
      { label: "Dates", value: "June 22–July 30, 2026" },
      { label: "Time Commitment", value: "Approximately 10 hours per week" },
      {
        label: "Format",
        value:
          "Hybrid, with in-person seminars, mentor meetings, remote work, and self-directed/project-based activities",
      },
      {
        label: "Primary Locations",
        value:
          "HPRI/H3E Downtown Office, USC City Center, 1150 S. Olive Street, Suite 1100, Los Angeles, CA 90015 and USC Social Work Center, 665 W. 34th Street, Room 106, Los Angeles, CA 90089",
      },
      {
        label: "Final Culmination & Capstone Presentations",
        value:
          "Wednesday, July 29 at USC Social Work Center, 665 W. 34th Street, Room 106, Los Angeles, CA 90089",
      },
    ],
    note: "Fellows should plan to participate in weekly seminars, meet with their mentor once per week, complete assignments and reflections, and develop a final capstone presentation connected to their self-directed activity or project placement.",
  },

  presentations: {
    intro:
      "All seminar slides, Tuesday Talk materials, recordings, reflection links, and presentation-related details from the program calendar are posted here.",
    missedNote:
      "Missed seminar reminder: Fellows who miss a seminar must watch the recording and complete the assigned reflection or make-up task.",
    schedule: [
      {
        week: "Week 1",
        when: "Mon June 22, 9:30am–12pm",
        type: "Orientation",
        topic: "Program Orientation",
        location: CITY_CENTER,
        materials: [{ label: "Materials" }],
      },
      {
        week: "Week 1",
        when: "Wed June 24, 12–1:30pm",
        type: "Fellows Seminar 1",
        topic:
          "Sara Ozuna / Gisele Corletto: Research Ethics & CITI Training Workshop",
        location: CITY_CENTER,
        materials: [
          { label: "Presentation" },
          { label: "Recording" },
          { label: "Reflection" },
        ],
      },
      {
        week: "Week 2",
        when: "Tues June 30, 12–2pm",
        type: "Tuesday Talk",
        topic:
          "Nelly Stastny: Miracle Friends, Phone Buddies, and Universal Basic Income",
        location: "Zoom",
        materials: [
          { label: "Presentation" },
          { label: "Recording" },
          { label: "Reflection" },
        ],
      },
      {
        week: "Week 2",
        when: "Wed July 1, 12–2pm",
        type: "Fellows Seminar 2",
        topic: "Sean Pleasants: Lived Experience of Homelessness",
        location: CITY_CENTER,
        materials: [
          { label: "Presentation" },
          { label: "Recording" },
          { label: "Reflection" },
        ],
      },
      {
        week: "Week 3",
        when: "Tues July 7, 12–2pm",
        type: "Tuesday Talk",
        topic: "To be announced",
        location: "Zoom",
        materials: [
          { label: "Presentation" },
          { label: "Recording" },
          { label: "Reflection" },
        ],
      },
      {
        week: "Week 3",
        when: "Wed July 8, 12–2pm",
        type: "Fellows Seminar 3",
        topic:
          "Nick Weinmeister: Policy Research, Stakeholders, and Civic Action",
        location: CITY_CENTER,
        materials: [
          { label: "Presentation" },
          { label: "Recording" },
          { label: "Reflection" },
        ],
      },
      {
        week: "Week 4",
        when: "Tues July 14, 12–2pm",
        type: "Tuesday Talk",
        topic:
          "Drs. Ben Henwood & Sam Tsemberis: Housing First, Permanent Supportive Housing, and Program Models",
        location: CITY_CENTER,
        materials: [
          { label: "Presentation" },
          { label: "Recording" },
          { label: "Reflection" },
        ],
      },
      {
        week: "Week 4",
        when: "Wed July 15, 9:30–11:30am",
        type: "Workshop",
        topic: "Greg Derelian: Get Comfortable with Public Speaking",
        location: SOCIAL_WORK_CENTER,
        materials: [
          { label: "Presentation" },
          { label: "Recording" },
          { label: "Reflection" },
        ],
      },
      {
        week: "Week 4",
        when: "Wed July 15, 12–2pm",
        type: "Fellows Seminar 4",
        topic:
          "Dr. Amanda Landrian Gonzales and Data Team: Data, Homeless Count, and Demographic Survey Methods",
        location: SOCIAL_WORK_CENTER,
        materials: [
          { label: "Presentation" },
          { label: "Recording" },
          { label: "Reflection" },
        ],
      },
      {
        week: "Week 5",
        when: "Tues July 21, time TBD",
        type: "Tuesday Talk",
        topic: "Dr. Rev. Seth Pickens: Faith and Homelessness",
        location: "Zoom",
        materials: [
          { label: "Presentation" },
          { label: "Recording" },
          { label: "Reflection" },
        ],
      },
      {
        week: "Week 5",
        when: "Wed July 22, 12–2pm",
        type: "Fellows Seminar 5",
        topic:
          "Amy Stein & Shantel Cordon: Meet the USC Student Demographic Survey Team — Panel on Campus with Tour",
        location: SOCIAL_WORK_CENTER,
        materials: [
          { label: "Presentation" },
          { label: "Recording" },
          { label: "Reflection" },
        ],
      },
      {
        week: "Week 6",
        when: "Wed July 29, 12–2pm",
        type: "Fellows Seminar 6 / Culmination",
        topic:
          "Fellows Present their Findings: Capstone Presentations and Culmination (families welcome to attend)",
        location: SOCIAL_WORK_CENTER,
        materials: [{ label: "Final Materials" }],
      },
    ] as ScheduleRow[],
  },

  rules: {
    intro:
      "Fellows are expected to participate fully, communicate professionally, complete work on time, and use respectful, person-centered language when discussing homelessness and people experiencing homelessness. Fellows must protect confidentiality and may not share private, identifiable, or sensitive information without explicit approval.",
    expectations: [
      "Attend required sessions, seminars, mentor meetings, project check-ins, and capstone-related activities",
      "Complete all assignments, reflections, project deliverables, and make-up work",
      "Submit assignments by the posted deadline to the shared Fellows folder or approved submission location",
      "Cite sources when using facts, statistics, quotes, public data, policy documents, news articles, websites, or research",
      "Do not photograph, record, interview, approach, or collect personal information from people experiencing homelessness unless explicitly approved and supervised",
      "Remain in approved program spaces during in-person activities and communicate with staff if leaving or returning during lunch or independent work periods",
    ],
    agreementLink: { label: "Full rules and participation agreement" } as Link,
  },

  mentors: {
    intro:
      "Each fellow will work with a primary and secondary mentor who helps define the project scope, identify credible sources, set weekly milestones, provide feedback, and connect the work to the final capstone presentation. Mentors will meet with fellows once per week, usually for a structured 20–30 minute check-in.",
    rows: [
      { fellow: "—", primary: "—", secondary: "—", area: "—" },
      { fellow: "—", primary: "—", secondary: "—", area: "—" },
      { fellow: "—", primary: "—", secondary: "—", area: "—" },
    ] as MentorRow[],
    link: { label: "Mentor list and meeting schedule" } as Link,
  },

  activities: {
    intro:
      "By Week Two, fellows should select a self-directed activity, narrow their topic, identify starting sources, and choose a feasible deliverable.",
    rows: [
      {
        activity: "Community Asset Mapping",
        deliverable: "Digital map and short access analysis",
      },
      {
        activity: "Los Angeles Policy-in-Action Tracking",
        deliverable: "Policy vs. practice memo",
      },
      {
        activity: "Lived Experience Narrative Analysis",
        deliverable: "Thematic analysis memo",
      },
      {
        activity: "Homelessness and Health",
        deliverable: "Health access memo or journey map",
      },
      {
        activity: "Ethical Field Observation",
        deliverable: "Reflexivity log",
      },
      {
        activity: "Rapid Mini-Survey Project",
        deliverable: "Survey instrument and findings summary",
      },
      {
        activity: "Media and Narrative Audit",
        deliverable: "Media comparison and rewritten excerpt",
      },
      {
        activity: "Systems Stakeholder Mapping",
        deliverable: "Stakeholder map and analysis",
      },
      {
        activity: "Intervention Deep Dive",
        deliverable: "Short intervention case study",
      },
      {
        activity: "Advocacy Action Project",
        deliverable: "Brief, letter, public comment, or explainer",
      },
      {
        activity: "Service Learning and Systems Navigation",
        deliverable: "Navigation guide or access-barrier memo",
      },
      {
        activity: "Union Station Adopt-a-Meal Project",
        deliverable: "Meal planning packet and service reflection",
      },
      {
        activity: "Young People to the Front HQ",
        deliverable:
          "Community space planning memo or youth engagement product",
      },
    ] as ActivityRow[],
    link: { label: "Full activity list" } as Link,
    trackerLink: { label: "Week Two planning tracker" } as Link,
  },

  assignments: {
    intro:
      "All assignments should be submitted through the approved Fellows folder or submission form by the deadline provided.",
    rows: [
      { assignment: "Orientation Reflection", due: "TBD", submit: { label: "Submit here" } },
      { assignment: "Self-Directed Activity Plan", due: "TBD", submit: { label: "Submit here" } },
      { assignment: "Seminar Reflections", due: "Weekly", submit: { label: "Submit here" } },
      { assignment: "Midpoint Project Share-Out", due: "TBD", submit: { label: "Submit here" } },
      { assignment: "Draft Capstone Slides", due: "TBD", submit: { label: "Submit here" } },
      { assignment: "Final Capstone Materials", due: "TBD", submit: { label: "Submit here" } },
      { assignment: "Final Reflection", due: "TBD", submit: { label: "Submit here" } },
    ] as AssignmentRow[],
    link: { label: "Submit assignments" } as Link,
  },

  capstone: {
    intro:
      "The final capstone presentation is the culminating part of the fellowship. Fellows should explain the issue they studied, why it matters, their guiding question, sources or evidence, key findings, systems-level patterns, recommendations or next questions, and what they learned.",
    slideFlow: [
      "Title and topic",
      "Why this issue matters",
      "Research or learning question",
      "Sources, evidence, or methods",
      "Project deliverable",
      "Key findings",
      "Recommendation or next question",
      "Reflection",
    ],
    guideLink: { label: "Capstone guide and slide template" } as Link,
  },

  contacts: {
    rows: [
      {
        need: "General program questions",
        contact:
          "Amy Stein, Program Administrator / Covered Activity Administrator",
        use: "Attendance, schedule, parent questions, documentation, concerns, escalation",
      },
      {
        need: "Program oversight",
        contact: "Dr. Ben Henwood, HPRI Director",
        use: "Program leadership",
      },
      {
        need: "Weekly project support",
        contact: "Assigned mentor",
        use: "Work plan, assignment questions, capstone development, feedback",
      },
      {
        need: "Youth protection concerns",
        contact: "USC Office of Youth Protection and Programming",
        use: "Concerns related to adult conduct, safety, supervision, or youth protection",
      },
      {
        need: "Emergency or immediate threat",
        contact: "911 or USC Department of Public Safety as directed by program staff",
        use: "Immediate danger, medical emergency, safety threat",
      },
    ] as ContactRow[],
    locations: [
      {
        name: "HPRI/H3E Downtown Office — USC City Center",
        lines: ["1150 S. Olive Street, Suite 1100", "Los Angeles, CA 90015"],
      },
      {
        name: "USC Social Work Center",
        lines: ["665 W. 34th Street, Room 106", "Los Angeles, CA 90089"],
      },
    ],
  },
};

// Single combined hero menu. "Submit an assignment" doubles as the jump to the
// submit section, so a separate "Submit Assignments" link would be redundant;
// likewise "Presentations" covers the schedule, so "View schedule" is dropped.
export const nav = [
  { label: "Submit an assignment", href: "#submit" },
  { label: "Presentations", href: "#presentations" },
  { label: "Rules", href: "#rules" },
  { label: "Mentors", href: "#mentors" },
  { label: "Activities", href: "#activities" },
  { label: "Contacts", href: "#contacts" },
];
