### DB Schema updates
- Added is_loyal BOOLEAN DEFAULT FALSE to customers table documentation in schema.sql.
- Added price_confirmed BOOLEAN DEFAULT FALSE to delivery_orders table documentation in schema.sql.

### Customers Service & Controller
- Added isLoyal query parameter parsing in getAll and correctly passed it to CustomerService.
- Implemented bulkSetLoyal method to accept array of customer IDs and update is_loyal via in clause.
- Implemented getDeliveryOrders specifically selecting via standard order_category, using import_orders join conceptually with chunking (chunks of 100).
- Implemented updateDeliveryOrderPrices to accept an array of unit price updates and marked price_confirmed = true.
- Protected PUT /bulk-loyal route with CUSTOMERS_SHARED_LOOKUP before /:id routes.
- Added GET /:id/delivery-orders and PUT /:id/delivery-order-prices correctly ordered and protected by CUSTOMERS_DIRECTORY_READ.

### Next
- Type checking passes successfully. No database migrations ran directly.

### DB Schema updates
- Added is_loyal BOOLEAN DEFAULT FALSE to customers table documentation in schema.sql.
- Added price_confirmed BOOLEAN DEFAULT FALSE to delivery_orders table documentation in schema.sql.

### Customers Service & Controller
- Added isLoyal query parameter parsing in getAll and correctly passed it to CustomerService.
- Implemented bulkSetLoyal method to accept array of customer IDs and update is_loyal via in clause.
- Implemented getDeliveryOrders specifically selecting via standard order_category, using import_orders join conceptually with chunking (chunks of 100).
- Implemented updateDeliveryOrderPrices to accept an array of unit price updates and marked price_confirmed = true.
- Protected PUT /bulk-loyal route with CUSTOMERS_SHARED_LOOKUP before /:id routes.
- Added GET /:id/delivery-orders and PUT /:id/delivery-order-prices correctly ordered and protected by CUSTOMERS_DIRECTORY_READ.

### Next
- Type checking passes successfully. No database migrations ran directly.
