import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { productsAPI } from '../services/api';
import { getCachedProducts, syncProducts, isOnline } from '../utils/sync';

const ProductSearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Try to load from cache first
      const cachedProducts = await getCachedProducts();
      if (cachedProducts.length > 0) {
        setProducts(cachedProducts);
        setLoading(false);
      }

      // Try to sync with server if online
      const online = await isOnline();
      if (online) {
        const syncedProducts = await syncProducts();
        if (syncedProducts && syncedProducts.length > 0) {
          setProducts(syncedProducts);
        }
      } else if (cachedProducts.length === 0) {
        Alert.alert('Offline', 'No cached products available. Please connect to internet to load products.');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      // If we have cached data, don't show error
      const cachedProducts = await getCachedProducts();
      if (cachedProducts.length === 0) {
        Alert.alert('Error', 'Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query) => {
    if (!query.trim()) {
      loadProducts();
      return;
    }

    setLoading(true);
    try {
      const response = await productsAPI.getProducts({ search: query });
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error searching products:', error);
      Alert.alert('Error', 'Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        product: product
      }]);
    }

    Alert.alert('Success', `${product.name} added to cart`);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity style={styles.productItem} onPress={() => addToCart(item)}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productSku}>SKU: {item.sku}</Text>
        <Text style={styles.productPrice}>${item.price}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addToCart(item)}
      >
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchProducts(text);
          }}
        />
        <TouchableOpacity
          style={styles.barcodeButton}
          onPress={() => navigation.navigate('BarcodeScanner')}
        >
          <Text style={styles.barcodeButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <Text style={styles.cartText}>
            Cart: {getTotalItems()} items - ${getTotalAmount().toFixed(2)}
          </Text>
          <TouchableOpacity
            style={styles.viewCartButton}
            onPress={() => navigation.navigate('Cart', { cart, setCart })}
          >
            <Text style={styles.viewCartButtonText}>View Cart</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        style={styles.productList}
        refreshing={loading}
        onRefresh={loadProducts}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  barcodeButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  barcodeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  cartText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  viewCartButton: {
    backgroundColor: '#2e7d32',
    padding: 8,
    borderRadius: 6,
  },
  viewCartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  productList: {
    flex: 1,
    padding: 10,
  },
  productItem: {
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
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productSku: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ProductSearchScreen;