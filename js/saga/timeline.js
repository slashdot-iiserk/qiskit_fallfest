/**
 * The saga's score.
 *
 * Every constant is a fraction of the section's scroll runway, in order. The
 * story is changed by moving these, not by scattering numbers through the
 * frame loop.
 */

import { PEOPLE, SPEAKERS, TIERS } from '../data/event.js';

export const T = {
  /* Act I — the drawing becomes the machine */
  drawHold:   0.022,  // whole machine, sharp
  push:       0.075,  // camera has pushed in on the top plate
  shatter:    0.102,  // the drawing hands over to its own particles
  assemble:   0.162,  // the particles have taken the machine's shape
  solid:      0.195,  // the render has faded in under them

  /* Act II — the descent */
  partsIn:    0.215,
  partsOut:   0.330,
  valuesIn:   0.355,
  valuesOut:  0.455,
  chip:       0.475,  // arrival at the processor

  /* Act III — the qubit */
  qubitStart: 0.492,
  qubitEnd:   0.556,

  /* Act IV — gates, played by hand */
  gatesIn:    0.570,
  gatesOut:   0.650,

  /* Act V — along the state vector.
     The longest act on purpose: everything the rest of the site says gets said
     here, as places you fly past rather than sections you scroll. */
  journeyIn:  0.668,  // the camera starts to move into the sphere
  inside:     0.712,  // ...and is at its centre; the faces start to come round
  outside:    0.876,  // the turn is over; the camera starts to leave
  journeyOut: 0.942,  // pulled all the way back: one sphere, as before

  /* Act VI — everything becomes the button */
  buttonIn:   0.955,
  buttonOut:  0.995,
};

/** Where the qubit forms: the chip's own place at the bottom of the machine. */
export const SPHERE_Y = -0.95;
/** How far left the sphere slides to make room for the gate panel. */
export const SPHERE_X = -0.42;
export const SPHERE_R = 0.62;

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** 0 below `from`, 1 above `to`, smoothly eased between. */
export function ramp(v, from, to) {
  const t = clamp((v - from) / (to - from));
  return t * t * (3 - 2 * t);
}

/**
 * The descent, shaped.
 *
 * A straight glide past five stages reads as a lift with no floors. Folding a
 * small sine into the curve slows the camera as it passes each plate and lets
 * it run between them, which is what gives the ride its rhythm.
 *
 * It has to stay monotonic or scrolling down would visibly reverse. The
 * derivative is 1 - 2*pi*stops*depth*cos(...), so the amplitude is capped at
 * 1/(2*pi*stops) and taken slightly under it.
 */
export function paced(t, stops = 4) {
  const depth = 0.85 / (2 * Math.PI * stops);
  return clamp(t - Math.sin(t * Math.PI * 2 * stops) * depth);
}

/**
 * The camera path, as a pure function of progress.
 *
 * It always looks horizontally, which makes the descent read as an elevator
 * ride and — because the view axis is then exactly -Z — lets the DOM drawing
 * be fitted to the same framing with plain trigonometry, no matrices.
 */
export function cameraAt(p, aspect = 16 / 9) {
  const descent = paced(ramp(p, T.assemble, T.chip));
  const qubit = ramp(p, T.qubitStart, T.qubitEnd);
  const button = ramp(p, T.buttonIn, T.buttonOut);

  // Act I frames the whole machine, then pushes in on the top plate.
  const pushIn = ramp(p, T.drawHold, T.push);
  const openY = lerp(0.0, 0.95, pushIn);
  const openZ = lerp(3.5, 1.95, pushIn);

  // Act II walks down to the chip.
  const y = lerp(openY, SPHERE_Y, descent);
  const z = lerp(openZ, 1.15, descent);

  // Act III pulls back so the qubit stands alone.
  const zQubit = lerp(z, 3.3, qubit);

  // Act V holds the wide shot. The camera that goes *inside* the sphere is
  // blended on top of this in js/saga.js, and it comes back out to exactly this
  // framing — so the pull-back lands on the whole sphere rather than on a
  // close-up, and the button forms from a shot the viewer has already seen.
  // (This used to push in to 1.05 here, back when act V rode beside the vector.)
  const zJourney = zQubit;

  // Act VI settles square on the button.
  const zButton = lerp(zJourney, 2.6, button);

  return { y, z: zButton * aspectWiden(aspect), fov: 32 };
}

/**
 * How much further back a viewport needs the camera.
 *
 * A portrait screen crops the machine at the sides, so everything steps back —
 * the descent, the journey inside the sphere, and the DOM drawing, which is
 * fitted with the same number so the two framings stay identical right up to
 * the hand-off. Anything that positions the camera has to apply this or that
 * shot will be framed for a laptop and cropped on a phone.
 */
export function aspectWiden(aspect) {
  return Math.min(1.5, Math.max(1, 0.78 / aspect));
}

/* --------------------------------------------------------------------------
   Copy
   -------------------------------------------------------------------------- */

/* --------------------------------------------------------------------------
   Inside the sphere
   --------------------------------------------------------------------------
   Act V puts the camera at the centre of the qubit and turns it slowly, while
   the stops hang in the space around it — faces and details at different
   distances and heights, each one coming round just as you turn to it. Both
   functions are pure and work in units of the sphere's own radius, so the
   render and the tests agree about where everything is. */

/** How many full turns the camera makes over the whole interior. */
export const INTERIOR_TURNS = 1.6;
/** How far behind the centre the camera sits, so what is ahead has depth. */
export const INTERIOR_BACK = 0.26;

export const yawAt = (u) => u * INTERIOR_TURNS * Math.PI * 2;

/**
 * Where the camera is and where it looks, `u` being 0..1 through the interior.
 * Positions are relative to the sphere's centre, in sphere radii.
 */
export function interiorPose(u) {
  const yaw = yawAt(u);
  const fx = Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const pitch = 0.05 * Math.sin(u * 9);
  return {
    yaw, pitch,
    // Looking along (fx, pitch, fz), standing a little behind the centre and
    // bobbing slightly, so it reads as drifting rather than as a turntable.
    position: [-fx * INTERIOR_BACK, 0.05 * Math.sin(u * 7), -fz * INTERIOR_BACK],
    forward: [fx * Math.cos(pitch), Math.sin(pitch), fz * Math.cos(pitch)],
  };
}

const ELEVATIONS = [-0.05, 0.16, 0.02, 0.24, 0.1];   // kept above the caption band
const RADII = [0.62, 0.78, 0.7];

/**
 * Where a station hangs, in sphere radii from the centre. It sits on the bearing
 * the camera faces at its own `t`, so it is dead ahead exactly when it is meant
 * to be read; the rest of the spread comes from height and distance.
 */
export function stationPlacement(spec, index) {
  const az = yawAt(spec.t);
  const el = ELEVATIONS[index % ELEVATIONS.length];
  const r = RADII[index % RADII.length];
  return {
    az, el, r,
    position: [
      Math.sin(az) * Math.cos(el) * r,
      Math.sin(el) * r,
      -Math.cos(az) * Math.cos(el) * r,
    ],
  };
}

/** What each part of the machine is. `y` is its height in model space. */
export const PARTS = [
  { y: 0.94, x: 0.34, z: 0.34, side: 'right', k: '300 K flange', short: '300 K',
    v: 'Room temperature. Everything below is colder than deep space.' },
  { y: 0.26, x: 0.58, z: 0.14, side: 'right', k: '4 K stage', short: '4 K',
    v: 'Gold-plated copper. Gold does not oxidise, and copper carries heat out fast.' },
  { y: -0.06, x: -0.60, z: 0.22, side: 'left', k: 'Signal lines', short: 'Wiring',
    v: 'Coax runs carrying microwave pulses down. Each one is a gate you can apply.' },
  { y: -0.58, x: 0.46, z: 0.34, side: 'right', k: '10 mK stage', short: '10 mK',
    v: 'The mixing chamber. Colder than interstellar space, by a factor of thirty.' },
  { y: -0.92, x: -0.44, z: 0.26, side: 'left', k: 'The processor', short: 'The chip',
    v: 'A fingernail of silicon. The only part that is actually the computer.' },
];

/** What the fest is — orbiting the machine as you descend it. */
export const VALUES = [
  { k: 'Start from zero', short: 'From zero',
    v: 'Day 0 ends with an installation clinic; Day 1 starts with quantum mechanics. Never touched quantum mechanics? You are who this was built for.' },
  { k: 'Physics, then hands-on labs', short: 'Talk, then lab',
    v: 'Day 1 pairs quantum mechanics and Qiskit 101 with labs on spins, entanglement and teleportation.' },
  { k: 'Everything published up front', short: 'Published up front',
    v: 'Slides, notebooks and the setup guide go public before each session — and stay there. The 2025 archive is what that looks like.' },
  { k: 'Three certificate tiers', short: 'Three tiers',
    v: 'Participation, Intermediate, Advanced. Find the advanced day heavy and the Intermediate certificate is still well within reach.' },
  { k: 'Beyond the basics', short: 'Advanced topics',
    v: 'Day 2 is the variational quantum eigensolver and Qiskit MCP; Day 4 is quantum key distribution, the Fourier transform and phase estimation.' },
  { k: 'An industry insider to close', short: 'Invited talk',
    v: 'Day 3 brings an expert talk from the IBM Quantum ecosystem, followed by a panel with the IBM guest and faculty.' },
];

/**
 * What you pass on the way up the state vector, inside the sphere. `t` is how
 * far along the vector each stop sits, 0 at the centre and 1 at the tip.
 *
 * This is the whole back half of the landing page, re-staged: the team, the
 * venue, the certificates, the challenge and the speakers are all *places*
 * here rather than sections. A `ring` stop is expanded by the saga into one
 * anchor per item, arranged around the vector at that depth, so the camera
 * flies through a circle of faces or tiers rather than past a list.
 */
export const STATIONS = [
  { t: 0.03, side: 'right', k: 'Five days', short: 'Five days',
    v: '10 – 14 October at MN Saha and G06. A kick-off, physics and hands-on labs, two advanced evenings, and an expert talk with a panel.' },
  { t: 0.09, side: 'left', k: 'Talk, then lab, every hour', short: 'Talk + lab',
    v: 'Every session on the hands-on day is a talk followed immediately by a lab. A concept is never far from being code you have run.' },

  { t: 0.20, kind: 'ring', group: 'team', ring: 0.80,
    k: 'The people running it', short: 'The team' },

  { t: 0.35, side: 'right', k: 'MN Saha Auditorium', short: 'The venue',
    v: 'Every session but one, in one room on the IISER Kolkata campus. Nothing is streamed — you are in it.' },
  { t: 0.41, side: 'left', k: 'Mohanpur, Nadia', short: 'Getting there',
    v: 'The campus is at Mohanpur, about an hour and a half north of Kolkata. Directions and the nearest station are on the venue section.' },

  { t: 0.53, kind: 'ring', group: 'tiers', ring: 0.62,
    k: 'Three certificates', short: 'Certificates' },

  { t: 0.64, side: 'right', k: 'A challenge, with swag', short: 'The challenge',
    v: 'A problem set to take away and actually solve, run across the fest. The brief is still being written; the prizes are not hypothetical.' },
  { t: 0.70, side: 'left', k: 'Everything published up front', short: 'Published',
    v: 'Slides, notebooks and the setup guide go public before each session — and stay there. The 2025 archive is what that looks like.' },

  { t: 0.85, kind: 'ring', group: 'speakers', ring: 0.72,
    k: 'Who is talking', short: 'Speakers' },

  { t: 0.98, side: 'right', k: 'One unnamed speaker', short: 'The speaker',
    v: 'An industry insider from the IBM Quantum world closes the fest on 13 October. The name is still unmeasured.' },
];

/** `u` of the way through the interior, as a position on the runway. */
const IN = (u) => T.inside + u * (T.outside - T.inside);

/** Copy under the stage, keyed to where the scroll is. */
export const CHAPTERS = [
  { at: T.solid, title: 'This is not the computer.',
    body: 'Almost all of it is refrigeration. The processor is the small chip at the very bottom — everything above exists to keep it cold and quiet enough to work.' },
  { at: 0.285, title: 'Each plate is colder than the last.',
    body: 'Gold-plated copper, stage after stage, carrying heat upward and out. By the bottom the chip sits near 0.01 K.' },
  { at: 0.375, title: 'Every wire is an instruction.',
    body: 'The coax bundles carry shaped microwave pulses. A pulse of the right frequency, amplitude and duration is itself a gate.' },
  { at: T.qubitStart, title: 'And at the bottom, one qubit.',
    body: 'Everything you have just scrolled past exists to hold this still.' },
  { at: T.gatesIn, title: 'Now move it.',
    body: 'Each gate is a rotation. Pick one and watch the state sweep along its arc — these are the same numbers Qiskit would print.' },
  { at: T.journeyIn, title: 'Now step inside.',
    body: 'The sphere you have been steering has an inside. Everything else about the fest is hung in the space around its centre.' },
  { at: IN(0.14), title: 'The people running it.',
    body: 'Students of IISER Kolkata, organising this alongside their own coursework — most of them were in the audience at a fest like this not long ago.' },
  { at: IN(0.33), title: 'The room, and how to reach it.',
    body: 'One auditorium, five days, an hour and a half north of Kolkata. Everything else in here is what happens inside it.' },
  { at: IN(0.50), title: 'Nobody walks away empty-handed.',
    body: 'Three certificate tiers, a challenge with real swag, and every notebook still public long after the lights go out.' },
  { at: IN(0.78), title: 'And the people teaching it.',
    body: 'Every session is taught by someone who will still be in the room afterwards — and one name still held in superposition until the last day.' },
  { at: T.outside + 0.004, title: 'Now step back out.',
    body: 'All of it, in one qubit. Pull away and it is a single sphere again.' },
];


/**
 * Flattens the journey into one list of anchors.
 *
 * A `ring` stop becomes one entry per item, placed on a ring around the vector
 * at that depth, so the camera flies through a circle rather than past a list.
 * People carry their portrait; certificate tiers carry their seal. Shared by
 * the render and by the no-WebGL fallback, so the two can never show different
 * content.
 */
const RINGS = {
  team: () => PEOPLE.map((person) => ({
    k: person.name,
    short: person.name.split(' ')[0],
    v: person.org ? `${person.role} · ${person.org}` : person.role,
    person: true,
    photo: person.photo ? `assets/organisers/${person.photo}-256.webp` : null,
  })),
  speakers: () => SPEAKERS.map((person) => ({
    k: person.name,
    short: person.name.split(' ')[0],
    v: person.org ? `${person.role} · ${person.org}` : person.role,
    person: true,
    photo: person.photo ? `assets/organisers/${person.photo}-256.webp` : null,
  })),
  // The tiers are not people, so they get no portrait and no initials —
  // they read as the three plates they are.
  tiers: () => TIERS.map((tier) => ({
    k: `${tier.name} certificate`,
    short: tier.rank,
    v: tier.summary,
    photo: null,
  })),
};

export function expandStations() {
  const out = [];
  for (const stop of STATIONS) {
    const build = RINGS[stop.kind === 'ring' || stop.kind === 'people' ? stop.group : ''];
    if (!build) {
      out.push({ ...stop, ring: 0, angle: 0 });
      continue;
    }
    const items = build();
    items.forEach((item, i) => {
      const angle = (i / items.length) * Math.PI * 2;
      out.push({
        ...item,
        side: Math.cos(angle) >= 0 ? 'right' : 'left',
        // A ring is spread over an arc of the turn — about half a radian per
        // member, capped — so its members come round one after another instead
        // of arriving together in a heap. `t` is both when a member is read and,
        // through yawAt(), the bearing it hangs on.
        t: stop.t + ((items.length > 1 ? i / (items.length - 1) : 0.5) - 0.5)
          * (Math.min(1.9, 0.5 * items.length) / (INTERIOR_TURNS * Math.PI * 2)),
        ring: stop.ring,
        angle,
      });
    });
  }
  return out;
}
