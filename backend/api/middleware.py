import logging
import time

from .logutil import logger


class RequestDebugMiddleware:
    """Loga toda request/response da API no stdout (visível no Portainer)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        path = request.path
        # Evita poluir com estáticos/health
        skip = path.startswith("/static") or path.startswith("/media")
        if not skip:
            logger.info(
                "[HTTP] --> %s %s qs=%s",
                request.method,
                path,
                request.META.get("QUERY_STRING") or "-",
            )

        response = self.get_response(request)

        if not skip:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.info(
                "[HTTP] <-- %s %s status=%s %sms",
                request.method,
                path,
                getattr(response, "status_code", "?"),
                elapsed_ms,
            )
        return response
