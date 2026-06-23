from django.contrib import admin
from django.urls import path
from core.views import greet,fetch_products,get_product,add_products,update_product,Delete_product,get_dealers,get_dealer,add_dealers,update_dealer,get_inventory,add_inventory,update_inventory,get_order,get_orders,add_orders,update_order,get_orderitems,add_orderitems,place_order,delivery_update,channel_synch

urlpatterns = [
    path('', greet),
    path('admin/', admin.site.urls),
    # Products
    path('products/', fetch_products),
    path('products/<int:id>/', get_product),
    path('products/add/', add_products),
    path('products/<int:id>/update/', update_product),
    path('products/<int:id>/delete/', Delete_product),

    # Dealers
    path('dealers/', get_dealers),
    path('dealers/<int:id>/', get_dealer),
    path('dealers/add/', add_dealers),
    path('dealers/<int:id>/update/', update_dealer),

    # Inventory
    path('inventory/', get_inventory),
    path('inventory/add/', add_inventory),
    path('inventory/<int:product_id>/update/', update_inventory),

    # Orders
    path('orders/', get_orders),
    path('orders/<int:id>/', get_order),
    path('orders/add/', add_orders),
    path('orders/<int:id>/update/', update_order),

    # Order Items
    path('order-items/', get_orderitems),
    path('order-items/add/', add_orderitems),

    # Workflow
    path('orders/<int:order_id>/confirm/', place_order),
    path('orders/<int:order_id>/deliver/', delivery_update),

    # Channel Sync
    path('sync/channel/', channel_synch),
]