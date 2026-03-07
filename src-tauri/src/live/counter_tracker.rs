use crate::live::buff_monitor::{BuffChangeEvent, BuffChangeType};
use crate::live::commands_models::CounterUpdateState;
use log::info;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
#[non_exhaustive]
pub struct CounterRule {
    pub rule_id: i32,
    pub trigger: CounterTrigger,
    pub linked_buff_id: i32,
    pub threshold: Option<u32>,
    pub on_buff_add: CounterAction,
    pub on_buff_remove: CounterAction,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum CounterTrigger {
    DamageBySkillKey(Vec<i64>),
    DamageBySkillKeySelfTarget(Vec<i64>),
    AnyDamage,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "camelCase")]
pub enum CounterAction {
    Reset,
    Freeze,
    ResetAndFreeze,
    StartCount,
    #[default]
    NoOp,
}

#[derive(Debug, Clone)]
pub struct CounterState {
    pub rule_id: i32,
    pub linked_buff_id: i32,
    pub current_count: u32,
    pub threshold: Option<u32>,
    pub is_counting: bool,
    pub linked_buff_active: bool,
}

#[derive(Debug, Default)]
pub struct BuffCounterTracker {
    rules: Vec<CounterRule>,
    states: HashMap<i32, CounterState>,
}

impl BuffCounterTracker {
    pub fn set_rules(&mut self, rules: Vec<CounterRule>) {
        info!(
            target: "app::live",
            "[buff-counter] applying {} rules",
            rules.len()
        );
        for rule in &rules {
            info!(
                target: "app::live",
                "[buff-counter] rule_id={} linked_buff_id={} threshold={:?} trigger={:?} on_add={:?} on_remove={:?}",
                rule.rule_id,
                rule.linked_buff_id,
                rule.threshold,
                rule.trigger,
                rule.on_buff_add,
                rule.on_buff_remove
            );
        }
        let mut states = HashMap::with_capacity(rules.len());
        for rule in &rules {
            states.insert(
                rule.rule_id,
                CounterState {
                    rule_id: rule.rule_id,
                    linked_buff_id: rule.linked_buff_id,
                    current_count: 0,
                    threshold: rule.threshold,
                    is_counting: true,
                    linked_buff_active: false,
                },
            );
        }
        self.rules = rules;
        self.states = states;
    }

    pub fn on_damage_event(
        &mut self,
        skill_key: i64,
        target_uid: i64,
        local_player_uid: i64,
    ) -> bool {
        let mut changed = false;
        for rule in &self.rules {
            let is_match = match &rule.trigger {
                CounterTrigger::DamageBySkillKey(skill_keys) => skill_keys.contains(&skill_key),
                CounterTrigger::DamageBySkillKeySelfTarget(skill_keys) => {
                    skill_keys.contains(&skill_key) && target_uid == local_player_uid
                }
                CounterTrigger::AnyDamage => true,
            };
            if !is_match {
                continue;
            }
            let Some(state) = self.states.get_mut(&rule.rule_id) else {
                continue;
            };
            if state.is_counting {
                state.current_count = state.current_count.saturating_add(1);
                changed = true;
            }
        }
        changed
    }

    pub fn on_buff_changes(&mut self, changes: &[BuffChangeEvent]) -> bool {
        let mut changed = false;
        for change in changes {
            for rule in &self.rules {
                if rule.linked_buff_id != change.base_id {
                    continue;
                }
                let Some(state) = self.states.get_mut(&rule.rule_id) else {
                    continue;
                };
                match change.change_type {
                    BuffChangeType::Added => {
                        if !state.linked_buff_active {
                            state.linked_buff_active = true;
                            changed = true;
                        }
                        let action_changed = apply_action(state, rule.on_buff_add);
                        changed |= action_changed;
                    }
                    BuffChangeType::Removed => {
                        if state.linked_buff_active {
                            state.linked_buff_active = false;
                            changed = true;
                        }
                        let action_changed = apply_action(state, rule.on_buff_remove);
                        changed |= action_changed;
                    }
                    BuffChangeType::Changed => {}
                }
            }
        }
        changed
    }

    pub fn build_payload(&self) -> Vec<CounterUpdateState> {
        let mut rows: Vec<CounterUpdateState> = self
            .states
            .values()
            .map(|state| CounterUpdateState {
                rule_id: state.rule_id.clone(),
                linked_buff_id: state.linked_buff_id,
                current_count: state.current_count,
                threshold: state.threshold,
                is_counting: state.is_counting,
                linked_buff_active: state.linked_buff_active,
            })
            .collect();
        rows.sort_by(|a, b| a.rule_id.cmp(&b.rule_id));
        rows
    }

    pub fn reset_counts(&mut self) {
        for state in self.states.values_mut() {
            state.current_count = 0;
        }
    }
}

fn apply_action(state: &mut CounterState, action: CounterAction) -> bool {
    match action {
        CounterAction::Reset => {
            if state.current_count == 0 {
                false
            } else {
                state.current_count = 0;
                true
            }
        }
        CounterAction::Freeze => {
            if state.is_counting {
                state.is_counting = false;
                true
            } else {
                false
            }
        }
        CounterAction::ResetAndFreeze => {
            let mut changed = false;
            if state.current_count != 0 {
                state.current_count = 0;
                changed = true;
            }
            if state.is_counting {
                state.is_counting = false;
                changed = true;
            }
            changed
        }
        CounterAction::StartCount => {
            if state.is_counting {
                false
            } else {
                state.is_counting = true;
                true
            }
        }
        CounterAction::NoOp => false,
    }
}
