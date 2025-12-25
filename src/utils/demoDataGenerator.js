/**
 * יצירת נתוני דמו אקראיים לאפליקציה
 */

const israeliCities = [
  'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'נתניה', 'אשדוד', 'ראשון לציון',
  'פתח תקווה', 'אשקלון', 'רמת גן', 'חולון', 'בני ברק', 'רמת השרון', 'הרצליה',
  'רעננה', 'כפר סבא', 'הוד השרון', 'רמת השרון', 'גבעתיים', 'קריית אונו'
];

const israeliNames = [
  { firstName: 'דני', lastName: 'כהן' },
  { firstName: 'שרה', lastName: 'לוי' },
  { firstName: 'מיכאל', lastName: 'דוד' },
  { firstName: 'רות', lastName: 'מזרחי' },
  { firstName: 'יוסי', lastName: 'אברהם' },
  { firstName: 'רחל', lastName: 'פרידמן' },
  { firstName: 'דוד', lastName: 'שלום' },
  { firstName: 'מרים', lastName: 'בן דוד' },
  { firstName: 'יואב', lastName: 'כץ' },
  { firstName: 'ענת', lastName: 'לוי' },
  { firstName: 'אור', lastName: 'כהן' },
  { firstName: 'מיה', lastName: 'דוד' },
  { firstName: 'עמית', lastName: 'שלום' },
  { firstName: 'טל', lastName: 'אברהם' },
  { firstName: 'נועה', lastName: 'יגר' },
  { firstName: 'נגה', lastName: 'יגר' },
  { firstName: 'רונן', lastName: 'מזרחי' },
  { firstName: 'יעל', lastName: 'פרידמן' },
  { firstName: 'אלון', lastName: 'כץ' },
  { firstName: 'גיל', lastName: 'בן דוד' }
];

const departments = ['פיתוח', 'מכירות', 'שיווק', 'משאבי אנוש', 'כספים', 'תפעול', 'מערכות מידע', 'לוגיסטיקה'];

const suppliers = ['בון תור', 'חורי', 'gett', 'מוניות דוד חורי', 'בוןתור'];

/**
 * פונקציה עזר ליצירת תאריך אקראי
 */
function randomDate(startDate = new Date(2024, 0, 1), endDate = new Date()) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime);
}

/**
 * פונקציה עזר לפורמט תאריך
 */
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * פונקציה עזר לפורמט שעה
 */
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * יצירת עובדים אקראיים
 */
export function generateDemoEmployees(count = 30) {
  const employees = [];
  const employeeMap = new Map();
  
  for (let i = 1; i <= count; i++) {
    const name = israeliNames[Math.floor(Math.random() * israeliNames.length)];
    const employee = {
      employeeId: i,
      firstName: name.firstName,
      lastName: name.lastName,
      department: departments[Math.floor(Math.random() * departments.length)]
    };
    
    employees.push(employee);
    employeeMap.set(i, employee);
  }
  
  return { employees, employeeMap };
}

/**
 * יצירת נסיעות רייד אקראיות
 */
export function generateDemoRides(count = 50, employeeMap) {
  const rides = [];
  const rideIds = new Set();
  
  for (let i = 0; i < count; i++) {
    const date = randomDate();
    const rideId = 300000 + i;
    rideIds.add(rideId);
    
    const source = israeliCities[Math.floor(Math.random() * israeliCities.length)];
    let destination = israeliCities[Math.floor(Math.random() * israeliCities.length)];
    while (destination === source) {
      destination = israeliCities[Math.floor(Math.random() * israeliCities.length)];
    }
    
    // בחירת מספר נוסעים (1-3)
    const passengerCount = Math.floor(Math.random() * 3) + 1;
    const pids = [];
    const passengerNames = [];
    
    for (let j = 0; j < passengerCount; j++) {
      const randomPid = Math.floor(Math.random() * (employeeMap.size || 30)) + 1;
      if (!pids.includes(randomPid)) {
        pids.push(randomPid);
        const employee = employeeMap.get(randomPid);
        if (employee) {
          passengerNames.push(`${employee.firstName} ${employee.lastName}`);
        }
      }
    }
    
    const price = Math.round((50 + Math.random() * 450) * 100) / 100; // מחיר בין 50 ל-500
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    
    const ride = {
      rideId: rideId,
      date: `${formatDate(date)} ${formatTime(date)}`,
      passengers: passengerNames.join(', '),
      pids: pids,
      source: source,
      destination: destination,
      price: price,
      supplier: supplier
    };
    
    rides.push(ride);
  }
  
  // מיון לפי תאריך
  rides.sort((a, b) => {
    const dateA = new Date(a.date.split(' ')[0].split('/').reverse().join('-'));
    const dateB = new Date(b.date.split(' ')[0].split('/').reverse().join('-'));
    return dateA - dateB;
  });
  
  return rides;
}

/**
 * יצירת נתוני בון תור אקראיים
 */
export function generateDemoBontour(rides, employeeMap, matchRate = 0.7) {
  const bontourData = [];
  const matchedRideIds = new Set();
  
  // 70% מהנסיעות יתאימו לרייד
  const matchedCount = Math.floor(rides.length * matchRate);
  const matchedRides = rides.slice(0, matchedCount);
  
  matchedRides.forEach((ride, index) => {
    if (ride.supplier === 'בון תור' || ride.supplier === 'בוןתור') {
      matchedRideIds.add(ride.rideId);
      
      const priceVariation = (Math.random() - 0.5) * 20; // וריאציה של עד 20 שקל
      const price = Math.max(0, Math.round((ride.price + priceVariation) * 100) / 100);
      
      bontourData.push({
        orderNumber: ride.rideId,
        date: ride.date.split(' ')[0],
        source: ride.source,
        destination: ride.destination,
        passengers: ride.passengers,
        price: price
      });
    }
  });
  
  // הוספת נסיעות שלא תואמות (10% נוספים)
  const extraCount = Math.floor(rides.length * 0.1);
  for (let i = 0; i < extraCount; i++) {
    const date = randomDate();
    const source = israeliCities[Math.floor(Math.random() * israeliCities.length)];
    let destination = israeliCities[Math.floor(Math.random() * israeliCities.length)];
    while (destination === source) {
      destination = israeliCities[Math.floor(Math.random() * israeliCities.length)];
    }
    
    const passengerCount = Math.floor(Math.random() * 3) + 1;
    const passengerNames = [];
    for (let j = 0; j < passengerCount; j++) {
      const randomPid = Math.floor(Math.random() * (employeeMap.size || 30)) + 1;
      const employee = employeeMap.get(randomPid);
      if (employee) {
        passengerNames.push(`${employee.firstName} ${employee.lastName}`);
      }
    }
    
    bontourData.push({
      orderNumber: 500000 + i,
      date: formatDate(date),
      source: source,
      destination: destination,
      passengers: passengerNames.join(', '),
      price: Math.round((50 + Math.random() * 450) * 100) / 100
    });
  }
  
  return bontourData;
}

/**
 * יצירת נתוני חורי אקראיים
 */
export function generateDemoHori(rides, employeeMap, matchRate = 0.7) {
  const horiData = [];
  const matchedRideIds = new Set();
  
  const matchedCount = Math.floor(rides.length * matchRate);
  const matchedRides = rides.filter(r => r.supplier === 'חורי' || r.supplier === 'מוניות דוד חורי').slice(0, matchedCount);
  
  matchedRides.forEach((ride, index) => {
    matchedRideIds.add(ride.rideId);
    
    const dateStr = ride.date.split(' ')[0];
    const dateParts = dateStr.split('/');
    const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    const time = ride.date.includes(' ') ? ride.date.split(' ')[1] : formatTime(date);
    const priceVariation = (Math.random() - 0.5) * 20;
    const price = Math.max(0, Math.round((ride.price + priceVariation) * 100) / 100);
    
    horiData.push({
      tripNumber: ride.rideId,
      date: dateStr,
      price: price
    });
  });
  
  // הוספת נסיעות שלא תואמות
  const extraCount = Math.floor(rides.length * 0.1);
  for (let i = 0; i < extraCount; i++) {
    const date = randomDate();
    
    horiData.push({
      tripNumber: 600000 + i,
      date: formatDate(date),
      price: Math.round((50 + Math.random() * 450) * 100) / 100
    });
  }
  
  return horiData;
}

/**
 * יצירת נתוני גט אקראיים
 */
export function generateDemoGett(rides, employeeMap, matchRate = 0.7) {
  const gettData = [];
  const matchedRideIds = new Set();
  
  const matchedCount = Math.floor(rides.length * matchRate);
  const matchedRides = rides.filter(r => r.supplier.toLowerCase() === 'gett').slice(0, matchedCount);
  
  matchedRides.forEach((ride, index) => {
    matchedRideIds.add(ride.rideId);
    
    const dateTime = ride.date.split(' ');
    const date = dateTime[0];
    const time = dateTime[1] || formatTime(new Date());
    const priceVariation = (Math.random() - 0.5) * 20;
    const price = Math.max(0, Math.round((ride.price + priceVariation) * 100) / 100);
    
    gettData.push({
      orderNumber: ride.rideId.toString(),
      date: date,
      time: time,
      source: ride.source,
      destination: ride.destination,
      passengers: ride.passengers,
      price: price
    });
  });
  
  // הוספת נסיעות שלא תואמות
  const extraCount = Math.floor(rides.length * 0.1);
  for (let i = 0; i < extraCount; i++) {
    const date = randomDate();
    const source = israeliCities[Math.floor(Math.random() * israeliCities.length)];
    let destination = israeliCities[Math.floor(Math.random() * israeliCities.length)];
    while (destination === source) {
      destination = israeliCities[Math.floor(Math.random() * israeliCities.length)];
    }
    
    const passengerCount = Math.floor(Math.random() * 3) + 1;
    const passengerNames = [];
    for (let j = 0; j < passengerCount; j++) {
      const randomPid = Math.floor(Math.random() * (employeeMap.size || 30)) + 1;
      const employee = employeeMap.get(randomPid);
      if (employee) {
        passengerNames.push(`${employee.firstName} ${employee.lastName}`);
      }
    }
    
    gettData.push({
      orderNumber: (700000 + i).toString(),
      date: formatDate(date),
      time: formatTime(date),
      source: source,
      destination: destination,
      passengers: passengerNames.join(', '),
      price: Math.round((50 + Math.random() * 450) * 100) / 100
    });
  }
  
  return gettData;
}

/**
 * יצירת כל נתוני הדמו
 */
export function generateAllDemoData() {
  const { employees, employeeMap } = generateDemoEmployees(30);
  const rides = generateDemoRides(50, employeeMap);
  const bontour = generateDemoBontour(rides, employeeMap, 0.7);
  const hori = generateDemoHori(rides, employeeMap, 0.7);
  const gett = generateDemoGett(rides, employeeMap, 0.7);
  
  return {
    employees,
    employeeMap,
    rides,
    bontour,
    hori,
    gett
  };
}

