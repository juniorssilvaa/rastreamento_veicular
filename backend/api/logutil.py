import logging
import re

logger = logging.getLogger("blrastreamento")


def mask_secret(value, keep=4):
    """Mascara token/senha nos logs (mantém prefixo curto)."""
    if value is None:
        return None
    text = str(value)
    if not text:
        return ""
    if len(text) <= keep:
        return "*" * len(text)
    return f"{text[:keep]}***({len(text)} chars)"


def mask_url_secrets(url):
    if not url:
        return url
    return re.sub(
        r"(password|token|access_token|Authorization)=([^&\s]+)",
        lambda m: f"{m.group(1)}={mask_secret(m.group(2))}",
        str(url),
        flags=re.IGNORECASE,
    )


def log_api_call(service, method, url, status_code=None, detail=None, level=logging.INFO):
    parts = [f"[{service}]", f"{method}", mask_url_secrets(url)]
    if status_code is not None:
        parts.append(f"status={status_code}")
    if detail:
        parts.append(str(detail))
    logger.log(level, " ".join(parts))
