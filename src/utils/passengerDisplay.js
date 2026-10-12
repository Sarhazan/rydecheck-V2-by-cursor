function formatEmployeeName(employee) {
  return `${employee?.firstName || ''} ${employee?.lastName || ''}`.replace(/\s+/g, ' ').trim();
}

function formatRawPassengerIds(passengersStr, employeeMap, fallback) {
  const idParts = String(passengersStr).split(/[,|\s]+/).map(p => p.trim()).filter(Boolean);
  const names = [];
  let foundNumericEmployee = false;

  idParts.forEach(part => {
    if (/^\d+$/.test(part) && employeeMap) {
      const employeeId = parseInt(part, 10);
      const employee = employeeMap.get(employeeId) || employeeMap.get(String(employeeId));
      if (employee) {
        names.push(formatEmployeeName(employee));
        foundNumericEmployee = true;
        return;
      }
    }
    names.push(part);
  });

  return foundNumericEmployee ? names.join(', ') : fallback;
}

export function formatPassengerDisplay(passengersStr, employeeMap) {
  if (!passengersStr) return '-';

  const original = String(passengersStr).trim();
  if (!original) return '-';

  const passengerParts = original
    .split(/[;\n]+/)
    .map(part => part.trim())
    .filter(Boolean);

  if (passengerParts.length === 1 && /^\d+(?:\s*,\s*\d+)+$/.test(passengerParts[0])) {
    return formatRawPassengerIds(passengerParts[0], employeeMap, original);
  }

  const partsToFormat = passengerParts.length > 0 ? passengerParts : [original];
  let foundAnyEmployee = false;

  const formattedParts = partsToFormat.map(part => {
    const trailingIdMatch = part.match(/(?:^|\s)(\d{3,7})\s*$/);
    if (trailingIdMatch && employeeMap) {
      const employeeId = parseInt(trailingIdMatch[1], 10);
      const employee = employeeMap.get(employeeId) || employeeMap.get(String(employeeId));
      if (employee) {
        foundAnyEmployee = true;
        return formatEmployeeName(employee);
      }
    }

    return part
      .replace(/\s+\d{3,7}\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }).filter(Boolean);

  if (foundAnyEmployee || passengerParts.length > 0) {
    return formattedParts.join(', ');
  }

  const idParts = original.split(/[,|\s]+/).map(p => p.trim()).filter(Boolean);
  const names = [];
  let foundNumericEmployee = false;

  idParts.forEach(part => {
    if (/^\d+$/.test(part) && employeeMap) {
      const employeeId = parseInt(part, 10);
      const employee = employeeMap.get(employeeId) || employeeMap.get(String(employeeId));
      if (employee) {
        names.push(`${employee.firstName || ''} ${employee.lastName || ''}`.replace(/\s+/g, ' ').trim());
        foundNumericEmployee = true;
        return;
      }
    }
    names.push(part);
  });

  return foundNumericEmployee ? names.join(', ') : original;
}
