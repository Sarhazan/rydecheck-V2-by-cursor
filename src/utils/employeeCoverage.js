export function calculateEmployeeCoverage(rides, employeeMap) {
  const employeeLookup = employeeMap instanceof Map ? employeeMap : new Map();
  let totalPassengerRefs = 0;
  let matchedPassengerRefs = 0;
  const uniquePassengerIds = new Set();
  const matchedPassengerIds = new Set();

  (Array.isArray(rides) ? rides : []).forEach(ride => {
    (Array.isArray(ride?.pids) ? ride.pids : []).forEach(pid => {
      if (pid === null || pid === undefined || pid === '') return;
      totalPassengerRefs += 1;
      uniquePassengerIds.add(pid);
      if (employeeLookup.has(pid)) {
        matchedPassengerRefs += 1;
        matchedPassengerIds.add(pid);
      }
    });
  });

  return {
    totalPassengerRefs,
    matchedPassengerRefs,
    unmatchedPassengerRefs: totalPassengerRefs - matchedPassengerRefs,
    uniquePassengerIds: uniquePassengerIds.size,
    matchedPassengerIds: matchedPassengerIds.size,
    matchRate: totalPassengerRefs === 0 ? 1 : matchedPassengerRefs / totalPassengerRefs
  };
}

export function validateEmployeeCoverage(rides, employeeMap, options = {}) {
  const minMatchRate = options.minMatchRate ?? 0.5;
  const minPassengerRefs = options.minPassengerRefs ?? 20;
  const coverage = calculateEmployeeCoverage(rides, employeeMap);

  if (coverage.totalPassengerRefs >= minPassengerRefs && coverage.matchRate < minMatchRate) {
    const percent = (coverage.matchRate * 100).toFixed(1);
    throw new Error(
      `קובץ מסד העובדים לא נראה תואם לקובץ הרייד: נמצאו רק ${coverage.matchedPassengerRefs} מתוך ${coverage.totalPassengerRefs} שיוכי נוסעים (${percent}%). ודא שהעלית את מסד העובדים של אותו חודש/דוח, למשל "מסד עובדים 0626.csv".`
    );
  }

  return coverage;
}
