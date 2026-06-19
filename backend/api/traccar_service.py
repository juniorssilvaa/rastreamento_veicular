import requests
from requests.auth import HTTPBasicAuth

class TraccarClient:
    def __init__(self, base_url="http://localhost:8082", username="contato@niochat.com.br", password="admin"):
        self.base_url = f"{base_url}/api"
        self.auth = HTTPBasicAuth(username, password)
        self.headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

    def get_devices(self):
        """Busca lista de todos os dispositivos (all=true para visibilidade total)"""
        try:
            response = requests.get(f"{self.base_url}/devices", auth=self.auth, headers=self.headers, params={"all": "true"})
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Erro ao buscar dispositivos no Traccar: {e}")
            return []

    def get_positions(self, device_id=None):
        """Busca posições em tempo real. Se device_id for fornecido, busca apenas dele."""
        params = {}
        if device_id:
            params['deviceId'] = device_id
        
        try:
            response = requests.get(f"{self.base_url}/positions", auth=self.auth, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Erro ao buscar posições no Traccar: {e}")
            return []

    def send_command(self, device_id, command_type=None, attributes=None, command_id=None, text_channel=False):
        """Envia um comando (dinâmico por type ou salvo por id)"""
        payload = {
            "deviceId": device_id,
            "attributes": attributes or {}
        }
        
        # Força envio via SMS se especificado, ou se o comando for explicitamente sendSms
        if text_channel or command_type == 'sendSms':
            payload["textChannel"] = True
            
        if command_id:
            payload["id"] = int(command_id)
        else:
            payload["type"] = command_type
            
        try:
            response = requests.post(f"{self.base_url}/commands/send", auth=self.auth, headers=self.headers, json=payload)
            response.raise_for_status()
            return response.json() if response.status_code != 204 else {"success": True}
        except requests.exceptions.HTTPError as e:
            error_text = e.response.text if e.response is not None else str(e)
            if "is not supported in protocol" in error_text:
                first_line = error_text.strip().splitlines()[0]
                friendly_error = first_line.replace("java.lang.RuntimeException:", "").strip()
                return {"error": friendly_error}
            print(f"Erro ao enviar comando no Traccar (HTTP): {error_text}")
            return {"error": error_text}
        except requests.exceptions.RequestException as e:
            print(f"Erro ao enviar comando no Traccar: {e}")
            return {"error": str(e)}

    def create_test_device(self, name="Dispositivo de Teste", unique_id="123456789"):
        """Cria um dispositivo de teste se necessário"""
        payload = {
            "name": name,
            "uniqueId": unique_id,
              "status": "online"
        }
        try:
            response = requests.post(f"{self.base_url}/devices", auth=self.auth, headers=self.headers, json=payload)
            return response.json()
        except Exception as e:
            print(f"Erro ao criar dispositivo de teste: {e}")
            return None

    def get_notifications(self):
        """Busca lista de notificações configuradas"""
        try:
            response = requests.get(f"{self.base_url}/notifications", auth=self.auth, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar notificações: {e}")
            return []

    def get_notification_types(self):
        """Busca tipos de eventos suportados pelo Traccar"""
        try:
            response = requests.get(f"{self.base_url}/notifications/types", auth=self.auth, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar tipos de notificações: {e}")
            return []

    def save_notification(self, data):
        """Salva uma nova regra de notificação"""
        try:
            response = requests.post(f"{self.base_url}/notifications", auth=self.auth, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao salvar notificação: {e}")
            return None

    def delete_notification(self, notification_id):
        """Exclui uma notificação"""
        try:
            response = requests.delete(f"{self.base_url}/notifications/{notification_id}", auth=self.auth, headers=self.headers)
            return response.status_code == 204
        except Exception as e:
            print(f"Erro ao excluir notificação: {e}")
            return False

    def get_geofences(self):
        """Busca cercas virtuais"""
        try:
            response = requests.get(f"{self.base_url}/geofences", auth=self.auth, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar cercas: {e}")
            return []

    def get_calendars(self):
        """Busca calendários disponíveis"""
        try:
            response = requests.get(f"{self.base_url}/calendars", auth=self.auth, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar calendários: {e}")
            return []

    def save_calendar(self, data):
        """Cria ou atualiza um calendário"""
        try:
            response = requests.post(f"{self.base_url}/calendars", auth=self.auth, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao salvar calendário: {e}")
            return None

    def link_notification_to_device(self, notification_id, device_id):
        """Vincula uma notificação a um dispositivo específico"""
        payload = {
            "notificationId": notification_id,
            "deviceId": device_id
        }
        try:
            response = requests.post(f"{self.base_url}/permissions", auth=self.auth, headers=self.headers, json=payload)
            return response.status_code == 204
        except Exception as e:
            print(f"Erro ao vincular permissão: {e}")
            return False

    def link_geofence_to_device(self, geofence_id, device_id):
        """Vincula uma cerca virtual a um dispositivo específico"""
        payload = {
            "geofenceId": geofence_id,
            "deviceId": device_id
        }
        try:
            response = requests.post(f"{self.base_url}/permissions", auth=self.auth, headers=self.headers, json=payload)
            return response.status_code == 204
        except Exception as e:
            print(f"Erro ao vincular permissão de cerca: {e}")
            return False

    def get_command_types(self, device_id):
        """Busca tipos de comandos suportados por um dispositivo específico"""
        try:
            params = {"deviceId": device_id} if device_id else None
            response = requests.get(f"{self.base_url}/commands/types", auth=self.auth, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar tipos de comandos: {e}")
            return []

    def get_saved_commands(self):
        """Busca lista de comandos salvos (Traccar 5.x/6.x usa /commands)"""
        try:
            response = requests.get(f"{self.base_url}/commands", auth=self.auth, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar comandos salvos: {e}")
            return []

    def save_entity(self, endpoint, data):
        """Método genérico para salvar entidades (drivers, groups, etc)"""
        try:
            response = requests.post(f"{self.base_url}/{endpoint}", auth=self.auth, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao salvar entidade {endpoint}: {e}")
            return None

    def get_entities(self, endpoint, params=None):
        """Método genérico para buscar entidades (aceita parâmetros como all=true)"""
        if params is None:
            params = {"all": "true"}
        try:
            response = requests.get(f"{self.base_url}/{endpoint}", auth=self.auth, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar entidades {endpoint}: {e}")
            return []

    def update_entity(self, endpoint, entity_id, data):
        """Método genérico para atualizar entidades via PUT"""
        try:
            response = requests.put(f"{self.base_url}/{endpoint}/{entity_id}", auth=self.auth, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao atualizar entidade {endpoint}: {e}")
            return None

    def delete_entity(self, endpoint, entity_id):
        """Método genérico para excluir entidades"""
        try:
            response = requests.delete(f"{self.base_url}/{endpoint}/{entity_id}", auth=self.auth, headers=self.headers)
            return response.status_code == 204
        except Exception as e:
            print(f"Erro ao excluir entidade {endpoint}: {e}")
            return False

    def get_server_info(self):
        """Busca informações globais do servidor (incluindo versões e capacidades)"""
        try:
            response = requests.get(f"{self.base_url}/server", auth=self.auth, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar info do servidor: {e}")
            return {}
