from django.db import models
from datetime import datetime
from uuid import uuid4

class Product(models.Model):
    sku=models.CharField(max_length=100,db_index=True,unique=True)
    external_id = models.CharField(max_length=100,unique=True,null=True,blank=True,db_index=True)
    name=models.CharField(max_length=250,db_index=True)
    category=models.CharField(max_length=250,db_index=True)
    price=models.DecimalField(max_digits=10,decimal_places=2,db_index=True,null=False)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    brand = models.CharField(blank=True,max_length=100,default="")
    vehicle_fitment = models.CharField(blank=True,max_length=200,default="")
    description = models.TextField(blank=True)

class Inventory(models.Model):
    product=models.OneToOneField(Product,on_delete=models.CASCADE,related_name="inventory")
    quantity=models.PositiveIntegerField(default=0)
    updated_at=models.DateTimeField(auto_now=True)

class Dealer(models.Model):
    name=models.CharField(max_length=100)
    email=models.EmailField(unique=True)
    phone=models.CharField(max_length=15,unique=True,db_index=True)
    address=models.CharField(max_length=200)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)


class Order(models.Model):
    dealer = models.ForeignKey(Dealer, on_delete=models.PROTECT)
    def save(self, *args, **kwargs):
        if not self.order_number:
            today = datetime.now().strftime("%Y%m%d")
            unique_part = str(uuid4())[:8].upper()
            self.order_number = f"ORD-{today}-{unique_part}"
        super().save(*args, **kwargs)
    order_number=models.CharField(max_length=50,unique=True,db_index=True)
    STATUS_CHOICES=[
        ("DRAFT", "Draft"),
        ("CONFIRMED", "Confirmed"),
        ("DELIVERED", "Delivered"),
    ]
    status=models.CharField(max_length=25,choices=STATUS_CHOICES,default="DRAFT")
    total_amount=models.DecimalField(max_digits=10,decimal_places=2,db_index=True,default=0)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)


class OrderItem(models.Model):
    def save(self,*args, **kwargs):
        self.line_total=self.quantity*self.unit_price
        super().save(*args, **kwargs)
        total = sum(
            item.line_total
            for item in self.order.items.all()
        )

        self.order.total_amount = total
        self.order.save(update_fields=["total_amount"])
    order=models.ForeignKey(Order, on_delete=models.CASCADE ,related_name="items")
    product=models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity=models.PositiveIntegerField(default=0)
    unit_price=models.DecimalField(max_digits=10,decimal_places=2,db_index=True,null=False)
    line_total=models.DecimalField(max_digits=10,decimal_places=2,default=0)
    created_at=models.DateTimeField(auto_now_add=True)
