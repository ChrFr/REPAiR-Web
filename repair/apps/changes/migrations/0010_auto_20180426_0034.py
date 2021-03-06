# Generated by Django 2.0 on 2018-04-25 22:34

from django.db import migrations, models
import repair.apps.utils.protect_cascade


class Migration(migrations.Migration):

    dependencies = [
        ('changes', '0009_auto_20180413_1506'),
    ]

    operations = [
        migrations.AlterField(
            model_name='solution',
            name='solution_category',
            field=models.ForeignKey(on_delete=repair.apps.utils.protect_cascade.PROTECT_CASCADE, to='changes.SolutionCategory'),
        ),
        migrations.AlterField(
            model_name='solution',
            name='user',
            field=models.ForeignKey(on_delete=repair.apps.utils.protect_cascade.PROTECT_CASCADE, to='login.UserInCasestudy'),
        ),
    ]
