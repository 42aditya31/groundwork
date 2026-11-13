/** Clears all learner data from a TEST database (keeps syllabus content and accounts). Refuses to touch the main DB. */
import Database from "better-sqlite3";
import path from "node:path";

const file = path.resolve(process.argv[2] ?? "data/test.db");
if (!/test/i.test(path.basename(file))) {
  console.error(`Refusing to reset ${file}: the file name must contain "test".`);
  process.exit(1);
}
const db = new Database(file);
db.exec(`
  DELETE FROM login_attempts; DELETE FROM sessions; DELETE FROM topic_progress; DELETE FROM subtopic_progress;
  DELETE FROM learning_sessions; DELETE FROM mastery_assessments; DELETE FROM proofs; DELETE FROM projects;
  DELETE FROM schedule_items; DELETE FROM resource_states; DELETE FROM activities;
  UPDATE users SET hours_weekday = NULL, hours_weekend = NULL, onboarded_at = NULL, last_plan_date = NULL, plan_note = NULL, theme = 'system';
`);
console.log(`Reset learner data in ${file}`);
