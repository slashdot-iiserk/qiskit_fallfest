/**
 * Single source of truth for everything the 2026 site says about the event.
 * Edit here — the schedule, speaker and team sections all render from this file.
 */

export const EVENT = {
  name: 'Qiskit Fall Fest 2026',
  host: 'SlashDot — the Coding & Design Club, IISER Kolkata',
  institute: 'Indian Institute of Science Education and Research Kolkata',
  venue: 'MN Saha Auditorium & G06, IISER Kolkata',
  address: 'Mohanpur Campus, Mohanpur, Nadia, West Bengal 741246, India',
  mapUrl: 'https://maps.google.com/?q=IISER+Kolkata+Mohanpur',
  startISO: '2026-10-10T21:00:00+05:30',
  endISO: '2026-10-13T20:00:00+05:30',
  revealISO: '2026-10-13T18:00:00+05:30', // invited-speaker reveal
  window: '10 – 13 October 2026',
  formId: '1FAIpQLScy8rg7XZ5eLH8hWIwBaz2WaEfUhfFGQERVr7Dap41k33aZpw',
  formShortUrl: 'https://forms.gle/VYnMRpgPCHiGEfNZ7',
  repoUrl: 'https://github.com/slashdot-iiserk/qiskit_fallfest',
  contactEmail: 'slashdot@iiserkol.ac.in',
};

/** Timeline. `speakers` entries are matched against PEOPLE by slug where possible. */
export const SCHEDULE = [
  {
    id: 'day-0',
    label: 'Day 0',
    theme: 'Kick Off',
    date: '2026-10-10',
    dateLabel: 'Sat · 10 Oct 2026',
    blurb:
      'The opening night. We lay out the full itinerary, argue for why quantum computing is worth your weekend, ' +
      'and get every laptop in the room running Qiskit before anyone leaves.',
    sessions: [
      {
        time: '9:00 PM – 9:30 PM',
        title: 'Qiskit Fall Fest 2026 — Kick Off Event!',
        venue: 'MN Saha',
        speakers: [
          'Devang Shroff', 'Rishabh Chaudhuri', 'Manish Behera', 'Anuprovo Debnath',
          'Abhinav Dhingra', 'Shuvam Banerji Seal', 'Afreen Chowdhury', 'Alok Jha', 'Md Shayan Bari',
        ],
        tag: 'Opening',
        note: 'The full timeline and scope of the fest, plus an itinerary of everything that will happen.',
      },
      {
        time: '9:30 PM – 10:00 PM',
        title: 'Why Quantum? What Problems Are We Solving?',
        venue: 'MN Saha',
        speakers: ['Manish Behera'],
        tag: 'Talk',
        note: 'Where quantum advantage is real, where it is hype, and which problems are genuinely on the table.',
      },
      {
        time: 'After the talks',
        title: 'Installation Session — Getting Started',
        venue: 'MN Saha',
        speakers: ['Volunteers'],
        tag: 'Hands-on',
        note: 'Volunteers help you install Qiskit and set up your Python environment. Bring a laptop and a charger.',
      },
    ],
  },
  {
    id: 'day-1',
    label: 'Day 1',
    theme: 'Programming Quantum Computers',
    date: '2026-10-11',
    dateLabel: 'Sun · 11 Oct 2026',
    blurb:
      'Physics with Gluon in the morning, then Qiskit 101 and two hands-on labs. ' +
      'The afternoon sessions and Labs 1 – 2 build on Participation towards the Intermediate certificate.',
    sessions: [
      {
        time: '10:00 AM – 12:00 PM',
        title: 'Quantum Mechanics for Quantum Computing',
        venue: 'MN Saha',
        speakers: ['Devang Shroff', 'Rishabh Chaudhuri'],
        tag: 'Primer',
        note: 'In collaboration with Gluon. An optional primer on linear algebra, state vectors, and the postulates you actually need at a keyboard.',
      },
      {
        time: '2:00 PM – 3:00 PM',
        title: 'Introduction to Quantum Computing — Qiskit 101',
        venue: 'MN Saha',
        speakers: ['Manish Behera'],
        tag: 'Talk',
        note: 'Circuits, gates, measurement, and your first end-to-end Qiskit program.',
      },
      {
        time: '3:00 PM – 4:00 PM',
        title: 'Stern–Gerlach Experiment and Spins + Lab 1',
        venue: 'MN Saha',
        speakers: ['Manish Behera', 'Alok Jha'],
        tag: 'Lab 1',
        note: 'A direct parallel to the Stern–Gerlach and spins material of QSS26.',
      },
      {
        time: '4:00 PM – 5:00 PM',
        title: 'Entanglement and Quantum Teleportation with Qiskit + Lab 2',
        venue: 'MN Saha',
        speakers: ['Manish Behera', 'Md Shayan Bari'],
        tag: 'Lab 2',
        note: 'Explore entanglement and quantum teleportation with Qiskit.',
      },
    ],
  },
  {
    id: 'day-2',
    label: 'Day 2',
    theme: 'Advanced Topics',
    date: '2026-10-12',
    dateLabel: 'Mon · 12 Oct 2026',
    blurb:
      'Three advanced evening sessions: quantum key distribution, the quantum Fourier transform and ' +
      'phase estimation, then Shor’s algorithm. The final session ends at midnight, as 13 October begins.',
    sessions: [
      {
        time: '9:00 PM – 10:00 PM',
        title: 'Quantum Key Distribution (QKD)',
        venue: 'MN Saha',
        speakers: ['Manish Behera'],
        tag: 'Advanced',
        note: 'Quantum key distribution and quantum cryptography.',
      },
      {
        time: '10:00 PM – 11:00 PM',
        title: 'Quantum Fourier Transform (QFT) and Phase Estimation',
        venue: 'MN Saha',
        speakers: ['Alok Jha', 'Manish Behera'],
        tag: 'Advanced',
        note: 'The quantum Fourier transform and quantum phase estimation.',
      },
      {
        time: '11:00 PM – 12:00 AM (midnight)',
        title: 'Shor’s Algorithm',
        venue: 'MN Saha',
        speakers: ['Anuprovo Debnath', 'Alok Jha'],
        tag: 'Advanced',
        note: 'Quantum factoring with Shor’s algorithm. Ends at midnight at the start of 13 October.',
      },
    ],
  },
  {
    id: 'day-3',
    label: 'Day 3',
    theme: 'Expert Talk & Panel',
    date: '2026-10-13',
    dateLabel: 'Tue · 13 Oct 2026',
    blurb:
      'The finale in G06: an IBM industry expert talk followed by a panel with the IBM guest and faculty. ' +
      'Speaker and panellist names will be announced closer to the date.',
    sessions: [
      {
        time: '6:00 PM – 7:00 PM',
        title: 'Expert Talk — IBM Industry Insider',
        venue: 'G06',
        speakers: [],
        tag: 'Invited',
        note: 'IBM industry expert: TBA. Registered participants hear the name first.',
      },
      {
        time: '7:00 PM – 8:00 PM',
        title: 'Panel Discussion — IBM Guest and Faculty',
        venue: 'G06',
        speakers: ['IBM guest (TBA)', 'Faculty (TBA)'],
        tag: 'Panel',
        note: 'Panellist names to be announced.',
      },
    ],
  },
];

/** Organising team. `photo` is a slug under assets/organisers/; null renders initials. */
export const PEOPLE = [
  { name: 'Manish Behera',       role: 'Lead Organiser', photo: 'manish-behera' },
  { name: 'Shuvam Banerji Seal', role: 'Co-Organiser',   photo: 'shuvam-banerji-seal' },
  { name: 'Anuprovo Debnath',    role: 'Co-Organiser',   photo: 'anuprovo-debnath' },
  { name: 'Abhinav Dhingra',     role: 'Co-Organiser',   photo: 'abhinav-dhingra' },
  { name: 'Afreen Chowdhury',    role: 'Co-Organiser',   photo: 'afreen-chowdhury' },
  { name: 'Alok Jha',            role: 'Co-Organiser',   photo: 'alok-jha' },
  { name: 'Md Shayan Bari',      role: 'Co-Organiser',   photo: null },
];

/**
 * Speakers billed on the public schedule, in the order the fest meets them.
 *
 * Several are also on PEOPLE — running the fest and teaching a session are
 * different jobs, and the site asks the two questions separately. `role` is
 * what they are speaking *on*, which is the thing this list adds over the
 * team grid.
 */
export const SPEAKERS = [
  { name: 'Devang Shroff',      role: 'Quantum Mechanics Primer', org: 'Gluon', photo: 'devang-shroff' },
  { name: 'Rishabh Chaudhuri',  role: 'Quantum Mechanics Primer', org: 'Gluon', photo: 'rishabh-chaudhuri' },
  { name: 'Manish Behera',      role: 'Why Quantum? · Qiskit 101 · Labs 1 & 2 · QKD · QFT & Phase Estimation', org: 'SlashDot, IISER Kolkata', photo: 'manish-behera' },
  { name: 'Shuvam Banerji Seal', role: 'Kick Off',    org: 'SlashDot, IISER Kolkata', photo: 'shuvam-banerji-seal' },
  { name: 'Md Shayan Bari',     role: 'Entanglement & Teleportation · Lab 2', org: 'SlashDot, IISER Kolkata', photo: null },
  { name: 'Alok Jha',           role: 'Stern–Gerlach & Spins · Lab 1 · QFT & Phase Estimation · Shor’s Algorithm', org: 'SlashDot, IISER Kolkata', photo: 'alok-jha' },
  { name: 'Anuprovo Debnath',   role: 'Advanced · Shor’s Algorithm', org: 'SlashDot, IISER Kolkata', photo: 'anuprovo-debnath' },
];

/** Certificate tiers. */
export const TIERS = [
  {
    rank: 'Tier 01',
    seal: 'P',
    name: 'Participation',
    summary: 'For everyone who shows up and takes part. No prerequisites, no prior quantum background needed.',
    points: [
      'Attend the Day 0 kick-off and the "Why Quantum?" session',
      'Complete the installation session with a working Qiskit environment',
      'Open to first-timers from any discipline',
    ],
    req: 'Requires: Day 0 attendance',
    featured: false,
  },
  {
    rank: 'Tier 02',
    seal: 'I',
    name: 'Intermediate',
    summary: 'For participants who complete the full hands-on day. This is the realistic target if this is your first fest.',
    points: [
      'Everything in Participation',
      'Attend the Day 1 afternoon sessions — Qiskit 101, Stern–Gerlach & Spins, Entanglement & Teleportation',
      'Submit Labs 1 – 2 notebooks',
      'Reachable even if the advanced day is out of reach',
    ],
    req: 'Requires: Day 0 + Day 1 afternoon attendance and Labs 1 – 2',
    featured: true,
  },
  {
    rank: 'Tier 03',
    seal: 'A',
    name: 'Advanced',
    summary: 'For participants who go the whole distance, including the advanced track and the final assessment.',
    points: [
      'Everything in Intermediate',
      'Attend the Day 2 advanced sessions',
      'Complete the advanced challenge notebook',
      'Attend the Day 3 invited expert talk',
    ],
    req: 'Requires: Days 0 – 3 (Day 1 afternoon) and the advanced challenge',
    featured: false,
  },
];

/** Frequently asked questions. */
export const FAQ = [
  {
    q: 'Do I need any background in quantum physics or programming?',
    a: 'No quantum background is required. Basic Python — variables, loops, functions, and a little NumPy — will ' +
       'make the labs much smoother. Day 0 ends with an installation clinic where volunteers get your ' +
       'environment working. The optional Day 1 morning primer with Gluon covers the physics before the afternoon labs.',
  },
  {
    q: 'How much does it cost?',
    a: 'Participation is free for IISER Kolkata students. External participants pay a ₹200 registration fee. ' +
       'Optional hostel accommodation for external participants costs ₹200 per day, separately from registration; ' +
       'request it on the registration form and we will follow up by email.',
  },
  {
    q: 'Is it open to students from outside IISER Kolkata?',
    a: 'Yes, students from any institute are welcome. The registration form branches so that visiting ' +
       'participants can give us their institute and request campus accommodation.',
  },
  {
    q: 'What do I need to bring?',
    a: 'A laptop and its charger. Install Python 3.10 or newer beforehand if you can; if anything goes wrong, ' +
       'bring it to the Day 0 installation session and we will sort it out together.',
  },
  {
    q: 'I can only make some of the days. Can I still get a certificate?',
    a: 'Yes. Attend the Day 0 kick-off and "Why Quantum?" session and complete installation for Participation. ' +
       'Add the Day 1 afternoon sessions and submit Labs 1 – 2 for Intermediate. Add the Day 2 advanced sessions, ' +
       'the advanced challenge notebook and the Day 3 invited expert talk for Advanced. The morning primer ' +
       'and closing panel add no certificate requirements.',
  },
  {
    q: 'Who is the invited speaker on Day 3?',
    a: 'In superposition, for now. We are hosting an industry insider from the IBM Quantum ecosystem and the name ' +
       'will be revealed closer to the date. The talk is on 13 October, 6:00 – 7:00 PM in G06, followed by ' +
       'a 7:00 – 8:00 PM panel with the IBM guest and faculty (names TBA). Registered participants are notified first, by email.',
  },
  {
    q: 'Will the material be available afterwards?',
    a: 'Yes. Slides, notebooks and the installation guide are published in this repository before each session, ' +
       'exactly as they were for the 2025 edition, and they stay online afterwards. The 2025 archive on this site ' +
       'is a working example of what to expect.',
  },
  {
    q: 'How do I get help before the fest?',
    a: 'Open an issue on the GitHub repository, or write to the SlashDot team. The installation guide in the ' +
       'resources section answers the most common environment problems.',
  },
];
