import csv

from django.core.management.base import BaseCommand
from core.models import Product, Inventory


class Command(BaseCommand):
    help = "Import catalogue CSV"

    def handle(self, *args, **kwargs):

        with open("catalogue.csv", newline="", encoding="utf-8") as file:

            reader = csv.DictReader(file)

            count = 0

            for row in reader:

                product, created = Product.objects.get_or_create(
                    sku=row["sku"],
                    defaults={
                        "name": row["name"],
                        "category": row["category"],
                        "brand": row["brand"],
                        "vehicle_fitment": row["vehicle_fitment"],
                        "price": row["price_inr"],
                        "description": row["description"],
                    },
                )

                Inventory.objects.update_or_create(
                    product=product,
                    defaults={
                        "quantity": int(row["stock"])
                    },
                )

                if created:
                    count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {count} products successfully."
            )
        )