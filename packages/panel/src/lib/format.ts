export function formatDateTime(date: string | number | Date): string {
	return new Date(date).toLocaleString("de-DE");
}
