export function name(app: string, domain: 'frontend'|'backend', stage: string, logical: string) {
  return `${app}-${domain}-${stage}-${logical}`;
}
