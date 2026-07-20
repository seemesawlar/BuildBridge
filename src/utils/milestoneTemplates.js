// Each project type ships with a sensible default milestone sequence.
// Users can still add, remove, or reorder milestones after creation —
// these are starting points, not constraints.
//
// Project type is a free-text field with suggestions, not a locked
// enum — someone doing a sunroom or a garage conversion shouldn't be
// stuck picking the closest-sounding option. `PROJECT_TYPE_SUGGESTIONS`
// powers a typeable dropdown (a <datalist>); whatever the person types
// or picks is stored as-is. `buildMilestonesForType` tries an exact
// match against the suggestions first, then a keyword hint (so "Redo
// my basement" still gets the basement template), and only falls back
// to the generic template if nothing matches.

const PROJECT_TYPE_DEFS = [
  { key: 'basement', label: 'Basement finish', keywords: ['basement'] },
  { key: 'deck', label: 'Deck build', keywords: ['deck', 'patio'] },
  { key: 'den', label: 'Den / room addition', keywords: ['den', 'room addition', 'addition'] },
  { key: 'kitchen', label: 'Kitchen refresh', keywords: ['kitchen'] },
  { key: 'bathroom', label: 'Bathroom remodel', keywords: ['bathroom', 'bath'] },
  { key: 'general', label: 'General repair / other', keywords: [] },
]

export const PROJECT_TYPE_SUGGESTIONS = PROJECT_TYPE_DEFS.map((d) => d.label)

const MILESTONE_TEMPLATES = {
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

function resolveTemplateKey(projectType) {
  const normalized = (projectType || '').trim().toLowerCase()
  if (!normalized) return 'general'

  const exact = PROJECT_TYPE_DEFS.find((d) => d.label.toLowerCase() === normalized)
  if (exact) return exact.key

  const byKeyword = PROJECT_TYPE_DEFS.find((d) => d.keywords.some((k) => normalized.includes(k)))
  return byKeyword ? byKeyword.key : 'general'
}

export function buildMilestonesForType(projectType) {
  const key = resolveTemplateKey(projectType)
  const steps = MILESTONE_TEMPLATES[key] || MILESTONE_TEMPLATES.general
  return steps.map((name, index) => ({
    name,
    sort_order: index,
    status: index === 0 ? 'in_progress' : 'not_started',
    pct_complete: 0,
  }))
}
