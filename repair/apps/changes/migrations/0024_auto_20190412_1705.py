# Generated by Django 2.1.7 on 2019-04-12 15:05

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('changes', '0023_remove_solution_activities'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='solution',
            name='user',
        ),
        migrations.RemoveField(
            model_name='solutioncategory',
            name='user',
        ),
    ]
