from django.db import models
from django.contrib.auth.models import User

class Customer(models.Model):
    # Auth Relation
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='customer_profile')
    otp_secret = models.CharField(max_length=255, null=True, blank=True)
    
    # Asaas relation
    asaas_id = models.CharField(max_length=255, null=True, blank=True)
    asaas_subscription_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Personal Info
    cpf_cnpj = models.CharField(max_length=20)
    name = models.CharField(max_length=255) # Nome/Razão Social
    contract_name = models.CharField(max_length=255, null=True, blank=True)
    rg = models.CharField(max_length=50, null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    
    # Address
    postal_code = models.CharField(max_length=20, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    address_number = models.CharField(max_length=50, null=True, blank=True)
    complement = models.CharField(max_length=255, null=True, blank=True)
    province = models.CharField(max_length=255, null=True, blank=True) # Bairro
    city = models.CharField(max_length=255, null=True, blank=True)
    state = models.CharField(max_length=50, null=True, blank=True)
    
    # Contact
    mobile_phone = models.CharField(max_length=50, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    
    # Financial
    monthly_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    due_day = models.IntegerField(null=True, blank=True)
    income = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True) # Renda/Faturamento
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.cpf_cnpj}"

class Technician(models.Model):
    # Status and general options
    is_active = models.BooleanField(default=True) # Status do Técnico
    permitir_finalizar_os = models.BooleanField(default=False)
    ponto_fixo = models.BooleanField(default=False)
    has_contract = models.BooleanField(default=False) # Mantido por compatibilidade
    
    # Personal info
    name = models.CharField(max_length=255)
    cpf = models.CharField(max_length=20, unique=True)
    
    # Address
    cep = models.CharField(max_length=20, null=True, blank=True)
    numero = models.CharField(max_length=50, null=True, blank=True)
    bairro = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=255, null=True, blank=True)
    state = models.CharField(max_length=50, null=True, blank=True)
    rua = models.CharField(max_length=255, null=True, blank=True)
    complemento = models.CharField(max_length=255, null=True, blank=True)
    
    # Contact
    email = models.EmailField(null=True, blank=True)
    celular = models.CharField(max_length=50, null=True, blank=True)
    whatsapp = models.CharField(max_length=50, null=True, blank=True)
    fone_fixo = models.CharField(max_length=50, null=True, blank=True)
    
    # Financial/Stock
    stock_total = models.IntegerField(default=0)
    valor_instalacao_simples = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valor_instalacao_bloqueio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valor_desinstalacao = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class CommandCombo(models.Model):
    nome = models.CharField(max_length=255)
    comandos = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nome

class VehicleIcon(models.Model):
    name = models.CharField(max_length=255)
    image_url = models.URLField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class SmsCommandHistory(models.Model):
    device_id = models.IntegerField(null=True, blank=True)
    phone_number = models.CharField(max_length=50)
    content = models.TextField()
    status_code = models.IntegerField(default=-1)
    sms_market_id = models.CharField(max_length=100, null=True, blank=True)
    direction = models.CharField(max_length=20, default='outbound')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.direction} - {self.phone_number} - {self.status_code}"

import uuid
class VehiclePhoto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    photo_base64 = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
