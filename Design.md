# DESIGN.md

# AutoStore - Design Decisions

## Overview

AutoStore is a Sales Order, Inventory Management, and Channel Sync platform designed for distributors managing products, inventory, dealers, and orders.

The system focuses on maintaining data integrity, preventing overselling, supporting order lifecycle management, and synchronizing product data from external sales channels.

---

# Database Design

## Product

Purpose:

Stores product catalogue information.

Key Fields:

* sku (unique)
* external_id
* name
* category
* price
* brand
* vehicle_fitment
* description

Design Decisions:

* SKU is unique and indexed because it is frequently searched and used for product matching during channel synchronization.
* External ID is stored to map products with external channel feeds.
* Product prices are stored separately from orders so future price changes do not affect historical orders.

---

## Inventory

Purpose:

Maintains stock levels for products.

Relationship:

```text
Product 1 ---- 1 Inventory
```

Design Decisions:

* OneToOne relationship ensures each product has exactly one inventory record.
* Quantity is stored separately from Product to keep inventory concerns isolated.
* Inventory updates do not affect historical orders.

---

## Dealer

Purpose:

Stores dealer/customer information.

Key Fields:

* name
* email
* phone
* address

Design Decisions:

* Email and phone number are unique.
* Dealers can have multiple orders.

Relationship:

```text
Dealer 1 ---- Many Orders
```

---

## Order

Purpose:

Stores dealer orders and workflow status.

Key Fields:

* dealer
* order_number
* status
* total_amount
* timestamps

Status Flow:

```text
Draft
  ↓
Confirmed
  ↓
Delivered
```

Design Decisions:

* Order number is auto-generated.
* Status is controlled using predefined choices.
* Total amount is automatically calculated.

---

## OrderItem

Purpose:

Stores individual products within an order.

Relationship:

```text
Order 1 ---- Many OrderItems
```

Design Decisions:

* Stores quantity, unit price, and line total.
* Unit price is stored at order time to preserve pricing history.
* Line total is automatically calculated.

---

# on_delete Strategy

## Product → OrderItem

```python
PROTECT
```

Reason:

Ordered products should never disappear from historical orders.

---

## Dealer → Order

```python
PROTECT
```

Reason:

Dealers with existing orders should not be removed accidentally.

---

## Order → OrderItem

```python
CASCADE
```

Reason:

If an order is removed, its line items should also be removed.

---

## Product → Inventory

```python
CASCADE
```

Reason:

Inventory has no meaning without a product.

---

# Indexing Strategy

Indexed Fields:

* Product.sku
* Product.external_id
* Product.name
* Product.category
* Dealer.phone
* Order.order_number
* Order.total_amount

Reason:

These fields are frequently searched, filtered, or used during synchronization and order processing.

---

# Order Workflow

## Draft

* Editable
* No stock impact

## Confirmed

* Stock validated
* Inventory deducted
* Order locked

## Delivered

* Final state
* No further modifications allowed

Invalid transitions are rejected.

---

# Stock Validation

During order confirmation:

1. Every line item is checked.
2. Requested quantity must be less than or equal to available inventory.
3. If any item fails validation, the entire order is rejected.

Example:

```text
Available: 5
Requested: 10

Result:
Order Rejected
```

---

# Auto Calculations

## Line Total

```text
line_total = quantity × unit_price
```

## Order Total

```text
total_amount = sum(all line totals)
```

## Order Number

Format:

```text
ORD-YYYYMMDD-XXXXXXXX
```

Generated automatically when the order is created.

---

# Concurrency Strategy

To prevent overselling:

* Stock validation occurs before inventory deduction.
* Inventory updates occur only during order confirmation.
* The confirmation process is executed as a single atomic transaction.

Expected Result:

```text
Two dealers attempt to purchase the last unit
        ↓
Only one confirmation succeeds
        ↓
Inventory never becomes negative
```

This ensures stock consistency during concurrent requests.

---

# Channel Sync Design

Source:

```text
channel_feed.json
```

Matching Strategy:

1. Match by SKU.
2. If SKU is unavailable, match using external_id.

Sync Behavior:

## New Product

If no match exists:

```text
Create Product
Create Inventory
```

## Existing Product

If match exists:

```text
Update Product Information
Update Inventory
```

Updated Fields:

* Name
* Category
* Price
* Inventory Quantity

---

# Conflict Resolution

Channel feed is treated as the source of truth.

If local and external values differ:

```text
External Channel Value Wins
```

The local product is updated with the latest channel information.

---

# Idempotency

The synchronization process is idempotent.

Running sync multiple times:

```text
Sync
Sync
Sync
```

produces:

```text
No duplicate products
No duplicate inventory records
No unnecessary data creation
```

Products are matched before creation.

---

# Multi-Tenant Extension

To support multiple suppliers or distributors:

Additional models could be introduced:

* Organization
* Supplier
* Tenant

All products, inventory, dealers, and orders would be scoped to a tenant identifier.

Benefits:

* Data isolation
* Multi-company support
* Shared infrastructure
* Scalable architecture

---

# Assumptions

* SKU values are unique.
* Inventory quantity cannot be negative.
* Product pricing history must be preserved.
* Confirmed and delivered orders are immutable.
* Channel feed data is trusted.
* Inventory adjustments do not modify historical orders.
