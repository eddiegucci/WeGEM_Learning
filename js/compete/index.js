async function loadModulesForCurriculum(curriculumKey) {
  const { COMPETE_PATHS } = await import("./_compete.js");

  const prefix = curriculumKey === "cbe" ? "./cbe/" : "./844/";
  const paths = COMPETE_PATHS.filter((p) => p.startsWith(prefix));

  const modules = await Promise.all(
    paths.map(async (p) => {
      const url = toAbsoluteUrl(p);
      try {
        return await import(url);
      } catch (err) {
        return null;
      }
    }),
  );

  // Deduplicate: keep only the LATEST bank per (subject, class).
  // Sort by updatedAt descending, keep first per key.
  const all = modules
    .filter((m) => m && m.default)
    .map((m) => m.default)
    .filter((b) => b && Array.isArray(b.questions) && b.questions.length > 0);

  const seen = new Map();
  for (const bank of all) {
    const key = `${bank.subject}|${bank.class}|${bank.curriculum}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, bank);
    } else {
      const existingDate = existing.updatedAt || "";
      const newDate = bank.updatedAt || "";
      if (newDate > existingDate) seen.set(key, bank);
    }
  }

  return Array.from(seen.values());
}
