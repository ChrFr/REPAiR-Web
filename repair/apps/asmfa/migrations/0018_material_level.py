# Generated by Django 2.0 on 2018-01-29 13:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('asmfa', '0017_auto_20180129_1444'),
    ]

    operations = [
        migrations.AddField(
            model_name='material',
            name='level',
            field=models.IntegerField(default=1),
            preserve_default=False,
        ),
    ]
