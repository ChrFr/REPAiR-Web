# -*- coding: utf-8 -*-
# Generated by Django 1.11.5 on 2017-11-06 12:48
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('asmfa', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='activity',
            name='done',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='activitygroup',
            name='done',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='actor',
            name='done',
            field=models.BooleanField(default=False),
        ),
    ]
