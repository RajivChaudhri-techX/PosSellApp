import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { inventoryAPI, productsAPI, locationsAPI } from '../services/api';

const InventoryScreen = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadInventory();
    loadProducts();
    loadLocations();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const response = await inventoryAPI.getInventory();
      setInventory(response.inventory || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getProducts();
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await locationsAPI.getLocations();
      setLocations(response.locations || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const searchInventory = async (query) => {
    if (!query.trim()) {
      loadInventory();
      return;
    }

    setLoading(true);
    try {
      const response = await inventoryAPI.getInventory({ search: query });
      setInventory(response.inventory || []);
    } catch (error) {
      console.error('Error searching inventory:', error);
      Alert.alert('Error', 'Failed to search inventory');
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (item) => {
    setSelectedItem(item);
    setNewQuantity(item.quantity.toString());
    setModalVisible(true);
  };

  const updateInventory = async () => {
    if (!selectedItem || !newQuantity.trim()) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      await inventoryAPI.updateInventory(selectedItem.product_id, selectedItem.location_id, {
        quantity: quantity,
        min_stock: selectedItem.min_stock || 0,
        reorder_point: selectedItem.reorder_point || 0,
      });

      // Update local state
      setInventory(inventory.map(item =>
        item.id === selectedItem.id
          ? { ...item, quantity: quantity }
          : item
      ));

      setModalVisible(false);
      setSelectedItem(null);
      setNewQuantity('');

      Alert.alert('Success', 'Inventory updated successfully');
    } catch (error) {
      console.error('Error updating inventory:', error);
      Alert.alert('Error', 'Failed to update inventory');
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  const getLocationName = (locationId) => {
    const location = locations.find(l => l.id === locationId);
    return location ? location.name : `Location ${locationId}`;
  };

  const getStockStatus = (quantity, reorderPoint = 0) => {
    if (quantity === 0) return { status: 'Out of Stock', color: '#dc3545' };
    if (quantity <= reorderPoint) return { status: 'Reorder Needed', color: '#dc3545' };
    return { status: 'In Stock', color: '#28a745' };
  };

  const renderInventoryItem = ({ item }) => {
    const stockStatus = getStockStatus(item.quantity, item.reorder_point);

    return (
      <TouchableOpacity
        style={styles.inventoryItem}
        onPress={() => openUpdateModal(item)}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.productName}>{getProductName(item.product_id)}</Text>
          <Text style={styles.locationText}>{getLocationName(item.location_id)}</Text>
          <Text style={styles.reorderText}>Reorder Point: {item.reorder_point}</Text>
          <View style={[styles.stockStatus, { backgroundColor: stockStatus.color }]}>
            <Text style={styles.stockStatusText}>{stockStatus.status}</Text>
          </View>
        </View>

        <View style={styles.quantitySection}>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <Text style={styles.quantityLabel}>units</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchInventory(text);
          }}
        />
      </View>

      <FlatList
        data={inventory}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.inventoryList}
        refreshing={loading}
        onRefresh={loadInventory}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Inventory</Text>

            {selectedItem && (
              <View style={styles.modalBody}>
                <Text style={styles.productName}>
                  {getProductName(selectedItem.product_id)}
                </Text>
                <Text style={styles.locationText}>
                  Location: {getLocationName(selectedItem.location_id)}
                </Text>
                <Text style={styles.currentQuantity}>
                  Current Quantity: {selectedItem.quantity}
                </Text>

                <TextInput
                  style={styles.quantityInput}
                  placeholder="New Quantity"
                  value={newQuantity}
                  onChangeText={setNewQuantity}
                  keyboardType="numeric"
                  autoFocus
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.updateButton]}
                    onPress={updateInventory}
                  >
                    <Text style={styles.updateButtonText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  inventoryList: {
    flex: 1,
    padding: 10,
  },
  inventoryItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  reorderText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
  },
  stockStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  stockStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quantitySection: {
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  quantityLabel: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalBody: {
    alignItems: 'center',
  },
  currentQuantity: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    width: '100%',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateButton: {
    backgroundColor: '#007bff',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InventoryScreen;