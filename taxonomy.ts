import fs from "fs";
import path from "path";

interface TaxonomyValue {
  id: string;
  name: string;
}

interface Taxonomy {
  id: string;
  name: string;
  values: TaxonomyValue[];
}

let cachedTaxonomies: Taxonomy[] | null = null;

export function getTaxonomies(): Taxonomy[] {
  if (cachedTaxonomies) return cachedTaxonomies;

  const tsvPath = path.join(__dirname, "..", "assets", "iab_content_taxonomy.tsv");
  const content = fs.readFileSync(tsvPath, "utf-8");
  const lines = content.trim().split("\n");

  // Skip header row, parse each line as "id\tname"
  const values: TaxonomyValue[] = lines.slice(1).map((line) => {
    const [id, name] = line.split("\t");
    return { id, name };
  });

  cachedTaxonomies = [
    {
      id: "iab_3_1",
      name: "IAB 3.1 Content Taxonomy",
      values,
    },
  ];

  return cachedTaxonomies;
}
