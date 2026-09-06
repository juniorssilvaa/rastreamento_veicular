import secrets
from datetime import datetime, timezone


def _parse_iso(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).replace('Z', '+00:00')
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _ms_to_label(ms):
    if not ms or ms <= 0:
        return '0min'
    total_sec = int(ms // 1000)
    hours, rem = divmod(total_sec, 3600)
    minutes, seconds = divmod(rem, 60)
    if hours and minutes:
        return f'{hours}h {minutes}min'
    if hours:
        return f'{hours}h'
    if minutes and seconds:
        return f'{minutes}min {seconds}s'
    if minutes:
        return f'{minutes}min'
    return f'{seconds}s'


def _km(distance_m):
    return round((distance_m or 0) / 1000, 2)


def _build_hourly_usage(trips, period_start, period_end):
    buckets = {h: 0 for h in range(24)}
    for trip in trips or []:
        start = _parse_iso(trip.get('startTime'))
        if not start:
            continue
        duration_ms = trip.get('duration') or 0
        buckets[start.hour] += max(duration_ms, 1)
    max_val = max(buckets.values()) if buckets else 1
    return [
        {
            'hour': f'{h:02d}:00',
            'y': 1,
            'value': buckets[h],
            'size': round(6 + (buckets[h] / max_val) * 18, 1) if max_val else 6,
        }
        for h in range(24)
    ]


def _sparkline(values, default=0):
    if not values:
        return [default] * 8
    if len(values) >= 8:
        step = max(len(values) // 8, 1)
        return [round(values[i], 1) for i in range(0, len(values), step)][:8]
    padded = values + [values[-1]] * (8 - len(values))
    return [round(v, 1) for v in padded[:8]]


def build_ligado_desligado_report(client, device_id, from_time, to_time, device=None):
    device = device or next(
        (d for d in client.get_devices() if str(d.get('id')) == str(device_id)),
        {},
    )
    params_base = [('deviceId', device_id), ('from', from_time), ('to', to_time)]

    def fetch_report(path):
        try:
            response = client._request('get', path, params=params_base, timeout=45)
            response.raise_for_status()
            data = response.json()
            return data if isinstance(data, list) else []
        except Exception:
            return []

    summary_list = fetch_report('reports/summary')
    trips = fetch_report('reports/trips')
    stops = fetch_report('reports/stops')

    ignition_params = list(params_base)
    ignition_params.append(('type', 'ignitionOn'))
    ignition_params.append(('type', 'ignitionOff'))
    try:
        ignition_response = client._request(
            'get',
            'reports/events',
            params=ignition_params,
            timeout=45,
        )
        ignition_response.raise_for_status()
        ignition_events = ignition_response.json() if ignition_response.content else []
        if not isinstance(ignition_events, list):
            ignition_events = []
    except Exception:
        ignition_events = []

    route_positions = fetch_report('reports/route')

    summary = summary_list[0] if summary_list else {}
    period_start = _parse_iso(from_time)
    period_end = _parse_iso(to_time)
    period_ms = max(int((period_end - period_start).total_seconds() * 1000), 1) if period_start and period_end else 1

    engine_ms = summary.get('engineHours') or 0
    moving_ms = sum(t.get('duration') or 0 for t in trips)
    stopped_engine_ms = max(engine_ms - moving_ms, 0)
    parked_ms = max(period_ms - engine_ms, 0)

    speed_values = [p.get('speed', 0) for p in route_positions if p.get('speed') is not None]
    battery_values = [
        p.get('attributes', {}).get('batteryLevel', p.get('attributes', {}).get('battery'))
        for p in route_positions
        if isinstance(p.get('attributes'), dict)
    ]
    battery_values = [v for v in battery_values if v is not None]
    rssi_values = [
        p.get('attributes', {}).get('rssi')
        for p in route_positions
        if isinstance(p.get('attributes'), dict) and p.get('attributes', {}).get('rssi') is not None
    ]
    temp_values = [
        p.get('attributes', {}).get('temp', p.get('attributes', {}).get('temperature'))
        for p in route_positions
        if isinstance(p.get('attributes'), dict)
    ]
    temp_values = [v for v in temp_values if v is not None]

    trip_rows = []
    for trip in sorted(trips, key=lambda t: t.get('startTime') or ''):
        trip_rows.append({
            'durationOn': _ms_to_label(trip.get('duration')),
            'onTime': trip.get('startTime'),
            'onAddress': trip.get('startAddress') or 'Endereço não disponível',
            'durationOff': _ms_to_label(next(
                (s.get('duration') for s in stops if s.get('startTime') == trip.get('endTime')),
                0,
            )),
            'offTime': trip.get('endTime'),
            'offAddress': trip.get('endAddress') or 'Endereço não disponível',
            'avgSpeed': round(trip.get('averageSpeed') or summary.get('averageSpeed') or 0, 0),
            'distance': _km(trip.get('distance')),
            'driver': device.get('contact') or 'Não possui identificador',
        })

    if not trip_rows and ignition_events:
        sorted_events = sorted(ignition_events, key=lambda e: e.get('eventTime') or '')
        on_event = None
        for event in sorted_events:
            if event.get('type') == 'ignitionOn':
                on_event = event
            elif event.get('type') == 'ignitionOff' and on_event:
                on_dt = _parse_iso(on_event.get('eventTime'))
                off_dt = _parse_iso(event.get('eventTime'))
                duration_ms = int((off_dt - on_dt).total_seconds() * 1000) if on_dt and off_dt else 0
                trip_rows.append({
                    'durationOn': _ms_to_label(duration_ms),
                    'onTime': on_event.get('eventTime'),
                    'onAddress': 'Endereço não disponível',
                    'durationOff': '—',
                    'offTime': event.get('eventTime'),
                    'offAddress': 'Endereço não disponível',
                    'avgSpeed': round(summary.get('averageSpeed') or 0, 0),
                    'distance': 0,
                    'driver': device.get('contact') or 'Não possui identificador',
                })
                on_event = None

    ignition_count = len([e for e in ignition_events if e.get('type') == 'ignitionOn']) or len(trip_rows)

    attrs = device.get('attributes') or {}
    model = attrs.get('model') or attrs.get('vehicleModel') or device.get('model') or '—'

    report_date = period_start or datetime.now(timezone.utc)
    month_names = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ]

    return {
        'meta': {
            'reportType': 'ligado-desligado',
            'title': 'Relatório de Ligado e Desligado',
            'company': 'BLRASTREAMENTO',
            'cnpj': '00.000.000/0001-00',
            'generatedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'token': secrets.token_hex(12),
        },
        'vehicle': {
            'id': device.get('id'),
            'name': device.get('name') or device.get('uniqueId') or 'Veículo',
            'model': model,
            'plate': attrs.get('plate') or device.get('name') or '—',
        },
        'period': {
            'from': from_time,
            'to': to_time,
            'label': f"{report_date.strftime('%d/%m/%Y')} – {period_end.strftime('%d/%m/%Y') if period_end else ''}",
        },
        'summary': {
            'ignitionCount': ignition_count,
            'engineHours': {
                'ligado': _ms_to_label(engine_ms),
                'ligadoMs': engine_ms,
                'movimento': _ms_to_label(moving_ms),
                'movimentoMs': moving_ms,
                'parado': _ms_to_label(stopped_engine_ms),
                'paradoMs': stopped_engine_ms,
                'estacionado': _ms_to_label(parked_ms),
                'estacionadoMs': parked_ms,
            },
            'speed': {
                'max': round(summary.get('maxSpeed') or (max(speed_values) if speed_values else 0), 0),
                'avg': round(summary.get('averageSpeed') or (sum(speed_values) / len(speed_values) if speed_values else 0), 0),
                'excess': 0,
            },
            'distance': {
                'total': _km(summary.get('distance')),
                'odometer': _km(attrs.get('odometer') or 0),
                'dailyAvg': _km(summary.get('distance')),
            },
        },
        'hourlyUsage': _build_hourly_usage(trips, period_start, period_end),
        'dynamics': {
            'day': report_date.day,
            'monthLabel': f"{month_names[report_date.month - 1]}/{str(report_date.year)[-2:]}",
            'sparklines': {
                'speed': _sparkline(speed_values, summary.get('averageSpeed') or 0),
                'battery': _sparkline(battery_values, 0),
                'rssi': _sparkline(rssi_values, 0),
                'temperature': _sparkline(temp_values, 0),
            },
        },
        'trips': trip_rows,
        'rawCounts': {
            'trips': len(trips),
            'stops': len(stops),
            'positions': len(route_positions),
            'events': len(ignition_events),
        },
    }
