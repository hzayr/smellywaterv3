import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SearchScreen from './SearchScreen';
import ProfileScreen from './ProfileScreen';
import FloatingNavBar from './FloatingNavBar';

export default function App() {
  const [activeTab, setActiveTab] = useState('discover');

  return (
    <View style={styles.container}>
      {activeTab === 'discover' ? <SearchScreen /> : <ProfileScreen />}
      <FloatingNavBar activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
