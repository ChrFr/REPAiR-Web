# -*- coding: utf-8 -*-
# Generated by Django 1.11.6 on 2017-11-01 12:13
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('asmfa', '0003_auto_20171101_1301'),
    ]

    operations = [
        migrations.RenameField(
            model_name='activity',
            old_name='activitygroup_id',
            new_name='activitygroup',
        ),
        migrations.RenameField(
            model_name='activity2activity',
            old_name='destination',
            new_name='destination2',
        ),
        migrations.RenameField(
            model_name='activity2activity',
            old_name='origin',
            new_name='origin2',
        ),
        migrations.RenameField(
            model_name='activitystock',
            old_name='origin',
            new_name='origin2',
        ),
        migrations.RenameField(
            model_name='actor2actor',
            old_name='destination_id',
            new_name='destination',
        ),
        migrations.RenameField(
            model_name='actor2actor',
            old_name='origin_id',
            new_name='origin',
        ),
        migrations.RenameField(
            model_name='actorstock',
            old_name='origin_id',
            new_name='origin',
        ),
        migrations.RenameField(
            model_name='group2group',
            old_name='destination_id',
            new_name='destination',
        ),
        migrations.RenameField(
            model_name='group2group',
            old_name='origin_id',
            new_name='origin',
        ),
        migrations.RenameField(
            model_name='groupstock',
            old_name='origin_id',
            new_name='origin',
        ),
        migrations.AddField(
            model_name='activity2activity',
            name='destination_id',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='activity2activity',
            name='origin_id',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='activitystock',
            name='origin_id',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='actor',
            name='activity',
            field=models.IntegerField(default=1),
        ),
    ]
