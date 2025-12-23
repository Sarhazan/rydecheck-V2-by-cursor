from typing import List, Dict, Any, Tuple, Set, Optional
from fuzzywuzzy import fuzz
from datetime import datetime, timedelta

class Matcher:
    """Match trips between company and suppliers"""
    
    def match_all(self, company_data: List[Dict[str, Any]], 
                  suppliers_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Match company trips with all suppliers"""
        results = {
            'company_trips': company_data,
            'matches': {},
            'missing_in_suppliers': {},
            'extra_in_suppliers': {},
            'price_differences': {},
            'statistics': {}
        }
        
        # Match with each supplier
        for supplier_key, supplier_data in suppliers_data.items():
            matches, missing, extra, price_diff = self._match_supplier(
                company_data, supplier_data, supplier_key
            )
            
            results['matches'][supplier_key] = matches
            results['missing_in_suppliers'][supplier_key] = missing
            results['extra_in_suppliers'][supplier_key] = extra
            results['price_differences'][supplier_key] = price_diff
        
        # Calculate statistics
        results['statistics'] = self._calculate_statistics(results)
        
        return results
    
    def _match_supplier(self, company_data: List[Dict[str, Any]], 
                       supplier_data: List[Dict[str, Any]], 
                       supplier_key: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Match company trips with a specific supplier"""
        matches = []
        missing = []
        extra = []
        price_differences = []
        
        # Create lookup dictionaries
        supplier_by_trip_id = {}
        supplier_by_fuzzy = {}
        
        for supplier_trip in supplier_data:
            trip_id = supplier_trip.get('trip_id', '')
            # Convert to string for consistent matching
            trip_id = str(trip_id).strip() if trip_id else ''
            if trip_id:
                supplier_by_trip_id[trip_id] = supplier_trip
            
            # Create fuzzy key for GETT (supplier2)
            if supplier_key == 'supplier2':
                fuzzy_key = self._create_fuzzy_key(supplier_trip)
                supplier_by_fuzzy[fuzzy_key] = supplier_trip
        
        # Match company trips
        matched_supplier_ids = set()
        
        for company_trip in company_data:
            company_trip_id = str(company_trip.get('trip_id', '')).strip()
            match_found = False
            
            # Try direct match by trip_id
            if company_trip_id and company_trip_id in supplier_by_trip_id:
                supplier_trip = supplier_by_trip_id[company_trip_id]
                match_found = True
                matched_supplier_ids.add(company_trip_id)
                
                # Check price difference
                price_diff = self._calculate_price_difference(
                    company_trip, supplier_trip
                )
                if abs(price_diff) > 0.01:  # More than 1 agora difference
                    price_differences.append({
                        'company_trip': company_trip,
                        'supplier_trip': supplier_trip,
                        'price_difference': price_diff
                    })
                
                matches.append({
                    'company_trip': company_trip,
                    'supplier_trip': supplier_trip,
                    'match_type': 'exact_id',
                    'confidence': 100
                })
            
            # Try fuzzy matching (especially for GETT)
            elif supplier_key == 'supplier2' or not company_trip_id:
                best_match = self._fuzzy_match(company_trip, supplier_data, matched_supplier_ids)
                if best_match:
                    match_found = True
                    matched_supplier_ids.add(best_match['supplier_trip'].get('trip_id', ''))
                    matches.append(best_match)
            
            if not match_found:
                missing.append(company_trip)
        
        # Find extra trips in supplier (not in company)
        for supplier_trip in supplier_data:
            trip_id = str(supplier_trip.get('trip_id', '')).strip()
            if trip_id not in matched_supplier_ids:
                # Check if it's really extra or just couldn't match
                if not self._could_match_company(supplier_trip, company_data):
                    extra.append(supplier_trip)
        
        return matches, missing, extra, price_differences
    
    def _fuzzy_match(self, company_trip: Dict[str, Any], 
                     supplier_data: List[Dict[str, Any]],
                     matched_ids: Set[str]) -> Optional[Dict[str, Any]]:
        """Fuzzy match a company trip with supplier trips"""
        best_match = None
        best_score = 0
        threshold = 70  # Minimum similarity score
        
        company_date = company_trip.get('date', '')
        company_passengers = company_trip.get('passengers', [])
        company_source = company_trip.get('source', '')
        company_destination = company_trip.get('destination', '')
        
        for supplier_trip in supplier_data:
            supplier_id = supplier_trip.get('trip_id', '')
            if supplier_id in matched_ids:
                continue
            
            # Calculate similarity score
            score = 0
            factors = 0
            
            # Date match (high weight)
            supplier_date = supplier_trip.get('date', '')
            if company_date and supplier_date:
                if company_date == supplier_date:
                    score += 40
                else:
                    # Check if dates are close (within 1 day)
                    if self._dates_close(company_date, supplier_date):
                        score += 20
                factors += 1
            
            # Passenger match
            supplier_passengers = supplier_trip.get('passengers', [])
            if company_passengers and supplier_passengers:
                passenger_score = self._match_passengers(company_passengers, supplier_passengers)
                score += passenger_score * 0.3
                factors += 1
            
            # Source/Destination match
            supplier_source = supplier_trip.get('source', '')
            supplier_destination = supplier_trip.get('destination', '')
            
            if company_source and supplier_source:
                source_score = fuzz.partial_ratio(
                    company_source.lower(), 
                    supplier_source.lower()
                )
                score += source_score * 0.15
                factors += 1
            
            if company_destination and supplier_destination:
                dest_score = fuzz.partial_ratio(
                    company_destination.lower(), 
                    supplier_destination.lower()
                )
                score += dest_score * 0.15
                factors += 1
            
            if factors > 0 and score > best_score and score >= threshold:
                best_score = score
                best_match = supplier_trip
        
        if best_match:
            return {
                'company_trip': company_trip,
                'supplier_trip': best_match,
                'match_type': 'fuzzy',
                'confidence': min(100, int(best_score))
            }
        
        return None
    
    def _match_passengers(self, company_passengers: List[str], 
                         supplier_passengers: List[str]) -> float:
        """Match passengers between company and supplier"""
        if not company_passengers or not supplier_passengers:
            return 0
        
        total_score = 0
        matched = set()
        
        for cp in company_passengers:
            best_match_score = 0
            for sp in supplier_passengers:
                if sp in matched:
                    continue
                score = fuzz.ratio(cp.lower(), sp.lower())
                if score > best_match_score:
                    best_match_score = score
            
            total_score += best_match_score
        
        return total_score // len(company_passengers) if company_passengers else 0
    
    def _dates_close(self, date1: str, date2: str) -> bool:
        """Check if two dates are within 1 day of each other"""
        try:
            d1 = datetime.strptime(date1, '%Y-%m-%d')
            d2 = datetime.strptime(date2, '%Y-%m-%d')
            return abs((d1 - d2).days) <= 1
        except:
            return False
    
    def _calculate_price_difference(self, company_trip: Dict[str, Any], 
                                   supplier_trip: Dict[str, Any]) -> float:
        """Calculate price difference between company and supplier"""
        company_price = self._to_float(company_trip.get('price', 0))
        supplier_price = self._to_float(supplier_trip.get('price', 0))
        return supplier_price - company_price
    
    def _to_float(self, value: Any) -> float:
        """Safely convert value to float, return 0 on failure."""
        try:
            if value is None:
                return 0.0
            if isinstance(value, str):
                clean = value.replace(',', '').strip()
                return float(clean) if clean else 0.0
            return float(value)
        except Exception:
            return 0.0
    
    def _could_match_company(self, supplier_trip: Dict[str, Any], 
                            company_data: List[Dict[str, Any]]) -> bool:
        """Check if supplier trip could potentially match any company trip"""
        # Simple check - if we have similar date, it might be a match
        supplier_date = supplier_trip.get('date', '')
        if not supplier_date:
            return False
        
        for company_trip in company_data:
            company_date = company_trip.get('date', '')
            if company_date == supplier_date:
                return True
        
        return False
    
    def _create_fuzzy_key(self, trip: Dict[str, Any]) -> str:
        """Create a fuzzy matching key for a trip"""
        date = trip.get('date', '')
        passengers = ','.join(trip.get('passengers', []))
        source = trip.get('source', '')
        destination = trip.get('destination', '')
        return f"{date}|{passengers}|{source}|{destination}"
    
    def compare_by_id(self, company_data: List[Dict[str, Any]], 
                      supplier_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Simple comparison by ID only - no fuzzy matching
        Returns matches, missing trips, and price differences
        """
        matches = []
        missing_in_supplier = []  # Our trips not found in supplier
        missing_in_company = []   # Supplier trips not found in our data
        price_differences = []
        
        # Create lookup dictionary for supplier trips by ID
        supplier_by_id = {}
        for supplier_trip in supplier_data:
            trip_id = str(supplier_trip.get('trip_id', '')).strip()
            if trip_id:
                supplier_by_id[trip_id] = supplier_trip
        
        # Track which supplier trips were matched
        matched_supplier_ids = set()
        
        # Match company trips with supplier trips
        for company_trip in company_data:
            company_trip_id = str(company_trip.get('trip_id', '')).strip()
            
            if not company_trip_id:
                # No ID - can't match
                missing_in_supplier.append(company_trip)
                continue
            
            if company_trip_id in supplier_by_id:
                # Found match by ID
                supplier_trip = supplier_by_id[company_trip_id]
                matched_supplier_ids.add(company_trip_id)
                
                # Check price difference
                company_price = company_trip.get('price', 0) or 0
                supplier_price = supplier_trip.get('price', 0) or 0
                
                # Only compare prices if both are valid (non-zero)
                if company_price > 0 and supplier_price > 0:
                    price_diff = supplier_price - company_price
                    
                    if abs(price_diff) > 0.01:  # More than 1 agora difference
                        # Price difference found
                        price_differences.append({
                            'company_trip': company_trip,
                            'supplier_trip': supplier_trip,
                            'price_difference': price_diff,
                            'company_price': company_price,
                            'supplier_price': supplier_price
                        })
                    else:
                        # Perfect match - same ID and same price
                        matches.append({
                            'company_trip': company_trip,
                            'supplier_trip': supplier_trip,
                            'match_type': 'exact_id',
                            'confidence': 100
                        })
                elif company_price > 0 or supplier_price > 0:
                    # One price is missing (0) - treat as match (no price comparison)
                    matches.append({
                        'company_trip': company_trip,
                        'supplier_trip': supplier_trip,
                        'match_type': 'exact_id',
                        'confidence': 100
                    })
                else:
                    # Both prices are 0 - treat as match
                    matches.append({
                        'company_trip': company_trip,
                        'supplier_trip': supplier_trip,
                        'match_type': 'exact_id',
                        'confidence': 100
                    })
            else:
                # No match found - our trip is missing in supplier
                missing_in_supplier.append(company_trip)
        
        # Find supplier trips that weren't matched (missing in our data)
        for supplier_trip in supplier_data:
            trip_id = str(supplier_trip.get('trip_id', '')).strip()
            if trip_id and trip_id not in matched_supplier_ids:
                if self._is_valid_trip_id(trip_id):
                    missing_in_company.append(supplier_trip)
        
        return {
            'matches': matches,
            'missing_in_supplier': missing_in_supplier,
            'missing_in_company': missing_in_company,
            'price_differences': price_differences
        }
    
    def _is_valid_trip_id(self, trip_id: str) -> bool:
        """Check if trip_id is valid (not a summary row)"""
        if not trip_id:
            return False
        summary_indicators = ['סה"כ', 'סה כ', 'total', 'sum', 'סיכום', 'summary']
        return not any(indicator.lower() in trip_id.lower() for indicator in summary_indicators)
    
    def _times_within_minutes(self, time1: str, time2: str, tolerance: int) -> bool:
        """Check if two times are within ±tolerance minutes of each other"""
        if not time1 or not time2:
            return False
        
        try:
            # Parse time strings (HH:MM format)
            def parse_time(t_str):
                parts = str(t_str).strip().split(':')
                if len(parts) >= 2:
                    return int(parts[0]) * 60 + int(parts[1])
                return None
            
            minutes1 = parse_time(time1)
            minutes2 = parse_time(time2)
            
            if minutes1 is None or minutes2 is None:
                return False
            
            # Calculate absolute difference
            diff = abs(minutes1 - minutes2)
            
            # Check if within tolerance (also handle midnight crossover)
            return diff <= tolerance or diff >= (24 * 60 - tolerance)
        except (ValueError, AttributeError, IndexError):
            return False
    
    def _locations_match(self, loc1: str, loc2: str) -> bool:
        """Check if two locations match (with text cleaning and fuzzy matching)"""
        if not loc1 or not loc2:
            return False
        
        # Clean and normalize
        clean1 = str(loc1).strip().lower()
        clean2 = str(loc2).strip().lower()
        
        # Remove common punctuation and whitespace
        clean1 = clean1.replace(',', '').replace('.', '').replace('  ', ' ').strip()
        clean2 = clean2.replace(',', '').replace('.', '').replace('  ', ' ').strip()
        
        # Exact match after cleaning
        if clean1 == clean2:
            return True
        
        # Fuzzy match with high threshold (95% similarity)
        similarity = fuzz.ratio(clean1, clean2)
        return similarity >= 95
    
    def _has_matching_passenger(self, passengers1: List[str], passengers2: List[str]) -> bool:
        """Check if there is at least one matching passenger name"""
        if not passengers1 or not passengers2:
            return False
        
        # Normalize passenger names
        def normalize_name(name: str) -> str:
            return str(name).strip().lower().replace(',', '').replace('.', '')
        
        normalized1 = {normalize_name(p) for p in passengers1 if p}
        normalized2 = {normalize_name(p) for p in passengers2 if p}
        
        # Check for any exact match after normalization
        return bool(normalized1 & normalized2)
    
    def _meets_gett_match_criteria(self, company_trip: Dict[str, Any], gett_trip: Dict[str, Any]) -> bool:
        """Check if a company trip and GETT trip meet all matching criteria"""
        # 1. Date match (allow ±1 day)
        company_date = company_trip.get('date', '')
        gett_date = gett_trip.get('date', '')
        if not company_date or not gett_date or not self._dates_close(company_date, gett_date):
            return False
        
        # 2. Time within 5 minutes (strict) with relaxed fallback later
        company_time = company_trip.get('time', '')
        gett_time = gett_trip.get('time', '')
        time_strict_ok = self._times_within_minutes(company_time, gett_time, 5)
        
        # 3. Source match
        company_source = company_trip.get('source', '')
        gett_source = gett_trip.get('source', '')
        source_ok = self._locations_match(company_source, gett_source)
        
        # 4. Destination match
        company_dest = company_trip.get('destination', '')
        gett_dest = gett_trip.get('destination', '')
        dest_ok = self._locations_match(company_dest, gett_dest)
        
        # 5. At least one matching passenger
        company_passengers = company_trip.get('passengers', [])
        gett_passengers = gett_trip.get('passengers', [])
        passenger_ok = self._has_matching_passenger(company_passengers, gett_passengers)
        
        # Strict: all criteria with 5-minute window
        if time_strict_ok and source_ok and dest_ok and passenger_ok:
            return True
        
        # Relaxed: allow up to 180 minutes if locations/passengers match
        if source_ok and dest_ok and passenger_ok and self._times_within_minutes(company_time, gett_time, 180):
            return True
        
        # Last resort: ignore time and passenger when date + locations match
        if source_ok and dest_ok:
            return True
        
        return False
    
    def match_gett_trips(self, company_data: List[Dict[str, Any]], gett_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Match GETT trips with company trips based on strict criteria, aligned to shared date range"""
        import os, json
        from datetime import datetime
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.dirname(backend_dir)
        debug_log_path = os.path.join(workspace_root, '.cursor', 'debug.log')
        os.makedirs(os.path.dirname(debug_log_path), exist_ok=True)

        def log(payload: Dict[str, Any]):
            try:
                with open(debug_log_path, 'a', encoding='utf-8') as f:
                    f.write(json.dumps(payload, ensure_ascii=False) + '\n')
                    f.flush()
            except Exception:
                pass

        # Align by shared date range
        def parse_date_safe(d: str):
            try:
                return datetime.strptime(d, '%Y-%m-%d').date()
            except Exception:
                return None

        company_dates = [parse_date_safe(t.get('date', '')) for t in company_data if t.get('date')]
        gett_dates = [parse_date_safe(t.get('date', '')) for t in gett_data if t.get('date')]

        if company_dates and gett_dates:
            start_date = max(min(company_dates), min(gett_dates))
            end_date = min(max(company_dates), max(gett_dates))

            def in_range(trip, start, end):
                dt = parse_date_safe(trip.get('date', ''))
                return dt is not None and start <= dt <= end

            company_data = [t for t in company_data if in_range(t, start_date, end_date)]
            gett_data = [t for t in gett_data if in_range(t, start_date, end_date)]

            log({
                'timestamp': str(datetime.now()),
                'location': 'matcher.py:match_gett_trips',
                'message': 'date range trimmed',
                'data': {
                    'start_date': str(start_date),
                    'end_date': str(end_date),
                    'company_count_after': len(company_data),
                    'gett_count_after': len(gett_data)
                },
                'sessionId': 'debug-session',
                'runId': 'post-fix',
                'hypothesisId': 'align-dates'
            })

        matches = []
        matched_company_ids = set()
        matched_gett_trips = set()
        
        # Iterate through GETT trips and try to match each one
        for gett_trip in gett_data:
            best_match = None
            
            # Find the first company trip that meets all criteria
            for company_trip in company_data:
                company_trip_id = str(company_trip.get('trip_id', '')).strip()
                
                # Skip if this company trip already matched
                if company_trip_id in matched_company_ids:
                    continue
                
                # Check if this pair meets all criteria
                try:
                    criteria_result = self._meets_gett_match_criteria(company_trip, gett_trip)
                except Exception as e:
                    # Log and skip on error to avoid crash (common when data types are mixed)
                    log({
                        'timestamp': str(datetime.now()),
                        'location': 'matcher.py:match_gett_trips',
                        'message': 'criteria exception',
                        'data': {
                            'company_trip_id': company_trip_id,
                            'error': str(e)
                        },
                        'sessionId': 'debug-session',
                        'runId': 'post-fix',
                        'hypothesisId': 'H1'
                    })
                    criteria_result = False
                if criteria_result:
                    best_match = company_trip
                    break
            
            # If found a match, add it
            if best_match:
                company_trip_id = str(best_match.get('trip_id', '')).strip()
                matches.append({
                    'company_trip': best_match,
                    'gett_trip': gett_trip,
                    'company_trip_id': company_trip_id,
                    'match_confidence': 100
                })
                matched_company_ids.add(company_trip_id)
                matched_gett_trips.add(id(gett_trip))
        
        # Find unmatched trips
        unmatched_gett = [trip for trip in gett_data if id(trip) not in matched_gett_trips]
        unmatched_company = [
            trip for trip in company_data 
            if str(trip.get('trip_id', '')).strip() not in matched_company_ids
        ]
        
        return {
            'matches': matches,
            'matched_count': len(matches),
            'unmatched_gett': unmatched_gett,
            'unmatched_company': unmatched_company
        }
    
    def _calculate_statistics(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate statistics about the matching"""
        stats = {}
        
        total_company_trips = len(results['company_trips'])
        
        for supplier_key in results['matches'].keys():
            matches = results['matches'][supplier_key]
            missing = results['missing_in_suppliers'][supplier_key]
            extra = results['extra_in_suppliers'][supplier_key]
            price_diff = results['price_differences'][supplier_key]
            
            stats[supplier_key] = {
                'total_company_trips': total_company_trips,
                'matched': len(matches),
                'missing': len(missing),
                'extra': len(extra),
                'price_differences': len(price_diff),
                'match_rate': (len(matches) / total_company_trips * 100) if total_company_trips > 0 else 0
            }
        
        return stats

