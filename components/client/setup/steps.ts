/** Setup stepper labels. Order = index in the stepper. Same shapes as Admin setup (profile / agreements / finish). */
export const SETUP_STEPS = ["Welcome", "Your details", "Policies", "Finish"] as const;

export const SETUP_DESCRIPTIONS = [
  "A quick tour before you start. Setup takes a few minutes.",
  "Confirm who you are so your Beeliv team can reach you.",
  "Please read and accept the policies Beeliv has published.",
  "Ask Beeliv to check your setup. Beeliv confirms when access is active.",
] as const;

export const LAST_STEP = SETUP_STEPS.length - 1;

export const SETUP_HREF = "/client/setup";
export const setupStepHref = (step: number) => `${SETUP_HREF}?step=${step}`;
