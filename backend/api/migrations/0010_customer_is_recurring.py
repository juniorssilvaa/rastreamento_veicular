from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_vehiclephoto'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='is_recurring',
            field=models.BooleanField(default=False),
        ),
    ]
