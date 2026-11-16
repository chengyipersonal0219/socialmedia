import { DEFAULT_RULE_SET, exportRuleSet, importRuleSet, parseRuleSet, type FilterRule, type RuleSet, type RuleField } from '../../../packages/rule-schema/src/index';

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
let current: RuleSet = DEFAULT_RULE_SET;
let editing: string | null = null;
const status = (message: string): void => { el<HTMLElement>('status').textContent = message; };

async function save(next: RuleSet): Promise<void> {
  const valid = parseRuleSet(next);
  await chrome.storage.local.set({ ruleSet: valid });
  current = valid;
  render();
  status('規則已儲存。');
}

function render(): void {
  el<HTMLInputElement>('global').checked = current.settings.enabled;
  el<HTMLInputElement>('instagram').checked = current.settings.sites.instagram;
  el<HTMLInputElement>('facebook').checked = current.settings.sites.facebook;
  const body = el<HTMLTableSectionElement>('rules');
  body.replaceChildren();
  for (const rule of current.rules) {
    const row = body.insertRow();
    const enabled = document.createElement('input');
    enabled.type = 'checkbox'; enabled.checked = rule.enabled;
    enabled.addEventListener('change', () => {
      void save({ ...current, rules: current.rules.map((item) => item.id === rule.id ? { ...item, enabled: enabled.checked } : item) }).catch(showError);
    });
    row.insertCell().append(enabled);
    row.insertCell().textContent = rule.id;
    row.insertCell().textContent = rule.sites.join(', ');
    row.insertCell().textContent = `${rule.match.field} ${rule.match.operator} ${String(rule.match.value)}`;
    row.insertCell().textContent = rule.action;
    const edit = document.createElement('button'); edit.textContent = '編輯';
    edit.addEventListener('click', () => fill(rule));
    const remove = document.createElement('button'); remove.textContent = '刪除';
    remove.addEventListener('click', () => { void save({ ...current, rules: current.rules.filter((item) => item.id !== rule.id) }).catch(showError); });
    row.insertCell().append(edit, remove);
  }
}

function fill(rule: FilterRule): void {
  editing = rule.id;
  el<HTMLElement>('editor-title').textContent = `編輯 ${rule.id}`;
  el<HTMLInputElement>('id').value = rule.id;
  el<HTMLInputElement>('rule-enabled').checked = rule.enabled;
  el<HTMLInputElement>('rule-instagram').checked = rule.sites.includes('instagram');
  el<HTMLInputElement>('rule-facebook').checked = rule.sites.includes('facebook');
  el<HTMLSelectElement>('field').value = rule.match.field;
  el<HTMLSelectElement>('operator').value = rule.match.operator;
  el<HTMLInputElement>('value').value = String(rule.match.value);
  el<HTMLSelectElement>('action').value = rule.action;
}

function clear(): void {
  editing = null;
  el<HTMLFormElement>('editor').reset();
  el<HTMLElement>('editor-title').textContent = '新增規則';
}

function showError(error: unknown): void { status(`失敗：${error instanceof Error ? error.message : String(error)}`); }

el<HTMLButtonElement>('save-settings').addEventListener('click', () => {
  void save({ ...current, settings: { enabled: el<HTMLInputElement>('global').checked,
    sites: { instagram: el<HTMLInputElement>('instagram').checked, facebook: el<HTMLInputElement>('facebook').checked } } }).catch(showError);
});
el<HTMLButtonElement>('clear').addEventListener('click', clear);
el<HTMLSelectElement>('field').addEventListener('change', () => {
  const booleanField = ['isRecommended', 'isSponsored'].includes(el<HTMLSelectElement>('field').value);
  if (booleanField) { el<HTMLSelectElement>('operator').value = 'equals'; el<HTMLInputElement>('value').value = 'true'; }
});
el<HTMLFormElement>('editor').addEventListener('submit', (event) => {
  event.preventDefault();
  const field = el<HTMLSelectElement>('field').value as RuleField;
  const booleanField = field === 'isRecommended' || field === 'isSponsored';
  if (booleanField && !['true', 'false'].includes(el<HTMLInputElement>('value').value)) {
    status('布林條件的值必須是 true 或 false。');
    return;
  }
  const sites: FilterRule['sites'] = [];
  if (el<HTMLInputElement>('rule-instagram').checked) sites.push('instagram');
  if (el<HTMLInputElement>('rule-facebook').checked) sites.push('facebook');
  const rule: FilterRule = { id: el<HTMLInputElement>('id').value.trim(), enabled: el<HTMLInputElement>('rule-enabled').checked,
    sites, match: { field, operator: el<HTMLSelectElement>('operator').value as 'contains' | 'equals',
      value: booleanField ? el<HTMLInputElement>('value').value === 'true' : el<HTMLInputElement>('value').value },
    action: el<HTMLSelectElement>('action').value as FilterRule['action'] };
  const rules = editing ? current.rules.map((item) => item.id === editing ? rule : item) : [...current.rules, rule];
  void save({ ...current, rules }).then(clear).catch(showError);
});
el<HTMLButtonElement>('export').addEventListener('click', () => {
  const blob = new Blob([exportRuleSet(current)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'socialfilter-rules.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
el<HTMLInputElement>('import').addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  void file.text().then((raw) => {
    const result = importRuleSet(raw, current);
    if (!result.ok) throw new Error(result.error);
    if (!confirm(`以 ${result.value.rules.length} 條規則取代目前 ${current.rules.length} 條規則？`)) return;
    return save(result.value);
  }).catch(showError).finally(() => { el<HTMLInputElement>('import').value = ''; });
});

void chrome.storage.local.get('ruleSet').then((stored) => {
  current = stored.ruleSet === undefined ? DEFAULT_RULE_SET : parseRuleSet(stored.ruleSet);
  render();
}).catch(showError);
