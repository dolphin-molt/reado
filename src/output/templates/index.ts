import type { TemplateFn } from './types.js'
import { renderDefault } from './default.js'
import { renderDashboard } from './dashboard.js'
import { renderMinimal } from './minimal.js'

const templates = new Map<string, TemplateFn>([
  ['default', renderDefault],
  ['dashboard', renderDashboard],
  ['minimal', renderMinimal],
])

export function getTemplate(name: string): TemplateFn | undefined {
  return templates.get(name)
}

export function getTemplateNames(): string[] {
  return [...templates.keys()]
}

export { type TemplateData, type TemplateFn } from './types.js'
