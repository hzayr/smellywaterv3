import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getCollection, getCollectionItems, removePerfumeFromCollection, updateCollection, type Collection, type CollectionItem } from '@/lib/supabase';

type SortOption = 'recently_added' | 'brand' | 'name';

export default function CollectionDetailsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGridView, setIsGridView] = useState(false);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [editedCollectionName, setEditedCollectionName] = useState(name || '');
  const [editedCollectionDescription, setEditedCollectionDescription] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recently_added');
  const [showSortModal, setShowSortModal] = useState(false);
  const [isModifyMode, setIsModifyMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const loadCollectionItems = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsData, collectionData] = await Promise.all([
        getCollectionItems(id as string),
        getCollection(id as string)
      ]);
      setItems(itemsData);
      setCollection(collectionData);
    } catch (error) {
      console.error('Error loading collection data:', error);
      Alert.alert('Error', 'Failed to load collection data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const sortItems = useCallback((itemsToSort: CollectionItem[], sortOption: SortOption) => {
    const sorted = [...itemsToSort];
    switch (sortOption) {
      case 'brand':
        return sorted.sort((a, b) => {
          const brandA = a.perfume_brand || '';
          const brandB = b.perfume_brand || '';
          return brandA.localeCompare(brandB);
        });
      case 'name':
        return sorted.sort((a, b) => a.perfume_name.localeCompare(b.perfume_name));
      case 'recently_added':
      default:
        return sorted.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
  }, []);

  const sortedItems = sortItems(items, sortBy);

  useEffect(() => {
    if (id) {
      loadCollectionItems();
    }
  }, [id, loadCollectionItems]);

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    
    const itemCount = selectedItems.size;
    Alert.alert(
      'Delete Items',
      `Are you sure you want to remove ${itemCount} item${itemCount === 1 ? '' : 's'} from this collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all selected items
              const deletePromises = Array.from(selectedItems).map(itemId => 
                removePerfumeFromCollection(itemId as string)
              );
              await Promise.all(deletePromises);
              
              // Update local state
              setItems(items.filter(item => !selectedItems.has(item.id)));
              setSelectedItems(new Set());
              setIsModifyMode(false);
              
              Alert.alert('Success', `${itemCount} fragrance${itemCount === 1 ? '' : 's'} removed from collection`);
            } catch (error) {
              console.error('Error removing items:', error);
              Alert.alert('Error', 'Failed to remove fragrances. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handlePerfumePress = (item: CollectionItem) => {
    router.push(`/perfume-details?id=${item.perfume_id}`);
  };

  const handleUpdateCollection = async () => {
    try {
      const updatedCollection = await updateCollection(id as string, {
        name: editedCollectionName.trim(),
        description: editedCollectionDescription.trim() || null,
      });
      
      // Update local state
      setCollection(updatedCollection);
      
      // Update the URL params to reflect the new name
      router.setParams({ name: editedCollectionName.trim() });
      setIsEditingCollection(false);
      Alert.alert('Success', 'Collection updated successfully');
    } catch (error) {
      console.error('Error updating collection:', error);
      Alert.alert('Error', 'Failed to update collection. Please try again.');
    }
  };

  const handleEditCollection = () => {
    setEditedCollectionName(collection?.name || name || '');
    setEditedCollectionDescription(collection?.description || '');
    setIsEditingCollection(true);
  };

  const renderPerfumeCard = ({ item }: { item: CollectionItem }) => {
    const isSelected = selectedItems.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.perfumeCard, 
          { backgroundColor: colors.background },
          isModifyMode && isSelected && styles.selectedCard
        ]}
        onPress={() => {
          if (isModifyMode) {
            toggleItemSelection(item.id);
          } else {
            handlePerfumePress(item);
          }
        }}
        activeOpacity={0.7}
      >
        <ThemedView style={styles.cardContent}>
          <ThemedView style={styles.imageContainer}>
            <Image
              source={{ 
                uri: item.perfume_image_url || 'https://via.placeholder.com/120x150/CCCCCC/FFFFFF?text=No+Image' 
              }}
              style={styles.perfumeImage}
              contentFit="contain"
            />
          </ThemedView>
          
          <ThemedView style={styles.perfumeInfo}>
            <ThemedText type="subtitle" style={styles.perfumeName} numberOfLines={2}>
              {item.perfume_name}
            </ThemedText>
            {item.perfume_brand && (
              <ThemedText style={styles.perfumeBrand} numberOfLines={1}>
                {item.perfume_brand}
              </ThemedText>
            )}
            {item.notes && (
              <ThemedText style={styles.personalNotes} numberOfLines={3}>
                Notes: {item.notes}
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  const renderGridPerfumeCard = ({ item }: { item: CollectionItem }) => {
    const isSelected = selectedItems.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.gridPerfumeCard, 
          { backgroundColor: colors.background },
          isModifyMode && isSelected && styles.selectedCard
        ]}
        onPress={() => {
          if (isModifyMode) {
            toggleItemSelection(item.id);
          } else {
            handlePerfumePress(item);
          }
        }}
        activeOpacity={0.7}
      >
        <ThemedView style={styles.gridImageContainer}>
          <Image
            source={{ 
              uri: item.perfume_image_url || 'https://via.placeholder.com/120x150/CCCCCC/FFFFFF?text=No+Image' 
            }}
            style={styles.gridPerfumeImage}
            contentFit="contain"
          />
        </ThemedView>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={styles.loadingText}>Loading collection...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: colors.text + '20' }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedView style={styles.titleContainer}>
          <TouchableOpacity 
            onPress={handleEditCollection}
            activeOpacity={0.7}
            style={styles.titleButton}
          >
            <ThemedText type="title" style={styles.headerTitle} numberOfLines={1}>
              {collection?.name || name}
            </ThemedText>
          </TouchableOpacity>
          <IconSymbol name="pencil" size={10} color={colors.text + '60'} style={styles.editIcon} />
        </ThemedView>
        <TouchableOpacity
          style={styles.modifyButton}
          onPress={() => {
            if (isModifyMode) {
              setIsModifyMode(false);
              setSelectedItems(new Set());
            } else {
              setIsModifyMode(true);
            }
          }}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.modifyButtonText, { color: isModifyMode ? '#FF3B30' : '#007AFF' }]}>
            {isModifyMode ? 'Done' : 'Modify'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* View Toggle Section */}
      <ThemedView style={[styles.viewToggleContainer, { borderBottomColor: colors.text + '20' }]}>
        {isModifyMode && selectedItems.size > 0 ? (
          <TouchableOpacity
            style={styles.deleteSelectedButton}
            onPress={handleDeleteSelected}
            activeOpacity={0.7}
          >
            <IconSymbol name="trash" size={16} color="#FFFFFF" />
            <ThemedText style={styles.deleteSelectedText}>
              Delete {selectedItems.size} item{selectedItems.size === 1 ? '' : 's'}
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
            activeOpacity={0.7}
          >
            <IconSymbol name="arrow.up.arrow.down" size={14} color={colors.text} />
            <ThemedText style={styles.sortButtonText}>Sort</ThemedText>
          </TouchableOpacity>
        )}
        
        {!isModifyMode && (
          <ThemedView style={styles.toggleButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.viewToggleButton, 
                styles.listToggleButton,
                !isGridView && styles.activeToggleButton,
                { 
                  backgroundColor: !isGridView ? '#007AFF' : 'transparent',
                  borderColor: '#007AFF' 
                }
              ]}
              onPress={() => setIsGridView(false)}
              activeOpacity={0.7}
            >
              <IconSymbol 
                name="list.bullet" 
                size={14} 
                color={!isGridView ? '#FFFFFF' : '#007AFF'} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewToggleButton, 
                styles.gridToggleButton,
                isGridView && styles.activeToggleButton,
                { 
                  backgroundColor: isGridView ? '#007AFF' : 'transparent',
                  borderColor: '#007AFF' 
                }
              ]}
              onPress={() => setIsGridView(true)}
              activeOpacity={0.7}
            >
              <IconSymbol 
                name="square.grid.3x3" 
                size={14} 
                color={isGridView ? '#FFFFFF' : '#007AFF'} 
              />
            </TouchableOpacity>
          </ThemedView>
        )}
      </ThemedView>

      {/* Edit Collection Modal */}
      <Modal
        visible={isEditingCollection}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditingCollection(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ThemedView style={[styles.modalHeader, { borderBottomColor: colors.text + '20' }]}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setIsEditingCollection(false)}
            >
              <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText type="title" style={styles.modalTitle}>Edit Collection</ThemedText>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleUpdateCollection}
              disabled={!editedCollectionName.trim()}
            >
              <ThemedText style={[
                styles.modalSaveText,
                { opacity: editedCollectionName.trim() ? 1 : 0.5 }
              ]}>Save</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          
          <ThemedView style={styles.modalContent}>
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Collection Name</ThemedText>
              <TextInput
                style={[styles.textInput, { 
                  color: colors.text,
                  borderColor: colors.text + '30',
                  backgroundColor: colors.background 
                }]}
                value={editedCollectionName}
                onChangeText={setEditedCollectionName}
                placeholder="Enter collection name"
                placeholderTextColor={colors.text + '60'}
                autoFocus
                returnKeyType="next"
              />
            </ThemedView>
            
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description (Optional)</ThemedText>
              <TextInput
                style={[styles.textInput, styles.textArea, { 
                  color: colors.text,
                  borderColor: colors.text + '30',
                  backgroundColor: colors.background 
                }]}
                value={editedCollectionDescription}
                onChangeText={setEditedCollectionDescription}
                placeholder="Enter collection description"
                placeholderTextColor={colors.text + '60'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
              />
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity 
          style={styles.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <ThemedView style={[styles.sortModalContent, { backgroundColor: colors.background }]}>
            <ThemedText style={styles.sortModalTitle}>Sort by</ThemedText>
            
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'recently_added' && styles.activeSortOption]}
              onPress={() => {
                setSortBy('recently_added');
                setShowSortModal(false);
              }}
            >
              <ThemedText style={[
                styles.sortOptionText,
                sortBy === 'recently_added' && styles.activeSortOptionText
              ]}>Recently Added</ThemedText>
              {sortBy === 'recently_added' && (
                <IconSymbol name="checkmark" size={16} color="#007AFF" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'brand' && styles.activeSortOption]}
              onPress={() => {
                setSortBy('brand');
                setShowSortModal(false);
              }}
            >
              <ThemedText style={[
                styles.sortOptionText,
                sortBy === 'brand' && styles.activeSortOptionText
              ]}>Brand</ThemedText>
              {sortBy === 'brand' && (
                <IconSymbol name="checkmark" size={16} color="#007AFF" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'name' && styles.activeSortOption]}
              onPress={() => {
                setSortBy('name');
                setShowSortModal(false);
              }}
            >
              <ThemedText style={[
                styles.sortOptionText,
                sortBy === 'name' && styles.activeSortOptionText
              ]}>Name</ThemedText>
              {sortBy === 'name' && (
                <IconSymbol name="checkmark" size={16} color="#007AFF" />
              )}
            </TouchableOpacity>
          </ThemedView>
        </TouchableOpacity>
      </Modal>

      {sortedItems.length === 0 ? (
        <ThemedView style={[styles.centerContent, { flex: 1 }]}>
          <IconSymbol name="tray" size={48} color={colors.text + '40'} />
          <ThemedText style={styles.emptyTitle}>No fragrances in this collection</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Add fragrances to this collection by tapping &quot;Add to Collection&quot; on any fragrance details page.
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={sortedItems}
          renderItem={isGridView ? renderGridPerfumeCard : renderPerfumeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.perfumeList,
            { paddingBottom: 100 } // Add extra padding at bottom for smooth scrolling
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadCollectionItems}
          numColumns={isGridView ? 4 : 1}
          key={isGridView ? 'grid' : 'list'}
          contentInsetAdjustmentBehavior="automatic"
          scrollIndicatorInsets={{ bottom: 20 }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingLeft: 8,
  },
  titleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    marginLeft: 4,
    marginTop: -2,
  },
  headerSpacer: {
    width: 40,
  },
  toggleButton: {
    padding: 8,
    marginLeft: 8,
  },
  // View toggle styles
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  viewToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  toggleButtonsContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listToggleButton: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  gridToggleButton: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  activeToggleButton: {
    // Active state is handled by backgroundColor prop
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalCancelButton: {
    padding: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  perfumeList: {
    padding: 16,
    paddingTop: 8, // Reduced top padding since we have the toggle container
  },
  perfumeCard: {
    marginBottom: 16,
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
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  imageContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 8,
    marginRight: 16,
  },
  perfumeImage: {
    width: 60,
    height: 80,
  },
  perfumeInfo: {
    flex: 1,
  },
  perfumeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  perfumeBrand: {
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.7,
    color: '#666',
    marginBottom: 4,
  },
  personalNotes: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Grid view styles
  gridPerfumeCard: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
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
    aspectRatio: 0.75, // Height is 1.33 times the width (4:3 ratio)
    maxWidth: '22%', // Ensure 4 columns with some margin
  },
  gridImageContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    padding: 4,
    position: 'relative',
  },
  gridPerfumeImage: {
    width: '100%',
    height: '100%',
  },
  gridRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  // Sort button styles
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  // Sort modal styles
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 0,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activeSortOption: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '400',
  },
  activeSortOptionText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  // Multi-select styles
  modifyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modifyButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  deleteSelectedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
});
