export function countLoadedRideTrips(rides = []) {
  if (!Array.isArray(rides) || rides.length === 0) {
    return 0;
  }

  const hasRideSummaryRows = rides.some(ride => ride?.isRideSummary);
  if (!hasRideSummaryRows) {
    return rides.length;
  }

  return rides.reduce((total, ride) => {
    const tripCount = Number.parseInt(String(ride?.tripCount ?? ''), 10);
    return total + (Number.isNaN(tripCount) ? 0 : tripCount);
  }, 0);
}
