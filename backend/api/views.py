from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .traccar_service import TraccarClient
from .logutil import logger, mask_secret, log_api_call
import os
from django.conf import settings
from django.core.files.storage import FileSystemStorage

client = TraccarClient() # Instância global para simplicidade no dev

class DashboardStatsView(APIView):
    def get(self, request):
        # MOCK DATA para desenvolvimento:
        # Quando unirmos com o PostgreSQL, leremos a tabela tc_devices
        data = {
            "total": 101,
            "online": 89,
            "offline": 8,
            "em_estoque": 4,
            "tecnicos": 0
        }
        return Response(data, status=status.HTTP_200_OK)

class StatusFalhasView(APIView):
    def get(self, request):
        # MOCK DATA
        data = {
            "sinistrado": 1,
            "manutencao": 2,
            "oficina": 0,
            "parado": 3
        }
        return Response(data, status=status.HTTP_200_OK)

class DashboardV2StatsView(APIView):
    def get(self, request):
        devices = client.get_devices()
        total_connected = len([d for d in devices if d.get('status') == 'online'])
        total_offline = len(devices) - total_connected
        
        data = {
            "historico": [
                {"name": "Online", "conectados": total_connected},
                {"name": "Offline", "conectados": total_offline},
            ],
            "historico_total": len(devices),
            "revendas": {
                "administradores": 1,
                "clientes": 0,
                "dispositivos": len(devices)
            },
            "ordens_servico": {
                "total": 0,
                "instalacao": 0,
                "pendencia": 0,
                "desinstalacao": 0
            },
            "faturamento": {
                "receber": 4500.00,
                "a_pagar": 1250.00
            }
        }
        return Response(data, status=status.HTTP_200_OK)

class TraccarDevicesView(APIView):
    def get(self, request):
        devices = client.get_devices()
        return Response(devices, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Cria um novo veículo/dispositivo"""
        result = client.save_entity("devices", request.data)
        if result:
            return Response(result, status=status.HTTP_201_CREATED)
        return Response({"error": "Falha ao criar veículo"}, status=status.HTTP_400_BAD_REQUEST)

class TraccarDeviceDetailView(APIView):
    def put(self, request, pk):
        """Edita um veículo/dispositivo"""
        data = request.data
        data['id'] = pk
        result = client.update_entity("devices", pk, data)
        if result:
            return Response(result, status=status.HTTP_200_OK)
        return Response({"error": "Falha ao editar veículo"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Exclui um veículo/dispositivo"""
        success = client.delete_entity("devices", pk)
        if success:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Falha ao excluir veículo"}, status=status.HTTP_400_BAD_REQUEST)

from .models import VehiclePhoto
import base64
from django.http import HttpResponse

class VehiclePhotoUploadView(APIView):
    def post(self, request):
        if 'photo' not in request.FILES:
            return Response({"error": "Nenhuma foto enviada"}, status=status.HTTP_400_BAD_REQUEST)
        
        photo = request.FILES['photo']
        photo_bytes = photo.read()
        b64 = base64.b64encode(photo_bytes).decode('utf-8')
        mime_type = photo.content_type
        photo_base64 = f"data:{mime_type};base64,{b64}"
        
        # Salva no banco de dados Django (seguro contra restarts)
        obj = VehiclePhoto.objects.create(photo_base64=photo_base64)
        
        # Retorna a url para o frontend usar no Traccar
        return Response({"url": f"/api/photos/{obj.id}/"}, status=status.HTTP_201_CREATED)

class VehiclePhotoServeView(APIView):
    def get(self, request, pk):
        try:
            photo = VehiclePhoto.objects.get(id=pk)
            format, imgstr = photo.photo_base64.split(';base64,')
            ext = format.split('/')[-1]
            return HttpResponse(base64.b64decode(imgstr), content_type=f'image/{ext}')
        except Exception:
            return HttpResponse(status=404)

class TraccarPositionsView(APIView):
    def get(self, request):
        positions = client.get_positions()
        return Response(positions, status=status.HTTP_200_OK)

class TraccarEventsView(APIView):
    def get(self, request):
        """Eventos reais do Traccar nas últimas 24h (ou período informado)."""
        from_time = request.query_params.get('from')
        to_time = request.query_params.get('to')
        event_types = request.query_params.getlist('type') or None
        device_ids = request.query_params.getlist('deviceId') or None
        events = client.get_events(
            from_time=from_time,
            to_time=to_time,
            event_types=event_types,
            device_ids=device_ids,
        )
        return Response(events, status=status.HTTP_200_OK)


class TraccarReportLigadoDesligadoView(APIView):
    def get(self, request):
        from datetime import datetime, timedelta, timezone
        from .report_service import build_ligado_desligado_report

        device_id = request.query_params.get('deviceId')
        from_time = request.query_params.get('from')
        to_time = request.query_params.get('to')

        if not device_id:
            return Response({'error': 'deviceId é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        now = datetime.now(timezone.utc)
        if not to_time:
            to_time = now.isoformat().replace('+00:00', 'Z')
        if not from_time:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            from_time = start.isoformat().replace('+00:00', 'Z')

        try:
            report = build_ligado_desligado_report(client, device_id, from_time, to_time)
            return Response(report, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception('[REPORT] ligado-desligado deviceId=%s erro=%s', device_id, exc)
            return Response({'error': 'Falha ao gerar relatório'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TraccarCommandView(APIView):
    def post(self, request):
        device_id = request.data.get('deviceId')
        command_id = request.data.get('id')
        command_type = request.data.get('type')  # ex: engineStop, engineResume
        attributes = request.data.get('attributes', {})
        text_channel = request.data.get('textChannel', False)
        if isinstance(text_channel, str):
            text_channel = text_channel.strip().lower() in ('1', 'true', 'yes', 'on')

        sms_gateway = request.data.get('smsGateway')
        sms_login = request.data.get('smsLogin')
        sms_token = request.data.get('smsToken')

        logger.info(
            "[CMD] recebido deviceId=%s type=%s id=%s textChannel=%s gateway=%s",
            device_id, command_type, command_id, text_channel, sms_gateway,
        )

        if not device_id:
            return Response({"error": "deviceId é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        if not command_id and not command_type:
            return Response({"error": "id ou type do comando é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

        # Se for para enviar via SMS, fazemos isso diretamente pelo Django (sem depender do Traccar)
        if text_channel or command_type == 'sendSms':
            import requests as req_lib
            try:
                devices = client.get_devices()
                device = next((d for d in devices if str(d.get('id')) == str(device_id)), None)
                phone = device.get('phone') if device else None
                logger.debug(
                    "[SMS] device id=%s name=%s phone=%s",
                    device_id,
                    (device or {}).get('name'),
                    phone,
                )
            except Exception as e:
                logger.exception("[SMS] erro ao buscar dispositivo id=%s: %s", device_id, e)
                phone = None

            message = attributes.get('data') or attributes.get('message') or command_type or 'cmd'
            logger.info(
                "[SMS] ENVIO DIRETO deviceId=%s phone=%s message=%s",
                device_id, phone, message,
            )

            if not phone:
                logger.warning("[SMS] abortado: dispositivo %s sem telefone", device_id)
                return Response(
                    {"error": "Dispositivo não tem número de telefone cadastrado no Traccar"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            provider = sms_gateway
            login = sms_login
            token = sms_token

            if not provider or not login or not token:
                import xml.etree.ElementTree as ET, re as re_lib, os as os_lib
                candidate_paths = [
                    os_lib.environ.get('TRACCAR_CONFIG_PATH'),
                    '/opt/traccar/conf/traccar.xml',
                    '/app/Traccar/conf/traccar.xml',
                    r'e:\blrastreamento\Traccar\conf\traccar.xml',
                ]
                sms_url = ''
                for traccar_conf_path in candidate_paths:
                    if not traccar_conf_path or not os_lib.path.isfile(traccar_conf_path):
                        continue
                    try:
                        tree = ET.parse(traccar_conf_path)
                        root = tree.getroot()
                        for entry in root.findall('entry'):
                            key = entry.get('key', '')
                            if key == 'sms.http.url':
                                sms_url = entry.text or ''
                        if sms_url:
                            logger.info("[SMS] credenciais lidas de %s", traccar_conf_path)
                            break
                    except Exception as e:
                        logger.warning("[SMS] falha lendo %s: %s", traccar_conf_path, e)

                if not sms_url:
                    logger.error("[SMS] gateway não informado e traccar.xml sem sms.http.url")
                    return Response(
                        {"error": "Gateway SMS não informado e não configurado no traccar.xml"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                if "smsmarket" in sms_url:
                    provider = "smsmarket"
                    login_m = re_lib.search(r'user=([^&]+)', sms_url)
                    token_m = re_lib.search(r'password=([^&]+)', sms_url)
                    login = login_m.group(1) if login_m else None
                    token = token_m.group(1) if token_m else None

            if not provider or not login or not token:
                logger.error("[SMS] credenciais inválidas provider=%s login=%s", provider, mask_secret(login))
                return Response(
                    {"error": "Credenciais SMS inválidas ou não encontradas"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            try:
                if provider == "smsmarket":
                    smsmarket_api_url = "https://api.smsmarket.com.br/webservice-rest/send-single"
                    payload = {
                        "user": login,
                        "password": token,
                        "type": 2,  # SMS Interativo
                        "country_code": "55",
                        "number": phone,
                        "content": message,
                    }

                    logger.info(
                        "[SMS] chamando SMS Market user=%s token=%s number=%s",
                        login, mask_secret(token), phone,
                    )
                    resp = req_lib.post(smsmarket_api_url, data=payload, timeout=15)
                    log_api_call("SMSMARKET", "POST", smsmarket_api_url, resp.status_code, detail=resp.text[:500])
                    logger.info("[SMS] resposta SMS Market status=%s body=%s", resp.status_code, resp.text[:500])

                    sms_market_id = None
                    try:
                        resp_json = resp.json()
                        sms_market_id = str(resp_json.get("id", ""))
                    except Exception:
                        pass

                    from .models import SmsCommandHistory
                    SmsCommandHistory.objects.create(
                        device_id=device_id,
                        phone_number=phone,
                        content=message,
                        status_code=-1,  # Enfileirada
                        sms_market_id=sms_market_id,
                    )

                    if resp.status_code >= 400:
                        logger.error("[SMS] falha no envio status=%s", resp.status_code)
                        return Response(
                            {"error": "Falha no envio SMS", "smsmarket_response": resp.text},
                            status=status.HTTP_502_BAD_GATEWAY,
                        )

                    logger.info("[SMS] enviado com sucesso deviceId=%s sms_market_id=%s", device_id, sms_market_id)
                    return Response({"success": True, "smsmarket_response": resp.text}, status=status.HTTP_200_OK)

                logger.error("[SMS] provedor desconhecido: %s", provider)
                return Response({"error": "Provedor SMS desconhecido"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                logger.exception("[SMS] erro ao conectar no Gateway SMS: %s", e)
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Fluxo normal: envia via Traccar (GPRS/TCP)
        result = client.send_command(device_id, command_type, attributes, command_id, text_channel=text_channel)
        if result and not result.get("error"):
            logger.info("[CMD] sucesso via Traccar deviceId=%s type=%s", device_id, command_type)
            return Response(result, status=status.HTTP_200_OK)
        error_message = result.get("error") if isinstance(result, dict) else "Falha ao enviar comando"
        logger.warning("[CMD] falha Traccar deviceId=%s error=%s", device_id, error_message)
        return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)

class CreateTestDeviceView(APIView):
    """Auxiliar para injetar um dispositivo se o banco estiver vazio"""
    def post(self, request):
        result = client.create_test_device()
        return Response(result, status=status.HTTP_201_CREATED)

class TraccarNotificationsView(APIView):
    def get(self, request):
        notifications = client.get_notifications()
        return Response(notifications, status=status.HTTP_200_OK)
    
    def post(self, request):
        result = client.save_notification(request.data)
        if result:
            return Response(result, status=status.HTTP_201_CREATED)
        return Response({"error": "Falha ao salvar notificação"}, status=status.HTTP_400_BAD_REQUEST)

class TraccarNotificationDeleteView(APIView):
    def delete(self, request, pk):
        success = client.delete_notification(pk)
        if success:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Falha ao excluir"}, status=status.HTTP_400_BAD_REQUEST)

class TraccarNotificationTypesView(APIView):
    def get(self, request):
        types = client.get_notification_types()
        return Response(types, status=status.HTTP_200_OK)

class TraccarGeofencesView(APIView):
    def get(self, request):
        geofences = client.get_geofences()
        return Response(geofences, status=status.HTTP_200_OK)

class TraccarCalendarView(APIView):
    def get(self, request):
        calendars = client.get_calendars()
        return Response(calendars, status=status.HTTP_200_OK)
    
    def post(self, request):
        # Traccar Calendars esperam 'name' e 'data' (ICS)
        result = client.save_calendar(request.data)
        if result:
            return Response(result, status=status.HTTP_201_CREATED)
        return Response({"error": "Falha ao salvar calendário"}, status=status.HTTP_400_BAD_REQUEST)

class TraccarPermissionView(APIView):
    def post(self, request):
        notification_id = request.data.get('notificationId')
        geofence_id = request.data.get('geofenceId')
        devices_ids = request.data.get('devicesIds', [])
        
        results = []

        # Vincula notificação diretamente a uma cerca (entrada/saída)
        if notification_id and geofence_id and not devices_ids:
            results.append(client.link_permission({
                "notificationId": notification_id,
                "geofenceId": geofence_id,
            }))

        for dev_id in devices_ids:
            if notification_id:
                results.append(client.link_notification_to_device(notification_id, dev_id))
            if geofence_id:
                results.append(client.link_geofence_to_device(geofence_id, dev_id))
            
        return Response({"success": all(results) if results else True}, status=status.HTTP_200_OK)

class TraccarEntityView(APIView):
    """View genérica para CRUD de entidades (drivers, groups, maintenance, etc)"""
    def get(self, request, endpoint):
        data = client.get_entities(endpoint)
        return Response(data, status=status.HTTP_200_OK)
    
    def post(self, request, endpoint):
        result = client.save_entity(endpoint, request.data)
        if result:
            return Response(result, status=status.HTTP_201_CREATED)
        return Response({"error": f"Falha ao salvar em {endpoint}"}, status=status.HTTP_400_BAD_REQUEST)

class TraccarEntityDetailView(APIView):
    def put(self, request, endpoint, pk):
        data = request.data
        data['id'] = pk
        result = client.update_entity(endpoint, pk, data)
        if result:
            return Response(result, status=status.HTTP_200_OK)
        return Response({"error": f"Falha ao atualizar {endpoint}"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, endpoint, pk):
        success = client.delete_entity(endpoint, pk)
        if success:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Falha ao excluir"}, status=status.HTTP_400_BAD_REQUEST)

class TraccarCommandTypesView(APIView):
    def get(self, request):
        device_id = request.query_params.get('deviceId')
        # deviceId agora é opcional para permitir listar todos os comandos globais
        types = client.get_command_types(device_id)
        return Response(types, status=status.HTTP_200_OK)

class TraccarServerInfoView(APIView):
    def get(self, request):
        info = client.get_server_info()
        return Response(info, status=status.HTTP_200_OK)

import requests

from .models import Customer, Technician
import datetime

class AsaasCustomerView(APIView):
    """Proxy view para criar clientes no Asaas, salvar no banco local, e opcionalmente criar assinatura"""

    def _serialize_local(self, c):
        user = getattr(c, 'user', None)
        return {
            "id": c.id,
            "asaas_id": c.asaas_id,
            "cpf_cnpj": c.cpf_cnpj,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "mobile_phone": c.mobile_phone,
            "monthly_value": float(c.monthly_value) if c.monthly_value else None,
            "due_day": c.due_day,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "rg": c.rg,
            "birth_date": str(c.birth_date) if c.birth_date else None,
            "postal_code": c.postal_code,
            "address": c.address,
            "address_number": c.address_number,
            "complement": c.complement,
            "province": c.province,
            "city": c.city,
            "state": c.state,
            "contract_name": c.contract_name,
            "income": float(c.income) if c.income else None,
            "is_recurring": bool(getattr(c, "is_recurring", False)),
            "has_access": user is not None,
            "is_active": user.is_active if user else False,
            "has_2fa": bool(c.otp_secret and c.otp_secret != '-'),
            "source": "local",
        }

    def get(self, request):
        asaas_token = request.headers.get('X-Asaas-Token')
        asaas_env = request.headers.get('X-Asaas-Env', 'sandbox')

        local_customers = list(Customer.objects.all().order_by('-created_at'))
        local_by_asaas = {c.asaas_id: c for c in local_customers if c.asaas_id}

        # Sem token: lista apenas o banco local
        if not asaas_token:
            return Response(
                [self._serialize_local(c) for c in local_customers],
                status=status.HTTP_200_OK,
            )

        base_url = "https://api-sandbox.asaas.com/v3" if asaas_env == 'sandbox' else "https://api.asaas.com/v3"
        headers = {
            "accept": "application/json",
            "access_token": asaas_token,
        }

        try:
            asaas_customers = []
            offset = 0
            limit = 100
            while True:
                resp = requests.get(
                    f"{base_url}/customers",
                    headers=headers,
                    params={"limit": limit, "offset": offset},
                    timeout=30,
                )
                log_api_call("ASAAS", "GET", f"{base_url}/customers?offset={offset}", resp.status_code)
                if resp.status_code >= 400:
                    logger.warning("[ASAAS] falha ao listar customers: %s", resp.text[:300])
                    # Fallback para lista local se Asaas falhar
                    return Response(
                        [self._serialize_local(c) for c in local_customers],
                        status=status.HTTP_200_OK,
                    )

                payload = resp.json() if resp.content else {}
                page = payload.get("data") or []
                asaas_customers.extend(page)
                has_more = bool(payload.get("hasMore"))
                if not has_more or not page:
                    break
                offset += limit
                if offset > 2000:  # segurança
                    break

            logger.info("[ASAAS] listados %s clientes (env=%s)", len(asaas_customers), asaas_env)

            merged = []
            seen_asaas_ids = set()

            for ac in asaas_customers:
                asaas_id = ac.get("id")
                if not asaas_id or asaas_id in seen_asaas_ids:
                    continue
                seen_asaas_ids.add(asaas_id)

                local = local_by_asaas.get(asaas_id)
                if local:
                    item = self._serialize_local(local)
                    # Prefere dados frescos do Asaas nos campos principais
                    item["name"] = ac.get("name") or item["name"]
                    item["email"] = ac.get("email") or item["email"]
                    item["cpf_cnpj"] = ac.get("cpfCnpj") or item["cpf_cnpj"]
                    item["phone"] = ac.get("phone") or item["phone"]
                    item["mobile_phone"] = ac.get("mobilePhone") or item["mobile_phone"]
                    item["postal_code"] = ac.get("postalCode") or item["postal_code"]
                    item["address"] = ac.get("address") or item["address"]
                    item["address_number"] = ac.get("addressNumber") or item["address_number"]
                    item["complement"] = ac.get("complement") or item["complement"]
                    item["province"] = ac.get("province") or item["province"]
                    item["city"] = ac.get("city") or item.get("city")
                    item["state"] = ac.get("state") or item.get("state")
                    item["contract_name"] = ac.get("externalReference") or item["contract_name"]
                    item["source"] = "asaas+local"
                else:
                    item = {
                        "id": None,
                        "asaas_id": asaas_id,
                        "cpf_cnpj": ac.get("cpfCnpj") or "",
                        "name": ac.get("name") or "Sem nome",
                        "email": ac.get("email"),
                        "phone": ac.get("phone"),
                        "mobile_phone": ac.get("mobilePhone"),
                        "monthly_value": None,
                        "due_day": None,
                        "created_at": ac.get("dateCreated"),
                        "rg": None,
                        "birth_date": None,
                        "postal_code": ac.get("postalCode"),
                        "address": ac.get("address"),
                        "address_number": ac.get("addressNumber"),
                        "complement": ac.get("complement"),
                        "province": ac.get("province"),
                        "city": ac.get("city"),
                        "state": ac.get("state"),
                        "contract_name": ac.get("externalReference"),
                        "income": None,
                        "has_access": False,
                        "is_active": False,
                        "has_2fa": False,
                        "source": "asaas",
                    }
                merged.append(item)

            # Locais sem asaas_id (ainda não sincronizados) ficam no fim
            for c in local_customers:
                if not c.asaas_id or c.asaas_id not in seen_asaas_ids:
                    merged.append(self._serialize_local(c))

            return Response(merged, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("[ASAAS] erro ao listar clientes: %s", e)
            return Response(
                [self._serialize_local(c) for c in local_customers],
                status=status.HTTP_200_OK,
            )

    def _as_bool(self, value, default=False):
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in {"1", "true", "yes", "on", "sim"}

    def _parse_customer_fields(self, data):
        birth_date = data.get("birth_date") or None

        monthly_value = data.get("monthly_value")
        monthly_value = float(monthly_value) if monthly_value not in (None, "") else None

        due_day = data.get("due_day")
        due_day = int(due_day) if due_day not in (None, "") else None

        income = data.get("income")
        income = float(income) if income not in (None, "") else None

        return {
            "cpf_cnpj": data.get("cpf_cnpj", "") or "",
            "name": data.get("name", "") or "",
            "contract_name": data.get("contract_name", "") or "",
            "rg": data.get("rg", "") or "",
            "birth_date": birth_date,
            "postal_code": data.get("postal_code", "") or "",
            "address": data.get("address", "") or "",
            "address_number": data.get("address_number", "") or "",
            "complement": data.get("complement", "") or "",
            "province": data.get("province", "") or "",
            "city": data.get("city", "") or "",
            "state": data.get("state", "") or "",
            "mobile_phone": data.get("mobile_phone", "") or "",
            "phone": data.get("phone", "") or "",
            "email": data.get("email", "") or "",
            "monthly_value": monthly_value,
            "due_day": due_day,
            "income": income,
            "is_recurring": self._as_bool(data.get("is_recurring") if data.get("is_recurring") is not None else data.get("recurring"), False),
        }

    def _disable_customer_notifications(self, base_url, headers, asaas_id):
        try:
            notif_resp = requests.get(f"{base_url}/customers/{asaas_id}/notifications", headers=headers, timeout=30)
            if notif_resp.status_code != 200:
                return
            for notif in notif_resp.json().get("data", []):
                notif_id = notif.get("id")
                if not notif_id:
                    continue
                requests.put(
                    f"{base_url}/notifications/{notif_id}",
                    json={
                        "enabled": False,
                        "emailEnabledForProvider": False,
                        "smsEnabledForProvider": False,
                        "emailEnabledForCustomer": False,
                        "smsEnabledForCustomer": False,
                        "phoneCallEnabledForCustomer": False,
                        "whatsappEnabledForCustomer": False,
                    },
                    headers=headers,
                    timeout=30,
                )
        except Exception:
            pass

    def post(self, request):
        data = request.data
        send_to_asaas = self._as_bool(data.get("send_to_asaas"), False)
        disable_notifications = self._as_bool(data.get("disable_asaas_notifications"), True)
        local_id = data.get("local_id") or data.get("id")
        existing_asaas_id = data.get("asaas_id") or None
        fields = self._parse_customer_fields(data)

        if not fields["name"] or not fields["cpf_cnpj"]:
            return Response(
                {"error": "Nome e CPF/CNPJ são obrigatórios"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Salvar apenas no banco local (sem criar cliente/fatura no Asaas)
        if not send_to_asaas:
            try:
                if local_id:
                    customer = Customer.objects.filter(id=local_id).first()
                    if not customer:
                        return Response({"error": "Cliente local não encontrado"}, status=status.HTTP_404_NOT_FOUND)
                    for key, value in fields.items():
                        setattr(customer, key, value)
                    customer.save()
                    return Response(
                        {
                            "message": "Cliente salvo localmente!",
                            "customer_id": customer.id,
                            "asaas_id": customer.asaas_id,
                            **self._serialize_local(customer),
                        },
                        status=status.HTTP_200_OK,
                    )

                if existing_asaas_id:
                    customer = Customer.objects.filter(asaas_id=existing_asaas_id).first()
                    if customer:
                        for key, value in fields.items():
                            setattr(customer, key, value)
                        customer.save()
                    else:
                        customer = Customer.objects.create(asaas_id=existing_asaas_id, **fields)
                    return Response(
                        {
                            "message": "Cliente salvo localmente!",
                            "customer_id": customer.id,
                            "asaas_id": customer.asaas_id,
                            **self._serialize_local(customer),
                        },
                        status=status.HTTP_200_OK,
                    )

                customer = Customer.objects.create(asaas_id=None, **fields)
                return Response(
                    {
                        "message": "Cliente salvo localmente!",
                        "customer_id": customer.id,
                        "asaas_id": None,
                        **self._serialize_local(customer),
                    },
                    status=status.HTTP_201_CREATED,
                )
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        asaas_token = request.headers.get("X-Asaas-Token")
        asaas_env = request.headers.get("X-Asaas-Env", "sandbox")
        logger.info("[ASAAS] criar/enviar cliente env=%s token=%s", asaas_env, mask_secret(asaas_token))

        if not asaas_token:
            return Response(
                {"error": "Token do Asaas não fornecido no cabeçalho X-Asaas-Token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        base_url = "https://api-sandbox.asaas.com/v3" if asaas_env == "sandbox" else "https://api.asaas.com/v3"
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "access_token": asaas_token,
        }

        customer_payload = {
            "name": fields["name"],
            "cpfCnpj": fields["cpf_cnpj"],
            "email": fields["email"],
            "phone": fields["phone"],
            "mobilePhone": fields["mobile_phone"],
            "postalCode": fields["postal_code"],
            "address": fields["address"],
            "addressNumber": fields["address_number"],
            "complement": fields["complement"],
            "province": fields["province"],
            "externalReference": fields["contract_name"],
            "notificationDisabled": bool(disable_notifications),
        }
        customer_payload = {k: v for k, v in customer_payload.items() if v or k == "notificationDisabled"}

        try:
            existing = Customer.objects.filter(id=local_id).first() if local_id else None
            if not existing and existing_asaas_id:
                existing = Customer.objects.filter(asaas_id=existing_asaas_id).first()
            asaas_id = (existing.asaas_id if existing and existing.asaas_id else None) or existing_asaas_id

            if asaas_id:
                response = requests.put(
                    f"{base_url}/customers/{asaas_id}",
                    json={k: v for k, v in customer_payload.items() if k != "cpfCnpj" or v},
                    headers=headers,
                    timeout=30,
                )
            else:
                response = requests.post(f"{base_url}/customers", json=customer_payload, headers=headers, timeout=30)

            asaas_data = response.json() if response.content else {}
            log_api_call(
                "ASAAS",
                "PUT" if asaas_id else "POST",
                f"{base_url}/customers" + (f"/{asaas_id}" if asaas_id else ""),
                response.status_code,
            )

            if response.status_code >= 400:
                return Response(asaas_data, status=response.status_code)

            asaas_id = asaas_data.get("id") or asaas_id

            if disable_notifications and asaas_id:
                self._disable_customer_notifications(base_url, headers, asaas_id)

            if existing:
                for key, value in fields.items():
                    setattr(existing, key, value)
                existing.asaas_id = asaas_id
                existing.save()
                customer = existing
            else:
                customer = Customer.objects.create(asaas_id=asaas_id, **fields)

            subscription_data = None
            monthly_value = fields["monthly_value"]
            due_day = fields["due_day"]
            if fields.get("is_recurring") and monthly_value and due_day and asaas_id:
                today = datetime.date.today()
                try:
                    next_due_date = datetime.date(today.year, today.month, due_day)
                except ValueError:
                    next_due_date = datetime.date(today.year, today.month + 1, 1) - datetime.timedelta(days=1) if today.month < 12 else datetime.date(today.year, 12, 31)
                if next_due_date <= today:
                    if today.month == 12:
                        next_due_date = datetime.date(today.year + 1, 1, due_day)
                    else:
                        try:
                            next_due_date = datetime.date(today.year, today.month + 1, due_day)
                        except ValueError:
                            next_due_date = datetime.date(today.year, today.month + 2, 1) - datetime.timedelta(days=1)

                sub_payload = {
                    "customer": asaas_id,
                    "billingType": "BOLETO",
                    "value": monthly_value,
                    "nextDueDate": next_due_date.strftime("%Y-%m-%d"),
                    "cycle": "MONTHLY",
                    "description": f"Mensalidade Rastreador - {fields['name']}",
                }
                if disable_notifications:
                    sub_payload["notificationDisabled"] = True

                if customer.asaas_subscription_id:
                    sub_response = requests.put(
                        f"{base_url}/subscriptions/{customer.asaas_subscription_id}",
                        json={
                            "value": monthly_value,
                            "nextDueDate": next_due_date.strftime("%Y-%m-%d"),
                            "updatePendingPayments": True,
                        },
                        headers=headers,
                        timeout=30,
                    )
                else:
                    sub_response = requests.post(
                        f"{base_url}/subscriptions",
                        json=sub_payload,
                        headers=headers,
                        timeout=30,
                    )

                if sub_response.status_code < 400:
                    subscription_data = sub_response.json()
                    customer.asaas_subscription_id = subscription_data.get("id") or customer.asaas_subscription_id
                    customer.save()

            return Response(
                {
                    "message": "Cliente enviado ao Asaas com sucesso!",
                    "customer_id": customer.id,
                    "asaas_id": asaas_id,
                    "asaas_data": asaas_data,
                    "subscription": subscription_data,
                    **self._serialize_local(customer),
                },
                status=status.HTTP_201_CREATED if not existing else status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AsaasCustomerFinanceView(APIView):
    """Resumo financeiro do cliente no Asaas (último pagamento, assinatura, faturas)."""

    def get(self, request, asaas_id):
        asaas_token = request.headers.get('X-Asaas-Token')
        asaas_env = request.headers.get('X-Asaas-Env', 'sandbox')
        if not asaas_token:
            return Response({"error": "Token do Asaas não fornecido"}, status=status.HTTP_401_UNAUTHORIZED)

        base_url = "https://api-sandbox.asaas.com/v3" if asaas_env == 'sandbox' else "https://api.asaas.com/v3"
        headers = {"accept": "application/json", "access_token": asaas_token}

        try:
            pay_resp = requests.get(
                f"{base_url}/payments",
                headers=headers,
                params={"customer": asaas_id, "limit": 50},
                timeout=30,
            )
            log_api_call("ASAAS", "GET", f"{base_url}/payments?customer={asaas_id}", pay_resp.status_code)
            payments = (pay_resp.json() or {}).get("data", []) if pay_resp.status_code < 400 else []

            sub_resp = requests.get(
                f"{base_url}/subscriptions",
                headers=headers,
                params={"customer": asaas_id, "limit": 20},
                timeout=30,
            )
            log_api_call("ASAAS", "GET", f"{base_url}/subscriptions?customer={asaas_id}", sub_resp.status_code)
            subscriptions = (sub_resp.json() or {}).get("data", []) if sub_resp.status_code < 400 else []

            paid_statuses = {"RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"}
            paid = [p for p in payments if p.get("status") in paid_statuses]
            paid.sort(key=lambda p: p.get("paymentDate") or p.get("clientPaymentDate") or p.get("dueDate") or "", reverse=True)
            last_paid = paid[0] if paid else None

            pending = [p for p in payments if p.get("status") in {"PENDING", "OVERDUE"}]
            pending.sort(key=lambda p: p.get("dueDate") or "")
            next_bill = pending[0] if pending else None

            active_sub = next((s for s in subscriptions if s.get("status") == "ACTIVE"), None)
            if not active_sub and subscriptions:
                active_sub = subscriptions[0]

            overdue_count = sum(1 for p in payments if p.get("status") == "OVERDUE")
            local = Customer.objects.filter(asaas_id=asaas_id).first()

            today = datetime.date.today()
            days_until = None
            next_due = None
            if next_bill and next_bill.get("dueDate"):
                next_due = next_bill["dueDate"]
                try:
                    days_until = (datetime.datetime.strptime(next_due, "%Y-%m-%d").date() - today).days
                except Exception:
                    days_until = None
            elif active_sub and active_sub.get("nextDueDate"):
                next_due = active_sub.get("nextDueDate")
                try:
                    days_until = (datetime.datetime.strptime(next_due, "%Y-%m-%d").date() - today).days
                except Exception:
                    days_until = None

            account_active = bool(active_sub and active_sub.get("status") == "ACTIVE") or overdue_count == 0

            return Response({
                "asaas_id": asaas_id,
                "last_paid_value": last_paid.get("value") if last_paid else None,
                "last_paid_date": (last_paid.get("paymentDate") or last_paid.get("clientPaymentDate") or last_paid.get("dueDate")) if last_paid else None,
                "next_due_date": next_due,
                "days_until_due": days_until,
                "account_active": account_active,
                "overdue": overdue_count > 0,
                "overdue_count": overdue_count,
                "payments_count": len(payments),
                "subscriptions_count": len(subscriptions),
                "recurring": bool(active_sub),
                "monthly_value": (
                    active_sub.get("value") if active_sub
                    else (float(local.monthly_value) if local and local.monthly_value else None)
                ),
                "subscription_status": active_sub.get("status") if active_sub else None,
                "payments": [
                    {
                        "id": p.get("id"),
                        "status": p.get("status"),
                        "value": p.get("value"),
                        "netValue": p.get("netValue"),
                        "dueDate": p.get("dueDate"),
                        "paymentDate": p.get("paymentDate") or p.get("clientPaymentDate"),
                        "billingType": p.get("billingType"),
                        "invoiceUrl": p.get("invoiceUrl"),
                        "bankSlipUrl": p.get("bankSlipUrl"),
                        "invoiceNumber": p.get("invoiceNumber"),
                        "description": p.get("description") or "",
                        "subscription": p.get("subscription"),
                        "installment": p.get("installment"),
                        "externalReference": p.get("externalReference"),
                    }
                    for p in payments
                ],
                "subscriptions": [
                    {
                        "id": s.get("id"),
                        "status": s.get("status"),
                        "value": s.get("value"),
                        "cycle": s.get("cycle"),
                        "nextDueDate": s.get("nextDueDate"),
                        "billingType": s.get("billingType"),
                    }
                    for s in subscriptions
                ],
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("[ASAAS] finance customer=%s: %s", asaas_id, e)
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)


def _asaas_base_and_headers(request):
    asaas_token = request.headers.get("X-Asaas-Token")
    asaas_env = request.headers.get("X-Asaas-Env", "sandbox")
    if not asaas_token:
        return None, None, Response({"error": "Token do Asaas não fornecido"}, status=status.HTTP_401_UNAUTHORIZED)
    base_url = "https://api-sandbox.asaas.com/v3" if asaas_env == "sandbox" else "https://api.asaas.com/v3"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "access_token": asaas_token,
    }
    return base_url, headers, None


class AsaasPaymentView(APIView):
    """Ações de fatura Asaas: criar, receber em dinheiro, cancelar."""

    def post(self, request, payment_id=None):
        base_url, headers, err = _asaas_base_and_headers(request)
        if err:
            return err

        data = request.data or {}
        action = (data.get("action") or "").strip().lower()

        # Criar cobrança / recorrência / carnê (sem payment_id)
        if not payment_id:
            kind = (data.get("kind") or "avulsa").strip().lower()
            customer_id = data.get("customer") or data.get("asaas_id")
            value = data.get("value")
            due_date = data.get("due_date") or data.get("dueDate")
            billing_type = (data.get("billing_type") or data.get("billingType") or "BOLETO").upper()
            description = data.get("description") or ""

            if not customer_id or value in (None, ""):
                return Response(
                    {"error": "Cliente e valor são obrigatórios"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                value = float(value)
            except (TypeError, ValueError):
                return Response({"error": "Valor inválido"}, status=status.HTTP_400_BAD_REQUEST)

            extras = {}
            interest = data.get("interest")
            if interest not in (None, "", 0, "0"):
                extras["interest"] = {"value": float(interest)}
            fine_value = data.get("fine") or data.get("fine_value")
            if fine_value not in (None, "", 0, "0"):
                extras["fine"] = {
                    "value": float(fine_value),
                    "type": (data.get("fine_type") or "PERCENTAGE").upper(),
                }
            discount_value = data.get("discount") or data.get("discount_value")
            if discount_value not in (None, "", 0, "0"):
                extras["discount"] = {
                    "value": float(discount_value),
                    "dueDateLimitDays": int(data.get("discount_days") or 0),
                    "type": (data.get("discount_type") or "FIXED").upper(),
                }

            try:
                if kind in ("recorrencia", "subscription", "recurring"):
                    cycle = (data.get("cycle") or "MONTHLY").upper()
                    payload = {
                        "customer": customer_id,
                        "billingType": billing_type,
                        "value": value,
                        "nextDueDate": due_date,
                        "cycle": cycle,
                        "description": description or "Assinatura",
                        **extras,
                    }
                    if not due_date:
                        return Response({"error": "Data do próximo vencimento é obrigatória"}, status=status.HTTP_400_BAD_REQUEST)
                    resp = requests.post(f"{base_url}/subscriptions", json=payload, headers=headers, timeout=30)
                    log_api_call("ASAAS", "POST", f"{base_url}/subscriptions", resp.status_code)
                    body = resp.json() if resp.content else {}
                    if resp.status_code >= 400:
                        return Response(body or {"error": "Falha ao criar recorrência"}, status=resp.status_code)
                    return Response(body, status=status.HTTP_201_CREATED)

                if kind in ("carne", "installment", "parcelado"):
                    installments = int(data.get("installments") or data.get("installmentCount") or 0)
                    if installments < 2:
                        return Response({"error": "Informe a quantidade de parcelas (mín. 2)"}, status=status.HTTP_400_BAD_REQUEST)
                    if not due_date:
                        return Response({"error": "Data da 1ª parcela é obrigatória"}, status=status.HTTP_400_BAD_REQUEST)
                    payload = {
                        "customer": customer_id,
                        "billingType": billing_type,
                        "value": value,
                        "dueDate": due_date,
                        "installmentCount": installments,
                        "totalValue": value,
                        "description": description or f"Carnê {installments}x",
                    }
                    resp = requests.post(f"{base_url}/payments", json=payload, headers=headers, timeout=30)
                    log_api_call("ASAAS", "POST", f"{base_url}/payments", resp.status_code)
                    body = resp.json() if resp.content else {}
                    if resp.status_code >= 400:
                        return Response(body or {"error": "Falha ao criar carnê"}, status=resp.status_code)
                    return Response(body, status=status.HTTP_201_CREATED)

                # Cobrança avulsa
                if not due_date:
                    return Response({"error": "Data de vencimento é obrigatória"}, status=status.HTTP_400_BAD_REQUEST)
                payload = {
                    "customer": customer_id,
                    "billingType": billing_type,
                    "value": value,
                    "dueDate": due_date,
                    "description": description or "Cobrança avulsa",
                }
                resp = requests.post(f"{base_url}/payments", json=payload, headers=headers, timeout=30)
                log_api_call("ASAAS", "POST", f"{base_url}/payments", resp.status_code)
                body = resp.json() if resp.content else {}
                if resp.status_code >= 400:
                    return Response(body or {"error": "Falha ao criar cobrança"}, status=resp.status_code)
                return Response(body, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.exception("[ASAAS] create payment: %s", e)
                return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        # Ações sobre fatura existente
        if action in ("receive", "receive_in_cash", "marcar_recebida"):
            payload = {
                "paymentDate": data.get("payment_date") or data.get("paymentDate") or datetime.date.today().isoformat(),
                "value": data.get("value"),
            }
            # value opcional — Asaas aceita só paymentDate
            payload = {k: v for k, v in payload.items() if v not in (None, "")}
            try:
                resp = requests.post(
                    f"{base_url}/payments/{payment_id}/receiveInCash",
                    json=payload,
                    headers=headers,
                    timeout=30,
                )
                log_api_call("ASAAS", "POST", f"{base_url}/payments/{payment_id}/receiveInCash", resp.status_code)
                body = resp.json() if resp.content else {}
                if resp.status_code >= 400:
                    return Response(body or {"error": "Falha ao marcar como recebida"}, status=resp.status_code)
                return Response(body, status=status.HTTP_200_OK)
            except Exception as e:
                logger.exception("[ASAAS] receive payment=%s: %s", payment_id, e)
                return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({"error": "Ação inválida"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, payment_id=None):
        if not payment_id:
            return Response({"error": "ID da fatura é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

        base_url, headers, err = _asaas_base_and_headers(request)
        if err:
            return err

        reason = ""
        if hasattr(request, "data"):
            reason = (request.data.get("reason") or request.data.get("motivo") or "").strip()
        if not reason:
            reason = (request.query_params.get("reason") or "").strip()
        if not reason:
            return Response({"error": "Informe o motivo do cancelamento"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Asaas: DELETE cancela a cobrança; motivo fica no log local
            resp = requests.delete(f"{base_url}/payments/{payment_id}", headers=headers, timeout=30)
            log_api_call("ASAAS", "DELETE", f"{base_url}/payments/{payment_id}", resp.status_code)
            body = resp.json() if resp.content else {"deleted": True}
            if resp.status_code >= 400:
                return Response(body or {"error": "Falha ao cancelar boleto"}, status=resp.status_code)
            logger.info("[ASAAS] payment %s canceled reason=%s", payment_id, reason)
            return Response({"ok": True, "reason": reason, "asaas": body}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("[ASAAS] cancel payment=%s: %s", payment_id, e)
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)


class AsaasCustomerDetailView(APIView):
    """Proxy view para atualizar ou deletar clientes no Asaas e localmente"""
    
    def put(self, request, asaas_id):
        asaas_token = request.headers.get('X-Asaas-Token')
        asaas_env = request.headers.get('X-Asaas-Env', 'sandbox')

        if not asaas_token:
            return Response({"error": "Token do Asaas não fornecido"}, status=status.HTTP_401_UNAUTHORIZED)

        base_url = "https://api-sandbox.asaas.com/v3" if asaas_env == 'sandbox' else "https://api.asaas.com/v3"
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "access_token": asaas_token
        }

        data = request.data
        
        customer_payload = {
            "name": data.get("name", ""),
            "cpfCnpj": data.get("cpf_cnpj", ""),
            "email": data.get("email", ""),
            "phone": data.get("phone", ""),
            "mobilePhone": data.get("mobile_phone", ""),
            "postalCode": data.get("postal_code", ""),
            "address": data.get("address", ""),
            "addressNumber": data.get("address_number", ""),
            "complement": data.get("complement", ""),
            "province": data.get("province", ""),
            "externalReference": data.get("contract_name", ""),
        }
        customer_payload = {k: v for k, v in customer_payload.items() if v}

        try:
            response = requests.post(f"{base_url}/customers/{asaas_id}", json=customer_payload, headers=headers)
            asaas_data = response.json()

            if response.status_code >= 400:
                return Response(asaas_data, status=response.status_code)
                
            customer = Customer.objects.filter(asaas_id=asaas_id).first()
            if customer:
                customer.cpf_cnpj = data.get('cpf_cnpj', customer.cpf_cnpj)
                customer.name = data.get('name', customer.name)
                customer.contract_name = data.get('contract_name', customer.contract_name)
                customer.rg = data.get('rg', customer.rg)
                
                birth_date = data.get('birth_date')
                customer.birth_date = birth_date if birth_date else None
                
                customer.postal_code = data.get('postal_code', customer.postal_code)
                customer.address = data.get('address', customer.address)
                customer.address_number = data.get('address_number', customer.address_number)
                customer.complement = data.get('complement', customer.complement)
                customer.province = data.get('province', customer.province)
                customer.city = data.get('city', customer.city)
                customer.state = data.get('state', customer.state)
                customer.mobile_phone = data.get('mobile_phone', customer.mobile_phone)
                customer.phone = data.get('phone', customer.phone)
                customer.email = data.get('email', customer.email)
                
                monthly_value = data.get('monthly_value')
                customer.monthly_value = float(monthly_value) if monthly_value else None
                
                due_day = data.get('due_day')
                customer.due_day = int(due_day) if due_day else None
                
                income = data.get('income')
                customer.income = float(income) if income else None
                
                customer.save()
                
                # Sincroniza a Assinatura (se mensalidade e vencimento foram fornecidos)
                monthly_value_input = data.get('monthly_value')
                due_day_input = data.get('due_day')
                
                if monthly_value_input and due_day_input:
                    sub_id = customer.asaas_subscription_id
                    
                    # Backwards compatibility: busca a assinatura caso não tenha o ID salvo
                    if not sub_id:
                        sub_list_resp = requests.get(f"{base_url}/subscriptions?customer={asaas_id}", headers=headers)
                        if sub_list_resp.status_code == 200:
                            subs = sub_list_resp.json().get('data', [])
                            if subs:
                                sub_id = subs[0].get('id')
                                customer.asaas_subscription_id = sub_id
                                customer.save()
                    
                    if sub_id:
                        today = datetime.date.today()
                        due_day_int = int(due_day_input)
                        
                        # Tenta criar a data. Cuidado com dias como 31 em meses que não tem.
                        try:
                            next_due_date = datetime.date(today.year, today.month, due_day_int)
                        except ValueError:
                            # Se der erro (ex: 31 de Fev), ajusta para o último dia do mês
                            if today.month == 12:
                                next_due_date = datetime.date(today.year + 1, 1, 1) - datetime.timedelta(days=1)
                            else:
                                next_due_date = datetime.date(today.year, today.month + 1, 1) - datetime.timedelta(days=1)
                                
                        if next_due_date <= today:
                            if today.month == 12:
                                try:
                                    next_due_date = datetime.date(today.year + 1, 1, due_day_int)
                                except ValueError:
                                    next_due_date = datetime.date(today.year + 1, 2, 1) - datetime.timedelta(days=1)
                            else:
                                try:
                                    next_due_date = datetime.date(today.year, today.month + 1, due_day_int)
                                except ValueError:
                                    next_due_date = datetime.date(today.year, today.month + 2, 1) - datetime.timedelta(days=1) if today.month < 11 else datetime.date(today.year + 1, 1, 1) - datetime.timedelta(days=1)
                                
                        sub_payload = {
                            "value": float(monthly_value_input),
                            "nextDueDate": next_due_date.strftime("%Y-%m-%d"),
                            "updatePendingPayments": True
                        }
                        requests.post(f"{base_url}/subscriptions/{sub_id}", json=sub_payload, headers=headers)

            return Response(asaas_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, asaas_id):
        asaas_token = request.headers.get('X-Asaas-Token')
        asaas_env = request.headers.get('X-Asaas-Env', 'sandbox')

        if not asaas_token:
            return Response({"error": "Token do Asaas não fornecido"}, status=status.HTTP_401_UNAUTHORIZED)

        base_url = "https://api-sandbox.asaas.com/v3" if asaas_env == 'sandbox' else "https://api.asaas.com/v3"
        headers = {
            "accept": "application/json",
            "access_token": asaas_token
        }

        try:
            response = requests.delete(f"{base_url}/customers/{asaas_id}", headers=headers)
            if response.status_code >= 400 and response.status_code != 404:
                return Response(response.json(), status=response.status_code)
                
            Customer.objects.filter(asaas_id=asaas_id).delete()
            return Response({"deleted": True}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AsaasOverdueCustomersView(APIView):
    def get(self, request):
        asaas_token = request.headers.get('X-Asaas-Token')
        asaas_env = request.headers.get('X-Asaas-Env', 'sandbox')

        if not asaas_token:
            return Response({"error": "Token do Asaas não fornecido"}, status=status.HTTP_401_UNAUTHORIZED)

        base_url = "https://api-sandbox.asaas.com/v3" if asaas_env == 'sandbox' else "https://api.asaas.com/v3"
        headers = {
            "accept": "application/json",
            "access_token": asaas_token
        }

        try:
            # Busca todas as faturas (payments) atrasadas
            response = requests.get(f"{base_url}/payments?status=OVERDUE&limit=100", headers=headers)
            
            if response.status_code >= 400:
                return Response(response.json(), status=response.status_code)
                
            data = response.json().get('data', [])
            
            # Agrupa as faturas por cliente, somando o valor e pegando o maior atraso
            overdue_customers = {}
            today = datetime.date.today()
            asaas_name_cache = {}

            def resolve_customer_name(customer_id):
                if not customer_id:
                    return "Cliente sem identificação"

                # 1) Banco local
                customer_obj = Customer.objects.filter(asaas_id=customer_id).first()
                if customer_obj and customer_obj.name:
                    return customer_obj.name

                # 2) Cache da requisição
                if customer_id in asaas_name_cache:
                    return asaas_name_cache[customer_id]

                # 3) API Asaas
                try:
                    cust_res = requests.get(
                        f"{base_url}/customers/{customer_id}",
                        headers=headers,
                        timeout=10,
                    )
                    if cust_res.status_code < 400:
                        cust_data = cust_res.json() or {}
                        name = (cust_data.get("name") or "").strip()
                        if name:
                            asaas_name_cache[customer_id] = name
                            return name
                except Exception:
                    pass

                asaas_name_cache[customer_id] = "Cliente sem nome"
                return asaas_name_cache[customer_id]

            for payment in data:
                customer_id = payment.get('customer')
                due_date_str = payment.get('dueDate')
                value = payment.get('value', 0)
                
                # Calcula os dias de atraso
                due_date = datetime.datetime.strptime(due_date_str, "%Y-%m-%d").date()
                days_overdue = (today - due_date).days
                
                if customer_id not in overdue_customers:
                    overdue_customers[customer_id] = {
                        "asaas_id": customer_id,
                        "name": resolve_customer_name(customer_id),
                        "total_value": value,
                        "max_days_overdue": days_overdue
                    }
                else:
                    overdue_customers[customer_id]["total_value"] += value
                    if days_overdue > overdue_customers[customer_id]["max_days_overdue"]:
                        overdue_customers[customer_id]["max_days_overdue"] = days_overdue
                        
            # Formata a resposta
            customers_list = list(overdue_customers.values())
            # Ordena pelos que tem maior valor primeiro
            customers_list.sort(key=lambda x: x["total_value"], reverse=True)
            
            total_in_debt = len(customers_list)
            total_value_in_debt = sum(c["total_value"] for c in customers_list)
            
            return Response({
                "total_in_debt": total_in_debt,
                "total_value": total_value_in_debt,
                "customers": customers_list
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

import re

class ConfigSmsGatewayView(APIView):
    def post(self, request):
        provider = request.data.get('provider')
        login = request.data.get('login')
        token = request.data.get('token')
        if not provider or not login or not token:
            return Response({"error": "Provider, login e token são obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)

        # Formata a URL dependendo do provider
        if provider == 'smsmarket':
            sms_url = f"https://api.smsmarket.com.br/webservice-rest/send-single?user={login}&password={token}&number={{phone}}&content={{message}}&type=2&country_code=55"
        else:
            return Response({"error": "Provedor SMS inválido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Usa a API REST do Traccar para atualizar as configs do servidor
            traccar_url = os.environ.get("TRACCAR_URL", "http://blrastreamento-traccar:8082")
            traccar_user = os.environ.get("TRACCAR_USER", "admin")
            traccar_pass = os.environ.get("TRACCAR_PASSWORD", "admin")

            from requests.auth import HTTPBasicAuth
            # 1. Busca a config atual do servidor
            get_resp = requests.get(
                f"{traccar_url}/api/server",
                auth=HTTPBasicAuth(traccar_user, traccar_pass),
                headers={"Accept": "application/json"},
                timeout=10
            )
            if get_resp.status_code != 200:
                return Response({"error": f"Não foi possível buscar config do Traccar: {get_resp.text}"}, status=status.HTTP_502_BAD_GATEWAY)

            server_data = get_resp.json()

            # 2. Atualiza os atributos do SMS
            attributes = server_data.get("attributes", {})
            attributes["notificator.types"] = "web,mail,sms"
            attributes["sms.http.url"] = sms_url
            attributes["sms.http.template"] = ""
            server_data["attributes"] = attributes

            # 3. Salva de volta no Traccar
            put_resp = requests.put(
                f"{traccar_url}/api/server",
                json=server_data,
                auth=HTTPBasicAuth(traccar_user, traccar_pass),
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                timeout=10
            )
            if put_resp.status_code not in (200, 204):
                return Response({"error": f"Falha ao salvar no Traccar: {put_resp.text}"}, status=status.HTTP_502_BAD_GATEWAY)

            return Response({"success": f"Gateway {provider} configurado com sucesso no Traccar"}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TechnicianView(APIView):
    def get(self, request):
        technicians = Technician.objects.all().order_by('-created_at')
        data = [{
            "id": t.id,
            "name": t.name,
            "cpf": t.cpf,
            "city": t.city,
            "state": t.state,
            "stock_total": t.stock_total,
            "is_active": t.is_active,
            "permitir_finalizar_os": t.permitir_finalizar_os,
            "ponto_fixo": t.ponto_fixo,
            "has_contract": t.has_contract,
            "cep": t.cep,
            "numero": t.numero,
            "bairro": t.bairro,
            "rua": t.rua,
            "complemento": t.complemento,
            "email": t.email,
            "celular": t.celular,
            "whatsapp": t.whatsapp,
            "fone_fixo": t.fone_fixo,
            "valor_instalacao_simples": float(t.valor_instalacao_simples) if t.valor_instalacao_simples else None,
            "valor_instalacao_bloqueio": float(t.valor_instalacao_bloqueio) if t.valor_instalacao_bloqueio else None,
            "valor_desinstalacao": float(t.valor_desinstalacao) if t.valor_desinstalacao else None,
            "created_at": t.created_at.isoformat(),
        } for t in technicians]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data
        try:
            tech = Technician.objects.create(
                name=data.get('name', ''),
                cpf=data.get('cpf', ''),
                city=data.get('city', ''),
                state=data.get('state', ''),
                stock_total=int(data.get('stock_total', 0)),
                is_active=data.get('is_active', True),
                permitir_finalizar_os=data.get('permitir_finalizar_os', False),
                ponto_fixo=data.get('ponto_fixo', False),
                has_contract=data.get('has_contract', False),
                cep=data.get('cep', ''),
                numero=data.get('numero', ''),
                bairro=data.get('bairro', ''),
                rua=data.get('rua', ''),
                complemento=data.get('complemento', ''),
                email=data.get('email', ''),
                celular=data.get('celular', ''),
                whatsapp=data.get('whatsapp', ''),
                fone_fixo=data.get('fone_fixo', ''),
                valor_instalacao_simples=data.get('valor_instalacao_simples') or None,
                valor_instalacao_bloqueio=data.get('valor_instalacao_bloqueio') or None,
                valor_desinstalacao=data.get('valor_desinstalacao') or None
            )
            return Response({"id": tech.id, "message": "Técnico cadastrado com sucesso!"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class TechnicianDetailView(APIView):
    def put(self, request, pk):
        try:
            tech = Technician.objects.get(pk=pk)
            data = request.data
            
            tech.name = data.get('name', tech.name)
            tech.cpf = data.get('cpf', tech.cpf)
            tech.city = data.get('city', tech.city)
            tech.state = data.get('state', tech.state)
            
            tech.cep = data.get('cep', tech.cep)
            tech.numero = data.get('numero', tech.numero)
            tech.bairro = data.get('bairro', tech.bairro)
            tech.rua = data.get('rua', tech.rua)
            tech.complemento = data.get('complemento', tech.complemento)
            
            tech.email = data.get('email', tech.email)
            tech.celular = data.get('celular', tech.celular)
            tech.whatsapp = data.get('whatsapp', tech.whatsapp)
            tech.fone_fixo = data.get('fone_fixo', tech.fone_fixo)
            
            if 'valor_instalacao_simples' in data:
                tech.valor_instalacao_simples = data.get('valor_instalacao_simples') or None
            if 'valor_instalacao_bloqueio' in data:
                tech.valor_instalacao_bloqueio = data.get('valor_instalacao_bloqueio') or None
            if 'valor_desinstalacao' in data:
                tech.valor_desinstalacao = data.get('valor_desinstalacao') or None

            if 'stock_total' in data:
                tech.stock_total = int(data.get('stock_total'))
            if 'is_active' in data:
                tech.is_active = bool(data.get('is_active'))
            if 'permitir_finalizar_os' in data:
                tech.permitir_finalizar_os = bool(data.get('permitir_finalizar_os'))
            if 'ponto_fixo' in data:
                tech.ponto_fixo = bool(data.get('ponto_fixo'))
            if 'has_contract' in data:
                tech.has_contract = bool(data.get('has_contract'))
                
            tech.save()
            return Response({"message": "Técnico atualizado!"}, status=status.HTTP_200_OK)
        except Technician.DoesNotExist:
            return Response({"error": "Técnico não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            tech = Technician.objects.get(pk=pk)
            tech.delete()
            return Response({"message": "Técnico removido"}, status=status.HTTP_204_NO_CONTENT)
        except Technician.DoesNotExist:
            return Response({"error": "Técnico não encontrado"}, status=status.HTTP_404_NOT_FOUND)

            return Response({"success": f"Gateway {provider} configurado com sucesso no Traccar"}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class SmsInboundView(APIView):
    """Busca respostas SMS recebidas do rastreador (não suportado atualmente)"""
    def get(self, request):
        return Response([], status=status.HTTP_200_OK)

from .models import CommandCombo

class CommandComboView(APIView):
    def get(self, request):
        combos = CommandCombo.objects.all().order_by('-created_at')
        data = [
            {
                "id": c.id,
                "nome": c.nome,
                "comandos": c.comandos
            } for c in combos
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        nome = request.data.get('nome')
        comandos = request.data.get('comandos', [])
        if not nome or not comandos:
            return Response({"error": "Nome e comandos são obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)
        
        combo = CommandCombo.objects.create(nome=nome, comandos=comandos)
        return Response({
            "id": combo.id,
            "nome": combo.nome,
            "comandos": combo.comandos
        }, status=status.HTTP_201_CREATED)

class CommandComboDetailView(APIView):
    def put(self, request, pk):
        try:
            combo = CommandCombo.objects.get(pk=pk)
            nome = request.data.get('nome')
            comandos = request.data.get('comandos')
            
            if nome is not None:
                combo.nome = nome
            if comandos is not None:
                combo.comandos = comandos
                
            combo.save()
            return Response({
                "id": combo.id,
                "nome": combo.nome,
                "comandos": combo.comandos
            }, status=status.HTTP_200_OK)
        except CommandCombo.DoesNotExist:
            return Response({"error": "Combo não encontrado"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            combo = CommandCombo.objects.get(pk=pk)
            combo.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except CommandCombo.DoesNotExist:
            return Response({"error": "Combo não encontrado"}, status=status.HTTP_404_NOT_FOUND)

import urllib.request
import urllib.error
import json
import base64

class SmsMarketBalanceView(APIView):
    def get(self, request):
        url = 'https://api.smsmarket.com.br/webservice-rest/balance'
        try:
            user = (request.GET.get('user') or '').strip()
            password = (request.GET.get('token') or '').strip()
            if not user or not password:
                logger.info("[SMS] saldo não consultado: credenciais SMS Market ausentes")
                return Response(
                    {"total": 0, "configured": False, "error": "SMS Market não configurado"},
                    status=status.HTTP_200_OK,
                )

            logger.info("[SMS] consultando saldo user=%s", user)
            credentials = f"{user}:{password}"
            encoded_credentials = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')

            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0',
                'Authorization': f'Basic {encoded_credentials}'
            })

            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))

                if 'sms' in data:
                    total_sms = int(data.get('sms', 0))
                elif 'balance_1' in data:
                    total_sms = int(data.get('balance_1', 0))
                else:
                    total_sms = 0

                logger.info(
                    "[SMS] saldo total=%s raw_keys=%s",
                    total_sms,
                    list(data.keys()) if isinstance(data, dict) else type(data),
                )
                return Response(
                    {"total": total_sms, "configured": True, "raw": data},
                    status=status.HTTP_200_OK,
                )
        except urllib.error.HTTPError as e:
            logger.warning("[SMS] falha ao consultar saldo: HTTP %s %s", e.code, e.reason)
            status_code = status.HTTP_401_UNAUTHORIZED if e.code == 401 else status.HTTP_502_BAD_GATEWAY
            return Response(
                {"error": f"SMS Market retornou HTTP {e.code}", "total": 0, "configured": True},
                status=status_code,
            )
        except Exception as e:
            logger.exception("[SMS] erro ao consultar saldo: %s", e)
            return Response(
                {"error": str(e), "total": 0, "configured": True},
                status=status.HTTP_502_BAD_GATEWAY,
            )

class VehicleIconView(APIView):
    def get(self, request):
        from .models import VehicleIcon
        icons = VehicleIcon.objects.all().order_by('-created_at')
        data = [
            {
                "id": i.id,
                "name": i.name,
                "image_url": i.image_url
            } for i in icons
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        from .models import VehicleIcon
        name = request.data.get('name')
        image_url = request.data.get('image_url')
        if not name or not image_url:
            return Response({"error": "Nome e URL da imagem são obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)
        
        icon = VehicleIcon.objects.create(name=name, image_url=image_url)
        return Response({
            "id": icon.id,
            "name": icon.name,
            "image_url": icon.image_url
        }, status=status.HTTP_201_CREATED)

class VehicleIconDetailView(APIView):
    def delete(self, request, pk):
        from .models import VehicleIcon
        try:
            icon = VehicleIcon.objects.get(pk=pk)
            icon.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except VehicleIcon.DoesNotExist:
            return Response({"error": "Ícone não encontrado"}, status=status.HTTP_404_NOT_FOUND)

class SmsHistoryView(APIView):
    def get(self, request, device_id):
        from .models import SmsCommandHistory
        messages = SmsCommandHistory.objects.filter(device_id=device_id).order_by('created_at')
        data = []
        for msg in messages:
            data.append({
                "id": msg.id,
                "device_id": msg.device_id,
                "phone_number": msg.phone_number,
                "content": msg.content,
                "status_code": msg.status_code,
                "direction": msg.direction,
                "created_at": msg.created_at.isoformat()
            })
        return Response(data, status=status.HTTP_200_OK)

class SmsCallbackView(APIView):
    def get(self, request):
        # SMS Market envia GET
        from .models import SmsCommandHistory
        
        # ex: ?id=150&status=4&date=...&number=...&content=...
        sms_market_id = request.query_params.get('id')
        status_code_str = request.query_params.get('status')
        content = request.query_params.get('content')
        phone = request.query_params.get('number')

        logger.info(
            "[SMS-CALLBACK] id=%s status=%s number=%s content=%s qs=%s",
            sms_market_id, status_code_str, phone, content, request.META.get("QUERY_STRING"),
        )
        
        if not sms_market_id and not content:
            return Response({"error": "Parâmetros insuficientes"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            status_code = int(status_code_str) if status_code_str is not None else None
        except ValueError:
            status_code = None

        if sms_market_id and status_code is not None:
            # Atualiza status da mensagem enviada
            try:
                msg = SmsCommandHistory.objects.filter(sms_market_id=sms_market_id).last()
                if msg:
                    msg.status_code = status_code
                    msg.save()
            except Exception as e:
                pass
                
        # Trata recebimento de mensagem (inbound)
        if status_code == 4 and content and phone:
            SmsCommandHistory.objects.create(
                phone_number=phone,
                content=content,
                status_code=4,
                sms_market_id=sms_market_id,
                direction='inbound'
            )
            
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class PlacaFipeLookupView(APIView):
    def post(self, request):
        placa = str(request.data.get('placa') or '').replace('-', '').replace(' ', '').upper()
        token = (request.data.get('token') or '').strip().strip('"').strip("'")
        if token.lower().startswith('bearer '):
            token = token[7:].strip()
        token = ''.join(token.split())

        logger.info("[PLACA] consulta placa=%s token=%s", placa, mask_secret(token))

        if not placa or len(placa) < 7:
            return Response({"error": "Informe uma placa válida."}, status=status.HTTP_400_BAD_REQUEST)
        if not token:
            return Response({"error": "Configure o token da consulta de placa em Integrações."}, status=status.HTTP_400_BAD_REQUEST)

        def parse_body(response):
            try:
                return response.json() if response.content else {}
            except Exception:
                return {}

        url = 'https://placas.app.br/api/v1/placas/numero'
        payload = {'placa': placa}
        common_headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'BLRastreamento/1.0',
        }

        try:
            logger.debug("[PLACA] POST %s payload=%s", url, payload)
            response = requests.post(
                url,
                json=payload,
                headers={**common_headers, 'Authorization': f'Bearer {token}'},
                timeout=(8, 30),
            )
            data = parse_body(response)
            log_api_call("PLACA", "POST", url, response.status_code, detail=str(data)[:300])
            if response.status_code in (401, 403):
                logger.warning("[PLACA] auth falhou com Bearer, tentando token puro")
                response = requests.post(
                    url,
                    json=payload,
                    headers={**common_headers, 'Authorization': token},
                    timeout=(8, 30),
                )
                data = parse_body(response)
                log_api_call("PLACA", "POST", url, response.status_code, detail="retry_token_puro")
        except requests.Timeout:
            logger.error("[PLACA] timeout placa=%s", placa)
            return Response(
                {"error": "A consulta de placa demorou para responder. Tente novamente em instantes."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except requests.RequestException as e:
            logger.exception("[PLACA] erro de conexão: %s", e)
            return Response(
                {"error": "Não foi possível conectar à API de placas. Verifique a internet e tente novamente."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if response.status_code in (401, 403):
            logger.warning("[PLACA] não autorizado status=%s", response.status_code)
            return Response(
                {"error": data.get('message') or data.get('error') or data.get('msg') or 'Token inválido ou expirado. Gere um novo token em placas.app.br.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if response.status_code >= 400 or not isinstance(data, dict) or not (data.get('marca') or data.get('modelo') or data.get('chassi')):
            logger.warning("[PLACA] não encontrada placa=%s status=%s", placa, response.status_code)
            return Response(
                {"error": data.get('message') or data.get('error') or data.get('msg') or 'Placa não encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        logger.info("[PLACA] ok placa=%s marca=%s modelo=%s", placa, data.get('marca'), data.get('modelo'))
        return Response({
            "placa": data.get('placa_modelo_novo') or data.get('placa_modelo_antigo') or data.get('placa') or placa,
            "marca": data.get('marca') or '',
            "modelo": data.get('modelo') or '',
            "ano": data.get('ano_modelo') or data.get('ano_fabricacao') or '',
            "ano_modelo": data.get('ano_modelo') or '',
            "ano_fabricacao": data.get('ano_fabricacao') or '',
            "cor": data.get('cor') or '',
            "chassi": data.get('chassi') or '',
            "combustivel": data.get('combustivel') or '',
            "motor": data.get('motor') or '',
            "municipio": data.get('municipio') or '',
            "uf": data.get('uf') or data.get('uf_placa') or '',
            "segmento": data.get('segmento') or data.get('tipo_veiculo') or '',
            "sub_segmento": data.get('sub_segmento') or '',
            "cilindradas": data.get('cilindradas') or '',
            "tipo_veiculo": data.get('tipo_veiculo') or '',
            "msg": 'Veículo encontrado',
        }, status=status.HTTP_200_OK)
