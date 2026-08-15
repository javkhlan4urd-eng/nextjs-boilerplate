export function formatChildName(firstName: string, lastName?: string | null): string {
  if (!lastName) return firstName;
  return `${lastName[0]}.${firstName}`;
}
