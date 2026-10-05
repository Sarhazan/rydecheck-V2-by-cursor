/**
 * Utilities for detecting and exporting exceptional employees/rides.
 * "חריג" is an employee-level marker inside the Ride passengers field, not only a ride-level flag.
 */

export function splitPassengerParts(passengersStr) {
  if (!passengersStr || passengersStr === '-') return [];

  return String(passengersStr)
    .split(/[;\n]/)
    .map(part => part.trim())
    .filter(Boolean);
}

function cleanExceptionalName(passengerPart) {
  return String(passengerPart || '')
    .replace(/\*+/g, ' ')
    .replace(/חריג/g, ' ')
    .replace(/\s+\d+.*$/, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitFullName(fullName) {
  const words = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { firstName: '', lastName: '' };
  }

  if (words.length === 1) {
    return { firstName: words[0], lastName: '' };
  }

  return {
    firstName: words[0],
    lastName: words.slice(1).join(' ')
  };
}

export function getPassengerPartForPid(ride, pid) {
  const parts = splitPassengerParts(ride?.passengers || '');
  if (parts.length === 0) return '';

  const pids = Array.isArray(ride?.pids) ? ride.pids : [];
  const pidIndex = pids.findIndex(currentPid => String(currentPid) === String(pid));

  if (pidIndex >= 0 && pidIndex < parts.length) {
    return parts[pidIndex];
  }

  const pidText = String(pid);
  return parts.find(part => String(part).includes(pidText)) || '';
}

export function createManualEmployeeFromRideAssignment(ride, employeeId, department) {
  const passengerPart = getPassengerPartForPid(ride, employeeId);
  const cleanName = cleanExceptionalName(passengerPart);
  const { firstName, lastName } = splitFullName(cleanName || `PID ${employeeId}`);
  const isExceptional = String(passengerPart).includes('חריג');

  return {
    employeeId,
    firstName,
    lastName,
    department,
    ...(isExceptional ? {
      isExceptional: true,
      exceptionalLabel: passengerPart.trim()
    } : {})
  };
}

function employeeDisplayName(employee, fallbackLabel = '') {
  const name = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();
  if (name) return name;
  return cleanExceptionalName(fallbackLabel);
}

function buildExceptionalPassengersForRide(ride, employeeMap = new Map()) {
  const parts = splitPassengerParts(ride?.passengers || '');
  const pids = Array.isArray(ride?.pids) ? ride.pids : [];
  const exceptionalByKey = new Map();

  parts.forEach((part, index) => {
    if (!part.includes('חריג')) return;

    const employeeId = index < pids.length ? pids[index] : null;
    const employee = employeeId !== null && employeeId !== undefined
      ? employeeMap.get(employeeId) || employeeMap.get(String(employeeId))
      : null;
    const name = employeeDisplayName(employee, part) || cleanExceptionalName(part);
    const key = employeeId !== null && employeeId !== undefined ? String(employeeId) : `${index}-${part}`;

    exceptionalByKey.set(key, {
      employeeId,
      name,
      label: employee?.exceptionalLabel || part,
      department: employee?.department || ''
    });
  });

  pids.forEach(pid => {
    const employee = employeeMap.get(pid) || employeeMap.get(String(pid));
    if (!employee?.isExceptional) return;

    const key = String(pid);
    if (exceptionalByKey.has(key)) {
      const existing = exceptionalByKey.get(key);
      exceptionalByKey.set(key, {
        ...existing,
        department: employee.department || existing.department || '',
        label: employee.exceptionalLabel || existing.label
      });
      return;
    }

    const label = employee.exceptionalLabel || getPassengerPartForPid(ride, pid) || employeeDisplayName(employee);
    exceptionalByKey.set(key, {
      employeeId: pid,
      name: employeeDisplayName(employee, label),
      label,
      department: employee.department || ''
    });
  });

  return Array.from(exceptionalByKey.values());
}

export function buildExceptionalRides(rides, employeeMap = new Map(), tripsRemovedFromReview = new Set()) {
  return (rides || [])
    .filter(ride => {
      const rideId = ride?.rideId;
      return !rideId || !tripsRemovedFromReview?.has?.(rideId);
    })
    .map(ride => ({
      ...ride,
      exceptionalPassengers: buildExceptionalPassengersForRide(ride, employeeMap)
    }))
    .filter(ride => ride.exceptionalPassengers.length > 0);
}

export function countExceptionalPassengers(exceptionalRides) {
  return (exceptionalRides || []).reduce((total, ride) => {
    if (Array.isArray(ride?.exceptionalPassengers) && ride.exceptionalPassengers.length > 0) {
      return total + ride.exceptionalPassengers.length;
    }

    return total + splitPassengerParts(ride?.passengers || '').filter(part => part.includes('חריג')).length;
  }, 0);
}

export function getExceptionalPassengerLabels(ride) {
  if (Array.isArray(ride?.exceptionalPassengers) && ride.exceptionalPassengers.length > 0) {
    return ride.exceptionalPassengers.map(passenger => passenger.label || passenger.name).filter(Boolean).join('; ');
  }

  return splitPassengerParts(ride?.passengers || '')
    .filter(part => part.includes('חריג'))
    .join('; ');
}
