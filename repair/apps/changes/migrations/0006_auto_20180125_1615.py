# Generated by Django 2.0 on 2018-01-25 15:15

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('changes', '0005_auto_20180124_1527'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='solution',
            options={'default_permissions': ('add', 'change', 'delete', 'view')},
        ),
        migrations.AlterModelOptions(
            name='solutioncategory',
            options={'default_permissions': ('add', 'change', 'delete', 'view')},
        ),
        migrations.AlterModelOptions(
            name='strategy',
            options={'default_permissions': ('add', 'change', 'delete', 'view')},
        ),
    ]
