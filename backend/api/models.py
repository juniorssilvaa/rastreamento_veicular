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
