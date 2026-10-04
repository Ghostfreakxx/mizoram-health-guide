// npm run review:export — writes the clinical/data review list for reviewers.
import { writeFileSync } from "node:fs";
import { reviewCsv, reviewMarkdown } from "../app/lib/review/export";

writeFileSync("docs/CLINICAL_REVIEW.md", reviewMarkdown());
writeFileSync("docs/review/review-items.csv", reviewCsv());
console.log("Wrote docs/CLINICAL_REVIEW.md and docs/review/review-items.csv");
