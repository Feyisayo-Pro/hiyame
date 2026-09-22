// The 'skills_assessment' verification component's question bank + answer
// key. IMPORT THIS ONLY FROM api/*.ts FILES — never from anything under
// app/ or components/. Metro bundles whatever the RN/web app actually
// imports into the client JS; api/*.ts is built separately by @vercel/node
// and runs server-side only, so a file exclusively imported from there never
// reaches the browser. If this ever gets imported from a client file, the
// correctIndex answer key becomes trivially visible via view-source — that
// would make the whole assessment meaningless, not just less secure.
//
// Scope (a deliberate choice, not an oversight): general professional
// workplace competency — prioritization, communication, problem-solving,
// professionalism — not per-industry technical content. Real, accurate
// domain-specific banks (one per lib/industrySkills.ts's 12 industries)
// are a substantial content-creation effort of their own; a thin or
// inaccurate domain quiz would be worse than an honest general one. Same
// staged-scope precedent already used elsewhere in this codebase (Gig-tier
// deferral, Pilot-only self-serve matching).

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export const SKILLS_ASSESSMENT_BANK: AssessmentQuestion[] = [
  {
    id: 'q1',
    text: "You have two deliverables due today. Midway through, your manager asks for something else, due in two hours, without saying to drop the others. What's the best first move?",
    options: [
      'Quietly reprioritize on your own and hope everything still lands on time',
      "Tell your manager what's already committed today and ask how they'd like it prioritized",
      'Finish your original work first since it was requested earlier',
      'Do the new request first since it came from your manager',
    ],
    correctIndex: 1,
  },
  {
    id: 'q2',
    text: 'A teammate sends feedback on your work that feels overly harsh. What best serves the working relationship?',
    options: [
      'Reply immediately defending each point in detail',
      'Ignore the tone, take a moment, and respond to the substance of the feedback',
      "Escalate to a manager before responding to your teammate",
      'Give them the same tone back so they understand how it felt',
    ],
    correctIndex: 1,
  },
  {
    id: 'q3',
    text: "You realize you'll miss a deadline you already committed to. What's the right thing to do?",
    options: [
      'Wait to see if anyone notices before saying anything',
      'Deliver whatever is done by the deadline without comment',
      'Flag it to the stakeholder as soon as you know, with a realistic new estimate',
      'Only mention it if directly asked',
    ],
    correctIndex: 2,
  },
  {
    id: 'q4',
    text: "You disagree with a decision your team has already made and started executing. What's the most professional path?",
    options: [
      'Raise your concerns clearly once, then support the team\'s direction once a decision is made',
      'Quietly do it your own way instead',
      'Voice disagreement repeatedly in every subsequent meeting',
      'Go along with it but tell other teammates privately that it\'s wrong',
    ],
    correctIndex: 0,
  },
  {
    id: 'q5',
    text: "A client or stakeholder asks a question you don't know the answer to, in a live meeting. What's best?",
    options: [
      'Guess confidently so the meeting keeps moving',
      "Say you're not certain, and commit to a specific time you'll follow up with an answer",
      'Deflect the question to someone else in the room',
      'Say nothing and hope no one notices the question was unanswered',
    ],
    correctIndex: 1,
  },
  {
    id: 'q6',
    text: 'You spot a mistake in your own completed work after it has already been submitted. What should you do?',
    options: [
      'Say nothing unless someone else finds it first',
      'Quietly fix it without telling anyone',
      'Proactively flag the mistake and the fix to whoever received the work',
      'Wait until your next scheduled check-in to mention it',
    ],
    correctIndex: 2,
  },
  {
    id: 'q7',
    text: 'A recurring meeting regularly runs long with no clear outcomes. What is the most constructive response?',
    options: [
      'Stop attending without explanation',
      'Suggest a specific change — an agenda, a time limit, or a clearer goal — to whoever runs it',
      'Complain about it to other attendees after the meeting',
      'Attend but stay disengaged since nothing will change',
    ],
    correctIndex: 1,
  },
  {
    id: 'q8',
    text: "You're asked to take on an assignment that's outside your usual expertise, with a tight deadline. What's the best response?",
    options: [
      'Accept without comment and figure it out silently under pressure',
      'Decline outright since it is not your usual area',
      'Accept, and proactively flag where you might need support or more time given the gap in expertise',
      'Accept and quietly lower the quality bar to make the deadline',
    ],
    correctIndex: 2,
  },
  {
    id: 'q9',
    text: 'Two people give you conflicting instructions on the same piece of work. What should you do first?',
    options: [
      'Pick whichever instruction was given most recently',
      'Do both partially to avoid taking a side',
      'Surface the conflict to both parties so they can align, rather than deciding for them',
      'Follow whichever person is more senior without further discussion',
    ],
    correctIndex: 2,
  },
  {
    id: 'q10',
    text: 'You finish a task early with time to spare before your next commitment. What is the most valuable use of that time?',
    options: [
      'Wait until the next task is officially assigned',
      'Look for a way to add value — reviewing your own work, helping a teammate, or getting ahead on what\'s next',
      'Stretch the finished task out to fill the remaining time',
      'Start something unrelated and personal instead',
    ],
    correctIndex: 1,
  },
  {
    id: 'q11',
    text: "Written instructions for a task are ambiguous, and the person who wrote them is unavailable to ask right now. What's the best approach?",
    options: [
      'Wait until they are reachable before doing any work',
      'Pick the interpretation that requires the least effort',
      'State your best interpretation, proceed on that basis, and confirm it as soon as they\'re available',
      'Do all plausible interpretations at once to cover every possibility',
    ],
    correctIndex: 2,
  },
  {
    id: 'q12',
    text: 'A long-running project keeps slipping because requirements keep changing mid-stream. What is the most effective response?',
    options: [
      'Keep re-starting the work each time to match the latest request',
      'Push back on any further changes regardless of the reason',
      'Raise the pattern directly and propose a way to lock scope for the next phase',
      'Say nothing and privately absorb the extra work each time',
    ],
    correctIndex: 2,
  },
];

export const TOTAL_QUESTIONS = SKILLS_ASSESSMENT_BANK.length;
export const PASSING_SCORE = 9; // 9/12 ≈ 70%
