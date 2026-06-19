from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import Customer
import string
import random

class AuthLoginView(APIView):
    def post(self, request):
        username = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        
        # Super admin hardcoded local pra manter o padrao atual do user
        if username in ('admin', 'admin@blrastreamento.com') and password == 'admin':
            return Response({
                "role": "admin",
                "name": "Administrador",
                "requires_2fa": False
            }, status=status.HTTP_200_OK)

        # Tenta autenticar diretamente (username ou email como username)
        user = authenticate(username=username, password=password)
        
        # Se falhou, tenta achar o user pelo email
        if not user:
            try:
                user_obj = User.objects.get(email=username)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
        if user:
            if not user.is_active:
                return Response({"error": "Acesso desativado pelo administrador."}, status=status.HTTP_403_FORBIDDEN)
            
            # Checa se o Customer vinculado tem 2fa
            customer = getattr(user, 'customer_profile', None)
            requires_2fa = False
            has_secret = False
            
            if customer and customer.otp_secret and customer.otp_secret != '-':
                requires_2fa = True
                has_secret = True

            return Response({
                "role": "cliente",
                "name": customer.name if customer else user.username,
                "customer_id": customer.id if customer else None,
                "requires_2fa": requires_2fa,
                "has_secret": has_secret,
                "otp_secret": customer.otp_secret if customer else None
            }, status=status.HTTP_200_OK)
            
        return Response({"error": "Usuário ou senha inválidos."}, status=status.HTTP_401_UNAUTHORIZED)

class AuthUsersView(APIView):
    def get(self, request):
        customers = Customer.objects.all().order_by('-created_at')
        data = []
        for c in customers:
            user = c.user
            data.append({
                "id": c.id,
                "name": c.name,
                "email": c.email or (user.username if user else ''),
                "has_access": user is not None,
                "is_active": user.is_active if user else False,
                "has_2fa": bool(c.otp_secret and c.otp_secret != '-')
            })
        return Response(data, status=status.HTTP_200_OK)

class AuthUserDetailView(APIView):
    def post(self, request, customer_id):
        """ Cria acesso para um customer que nao tem User ainda """
        try:
            customer = Customer.objects.get(id=customer_id)
            if customer.user:
                return Response({"error": "Cliente já possui acesso."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Gera um username simples a partir do email (parte antes do @) ou do nome
            if customer.email:
                base_username = customer.email.split('@')[0].lower()
            else:
                base_username = f"cliente_{customer.id}"
            
            # Garante unicidade adicionando sufixo numérico se necessário
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Gera senha aleatória
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            
            user = User.objects.create_user(username=username, password=password, email=customer.email or '')
            customer.user = user
            customer.save()
            
            return Response({"message": "Acesso gerado com sucesso.", "username": username, "password": password}, status=status.HTTP_201_CREATED)
        except Customer.DoesNotExist:
            return Response({"error": "Cliente não encontrado."}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, customer_id):
        """ Atualiza status (is_active) """
        try:
            customer = Customer.objects.get(id=customer_id)
            if not customer.user:
                return Response({"error": "Cliente não possui acesso criado."}, status=status.HTTP_400_BAD_REQUEST)
            
            is_active = request.data.get('is_active')
            if is_active is not None:
                customer.user.is_active = is_active
                customer.user.save()
            return Response({"message": "Status atualizado.", "is_active": customer.user.is_active}, status=status.HTTP_200_OK)
        except Customer.DoesNotExist:
            return Response({"error": "Cliente não encontrado."}, status=status.HTTP_404_NOT_FOUND)

class AuthResetPasswordView(APIView):
    def post(self, request, customer_id):
        """ Reseta a senha para uma gerada aleatoriamente """
        try:
            customer = Customer.objects.get(id=customer_id)
            if not customer.user:
                return Response({"error": "Cliente não possui acesso criado."}, status=status.HTTP_400_BAD_REQUEST)
            
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            customer.user.set_password(password)
            customer.user.save()
            
            return Response({"message": "Senha resetada com sucesso.", "new_password": password}, status=status.HTTP_200_OK)
        except Customer.DoesNotExist:
            return Response({"error": "Cliente não encontrado."}, status=status.HTTP_404_NOT_FOUND)

class AuthRemove2FAView(APIView):
    def post(self, request, customer_id):
        """ Remove o 2FA limpando o otp_secret """
        try:
            customer = Customer.objects.get(id=customer_id)
            customer.otp_secret = None
            customer.save()
            return Response({"message": "2FA removido com sucesso."}, status=status.HTTP_200_OK)
        except Customer.DoesNotExist:
            return Response({"error": "Cliente não encontrado."}, status=status.HTTP_404_NOT_FOUND)

class AuthProfileView(APIView):
    def get(self, request, customer_id):
        """ Retorna os dados do perfil do cliente logado """
        try:
            customer = Customer.objects.get(id=customer_id)
            user = customer.user
            return Response({
                "name": customer.name,
                "username": user.username if user else '',
                "email": customer.email or '',
                "otp_secret": customer.otp_secret or ''
            }, status=status.HTTP_200_OK)
        except Customer.DoesNotExist:
            return Response({"error": "Cliente não encontrado."}, status=status.HTTP_404_NOT_FOUND)

class AuthUpdateProfileView(APIView):
    def put(self, request, customer_id):
        """ Atualiza username e/ou senha do cliente """
        try:
            customer = Customer.objects.get(id=customer_id)
            user = customer.user
            if not user:
                return Response({"error": "Usuário sem acesso criado."}, status=status.HTTP_400_BAD_REQUEST)
            
            new_username = request.data.get('username', '').strip()
            new_password = request.data.get('password', '').strip()

            if new_username and new_username != user.username:
                if User.objects.filter(username=new_username).exclude(id=user.id).exists():
                    return Response({"error": "Este nome de usuário já está em uso."}, status=status.HTTP_400_BAD_REQUEST)
                user.username = new_username
            
            if new_password:
                user.set_password(new_password)
            
            user.save()
            return Response({"message": "Perfil atualizado com sucesso."}, status=status.HTTP_200_OK)
        except Customer.DoesNotExist:
            return Response({"error": "Cliente não encontrado."}, status=status.HTTP_404_NOT_FOUND)

class AuthUpdate2FAView(APIView):
    def post(self, request, customer_id):
        """ Atualiza o otp_secret do cliente vindo do Perfil """
        try:
            customer = Customer.objects.get(id=customer_id)
            otp_secret = request.data.get('otp_secret')
            
            customer.otp_secret = otp_secret
            customer.save()
            return Response({"message": "2FA atualizado no banco de dados."}, status=status.HTTP_200_OK)
        except Customer.DoesNotExist:
            return Response({"error": "Cliente não encontrado."}, status=status.HTTP_404_NOT_FOUND)
