import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const UserScreen = () => {
  const passwords = [
    { id: '1', site: 'Google', pass: '********' },
    { id: '2', site: 'GitHub', pass: '********' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Password Vault</Text>
      <FlatList
        data={passwords}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.passItem}>
            <Text style={styles.siteName}>{item.site}</Text>
            <Text>{item.pass}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  passItem: { padding: 15, backgroundColor: '#f9f9f9', marginBottom: 10, borderRadius: 5 },
  siteName: { fontWeight: 'bold' }
});

export default UserScreen;
