// Each project type ships with a sensible default milestone sequence.
// Users can still add, remove, or reorder milestones after creation —
// these are starting points, not constraints.

export const PROJECT_TYPES = [
  { value: 'basement', label: 'Basement finish' },
  { value: 'deck', label: 'Deck build' },
  { value: 'den', label: 'Den / room addition' },
  { value: 'kitchen', label: 'Kitchen refresh' },
  { value: 'bathroom', label: 'Bathroom remodel' },
  { value: 'general', label: 'General repair / other' },
]

export const MILESTONE_TEMPLATES = {
  basement: [
    'Permit & planning',
    'Demo & prep',
    'Framing',
    'Electrical rough-in',
    'Plumbing rough-in',
    'Insulation & vapor barrier',
    'Drywall',
    'Flooring',
    'Trim & paint',
    'Final inspection',
  ],
  deck: [
    'Permit & design',
    'Demo / site prep',
    'Footings',
    'Framing',
    'Decking',
    'Railing & stairs',
    'Finishing & sealant',
    'Final inspection',
  ],
  den: [
    'Permit & planning',
    'Framing',
    'Electrical rough-in',
    'HVAC tie-in',
    'Insulation',
    'Drywall',
    'Flooring',
    'Trim & paint',
    'Final inspection',
  ],
  kitchen: [
    'Planning & design',
    'Demo',
    'Electrical & plumbing rough-in',
    'Cabinetry install',
    'Countertops',
    'Backsplash',
    'Appliance install',
    'Final walkthrough',
  ],
  bathroom: [
    'Planning & design',
    'Demo',
    'Plumbing rough-in',
    'Electrical rough-in',
    'Waterproofing & tile',
    'Fixture install',
    'Final walkthrough',
  ],
  general: [
    'Assessment',
    'Materials & scheduling',
    'Work in progress',
    'Final walkthrough',
  ],
}

export function buildMilestonesForType(projectType) {
  const steps = MILESTONE_TEMPLATES[projectType] || MILESTONE_TEMPLATES.general
  return steps.map((name, index) => ({
    name,
    sort_order: index,
    status: index === 0 ? 'in_progress' : 'not_started',
    pct_complete: 0,
  }))
}
