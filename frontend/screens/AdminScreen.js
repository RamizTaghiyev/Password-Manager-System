import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const AdminScreen = () => {
  const users = [
    { id: '1', name: 'User A' },
    { id: '2', name: 'User B' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text>Manage your users here:</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.userItem}>
            <Text>{item.name}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  userItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' }
});

export default AdminScreen;
