import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SearchScreen from './SearchScreen';
import ProfileScreen from './ProfileScreen';
import FloatingNavBar from './FloatingNavBar';
import PerfumeDetails from './PerfumeDetails';
import CollectionDetails from './CollectionDetails';
import { SearchProvider } from './context/SearchContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedPerfumeId, setSelectedPerfumeId] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset detail view when switching tabs
    if (tab !== 'discover') {
      setSelectedPerfumeId(null);
    }
    // Reset collection view when switching tabs
    if (tab !== 'profile') {
      setSelectedCollection(null);
    }
  };

  const handleSelectCollection = (collection) => {
    setSelectedCollection(collection);
  };

  const handleBackFromCollection = () => {
    setSelectedCollection(null);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SearchProvider>
        <View style={styles.container}>
          {selectedPerfumeId ? (
            <PerfumeDetails
              perfumeId={selectedPerfumeId}
              onBack={() => setSelectedPerfumeId(null)}
            />
          ) : selectedCollection ? (
            <CollectionDetails
              collectionId={selectedCollection.id}
              collectionName={selectedCollection.name}
              onBack={handleBackFromCollection}
              onSelectPerfume={setSelectedPerfumeId}
            />
          ) : activeTab === 'discover' ? (
            <SearchScreen onSelectPerfume={setSelectedPerfumeId} />
          ) : (
            <ProfileScreen onSelectCollection={handleSelectCollection} />
          )}
          <FloatingNavBar activeTab={activeTab} onTabChange={handleTabChange} />
        </View>
      </SearchProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
