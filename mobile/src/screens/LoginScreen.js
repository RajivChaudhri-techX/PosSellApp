import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [showMFA, setShowMFA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (showMFA) {
      if (!mfaToken) {
        Alert.alert('Error', 'Please enter MFA code');
        return;
      }
      setLoading(true);
      try {
        const response = await authAPI.verifyMFA(tempToken, mfaToken);

        // Store auth data
        await AsyncStorage.setItem('authToken', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        await AsyncStorage.setItem('tenantId', tenantId);

        Alert.alert('Success', 'Login successful!');
      } catch (error) {
        console.error('MFA error:', error);
        Alert.alert(
          'MFA Failed',
          error.response?.data?.error || 'Invalid MFA code'
        );
      } finally {
        setLoading(false);
      }
    } else {
      if (!username || !password || !tenantId) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      setLoading(true);
      try {
        const response = await authAPI.login(username, password, tenantId);

        if (response.mfaRequired) {
          setShowMFA(true);
          setTempToken(response.tempToken);
          Alert.alert('MFA Required', 'Please enter your MFA code');
        } else {
          // Store auth data
          await AsyncStorage.setItem('authToken', response.token);
          await AsyncStorage.setItem('user', JSON.stringify(response.user));
          await AsyncStorage.setItem('tenantId', tenantId);

          Alert.alert('Success', 'Login successful!');
        }
      } catch (error) {
        console.error('Login error:', error);
        Alert.alert(
          'Login Failed',
          error.response?.data?.error || 'An error occurred during login'
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ShopXperience</Text>
      <Text style={styles.subtitle}>Mobile POS</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Tenant ID"
          value={tenantId}
          onChangeText={setTenantId}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {showMFA && (
          <TextInput
            style={styles.input}
            placeholder="MFA Code"
            value={mfaToken}
            onChangeText={setMfaToken}
            keyboardType="numeric"
          />
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {showMFA ? 'Verify MFA' : 'Login'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;