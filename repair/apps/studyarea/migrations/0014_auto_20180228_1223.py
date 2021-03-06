# Generated by Django 2.0 on 2018-02-28 11:23

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('studyarea', '0013_auto_20180227_1640'),
    ]

    operations = [
        migrations.AddField(
            model_name='layer',
            name='credentials_needed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='layer',
            name='service_layers',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='layer',
            name='service_version',
            field=models.TextField(blank=True, null=True),
        ),
    ]
