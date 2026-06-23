from rest_framework import serializers
from .models import Product,Order,Inventory,OrderItem,Dealer


class ProductSerializer(serializers.ModelSerializer):
    stock_quantity = serializers.IntegerField(
        source='inventory.quantity',
        read_only=True
    )

    class Meta:
        model = Product
        fields = '__all__'

class ProductMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'sku', 'name', 'price']


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductMinimalSerializer(read_only=True)

    class Meta:
        model=OrderItem
        fields='__all__'

class DealerMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dealer
        fields = ['id', 'name']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    dealer = DealerMinimalSerializer(read_only=True)

    class Meta:
        model=Order
        fields='__all__'

class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model=Inventory
        fields='__all__'



class DealerSerializer(serializers.ModelSerializer):
    orders = OrderSerializer(
        source='order_set',
        many=True,
        read_only=True
    )
    class Meta:
            model=Dealer
            fields='__all__'

#create serializer
class ProductCreateSerializer(serializers.ModelSerializer):
    external_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Product
        fields = [
            "sku",
            "external_id",
            "name",
            "category",
            "price",
            "brand",
            "vehicle_fitment",
            "description"
        ]

    def validate_external_id(self, value):
        return value or None

class InventoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventory
        fields = [
            "product",
            "quantity"
        ]
class DealerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dealer
        fields = [
            "name",
            "email",
            "phone",
            "address",
        ]

class OrderCreateSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    order_number = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model=Order
        fields=[
            "id",
            "dealer",
            "order_number",
            "status",
            "total_amount",
            "created_at"
        ]

class OrderItemCreateSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    
    class Meta:
        model = OrderItem
        fields = [
            "order",
            "product",
            "quantity",
            "unit_price",         
        ]