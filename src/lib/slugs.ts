export function caratSlug(value: number): string {
  return value.toString().replace('.', '-');
}
