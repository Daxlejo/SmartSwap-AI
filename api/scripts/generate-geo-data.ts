/**
 * Builds src/modules/geo/data/colombia-municipalities.ts from the official DANE DIVIPOLA open
 * dataset (datos.gov.co, resource gdxc-w37w: 1,122 municipalities with centroid coordinates).
 *
 *   npm run geo:generate
 *
 * The generated file is committed so the API never depends on that portal at runtime.
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_URL = 'https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=2000';
const OUTPUT_PATH = resolve(__dirname, '../src/modules/geo/data/colombia-municipalities.ts');

interface DivipolaRow {
  cod_dpto: string;
  dpto: string;
  cod_mpio: string;
  nom_mpio: string;
  latitud: string;
  longitud: string;
}

const LOWERCASE_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en']);

/** Dataset names are UPPERCASE: "SAN JOSÉ DE LA MONTAÑA" -> "San José de la Montaña". */
const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (word.includes('.')) return word.toUpperCase();
      if (index > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

const DEPARTMENT_NAME_OVERRIDES: Record<string, string> = {
  '88': 'San Andrés y Providencia',
};

/** The dataset writes decimals with a comma ("-75,581775"). */
const parseCoordinate = (value: string): number => Number(value.replace(',', '.'));

const quote = (value: string): string => `'${value.replace(/'/g, "\\'")}'`;

const main = async (): Promise<void> => {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`DIVIPOLA request failed: HTTP ${response.status}`);
  }
  const rows = (await response.json()) as DivipolaRow[];
  if (rows.length < 1000) {
    throw new Error(`Unexpected DIVIPOLA size: ${rows.length} rows`);
  }

  const departments = new Map<string, string>();
  for (const row of rows) {
    departments.set(
      row.cod_dpto,
      DEPARTMENT_NAME_OVERRIDES[row.cod_dpto] ?? toTitleCase(row.dpto),
    );
  }

  const municipalities = rows
    .map((row) => ({
      code: row.cod_mpio,
      name: toTitleCase(row.nom_mpio),
      lat: parseCoordinate(row.latitud),
      lon: parseCoordinate(row.longitud),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const invalid = municipalities.filter((m) => !Number.isFinite(m.lat) || !Number.isFinite(m.lon));
  if (invalid.length > 0) {
    throw new Error(`Municipalities without valid coordinates: ${invalid.map((m) => m.code).join(', ')}`);
  }

  const departmentLines = [...departments.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, name]) => `  [${quote(code)}, ${quote(name)}],`);
  const municipalityLines = municipalities.map(
    (m) => `  [${quote(m.code)}, ${quote(m.name)}, ${m.lat}, ${m.lon}],`,
  );

  const content = [
    '// GENERATED FILE - do not edit by hand. Regenerate with `npm run geo:generate`.',
    '// Source: DANE DIVIPOLA via datos.gov.co (resource gdxc-w37w), open data.',
    '// Coordinates are the municipal centroid (cabecera), used only to estimate distances.',
    '',
    'export const RAW_DEPARTMENTS: ReadonlyArray<readonly [code: string, name: string]> = [',
    ...departmentLines,
    '];',
    '',
    'export const RAW_MUNICIPALITIES: ReadonlyArray<',
    '  readonly [code: string, name: string, latitude: number, longitude: number]',
    '> = [',
    ...municipalityLines,
    '];',
    '',
  ].join('\n');

  writeFileSync(OUTPUT_PATH, content, 'utf8');
  console.log(
    `Wrote ${municipalities.length} municipalities in ${departments.size} departments to ${OUTPUT_PATH}`,
  );
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
