# -*- coding: utf-8 -*-
# Generated by Django 1.11.5 on 2017-12-18 20:23
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('studyarea', '0003_auto_20171218_2113'),
    ]

    operations = [
        migrations.AddField(
            model_name='cityblock',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='blocks', to='studyarea.Area'),
        ),
        migrations.AddField(
            model_name='citydistrict',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='citydistricts', to='studyarea.Area'),
        ),
        migrations.AddField(
            model_name='cityneighbourhood',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='neighbourhoods', to='studyarea.Area'),
        ),
        migrations.AddField(
            model_name='house',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='houses', to='studyarea.Area'),
        ),
        migrations.AddField(
            model_name='lau1',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='lau1_areas', to='studyarea.Area'),
        ),
        migrations.AddField(
            model_name='lau2',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='lau2_areas', to='studyarea.Area'),
        ),
        migrations.AddField(
            model_name='nuts2',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='nuts2_areas', to='studyarea.Area'),
        ),
        migrations.AddField(
            model_name='nuts3',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='nuts3_areas', to='studyarea.Area'),
        ),
        migrations.AddField(
            model_name='streetsection',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='streetsections', to='studyarea.Area'),
        ),
        migrations.AlterField(
            model_name='continent',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='continents', to='studyarea.Area'),
        ),
        migrations.AlterField(
            model_name='country',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='countries', to='studyarea.Area'),
        ),
        migrations.AlterField(
            model_name='nuts1',
            name='parent_area',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='nuts1_areas', to='studyarea.Area'),
        ),
    ]
