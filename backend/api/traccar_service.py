import os
import logging
import requests
from requests.auth import HTTPBasicAuth

from .logutil import logger, log_api_call

class TraccarClient:
    def __init__(self, base_url=None, username=None, password=None):
        base_url = base_url or os.environ.get("TRACCAR_URL", "http://localhost:8082")
        username = username or os.environ.get("TRACCAR_USER", "contato@niochat.com.br")
        password = password or os.environ.get("TRACCAR_PASSWORD", "admin")
        self.base_url = f"{base_url}/api"
        self.auth = HTTPBasicAuth(username, password)
        self.headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        logger.debug("[TRACCAR] client init base_url=%s user=%s", self.base_url, username)

    def _request(self, method, path, **kwargs):
        url = f"{self.base_url}/{path.lstrip('/')}"
        timeout = kwargs.pop("timeout", 30)
        logger.debug("[TRACCAR] %s %s params=%s", method.upper(), url, kwargs.get("params"))
        try:
            response = requests.request(
                method,
                url,
                auth=self.auth,
                headers={**self.headers, **(kwargs.pop("headers", {}) or {})},
                timeout=timeout,
                **kwargs,
            )
            log_api_call("TRACCAR", method.upper(), url, response.status_code)
            return response
        except requests.exceptions.RequestException as e:
            log_api_call("TRACCAR", method.upper(), url, detail=f"erro={e}", level=logging.ERROR)
            raise

    def get_devices(self):
        """Busca lista de todos os dispositivos (all=true para visibilidade total)"""
        try:
            response = self._request("get", "devices", params={"all": "true"})
            response.raise_for_status()
            data = response.json()
            logger.debug("[TRACCAR] devices count=%s", len(data) if isinstance(data, list) else "?")
            return data
        except requests.exceptions.RequestException as e:
            logger.error("[TRACCAR] Erro ao buscar dispositivos: %s", e)
            return []

    def get_positions(self, device_id=None):
        """Busca posições em tempo real. Se device_id for fornecido, busca apenas dele."""
        params = {}
        if device_id:
            params['deviceId'] = device_id

        try:
            response = self._request("get", "positions", params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error("[TRACCAR] Erro ao buscar posições: %s", e)
            return []

    def send_command(self, device_id, command_type=None, attributes=None, command_id=None, text_channel=False):
        """Envia um comando (dinâmico por type ou salvo por id)"""
        payload = {
            "deviceId": device_id,
            "attributes": attributes or {}
        }

        if text_channel or command_type == 'sendSms':
            payload["textChannel"] = True

        if command_id:
            payload["id"] = int(command_id)
        else:
            payload["type"] = command_type

        logger.info(
            "[TRACCAR] send_command deviceId=%s type=%s id=%s textChannel=%s attrs_keys=%s",
            device_id,
            command_type,
            command_id,
            payload.get("textChannel", False),
            list((attributes or {}).keys()),
        )

        try:
            response = self._request("post", "commands/send", json=payload)
            response.raise_for_status()
            result = response.json() if response.status_code != 204 else {"success": True}
            logger.info("[TRACCAR] comando enviado com sucesso deviceId=%s", device_id)
            return result
        except requests.exceptions.HTTPError as e:
            error_text = e.response.text if e.response is not None else str(e)
            if "is not supported in protocol" in error_text:
                first_line = error_text.strip().splitlines()[0]
                friendly_error = first_line.replace("java.lang.RuntimeException:", "").strip()
                logger.warning("[TRACCAR] comando não suportado: %s", friendly_error)
                return {"error": friendly_error}
            logger.error("[TRACCAR] Erro HTTP ao enviar comando: %s", error_text[:500])
            return {"error": error_text}
        except requests.exceptions.RequestException as e:
            logger.error("[TRACCAR] Erro ao enviar comando: %s", e)
            return {"error": str(e)}

    def create_test_device(self, name="Dispositivo de Teste", unique_id="123456789"):
        """Cria um dispositivo de teste se necessário"""
        payload = {
            "name": name,
            "uniqueId": unique_id,
            "status": "online"
        }
        try:
            response = self._request("post", "devices", json=payload)
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao criar dispositivo de teste: %s", e)
            return None

    def get_notifications(self):
        try:
            response = self._request("get", "notifications")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao buscar notificações: %s", e)
            return []

    def get_notification_types(self):
        try:
            response = self._request("get", "notifications/types")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao buscar tipos de notificações: %s", e)
            return []

    def save_notification(self, data):
        try:
            response = self._request("post", "notifications", json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao salvar notificação: %s", e)
            return None

    def delete_notification(self, notification_id):
        try:
            response = self._request("delete", f"notifications/{notification_id}")
            return response.status_code in (200, 204)
        except Exception as e:
            logger.error("[TRACCAR] Erro ao excluir notificação: %s", e)
            return False

    def get_geofences(self):
        try:
            response = self._request("get", "geofences")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao buscar cercas: %s", e)
            return []

    def get_calendars(self):
        try:
            response = self._request("get", "calendars")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao buscar calendários: %s", e)
            return []

    def save_calendar(self, data):
        try:
            response = self._request("post", "calendars", json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao salvar calendário: %s", e)
            return None

    def link_notification_to_device(self, notification_id, device_id):
        """Vincula uma notificação a um dispositivo específico"""
        return self.link_permission({
            "notificationId": notification_id,
            "deviceId": device_id
        })

    def link_geofence_to_device(self, geofence_id, device_id):
        """Vincula uma cerca virtual a um dispositivo específico"""
        return self.link_permission({
            "geofenceId": geofence_id,
            "deviceId": device_id
        })

    def link_permission(self, payload):
        """Cria vínculo genérico no Traccar (/permissions)"""
        try:
            response = self._request("post", "permissions", json=payload)
            ok = response.status_code in (200, 204)
            logger.info("[TRACCAR] permission payload=%s ok=%s", payload, ok)
            return ok
        except Exception as e:
            logger.error("[TRACCAR] Erro ao vincular permissão: %s", e)
            return False

    def get_command_types(self, device_id=None):
        params = {}
        if device_id:
            params["deviceId"] = device_id
        try:
            response = self._request("get", "commands/types", params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao buscar tipos de comandos: %s", e)
            return []

    def get_saved_commands(self):
        try:
            response = self._request("get", "commands")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao buscar comandos salvos: %s", e)
            return []

    def save_entity(self, endpoint, data):
        try:
            response = self._request("post", endpoint, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao salvar entidade %s: %s", endpoint, e)
            return None

    def get_entities(self, endpoint, params=None):
        if params is None:
            params = {"all": "true"}
        try:
            response = self._request("get", endpoint, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao buscar entidades %s: %s", endpoint, e)
            return []

    def update_entity(self, endpoint, entity_id, data):
        try:
            response = self._request("put", f"{endpoint}/{entity_id}", json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao atualizar entidade %s/%s: %s", endpoint, entity_id, e)
            return None

    def delete_entity(self, endpoint, entity_id):
        try:
            response = self._request("delete", f"{endpoint}/{entity_id}")
            return response.status_code == 204
        except Exception as e:
            logger.error("[TRACCAR] Erro ao excluir entidade %s/%s: %s", endpoint, entity_id, e)
            return False

    def get_events(self, from_time=None, to_time=None, event_types=None, device_ids=None):
        from datetime import datetime, timedelta, timezone

        now = datetime.now(timezone.utc)
        if to_time is None:
            to_time = now.isoformat().replace('+00:00', 'Z')
        if from_time is None:
            from_time = (now - timedelta(hours=24)).isoformat().replace('+00:00', 'Z')

        params = [('from', from_time), ('to', to_time)]

        if device_ids:
            for device_id in device_ids:
                params.append(('deviceId', device_id))
        else:
            try:
                devices = self.get_devices()
                for device in devices or []:
                    if device.get('id') is not None:
                        params.append(('deviceId', device['id']))
            except Exception:
                pass

        if event_types:
            for event_type in event_types:
                params.append(('type', event_type))

        if not any(key == 'deviceId' for key, _ in params):
            return []

        try:
            response = self._request(
                "get",
                "reports/events",
                headers={'Accept': 'application/json'},
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            logger.debug("[TRACCAR] events count=%s", len(data) if isinstance(data, list) else "?")
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.error("[TRACCAR] Erro ao buscar eventos: %s", e)
            return []

    def get_server_info(self):
        try:
            response = self._request("get", "server")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[TRACCAR] Erro ao buscar info do servidor: %s", e)
            return {}
