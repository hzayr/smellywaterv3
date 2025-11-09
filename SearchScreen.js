import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useSearch } from './context/SearchContext';

export default function SearchScreen({ onSelectPerfume }) {
  const {
    perfumes,
    results,
    searchQuery,
    setSearchQuery,
    loading,
    refreshing,
    searching,
    error,
    performSearch,
    clearSearch,
    refreshRandom,
  } = useSearch();
  const debounceRef = useRef(null);

  const onRefresh = useCallback(() => {
    refreshRandom();
  }, [refreshRandom]);

  const onChangeSearch = (text) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(text), 300);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => onSelectPerfume && onSelectPerfume(item.id)}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: item?.image_url || 'https://via.placeholder.com/200x260/EEEEEE/AAAAAA?text=No+Image' }}
          style={styles.image}
          contentFit="contain"
          transition={150}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.name} numberOfLines={2}>{item?.Name || 'Unknown'}</Text>
        {!!item?.Brand && (
          <Text style={styles.brand} numberOfLines={1}>{item.Brand}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <TextInput
          placeholder="Search perfumes by name..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={onChangeSearch}
          onSubmitEditing={() => performSearch(searchQuery)}
          autoCorrect={false}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {!!searchQuery && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => (searchQuery ? performSearch(searchQuery) : refreshRandom())}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshText}>{searchQuery ? 'Research' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !searchQuery ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0a7ea4" />
          <Text style={styles.loadingText}>Fetching perfumes…</Text>
        </View>
      ) : (!searchQuery && perfumes.length === 0) ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.placeholderText}>No perfumes available.</Text>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      ) : (
        <FlatList
          data={searchQuery ? results : perfumes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          refreshing={searchQuery ? searching : refreshing}
          onRefresh={searchQuery ? () => performSearch(searchQuery) : onRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#11181C',
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F2F4F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#11181C',
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  refreshText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#dc2626',
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 16,
    width: '48%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  imageWrap: {
    backgroundColor: '#F8F8FA',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '85%',
    height: '85%',
  },
  cardBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  brand: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
});
