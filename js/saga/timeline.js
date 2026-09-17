/**
 * The saga's score.
 *
 * Every constant is a fraction of the section's scroll runway, in order. The
 * story is changed by moving these, not by scattering numbers through the
 * frame loop.
 */

import { PEOPLE, SPEAKERS } from '../data/event.js';

export const T = {
  /* Act I — the drawing becomes the machine */
  drawHold:   0.030,  // whole machine, sharp
  push:       0.100,  // camera has pushed in on the top plate
  shatter:    0.135,  // the drawing hands over to its own particles
  assemble:   0.215,  // the particles have taken the machine's shape
  solid:      0.255,  // the render has faded in under them

  /* Act II — the descent */
  partsIn:    0.280,
  partsOut:   0.430,
  valuesIn:   0.460,
  valuesOut:  0.600,
  chip:       0.625,  // arrival at the processor

  /* Act III — the qubit */
  qubitStart: 0.645,
  qubitEnd:   0.730,

  /* Act IV — gates, played by hand */
  gatesIn:    0.745,
  gatesOut:   0.830,

  /* Act V — along the state vector */
  journeyIn:  0.845,
  journeyOut: 0.945,

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
  const journey = ramp(p, T.journeyIn, T.journeyOut);
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

  // Act V flies along the state vector, through the sphere's shell.
  const zJourney = lerp(zQubit, 1.05, journey);

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
    v: 'Day 0 covers the physics, Day 1 ends with an installation clinic. Never touched quantum mechanics? You are who this was built for.' },
  { k: 'Talk, then lab, every hour', short: 'Talk, then lab',
    v: 'Every session on the hands-on day is a talk followed immediately by a lab. A concept is never far from being code you have run.' },
  { k: 'Everything published up front', short: 'Published up front',
    v: 'Slides, notebooks and the setup guide go public before each session — and stay there. The 2025 archive is what that looks like.' },
  { k: 'Three certificate tiers', short: 'Three tiers',
    v: 'Participation, Intermediate, Advanced. Find the advanced day heavy and the Intermediate certificate is still well within reach.' },
  { k: 'Real hardware, real noise', short: 'Real hardware',
    v: 'We do not stop at the simulator. A full session on what happens on machines like this one: decoherence, readout error, reality.' },
  { k: 'An industry insider to close', short: 'Invited talk',
    v: 'The fest ends with an invited expert from the IBM Quantum ecosystem. Registrants hear the name first.' },
];

/**
 * What you pass on the way up the state vector, inside the sphere. `t` is how
 * far along the vector each stop sits, 0 at the centre and 1 at the tip.
 *
 * A `people` stop is expanded by the saga into one anchor per person, arranged
 * in a ring around the vector at that depth, so the camera flies through a
 * circle of faces rather than past a list.
 */
export const STATIONS = [
  { t: 0.08, side: 'right', k: 'Five days', short: 'Five days',
    v: '6 – 13 October at MN Saha. A primer, a kick-off, a full hands-on day, an advanced track, and an invited talk to close.' },
  { t: 0.26, kind: 'people', group: 'team', ring: 0.80,
    k: 'The people running it', short: 'The team' },
  { t: 0.50, side: 'left', k: 'Three certificates', short: 'Certificates',
    v: 'Participation, Intermediate, Advanced — issued on attendance and submitted lab work. They stack.' },
  { t: 0.68, kind: 'people', group: 'speakers', ring: 0.72,
    k: 'Who is talking', short: 'Speakers' },
  { t: 0.88, side: 'right', k: 'One unnamed speaker', short: 'The speaker',
    v: 'An industry insider from the IBM Quantum world closes the fest on 13 October. The name is still unmeasured.' },
];

/** Copy under the stage, keyed to where the scroll is. */
export const CHAPTERS = [
  { at: T.solid, title: 'This is not the computer.',
    body: 'Almost all of it is refrigeration. The processor is the small chip at the very bottom — everything above exists to keep it cold and quiet enough to work.' },
  { at: 0.38, title: 'Each plate is colder than the last.',
    body: 'Gold-plated copper, stage after stage, carrying heat upward and out. By the bottom the chip sits near 0.01 K.' },
  { at: 0.50, title: 'Every wire is an instruction.',
    body: 'The coax bundles carry shaped microwave pulses. A pulse of the right frequency, amplitude and duration is itself a gate.' },
  { at: T.qubitStart, title: 'And at the bottom, one qubit.',
    body: 'Everything you have just scrolled past exists to hold this still.' },
  { at: T.gatesIn, title: 'Now move it.',
    body: 'Each gate is a rotation. Pick one and watch the state sweep along its arc — these are the same numbers Qiskit would print.' },
  { at: T.journeyIn, title: 'Come inside.',
    body: 'Five days, three certificates and one unnamed speaker, along the vector you just steered.' },
];


/**
 * Flattens the journey into one list of anchors.
 *
 * A `people` stop becomes one entry per person, carrying their portrait and
 * placed on a ring around the vector at that depth, so the camera flies through
 * a circle of faces rather than past a list. Shared by the render and by the
 * no-WebGL fallback, so the two can never show different people.
 */
export function expandStations() {
  const out = [];
  for (const stop of STATIONS) {
    if (stop.kind !== 'people') {
      out.push({ ...stop, ring: 0, angle: 0 });
      continue;
    }
    const roster = stop.group === 'team' ? PEOPLE : SPEAKERS;
    roster.forEach((person, i) => {
      const angle = (i / roster.length) * Math.PI * 2;
      out.push({
        k: person.name,
        short: person.name.split(' ')[0],
        v: person.org ? `${person.role} · ${person.org}` : person.role,
        side: Math.cos(angle) >= 0 ? 'right' : 'left',
        person: true,
        photo: person.photo ? `assets/organisers/${person.photo}-256.webp` : null,
        // Spread each ring a little in depth so faces do not stack up.
        t: stop.t + (i / roster.length - 0.5) * 0.06,
        ring: stop.ring,
        angle,
      });
    });
  }
  return out;
}
