# Generated by Django 2.0 on 2018-04-26 17:51

from django.db import migrations, models
import repair.apps.utils.protect_cascade


class Migration(migrations.Migration):

    dependencies = [
        ('statusquo', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='areaofprotection',
            name='sustainability_field',
            field=models.ForeignKey(on_delete=repair.apps.utils.protect_cascade.PROTECT_CASCADE, to='statusquo.SustainabilityField'),
        ),
        migrations.AlterField(
            model_name='impactcategory',
            name='area_of_protection',
            field=models.ForeignKey(on_delete=repair.apps.utils.protect_cascade.PROTECT_CASCADE, to='statusquo.AreaOfProtection'),
        ),
        migrations.AlterField(
            model_name='impactcategoryinsustainability',
            name='impact_category',
            field=models.ForeignKey(on_delete=repair.apps.utils.protect_cascade.PROTECT_CASCADE, to='statusquo.ImpactCategory'),
        ),
        migrations.AlterField(
            model_name='target',
            name='aim',
            field=models.ForeignKey(on_delete=repair.apps.utils.protect_cascade.PROTECT_CASCADE, to='statusquo.Aim'),
        ),
        migrations.AlterField(
            model_name='target',
            name='impact_category',
            field=models.ForeignKey(on_delete=repair.apps.utils.protect_cascade.PROTECT_CASCADE, to='statusquo.ImpactCategory'),
        ),
    ]
