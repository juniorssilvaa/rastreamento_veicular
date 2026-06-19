from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .traccar_service import TraccarClient
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

class VehiclePhotoUploadView(APIView):
    def post(self, request):
        if 'photo' not in request.FILES:
            return Response({"error": "Nenhuma foto enviada"}, status=status.HTTP_400_BAD_REQUEST)
        
        photo = request.FILES['photo']
        fs = FileSystemStorage()
        filename = fs.save(f"vehicles/{photo.name}", photo)
        file_url = fs.url(filename)
        
        # Retorna a URL absoluta para salvar nos atributos do Traccar
        full_url = request.build_absolute_uri(file_url)
        return Response({"url": full_url}, status=status.HTTP_201_CREATED)

class TraccarPositionsView(APIView):
    def get(self, request):
        positions = client.get_positions()
        return Response(positions, status=status.HTTP_200_OK)

class TraccarCommandView(APIView):
    def post(self, request):
        device_id = request.data.get('deviceId')
        command_id = request.data.get('id')
        command_type = request.data.get('type') # ex: engineStop, engineResume
        attributes = request.data.get('attributes', {})
        text_channel = request.data.get('textChannel', False)
        
        sms_gateway = request.data.get('smsGateway')
        sms_login = request.data.get('smsLogin')
        sms_token = request.data.get('smsToken')

        if not device_id:
            return Response({"error": "deviceId é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        if not command_id and not command_type:
            return Response({"error": "id ou type do comando é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

        # Se for para enviar via SMS, fazemos isso diretamente pelo Django (sem depender do Traccar)
        if text_channel or command_type == 'sendSms':
            import requests as req_lib
            # Busca o telefone do dispositivo usando o client já configurado com credenciais corretas
            try:
                devices = client.get_devices()
                device = next((d for d in devices if str(d.get('id')) == str(device_id)), None)
                phone = device.get('phone') if device else None
                print(f" [DEBUG] Dispositivo encontrado: {device}")
            except Exception as e:
                print(f" [DEBUG] Erro ao buscar dispositivo: {e}")
                phone = None

            # Determina a mensagem a enviar
            message = attributes.get('data') or attributes.get('message') or command_type or 'cmd'

            print("\n" + "="*50)
            print(" [DEBUG SMS] ENVIO DIRETO PELO DJANGO")
            print("="*50)
            print(f" Dispositivo ID : {device_id}")
            print(f" Telefone       : {phone}")
            print(f" Mensagem       : {message}")
            print("="*50 + "\n")

            if not phone:
                return Response({"error": "Dispositivo não tem número de telefone cadastrado no Traccar"}, status=status.HTTP_400_BAD_REQUEST)

            # Define as credenciais: prioriza o que vem do frontend, senao busca no traccar.xml
            provider = sms_gateway
            login = sms_login
            token = sms_token

            if not provider or not login or not token:
                # Fallback para o traccar.xml
                import xml.etree.ElementTree as ET, re as re_lib
                traccar_conf_path = r'e:\blrastreamento\Traccar\conf\traccar.xml'
                sms_url = ''
                try:
                    tree = ET.parse(traccar_conf_path)
                    root = tree.getroot()
                    for entry in root.findall('entry'):
                        key = entry.get('key', '')
                        if key == 'sms.http.url':
                            sms_url = entry.text or ''
                except Exception:
                    pass

                if not sms_url:
                    return Response({"error": "Gateway SMS não informado e não configurado no traccar.xml"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                if "kingsms" in sms_url:
                    provider = "kingsms"
                    login_m = re_lib.search(r'login=([^&]+)', sms_url)
                    token_m = re_lib.search(r'token=([^&]+)', sms_url)
                    login = login_m.group(1) if login_m else None
                    token = token_m.group(1) if token_m else None
                elif "smsmarket" in sms_url:
                    provider = "smsmarket"
                    login_m = re_lib.search(r'user=([^&]+)', sms_url)
                    token_m = re_lib.search(r'password=([^&]+)', sms_url)
                    login = login_m.group(1) if login_m else None
                    token = token_m.group(1) if token_m else None

            if not provider or not login or not token:
                return Response({"error": "Credenciais SMS inválidas ou não encontradas"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            try:
                if provider == "kingsms":
                    kingsms_api_url = "http://painel.kingsms.com.br/kingsms/api.php"
                    params = {"acao": "sendsms", "login": login, "token": token, "numero": phone, "msg": message}
                    print(" Enviando para KingSMS API real...")
                    resp = req_lib.get(kingsms_api_url, params=params, timeout=15)
                    print(f" Resposta KingSMS (Status {resp.status_code}): {resp.text}")
                    print("="*50 + "\n")
                    return Response({"success": True, "kingsms_response": resp.text}, status=status.HTTP_200_OK)
                    
                elif provider == "smsmarket":
                    smsmarket_api_url = "https://api.smsmarket.com.br/webservice-rest/send-single"
                    payload = {
                        "type": 2, # SMS Interativo
                        "country_code": "55",
                        "number": phone,
                        "content": message
                    }
                    import requests as req_lib
                    
                    print(f" [DEBUG SMS] Credenciais extraidas - User: '{login}' | Token: '{token}'")
                    print(" Enviando para SMS Market API real...")
                    
                    # Usa o parâmetro auth nativo do requests para evitar qualquer problema de base64/encoding
                    resp = req_lib.post(smsmarket_api_url, data=payload, auth=(login, token), timeout=15)
                    
                    print(f" Resposta SMS Market (Status {resp.status_code}): {resp.text}")
                    print("="*50 + "\n")
                    return Response({"success": True, "smsmarket_response": resp.text}, status=status.HTTP_200_OK)
                else:
                    return Response({"error": "Provedor SMS desconhecido"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                print(f" Erro ao conectar no Gateway SMS: {e}")
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Fluxo normal: envia via Traccar (GPRS/TCP)
        result = client.send_command(device_id, command_type, attributes, command_id)
        if result and not result.get("error"):
            return Response(result, status=status.HTTP_200_OK)
        error_message = result.get("error") if isinstance(result, dict) else "Falha ao enviar comando"
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
        for dev_id in devices_ids:
            if notification_id:
                results.append(client.link_notification_to_device(notification_id, dev_id))
            if geofence_id:
                results.append(client.link_geofence_to_device(geofence_id, dev_id))
            
        return Response({"success": all(results)}, status=status.HTTP_200_OK)

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

from .models import Customer
import datetime

class AsaasCustomerView(APIView):
    """Proxy view para criar clientes no Asaas, salvar no banco local, e opcionalmente criar assinatura"""
    
    def get(self, request):
        customers = Customer.objects.all().order_by('-created_at')
        data = []
        for c in customers:
            user = getattr(c, 'user', None)
            data.append({
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
                "has_access": user is not None,
                "is_active": user.is_active if user else False,
                "has_2fa": bool(c.otp_secret and c.otp_secret != '-')
            })
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        asaas_token = request.headers.get('X-Asaas-Token')
        asaas_env = request.headers.get('X-Asaas-Env', 'sandbox')

        if not asaas_token:
            return Response({"error": "Token do Asaas não fornecido no cabeçalho X-Asaas-Token"}, status=status.HTTP_401_UNAUTHORIZED)

        base_url = "https://api-sandbox.asaas.com/v3" if asaas_env == 'sandbox' else "https://api.asaas.com/v3"
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "access_token": asaas_token
        }

        data = request.data
        
        # 1. Payload do Cliente para o Asaas
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
            "notificationDisabled": True
        }

        # Remove empty keys so Asaas doesn't complain
        customer_payload = {k: v for k, v in customer_payload.items() if v}

        try:
            # Chama API do Asaas para Criar Cliente
            response = requests.post(f"{base_url}/customers", json=customer_payload, headers=headers)
            asaas_data = response.json()
            
            if response.status_code >= 400:
                return Response(asaas_data, status=response.status_code)
                
            asaas_id = asaas_data.get('id')
            
            # Desabilita explicitamente todas as notificações (desmarca as caixas no painel do Asaas)
            try:
                notif_resp = requests.get(f"{base_url}/customers/{asaas_id}/notifications", headers=headers)
                if notif_resp.status_code == 200:
                    for notif in notif_resp.json().get('data', []):
                        notif_id = notif.get('id')
                        requests.put(
                            f"{base_url}/notifications/{notif_id}",
                            json={
                                "emailEnabledForProvider": False,
                                "smsEnabledForProvider": False,
                                "emailEnabledForCustomer": False,
                                "smsEnabledForCustomer": False,
                                "phoneCallEnabledForCustomer": False,
                                "whatsappEnabledForCustomer": False
                            },
                            headers=headers
                        )
            except Exception:
                pass # Ignora erros de notificação para não bloquear a criação
            
            # Formata datas e numeros para o DB
            birth_date = data.get('birth_date')
            if not birth_date:
                birth_date = None
                
            monthly_value = data.get('monthly_value')
            if monthly_value:
                monthly_value = float(monthly_value)
            else:
                monthly_value = None

            due_day = data.get('due_day')
            if due_day:
                due_day = int(due_day)
            else:
                due_day = None
                
            income = data.get('income')
            if income:
                income = float(income)
            else:
                income = None

            # 2. Salva no Banco de Dados Local
            customer = Customer.objects.create(
                asaas_id=asaas_id,
                cpf_cnpj=data.get('cpf_cnpj', ''),
                name=data.get('name', ''),
                contract_name=data.get('contract_name', ''),
                rg=data.get('rg', ''),
                birth_date=birth_date,
                postal_code=data.get('postal_code', ''),
                address=data.get('address', ''),
                address_number=data.get('address_number', ''),
                complement=data.get('complement', ''),
                province=data.get('province', ''),
                city=data.get('city', ''),
                state=data.get('state', ''),
                mobile_phone=data.get('mobile_phone', ''),
                phone=data.get('phone', ''),
                email=data.get('email', ''),
                monthly_value=monthly_value,
                due_day=due_day,
                income=income
            )

            subscription_data = None
            # 3. Cria Assinatura Automática se preenchido
            if monthly_value and due_day:
                # Calcula proximo vencimento
                today = datetime.date.today()
                next_due_date = datetime.date(today.year, today.month, due_day)
                if next_due_date <= today:
                    # Joga pro proximo mes se o dia ja passou ou é hoje
                    if today.month == 12:
                        next_due_date = datetime.date(today.year + 1, 1, due_day)
                    else:
                        next_due_date = datetime.date(today.year, today.month + 1, due_day)

                sub_payload = {
                    "customer": asaas_id,
                    "billingType": "BOLETO", # Padrão
                    "value": monthly_value,
                    "nextDueDate": next_due_date.strftime("%Y-%m-%d"),
                    "cycle": "MONTHLY",
                    "description": f"Mensalidade Rastreador - {data.get('name')}",
                    "notificationDisabled": True
                }
                
                sub_response = requests.post(f"{base_url}/subscriptions", json=sub_payload, headers=headers)
                if sub_response.status_code < 400:
                    subscription_data = sub_response.json()
                    customer.asaas_subscription_id = subscription_data.get('id')
                    customer.save()

            return Response({
                "message": "Cliente criado com sucesso!",
                "customer_id": customer.id,
                "asaas_id": asaas_id,
                "asaas_data": asaas_data,
                "subscription": subscription_data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            
            for payment in data:
                customer_id = payment.get('customer')
                due_date_str = payment.get('dueDate')
                value = payment.get('value', 0)
                
                # Calcula os dias de atraso
                due_date = datetime.datetime.strptime(due_date_str, "%Y-%m-%d").date()
                days_overdue = (today - due_date).days
                
                if customer_id not in overdue_customers:
                    # Tenta pegar o nome do banco local (mais rapido)
                    customer_obj = Customer.objects.filter(asaas_id=customer_id).first()
                    customer_name = customer_obj.name if customer_obj else f"Cliente {customer_id}"
                    
                    overdue_customers[customer_id] = {
                        "asaas_id": customer_id,
                        "name": customer_name,
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
        
        traccar_conf_path = r'e:\blrastreamento\Traccar\conf\traccar.xml'
        
        try:
            with open(traccar_conf_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove qualquer config antiga de sms
            content = re.sub(r'\s*<entry key=\'sms\.http\..*?\'[^>]*>.*?</entry>', '', content, flags=re.DOTALL)
            content = re.sub(r'\s*<entry key=\'sms\.http\..*?\'[^>]*/>', '', content)
            
            # Formata a URL dependendo do provider
            if provider == 'kingsms':
                sms_url = f"http://painel.kingsms.com.br/kingsms/api.php?acao=sendsms&amp;login={login}&amp;token={token}&amp;numero={{phone}}&amp;msg={{message}}"
            elif provider == 'smsmarket':
                sms_url = f"https://api.smsmarket.com.br/webservice-rest/send-single?user={login}&amp;password={token}&amp;number={{phone}}&amp;content={{message}}&amp;type=2&amp;country_code=55"
            else:
                return Response({"error": "Provedor SMS inválido"}, status=status.HTTP_400_BAD_REQUEST)

            # Adiciona a nova config antes de </properties>
            nova_config = f"""
    <!-- SMS Gateway Configuration -->
    <entry key='notificator.types'>web,mail,sms</entry>
    <entry key='sms.http.url'>{sms_url}</entry>
    <entry key='sms.http.template'>
    </entry>
</properties>"""
            
            content = content.replace('</properties>', nova_config)
            
            with open(traccar_conf_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            return Response({"success": f"Gateway {provider} configurado no traccar.xml"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SmsDebugProxyView(APIView):
    """Proxy para debugar o envio de SMS do Traccar pelo KingSMS"""
    def get(self, request):
        numero = request.query_params.get('numero')
        msg = request.query_params.get('msg')
        login = request.query_params.get('login')
        token = request.query_params.get('token')
        
        print("\n" + "="*50)
        print(" [DEBUG SMS] TENTATIVA DE ENVIO DE SMS")
        print("="*50)
        print(f" Destinatário (Número): {numero}")
        print(f" Mensagem: {msg}")
        print(f" Usando Login KingSMS: {login}")
        print(f" Usando Token KingSMS: {token}")
        print("="*50 + "\n")
        
        if not numero or not msg:
            return Response({"error": "Parâmetros insuficientes"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Repassa para o KingSMS real
        kingsms_url = "http://painel.kingsms.com.br/kingsms/api.php"
        params = {
            "acao": "sendsms",
            "login": login,
            "token": token,
            "numero": numero,
            "msg": msg
        }
        
        try:
            print(" Enviando para KingSMS API real...")
            resp = requests.get(kingsms_url, params=params)
            print(f" Resposta KingSMS (Status {resp.status_code}): {resp.text}")
            print("="*50 + "\n")
            return Response({"kingsms_response": resp.text, "status": resp.status_code}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f" Erro ao conectar no KingSMS: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SmsInboundView(APIView):
    """Busca respostas SMS recebidas do rastreador via KingSMS"""
    def get(self, request):
        import requests as req_lib, xml.etree.ElementTree as ET, re as re_lib

        flag = request.query_params.get('flag', 'unread')  # 'unread' ou 'read'

        # Lê credenciais do KingSMS do traccar.xml
        traccar_conf_path = r'e:\blrastreamento\Traccar\conf\traccar.xml'
        king_login, king_token = None, None
        try:
            tree = ET.parse(traccar_conf_path)
            root = tree.getroot()
            for entry in root.findall('entry'):
                key = entry.get('key', '')
                if key == 'sms.http.url':
                    url_val = entry.text or ''
                    login_m = re_lib.search(r'login=([^&]+)', url_val)
                    token_m = re_lib.search(r'token=([^&]+)', url_val)
                    if login_m: king_login = login_m.group(1)
                    if token_m: king_token = token_m.group(1)
        except Exception as e:
            return Response({"error": f"Erro ao ler traccar.xml: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not king_login or not king_token:
            return Response({"error": "Credenciais KingSMS não encontradas no traccar.xml"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        kingsms_url = "https://painel.kingsms.com.br/kingsms/api.php"
        params = {
            "acao": "resposta",
            "login": king_login,
            "token": king_token,
            "flag": flag
        }

        try:
            resp = req_lib.get(kingsms_url, params=params, timeout=15)
            data = resp.json()
            print(f"\n[DEBUG INBOUND SMS] flag={flag} | Resposta: {data}\n")
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
