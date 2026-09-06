/**
 * Single source of truth for everything the 2026 site says about the event.
 * Edit here — the schedule, speaker and team sections all render from this file.
 */

export const EVENT = {
  name: 'Qiskit Fall Fest 2026',
  host: 'SlashDot — the Coding & Design Club, IISER Kolkata',
  institute: 'Indian Institute of Science Education and Research Kolkata',
  venue: 'MN Saha Auditorium, IISER Kolkata',
  address: 'Mohanpur Campus, Mohanpur, Nadia, West Bengal 741246, India',
  mapUrl: 'https://maps.google.com/?q=IISER+Kolkata+Mohanpur',
  startISO: '2026-10-06T21:00:00+05:30',
  endISO: '2026-10-13T20:00:00+05:30',
  revealISO: '2026-10-13T18:00:00+05:30', // invited-speaker reveal
  window: '6 – 13 October 2026',
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
    theme: 'Pre-Fest Primer',
    date: '2026-10-06',
    dateLabel: 'Tue · 6 Oct 2026',
    blurb:
      'A warm-up evening for anyone who wants the physics before the programming. ' +
      'Run jointly with Gluon, and entirely optional — but the single best way to arrive on Day 1 ready.',
    sessions: [
      {
        time: '9:00 PM – 12:00 AM',
        title: 'Quantum Mechanics for Quantum Computing',
        venue: 'MN Saha',
        speakers: ['Devang Shroff', 'Rishabh Chaudhuri'],
        tag: 'Primer',
        note: 'In collaboration with Gluon. Linear algebra, state vectors, and the postulates you actually need at a keyboard.',
      },
    ],
  },
  {
    id: 'day-1',
    label: 'Day 1',
    theme: 'Kick Off',
    date: '2026-10-09',
    dateLabel: 'Fri · 9 Oct 2026',
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
    id: 'day-2',
    label: 'Day 2',
    theme: 'Programming Quantum Computers',
    date: '2026-10-10',
    dateLabel: 'Sat · 10 Oct 2026',
    blurb:
      'The core hands-on day: three talks, each immediately followed by a lab. ' +
      'Completing Day 2 is what earns the Intermediate certificate.',
    sessions: [
      {
        time: '2:00 PM – 3:00 PM',
        title: 'Qiskit 101 — Programming Quantum Computers + Lab 1',
        venue: 'MN Saha',
        speakers: ['Manish Behera', 'Md Shayan Bari'],
        tag: 'Lab 1',
        note: 'Circuits, gates, measurement, and your first end-to-end Qiskit program.',
      },
      {
        time: '3:00 PM – 4:00 PM',
        title: 'Entanglement and Quantum Teleportation with Qiskit + Lab 2',
        venue: 'MN Saha',
        speakers: ['Manish Behera', 'Alok Jha'],
        tag: 'Lab 2',
        note: 'A direct parallel to the Entanglement and Quantum Effects module of QSS26.',
      },
      {
        time: '4:00 PM – 5:00 PM',
        title: 'Discussion Session — Noise, Hardware and Reality + Lab 3',
        venue: 'MN Saha',
        speakers: ['Manish Behera', 'Md Shayan Bari'],
        tag: 'Lab 3',
        note: 'What actually happens on hardware: decoherence, readout error, and the entanglement lab.',
      },
    ],
  },
  {
    id: 'day-3',
    label: 'Day 3',
    theme: 'Advanced Topics',
    date: '2026-10-11',
    dateLabel: 'Sun · 11 Oct 2026',
    blurb:
      'Three advanced sessions for participants who want to go past the basics. ' +
      'Topics are being finalised with our speakers and will be announced here first.',
    sessions: [
      { time: '2:00 PM – 3:00 PM', title: 'Advanced Topics — I', venue: 'MN Saha', speakers: [], tag: 'TBA', note: 'Topic and speaker to be announced.' },
      { time: '3:00 PM – 4:00 PM', title: 'Advanced Topics — II', venue: 'MN Saha', speakers: [], tag: 'TBA', note: 'Topic and speaker to be announced.' },
      { time: '4:00 PM – 5:00 PM', title: 'Advanced Topics — III', venue: 'MN Saha', speakers: [], tag: 'TBA', note: 'Topic and speaker to be announced.' },
    ],
  },
  {
    id: 'day-4',
    label: 'Day 4',
    theme: 'Expert Talk',
    date: '2026-10-13',
    dateLabel: 'Tue · 13 Oct 2026',
    blurb:
      'The finale. An invited speaker from industry closes the fest — and their name stays in superposition ' +
      'until we measure it.',
    sessions: [
      {
        time: '6:00 PM – 8:00 PM',
        title: 'Expert Talk — IBM Industry Insider',
        venue: 'To be announced',
        speakers: [],
        tag: 'Invited',
        note: 'Our invited speaker will be revealed closer to the date. Registered participants hear it first.',
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

/** Speakers billed on the public schedule. */
export const SPEAKERS = [
  { name: 'Devang Shroff',      role: 'Quantum Mechanics Primer', org: 'in collaboration with Gluon', photo: null },
  { name: 'Rishabh Chaudhuri',  role: 'Quantum Mechanics Primer', org: 'in collaboration with Gluon', photo: null },
  { name: 'Manish Behera',      role: 'Qiskit 101 · Entanglement · Hardware', org: 'SlashDot, IISER Kolkata', photo: 'manish-behera' },
  { name: 'Md Shayan Bari',     role: 'Labs 1 & 3',   org: 'SlashDot, IISER Kolkata', photo: null },
  { name: 'Alok Jha',           role: 'Lab 2',        org: 'SlashDot, IISER Kolkata', photo: 'alok-jha' },
];

/** Certificate tiers. */
export const TIERS = [
  {
    rank: 'Tier 01',
    seal: 'P',
    name: 'Participation',
    summary: 'For everyone who shows up and takes part. No prerequisites, no prior quantum background needed.',
    points: [
      'Attend the Day 1 kick-off and the "Why Quantum?" session',
      'Complete the installation session with a working Qiskit environment',
      'Open to first-timers from any discipline',
    ],
    req: 'Requires: Day 1 attendance',
    featured: false,
  },
  {
    rank: 'Tier 02',
    seal: 'I',
    name: 'Intermediate',
    summary: 'For participants who complete the full hands-on day. This is the realistic target if this is your first fest.',
    points: [
      'Everything in Participation',
      'Attend Day 2 in full — Qiskit 101, Entanglement & Teleportation, Noise & Hardware',
      'Submit Labs 1 – 3 notebooks',
      'Reachable even if the advanced day is out of reach',
    ],
    req: 'Requires: Day 1 + Day 2 attendance and Labs 1 – 3',
    featured: true,
  },
  {
    rank: 'Tier 03',
    seal: 'A',
    name: 'Advanced',
    summary: 'For participants who go the whole distance, including the advanced track and the final assessment.',
    points: [
      'Everything in Intermediate',
      'Attend the Day 3 advanced sessions',
      'Complete the advanced challenge notebook',
      'Attend the Day 4 invited expert talk',
    ],
    req: 'Requires: Days 1 – 4 and the advanced challenge',
    featured: false,
  },
];

/** Frequently asked questions. */
export const FAQ = [
  {
    q: 'Do I need any background in quantum physics or programming?',
    a: 'No quantum background is required. Basic Python — variables, loops, functions, and a little NumPy — will ' +
       'make the labs much smoother. Day 0 exists precisely to cover the physics, and Day 1 ends with an ' +
       'installation clinic where volunteers get your environment working.',
  },
  {
    q: 'How much does it cost?',
    a: 'There is a participation fee, and the amount has not been announced yet. It will be published on this ' +
       'site and emailed to everyone who has registered, well before the first session. Registering itself is ' +
       'free and commits you to nothing — it is simply how we reach you. Campus accommodation for participants ' +
       'travelling in is charged separately; ask for it on the registration form and we will follow up by email.',
  },
  {
    q: 'Is it open to students from outside IISER Kolkata?',
    a: 'Yes, students from any institute are welcome. The registration form branches so that visiting ' +
       'participants can give us their institute and request campus accommodation.',
  },
  {
    q: 'What do I need to bring?',
    a: 'A laptop and its charger. Install Python 3.10 or newer beforehand if you can; if anything goes wrong, ' +
       'bring it to the Day 1 installation session and we will sort it out together.',
  },
  {
    q: 'I can only make some of the days. Can I still get a certificate?',
    a: 'Yes. Certificates are tiered exactly for this reason. Day 1 earns Participation, Day 1 + Day 2 with the ' +
       'labs earns Intermediate, and the full four days with the advanced challenge earns Advanced. First-timers ' +
       'who find the advanced track hard can still walk away with the Intermediate certificate.',
  },
  {
    q: 'Who is the invited speaker on Day 4?',
    a: 'In superposition, for now. We are hosting an industry insider from the IBM Quantum ecosystem and the name ' +
       'will be revealed closer to the date. Registered participants are notified first, by email.',
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
