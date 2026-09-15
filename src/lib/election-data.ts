export interface Candidate {
  id: string;
  name: string;
  position: string;
  department: string;
  year: string;
  manifesto: string;
  photo?: string;
}

export interface Position {
  id: string;
  title: string;
  description: string;
  candidates: Candidate[];
  maxSelections: number;
}

export const positions: Position[] = [
  {
    id: "president",
    title: "Student Council President",
    description: "Represents the student body in all official matters and leads the council.",
    maxSelections: 1,
    candidates: [
      {
        id: "cand-001",
        name: "Priya Sharma",
        position: "President",
        department: "BCA",
        year: "3rd Year",
        manifesto: "I will focus on improving campus infrastructure, enhancing student mental health support, and creating more internship opportunities through industry partnerships. My vision is to make our campus a hub of innovation and inclusive growth.",
      },
      {
        id: "cand-002",
        name: "Rahul Mehta",
        position: "President",
        department: "BBA",
        year: "3rd Year",
        manifesto: "My platform centers on transparent governance, affordable meal plans, and expanding the campus shuttle service. I believe in student-first policies and will ensure every voice is heard in council decisions.",
      },
      {
        id: "cand-003",
        name: "Anjali Patel",
        position: "President",
        department: "BCA",
        year: "3rd Year",
        manifesto: "I aim to bridge the gap between administration and students through monthly town halls, digitize council operations for transparency, and launch a student-led sustainability initiative across campus.",
      },
    ],
  },
  {
    id: "vice-president",
    title: "Vice President",
    description: "Assists the President and oversees internal council operations and committees.",
    maxSelections: 1,
    candidates: [
      {
        id: "cand-004",
        name: "Vikram Singh",
        position: "Vice President",
        department: "BBA",
        year: "3rd Year",
        manifesto: "I will streamline club funding processes, introduce a mentorship program for first-year students, and work on improving campus Wi-Fi coverage in all academic blocks.",
      },
      {
        id: "cand-005",
        name: "Sneha Reddy",
        position: "Vice President",
        department: "BCom",
        year: "3rd Year",
        manifesto: "My focus is on enhancing inter-departmental collaboration, organizing career fairs every semester, and establishing a student emergency fund for unforeseen circumstances.",
      },
    ],
  },
  {
    id: "secretary",
    title: "General Secretary",
    description: "Manages council communications, records, and student outreach programs.",
    maxSelections: 1,
    candidates: [
      {
        id: "cand-006",
        name: "Arjun Nair",
        position: "General Secretary",
        department: "MCA",
        year: "3rd Year",
        manifesto: "I will digitize all council records for easy access, launch a monthly student newsletter, and create a centralized platform for grievance redressal with guaranteed response times.",
      },
      {
        id: "cand-007",
        name: "Kavya Iyer",
        position: "General Secretary",
        department: "BBA",
        year: "3rd Year",
        manifesto: "My priority is transparent communication through weekly updates, organizing cultural exchange programs, and ensuring student representation in all academic committees.",
      },
    ],
  },
  {
    id: "treasurer",
    title: "Treasurer",
    description: "Manages the council budget, sponsorships, and financial transparency.",
    maxSelections: 1,
    candidates: [
      {
        id: "cand-008",
        name: "Rohan Desai",
        position: "Treasurer",
        department: "BCom",
        year: "3rd Year",
        manifesto: "I will publish quarterly financial reports, negotiate better sponsorship deals for events, and introduce a participatory budgeting system where students vote on fund allocation.",
      },
      {
        id: "cand-009",
        name: "Meera Joshi",
        position: "Treasurer",
        department: "BCom",
        year: "3rd Year",
        manifesto: "My plan includes zero-based budgeting for all events, creating a student scholarship fund from surplus, and implementing real-time expense tracking accessible to all students.",
      },
    ],
  },
  {
    id: "cultural-secretary",
    title: "Cultural Secretary",
    description: "Organizes cultural events, festivals, and promotes artistic expression on campus.",
    maxSelections: 1,
    candidates: [
      {
        id: "cand-010",
        name: "Aditi Krishnan",
        position: "Cultural Secretary",
        department: "BBA",
        year: "3rd Year",
        manifesto: "I will revive the annual cultural fest with inter-college participation, launch art workshops and open mic nights, and create a campus art gallery showcasing student talent.",
      },
      {
        id: "cand-011",
        name: "Karan Malhotra",
        position: "Cultural Secretary",
        department: "BCA",
        year: "3rd Year",
        manifesto: "My vision includes a campus film festival, music battle of the bands, and partnerships with local theaters for student discounts. Culture should be accessible to everyone.",
      },
    ],
  },
];

export const electionInfo = {
  name: "Student Council Election 2026",
  votingStart: "2026-08-01T09:00:00Z",
  votingEnd: "2026-08-10T17:00:00Z",
  isActive: () => {
    const now = new Date();
    return now >= new Date(electionInfo.votingStart) && now <= new Date(electionInfo.votingEnd);
  },
};