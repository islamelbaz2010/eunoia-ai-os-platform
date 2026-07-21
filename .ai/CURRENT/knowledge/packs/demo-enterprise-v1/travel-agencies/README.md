# Travel Agencies Knowledge Pack

**Pack**: Demo Enterprise Pack v1 (`demo-enterprise-v1`)
**Industry ID**: `travel-agencies`
**Industry Code**: `TRV`
**NAICS Code**: `561510`
**Domains**: `trip-planning`, `booking-management`, `customer-service`, `destinations`

## Description

Travel planning and agency operations knowledge framework

## Departments

| Department | Schema Type | Document Types |
|------------|-------------|----------------|
| [`company`](./company/README.md) | `department` | profile, org-chart, mission-statement |
| [`operations`](./operations/README.md) | `playbook` | sop, workflow, procedure |
| [`sales`](./sales/README.md) | `offer` | pipeline, offer, script |
| [`marketing`](./marketing/README.md) | `campaign` | campaign, persona, brand-guide |
| [`support`](./support/README.md) | `playbook` | escalation, resolution-flow, script |
| [`faq`](./faq/README.md) | `faq` | faq-item, faq-category, faq-collection |
| [`templates`](./templates/README.md) | `template` | email, sms, letter |
| [`prompts`](./prompts/README.md) | `prompt` | system-prompt, user-prompt, chain |
| [`policies`](./policies/README.md) | `policy` | policy, procedure, compliance-rule |
| [`playbooks`](./playbooks/README.md) | `playbook` | runbook, decision-tree, scenario |
| [`training`](./training/README.md) | `document` | module, quiz, onboarding-plan |
| [`automation`](./automation/README.md) | `automation` | trigger, action, workflow-spec |
| [`analytics`](./analytics/README.md) | `kpi` | kpi, dashboard-spec, report-template |

## Structure

```
travel-agencies/
├── company/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── operations/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── sales/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── marketing/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── support/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── faq/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── templates/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── prompts/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── policies/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── playbooks/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── training/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── automation/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
├── analytics/
│   ├── README.md
│   ├── schema.json
│   ├── metadata.json
│   ├── manifest.json
│   ├── example.json
│   └── validation.json
```

## Usage

1. Select the target department folder
2. Review `schema.json` to understand the expected document structure
3. Use `example.json` as the generation template for Gemini
4. Validate output against `validation.json` rules
5. Update `manifest.json` with generated document paths and checksums

## Naming Convention

See `knowledge/docs/NAMING_CONVENTION.md` for file naming rules.

## Content Population

This industry pack is a **framework shell**. All content must be populated by Gemini or authorized content teams.
Do not add business content, fake data, or placeholder text directly to this repository.

