export function exportToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows || !rows.length) {
    alert('Tidak ada data untuk diekspor ke CSV.');
    return;
  }

  const keys = Object.keys(rows[0]);
  const csvContent = [
    keys.join(','),
    ...rows.map(row =>
      keys
        .map(k => {
          let cell = row[k];
          if (cell === null || cell === undefined) cell = '';
          if (typeof cell === 'object') cell = JSON.stringify(cell);
          const escaped = String(cell).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJsonBackup(data: unknown, filename = 'santricity_backup_data'): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function saveToLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`santricity_${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
}

export function loadFromLocal<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(`santricity_${key}`);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch (err) {
    console.warn('LocalStorage parse error, using default:', err);
    return defaultValue;
  }
}
