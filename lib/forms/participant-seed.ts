import type { ParticipantForm, ParticipantQuestion } from "./participant-types";

/**
 * Participant-only fixtures (mock). Wording matches what Beeliv supplied, but there are NO answer keys, points or marking
 * data here and nothing is imported from lib/admin/**. The ids match the admin fixtures so a submission can be linked.
 */
const opts = (qid: string, labels: string[]) => labels.map((label, i) => ({ id: `${qid}-o${i + 1}`, label }));
const T = (n: string) => `training-q${n}`;
const A = (n: string) => `appraisal-q${n}`;

const training: ParticipantQuestion[] = [
  { id: T("1"), type: "single", required: true, prompt: "Who is most important in your workplace?", options: opts(T("1"), ["Difficult customer", "All of the above", "Organised work station", "The management", "Hospitable service staff"]) },
  { id: T("2"), type: "long", required: true, prompt: "How would you introduce yourself, and the name of your restaurant, to a guest?", helper: "Write it as you would say it at the table." },
  { id: T("3"), type: "short", required: true, prompt: "Name one word that best describes your personality in leadership and people management." },
  { id: T("4"), type: "single", required: true, prompt: "Attitude on the job means:", options: opts(T("4"), ["Be tough", "Be rude", "Hard face", "Sharp tongue", "Humility & respect"]) },
  { id: T("5"), type: "long", required: true, prompt: "In your own words, what is the difference between hospitality and service?" },
  { id: T("6"), type: "single", required: true, prompt: "The core issue in communication is that people often listen to reply, rather than to:", options: opts(T("6"), ["Abuse", "Understand", "React", "Ignore"]) },
  { id: T("7"), type: "single", required: true, prompt: "Which of these does NOT describe good customer service in hospitality?", options: opts(T("7"), ["Listening with compassion", "Being patient", "Interrupting the guest", "Inviting body language", "Maintaining eye contact"]) },
  { id: T("8"), type: "short", required: true, prompt: "Fill in the blank: \"_______ is the silent language of care. Speak it fluently.\"" },
  { id: T("9"), type: "multiple", required: true, prompt: "Which of these are values that shape who you are and how you serve? (Select all that apply.)", options: opts(T("9"), ["Money first", "Emotionally intelligent", "Genuine care", "Commitment to excellence", "Integrity & discipline"]) },
  { id: T("10"), type: "multiple", required: true, prompt: "Which of these are types of alcohol? (Select all that apply.)", options: opts(T("10"), ["Beer", "Wine", "Jameson", "Spirits", "Liquor"]) },
];

const appraisal: ParticipantQuestion[] = [
  { id: A("1"), type: "short", required: true, prompt: "Full name", helper: "Filled in from your account when you are signed in." },
  { id: A("2"), type: "dropdown", required: true, prompt: "Which department do you work in?", optionsSource: "departments" },
  { id: A("3"), type: "multiple", required: true, allowOther: true, prompt: "What would most improve your workplace?", options: opts(A("3"), ["Salary", "Communication", "Teamwork & collaboration", "Job knowledge", "Problem-solving abilities"]) },
  { id: A("4"), type: "long", required: true, prompt: "Which special abilities or skills make you more efficient and effective at your job?" },
  { id: A("5"), type: "rating", ratingMax: 5, required: true, prompt: "How would you rate your team leader's potential?", helper: "1 = low, 5 = excellent." },
  { id: A("6"), type: "single", required: true, prompt: "How would you describe your team leader's style with you?", options: opts(A("6"), ["Autocratic", "Democratic", "Transformational", "Sentimental"]) },
  { id: A("7"), type: "long", required: true, prompt: "What impression has your team leader's experience had on your personal growth?" },
  { id: A("8"), type: "single", required: true, prompt: "Have you used feedback and support from your team leaders to perform at your best?", options: opts(A("8"), ["Yes", "No", "Not really"]) },
  { id: A("9"), type: "long", required: true, prompt: "If you were part of the management team, what would you do differently for growth and improvement in the coming years?" },
  { id: A("10"), type: "email", required: true, prompt: "Your active email address", helper: "Filled in from your account when you are signed in." },
];

/** Published forms a participant may be offered (mock). */
export const PARTICIPANT_FORMS: ParticipantForm[] = [
  {
    id: "form-training-test", version: 1, kind: "test", audience: "applicants",
    title: "Hospitality Training Test",
    description: "Basic hospitality service knowledge, based on the Beeliv culture guide.",
    timeLimitMinutes: null, attemptsAllowed: 1, questions: training,
  },
  {
    id: "form-brunch-lane-appraisal", version: 1, kind: "appraisal", audience: "staff", clientName: "Brunch Lane",
    title: "Staff Appraisal: Brunch Lane",
    description: "How satisfied are you with your job at Brunch Lane?",
    timeLimitMinutes: null, attemptsAllowed: 1, questions: appraisal,
  },
];

/** Sample department list (mock); the real list comes from Beeliv. */
export const PARTICIPANT_DEPARTMENTS: string[] = ["Front of house", "Kitchen", "Bar", "Housekeeping", "Management"];
