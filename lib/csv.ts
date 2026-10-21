/** Local CSV parser: quoted commas, escaped quotes, CRLF, multiline fields and BOM. */
export function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    value = '',
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
        closed = true;
      } else value += character;
    } else if (character === ',' || character === '\n' || character === '\r') {
      row.push(value);
      value = '';
      closed = false;
      if (character !== ',') {
        if (character === '\r' && text[index + 1] === '\n') index++;
        rows.push(row);
        row = [];
      }
    } else if (character === '"' && value === '' && !closed) quoted = true;
    else {
      if (closed && character.trim()) throw new Error('Unexpected text after a quoted CSV field.');
      value += character;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}
export function parseInventoryCsv(text: string, headerRow = 1) {
  const rows = parseCsvRows(text);
  const headers = rows[headerRow - 1]?.map((header) => header.trim());
  const dataRows = rows.slice(headerRow).filter((row) => row.some((cell) => cell.trim()));
  if (
    !headers?.length ||
    new Set(headers).size !== headers.length ||
    headers.some((header) => !header)
  )
    throw new Error('CSV requires nonempty, unique column headers.');
  if (dataRows.length > 10000) throw new Error('CSV exceeds 10,000 records.');
  return { headers, rows: dataRows };
}
