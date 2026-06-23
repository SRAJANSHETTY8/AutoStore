from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from .models import Product,Order,Inventory,OrderItem,Dealer
from .serializers import ProductSerializer,InventorySerializer,OrderSerializer,OrderItemSerializer,DealerSerializer,ProductCreateSerializer,DealerCreateSerializer,InventoryCreateSerializer,OrderCreateSerializer,OrderItemCreateSerializer

@api_view(['GET'])
def greet(request):
    return Response ({"message":"initiation endpoint"})

#for products
@api_view(['GET'])
def fetch_products(request):
    limit = int(request.GET.get("limit", 10))
    offset = int(request.GET.get("offset", 0))
    products = Product.objects.all()[offset:offset + limit]
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_product(request,id):
    product=Product.objects.filter(id=id).first()
    if  not product:   
        return Response({"error":"Product not Found"},status=404)
    serializer=ProductSerializer(product)
    return Response(serializer.data)
        

@api_view(['PUT'])
def update_product(request,id):
    product=Product.objects.filter(id=id).first()
    if not product:
        return Response({"error":"Product not Found"},status=404)
    serializer=ProductCreateSerializer(product,data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors,status=400)
    

@api_view(['DELETE'])
def Delete_product(request,id):
    product=Product.objects.filter(id=id).first()
    if not product:
        return Response({"error":"Product not Found"},status=404)
    product.delete()
    return Response({"sucess":"Product Deleted Successfully"},status=200)

@api_view(['POST'])
def add_products(request):
    serializer=ProductCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return  Response(serializer.data,status=201)
    return Response(serializer.errors,status=400)

#for dealers
@api_view(['GET'])
def get_dealers(request):
    dealer=Dealer.objects.all()
    serializer=DealerSerializer(dealer,many=True)
    return Response(serializer.data)

@api_view(['PUT'])
def update_dealer(request,id):
    dealer=Dealer.objects.filter(id=id).first()
    if not dealer:
        return Response({"error":"Dealer not Found"},status=404)
    serializer=DealerCreateSerializer(dealer,data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors,status=400)


@api_view(['GET'])
def get_dealer(request,id):
    dealer=Dealer.objects.filter(id=id).first()
    if  not dealer:   
        return Response({"error":"dealer not Found"},status=404)
    serializer=DealerSerializer(dealer)
    return Response(serializer.data)

@api_view(['POST'])
def add_dealers(request):
    serializer=DealerCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data,status=201)
    return Response(serializer.errors,status=400)

#for inventory 
@api_view(['GET'])
def get_inventory (request):
    inventory =Inventory.objects.all()
    serializer=InventorySerializer(inventory ,many=True)
    return Response(serializer.data)

@api_view(['PUT'])
def update_inventory(request,product_id):
    inventory=Inventory.objects.filter(product_id=product_id).first()
    if not inventory:
        return Response({"error":"inventory not Found"},status=404)
    serializer=InventoryCreateSerializer(inventory,data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors,status=400)

@api_view(['POST'])
def add_inventory(request):
    serializer=InventoryCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data,status=201)
    return Response(serializer.errors,status=400)

#for orders
@api_view(['GET'])
def get_orders(request):
    orders = Order.objects.all()

    status = request.GET.get("status")
    dealer = request.GET.get("dealer")

    if status:
        orders = orders.filter(status=status)

    if dealer:
        orders = orders.filter(dealer_id=dealer)

    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_order(request,id):
    order=Order.objects.filter(id=id).first()
    if  not order:   
        return Response({"error":"Order not Found"},status=404)
    serializer=OrderSerializer(order)
    return Response(serializer.data)


@api_view(['PUT'])
def update_order(request,id):
    order=Order.objects.filter(id=id).first()
    if not order:
        return Response({"error":"order not Found"},status=404)
    if order.status!="DRAFT":
        return Response({"error":"Not allowed to Change"},status=400)
    serializer=OrderCreateSerializer(order,data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors,status=400)

@api_view(['POST'])
def add_orders(request):
    serializer=OrderCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data,status=201)
    return Response(serializer.errors,status=400)

#for orderitems
@api_view(['GET'])
def get_orderitems(request):
    orders_item = OrderItem.objects.all()
    serializer = OrderItemSerializer(orders_item, many=True)
    return Response(serializer.data)

from decimal import Decimal, InvalidOperation

@api_view(['POST'])
def add_orderitems(request):
    order_id = request.data.get('order')
    product_id = request.data.get('product')

    try:
        quantity = int(request.data.get('quantity'))
        unit_price = Decimal(str(request.data.get('unit_price')))
    except (TypeError, ValueError, InvalidOperation):
        return Response({"error": "Invalid quantity or unit_price"}, status=400)
    
    order = Order.objects.filter(id=order_id).first()
    product = Product.objects.filter(id=product_id).first()
    
    if not order:
        return Response({"error": "Order not found"}, status=400)
    if not product:
        return Response({"error": "Product not found"}, status=400)
    
    item = OrderItem.objects.create(
        order=order,
        product=product,
        quantity=quantity,
        unit_price=unit_price
    )
    
    return Response({
        "id": item.id,
        "order": order.id,
        "product": product.id,
        "quantity": item.quantity,
        "unit_price": str(item.unit_price),
        "line_total": str(item.line_total)
    }, status=201)

#To place order
@api_view(['POST'])
def place_order(request,order_id):
    with transaction.atomic():
        order=Order.objects.filter(id=order_id).first()
        if not  order:
            return Response({"error":"Order not Found"},status=404)
        if order.status!="DRAFT":
            return Response({"error":"Order Cannot Be Placed"},status=400)
        order_items=OrderItem.objects.filter(order_id=order_id).all()
        if not order_items:
            return Response({"error":"Something Went Wrong.Please Try Again After Sometime"},status=404)
        for items in order_items:
            quantity=items.quantity
            product=items.product
            inventory_info=Inventory.objects.select_for_update().filter(product=product).first()
            if not inventory_info:
                return Response({"error": f"No inventory record found for {product.name}"},status=400)
            if inventory_info.quantity<quantity:
                return Response({"error": f"Insufficient stock for {product.name}", "available":inventory_info.quantity,"requested": quantity},status=400)
            inventory_info.quantity-=quantity
            inventory_info.save()
        order.status="CONFIRMED"
        order.save()
    return Response({"success":"The Order Confirmed Successfully"},status=200)

#  for the  delivery synch
@api_view(['POST'])
def delivery_update(request,order_id):
    order=Order.objects.filter(id=order_id).first()
    if not order:
        return Response({"error":"Order not Found"},status=404)
    if order.status!="CONFIRMED":
        return Response({"error":"Please Confirm The Order"},status=400)
    order.status="DELIVERED"
    order.save()
    return Response({"success":"The Order Devlivered Sucessfully"},status=200)
    

#channelsynch endpoint
@api_view(['POST'])
def channel_synch(request):
    products= request.data
    if isinstance(products, dict):
        products = [products]
    created_count=0
    updated_count=0
    for item in products:
        external_id = item.get("external_id")
        sku = item.get("sku")

        new_product = None

        if external_id:
            new_product = Product.objects.filter(
                external_id=external_id
            ).first()

        if not new_product and sku:
            new_product = Product.objects.filter(
                sku=sku
            ).first()
        if new_product:
            serializer=ProductCreateSerializer(new_product,data=item)
            if serializer.is_valid():
                    updated_count += 1
                    product = serializer.save()

                    stock = item.get("stock")
                    if stock is not None:
                        Inventory.objects.update_or_create(
                            product=product,
                            defaults={"quantity": stock}
                        )
            else:
                return Response(serializer.errors,status=400)
        else:
            serializer=ProductCreateSerializer(data=item)
            if serializer.is_valid():
                created_count += 1
                product = serializer.save()

                stock = item.get("stock")
                if stock is not None:
                    Inventory.objects.update_or_create(
                        product=product,
                        defaults={"quantity": stock}
                    )
            else:
                return Response(serializer.errors,status=400)
    return Response({"success": "Channel Sync Completed", "created": created_count,"updated": updated_count}, status=200)