export type CsvParseResult =
  | Readonly<{ ok: true; rows: readonly (readonly string[])[] }>
  | Readonly<{ ok: false; error: string }>;

export function parseCsv(source: string): CsvParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const finishField = () => {
    row.push(field);
    field = "";
  };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value.trim() !== "")) rows.push(row);
    row = [];
  };

  const input = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length) return { ok: false, error: `Unexpected quote near character ${index + 1}.` };
      quoted = true;
    } else if (character === ",") {
      finishField();
    } else if (character === String.fromCharCode(10)) {
      finishRow();
    } else if (character === String.fromCharCode(13)) {
      if (input[index + 1] === String.fromCharCode(10)) index += 1;
      finishRow();
    } else {
      field += character;
    }
  }

  if (quoted) return { ok: false, error: "A quoted CSV field was not closed." };
  if (field.length || row.length) finishRow();
  return { ok: true, rows };
}
