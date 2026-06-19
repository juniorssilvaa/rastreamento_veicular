from django.urls import path
from .views import (
    DashboardStatsView, 
    StatusFalhasView, 
    DashboardV2StatsView,
    TraccarDevicesView,
    TraccarPositionsView,
    TraccarCommandView,
    CreateTestDeviceView,
    TraccarNotificationsView,
    TraccarNotificationDeleteView,
    TraccarNotificationTypesView,
    TraccarGeofencesView,
    TraccarCalendarView,
    TraccarPermissionView,
    TraccarEntityView,
    TraccarEntityDetailView,
    TraccarCommandTypesView,
    TraccarServerInfoView,
    TraccarDeviceDetailView,
    VehiclePhotoUploadView,
    AsaasCustomerView,
    AsaasCustomerDetailView,
    AsaasOverdueCustomersView,
    ConfigSmsGatewayView,
    SmsDebugProxyView,
    SmsInboundView
)
from .views_auth import (
    AuthLoginView,
    AuthUsersView,
    AuthUserDetailView,
    AuthResetPasswordView,
    AuthRemove2FAView,
    AuthUpdate2FAView,
    AuthProfileView,
    AuthUpdateProfileView
)

urlpatterns = [
    # Auth e Controle de Acessos
    path('auth/login/', AuthLoginView.as_view(), name='auth_login'),
    path('auth/users/', AuthUsersView.as_view(), name='auth_users'),
    path('auth/users/<int:customer_id>/', AuthUserDetailView.as_view(), name='auth_user_detail'),
    path('auth/users/<int:customer_id>/reset-password/', AuthResetPasswordView.as_view(), name='auth_reset_password'),
    path('auth/users/<int:customer_id>/remove-2fa/', AuthRemove2FAView.as_view(), name='auth_remove_2fa'),
    path('auth/users/<int:customer_id>/update-2fa/', AuthUpdate2FAView.as_view(), name='auth_update_2fa'),
    path('auth/users/<int:customer_id>/profile/', AuthProfileView.as_view(), name='auth_profile'),
    path('auth/users/<int:customer_id>/update-profile/', AuthUpdateProfileView.as_view(), name='auth_update_profile'),

    path('devices/', DashboardStatsView.as_view(), name='devices_stats'),
    path('status/', StatusFalhasView.as_view(), name='status_stats'),
    path('dashboard-v2/', DashboardV2StatsView.as_view(), name='dashboard_v2'),
    
    # Asaas Integrations
    path('asaas/customers/', AsaasCustomerView.as_view(), name='asaas_customers'),
    path('asaas/customers/<str:asaas_id>/', AsaasCustomerDetailView.as_view(), name='asaas_customer_detail'),
    path('asaas/overdue-customers/', AsaasOverdueCustomersView.as_view(), name='asaas_overdue_customers'),

    # Configs
    path('config/smsgateway/', ConfigSmsGatewayView.as_view(), name='config_smsgateway'),
    path('sms-proxy/', SmsDebugProxyView.as_view(), name='sms_debug_proxy'),
    path('sms/inbound/', SmsInboundView.as_view(), name='sms_inbound'),

    # Real Traccar integration
    path('traccar/devices/', TraccarDevicesView.as_view(), name='traccar_devices'),
    path('traccar/devices/<int:pk>/', TraccarDeviceDetailView.as_view(), name='traccar_device_detail'),
    path('traccar/upload-photo/', VehiclePhotoUploadView.as_view(), name='traccar_upload_photo'),
    path('traccar/positions/', TraccarPositionsView.as_view(), name='traccar_positions'),
    path('traccar/commands/', TraccarCommandView.as_view(), name='traccar_commands'),
    path('traccar/init-test/', CreateTestDeviceView.as_view(), name='traccar_init_test'),
    
    path('traccar/notifications/', TraccarNotificationsView.as_view(), name='traccar_notifications'),
    path('traccar/notifications/<int:pk>/', TraccarNotificationDeleteView.as_view(), name='traccar_notification_delete'),
    path('traccar/notifications/types/', TraccarNotificationTypesView.as_view(), name='traccar_notification_types'),
    path('traccar/geofences/', TraccarGeofencesView.as_view(), name='traccar_geofences'),
    path('traccar/calendars/', TraccarCalendarView.as_view(), name='traccar_calendars'),
    path('traccar/permissions/', TraccarPermissionView.as_view(), name='traccar_permissions'),
    
    # Rotas Dinâmicas
    path('traccar/command-types/', TraccarCommandTypesView.as_view(), name='traccar_command_types'),
    path('traccar/server-info/', TraccarServerInfoView.as_view(), name='traccar_server_info'),
    path('traccar/entity/<str:endpoint>/', TraccarEntityView.as_view(), name='traccar_entity_list'),
    path('traccar/entity/<str:endpoint>/<int:pk>/', TraccarEntityDetailView.as_view(), name='traccar_entity_detail'),
]
