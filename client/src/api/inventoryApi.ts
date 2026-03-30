import axiosClient from './axiosClient';

export const inventoryApi = {
  getWarehouseInventory: (warehouseId: string) => axiosClient.get(`/warehouses/${warehouseId}/inventory`),
};
