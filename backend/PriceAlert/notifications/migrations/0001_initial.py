# Generated by Django 5.0.4 on 2025-04-18 13:40

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("products", "0004_alter_pricehistory_effective_price_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Alert",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "alert_type",
                    models.CharField(
                        choices=[
                            ("price_drop", "価格下落"),
                            ("percentage_drop", "割合変動"),
                            ("price_threshold", "閾値通知"),
                        ],
                        max_length=50,
                    ),
                ),
                ("threshold_value", models.IntegerField(blank=True, null=True)),
                ("threshold_percentage", models.IntegerField(blank=True, null=True)),
                (
                    "threshold_type",
                    models.CharField(default="list_price", max_length=20),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user_product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="alerts",
                        to="products.userproduct",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Notification",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "notification_type",
                    models.CharField(
                        choices=[
                            ("price_drop", "価格下落通知"),
                            ("percentage_drop", "割合変動通知"),
                            ("price_threshold", "閾値通知"),
                            ("weekly_report", "週次レポート"),
                        ],
                        max_length=50,
                    ),
                ),
                ("message", models.TextField()),
                ("old_price", models.IntegerField(blank=True, null=True)),
                ("new_price", models.IntegerField(blank=True, null=True)),
                ("is_read", models.BooleanField(default=False)),
                ("sent_at", models.DateTimeField(auto_now_add=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "alert",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="notifications.alert",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="products.product",
                    ),
                ),
                (
                    "product_on_ec_site",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="products.productonecsite",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-sent_at"],
            },
        ),
        migrations.AddIndex(
            model_name="alert",
            index=models.Index(
                fields=["alert_type"], name="notificatio_alert_t_c9557f_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="alert",
            index=models.Index(
                fields=["is_active"], name="notificatio_is_acti_3da29f_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["user"], name="notificatio_user_id_c291d5_idx"),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(
                fields=["notification_type"], name="notificatio_notific_f2898f_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(
                fields=["is_read"], name="notificatio_is_read_9edb86_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(
                fields=["sent_at"], name="notificatio_sent_at_265656_idx"
            ),
        ),
    ]
