import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function getStaticDatabase() {
  return {
    heroes: require('../data/heroes.json'),
    hero_skills: require('../data/hero_skills.json'),
    patch_history: require('../data/patch_history.json'),
    hero_adjustments: require('../data/hero_adjustments.json'),
    hero_roles: require('../data/hero_roles.json'),
    hero_matchups: require('../data/hero_matchups.json'),
    hero_synergies: require('../data/hero_synergies.json'),
    draft_rules: require('../data/draft_rules.json'),
    source_registry: require('../data/source_registry.json'),
    sync_state: require('../data/sync_state.json'),
    sync_logs: require('../data/sync_logs.json'),
    pending_changes: require('../data/pending_changes.json')
  };
}
