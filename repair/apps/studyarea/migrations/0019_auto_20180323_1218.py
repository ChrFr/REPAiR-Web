# Generated by Django 2.0 on 2018-03-23 11:18

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('login', '0008_auto_20180125_1751'),
        ('studyarea', '0018_layer_style'),
    ]

    operations = [
        migrations.CreateModel(
            name='Chart',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('image', models.ImageField(upload_to='charts')),
            ],
            options={
                'abstract': False,
                'default_permissions': ('add', 'change', 'delete', 'view'),
            },
        ),
        migrations.CreateModel(
            name='ChartCategory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('casestudy', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='login.CaseStudy')),
            ],
            options={
                'abstract': False,
                'default_permissions': ('add', 'change', 'delete', 'view'),
            },
        ),
        migrations.AddField(
            model_name='chart',
            name='chart_category',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='studyarea.ChartCategory'),
        ),
    ]
