import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Keyboard, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getPerfumes, inspectTable, Perfume, searchPerfumes, testConnection } from '@/lib/supabase';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [filteredPerfumes, setFilteredPerfumes] = useState<Perfume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Load all perfumes on component mount
  useEffect(() => {
    loadPerfumes();
  }, []);

  // Filter perfumes based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPerfumes(perfumes);
    } else {
      // Client-side filtering for better UX - only search by Name
      const filtered = perfumes.filter(
        (perfume) =>
          perfume.Name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPerfumes(filtered);
    }
  }, [searchQuery, perfumes]);

  const loadPerfumes = async () => {
    try {
      setLoading(true);
      console.log('Loading perfumes...');
      const data = await getPerfumes();
      console.log('Loaded perfumes:', data.length);
      setPerfumes(data);
      setFilteredPerfumes(data);
    } catch (error) {
      console.error('Error loading perfumes:', error);
      Alert.alert('Error', 'Failed to load perfumes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setDebugInfo('Testing connection...');
      const result = await testConnection();
      if (result.success) {
        setDebugInfo(`Connection successful! Table has ${result.count} perfumes.`);
        Alert.alert('Success', `Connection test passed! Found ${result.count} perfumes in table.`);
      } else {
        const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error 
          ? result.error.message 
          : 'Unknown error';
        setDebugInfo(`Connection failed: ${errorMessage}`);
        Alert.alert('Error', `Connection test failed: ${errorMessage}`);
      }
    } catch (error) {
      setDebugInfo(`Test error: ${error}`);
      Alert.alert('Error', `Test failed: ${error}`);
    }
  };

  const handleInspectTable = async () => {
    try {
      setDebugInfo('Inspecting table structure...');
      const result = await inspectTable();
      if (result.success) {
        const columnInfo = `Columns: ${result.columns?.join(', ') || 'No columns found'}`;
        setDebugInfo(`Table inspection successful! ${columnInfo}`);
        Alert.alert('Table Structure', columnInfo);
        console.log('Full inspection result:', result);
      } else {
        const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error 
          ? result.error.message 
          : 'Unknown error';
        setDebugInfo(`Inspection failed: ${errorMessage}`);
        Alert.alert('Error', `Table inspection failed: ${errorMessage}`);
      }
    } catch (error) {
      setDebugInfo(`Inspection error: ${error}`);
      Alert.alert('Error', `Inspection failed: ${error}`);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      // If search is empty, show the first 10 perfumes
      setFilteredPerfumes(perfumes);
      setSearching(false);
      return;
    }
    
    try {
      setSearching(true);
      console.log('Searching for:', query);
      
      // Use server-side search to query all perfumes in the database
      const searchResults = await searchPerfumes(query);
      console.log('Search results:', searchResults.length);
      
      setFilteredPerfumes(searchResults);
    } catch (error) {
      console.error('Error searching perfumes:', error);
      Alert.alert('Error', 'Failed to search perfumes. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredPerfumes(perfumes);
    setIsSearchFocused(false);
    textInputRef.current?.blur();
  };

  const handleScrollBeginDrag = () => {
    // Only dismiss keyboard when user actively starts dragging/scrolling
    Keyboard.dismiss();
    setIsSearchFocused(false);
  };

  const handleSearchInputFocus = () => {
    // Allow keyboard to show when search input is focused
    // This ensures the keyboard appears even if there's momentum scrolling
    setIsSearchFocused(true);
  };

  const handleSearchInputBlur = () => {
    // Only set focus to false if there's no search query
    if (searchQuery.trim() === '') {
      setIsSearchFocused(false);
    }
  };

  const renderPerfumeCard = ({ item }: { item: Perfume }) => {
    const handleCardPress = () => {
      router.push(`/perfume-details?id=${item.id}`);
    };

    return (
      <TouchableOpacity 
        style={[styles.perfumeCard, { backgroundColor: colors.background }]}
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
        <ThemedView style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url || 'https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image' }}
            style={styles.perfumeImage}
            contentFit="contain"
          />
        </ThemedView>
        <ThemedView style={styles.perfumeInfo}>
          <ThemedText type="subtitle" style={styles.perfumeName} numberOfLines={2}>
            {item.Name}
          </ThemedText>
          {item.Brand && (
            <ThemedText style={styles.perfumeBrand} numberOfLines={1}>
              {item.Brand}
            </ThemedText>
          )}
        </ThemedView>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={styles.loadingText}>Loading perfumes...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Smelly Water
        </ThemedText>
        <ThemedView style={[styles.searchContainer, { backgroundColor: colors.background }]}>
          <IconSymbol name="magnifyingglass" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            ref={textInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by perfume name..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={handleSearchInputFocus}
            onBlur={handleSearchInputBlur}
          />
          {(searchQuery.length > 0 || isSearchFocused) && (
            <TouchableOpacity 
              onPress={clearSearch}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <IconSymbol name="xmark.circle.fill" size={20} color="#666" />
            </TouchableOpacity>
          )}
          {searching && (
            <ActivityIndicator size="small" color={colors.tint} style={styles.searchSpinner} />
          )}
        </ThemedView>
      </ThemedView>
      
      {/* Only show section header and content when not actively typing a search */}
      {!isSearchFocused && searchQuery.trim() === '' && (
        <ThemedView style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Surprise Me!
          </ThemedText>
        </ThemedView>
      )}
      
      {/* Show "Search Results" header when search is focused or there's a search query */}
      {(isSearchFocused || searchQuery.trim() !== '') && (
        <ThemedView style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Search Results
          </ThemedText>
        </ThemedView>
      )}
      
      {filteredPerfumes.length === 0 && !loading ? (
        <ThemedView style={[styles.centerContent, { flex: 1 }]}>
          <ThemedText style={styles.noResultsText}>
            {searchQuery ? 'No perfumes found matching your search.' : 'No perfumes available.'}
          </ThemedText>
          <ThemedText style={styles.debugText}>
            Debug: {perfumes.length} total perfumes loaded
          </ThemedText>
          <ThemedView style={styles.buttonContainer}>
            <Button 
              title="Test Connection" 
              onPress={handleTestConnection}
              color={colors.tint}
            />
            <ThemedView style={styles.buttonSpacer} />
            <Button 
              title="Inspect Table" 
              onPress={handleInspectTable}
              color={colors.tint}
            />
          </ThemedView>
          {debugInfo ? (
            <ThemedText style={styles.debugInfoText}>
              {debugInfo}
            </ThemedText>
          ) : null}
        </ThemedView>
      ) : (
        /* Only show perfume list when not searching or when there are results */
        (!isSearchFocused && searchQuery.trim() === '') || 
        (searchQuery.trim() !== '' && filteredPerfumes.length > 0) ? (
          <FlatList
            data={filteredPerfumes}
            renderItem={renderPerfumeCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.perfumeList}
            showsVerticalScrollIndicator={false}
            numColumns={2}
            refreshing={loading}
            onRefresh={loadPerfumes}
            onScrollBeginDrag={handleScrollBeginDrag}
            scrollEventThrottle={16}
          />
        ) : null
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // Account for status bar
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  noResultsText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  buttonSpacer: {
    width: 16,
  },
  debugInfoText: {
    fontSize: 10,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 48, // Fixed height to prevent expansion
    minHeight: 48, // Ensure minimum height
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 24, // Fixed height for text input
    lineHeight: 20, // Consistent line height
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  perfumeList: {
    padding: 10,
  },
  perfumeCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    maxWidth: '45%',
  },
  imageContainer: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  perfumeImage: {
    width: 120,
    height: 160,
  },
  perfumeInfo: {
    padding: 12,
    alignItems: 'center',
  },
  perfumeName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
  perfumeBrand: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.7,
    color: '#666',
    textAlign: 'center',
  },
}); 