/**
 * Determines whether the Analyze button should be clickable.
 *
 * A ride CSV upload can be syntactically accepted before/without producing
 * parsed ride rows (for example when the user uploaded a report in a different
 * format). In that case the user should still be able to click Analyze and get
 * the existing validation/error message from runAnalysis instead of being stuck
 * with a disabled button.
 */
export function canRunAnalysis({ isAnalyzing, files, parsedData, manuallyAddedRides }) {
  if (isAnalyzing) return false;

  const hasUploadedRideFile = Boolean(files?.ride);
  const hasParsedRides = Array.isArray(parsedData?.rides) && parsedData.rides.length > 0;
  const hasManualRides = manuallyAddedRides instanceof Map && manuallyAddedRides.size > 0;

  return hasUploadedRideFile || hasParsedRides || hasManualRides;
}
