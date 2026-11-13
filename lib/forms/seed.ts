import type { FormDefinition, FormQuestion, QuestionOption } from "./types";

/**
 * The two forms Beeliv supplied (Mr Godson), with the original wording preserved in `originalPrompt` and a cleaned-up
 * `prompt` for display. Answer keys are only SUGGESTED (status "suggested"): Beeliv has not supplied the official
 * key, and questions 9 and 10 of the Training Test need their selection rules confirmed before any automatic marking.
 */
const opts = (qid: string, labels: string[]): QuestionOption[] => labels.map((label, i) => ({ id: `${qid}-o${i + 1}`, label }));

const T = (id: string) => `training-q${id}`;

const trainingQuestions: FormQuestion[] = [
  {
    id: T("1"), type: "single", required: true, marking: "auto", points: 1,
    originalPrompt: "Who is more important in your work place?",
    prompt: "Who is most important in your workplace?",
    options: opts(T("1"), ["Difficult customer", "All of the above", "Organised work station", "The management", "Hospitable service staff"]),
    answerKey: { optionIds: [`${T("1")}-o2`], status: "suggested" },
  },
  {
    id: T("2"), type: "long", required: true, marking: "manual", points: 2,
    originalPrompt: "Tell us how you would introduce yourself with the name of your restaurant to your guest?",
    prompt: "How would you introduce yourself, and the name of your restaurant, to a guest?",
    helper: "Write it as you would say it at the table.",
  },
  {
    id: T("3"), type: "short", required: true, marking: "manual", points: 1,
    originalPrompt: "Name one word that best reflect your personality in leadership and people management?",
    prompt: "Name one word that best describes your personality in leadership and people management.",
  },
  {
    id: T("4"), type: "single", required: true, marking: "auto", points: 1,
    originalPrompt: "Attitude on the job means?",
    prompt: "Attitude on the job means:",
    options: opts(T("4"), ["Be tough", "Be rude", "Hard face", "Sharp tongue", "Humility & respect"]),
    answerKey: { optionIds: [`${T("4")}-o5`], status: "suggested" },
  },
  {
    id: T("5"), type: "long", required: true, marking: "manual", points: 2,
    originalPrompt: "The difference between hospitality and service is?",
    prompt: "In your own words, what is the difference between hospitality and service?",
  },
  {
    id: T("6"), type: "single", required: true, marking: "auto", points: 1,
    originalPrompt: "The core issue in communication is that people often listen with the intent to reply rather than to?",
    prompt: "The core issue in communication is that people often listen to reply, rather than to:",
    options: opts(T("6"), ["Abuse", "Understand", "React", "Ignore"]),
    answerKey: { optionIds: [`${T("6")}-o2`], status: "suggested" },
  },
  {
    id: T("7"), type: "single", required: true, marking: "auto", points: 1,
    originalPrompt: "Which of the following does not describe customer service in hospitality?",
    prompt: "Which of these does NOT describe good customer service in hospitality?",
    options: opts(T("7"), ["Listening with compassion", "Being patient", "Interrupting the guest", "Inviting body language", "Maintaining eye contact"]),
    answerKey: { optionIds: [`${T("7")}-o3`], status: "suggested" },
  },
  {
    id: T("8"), type: "short", required: true, marking: "manual", points: 1,
    originalPrompt: "\"------- is the silent language of care speak it fluently\"",
    prompt: "Fill in the blank: \"_______ is the silent language of care. Speak it fluently.\"",
  },
  {
    id: T("9"), type: "multiple", required: true, marking: "auto", points: 1,
    originalPrompt: "Which of the following is about values that shape who you are and how you serve?",
    prompt: "Which of these are values that shape who you are and how you serve? (Select all that apply.)",
    helper: "Selection rule needs Beeliv confirmation.",
    options: opts(T("9"), ["Money first", "Emotionally intelligent", "Genuine care", "Commitment to excellence", "Integrity & discipline"]),
    answerKey: { optionIds: [`${T("9")}-o2`, `${T("9")}-o3`, `${T("9")}-o4`, `${T("9")}-o5`], status: "suggested" },
  },
  {
    id: T("10"), type: "multiple", required: true, marking: "auto", points: 1,
    originalPrompt: "Alcohol types includes?",
    prompt: "Which of these are types of alcohol? (Select all that apply.)",
    helper: "Selection rule needs Beeliv confirmation.",
    options: opts(T("10"), ["Beer", "Wine", "Jameson", "Spirits", "Liquor"]),
  },
];

const A = (id: string) => `appraisal-q${id}`;

const appraisalQuestions: FormQuestion[] = [
  { id: A("1"), type: "short", required: true, marking: "none", originalPrompt: "Full Name", prompt: "Full name", helper: "Filled in from your account when you are signed in." },
  { id: A("2"), type: "dropdown", required: true, marking: "none", originalPrompt: "Department you work?", prompt: "Which department do you work in?", optionsSource: "departments", helper: "The original list of departments was not captured: it comes from Beeliv's department list." },
  {
    id: A("3"), type: "multiple", required: true, marking: "none", allowOther: true,
    originalPrompt: "What are your expectations for improving your workspace?",
    prompt: "What would most improve your workplace?",
    options: opts(A("3"), ["Salary", "Communication", "Teamwork & collaboration", "Job knowledge", "Problem-solving abilities"]),
  },
  { id: A("4"), type: "long", required: true, marking: "none", originalPrompt: "Which special abilities or skills make you more efficient and effective at your job?", prompt: "Which special abilities or skills make you more efficient and effective at your job?" },
  { id: A("5"), type: "rating", ratingMax: 5, required: true, marking: "none", originalPrompt: "How would you rate your team leader's potential?", prompt: "How would you rate your team leader's potential?", helper: "1 = low, 5 = excellent." },
  {
    id: A("6"), type: "single", required: true, marking: "none",
    originalPrompt: "Relationship of team leader with you",
    prompt: "How would you describe your team leader's style with you?",
    options: opts(A("6"), ["Autocratic", "Democratic", "Transformational", "Sentimental"]),
  },
  { id: A("7"), type: "long", required: true, marking: "none", originalPrompt: "What impression has the team leader's experience brought to your personal growth?", prompt: "What impression has your team leader's experience had on your personal growth?" },
  {
    id: A("8"), type: "single", required: true, marking: "none",
    originalPrompt: "Did you ever incorporate feedback support from your team leaders to perform at your best?",
    prompt: "Have you used feedback and support from your team leaders to perform at your best?",
    options: opts(A("8"), ["Yes", "No", "Not really"]),
  },
  { id: A("9"), type: "long", required: true, marking: "none", originalPrompt: "What would you do differently if you were a part of the management team for growth and improvement in the coming years?", prompt: "If you were part of the management team, what would you do differently for growth and improvement in the coming years?" },
  { id: A("10"), type: "email", required: true, marking: "none", originalPrompt: "Active 📧", prompt: "Your active email address", helper: "Filled in from your account when you are signed in." },
];

export const SEED_FORMS: FormDefinition[] = [
  {
    id: "form-training-test",
    kind: "test",
    title: "Hospitality Training Test",
    description: "Basic hospitality service knowledge, based on the Beeliv culture guide.",
    audience: "applicants",
    status: "published",
    version: 1,
    timeLimitMinutes: null,
    passMarkPercent: null,
    questions: trainingQuestions,
    updatedAt: "2026-10-09T10:00:00.000Z",
    updatedBy: "Funke Sample",
  },
  {
    id: "form-brunch-lane-appraisal",
    kind: "appraisal",
    title: "Staff Appraisal: Brunch Lane",
    description: "How satisfied are you with your job at Brunch Lane?",
    audience: "client-staff",
    clientName: "Brunch Lane",
    status: "published",
    version: 1,
    timeLimitMinutes: null,
    passMarkPercent: null,
    questions: appraisalQuestions,
    updatedAt: "2026-10-09T10:00:00.000Z",
    updatedBy: "Funke Sample",
  },
];
