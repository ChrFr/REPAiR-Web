# Generated by Django 2.0 on 2018-03-27 14:55

from django.db import migrations, models
import djmoney.models.fields


class Migration(migrations.Migration):

    dependencies = [
        ('asmfa', '0024_productfraction_publication'),
    ]

    operations = [
        migrations.AddField(
            model_name='productfraction',
            name='avoidable',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='actor',
            name='employees',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='actor',
            name='turnover',
            field=djmoney.models.fields.MoneyField(blank=True, decimal_places=2, default=None, default_currency='EUR', max_digits=20, null=True),
        ),
    ]
