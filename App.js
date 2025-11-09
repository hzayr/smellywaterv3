import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SearchScreen from './SearchScreen';
import ProfileScreen from './ProfileScreen';
import FloatingNavBar from './FloatingNavBar';
import PerfumeDetails from './PerfumeDetails';

export default function App() {
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedPerfumeId, setSelectedPerfumeId] = useState(null);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset detail view when switching tabs
    if (tab !== 'discover') {
      setSelectedPerfumeId(null);
    }
  };

  return (
    <View style={styles.container}>
      {selectedPerfumeId ? (
        <PerfumeDetails
          perfumeId={selectedPerfumeId}
          onBack={() => setSelectedPerfumeId(null)}
        />
      ) : activeTab === 'discover' ? (
        <SearchScreen onSelectPerfume={setSelectedPerfumeId} />
      ) : (
        <ProfileScreen />
      )}
      <FloatingNavBar activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
